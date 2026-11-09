"""
Testes do gerenciamento administrativo: usuários/permissões (Auth) e ciclo de vida de lojas (LPS),
incluindo bloqueio comercial de lojas arquivadas no Catálogo. Sem mocks de persistência: usa os bancos
SQLite de teste reais; apenas a consulta inter-serviço de autorização do LPS ao Auth é redirecionada
para o banco/serviço Auth em processo.
"""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

import python_common.admin_auth as admin_auth
from python_common.security import (
    HEADER_INTERNAL_TOKEN,
    HEADER_USER_ROLE,
    get_internal_service_key,
)

from auth_app import app as auth_app, init_db as init_auth_db
from auth_database import SessionFactory as AuthSession
from auth_models import User, UserPreference, UserAuditLog
from auth_admin_routes import _guard_last_admin
from python_common.errors import AppError
from python_common.security import hash_password

from lps_app import app as lps_app
from lps_database import SessionFactory as LpsSession, init_db as init_lps_db
from lps_models import Store, ProductManifest, StoreAuditLog

from catalog_app import app as catalog_app
from catalog_database import init_db as init_catalog_db
from catalog_routes import manifest_provider as catalog_manifest_provider

PWD = "SenhaForte123"


# ----------------------------------------------------------------------------- AUTH


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
        s.query(StoreAuditLog).delete()
        s.query(ProductManifest).delete()
        s.query(Store).delete()
        s.commit()
    catalog_manifest_provider.clear_cache()
    yield


@pytest.fixture
def auth():
    return TestClient(auth_app)


def make_user(email, role="CUSTOMER", active=True, name="Fulano Teste"):
    with AuthSession() as s:
        u = User(email=email, name=name, role=role, is_active=active, password_hash=hash_password(PWD))
        s.add(u)
        s.flush()
        s.add(UserPreference(user_id=u.id, categories="[]"))
        s.commit()
        return u.id


def login(client, email, password=PWD):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return r


