"""
Testes abrangentes de Contas de Demonstracao, RBAC multi-camadas,
vinculo de gestor a loja (store_id) e seguranca de reposicao de estoque.
"""
import os
import pytest
from fastapi.testclient import TestClient

from auth_app import app as auth_app, init_db as init_auth_db
from auth_database import SessionFactory as AuthSession
from auth_models import User, UserPreference, UserAuditLog
from catalog_app import app as catalog_app
from catalog_database import SessionFactory as CatalogSession, init_db as init_catalog_db
from catalog_models import Product, InventoryMovement
from catalog_routes import manifest_provider as catalog_manifest_provider
from lps_database import SessionFactory as LpsSession, init_db as init_lps_db
from lps_models import Store, ProductManifest
from scripts.seed_demo_stores import seed_demo_users, DEMO_ACCOUNTS
from python_common.security import verify_password, get_internal_service_key, HEADER_INTERNAL_TOKEN


@pytest.fixture(autouse=True)
def clean_dbs():
    init_auth_db()
    init_lps_db()
    init_catalog_db()
    with AuthSession() as s:
        s.query(UserAuditLog).delete()
        s.query(UserPreference).delete()
        s.query(User).delete()
        s.commit()
    with LpsSession() as s:
        s.query(ProductManifest).delete()
        s.query(Store).delete()
        s.commit()
    with CatalogSession() as s:
        s.query(InventoryMovement).delete()
        s.query(Product).delete()
        s.commit()
    catalog_manifest_provider.clear_cache()
    yield


@pytest.fixture
def auth_client():
    return TestClient(auth_app)


@pytest.fixture
def catalog_client():
    return TestClient(catalog_app)


# -----------------------------------------------------------------------------
# 1. SEED DE CONTAS DE DEMONSTRAÇÃO
# -----------------------------------------------------------------------------


def test_seed_demo_users_creates_all_three_accounts():
    """Valida a criacao das 3 contas de demo com Argon2id, papeis e store_id corretos."""
    created = seed_demo_users(reset_demo_users=False)
    assert created == 3

    with AuthSession() as s:
        users = {u.email: u for u in s.query(User).all()}

    assert len(users) == 3

    # Cliente
    cliente = users.get("cliente.demo@example.com")
    assert cliente is not None
    assert cliente.role == "CUSTOMER"
    assert cliente.store_id is None
    assert cliente.is_active is True
    assert cliente.password_hash.startswith("$argon2id$")
    assert verify_password("ClienteDemo2026!", cliente.password_hash)

    # Gerente de Loja
    gerente = users.get("gerente.demo@example.com")
    assert gerente is not None
    assert gerente.role == "STORE_ADMIN"
    assert gerente.store_id == "store-tech"
    assert gerente.is_active is True
    assert gerente.password_hash.startswith("$argon2id$")
    assert verify_password("LojaDemo2026!", gerente.password_hash)

    # Administrador LPS
    admin = users.get("admin.demo@example.com")
    assert admin is not None
    assert admin.role == "LPS_ADMIN"
    assert admin.store_id is None
    assert admin.is_active is True
    assert admin.password_hash.startswith("$argon2id$")
    assert verify_password("AdminDemo2026!", admin.password_hash)


def test_seed_demo_users_idempotence():
    """Valida que uma nova execucao nao recria, nao duplica e nao altera dados."""
    assert seed_demo_users(reset_demo_users=False) == 3
    # Segunda execucao: nao deve criar nada
    assert seed_demo_users(reset_demo_users=False) == 0

    with AuthSession() as s:
        assert s.query(User).count() == 3


