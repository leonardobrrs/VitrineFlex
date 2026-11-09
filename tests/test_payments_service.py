import asyncio
from datetime import datetime, timedelta, timezone
import pytest
import httpx
from payments_app import app
from payments_database import SessionFactory, init_db
from payments_models import PaymentAttempt
from payments_routes import manifest_provider
from python_common.security import get_internal_service_key, HEADER_INTERNAL_TOKEN


@pytest.fixture(autouse=True)
def clean_payments_database():
    init_db()
    with SessionFactory() as session:
        session.query(PaymentAttempt).delete()
        session.commit()
    manifest_provider.clear_cache()


@pytest.mark.asyncio
async def test_payments_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "UP"
        assert resp.json()["service"] == "payments-service"


@pytest.mark.asyncio
async def test_payment_methods_enabled_and_disabled_in_manifest_pb16():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # Store with only PIX enabled
        manifest_provider.set_cache_entry(
            "store-pix-only",
            {"store_id": "store-pix-only", "segment": "TECH", "payment_methods": ["PIX"]},
        )

        # 1. PIX should succeed
        pix_req = {
            "store_id": "store-pix-only",
            "order_id": "order-101",
            "idempotency_key": "idemp-pix-01",
            "payment_method": "PIX",
            "amount": 250.0,
        }
        resp_pix = await client.post("/internal/v1/payments/process", json=pix_req, headers=int_headers)
        assert resp_pix.status_code == 200
        data_pix = resp_pix.json()
        assert data_pix["status"] == "APPROVED"
        assert data_pix["qr_code_pix"] is not None

        # 2. CARD should be rejected with 422 UNSUPPORTED_PAYMENT_METHOD
        card_req = {
            "store_id": "store-pix-only",
            "order_id": "order-102",
            "idempotency_key": "idemp-card-01",
            "payment_method": "CARD",
            "amount": 250.0,
        }
        resp_card = await client.post("/internal/v1/payments/process", json=card_req, headers=int_headers)
        assert resp_card.status_code == 422
        assert resp_card.json()["error"]["code"] == "UNSUPPORTED_PAYMENT_METHOD"


@pytest.mark.asyncio
async def test_payment_strict_idempotency_pb16():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        manifest_provider.set_cache_entry(
            "store-idemp",
            {"store_id": "store-idemp", "segment": "FASHION", "payment_methods": ["CARD", "PIX"]},
        )

        pay_req = {
            "store_id": "store-idemp",
            "order_id": "order-200",
            "idempotency_key": "idemp-key-unique-999",
            "payment_method": "CARD",
            "amount": 150.0,
        }

        # 1. First execution -> APPROVED
        resp1 = await client.post("/internal/v1/payments/process", json=pay_req, headers=int_headers)
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["status"] == "APPROVED"
        tx_id = data1["transaction_id"]

        # 2. Exact same key and same payload -> returns exact same result without re-executing
        resp2 = await client.post("/internal/v1/payments/process", json=pay_req, headers=int_headers)
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["transaction_id"] == tx_id
        assert data2["status"] == "APPROVED"

        # 3. Same key with DIFFERENT amount -> 409 IDEMPOTENCY_CONFLICT
        divergent_req = dict(pay_req, amount=999.0)
        resp_div = await client.post("/internal/v1/payments/process", json=divergent_req, headers=int_headers)
        assert resp_div.status_code == 409
        assert resp_div.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"


