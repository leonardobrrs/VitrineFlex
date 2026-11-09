import pytest
import httpx

from gateway_app import app as gateway_app
import proxy as gateway_proxy
from auth_app import app as auth_app, init_db
from auth_database import SessionFactory
from auth_models import User, UserPreference
from recommendation_app import app as rec_app
from recommendation_database import init_db as init_rec_db, SessionFactory as RecSessionFactory
from recommendation_models import UserInteraction
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def clean_database():
    init_db()
    with SessionFactory() as session:
        session.query(UserPreference).delete()
        session.query(User).delete()
        session.commit()


@pytest.mark.asyncio
async def test_full_gateway_to_auth_integration_with_header_sanitization(monkeypatch):
    """
    Testa o fluxo ponta a ponta:
    Cliente -> API Gateway (:8000) -> Auth Service (:8001)
    Garante:
    1. Registro via rota /api/v1/auth/register através do Gateway.
    2. Login via /api/v1/auth/login através do Gateway.
    3. Tentativa de forjamento de X-Internal-Token, X-User-ID e X-User-Role é higienizada pelo Gateway.
    4. X-User-ID legítimo é injetado pelo Gateway a partir do JWT e recebido pelo Auth Service.
    """
    OriginalAsyncClient = httpx.AsyncClient
    auth_transport = httpx.ASGITransport(app=auth_app)

    # Monkeypatch AsyncClient inside proxy module to route downstream calls to auth_transport
    class MockDownstreamAsyncClient(OriginalAsyncClient):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = auth_transport
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(gateway_proxy.httpx, "AsyncClient", MockDownstreamAsyncClient)

    gw_transport = httpx.ASGITransport(app=gateway_app)

    async with OriginalAsyncClient(transport=gw_transport, base_url="http://gateway:8000") as gw_client:
        # 1. Register User via Gateway
        email = "integ.user@ufal.br"
        password = "SecurePassword123!"
        reg_resp = await gw_client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "name": "Aluno Integrado", "role": "CUSTOMER"},
        )
        assert reg_resp.status_code == 201
        reg_data = reg_resp.json()
        assert reg_data["email"] == email
        user_id = reg_data["id"]

        # 2. Login via Gateway
        login_resp = await gw_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        token = login_data["access_token"]
        assert token is not None

        # 3. Call /api/v1/auth/me attempting to forge X-Internal-Token, X-User-ID and X-User-Role
        forged_headers = {
            "Authorization": f"Bearer {token}",
            "X-Internal-Token": "hacker-secret-token",
            "X-User-ID": "forged-admin-uuid",
            "X-User-Role": "SUPER_ADMIN",
        }
        me_resp = await gw_client.get("/api/v1/auth/me", headers=forged_headers)
        assert me_resp.status_code == 200
        me_data = me_resp.json()

        # The user returned MUST be the real authenticated user, NOT the forged user!
        assert me_data["id"] == user_id
        assert me_data["email"] == email
        assert me_data["role"] == "CUSTOMER"

        # 4. Update Preferences via Gateway (PB-05)
        pref_resp = await gw_client.put(
            "/api/v1/auth/me/preferences",
            headers={"Authorization": f"Bearer {token}"},
            json={"categories": ["Vestuário", "Calçados"]},
        )
        assert pref_resp.status_code == 200
        pref_data = pref_resp.json()
        assert pref_data["categories"] == ["Vestuário", "Calçados"]