def bearer(client, email):
    r = login(client, email)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_public_register_cannot_grant_admin_role(auth):
    r = auth.post(
        "/api/v1/auth/register",
        json={"email": "hacker@x.com", "password": "abcdef12", "name": "Hacker", "role": "LPS_ADMIN"},
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "ROLE_NOT_ALLOWED"
    with AuthSession() as s:
        assert s.query(User).filter(User.email == "hacker@x.com").first() is None


def test_admin_endpoints_require_authentication_and_admin_role(auth):
    make_user("cliente@x.com", "CUSTOMER")
    make_user("loja@x.com", "STORE_ADMIN")

    assert auth.get("/api/v1/auth/admin/users").status_code == 401

    h = bearer(auth, "cliente@x.com")
    for method, url in [
        ("get", "/api/v1/auth/admin/users"),
        ("get", "/api/v1/auth/admin/roles"),
        ("get", "/api/v1/auth/admin/audit-logs"),
    ]:
        assert getattr(auth, method)(url, headers=h).status_code == 403

    # Forjar cabeçalhos de papel/identidade não concede acesso (o backend relê o banco)
    forged = {**h, HEADER_USER_ROLE: "LPS_ADMIN", "X-User-ID": "qualquer"}
    assert auth.get("/api/v1/auth/admin/users", headers=forged).status_code == 403

    # Usuário comum não consegue se auto-promover
    me = auth.get("/api/v1/auth/me", headers=h).json()
    r = auth.patch(f"/api/v1/auth/admin/users/{me['id']}", headers=h, json={"role": "LPS_ADMIN"})
    assert r.status_code == 403

    # STORE_ADMIN também não gerencia usuários
    hs = bearer(auth, "loja@x.com")
    assert auth.post(
        "/api/v1/auth/admin/users", headers=hs,
        json={"name": "Novo", "email": "n@x.com", "password": PWD, "role": "CUSTOMER"},
    ).status_code == 403


def test_admin_creates_user_with_argon2id_and_never_exposes_secrets(auth):
    make_user("admin@x.com", "LPS_ADMIN")
    h = bearer(auth, "admin@x.com")

    r = auth.post(
        "/api/v1/auth/admin/users", headers=h,
        json={"name": "Maria Loja", "email": "Maria@X.com", "password": PWD, "role": "STORE_ADMIN"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["role"] == "STORE_ADMIN" and body["is_active"] is True
    assert body["email"] == "maria@x.com"
    for secret in ("password", "password_hash", PWD):
        assert secret not in json.dumps(body)

    with AuthSession() as s:
        u = s.query(User).filter(User.email == "maria@x.com").first()
        assert u.password_hash.startswith("$argon2id$")

    # O novo usuário consegue entrar e recebe o papel concedido
    assert login(auth, "maria@x.com").json()["user"]["role"] == "STORE_ADMIN"

    # Duplicado, papel inválido, senha curta
    assert auth.post("/api/v1/auth/admin/users", headers=h,
                     json={"name": "Dup", "email": "maria@x.com", "password": PWD, "role": "CUSTOMER"}).status_code == 409
    assert auth.post("/api/v1/auth/admin/users", headers=h,
                     json={"name": "Bad", "email": "b@x.com", "password": PWD, "role": "SUPERUSER"}).status_code == 422
    assert auth.post("/api/v1/auth/admin/users", headers=h,
                     json={"name": "Bad", "email": "c@x.com", "password": "123", "role": "CUSTOMER"}).status_code == 422
    # O papel precisa ser explícito
    assert auth.post("/api/v1/auth/admin/users", headers=h,
                     json={"name": "Bad", "email": "d@x.com", "password": PWD}).status_code == 422


def test_list_search_and_get(auth):
    make_user("admin@x.com", "LPS_ADMIN", name="Chefe")
    make_user("ana@x.com", name="Ana Souza")
    make_user("bruno@x.com", name="Bruno Lima")
    h = bearer(auth, "admin@x.com")

    assert len(auth.get("/api/v1/auth/admin/users", headers=h).json()) == 3
    res = auth.get("/api/v1/auth/admin/users?q=ana", headers=h).json()
    assert [u["email"] for u in res] == ["ana@x.com"]
    assert len(auth.get("/api/v1/auth/admin/users?q=LIMA", headers=h).json()) == 1
    assert len(auth.get("/api/v1/auth/admin/users?role=LPS_ADMIN", headers=h).json()) == 1
    uid = res[0]["id"]
    assert auth.get(f"/api/v1/auth/admin/users/{uid}", headers=h).json()["name"] == "Ana Souza"
    assert auth.get("/api/v1/auth/admin/users/inexistente", headers=h).status_code == 404

    roles = auth.get("/api/v1/auth/admin/roles", headers=h).json()
    assert {r["role"] for r in roles} == {"CUSTOMER", "STORE_ADMIN", "LPS_ADMIN"}


def test_role_change_is_enforced_by_backend_immediately(auth):
    make_user("admin1@x.com", "LPS_ADMIN")
    make_user("admin2@x.com", "LPS_ADMIN")
    cid = make_user("cli@x.com", "CUSTOMER")
    h1 = bearer(auth, "admin1@x.com")
    h2 = bearer(auth, "admin2@x.com")  # JWT emitido enquanto era admin
    hc = bearer(auth, "cli@x.com")

    # Promover cliente -> passa a ser admin de verdade
    assert auth.patch(f"/api/v1/auth/admin/users/{cid}", headers=h1, json={"role": "LPS_ADMIN"}).status_code == 200
    assert auth.get("/api/v1/auth/admin/users", headers=hc).status_code == 200  # JWT antigo, papel relido do banco

    # Rebaixar admin2 -> o JWT antigo dele perde acesso imediatamente
    with AuthSession() as s:
        a2 = s.query(User).filter(User.email == "admin2@x.com").first().id
    assert auth.patch(f"/api/v1/auth/admin/users/{a2}", headers=h1, json={"role": "CUSTOMER"}).status_code == 200
    assert auth.get("/api/v1/auth/admin/users", headers=h2).status_code == 403

    # Endpoint interno de autorização reflete o estado atual
    ih = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}
    authz = auth.get(f"/internal/v1/auth/users/{a2}/authz", headers=ih).json()
    assert authz["role"] == "CUSTOMER" and authz["permissions"] == []
    assert auth.get(f"/internal/v1/auth/users/{a2}/authz").status_code == 403  # exige token interno


def test_deactivate_blocks_login_and_session_then_reactivate(auth):
    make_user("admin@x.com", "LPS_ADMIN")
    uid = make_user("cli@x.com")
    h = bearer(auth, "admin@x.com")
    hc = bearer(auth, "cli@x.com")

    assert auth.patch(f"/api/v1/auth/admin/users/{uid}", headers=h, json={"is_active": False}).json()["is_active"] is False
    r = login(auth, "cli@x.com")
    assert r.status_code == 403 and r.json()["error"]["code"] == "ACCOUNT_DISABLED"
    assert auth.get("/api/v1/auth/me", headers=hc).status_code == 403

    assert auth.patch(f"/api/v1/auth/admin/users/{uid}", headers=h, json={"is_active": True}).status_code == 200
    assert login(auth, "cli@x.com").status_code == 200


def test_delete_is_soft_and_preserves_row_for_history(auth):
    make_user("admin@x.com", "LPS_ADMIN")
    uid = make_user("cli@x.com", name="Cliente Com Pedidos")
    h = bearer(auth, "admin@x.com")

    r = auth.delete(f"/api/v1/auth/admin/users/{uid}", headers=h)
    assert r.status_code == 200
    assert r.json()["deleted_at"] is not None and r.json()["is_active"] is False

    with AuthSession() as s:
        u = s.query(User).filter(User.id == uid).first()
        assert u is not None  # id preservado para pedidos/financeiro
        assert u.deleted_at is not None
        assert u.email.endswith("@removed.invalid") and u.name == "Usuário removido"

    assert login(auth, "cli@x.com").status_code == 401
    # Fora da listagem padrão; aparece com include_deleted
    assert all(x["id"] != uid for x in auth.get("/api/v1/auth/admin/users", headers=h).json())
    assert any(x["id"] == uid for x in auth.get("/api/v1/auth/admin/users?include_deleted=true", headers=h).json())
    # Não pode ser editado nem excluído novamente
    assert auth.patch(f"/api/v1/auth/admin/users/{uid}", headers=h, json={"name": "Outro"}).status_code == 409
    assert auth.delete(f"/api/v1/auth/admin/users/{uid}", headers=h).status_code == 409
    # E-mail original é liberado para novo cadastro
    assert auth.post("/api/v1/auth/register",
                     json={"email": "cli@x.com", "password": PWD, "name": "Novo Cliente"}).status_code == 201


def test_self_protection_and_last_admin_protection(auth):
    aid = make_user("admin@x.com", "LPS_ADMIN")
    h = bearer(auth, "admin@x.com")

    # O administrador não rebaixa, desativa nem exclui a si próprio
    r = auth.patch(f"/api/v1/auth/admin/users/{aid}", headers=h, json={"role": "CUSTOMER"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "SELF_ROLE_CHANGE_FORBIDDEN"
    r = auth.patch(f"/api/v1/auth/admin/users/{aid}", headers=h, json={"is_active": False})
    assert r.status_code == 409 and r.json()["error"]["code"] == "SELF_DEACTIVATION_FORBIDDEN"
    r = auth.delete(f"/api/v1/auth/admin/users/{aid}", headers=h)
    assert r.status_code == 409 and r.json()["error"]["code"] == "SELF_DELETE_FORBIDDEN"

    # O guard do último administrador ativo bloqueia qualquer operação que o removeria
    with AuthSession() as s:
        only = s.query(User).filter(User.id == aid).first()
        with pytest.raises(AppError) as exc:
            _guard_last_admin(s, only)
        assert exc.value.code == "LAST_ADMIN_PROTECTED"

    # Com um segundo admin, o primeiro pode ser tratado por ele; o segundo vira o último
    bid = make_user("admin2@x.com", "LPS_ADMIN")
    h2 = bearer(auth, "admin2@x.com")
    assert auth.delete(f"/api/v1/auth/admin/users/{aid}", headers=h2).status_code == 200
    with AuthSession() as s:
        with pytest.raises(AppError):
            _guard_last_admin(s, s.query(User).filter(User.id == bid).first())
    # Admin excluído perde acesso imediatamente
    assert auth.get("/api/v1/auth/admin/users", headers=h).status_code == 403


def test_audit_log_records_changes_without_secrets(auth):
    make_user("admin@x.com", "LPS_ADMIN")
    uid = make_user("cli@x.com")
    h = bearer(auth, "admin@x.com")

    auth.post("/api/v1/auth/admin/users", headers=h,
              json={"name": "Novo Usu", "email": "novo@x.com", "password": PWD, "role": "CUSTOMER"})
    auth.patch(f"/api/v1/auth/admin/users/{uid}", headers=h, json={"role": "STORE_ADMIN", "new_password": "OutraSenha999"})
    auth.patch(f"/api/v1/auth/admin/users/{uid}", headers=h, json={"is_active": False})
    auth.delete(f"/api/v1/auth/admin/users/{uid}", headers=h)

    logs = auth.get("/api/v1/auth/admin/audit-logs", headers=h).json()
    actions = [l["action"] for l in logs]
    for a in ("USER_CREATED", "USER_ROLE_CHANGED", "USER_STATUS_CHANGED", "USER_DELETED"):
        assert a in actions
    blob = json.dumps(logs)
    assert PWD not in blob and "OutraSenha999" not in blob and "argon2" not in blob
    assert all(l["actor_email"] == "admin@x.com" for l in logs)
    assert any('"credentials_reset": true' in l["details"] for l in logs)


# ----------------------------------------------------------------------------- LPS


def fashion_features():
    return {
        "auth": True, "catalog": True, "cart": True, "orders": True, "checkout": True, "recommendations": True,
        "size_grid": True, "color_variants": True, "variant_sku": True,
    }


@pytest.fixture
def lps():
    return TestClient(lps_app)


@pytest.fixture
def as_platform(monkeypatch, auth):
    """Redireciona a checagem inter-serviço LPS -> Auth para o banco Auth real em processo."""
    def _fetch(user_id):
        r = auth.get(f"/internal/v1/auth/users/{user_id}/authz", headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()})
        return r.json() if r.status_code == 200 else None
    monkeypatch.setattr(admin_auth, "fetch_user_authz", _fetch)


def create_store(lps, slug="loja-teste"):
    r = lps.post("/api/v1/lps/stores", json={
        "name": slug.title(), "slug": slug, "segment": "FASHION",
        "features": fashion_features(), "payment_methods": ["PIX"], "fulfillment_modes": ["DELIVERY"],
    })
    assert r.status_code == 201, r.text
    return r.json()


def test_store_admin_endpoints_require_platform_admin(lps, auth, as_platform):
    store = create_store(lps)
    make_user("cli@x.com")
    make_user("loja@x.com", "STORE_ADMIN")
    sid = store["id"]

    assert lps.get("/api/v1/lps/admin/stores").status_code == 401
    assert lps.post(f"/api/v1/lps/admin/stores/{sid}/archive").status_code == 401
    for email in ("cli@x.com", "loja@x.com"):
        h = bearer(auth, email)
        assert lps.get("/api/v1/lps/admin/stores", headers=h).status_code == 403
        assert lps.post(f"/api/v1/lps/admin/stores/{sid}/archive", headers=h).status_code == 403
        assert lps.post(f"/api/v1/lps/admin/stores/{sid}/restore", headers=h).status_code == 403
    # Nada mudou
    assert lps.get(f"/api/v1/lps/stores/{store['slug']}").status_code == 200


def test_archive_store_is_logical_and_hidden_then_restorable(lps, auth, as_platform):
    a = create_store(lps, "loja-a")
    b = create_store(lps, "loja-b")
    make_user("admin@x.com", "LPS_ADMIN")
    h = bearer(auth, "admin@x.com")

    r = lps.post(f"/api/v1/lps/admin/stores/{a['id']}/archive", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "ARCHIVED" and r.json()["archived_at"]

    # Fora da listagem pública/landing; resolução de slug indisponível (410); outra loja intacta
    assert [s["slug"] for s in lps.get("/api/v1/lps/stores").json()] == ["loja-b"]
    assert lps.get("/api/v1/lps/stores/loja-a").status_code == 410
    assert lps.get("/api/v1/lps/stores/loja-a/manifest").json()["error"]["code"] == "STORE_ARCHIVED"
    assert lps.get("/api/v1/lps/stores/loja-a/manifests").status_code == 410
    assert lps.get("/api/v1/lps/stores/loja-b/manifest").status_code == 200

    # Configurador não altera loja arquivada
    r = lps.patch(f"/api/v1/lps/stores/{a['id']}/manifest", json={
        "features": fashion_features(), "payment_methods": ["PIX"], "fulfillment_modes": ["DELIVERY"]})
    assert r.status_code == 409 and r.json()["error"]["code"] == "STORE_ARCHIVED"

    # Painel administrativo continua enxergando-a (com status) e nada foi apagado
    adm = {s["slug"]: s for s in lps.get("/api/v1/lps/admin/stores", headers=h).json()}
    assert adm["loja-a"]["status"] == "ARCHIVED" and adm["loja-b"]["status"] == "ACTIVE"
    assert adm["loja-a"]["active_features_count"] >= 6
    with LpsSession() as s:
        assert s.query(Store).filter(Store.id == a["id"]).count() == 1
        assert s.query(ProductManifest).filter(ProductManifest.store_id == a["id"]).count() == 1

    # Serviços internos recebem o status (para bloquear operações comerciais)
    ih = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}
    assert lps.get(f"/internal/v1/lps/stores/{a['id']}/manifest", headers=ih).json()["store_status"] == "ARCHIVED"
    assert lps.get(f"/internal/v1/lps/stores/{b['id']}/manifest", headers=ih).json()["store_status"] == "ACTIVE"

    # Arquivar duas vezes -> 409; reativar restaura tudo
    assert lps.post(f"/api/v1/lps/admin/stores/{a['id']}/archive", headers=h).status_code == 409
    r = lps.post(f"/api/v1/lps/admin/stores/{a['id']}/restore", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "ACTIVE" and r.json()["archived_at"] is None
    assert lps.get("/api/v1/lps/stores/loja-a").status_code == 200
    assert len(lps.get("/api/v1/lps/stores").json()) == 2

    # Auditoria
    logs = lps.get("/api/v1/lps/admin/store-audit-logs", headers=h).json()
    assert [l["action"] for l in logs] == ["STORE_RESTORED", "STORE_ARCHIVED"]
    assert logs[0]["actor_email"] == "admin@x.com"


def test_seed_does_not_reactivate_archived_store(lps, auth, as_platform):
    import importlib.util
    from pathlib import Path

    seed_path = Path(__file__).resolve().parent.parent / "scripts" / "seed_demo_stores.py"
    spec = importlib.util.spec_from_file_location("seed_demo_stores_under_test", seed_path)
    seed = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed)

    seed.seed_stores_and_manifests()
    make_user("admin@x.com", "LPS_ADMIN")
    h = bearer(auth, "admin@x.com")
    with LpsSession() as s:
        moda_id = s.query(Store).filter(Store.slug == "vitrine-moda").first().id
    assert lps.post(f"/api/v1/lps/admin/stores/{moda_id}/archive", headers=h).status_code == 200

    seed.seed_stores_and_manifests()  # reexecução do seed de demonstração
    with LpsSession() as s:
        assert s.query(Store).filter(Store.slug == "vitrine-moda").first().status == "ARCHIVED"
    assert "vitrine-moda" not in [x["slug"] for x in lps.get("/api/v1/lps/stores").json()]


# ----------------------------------------------------------------------------- CATALOGO


@pytest.mark.asyncio
async def test_archived_store_blocks_catalog_and_new_purchases():
    ih = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}
    catalog_manifest_provider.set_cache_entry(
        "store-arquivada", {"store_id": "store-arquivada", "segment": "FASHION", "store_status": "ARCHIVED",
                            "features": {"favorites": True, "back_in_stock_alert": True}})
    catalog_manifest_provider.set_cache_entry(
        "store-viva", {"store_id": "store-viva", "segment": "FASHION", "store_status": "ACTIVE", "features": {}})

    transport = httpx.ASGITransport(app=catalog_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/v1/catalog/stores/store-arquivada/products")
        assert r.status_code == 403 and r.json()["error"]["code"] == "STORE_ARCHIVED"
        assert (await c.get("/api/v1/catalog/stores/store-arquivada/products/qualquer")).status_code == 403

        # Nova reserva de estoque (início de compra/checkout) é bloqueada
        r = await c.post("/internal/v1/inventory/decrement", headers=ih, json={
            "store_id": "store-arquivada", "product_id": "p1", "quantity": 1, "operation_id": "op-arch-1"})
        assert r.status_code == 403 and r.json()["error"]["code"] == "STORE_ARCHIVED"

        # Recomendações não recebem candidatos de loja arquivada
        r = await c.get("/internal/v1/catalog/stores/store-arquivada/products/active", headers=ih)
        assert r.status_code == 200 and r.json() == []

        # Loja ativa segue funcionando (isolamento)
        assert (await c.get("/api/v1/catalog/stores/store-viva/products")).status_code == 200