@pytest.mark.asyncio
async def test_simulated_payment_scenarios_rejection_and_timeout_pb16():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        manifest_provider.set_cache_entry(
            "store-sim",
            {"store_id": "store-sim", "segment": "BOOKS", "payment_methods": ["CARD", "BOLETO"]},
        )

        # 1. CARD_DECLINED scenario
        declined_req = {
            "store_id": "store-sim",
            "order_id": "order-dec-01",
            "idempotency_key": "idemp-dec-01",
            "payment_method": "CARD",
            "amount": 89.90,
            "simulation_scenario": "CARD_DECLINED",
        }
        resp_dec = await client.post("/internal/v1/payments/process", json=declined_req, headers=int_headers)
        assert resp_dec.status_code == 200
        assert resp_dec.json()["status"] == "REJECTED"
        assert "recusado" in resp_dec.json()["error_message"].lower()

        # 2. TIMEOUT scenario
        timeout_req = {
            "store_id": "store-sim",
            "order_id": "order-time-01",
            "idempotency_key": "idemp-time-01",
            "payment_method": "CARD",
            "amount": 89.90,
            "simulation_scenario": "TIMEOUT",
        }
        resp_time = await client.post("/internal/v1/payments/process", json=timeout_req, headers=int_headers)
        assert resp_time.status_code == 200
        assert resp_time.json()["status"] == "TIMEOUT"


@pytest.mark.asyncio
async def test_concurrent_payment_requests_wal():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        manifest_provider.set_cache_entry(
            "store-conc",
            {"store_id": "store-conc", "segment": "TECH", "payment_methods": ["PIX"]},
        )

        req_payload = {
            "store_id": "store-conc",
            "order_id": "order-conc-1",
            "idempotency_key": "conc-key-race-1",
            "payment_method": "PIX",
            "amount": 500.0,
        }

        # Fire 5 concurrent requests with the same idempotency_key
        tasks = [
            client.post("/internal/v1/payments/process", json=req_payload, headers=int_headers)
            for _ in range(5)
        ]
        results = await asyncio.gather(*tasks)

        # All 5 should succeed (status 200) and return the SAME transaction / attempt
        for r in results:
            assert r.status_code == 200
            assert r.json()["status"] in ("APPROVED", "PENDING")

        tx_ids = {r.json()["transaction_id"] for r in results if r.json()["transaction_id"]}
        assert len(tx_ids) == 1


