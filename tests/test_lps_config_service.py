import pytest
import httpx
from lps_app import app
from lps_database import SessionFactory, init_db
from lps_models import Store, ProductManifest
from python_common.security import HEADER_INTERNAL_TOKEN, get_internal_service_key


@pytest.fixture(autouse=True)
def clean_lps_database():
    init_db()
    with SessionFactory() as session:
        session.query(ProductManifest).delete()
        session.query(Store).delete()
        session.commit()


@pytest.mark.asyncio
async def test_lps_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "UP"
        assert data["service"] == "lps-config-service"
        assert data["port"] == 8002


@pytest.mark.asyncio
async def test_feature_catalog_endpoint():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/lps/features")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_features"] == 23
        keys = [f["key"] for f in data["features"]]
        assert "auth" in keys
        assert "catalog" in keys
        assert "size_grid" in keys
        assert "technical_specs" in keys
        assert "isbn" in keys
        assert "favorites" in keys
        assert "recently_viewed" in keys
        assert "fashion_size_guide" in keys
        assert "technical_filters" in keys
        assert "book_preview" in keys
        assert "back_in_stock_alert" in keys


@pytest.mark.asyncio
async def test_lps_validation_rules():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Valid Fashion Configuration
        valid_fashion = {
            "segment": "FASHION",
            "features": {
                "auth": True,
                "catalog": True,
                "cart": True,
                "orders": True,
                "checkout": True,
                "recommendations": True,
                "size_grid": True,
                "color_variants": True,
                "variant_sku": True,
                "favorites": True,
            },
            "payment_methods": ["PIX", "CARD"],
            "fulfillment_modes": ["DELIVERY"],
        }
        resp = await client.post("/api/v1/lps/validate", json=valid_fashion)
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

        # 2. Missing core feature (e.g. cart=False)
        invalid_core = dict(valid_fashion)
        invalid_core["features"] = dict(valid_fashion["features"])
        invalid_core["features"]["cart"] = False
        resp = await client.post("/api/v1/lps/validate", json=invalid_core)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert any("cart" in err for err in data["errors"])

        # 3. Non-boolean feature value
        invalid_type = dict(valid_fashion)
        invalid_type["features"] = dict(valid_fashion["features"])
        invalid_type["features"]["auth"] = "yes"
        resp = await client.post("/api/v1/lps/validate", json=invalid_type)
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False
        assert any("não booleano" in err for err in resp.json()["errors"])

        # 4. Unknown feature
        invalid_unknown = dict(valid_fashion)
        invalid_unknown["features"] = dict(valid_fashion["features"])
        invalid_unknown["features"]["magic_discount"] = True
        resp = await client.post("/api/v1/lps/validate", json=invalid_unknown)
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False
        assert any("não reconhecidas" in err for err in resp.json()["errors"])

        # 5. Cross-segment feature (product_comparison in Fashion)
        invalid_cross = dict(valid_fashion)
        invalid_cross["features"] = dict(valid_fashion["features"])
        invalid_cross["features"]["product_comparison"] = True
        resp = await client.post("/api/v1/lps/validate", json=invalid_cross)
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False
        assert any("product_comparison" in err for err in resp.json()["errors"])

        # 6. Forbidden MVP feature (reviews)
        invalid_future = dict(valid_fashion)
        invalid_future["features"] = dict(valid_fashion["features"])
        invalid_future["features"]["reviews"] = True
        resp = await client.post("/api/v1/lps/validate", json=invalid_future)
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False
        assert resp.json()["error_code"] == "FEATURE_NOT_SUPPORTED"


