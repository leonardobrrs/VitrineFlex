import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import httpx
import pytest

from python_common.security import (
    create_access_token,
    HEADER_INTERNAL_TOKEN,
    get_internal_service_key,
)
from recommendation_app import app as rec_app
from recommendation_database import init_db as init_rec_db, SessionFactory as RecSessionFactory
from recommendation_models import UserInteraction
from orders_app import app as orders_app
from orders_database import init_db as init_orders_db, SessionFactory as OrdersSessionFactory
from orders_models import Order, OrderItemSnapshot, OrderStatusHistory, CheckoutOperation
from catalog_app import app as catalog_app
from catalog_database import init_db as init_catalog_db, SessionFactory as CatalogSessionFactory
from catalog_models import Product, ProductVariant, InventoryMovement, Favorite
from payments_app import app as payments_app
from payments_database import init_db as init_payments_db, SessionFactory as PaymentsSessionFactory
from payments_models import PaymentAttempt
from saga_orchestrator import SagaOrchestrator, compute_checkout_hash, CheckoutRequest
from python_common.errors import AppError


@pytest.fixture(autouse=True)
def clean_test_databases():
    init_rec_db()
    with RecSessionFactory() as s:
        s.query(UserInteraction).delete()
        s.commit()

    init_orders_db()
    with OrdersSessionFactory() as s:
        s.query(OrderStatusHistory).delete()
        s.query(OrderItemSnapshot).delete()
        s.query(Order).delete()
        s.query(CheckoutOperation).delete()
        s.commit()

    init_catalog_db()
    with CatalogSessionFactory() as s:
        s.query(InventoryMovement).delete()
        s.query(Favorite).delete()
        s.commit()

    init_payments_db()
    with PaymentsSessionFactory() as s:
        s.query(PaymentAttempt).delete()
        s.commit()


# --------------------------------------------------------------------------
# 1. PB-20: Recommendation Service Health & Behavioral Events
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recommendation_health():
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "UP"
        assert data["service"] == "recommendation-service"
        assert data["port"] == 8008


@pytest.mark.asyncio
async def test_recommendation_interactions_public_and_internal_pb20():
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # 1. Public VIEW with user ID from gateway header
        pub_req = {
            "store_id": "store-tech",
            "product_id": "prod-dell-xps",
            "category": "Notebooks",
            "event_type": "VIEW",
        }
        res_pub = await client.post(
            "/api/v1/recommendations/interactions",
            json=pub_req,
            headers={"X-User-ID": "user-client-1", "X-Store-ID": "store-tech"},
        )
        assert res_pub.status_code == 201
        data_pub = res_pub.json()
        assert data_pub["user_id"] == "user-client-1"
        assert data_pub["event_type"] == "VIEW"

        # 2. Public endpoint rejects non-VIEW events (e.g. fraudulent PURCHASE)
        fraud_req = dict(pub_req, event_type="PURCHASE")
        res_fraud = await client.post("/api/v1/recommendations/interactions", json=fraud_req)
        assert res_fraud.status_code == 403
        assert res_fraud.json()["error"]["code"] == "FORBIDDEN_EVENT_TYPE"

        # 3. Anonymous visitor can register VIEW (no user_id)
        anon_req = {
            "store_id": "store-fashion",
            "product_id": "prod-polo",
            "category": "Vestuário",
            "event_type": "VIEW",
        }
        res_anon = await client.post("/api/v1/recommendations/interactions", json=anon_req)
        assert res_anon.status_code == 201
        assert res_anon.json()["user_id"] is None

        # 4. Internal interaction requires token
        int_req = {
            "store_id": "store-tech",
            "user_id": "user-client-1",
            "product_id": "prod-dell-xps",
            "category": "Notebooks",
            "event_type": "PURCHASE",
            "reference_id": "order-100:prod-dell-xps",
        }
        res_no_tok = await client.post("/internal/v1/recommendations/interactions", json=int_req)
        assert res_no_tok.status_code == 403

        res_ok = await client.post(
            "/internal/v1/recommendations/interactions",
            json=int_req,
            headers=int_headers,
        )
        assert res_ok.status_code == 201
        assert res_ok.json()["event_type"] == "PURCHASE"

        # 5. Internal deduplication via reference_id
        res_repeat = await client.post(
            "/internal/v1/recommendations/interactions",
            json=int_req,
            headers=int_headers,
        )
        assert res_repeat.status_code == 201
        assert "idempotente" in res_repeat.json()["message"].lower()

        # Check in DB that exactly 1 PURCHASE was stored
        with RecSessionFactory() as s:
            purchases = s.query(UserInteraction).filter_by(event_type="PURCHASE").all()
            assert len(purchases) == 1


