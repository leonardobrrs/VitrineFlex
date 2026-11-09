import pytest
import httpx
from unittest.mock import patch

from cart_app import app
from cart_database import SessionFactory, init_db
from cart_models import Cart, CartItem
from python_common.security import create_access_token, HEADER_INTERNAL_TOKEN, get_internal_service_key


@pytest.fixture(autouse=True)
def clean_cart_database():
    init_db()
    with SessionFactory() as session:
        session.query(CartItem).delete()
        session.query(Cart).delete()
        session.commit()


@pytest.mark.asyncio
async def test_cart_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "UP"
        assert data["service"] == "cart-service"
        assert data["port"] == 8004


@pytest.mark.asyncio
async def test_cart_isolation_by_user_and_store_pb15():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_1_token = create_access_token(user_id="user-1", email="user1@teste.com")
        user_2_token = create_access_token(user_id="user-2", email="user2@teste.com")

        mock_catalog_info = {
            "title": "Produto Teste",
            "price": 100.0,
            "stock": 10,
            "image_url": "http://img.com/p.jpg",
        }

        with patch("cart_routes.fetch_product_from_catalog", return_value=mock_catalog_info):
            # User 1 adds item in Store A
            res1 = await client.post(
                "/api/v1/cart/items",
                json={"store_id": "store-a", "product_id": "prod-1", "quantity": 2},
                headers={"Authorization": f"Bearer {user_1_token}"},
            )
            assert res1.status_code == 200
            cart_u1_a = res1.json()
            assert cart_u1_a["total_items"] == 2
            assert cart_u1_a["subtotal"] == 200.0

            # User 1 queries Store B -> must be empty
            res_u1_b = await client.get(
                "/api/v1/cart?store_id=store-b",
                headers={"Authorization": f"Bearer {user_1_token}"},
            )
            assert res_u1_b.status_code == 200
            assert res_u1_b.json()["total_items"] == 0

            # User 2 queries Store A -> must be empty (isolated from User 1)
            res_u2_a = await client.get(
                "/api/v1/cart?store_id=store-a",
                headers={"Authorization": f"Bearer {user_2_token}"},
            )
            assert res_u2_a.status_code == 200
            assert res_u2_a.json()["total_items"] == 0


@pytest.mark.asyncio
async def test_cart_item_update_delete_and_clear_pb15():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-cart-mgmt", email="cart@teste.com")
        auth_h = {"Authorization": f"Bearer {user_token}"}

        mock_catalog = {
            "title": "Camisa Polo M",
            "price": 50.0,
            "stock": 5,
            "image_url": None,
        }

        with patch("cart_routes.fetch_product_from_catalog", return_value=mock_catalog):
            # 1. Add 2 units
            add_resp = await client.post(
                "/api/v1/cart/items",
                json={"store_id": "store-fashion", "product_id": "prod-polo", "variant_id": "var-m", "quantity": 2},
                headers=auth_h,
            )
            assert add_resp.status_code == 200
            item_id = add_resp.json()["items"][0]["id"]
            assert add_resp.json()["total_items"] == 2
            assert add_resp.json()["subtotal"] == 100.0

            # 2. Update to 4 units
            up_resp = await client.patch(
                f"/api/v1/cart/items/{item_id}",
                json={"quantity": 4},
                headers=auth_h,
            )
            assert up_resp.status_code == 200
            assert up_resp.json()["total_items"] == 4
            assert up_resp.json()["subtotal"] == 200.0

            # 3. Stock exceeded -> 409
            over_resp = await client.patch(
                f"/api/v1/cart/items/{item_id}",
                json={"quantity": 10},
                headers=auth_h,
            )
            assert over_resp.status_code == 409
            assert over_resp.json()["error"]["code"] == "INSUFFICIENT_STOCK"

            # 4. Clear cart
            clear_resp = await client.delete(
                "/api/v1/cart?store_id=store-fashion",
                headers=auth_h,
            )
            assert clear_resp.status_code == 200

            # 5. Verify empty
            get_resp = await client.get("/api/v1/cart?store_id=store-fashion", headers=auth_h)
            assert get_resp.status_code == 200
            assert len(get_resp.json()["items"]) == 0


@pytest.mark.asyncio
async def test_internal_cart_canonical_endpoints_for_orders():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # 1. Without token -> 403 Forbidden
        resp_no_get = await client.get("/internal/v1/cart/store-1/user-1")
        assert resp_no_get.status_code == 403
        resp_no_del = await client.delete("/internal/v1/cart/store-1/user-1")
        assert resp_no_del.status_code == 403

        # 2. Canonical GET with token -> 200 OK
        resp_with_get = await client.get("/internal/v1/cart/store-1/user-1", headers=int_headers)
        assert resp_with_get.status_code == 200
        assert resp_with_get.json()["user_id"] == "user-1"
        assert resp_with_get.json()["store_id"] == "store-1"

        # 3. Canonical DELETE with token -> 200 OK
        resp_with_del = await client.delete("/internal/v1/cart/store-1/user-1", headers=int_headers)
        assert resp_with_del.status_code == 200
        assert resp_with_del.json()["success"] is True

        # 4. Backward-compatible alias still works
        resp_alias = await client.get("/internal/v1/cart/stores/store-1/users/user-1", headers=int_headers)
        assert resp_alias.status_code == 200