@pytest.mark.asyncio
async def test_store_derivation_and_manifest_versioning():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        tech_store_req = {
            "name": "Vitrine Tech Oficial",
            "slug": "vitrine-tech",
            "segment": "TECH",
            "features": {
                "auth": True,
                "catalog": True,
                "cart": True,
                "orders": True,
                "checkout": True,
                "recommendations": True,
                "technical_specs": True,
                "warranty_info": True,
                "product_comparison": True,
                "favorites": False,
            },
            "payment_methods": ["PIX", "CARD", "BOLETO"],
            "fulfillment_modes": ["DELIVERY", "PICKUP"],
            "theme": {
                "primary_color": "#0284c7",
                "secondary_color": "#0369a1",
                "store_name": "Vitrine Tech Oficial",
            },
        }

        # 1. Create Store (v1)
        resp = await client.post("/api/v1/lps/stores", json=tech_store_req)
        assert resp.status_code == 201
        store_data = resp.json()
        store_id = store_data["id"]
        assert store_data["slug"] == "vitrine-tech"
        assert store_data["segment"] == "TECH"
        manifest_v1 = store_data["current_manifest"]
        assert manifest_v1["version"] == 1
        assert manifest_v1["features"]["product_comparison"] is True
        assert manifest_v1["features"]["favorites"] is False

        # 2. Duplicate slug returns 409
        resp_dup = await client.post("/api/v1/lps/stores", json=tech_store_req)
        assert resp_dup.status_code == 409

        # 3. Update store manifest (enable favorites) -> produces v2
        update_req = {
            "features": dict(tech_store_req["features"], favorites=True),
            "payment_methods": tech_store_req["payment_methods"],
            "fulfillment_modes": tech_store_req["fulfillment_modes"],
            "theme": tech_store_req["theme"],
        }
        patch_resp = await client.patch(f"/api/v1/lps/stores/{store_id}/manifest", json=update_req)
        assert patch_resp.status_code == 200
        manifest_v2 = patch_resp.json()
        assert manifest_v2["version"] == 2
        assert manifest_v2["features"]["favorites"] is True

        # 4. Check history: both v1 and v2 exist (ADR-006)
        hist_resp = await client.get("/api/v1/lps/stores/vitrine-tech/manifests")
        assert hist_resp.status_code == 200
        history = hist_resp.json()
        assert len(history) == 2
        assert history[0]["version"] == 1
        assert history[0]["features"]["favorites"] is False
        assert history[1]["version"] == 2
        assert history[1]["features"]["favorites"] is True

        # 5. Internal endpoint protected by X-Internal-Token
        int_url = f"/internal/v1/lps/stores/{store_id}/manifest"
        # Without token -> 403
        resp_no_token = await client.get(int_url)
        assert resp_no_token.status_code == 403

        # With token -> 200
        resp_with_token = await client.get(
            int_url,
            headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
        )
        assert resp_with_token.status_code == 200
        assert resp_with_token.json()["version"] == 2


@pytest.mark.asyncio
async def test_canonical_manifest_endpoint_and_exact_18_boolean_features():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Define 3 stores (Fashion, Tech, Books)
        stores_data = [
            (
                "vitrine-moda",
                "FASHION",
                {
                    "auth": True,
                    "catalog": True,
                    "cart": True,
                    "orders": True,
                    "checkout": True,
                    "recommendations": True,
                    "size_grid": True,
                    "color_variants": True,
                    "variant_sku": True,
                    "favorites": True,
                },
            ),
            (
                "vitrine-tech",
                "TECH",
                {
                    "auth": True,
                    "catalog": True,
                    "cart": True,
                    "orders": True,
                    "checkout": True,
                    "recommendations": True,
                    "technical_specs": True,
                    "warranty_info": True,
                    "product_comparison": True,
                    "favorites": False,
                },
            ),
            (
                "vitrine-books",
                "BOOKS",
                {
                    "auth": True,
                    "catalog": True,
                    "cart": True,
                    "orders": True,
                    "checkout": True,
                    "recommendations": True,
                    "isbn": True,
                    "author": True,
                    "publisher": True,
                    "literary_genre": True,
                    "edition": True,
                    "favorites": True,
                },
            ),
        ]

        expected_23_keys = {
            "auth", "catalog", "cart", "orders", "checkout", "recommendations",
            "size_grid", "color_variants", "variant_sku",
            "technical_specs", "warranty_info", "product_comparison",
            "isbn", "author", "publisher", "literary_genre", "edition",
            "favorites",
            # 5 novas features expandidas
            "recently_viewed", "fashion_size_guide", "technical_filters",
            "book_preview", "back_in_stock_alert",
        }

        for slug, segment, feats in stores_data:
            create_resp = await client.post(
                "/api/v1/lps/stores",
                json={
                    "name": slug.replace("-", " ").title(),
                    "slug": slug,
                    "segment": segment,
                    "features": feats,
                    "payment_methods": ["PIX", "CARD"],
                    "fulfillment_modes": ["DELIVERY"],
                },
            )
            assert create_resp.status_code == 201

            # Query canonical endpoint GET /api/v1/lps/stores/{slug}/manifest
            man_resp = await client.get(f"/api/v1/lps/stores/{slug}/manifest")
            assert man_resp.status_code == 200
            manifest = man_resp.json()
            assert manifest["store_slug"] == slug
            assert manifest["segment"] == segment

            features = manifest["features"]
            # Must contain exactly the 23 formal features
            assert set(features.keys()) == expected_23_keys
            assert len(features) == 23

            # All 23 must be strictly boolean
            for k, v in features.items():
                assert isinstance(v, bool), f"Feature {k} in {slug} must be boolean"

            # Check core
            for core in ["auth", "catalog", "cart", "orders", "checkout", "recommendations"]:
                assert features[core] is True

            # Check segment isolation
            if segment == "FASHION":
                assert features["size_grid"] is True
                assert features["color_variants"] is True
                assert features["variant_sku"] is True
                assert features["technical_specs"] is False
                assert features["isbn"] is False
                assert features["fashion_size_guide"] is False
            elif segment == "TECH":
                assert features["technical_specs"] is True
                assert features["warranty_info"] is True
                assert features["product_comparison"] is True
                assert features["size_grid"] is False
                assert features["isbn"] is False
                assert features["technical_filters"] is False
            elif segment == "BOOKS":
                assert features["isbn"] is True
                assert features["author"] is True
                assert features["publisher"] is True
                assert features["size_grid"] is False
                assert features["technical_specs"] is False
                assert features["book_preview"] is False