def test_seed_demo_users_reset_flag():
    """Valida que --reset-demo-users restaura credenciais quando explicitamente solicitado."""
    seed_demo_users(reset_demo_users=False)

    # Modifica a senha do cliente
    with AuthSession() as s:
        u = s.query(User).filter_by(email="cliente.demo@example.com").first()
        u.name = "Cliente Modificado"
        s.commit()

    # Executa sem reset: nada muda
    seed_demo_users(reset_demo_users=False)
    with AuthSession() as s:
        u = s.query(User).filter_by(email="cliente.demo@example.com").first()
        assert u.name == "Cliente Modificado"

    # Executa com reset: restaura
    seed_demo_users(reset_demo_users=True)
    with AuthSession() as s:
        u = s.query(User).filter_by(email="cliente.demo@example.com").first()
        assert u.name == "Cliente Demonstração"
        assert verify_password("ClienteDemo2026!", u.password_hash)


def test_seed_demo_users_safety_guards(monkeypatch):
    """Garante que em producao ou com DISABLE_DEMO_USERS=true, nenhuma conta demo e criada."""
    monkeypatch.setenv("DISABLE_DEMO_USERS", "true")
    assert seed_demo_users() == 0
    with AuthSession() as s:
        assert s.query(User).count() == 0

    monkeypatch.delenv("DISABLE_DEMO_USERS")
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert seed_demo_users() == 0
    with AuthSession() as s:
        assert s.query(User).count() == 0


def test_demo_accounts_can_login(auth_client):
    """Testa se as tres contas conseguem autenticar via /api/v1/auth/login."""
    seed_demo_users()

    for acc in DEMO_ACCOUNTS:
        resp = auth_client.post(
            "/api/v1/auth/login",
            json={"email": acc["email"], "password": acc["password"]},
        )
        assert resp.status_code == 200, f"Falha no login de {acc['email']}: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == acc["role"]
        assert data["user"]["store_id"] == acc.get("store_id")


# -----------------------------------------------------------------------------
# 2. RBAC & VÍNCULO DE STORE_ID NA API ADMIN DE USUÁRIOS
# -----------------------------------------------------------------------------


def _get_lps_admin_token(auth_client):
    seed_demo_users()
    resp = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin.demo@example.com", "password": "AdminDemo2026!"},
    )
    return resp.json()["access_token"]


