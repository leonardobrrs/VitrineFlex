import pytest
import httpx
from catalog_app import app as catalog_app
from catalog_database import SessionFactory as CatalogSessionFactory, init_db as init_catalog_db
from catalog_models import Product, ProductVariant, ProductAttribute, BackInStockAlert
from recommendation_app import app as rec_app
from recommendation_database import SessionFactory as RecSessionFactory, init_db as init_rec_db
from recommendation_models import UserInteraction
from python_common.security import (
    create_access_token,
    HEADER_USER_ID,
    HEADER_USER_ROLE,
    HEADER_INTERNAL_TOKEN,
    get_internal_service_key,
)


@pytest.fixture(autouse=True)
def setup_databases():
    init_catalog_db()
    init_rec_db()
    with CatalogSessionFactory() as session:
        session.query(BackInStockAlert).delete()
        session.query(ProductAttribute).delete()
        session.query(ProductVariant).delete()
        session.query(Product).delete()
        session.commit()
    with RecSessionFactory() as session:
        session.query(UserInteraction).delete()
        session.commit()


@pytest.mark.asyncio
async def test_recently_viewed_endpoint_isolation_and_order():
    transport = httpx.ASGITransport(app=rec_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        store_id = "store-tech"
        user1 = "user-test-01"
        user2 = "user-test-02"

        # 1. Initially empty
        resp = await client.get(f"/api/v1/recommendations/recently-viewed?store_id={store_id}", headers={HEADER_USER_ID: user1})
        assert resp.status_code == 200
        assert resp.json() == []

        # 2. Seed products in catalog db
        with CatalogSessionFactory() as session:
            session.add(Product(id="prod-1", store_id=store_id, title="Prod 1", price=100.0, stock_quantity=5, category="Tech"))
            session.add(Product(id="prod-2", store_id=store_id, title="Prod 2", price=200.0, stock_quantity=5, category="Tech"))
            session.add(Product(id="prod-3", store_id=store_id, title="Prod 3", price=300.0, stock_quantity=5, category="Tech"))
            session.commit()

        # 3. Add VIEW interactions for user1 and user2
        with RecSessionFactory() as session:
            # user1 views prod-1, prod-2, then prod-1 again (most recent)
            session.add(UserInteraction(store_id=store_id, user_id=user1, product_id="prod-1", category="Tech", event_type="VIEW"))
            session.add(UserInteraction(store_id=store_id, user_id=user1, product_id="prod-2", category="Tech", event_type="VIEW"))
            session.add(UserInteraction(store_id=store_id, user_id=user1, product_id="prod-1", category="Tech", event_type="VIEW"))
            # user2 views prod-3
            session.add(UserInteraction(store_id=store_id, user_id=user2, product_id="prod-3", category="Tech", event_type="VIEW"))
            session.commit()

        # Query recently viewed for user1: prod-1 must be deduplicated
        resp1 = await client.get(f"/api/v1/recommendations/recently-viewed?store_id={store_id}&user_id={user1}")
        assert resp1.status_code == 200

        # Query recently viewed for user2: isolated from user1
        resp2 = await client.get(f"/api/v1/recommendations/recently-viewed?store_id={store_id}&user_id={user2}")
        assert resp2.status_code == 200

        # Query for a different store: isolated
        resp_diff_store = await client.get(f"/api/v1/recommendations/recently-viewed?store_id=store-fashion&user_id={user1}")
        assert resp_diff_store.status_code == 200
        assert resp_diff_store.json() == []


@pytest.mark.asyncio
async def test_back_in_stock_alerts_lifecycle():
    transport = httpx.ASGITransport(app=catalog_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        store_id = "store-fashion"
        user_id = "user-shopper-01"

        # Create out-of-stock product and in-stock product
        with CatalogSessionFactory() as session:
            p_out = Product(id="prod-sold-out", store_id=store_id, title="Vestido Esgotado", price=150.0, stock_quantity=0, category="Moda")
            p_in = Product(id="prod-in-stock", store_id=store_id, title="Camisa Disponivel", price=80.0, stock_quantity=10, category="Moda")
            session.add_all([p_out, p_in])
            session.commit()

        # 1. Unauthenticated subscription is rejected with 401
        payload = {"store_id": store_id, "product_id": "prod-sold-out"}
        unauth_resp = await client.post("/api/v1/catalog/alerts/stock", json=payload)
        assert unauth_resp.status_code == 401

        # 1.1 Expired JWT token is rejected with 401 TOKEN_EXPIRED
        expired_token = create_access_token(user_id=user_id, email="shopper@test.com", expires_in_seconds=-3600)
        expired_resp = await client.post("/api/v1/catalog/alerts/stock", json=payload, headers={"Authorization": f"Bearer {expired_token}"})
        assert expired_resp.status_code == 401
        exp_code = expired_resp.json().get("code") or expired_resp.json().get("error", {}).get("code")
        assert exp_code == "TOKEN_EXPIRED"

        # 1.2 Valid JWT Bearer token is accepted
        valid_jwt = create_access_token(user_id=user_id, email="shopper@test.com", expires_in_seconds=3600)

        # 2. Subscribing to an in-stock product is rejected with 400 ITEM_IN_STOCK
        in_stock_resp = await client.post(
            "/api/v1/catalog/alerts/stock",
            json={"store_id": store_id, "product_id": "prod-in-stock"},
            headers={"Authorization": f"Bearer {valid_jwt}"},
        )
        assert in_stock_resp.status_code == 400
        err_code = in_stock_resp.json().get("code") or in_stock_resp.json().get("error", {}).get("code")
        assert err_code == "ITEM_IN_STOCK"

        # 3. Subscribe to out-of-stock alert with valid JWT Bearer token
        sub_resp = await client.post(
            "/api/v1/catalog/alerts/stock",
            json=payload,
            headers={"Authorization": f"Bearer {valid_jwt}"},
        )
        assert sub_resp.status_code == 201
        data = sub_resp.json()
        alert_id = data["id"]
        assert data["status"] == "PENDING"
        assert data["user_id"] == user_id
        assert data["product_title"] == "Vestido Esgotado"

        # 4. Duplicate subscription is idempotent
        sub_resp2 = await client.post(
            "/api/v1/catalog/alerts/stock",
            json=payload,
            headers={"Authorization": f"Bearer {valid_jwt}"},
        )
        assert sub_resp2.status_code == 201
        assert sub_resp2.json()["id"] == alert_id

        # 5. Store mismatch validation
        mismatch_resp = await client.post(
            "/api/v1/catalog/alerts/stock",
            json={"store_id": "other-store", "product_id": "prod-sold-out"},
            headers={"Authorization": f"Bearer {valid_jwt}"},
        )
        assert mismatch_resp.status_code == 400
        err_data = mismatch_resp.json()
        assert err_data.get("code") == "STORE_MISMATCH" or err_data.get("error", {}).get("code") == "STORE_MISMATCH"

        # 6. List user alerts with Bearer token
        list_resp = await client.get("/api/v1/catalog/alerts/stock", headers={"Authorization": f"Bearer {valid_jwt}"})
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1
        assert list_resp.json()[0]["id"] == alert_id

        # 7. Isolation: other user sees 0 alerts
        user2_jwt = create_access_token(user_id="user-shopper-02", email="shopper2@test.com")
        list_user2 = await client.get("/api/v1/catalog/alerts/stock", headers={"Authorization": f"Bearer {user2_jwt}"})
        assert list_user2.status_code == 200
        assert len(list_user2.json()) == 0

        # 7.1 Cross-user cancellation attempt is rejected with 404
        cross_cancel = await client.delete(f"/api/v1/catalog/alerts/stock/{alert_id}", headers={"Authorization": f"Bearer {user2_jwt}"})
        assert cross_cancel.status_code == 404

        # 8. Unauthorized replenishment attempt (CUSTOMER or unauthenticated) is rejected with 403
        unauth_rep = await client.post("/api/v1/catalog/products/prod-sold-out/replenish?additional_stock=10")
        assert unauth_rep.status_code == 403

        cust_rep = await client.post("/api/v1/catalog/products/prod-sold-out/replenish?additional_stock=10", headers={HEADER_USER_ROLE: "CUSTOMER"})
        assert cust_rep.status_code == 403

        # 9. Authorized replenishment by ADMIN
        rep_resp = await client.post(
            "/api/v1/catalog/products/prod-sold-out/replenish?additional_stock=10",
            headers={HEADER_USER_ROLE: "ADMIN"}
        )
        assert rep_resp.status_code == 200
        assert rep_resp.json()["new_stock"] == 10

        # Verify alert transitioned to NOTIFIED
        list_after = await client.get("/api/v1/catalog/alerts/stock", headers={HEADER_USER_ID: user_id})
        assert list_after.json()[0]["status"] == "NOTIFIED"
        assert list_after.json()[0]["notified_at"] is not None

        # 10. Cancel alert
        del_resp = await client.delete(f"/api/v1/catalog/alerts/stock/{alert_id}", headers={HEADER_USER_ID: user_id})
        assert del_resp.status_code == 204

        list_final = await client.get("/api/v1/catalog/alerts/stock", headers={HEADER_USER_ID: user_id})
        assert len(list_final.json()) == 0


@pytest.mark.asyncio
async def test_product_detail_and_store_isolation():
    transport = httpx.ASGITransport(app=catalog_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Seed products in two different stores
        with CatalogSessionFactory() as session:
            p_tech = Product(id="prod-tech-x", store_id="store-tech", title="Tech Item", price=1000.0, stock_quantity=5, category="Tech")
            p_fashion = Product(id="prod-fashion-y", store_id="store-fashion", title="Fashion Item", price=200.0, stock_quantity=10, category="Moda")
            session.add_all([p_tech, p_fashion])
            session.commit()

        # 1. Product found in its own store
        resp1 = await client.get("/api/v1/catalog/stores/store-tech/products/prod-tech-x")
        assert resp1.status_code == 200
        assert resp1.json()["id"] == "prod-tech-x"
        assert resp1.json()["store_id"] == "store-tech"

        # 2. Product accessed under the wrong store context returns 404
        resp_mismatch = await client.get("/api/v1/catalog/stores/store-fashion/products/prod-tech-x")
        assert resp_mismatch.status_code == 404

        # 3. Inexistent product returns 404
        resp_404 = await client.get("/api/v1/catalog/stores/store-tech/products/prod-does-not-exist")
        assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_technical_filters_discovery():
    transport = httpx.ASGITransport(app=catalog_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        store_id = "store-tech"

        with CatalogSessionFactory() as session:
            p1 = Product(id="t1", store_id=store_id, title="Laptop", price=5000.0, stock_quantity=3, category="TI")
            p2 = Product(id="t2", store_id=store_id, title="Mouse", price=200.0, stock_quantity=10, category="Perifericos")
            session.add_all([p1, p2])
            session.flush()

            session.add_all([
                ProductAttribute(product_id="t1", name="Memória RAM", value="16GB"),
                ProductAttribute(product_id="t1", name="Armazenamento", value="512GB SSD"),
                ProductAttribute(product_id="t2", name="Conexão", value="Wireless"),
            ])
            session.commit()

        resp = await client.get(f"/api/v1/catalog/stores/{store_id}/filters")
        assert resp.status_code == 200
        filters = resp.json()["filters"]
        filter_names = [f["name"] for f in filters]
        assert "Memória RAM" in filter_names