@pytest.mark.asyncio
async def test_new_features_variability_and_cross_tree_constraints():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        base_core = {
            "auth": True,
            "catalog": True,
            "cart": True,
            "orders": True,
            "checkout": True,
            "recommendations": True,
        }

        # 1. fashion_size_guide válido em Fashion com size_grid
        resp = await client.post(
            "/api/v1/lps/validate",
            json={
                "segment": "FASHION",
                "features": {
                    **base_core,
                    "size_grid": True,
                    "color_variants": True,
                    "variant_sku": True,
                    "fashion_size_guide": True,
                    "recently_viewed": True,
                    "back_in_stock_alert": True,
                },
                "payment_methods": ["PIX"],
                "fulfillment_modes": ["DELIVERY"],
            },
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

        # 2. fashion_size_guide inválido em TECH
        resp_tech = await client.post(
            "/api/v1/lps/validate",
            json={
                "segment": "TECH",
                "features": {
                    **base_core,
                    "technical_specs": True,
                    "warranty_info": True,
                    "fashion_size_guide": True,
                },
                "payment_methods": ["PIX"],
                "fulfillment_modes": ["DELIVERY"],
            },
        )
        assert resp_tech.json()["is_valid"] is False
        assert any("fashion_size_guide" in e for e in resp_tech.json()["errors"])

        # 3. technical_filters válido em TECH com technical_specs
        resp_tf = await client.post(
            "/api/v1/lps/validate",
            json={
                "segment": "TECH",
                "features": {
                    **base_core,
                    "technical_specs": True,
                    "warranty_info": True,
                    "technical_filters": True,
                },
                "payment_methods": ["PIX"],
                "fulfillment_modes": ["DELIVERY"],
            },
        )
        assert resp_tf.status_code == 200
        assert resp_tf.json()["is_valid"] is True

        # 4. technical_filters inválido em FASHION
        resp_tf_fash = await client.post(
            "/api/v1/lps/validate",
            json={
                "segment": "FASHION",
                "features": {
                    **base_core,
                    "size_grid": True,
                    "color_variants": True,
                    "variant_sku": True,
                    "technical_filters": True,
                },
                "payment_methods": ["PIX"],
                "fulfillment_modes": ["DELIVERY"],
            },
        )
        assert resp_tf_fash.json()["is_valid"] is False
        assert any("technical_filters" in e for e in resp_tf_fash.json()["errors"])

        # 5. book_preview válido em BOOKS e inválido fora
        resp_bp = await client.post(
            "/api/v1/lps/validate",
            json={
                "segment": "BOOKS",
                "features": {
                    **base_core,
                    "isbn": True,
                    "author": True,
                    "publisher": True,
                    "literary_genre": True,
                    "edition": True,
                    "book_preview": True,
                },
                "payment_methods": ["PIX"],
                "fulfillment_modes": ["DELIVERY"],
            },
        )
        assert resp_bp.status_code == 200
        assert resp_bp.json()["is_valid"] is True

        resp_bp_invalid = await client.post(
            "/api/v1/lps/validate",
            json={
                "segment": "FASHION",
                "features": {
                    **base_core,
                    "size_grid": True,
                    "color_variants": True,
                    "variant_sku": True,
                    "book_preview": True,
                },
                "payment_methods": ["PIX"],
                "fulfillment_modes": ["DELIVERY"],
            },
        )
        assert resp_bp_invalid.json()["is_valid"] is False
        assert any("book_preview" in e for e in resp_bp_invalid.json()["errors"])