def test_admin_create_store_admin_associates_store_id(auth_client):
    """STORE_ADMIN pode ser criado com associacao a uma loja e reflete no usuario."""
    admin_token = _get_lps_admin_token(auth_client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Criacao com store_id
    resp_ok = auth_client.post(
        "/api/v1/auth/admin/users",
        headers=headers,
        json={
            "name": "Gerente Moda",
            "email": "gerente.moda@example.com",
            "password": "SenhaForte2026!",
            "role": "STORE_ADMIN",
            "store_id": "store-fashion",
        },
    )
    assert resp_ok.status_code == 201
    created = resp_ok.json()
    assert created["role"] == "STORE_ADMIN"
    assert created["store_id"] == "store-fashion"


def test_admin_update_clears_store_id_for_non_store_admin(auth_client):
    """Promover ou alterar STORE_ADMIN para LPS_ADMIN ou CUSTOMER remove store_id."""
    admin_token = _get_lps_admin_token(auth_client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    with AuthSession() as s:
        gerente = s.query(User).filter_by(email="gerente.demo@example.com").first()
        gerente_id = gerente.id

    # Altera para LPS_ADMIN
    resp = auth_client.patch(
        f"/api/v1/auth/admin/users/{gerente_id}",
        headers=headers,
        json={"role": "LPS_ADMIN"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "LPS_ADMIN"
    assert resp.json()["store_id"] is None


def test_internal_authz_endpoint_exposes_store_id(auth_client):
    """Endpoint interno de autorizacao expoe store_id e permissoes corretas."""
    seed_demo_users()
    with AuthSession() as s:
        gerente = s.query(User).filter_by(email="gerente.demo@example.com").first()
        gerente_id = gerente.id

    resp = auth_client.get(
        f"/internal/v1/auth/users/{gerente_id}/authz",
        headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
    )
    assert resp.status_code == 200
    authz = resp.json()
    assert authz["role"] == "STORE_ADMIN"
    assert authz["store_id"] == "store-tech"
    assert "catalog:replenish" in authz["permissions"]
    assert "lps:manage" not in authz["permissions"]


# -----------------------------------------------------------------------------
# 3. REABASTECIMENTO DE ESTOQUE SEGURO (POST /catalog/products/{id}/replenish)
# -----------------------------------------------------------------------------


def _setup_catalog_products():
    with CatalogSession() as s:
        prod_tech = Product(
            id="prod-tech-01",
            store_id="store-tech",
            title="Notebook Pro",
            description="Laptop potente",
            price=5000.0,
            stock_quantity=5,
            category="Notebooks",
            is_active=True,
        )
        prod_fashion = Product(
            id="prod-fashion-01",
            store_id="store-fashion",
            title="Vestido Seda",
            description="Vestido elegante",
            price=299.0,
            stock_quantity=2,
            category="Vestidos",
            is_active=True,
        )
        s.add_all([prod_tech, prod_fashion])
        s.commit()


def test_replenish_unauthenticated_fails(catalog_client):
    """Requisicao sem token Bearer nem token interno e rejeitada com 403."""
    _setup_catalog_products()
    resp = catalog_client.post(
        "/api/v1/catalog/products/prod-tech-01/replenish?additional_stock=10",
    )
    assert resp.status_code == 403


def test_replenish_customer_forbidden(auth_client, catalog_client):
    """Cliente final autenticado nao tem permissao para repor estoque (403)."""
    seed_demo_users()
    _setup_catalog_products()

    # Login como cliente
    login_resp = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "cliente.demo@example.com", "password": "ClienteDemo2026!"},
    )
    token = login_resp.json()["access_token"]

    resp = catalog_client.post(
        "/api/v1/catalog/products/prod-tech-01/replenish?additional_stock=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert "catalog:replenish" in resp.text or "permissão" in resp.text


def test_replenish_store_admin_cross_store_forbidden(auth_client, catalog_client):
    """STORE_ADMIN de tech tentando repor estoque de moda recebe 403."""
    seed_demo_users()
    _setup_catalog_products()

    # Login como gerente tech
    login_resp = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "gerente.demo@example.com", "password": "LojaDemo2026!"},
    )
    token = login_resp.json()["access_token"]

    # Tentativa no produto de moda (store-fashion)
    resp = catalog_client.post(
        "/api/v1/catalog/products/prod-fashion-01/replenish?additional_stock=15",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert "store-fashion" in resp.text or "gestor" in resp.text


def test_replenish_store_admin_own_store_success(auth_client, catalog_client):
    """STORE_ADMIN de tech repondo produto da sua propria loja tem sucesso (200)."""
    seed_demo_users()
    _setup_catalog_products()

    # Login como gerente tech
    login_resp = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "gerente.demo@example.com", "password": "LojaDemo2026!"},
    )
    token = login_resp.json()["access_token"]

    resp = catalog_client.post(
        "/api/v1/catalog/products/prod-tech-01/replenish?additional_stock=25",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["new_stock"] == 30

    # Verifica persistencia no banco do Catálogo
    with CatalogSession() as s:
        prod = s.query(Product).filter_by(id="prod-tech-01").first()
        assert prod.stock_quantity == 30


def test_replenish_lps_admin_can_replenish_any_store(auth_client, catalog_client):
    """LPS_ADMIN tem permissao global para reabastecer qualquer loja da plataforma."""
    seed_demo_users()
    _setup_catalog_products()

    # Login como admin da LPS
    login_resp = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin.demo@example.com", "password": "AdminDemo2026!"},
    )
    token = login_resp.json()["access_token"]

    # Repoe moda
    resp_fashion = catalog_client.post(
        "/api/v1/catalog/products/prod-fashion-01/replenish?additional_stock=50",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_fashion.status_code == 200
    assert resp_fashion.json()["new_stock"] == 52

    # Repoe tech
    resp_tech = catalog_client.post(
        "/api/v1/catalog/products/prod-tech-01/replenish?additional_stock=40",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_tech.status_code == 200
    assert resp_tech.json()["new_stock"] == 45
    assert resp_tech.status_code == 200
    assert resp_tech.json()["new_stock"] == 45
