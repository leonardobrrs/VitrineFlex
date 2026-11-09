import pytest
import httpx
from shipping_app import app
from shipping_database import SessionFactory, init_db
from shipping_models import ShippingQuoteRecord
from shipping_routes import manifest_provider
from python_common.security import get_internal_service_key, HEADER_INTERNAL_TOKEN


@pytest.fixture(autouse=True)
def clean_shipping_database():
    init_db()
    with SessionFactory() as session:
        session.query(ShippingQuoteRecord).delete()
        session.commit()
    manifest_provider.clear_cache()


@pytest.mark.asyncio
async def test_shipping_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "UP"
        assert resp.json()["service"] == "shipping-service"


@pytest.mark.asyncio
async def test_shipping_quote_and_manifest_modalities_pb17():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Store with DELIVERY and PICKUP
        manifest_provider.set_cache_entry(
            "store-ship-all",
            {"store_id": "store-ship-all", "segment": "FASHION", "fulfillment_modes": ["DELIVERY", "PICKUP"]},
        )

        resp = await client.post(
            "/api/v1/shipping/quote",
            json={"store_id": "store-ship-all", "zip_code": "57000-000"},  # Maceió / AL
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["options"]) == 3  # Standard, Express, Pickup
        pickup = next(o for o in data["options"] if o["modality"] == "PICKUP")
        assert pickup["cost"] == 0.0
        standard = next(o for o in data["options"] if o["code"] == "STANDARD_DELIVERY")
        assert standard["cost"] == 19.90

        # Case B: Store with ONLY DELIVERY (PICKUP disabled in manifest)
        manifest_provider.set_cache_entry(
            "store-delivery-only",
            {"store_id": "store-delivery-only", "segment": "TECH", "fulfillment_modes": ["DELIVERY"]},
        )
        resp_del = await client.post(
            "/api/v1/shipping/quote",
            json={"store_id": "store-delivery-only", "zip_code": "01310-100"},  # SP
        )
        assert resp_del.status_code == 200
        options_del = resp_del.json()["options"]
        assert all(o["modality"] != "PICKUP" for o in options_del)


@pytest.mark.asyncio
async def test_unsupported_fulfillment_mode_rejected_pb17():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        int_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # Store with DELIVERY only
        manifest_provider.set_cache_entry(
            "store-no-pickup",
            {"store_id": "store-no-pickup", "segment": "BOOKS", "fulfillment_modes": ["DELIVERY"]},
        )

        # Trying to validate PICKUP option -> 422 UNSUPPORTED_FULFILLMENT_MODE
        validate_req = {
            "store_id": "store-no-pickup",
            "zip_code": "57000000",
            "modality": "PICKUP",
            "code": "STORE_PICKUP",
        }
        val_resp = await client.post(
            "/internal/v1/shipping/validate-option",
            json=validate_req,
            headers=int_headers,
        )
        assert val_resp.status_code == 422
        assert val_resp.json()["error"]["code"] == "UNSUPPORTED_FULFILLMENT_MODE"
