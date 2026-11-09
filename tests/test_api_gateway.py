import pytest
from fastapi.testclient import TestClient

from gateway_app import app as gateway_app
from sanitizer import sanitize_and_inject_headers
from python_common.security import create_access_token


@pytest.fixture
def client():
    return TestClient(gateway_app)


def test_gateway_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "api-gateway"
    assert data["port"] == 8000


def test_diagnostics_lists_all_nine_services(client):
    """Verifica PB-27: o painel lista os 9 serviços catalogados."""
    response = client.get("/api/v1/system/services")
    assert response.status_code == 200
    data = response.json()
    assert data["total_services"] == 9
    services = data["services"]
    assert len(services) == 9

    # Check that Gateway is UP and future sprints are NOT_STARTED
    services_by_id = {s["id"]: s for s in services}
    assert services_by_id["api-gateway"]["status"] == "UP"
    assert services_by_id["api-gateway"]["port"] == 8000

    # Active services in all sprints (Sprints 1 to 4) report UP or DOWN
    for active_id in [
        "auth-service",
        "lps-config-service",
        "catalog-service",
        "cart-service",
        "orders-service",
        "payments-service",
        "shipping-service",
        "recommendation-service",
    ]:
        assert services_by_id[active_id]["status"] in {"UP", "DOWN"}


def test_header_sanitization_removes_forged_headers():
    """Verifica PB-03: remoção rigorosa de cabeçalhos internos forjados pelo cliente."""
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/catalog/products",
        "headers": [
            (b"x-internal-token", b"client-forged-secret"),
            (b"x-user-id", b"forged-admin-uuid"),
            (b"x-user-role", b"FORGED_ADMIN"),
            (b"x-store-id", b"valid-store-uuid"),
            (b"user-agent", b"Mozilla/5.0"),
        ],
    }
    request = Request(scope)

    clean_headers, user_claims = sanitize_and_inject_headers(request)

    # Forged headers must be eliminated completely
    assert "x-internal-token" not in clean_headers
    assert "X-Internal-Token" not in clean_headers
    assert "x-user-id" not in clean_headers
    assert "X-User-ID" not in clean_headers
    assert "x-user-role" not in clean_headers
    assert "X-User-Role" not in clean_headers

    # Legitimate headers must be preserved
    assert clean_headers.get("x-store-id") == "valid-store-uuid"
    assert "X-Request-ID" in clean_headers


def test_header_sanitization_injects_trusted_user_from_jwt():
    """Verifica PB-03: injeção de X-User-ID e X-User-Role legítimos a partir de JWT válido."""
    from starlette.requests import Request

    token = create_access_token(user_id="legit-user-42", email="user@ufal.br", role="STORE_ADMIN")
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/auth/me",
        "headers": [
            (b"authorization", f"Bearer {token}".encode()),
            (b"x-internal-token", b"forged-token"),  # must be removed
        ],
    }
    request = Request(scope)

    clean_headers, user_claims = sanitize_and_inject_headers(request)

    assert "X-Internal-Token" not in clean_headers
    assert clean_headers.get("X-User-ID") == "legit-user-42"
    assert clean_headers.get("X-User-Role") == "STORE_ADMIN"
    assert user_claims["user_id"] == "legit-user-42"