@pytest.mark.asyncio
async def test_gateway_to_recommendations_store_trust_and_isolation_integration(monkeypatch):
    """
    Testa a confiança e o isolamento de X-Store-ID passando pelo API Gateway:
    1. O cliente tenta forjar X-Store-ID no cabeçalho divergindo do contexto da requisição.
    2. O Gateway sobrescreve/higieniza e a rota rejeita a divergência com 400 STORE_CONTEXT_MISMATCH.
    3. Produto de outra loja enviado através do Gateway é rejeitado com 400 PRODUCT_STORE_MISMATCH.
    4. Valida no banco que nenhuma interação inválida é persistida.
    5. Interação legítima na loja correta é persistida com sucesso.
    """
    init_rec_db()
    with RecSessionFactory() as s:
        s.query(UserInteraction).delete()
        s.commit()

    OriginalAsyncClient = httpx.AsyncClient
    rec_transport = httpx.ASGITransport(app=rec_app)

    class MockDownstreamAsyncClient(OriginalAsyncClient):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = rec_transport
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(gateway_proxy.httpx, "AsyncClient", MockDownstreamAsyncClient)

    def mock_catalog_product(url, *args, **kwargs):
        mock_resp = MagicMock()
        if "prod-fashion-shirt" in url:
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "id": "prod-fashion-shirt",
                "store_id": "store-fashion",
                "category": "Vestuário",
                "is_active": True,
            }
        elif "prod-tech-xps" in url:
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "id": "prod-tech-xps",
                "store_id": "store-tech",
                "category": "Notebooks",
                "is_active": True,
            }
        else:
            mock_resp.status_code = 404
            mock_resp.json.return_value = {"error": {"code": "PRODUCT_NOT_FOUND", "message": "Produto não encontrado"}}
        return mock_resp

    gw_transport = httpx.ASGITransport(app=gateway_app)

    with patch("httpx.Client.get", side_effect=mock_catalog_product):
        async with OriginalAsyncClient(transport=gw_transport, base_url="http://gateway:8000") as gw_client:
            # 1. Tentativa de forjamento: URL com ?store_id=store-fashion, mas corpo com store-tech
            # O Gateway extrai store-fashion da query e injeta como X-Store-ID confiável.
            # A rota pública detecta a divergência entre X-Store-ID (store-fashion) e corpo (store-tech).
            forged_resp = await gw_client.post(
                "/api/v1/recommendations/interactions?store_id=store-fashion",
                headers={"X-Store-ID": "store-evil-forged"},
                json={
                    "store_id": "store-tech",
                    "product_id": "prod-tech-xps",
                    "category": "Notebooks",
                    "event_type": "VIEW",
                },
            )
            assert forged_resp.status_code == 400
            assert forged_resp.json()["error"]["code"] == "STORE_CONTEXT_MISMATCH"

            # Confirma no banco que nada foi persistido
            with RecSessionFactory() as s:
                assert s.query(UserInteraction).count() == 0, "Nenhuma interação inválida pode ser gravada no banco"

            # 2. Produto de outra loja: enviado para store-fashion, mas prod-tech-xps pertence a store-tech
            cross_resp = await gw_client.post(
                "/api/v1/recommendations/interactions",
                json={
                    "store_id": "store-fashion",
                    "product_id": "prod-tech-xps",
                    "category": "Notebooks",
                    "event_type": "VIEW",
                },
            )
            assert cross_resp.status_code == 400
            assert cross_resp.json()["error"]["code"] == "PRODUCT_STORE_MISMATCH"

            with RecSessionFactory() as s:
                assert s.query(UserInteraction).count() == 0, "Nenhuma interação de produto cruzado pode ser gravada"

            # 3. Interação legítima dentro da própria loja
            valid_resp = await gw_client.post(
                "/api/v1/recommendations/interactions",
                json={
                    "store_id": "store-fashion",
                    "product_id": "prod-fashion-shirt",
                    "category": "Vestuário",
                    "event_type": "VIEW",
                },
            )
            assert valid_resp.status_code == 201
            valid_data = valid_resp.json()
            assert valid_data["store_id"] == "store-fashion"
            assert valid_data["product_id"] == "prod-fashion-shirt"

            with RecSessionFactory() as s:
                records = s.query(UserInteraction).all()
                assert len(records) == 1, "Exatamente 1 interação legítima deve estar persistida"
                assert records[0].store_id == "store-fashion"
                assert records[0].product_id == "prod-fashion-shirt"
