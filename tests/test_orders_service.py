import json
import pytest
import httpx
from orders_app import app
from orders_database import SessionFactory, init_db
from orders_models import Order, OrderItemSnapshot, OrderStatusHistory, CheckoutOperation
from python_common.security import create_access_token


@pytest.fixture(autouse=True)
def clean_orders_database():
    init_db()
    with SessionFactory() as session:
        session.query(OrderStatusHistory).delete()
        session.query(OrderItemSnapshot).delete()
        session.query(Order).delete()
        session.query(CheckoutOperation).delete()
        session.commit()


@pytest.mark.asyncio
async def test_orders_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "UP"
        assert resp.json()["service"] == "orders-service"


@pytest.mark.asyncio
async def test_orders_listing_isolation_and_immutable_snapshots_pb19():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_a_token = create_access_token(user_id="user-order-a", email="usera@orders.com")
        headers_a = {"Authorization": f"Bearer {user_a_token}"}
        user_b_token = create_access_token(user_id="user-order-b", email="userb@orders.com")
        headers_b = {"Authorization": f"Bearer {user_b_token}"}

        # Seed an order directly into DB for User A in store-moda
        with SessionFactory() as session:
            ord_a = Order(
                id="ord-001",
                store_id="store-moda",
                user_id="user-order-a",
                status="PAID",
                subtotal=189.90,
                shipping_cost=19.90,
                total_amount=209.80,
                payment_method="PIX",
                fulfillment_mode="DELIVERY",
                shipping_zip_code="57000-000",
                shipping_address="Rua das Flores, 123",
            )
            session.add(ord_a)
            session.flush()

            snapshot = OrderItemSnapshot(
                order_id=ord_a.id,
                product_id="prod-camisa-1",
                variant_id="var-m-azul",
                title="Camisa Polo Algodão (M / Azul)",
                unit_price=189.90,
                quantity=1,
                subtotal=189.90,
                snapshot_attributes_json=json.dumps({"size": "M", "color": "Azul", "sku": "POLO-M-BLU"}),
                reservation_operation_id="ord-001:item:1",
            )
            session.add(snapshot)

            hist = OrderStatusHistory(
                order_id=ord_a.id,
                from_status="INVENTORY_RESERVED",
                to_status="PAID",
                reason="Pagamento PIX confirmado com sucesso.",
            )
            session.add(hist)
            session.commit()

        # 1. User A lists orders in store-moda -> finds ord-001
        res_list = await client.get("/api/v1/orders?store_id=store-moda", headers=headers_a)
        assert res_list.status_code == 200
        orders_a = res_list.json()
        assert len(orders_a) == 1
        assert orders_a[0]["id"] == "ord-001"
        assert len(orders_a[0]["items"]) == 1
        assert orders_a[0]["items"][0]["snapshot_attributes"]["sku"] == "POLO-M-BLU"

        # 2. User A lists orders in store-tech -> finds none (store isolation)
        res_other_store = await client.get("/api/v1/orders?store_id=store-tech", headers=headers_a)
        assert res_other_store.status_code == 200
        assert len(res_other_store.json()) == 0

        # 3. User B lists orders in store-moda -> finds none (user isolation)
        res_user_b = await client.get("/api/v1/orders?store_id=store-moda", headers=headers_b)
        assert res_user_b.status_code == 200
        assert len(res_user_b.json()) == 0

        # 4. Query order detail by ID
        detail_resp = await client.get("/api/v1/orders/ord-001", headers=headers_a)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["status"] == "PAID"
        assert len(detail["history"]) == 1
