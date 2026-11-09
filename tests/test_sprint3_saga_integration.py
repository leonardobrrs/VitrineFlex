import asyncio
from datetime import datetime, timedelta, timezone
import pytest
import httpx
from unittest.mock import patch, MagicMock

from orders_app import app as orders_app
from orders_database import SessionFactory, init_db as init_orders_db
from orders_models import Order, OrderItemSnapshot, OrderStatusHistory, CheckoutOperation
from python_common.security import create_access_token


@pytest.fixture(autouse=True)
def clean_saga_databases():
    init_orders_db()
    with SessionFactory() as session:
        session.query(OrderStatusHistory).delete()
        session.query(OrderItemSnapshot).delete()
        session.query(Order).delete()
        session.query(CheckoutOperation).delete()
        session.commit()


@pytest.mark.asyncio
async def test_checkout_saga_approved_flow_pb18():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-checkout-1", email="user1@checkout.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-checkout-success-01",
        }

        checkout_payload = {
            "store_id": "store-tech",
            "shipping_zip_code": "01310-100",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "CARD",
            "card_number": "4111111111111111",
            "items": [
                {
                    "product_id": "prod-notebook-1",
                    "quantity": 1,
                    "unit_price": 5000.0,
                    "title": "Notebook Tech Pro",
                    "attributes": {"processor": "Intel i9", "ram": "32GB"},
                }
            ],
        }

        # Mock downstream HTTP services: Shipping (cost: 15.0), Catalog (stock decremented), Payments (APPROVED), Cart (cleared)
        def mock_http_post(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "shipping/validate-option" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"cost": 15.0, "code": "STANDARD_DELIVERY"}
            elif "inventory/decrement" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"success": True, "new_stock_quantity": 4}
            elif "payments" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {
                    "status": "APPROVED",
                    "transaction_id": "tx-approved-12345",
                    "payment_method": "CARD",
                }
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_http_post), patch("httpx.Client.delete") as mock_delete:
            resp = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["saga_status"] == "COMPLETED"
            assert data["order"]["status"] == "PAID"
            assert data["order"]["subtotal"] == 5000.0
            assert data["order"]["shipping_cost"] == 15.0
            assert data["order"]["total_amount"] == 5015.0
            assert data["payment"]["status"] == "APPROVED"
            assert len(data["order"]["items"]) == 1

            # Cart clear was called
            assert mock_delete.called

            # Retrying with the exact same Idempotency-Key returns existing completed order without duplication
            retry_resp = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=headers)
            assert retry_resp.status_code == 200
            retry_data = retry_resp.json()
            assert retry_data["saga_status"] == "COMPLETED"
            assert retry_data["order"]["id"] == data["order"]["id"]


@pytest.mark.asyncio
async def test_checkout_saga_payment_declined_and_synchronous_compensation_pb18():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-checkout-2", email="user2@checkout.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-checkout-declined-01",
        }

        checkout_payload = {
            "store_id": "store-fashion",
            "shipping_zip_code": "57000-000",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "CARD",
            "card_number": "4111111111110002",  # Card declined
            "simulation_scenario": "CARD_DECLINED",
            "items": [
                {
                    "product_id": "prod-camisa-polo",
                    "variant_id": "var-m-azul",
                    "quantity": 2,
                    "unit_price": 100.0,
                    "title": "Camisa Polo M Azul",
                }
            ],
        }

        restored_calls = []

        def mock_http_post(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "shipping/validate-option" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"cost": 19.90, "code": "STANDARD_DELIVERY"}
            elif "inventory/decrement" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"success": True, "new_stock_quantity": 8}
            elif "payments" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {
                    "status": "REJECTED",
                    "error_message": "Cartão recusado pela operadora simulada.",
                }
            elif "inventory/restore" in url:
                restored_calls.append(kwargs.get("json"))
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"success": True, "new_stock_quantity": 10}
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_http_post):
            resp = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=headers)
            assert resp.status_code == 402
            data = resp.json()
            assert data["saga_status"] == "FAILED"
            assert data["order"]["status"] == "PAYMENT_FAILED"
            assert data["payment"]["status"] == "REJECTED"

            # Check that synchronous compensation was called exactly once for the reserved item!
            assert len(restored_calls) == 1
            assert restored_calls[0]["product_id"] == "prod-camisa-polo"
            assert restored_calls[0]["variant_id"] == "var-m-azul"
            assert restored_calls[0]["quantity"] == 2


