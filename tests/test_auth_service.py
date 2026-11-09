import pytest
from fastapi.testclient import TestClient

from auth_app import app as auth_app, init_db
from auth_database import SessionFactory
from auth_models import User, UserPreference
from python_common.security import get_internal_service_key


@pytest.fixture(autouse=True)
def setup_database():
    init_db()
    # Clean tables between tests for isolation
    with SessionFactory() as session:
        session.query(UserPreference).delete()
        session.query(User).delete()
        session.commit()


@pytest.fixture
def client():
    return TestClient(auth_app)


def test_auth_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "auth-service"
    assert data["port"] == 8001


def test_user_register_and_login_success(client):
    email = "test.user@ufal.br"
    password = "StrongPassword123"

    # Register
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": "Aluno UFAL", "role": "CUSTOMER"},
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == email
    assert user_data["name"] == "Aluno UFAL"
    assert "password" not in user_data
    assert "password_hash" not in user_data

    # Duplicate registration conflict (409)
    dup_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": "Aluno Repetido"},
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"

    # Login Success (200)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]

    # Access /api/v1/auth/me with Bearer token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email


def test_user_login_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@ufal.br", "password": "WrongPassword"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_user_preferences_lifecycle(client):
    # Register & Login
    email = "preferences.user@ufal.br"
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "name": "Pref Tester"},
    )
    user_id = reg_resp.json()["id"]

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]

    # Initial preferences are empty
    get_resp = client.get(
        "/api/v1/auth/me/preferences",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["categories"] == []

    # Update preferences with valid list (PB-05 Scenario 1)
    new_categories = ["tecnologia", "hardware", "livros"]
    put_resp = client.put(
        "/api/v1/auth/me/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"categories": new_categories},
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["categories"] == new_categories

    # Reject empty categories list (PB-05 Scenario 2)
    empty_resp = client.put(
        "/api/v1/auth/me/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"categories": []},
    )
    assert empty_resp.status_code == 422
    assert empty_resp.json()["error"]["code"] in {"INVALID_PREFERENCES", "VALIDATION_ERROR"}

    # Internal route requires X-Internal-Token (ADR-007)
    # 1. Reject without token
    internal_denied = client.get(f"/internal/v1/auth/users/{user_id}/preferences")
    assert internal_denied.status_code == 403
    assert internal_denied.json()["error"]["code"] == "INVALID_INTERNAL_TOKEN"

    # 2. Reject with forged token
    forged_denied = client.get(
        f"/internal/v1/auth/users/{user_id}/preferences",
        headers={"X-Internal-Token": "forged-secret"},
    )
    assert forged_denied.status_code == 403

    # 3. Success with valid internal token
    valid_token = get_internal_service_key()
    internal_ok = client.get(
        f"/internal/v1/auth/users/{user_id}/preferences",
        headers={"X-Internal-Token": valid_token},
    )
    assert internal_ok.status_code == 200
    assert internal_ok.json()["categories"] == new_categories