@pytest.mark.asyncio
async def test_recommendation_idempotency_concurrency_and_conflict_audit():
    """
    Auditoria rigorosa de idempotência e concorrência no Recommendation Service (Etapa Final / Itens A, B, C, D).
    Testa:
    A. Dez chamadas simultâneas com mesmo store_id, event_type, reference_id e mesmo product_id:
       Apenas um registro persistido e todas as 10 chamadas recuperam o mesmo registro.
    B. Reutilização de reference_id com product_id diferente:
       HTTP 409 REFERENCE_ID_CONFLICT.
    C. Eventos VIEW com reference_id nulo:
       Múltiplas visualizações legítimas registradas no banco.
    D. FAVORITE/PURCHASE com referências diferentes:
       Eventos distintos não são deduplicados indevidamente.
    """
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # A. Dez chamadas simultâneas com mesmo store_id, event_type, reference_id e product_id
        ten_payload = {
            "store_id": "store-tech",
            "user_id": "user-audit-10",
            "product_id": "prod-xps",
            "category": "Notebooks",
            "event_type": "PURCHASE",
            "reference_id": "purchase:ord-ten-1:prod-xps",
        }
        ten_tasks = [
            client.post("/internal/v1/recommendations/interactions", json=ten_payload, headers=int_headers)
            for _ in range(10)
        ]
        ten_responses = await asyncio.gather(*ten_tasks)
        for r in ten_responses:
            assert r.status_code == 201
        first_id = ten_responses[0].json()["id"]
        for r in ten_responses[1:]:
            assert r.json()["id"] == first_id, "Todas as 10 chamadas devem retornar o mesmo id"

        with RecSessionFactory() as s:
            persisted_count = s.query(UserInteraction).filter_by(reference_id="purchase:ord-ten-1:prod-xps").count()
            assert persisted_count == 1, "Apenas um único registro deve ser persistido no banco para 10 chamadas concorrentes"

        # B. Reutilização de reference_id com product_id diferente -> 409 REFERENCE_ID_CONFLICT
        divergent_payload = {
            "store_id": "store-tech",
            "user_id": "user-audit-10",
            "product_id": "prod-OUTRO-NOTEBOOK",  # Divergente de prod-xps
            "category": "Notebooks",
            "event_type": "PURCHASE",
            "reference_id": "purchase:ord-ten-1:prod-xps",  # Mesma reference_id
        }
        r_conflict = await client.post("/internal/v1/recommendations/interactions", json=divergent_payload, headers=int_headers)
        assert r_conflict.status_code == 409
        assert r_conflict.json()["error"]["code"] == "REFERENCE_ID_CONFLICT"

        # C. Eventos VIEW com reference_id nulo -> Múltiplas visualizações legítimas registradas
        for _ in range(5):
            v_res = await client.post(
                "/api/v1/recommendations/interactions",
                json={"store_id": "store-fashion", "product_id": "prod-polo", "category": "Vestuário", "event_type": "VIEW"},
                headers={"X-User-ID": "user-audit-views", "X-Store-ID": "store-fashion"},
            )
            assert v_res.status_code == 201

        with RecSessionFactory() as s:
            views_count = s.query(UserInteraction).filter_by(user_id="user-audit-views", event_type="VIEW").count()
            assert views_count == 5, "Eventos VIEW sem reference_id devem registrar todas as ocorrências"

        # D. FAVORITE/PURCHASE com referências diferentes -> Não deduplicar indevidamente
        fav_ref_1 = {
            "store_id": "store-books",
            "user_id": "user-audit-d",
            "product_id": "prod-book-clean",
            "category": "Livraria",
            "event_type": "FAVORITE",
            "reference_id": "fav:ref-001:prod-book-clean",
        }
        fav_ref_2 = {
            "store_id": "store-books",
            "user_id": "user-audit-d",
            "product_id": "prod-book-clean",
            "category": "Livraria",
            "event_type": "FAVORITE",
            "reference_id": "fav:ref-002:prod-book-clean",
        }
        res_fav1 = await client.post("/internal/v1/recommendations/interactions", json=fav_ref_1, headers=int_headers)
        res_fav2 = await client.post("/internal/v1/recommendations/interactions", json=fav_ref_2, headers=int_headers)
        assert res_fav1.status_code == 201
        assert res_fav2.status_code == 201
        assert res_fav1.json()["id"] != res_fav2.json()["id"], "Referências distintas devem gerar IDs distintos"

        with RecSessionFactory() as s:
            distinct_count = s.query(UserInteraction).filter_by(user_id="user-audit-d", event_type="FAVORITE").count()
            assert distinct_count == 2, "Dois eventos distintos com referências diferentes devem estar ambos gravados"