@pytest.mark.asyncio
async def test_checkout_saga_payment_timeout_retains_inventory_pb18():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-checkout-3", email="user3@checkout.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-checkout-timeout-01",
        }

        checkout_payload = {
            "store_id": "store-books",
            "shipping_zip_code": "01310-100",
            "fulfillment_mode": "PICKUP",
            "shipping_option_code": "STORE_PICKUP",
            "payment_method": "CARD",
            "simulation_scenario": "TIMEOUT",
            "items": [
                {
                    "product_id": "prod-livro-lps",
                    "quantity": 1,
                    "unit_price": 89.90,
                    "title": "Engenharia de LPS",
                }
            ],
        }

        restored_calls = []

        def mock_http_post(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "shipping/validate-option" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"cost": 0.0, "code": "STORE_PICKUP"}
            elif "inventory/decrement" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"success": True, "new_stock_quantity": 9}
            elif "payments" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {
                    "status": "TIMEOUT",
                    "error_message": "Tempo limite excedido no provedor.",
                }
            elif "inventory/restore" in url:
                restored_calls.append(kwargs.get("json"))
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_http_post):
            resp = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=headers)
            assert resp.status_code == 202
            data = resp.json()
            assert data["saga_status"] == "PAYMENT_PENDING_CONFIRMATION"

            # Crucial: inventory was NOT restored! It is held awaiting reconciliation!
            assert len(restored_calls) == 0


@pytest.mark.asyncio
async def test_checkout_idempotency_divergent_payload_conflict():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-checkout-4", email="user4@checkout.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-conflict-test",
        }

        payload1 = {
            "store_id": "store-tech",
            "shipping_zip_code": "01310-100",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "PIX",
            "items": [{"product_id": "prod-1", "quantity": 1, "unit_price": 100.0}],
        }

        def mock_http(url, *args, **kwargs):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"cost": 10.0, "code": "STANDARD_DELIVERY", "status": "APPROVED", "success": True}
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_http), patch("httpx.Client.delete"):
            # 1. First execution
            res1 = await client.post("/api/v1/orders/checkout", json=payload1, headers=headers)
            assert res1.status_code == 200

            # 2. Same key with different shipping CEP -> 409 IDEMPOTENCY_CONFLICT
            payload2 = dict(payload1, shipping_zip_code="57000-000")
            res2 = await client.post("/api/v1/orders/checkout", json=payload2, headers=headers)
            assert res2.status_code == 409
            assert res2.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"


@pytest.mark.asyncio
async def test_multi_item_order_independent_reservations():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-multi-item", email="multi@checkout.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-multi-item-01",
        }

        payload = {
            "store_id": "store-fashion",
            "shipping_zip_code": "57000-000",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "PIX",
            "items": [
                {"product_id": "prod-fashion-1", "variant_id": "var-m-preto", "quantity": 1, "unit_price": 80.0, "title": "Camisa M"},
                {"product_id": "prod-fashion-1", "variant_id": "var-g-preto", "quantity": 2, "unit_price": 80.0, "title": "Camisa G"},
                {"product_id": "prod-fashion-2", "variant_id": None, "quantity": 1, "unit_price": 120.0, "title": "Bolsa Couro"},
            ],
        }

        reservation_ids_seen = []

        def mock_http(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "shipping" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"cost": 20.0, "code": "STANDARD_DELIVERY"}
            elif "inventory/decrement" in url:
                req_json = kwargs.get("json", {})
                reservation_ids_seen.append(req_json.get("operation_id"))
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"success": True, "new_stock_quantity": 5}
            elif "payments" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"status": "APPROVED", "transaction_id": "tx-multi-123"}
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_http), patch("httpx.Client.delete"):
            resp = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
            assert resp.status_code == 200
            order_data = resp.json()["order"]
            assert len(order_data["items"]) == 3

            # Verify that each item received a distinct reservation operation_id:
            assert len(reservation_ids_seen) == 3
            assert len(set(reservation_ids_seen)) == 3, "Each line item must have a unique, non-colliding reservation operation_id"