@pytest.mark.asyncio
async def test_canonical_payments_endpoints_with_auth():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        manifest_provider.set_cache_entry(
            "store-canon",
            {"store_id": "store-canon", "segment": "TECH", "payment_methods": ["PIX", "CARD"]},
        )

        pay_req = {
            "store_id": "store-canon",
            "order_id": "order-canon-1",
            "idempotency_key": "idemp-canon-001",
            "payment_method": "PIX",
            "amount": 99.0,
        }

        # 1. Without internal token -> 403
        resp_no_auth = await client.post("/internal/v1/payments/simulate", json=pay_req)
        assert resp_no_auth.status_code == 403

        # 2. With internal token -> canonical simulate works
        resp_auth = await client.post("/internal/v1/payments/simulate", json=pay_req, headers=int_headers)
        assert resp_auth.status_code == 200
        assert resp_auth.json()["status"] == "APPROVED"

        # 3. Canonical GET attempt with internal token
        resp_get = await client.get("/internal/v1/payments/attempts/idemp-canon-001", headers=int_headers)
        assert resp_get.status_code == 200
        assert resp_get.json()["idempotency_key"] == "idemp-canon-001"
        assert resp_get.json()["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_payment_safe_recovery_and_cas_lease_cases():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        manifest_provider.set_cache_entry(
            "store-cas",
            {"store_id": "store-cas", "segment": "FASHION", "payment_methods": ["CARD", "PIX"]},
        )

        # Caso 1: Duas requisições simultâneas com a mesma chave
        req_1 = {
            "store_id": "store-cas",
            "order_id": "order-cas-1",
            "idempotency_key": "cas-key-1",
            "payment_method": "PIX",
            "amount": 120.0,
        }
        res_a, res_b = await asyncio.gather(
            client.post("/internal/v1/payments/simulate", json=req_1, headers=int_headers),
            client.post("/internal/v1/payments/simulate", json=req_1, headers=int_headers),
        )
        assert res_a.status_code == 200
        assert res_b.status_code == 200
        assert res_a.json()["transaction_id"] == res_b.json()["transaction_id"]

        # Caso 2: Tentativa legítima em andamento (elapsed < 10.0s) retorna a tentativa pendente existente sem duplicar execução
        key_pending = "cas-key-pending-active"
        req_payload = {
            "store_id": "store-cas",
            "order_id": "order-cas-active",
            "idempotency_key": key_pending,
            "payment_method": "CARD",
            "amount": 200.0,
        }
        import hashlib
        raw_hash_active = f"store-cas:order-cas-active:CARD:200.00"
        payload_hash = hashlib.sha256(raw_hash_active.encode()).hexdigest()

        with SessionFactory() as session:
            attempt_active = PaymentAttempt(
                store_id="store-cas",
                order_id="order-cas-active",
                idempotency_key=key_pending,
                request_payload_hash=payload_hash,
                amount=200.0,
                payment_method="CARD",
                status="PENDING",
                execution_token="active-worker-token-111",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(attempt_active)
            session.commit()

        # Second request arrives while attempt is active (elapsed < 10s)
        resp_active = await client.post("/internal/v1/payments/simulate", json=req_payload, headers=int_headers)
        assert resp_active.status_code == 200
        assert resp_active.json()["status"] == "PENDING"

        # Caso 3: Crash simulado pós-PENDING (elapsed >= 10.0s) permite assunção segura por novo executor
        key_abandoned = "cas-key-abandoned"
        req_abandoned = {
            "store_id": "store-cas",
            "order_id": "order-cas-abandoned",
            "idempotency_key": key_abandoned,
            "payment_method": "CARD",
            "amount": 300.0,
        }
        old_token = "dead-worker-token-000"
        raw_hash_abandoned = f"store-cas:order-cas-abandoned:CARD:300.00"
        with SessionFactory() as session:
            attempt_dead = PaymentAttempt(
                store_id="store-cas",
                order_id="order-cas-abandoned",
                idempotency_key=key_abandoned,
                request_payload_hash=hashlib.sha256(raw_hash_abandoned.encode()).hexdigest(),
                amount=300.0,
                payment_method="CARD",
                status="PENDING",
                execution_token=old_token,
                created_at=datetime.now(timezone.utc) - timedelta(seconds=20),
                updated_at=datetime.now(timezone.utc) - timedelta(seconds=20),
            )
            session.add(attempt_dead)
            session.commit()

        # Caso 4: Transição terminal com sucesso (APPROVED) pelo novo executor
        resp_recovered = await client.post("/internal/v1/payments/simulate", json=req_abandoned, headers=int_headers)
        assert resp_recovered.status_code == 200
        assert resp_recovered.json()["status"] == "APPROVED"
        assert resp_recovered.json()["transaction_id"] is not None

        # Caso 5: Tentativa de finalização pelo executor original antigo (que perdeu o token) é rejeitada via CAS e não sobrescreve APPROVED
        from sqlalchemy import text
        with SessionFactory() as session:
            # Stale worker tries to update using its old_token
            res = session.execute(
                text(
                    "UPDATE payment_attempts SET status = 'REJECTED', error_message = 'Stale failure' "
                    "WHERE idempotency_key = :key AND execution_token = :old_tok"
                ),
                {"key": key_abandoned, "old_tok": old_token},
            )
            session.commit()
            assert res.rowcount == 0, "Stale worker CAS must affect 0 rows because execution_token changed"

            # Check that database still has APPROVED
            refreshed = session.query(PaymentAttempt).filter_by(idempotency_key=key_abandoned).first()
            assert refreshed.status == "APPROVED"

        # Caso 6: Status terminal é imutável
        resp_terminal = await client.post("/internal/v1/payments/simulate", json=req_abandoned, headers=int_headers)
        assert resp_terminal.status_code == 200
        assert resp_terminal.json()["status"] == "APPROVED"