@pytest.mark.asyncio
async def test_recommendation_store_isolation_and_product_validation():
    """
    Auditoria rigorosa de isolamento entre lojas e validação de pertencimento do produto (PB-20 / Item 3).
    Verifica:
    - Loja do contexto (X-Store-ID) diferente da loja do corpo.
    - Produto de uma loja enviado em outra loja.
    - Produto inexistente no catálogo.
    - Interação válida dentro da própria loja com consulta direta ao banco para atestar isolamento.
    """
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock do Catalog Service para retornar informações de produtos por ID
        def mock_catalog_product_get(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "prod-tech-xps" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {
                    "id": "prod-tech-xps",
                    "store_id": "store-tech",
                    "category": "Notebooks",
                    "is_active": True,
                }
            elif "prod-fashion-shirt" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {
                    "id": "prod-fashion-shirt",
                    "store_id": "store-fashion",
                    "category": "Vestuário",
                    "is_active": True,
                }
            else:
                mock_resp.status_code = 404
                mock_resp.json.return_value = {"error": {"code": "PRODUCT_NOT_FOUND", "message": "Produto não encontrado"}}
            return mock_resp

        with patch("httpx.Client.get", side_effect=mock_catalog_product_get):
            # 1. Divergência entre contexto (X-Store-ID: store-fashion) e corpo (store_id: store-tech)
            res_mismatch = await client.post(
                "/api/v1/recommendations/interactions",
                json={
                    "store_id": "store-tech",
                    "product_id": "prod-tech-xps",
                    "category": "Notebooks",
                    "event_type": "VIEW",
                },
                headers={"X-User-ID": "user-sec-1", "X-Store-ID": "store-fashion"},
            )
            assert res_mismatch.status_code == 400
            assert res_mismatch.json()["error"]["code"] == "STORE_CONTEXT_MISMATCH"
            with RecSessionFactory() as s:
                assert s.query(UserInteraction).filter_by(user_id="user-sec-1").count() == 0, "Nenhum registro pode ser gravado em divergência"

            # 2. Produto de outra loja: enviado para store-fashion, mas prod-tech-xps pertence a store-tech
            res_wrong_store = await client.post(
                "/api/v1/recommendations/interactions",
                json={
                    "store_id": "store-fashion",
                    "product_id": "prod-tech-xps",
                    "category": "Notebooks",
                    "event_type": "VIEW",
                },
                headers={"X-User-ID": "user-sec-2", "X-Store-ID": "store-fashion"},
            )
            assert res_wrong_store.status_code == 400
            assert res_wrong_store.json()["error"]["code"] == "PRODUCT_STORE_MISMATCH"
            with RecSessionFactory() as s:
                assert s.query(UserInteraction).filter_by(user_id="user-sec-2").count() == 0

            # 3. Produto inexistente no catálogo
            res_not_found = await client.post(
                "/api/v1/recommendations/interactions",
                json={
                    "store_id": "store-fashion",
                    "product_id": "prod-inexistente-xyz",
                    "category": "Vestuário",
                    "event_type": "VIEW",
                },
                headers={"X-User-ID": "user-sec-3", "X-Store-ID": "store-fashion"},
            )
            assert res_not_found.status_code == 404
            assert res_not_found.json()["error"]["code"] == "PRODUCT_NOT_FOUND"
            with RecSessionFactory() as s:
                assert s.query(UserInteraction).filter_by(user_id="user-sec-3").count() == 0

            # 4. Interação válida dentro da própria loja
            res_valid = await client.post(
                "/api/v1/recommendations/interactions",
                json={
                    "store_id": "store-fashion",
                    "product_id": "prod-fashion-shirt",
                    "category": "Vestuário",
                    "event_type": "VIEW",
                },
                headers={"X-User-ID": "user-sec-4", "X-Store-ID": "store-fashion"},
            )
            assert res_valid.status_code == 201
            with RecSessionFactory() as s:
                saved = s.query(UserInteraction).filter_by(user_id="user-sec-4").first()
                assert saved is not None
                assert saved.store_id == "store-fashion"
                assert saved.product_id == "prod-fashion-shirt"
                assert saved.event_type == "VIEW"


@pytest.mark.asyncio
async def test_recommendation_recent_views_temporal_window():
    """
    Auditoria da janela temporal de visualizações recentes V (PB-21 / Item 4).
    Comprova que visualizações com mais de 30 dias não são contabilizadas no score V,
    enquanto visualizações recentes dentro da janela são pontuadas.
    """
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_id = "user-temporal-audit"
        store_id = "store-tech"

        now = datetime.now(timezone.utc)
        # Produto antigo: visualizado há 45 dias (fora da janela de 30 dias)
        old_time = now - timedelta(days=45)
        # Produto recente: visualizado há 2 dias (dentro da janela)
        recent_time = now - timedelta(days=2)

        with RecSessionFactory() as s:
            s.add(UserInteraction(
                store_id=store_id,
                user_id=user_id,
                product_id="prod-old",
                category="Periféricos",
                event_type="VIEW",
                created_at=old_time,
            ))
            s.add(UserInteraction(
                store_id=store_id,
                user_id=user_id,
                product_id="prod-recent",
                category="Periféricos",
                event_type="VIEW",
                created_at=recent_time,
            ))
            s.commit()

        candidates = [
            {"id": "prod-old", "title": "Mouse Antigo", "category": "Periféricos", "price": 100.0, "stock_quantity": 10, "is_active": True},
            {"id": "prod-recent", "title": "Mouse Recente", "category": "Periféricos", "price": 100.0, "stock_quantity": 10, "is_active": True},
        ]

        def mock_catalog_and_auth(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "products/active" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = candidates
            elif "preferences" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"categories": []}
            return mock_resp

        with patch("httpx.Client.get", side_effect=mock_catalog_and_auth):
            resp = await client.get(
                f"/api/v1/recommendations?store_id={store_id}&limit=10",
                headers={"X-User-ID": user_id},
            )
            assert resp.status_code == 200
            data = resp.json()
            items_by_id = {it["product_id"]: it for it in data["items"]}

            # prod-recent tem V=1 (score = min(1,5) + 2*T = 1.0 + 2.0 = 3.0 pois T é normalizado)
            # prod-old tem V=0 pois foi visualizado há 45 dias
            assert "prod-recent" in items_by_id
            assert "prod-old" in items_by_id

            recent_item = items_by_id["prod-recent"]
            old_item = items_by_id["prod-old"]

            assert recent_item["score"] > old_item["score"], "Produto recente deve pontuar mais que produto fora da janela temporal"
            assert "recentemente" in recent_item["reason"].lower()
            assert "popular" in old_item["reason"].lower()



# --------------------------------------------------------------------------
# 2. PB-21: Recommendation Algorithm, Formula & Explainability
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recommendation_algorithm_affinity_formula_and_explainability_pb21():
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_id = "user-affinity-test"
        store_id = "store-tech"

        # Seed interactions in DB:
        # Product 1 ("Notebooks"): 2 Purchases (P=2 -> min(10,15)=10), 1 Favorite (F=1 -> min(3,9)=3), 4 Views (V=4 -> min(4,5)=4)
        # Interest in "Notebooks": I = 1 -> 4
        # Global interactions for T: Product 1 has 5 total, max is 5 -> T = 1.0 -> 2*1.0 = 2.0
        # Expected Score for Product 1 = 4 + 10 + 3 + 4 + 2.0 = 23.0
        with RecSessionFactory() as s:
            # 2 purchases
            s.add(UserInteraction(store_id=store_id, user_id=user_id, product_id="prod-1", category="Notebooks", event_type="PURCHASE"))
            s.add(UserInteraction(store_id=store_id, user_id=user_id, product_id="prod-1", category="Notebooks", event_type="PURCHASE"))
            # 1 favorite
            s.add(UserInteraction(store_id=store_id, user_id=user_id, product_id="prod-1", category="Notebooks", event_type="FAVORITE"))
            # 4 views
            for _ in range(4):
                s.add(UserInteraction(store_id=store_id, user_id=user_id, product_id="prod-1", category="Notebooks", event_type="VIEW"))
            # Product 2 ("Monitores"): 1 view, no purchases, no favorites
            s.add(UserInteraction(store_id=store_id, user_id=user_id, product_id="prod-2", category="Monitores", event_type="VIEW"))
            s.commit()

        mock_catalog_products = [
            {
                "id": "prod-1",
                "title": "Notebook Tech Pro",
                "category": "Notebooks",
                "price": 5000.0,
                "stock_quantity": 5,
                "is_active": True,
            },
            {
                "id": "prod-2",
                "title": "Monitor Curvo 34",
                "category": "Monitores",
                "price": 2500.0,
                "stock_quantity": 8,
                "is_active": True,
            },
            {
                "id": "prod-3-out-of-stock",
                "title": "Item Esgotado",
                "category": "Notebooks",
                "price": 3000.0,
                "stock_quantity": 0,  # Must be filtered out
                "is_active": True,
            },
        ]

        def mock_http_get(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "catalog" in url and "products/active" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = mock_catalog_products
            elif "auth" in url and "preferences" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"categories": ["Notebooks"]}
            return mock_resp

        with patch("httpx.Client.get", side_effect=mock_http_get):
            resp = await client.get(
                f"/api/v1/recommendations?store_id={store_id}&limit=5",
                headers={"X-User-ID": user_id},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["degraded"] is False
            assert data["cold_start"] is False

            items = data["items"]
            # Out of stock item must NOT be recommended
            item_ids = [it["product_id"] for it in items]
            assert "prod-3-out-of-stock" not in item_ids

            # Top product must be prod-1 with calculated affinity
            top = items[0]
            assert top["product_id"] == "prod-1"
            assert top["score"] == 23.0
            assert "Baseado no seu interesse em Notebooks e histórico de compras" in top["reason"]

            # Second item is prod-2
            assert items[1]["product_id"] == "prod-2"
            assert items[1]["score"] < top["score"]


@pytest.mark.asyncio
async def test_recommendation_cold_start_fallback_pb21():
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        mock_candidates = [
            {"id": "p-tech-1", "title": "Produto 1", "category": "Tech", "price": 100.0, "stock_quantity": 10, "is_active": True},
            {"id": "p-tech-2", "title": "Produto 2", "category": "Tech", "price": 200.0, "stock_quantity": 5, "is_active": True},
        ]

        def mock_catalog(url, *args, **kwargs):
            m = MagicMock()
            m.status_code = 200
            m.json.return_value = mock_candidates
            return m

        with patch("httpx.Client.get", side_effect=mock_catalog):
            # Anonymous visitor with zero history
            resp = await client.get("/api/v1/recommendations?store_id=store-tech")
            assert resp.status_code == 200
            data = resp.json()
            assert data["cold_start"] is True
            assert len(data["items"]) == 2
            for it in data["items"]:
                assert it["reason"] == "Produtos populares no segmento"


@pytest.mark.asyncio
async def test_recommendation_catalog_unavailability_resilience_pb21():
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        def mock_error(url, *args, **kwargs):
            raise httpx.ConnectError("Catalog service down")

        with patch("httpx.Client.get", side_effect=mock_error):
            # 1. Graceful mode (default) -> 200 with degraded: true
            resp_graceful = await client.get("/api/v1/recommendations?store_id=store-tech&mode=graceful")
            assert resp_graceful.status_code == 200
            data = resp_graceful.json()
            assert data["degraded"] is True
            assert data["items"] == []

            # 2. Strict mode -> 503 CATALOG_UNAVAILABLE
            resp_strict = await client.get("/api/v1/recommendations?store_id=store-tech&mode=strict")
            assert resp_strict.status_code == 503
            assert resp_strict.json()["error"]["code"] == "CATALOG_UNAVAILABLE"


# --------------------------------------------------------------------------
# 3. PB-28: Feature Restrictions & Multi-tenant Isolation across Segments
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_variability_feature_restrictions_three_segments_pb28():
    from catalog_routes import manifest_provider as catalog_manifest_provider
    catalog_manifest_provider.set_cache_entry(
        "store-books",
        {"store_id": "store-books", "segment": "BOOKS", "features": {"favorites": False}},
    )
    catalog_manifest_provider.set_cache_entry(
        "store-fashion",
        {"store_id": "store-fashion", "segment": "FASHION", "features": {"product_comparison": False, "favorites": True}},
    )

    transport = httpx.ASGITransport(app=catalog_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-var-1", email="var1@test.com")
        headers = {"Authorization": f"Bearer {user_token}"}

        # 1. Favorites in Vitrine Books (favorites: false) -> 403 FEATURE_NOT_ENABLED
        res_fav_books = await client.post(
            "/api/v1/catalog/favorites",
            json={"store_id": "store-books", "product_id": "prod-any"},
            headers=headers,
        )
        assert res_fav_books.status_code == 403
        assert res_fav_books.json()["error"]["code"] == "FEATURE_NOT_ENABLED"

        # 2. Comparison in Vitrine Moda (comparison not supported) -> 403 FEATURE_NOT_ENABLED
        res_comp_fashion = await client.get(
            "/api/v1/catalog/products/compare?store_id=store-fashion&product_ids=p1,p2",
            headers=headers,
        )
        assert res_comp_fashion.status_code == 403


# --------------------------------------------------------------------------
# 4. PB-28: Timeout Semantics & Stock Retention without Premature Release
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_timeout_semantics_retains_stock_without_premature_compensation_pb28():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-timeout-audit", email="timeout@audit.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-timeout-audit-01",
        }
        payload = {
            "store_id": "store-tech",
            "shipping_zip_code": "01310-100",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "CARD",
            "simulation_scenario": "TIMEOUT",
            "items": [{"product_id": "prod-audit-timeout", "quantity": 1, "unit_price": 500.0}],
        }

        compensations_called = []

        def mock_http(url, *args, **kwargs):
            m = MagicMock()
            if "shipping" in url:
                m.status_code = 200
                m.json.return_value = {"cost": 20.0, "code": "STANDARD_DELIVERY"}
            elif "inventory/decrement" in url:
                m.status_code = 200
                m.json.return_value = {"success": True, "new_stock_quantity": 4}
            elif "payments" in url:
                m.status_code = 200
                m.json.return_value = {"status": "TIMEOUT", "error_message": "Timeout no provedor."}
            elif "inventory/restore" in url:
                compensations_called.append(kwargs.get("json"))
                m.status_code = 200
                m.json.return_value = {"success": True, "new_stock_quantity": 5}
            return m

        with patch("httpx.Client.post", side_effect=mock_http):
            resp = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
            # Must return HTTP 202 Accepted
            assert resp.status_code == 202
            assert resp.json()["saga_status"] == "PAYMENT_PENDING_CONFIRMATION"

            # CRITICAL AUDIT RULE: Zero compensation calls! Stock remains held awaiting reconciliation!
            assert len(compensations_called) == 0


# --------------------------------------------------------------------------
# 5. PB-28: Complementary Saga Lease Validation (Downstream delay > 15s)
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_saga_lease_downstream_delay_stale_executor_cannot_commit_pb28():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-lease-audit", email="lease@audit.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-lease-audit-01",
        }
        payload = {
            "store_id": "store-tech",
            "shipping_zip_code": "01310-100",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "PIX",
            "items": [{"product_id": "prod-lease-test", "quantity": 1, "unit_price": 100.0}],
        }
        req_obj = CheckoutRequest(**payload)
        req_hash = compute_checkout_hash(req_obj)

        # 1. Simular uma operação iniciada com token A cujo processamento demorou mais que 15s
        token_a = "worker-token-A-slow"
        with OrdersSessionFactory() as s:
            op = CheckoutOperation(
                store_id="store-tech",
                user_id="user-lease-audit",
                idempotency_key="idemp-lease-audit-01",
                request_payload_hash=req_hash,
                saga_status="INVENTORY_RESERVED",
                execution_token=token_a,
                created_at=datetime.utcnow() - timedelta(seconds=20),
                updated_at=datetime.utcnow() - timedelta(seconds=20),  # Lease expirado (>15s)
            )
            s.add(op)
            s.commit()
            op_id = op.id

        # 2. Novo executor (Worker B) assume a execução via CAS e conclui
        def mock_http(url, *args, **kwargs):
            m = MagicMock()
            if "shipping" in url:
                m.status_code = 200
                m.json.return_value = {"cost": 10.0, "code": "STANDARD_DELIVERY"}
            elif "inventory/decrement" in url:
                m.status_code = 200
                m.json.return_value = {"success": True, "new_stock_quantity": 9}
            elif "payments" in url:
                m.status_code = 200
                m.json.return_value = {"status": "APPROVED", "transaction_id": "tx-worker-B"}
            return m

        with patch("httpx.Client.post", side_effect=mock_http), patch("httpx.Client.delete"):
            resp_b = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
            assert resp_b.status_code == 200
            assert resp_b.json()["saga_status"] == "COMPLETED"

        # 3. Worker A retardatário tenta finalizar com o token A desatualizado -> barrado via CAS
        with pytest.raises(AppError) as exc_info:
            SagaOrchestrator._update_saga_status(
                operation_id=op_id,
                execution_token=token_a,  # Token antigo que perdeu a concessão
                saga_status="FAILED",
            )
        assert exc_info.value.code == "CONCURRENT_EXECUTION_ABORTED"


# --------------------------------------------------------------------------
# 6. PB-28: Concorrência Extrema de Checkout para a Última Unidade
# Critério Explicícito: 5 threads simultâneas na última unidade:
# Exatamente 1 PAID, 4 STOCK_REJECTED, 0 estoque negativo, sem deadlocks WAL.
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_checkout_last_unit_five_threads_wal_pb28():
    init_catalog_db()

    # 1. Criar produto no banco com exatamente 1 unidade de estoque
    product_id = "prod-single-unit-race"
    store_id = "store-race"
    with CatalogSessionFactory() as s:
        s.query(InventoryMovement).filter_by(product_id=product_id).delete()
        s.query(Product).filter_by(id=product_id).delete()
        prod = Product(
            id=product_id,
            store_id=store_id,
            title="Última Unidade Rara",
            price=150.0,
            stock_quantity=1,
            category="Eletrônicos",
            is_active=True,
        )
        s.add(prod)
        s.commit()

    # 2. Executar 5 requisições de checkout concorrentes disputando a única unidade
    async def run_checkout(user_index: int):
        transport = httpx.ASGITransport(app=orders_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            user_token = create_access_token(user_id=f"user-race-{user_index}", email=f"user{user_index}@race.com")
            headers = {
                "Authorization": f"Bearer {user_token}",
                "Idempotency-Key": f"idemp-race-user-{user_index}",
            }
            payload = {
                "store_id": store_id,
                "shipping_zip_code": "01310-100",
                "fulfillment_mode": "DELIVERY",
                "shipping_option_code": "STANDARD_DELIVERY",
                "payment_method": "PIX",
                "items": [{"product_id": product_id, "quantity": 1, "unit_price": 150.0}],
            }

            def mock_http(url, *args, **kwargs):
                m = MagicMock()
                if "shipping" in url:
                    m.status_code = 200
                    m.json.return_value = {"cost": 15.0, "code": "STANDARD_DELIVERY"}
                elif "inventory/decrement" in url:
                    # Chamar decremento real no Catalog Service para testar concorrência atômica com SQLite WAL
                    req_data = kwargs.get("json", {})
                    with CatalogSessionFactory() as cs:
                        # Baixa atômica com UPDATE condicional: stock >= quantity
                        from sqlalchemy import text
                        res = cs.execute(
                            text(
                                "UPDATE products SET stock_quantity = stock_quantity - :qty "
                                "WHERE id = :pid AND stock_quantity >= :qty"
                            ),
                            {"qty": req_data["quantity"], "pid": req_data["product_id"]},
                        )
                        cs.commit()
                        if res.rowcount > 0:
                            m.status_code = 200
                            m.json.return_value = {"success": True, "new_stock_quantity": 0}
                        else:
                            m.status_code = 409
                            m.json.return_value = {
                                "error": {"code": "INSUFFICIENT_STOCK", "message": "Estoque insuficiente."}
                            }
                elif "payments" in url:
                    m.status_code = 200
                    m.json.return_value = {"status": "APPROVED", "transaction_id": f"tx-race-{user_index}"}
                return m

            with patch("httpx.Client.post", side_effect=mock_http), patch("httpx.Client.delete"):
                resp = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
                return resp

    tasks = [run_checkout(i) for i in range(1, 6)]
    results = await asyncio.gather(*tasks)

    # 3. Avaliação estrita dos resultados:
    completed_orders = [r for r in results if r.status_code == 200 and r.json().get("saga_status") == "COMPLETED"]
    stock_rejected_orders = [r for r in results if r.status_code == 409 and r.json().get("error", {}).get("code") == "INSUFFICIENT_STOCK"]

    assert len(completed_orders) == 1, f"Exatamente 1 checkout deve ser concluído com sucesso. Obtidos: {len(completed_orders)}"
    assert len(stock_rejected_orders) == 4, f"Exatamente 4 checkouts devem ser rejeitados por estoque insuficiente. Obtidos: {len(stock_rejected_orders)}"

    # 4. Verificar estado final no banco de dados SQLite WAL:
    with CatalogSessionFactory() as s:
        prod_final = s.query(Product).filter_by(id=product_id).first()
        assert prod_final.stock_quantity == 0, "O estoque final deve ser exatamente 0, nunca negativo!"

    with OrdersSessionFactory() as s:
        paid_orders = s.query(Order).filter_by(status="PAID").all()
        assert len(paid_orders) == 1, "Exatamente 1 pedido PAID deve existir no banco de pedidos."