@pytest.mark.asyncio
async def test_saga_lease_concurrency_and_safe_recovery():
    transport = httpx.ASGITransport(app=orders_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token(user_id="user-lease-test", email="lease@teste.com")
        headers = {
            "Authorization": f"Bearer {user_token}",
            "Idempotency-Key": "idemp-lease-001",
        }
        payload = {
            "store_id": "store-tech",
            "shipping_zip_code": "01310-100",
            "fulfillment_mode": "DELIVERY",
            "shipping_option_code": "STANDARD_DELIVERY",
            "payment_method": "PIX",
            "items": [{"product_id": "prod-1", "quantity": 1, "unit_price": 100.0}],
        }

        from saga_orchestrator import compute_checkout_hash, CheckoutRequest
        req_obj = CheckoutRequest(**payload)
        req_hash = compute_checkout_hash(req_obj)

        # 1. Simular operação ativa cujo lease ainda não expirou (< 15 segundos)
        with SessionFactory() as session:
            op_active = CheckoutOperation(
                store_id="store-tech",
                user_id="user-lease-test",
                idempotency_key="idemp-lease-001",
                request_payload_hash=req_hash,
                saga_status="INVENTORY_RESERVED",
                execution_token="active-lease-token-123",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(op_active)
            session.commit()
            saved_op_id = op_active.id

        # Requisição concorrente enquanto lease ativo retorna resposta pendente sem disparar nova saga
        resp_conc = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
        assert resp_conc.status_code == 202
        assert resp_conc.json()["saga_status"] == "INVENTORY_RESERVED"

        # 2. Simular lease expirado (elapsed >= 15 segundos) - outro executor pode assumir via CAS
        with SessionFactory() as session:
            op_to_expire = session.query(CheckoutOperation).filter_by(idempotency_key="idemp-lease-001").first()
            op_to_expire.updated_at = datetime.utcnow() - timedelta(seconds=25)
            session.commit()

        def mock_http(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "shipping" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"cost": 10.0, "code": "STANDARD_DELIVERY"}
            elif "inventory/decrement" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"success": True, "new_stock_quantity": 9}
            elif "payments" in url:
                mock_resp.status_code = 200
                mock_resp.json.return_value = {"status": "APPROVED", "transaction_id": "tx-recovered-1"}
            return mock_resp

        with patch("httpx.Client.post", side_effect=mock_http), patch("httpx.Client.delete"):
            resp_resumed = await client.post("/api/v1/orders/checkout", json=payload, headers=headers)
            assert resp_resumed.status_code == 200
            assert resp_resumed.json()["saga_status"] == "COMPLETED"

        # 3. Antigo executor com token defasado tentando atualizar o status da saga é barrado via CAS
        from saga_orchestrator import SagaOrchestrator
        from python_common.errors import AppError
        with pytest.raises(AppError) as exc_info:
            SagaOrchestrator._update_saga_status(
                operation_id=saved_op_id,
                saga_status="FAILED",
                execution_token="active-lease-token-123",  # token antigo que foi substituído na retomada!
            )
        assert exc_info.value.code == "CONCURRENT_EXECUTION_ABORTED"

