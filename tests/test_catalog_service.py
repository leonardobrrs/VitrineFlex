import pytest
import httpx
from catalog_app import app
from catalog_database import SessionFactory, init_db
from catalog_models import Product, ProductVariant, ProductAttribute, InventoryMovement, Favorite
from catalog_routes import manifest_provider
from python_common.security import HEADER_INTERNAL_TOKEN, get_internal_service_key, create_access_token


@pytest.fixture(autouse=True)
def clean_catalog_database():
    init_db()
    with SessionFactory() as session:
        session.query(Favorite).delete()
        session.query(InventoryMovement).delete()
        session.query(ProductVariant).delete()
        session.query(ProductAttribute).delete()
        session.query(Product).delete()
        session.commit()
    manifest_provider.clear_cache()


@pytest.mark.asyncio
async def test_catalog_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "UP"
        assert data["service"] == "catalog-service"
        assert data["port"] == 8003


@pytest.mark.asyncio
async def test_products_creation_and_segment_attributes():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fashion Product with Variants (PB-09)
        fashion_prod = {
            "store_id": "store-fashion-01",
            "title": "Camisa Polo Algodão Pima",
            "description": "Camisa casual premium",
            "price": 149.90,
            "stock_quantity": 30,
            "category": "Vestuário",
            "variants": [
                {"size": "M", "color": "Azul Marinho", "sku": "POLO-PIMA-M-BLU", "stock_quantity": 15},
                {"size": "G", "color": "Azul Marinho", "sku": "POLO-PIMA-G-BLU", "stock_quantity": 15},
            ],
        }
        resp = await client.post("/api/v1/catalog/products", json=fashion_prod)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == fashion_prod["title"]
        assert len(data["variants"]) == 2
        assert data["variants"][0]["sku"] == "POLO-PIMA-M-BLU"

        # 2. Tech Product with Technical Specs (PB-10)
        tech_prod = {
            "store_id": "store-tech-01",
            "title": "Notebook DevPro 16",
            "description": "Notebook para desenvolvedores",
            "price": 7999.00,
            "stock_quantity": 5,
            "category": "Computadores",
            "attributes": [
                {"name": "processor", "value": "Intel Core i7 13th Gen"},
                {"name": "ram", "value": "32GB DDR5"},
                {"name": "storage", "value": "1TB SSD NVMe"},
                {"name": "warranty_months", "value": "12 meses"},
            ],
        }
        resp_tech = await client.post("/api/v1/catalog/products", json=tech_prod)
        assert resp_tech.status_code == 201
        data_tech = resp_tech.json()
        assert len(data_tech["attributes"]) == 4

        # 3. Books Product with Bibliographic Metadata (PB-11)
        book_prod = {
            "store_id": "store-books-01",
            "title": "Engenharia de Linha de Produto de Software",
            "description": "Livro técnico de LPS",
            "price": 89.90,
            "stock_quantity": 20,
            "category": "Engenharia de Software",
            "attributes": [
                {"name": "isbn", "value": "978-8575220000"},
                {"name": "author", "value": "Pohl, Böckle, Linden"},
                {"name": "publisher", "value": "Editora Ciência"},
                {"name": "literary_genre", "value": "Acadêmico / Engenharia de Software"},
                {"name": "edition", "value": "1ª Edição"},
            ],
        }
        resp_book = await client.post("/api/v1/catalog/products", json=book_prod)
        assert resp_book.status_code == 201
        data_book = resp_book.json()
        attrs = {a["name"]: a["value"] for a in data_book["attributes"]}
        assert attrs["isbn"] == "978-8575220000"
        assert attrs["author"] == "Pohl, Böckle, Linden"


@pytest.mark.asyncio
async def test_store_isolation_pb08():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create product in Store A
        await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-alpha",
                "title": "Produto Alpha",
                "price": 50.0,
                "stock_quantity": 10,
                "category": "Geral",
            },
        )
        # Create product in Store B
        await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-beta",
                "title": "Produto Beta",
                "price": 90.0,
                "stock_quantity": 10,
                "category": "Geral",
            },
        )

        # Store Alpha query
        resp_a = await client.get("/api/v1/catalog/stores/store-alpha/products")
        assert resp_a.status_code == 200
        prods_a = resp_a.json()
        assert len(prods_a) == 1
        assert prods_a[0]["title"] == "Produto Alpha"

        # Store Beta query
        resp_b = await client.get("/api/v1/catalog/stores/store-beta/products")
        assert resp_b.status_code == 200
        prods_b = resp_b.json()
        assert len(prods_b) == 1
        assert prods_b[0]["title"] == "Produto Beta"


@pytest.mark.asyncio
async def test_atomic_inventory_decrement_and_idempotent_restore_pb12():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        internal_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # 1. Create product with 5 units
        prod_resp = await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-stock",
                "title": "Smartphone Top",
                "price": 2000.0,
                "stock_quantity": 5,
                "category": "Tech",
            },
        )
        product_id = prod_resp.json()["id"]

        # 2. Decrement 3 units
        dec_payload = {
            "store_id": "store-stock",
            "product_id": product_id,
            "quantity": 3,
            "operation_id": "op-checkout-order-001",
        }
        dec_resp = await client.post(
            "/internal/v1/inventory/decrement",
            json=dec_payload,
            headers=internal_headers,
        )
        assert dec_resp.status_code == 200
        assert dec_resp.json()["new_stock_quantity"] == 2

        # 3. Idempotent Retry: call again with SAME operation_id -> must not decrement again!
        retry_resp = await client.post(
            "/internal/v1/inventory/decrement",
            json=dec_payload,
            headers=internal_headers,
        )
        assert retry_resp.status_code == 200
        assert retry_resp.json()["new_stock_quantity"] == 2

        # 4. Insufficient stock: try to decrement 5 when only 2 are available -> 409
        over_payload = {
            "store_id": "store-stock",
            "product_id": product_id,
            "quantity": 5,
            "operation_id": "op-checkout-order-002",
        }
        over_resp = await client.post(
            "/internal/v1/inventory/decrement",
            json=over_payload,
            headers=internal_headers,
        )
        assert over_resp.status_code == 409
        assert over_resp.json()["error"]["code"] == "INSUFFICIENT_STOCK"

        # 5. Restore 3 units (compensation)
        restore_payload = {
            "store_id": "store-stock",
            "product_id": product_id,
            "quantity": 3,
            "operation_id": "op-restore-order-001",
        }
        rest_resp = await client.post(
            "/internal/v1/inventory/restore",
            json=restore_payload,
            headers=internal_headers,
        )
        assert rest_resp.status_code == 200
        assert rest_resp.json()["new_stock_quantity"] == 5

        # 6. Idempotent Retry on Restore
        retry_rest = await client.post(
            "/internal/v1/inventory/restore",
            json=restore_payload,
            headers=internal_headers,
        )
        assert retry_rest.status_code == 200
        assert retry_rest.json()["new_stock_quantity"] == 5


@pytest.mark.asyncio
async def test_favorites_management_pb13():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create product
        prod_resp = await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-fav-test",
                "title": "Jaqueta Jeans",
                "price": 199.0,
                "stock_quantity": 10,
                "category": "Moda",
            },
        )
        product_id = prod_resp.json()["id"]

        user_token = create_access_token(user_id="user-fav-1", email="user@fav.com")
        auth_headers = {"Authorization": f"Bearer {user_token}"}

        # Case A: favorites feature is DISABLED in store manifest
        manifest_provider.set_cache_entry(
            "store-fav-test",
            {"store_id": "store-fav-test", "segment": "FASHION", "features": {"favorites": False}},
        )
        resp_disabled = await client.post(
            "/api/v1/catalog/favorites/toggle",
            json={"store_id": "store-fav-test", "product_id": product_id},
            headers=auth_headers,
        )
        assert resp_disabled.status_code == 403
        assert resp_disabled.json()["error"]["code"] == "FEATURE_NOT_ENABLED"

        # Case B: favorites feature is ENABLED in store manifest
        manifest_provider.set_cache_entry(
            "store-fav-test",
            {"store_id": "store-fav-test", "segment": "FASHION", "features": {"favorites": True}},
        )
        # Toggle ON
        resp_on = await client.post(
            "/api/v1/catalog/favorites/toggle",
            json={"store_id": "store-fav-test", "product_id": product_id},
            headers=auth_headers,
        )
        assert resp_on.status_code == 200
        assert resp_on.json()["is_favorite"] is True

        # List favorites
        list_resp = await client.get(
            "/api/v1/catalog/favorites?store_id=store-fav-test",
            headers=auth_headers,
        )
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1

        # Toggle OFF
        resp_off = await client.post(
            "/api/v1/catalog/favorites/toggle",
            json={"store_id": "store-fav-test", "product_id": product_id},
            headers=auth_headers,
        )
        assert resp_off.status_code == 200
        assert resp_off.json()["is_favorite"] is False


@pytest.mark.asyncio
async def test_product_comparison_pb14():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create 2 Tech products
        p1 = await client.post(
            "/api/v1/catalog/products",
            json={"store_id": "store-tech-comp", "title": "Tech A", "price": 1000.0, "stock_quantity": 5, "category": "Tech"},
        )
        p2 = await client.post(
            "/api/v1/catalog/products",
            json={"store_id": "store-tech-comp", "title": "Tech B", "price": 2000.0, "stock_quantity": 5, "category": "Tech"},
        )
        p1_id = p1.json()["id"]
        p2_id = p2.json()["id"]

        # Case A: Store is FASHION -> Comparison not allowed (CTC-02)
        manifest_provider.set_cache_entry(
            "store-fashion-comp",
            {"store_id": "store-fashion-comp", "segment": "FASHION", "features": {"product_comparison": True}},
        )
        resp_fash = await client.get(
            f"/api/v1/catalog/products/compare?store_id=store-fashion-comp&product_ids={p1_id},{p2_id}"
        )
        assert resp_fash.status_code == 403
        assert resp_fash.json()["error"]["code"] == "FEATURE_NOT_ENABLED"

        # Case B: Store is TECH but product_comparison is FALSE
        manifest_provider.set_cache_entry(
            "store-tech-comp",
            {"store_id": "store-tech-comp", "segment": "TECH", "features": {"product_comparison": False}},
        )
        resp_tech_off = await client.get(
            f"/api/v1/catalog/products/compare?store_id=store-tech-comp&product_ids={p1_id},{p2_id}"
        )
        assert resp_tech_off.status_code == 403

        # Case C: Store is TECH and product_comparison is TRUE
        manifest_provider.set_cache_entry(
            "store-tech-comp",
            {"store_id": "store-tech-comp", "segment": "TECH", "features": {"product_comparison": True}},
        )
        resp_tech_on = await client.get(
            f"/api/v1/catalog/products/compare?store_id=store-tech-comp&product_ids={p1_id},{p2_id}"
        )
        assert resp_tech_on.status_code == 200
        comp_data = resp_tech_on.json()
        assert comp_data["total_compared"] == 2
        assert len(comp_data["products"]) == 2


@pytest.mark.asyncio
async def test_canonical_favorites_contract_pb13():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create product in store-fav-canonical
        prod_resp = await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-fav-canonical",
                "title": "Tênis Runner Pro",
                "price": 349.90,
                "stock_quantity": 25,
                "category": "Calçados",
            },
        )
        assert prod_resp.status_code == 201
        product_id = prod_resp.json()["id"]

        user_a_token = create_access_token(user_id="user-fav-a", email="usera@fav.com")
        headers_user_a = {"Authorization": f"Bearer {user_a_token}"}
        user_b_token = create_access_token(user_id="user-fav-b", email="userb@fav.com")
        headers_user_b = {"Authorization": f"Bearer {user_b_token}"}

        # 1. Feature disabled in store -> 403 FEATURE_NOT_ENABLED
        manifest_provider.set_cache_entry(
            "store-fav-canonical",
            {"store_id": "store-fav-canonical", "segment": "FASHION", "features": {"favorites": False}},
        )
        resp_blocked = await client.post(
            "/api/v1/catalog/favorites",
            json={"store_id": "store-fav-canonical", "product_id": product_id},
            headers=headers_user_a,
        )
        assert resp_blocked.status_code == 403
        assert resp_blocked.json()["error"]["code"] == "FEATURE_NOT_ENABLED"

        # 2. Enable feature
        manifest_provider.set_cache_entry(
            "store-fav-canonical",
            {"store_id": "store-fav-canonical", "segment": "FASHION", "features": {"favorites": True}},
        )

        # 3. Canonical POST /api/v1/catalog/favorites creates favorite
        post_resp = await client.post(
            "/api/v1/catalog/favorites",
            json={"store_id": "store-fav-canonical", "product_id": product_id},
            headers=headers_user_a,
        )
        assert post_resp.status_code == 201
        fav_data = post_resp.json()
        assert fav_data["is_favorite"] is True
        assert fav_data["product_id"] == product_id
        assert fav_data["store_id"] == "store-fav-canonical"

        # 4. Idempotent repeat POST -> returns safe success without duplication
        repeat_resp = await client.post(
            "/api/v1/catalog/favorites",
            json={"store_id": "store-fav-canonical", "product_id": product_id},
            headers=headers_user_a,
        )
        assert repeat_resp.status_code in (200, 201)
        assert repeat_resp.json()["is_favorite"] is True

        # 5. Canonical GET /api/v1/catalog/favorites lists the favorite
        get_resp = await client.get(
            "/api/v1/catalog/favorites?store_id=store-fav-canonical",
            headers=headers_user_a,
        )
        assert get_resp.status_code == 200
        favs = get_resp.json()
        assert len(favs) == 1
        assert favs[0]["id"] == product_id

        # 6. User isolation: user B has no favorites
        get_b_resp = await client.get(
            "/api/v1/catalog/favorites?store_id=store-fav-canonical",
            headers=headers_user_b,
        )
        assert get_b_resp.status_code == 200
        assert len(get_b_resp.json()) == 0

        # 7. Store isolation: query another store (enable favorites for store-other)
        manifest_provider.set_cache_entry(
            "store-other",
            {"store_id": "store-other", "segment": "FASHION", "features": {"favorites": True}},
        )
        get_other_resp = await client.get(
            "/api/v1/catalog/favorites?store_id=store-other",
            headers=headers_user_a,
        )
        assert get_other_resp.status_code == 200
        assert len(get_other_resp.json()) == 0

        # 8. Canonical DELETE /api/v1/catalog/favorites removes favorite
        del_resp = await client.request(
            "DELETE",
            "/api/v1/catalog/favorites",
            params={"store_id": "store-fav-canonical", "product_id": product_id},
            headers=headers_user_a,
        )
        assert del_resp.status_code == 200
        assert del_resp.json()["is_favorite"] is False

        # 9. Verify removed in GET
        get_after_del = await client.get(
            "/api/v1/catalog/favorites?store_id=store-fav-canonical",
            headers=headers_user_a,
        )
        assert get_after_del.status_code == 200
        assert len(get_after_del.json()) == 0

        # 10. Repeat DELETE is safe and idempotent
        del_repeat = await client.request(
            "DELETE",
            "/api/v1/catalog/favorites",
            params={"store_id": "store-fav-canonical", "product_id": product_id},
            headers=headers_user_a,
        )
        assert del_repeat.status_code == 200
        assert del_repeat.json()["is_favorite"] is False


@pytest.mark.asyncio
async def test_variant_stock_management_and_multi_item_idempotency_pb12():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        internal_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # 1. Create Fashion product with 2 variants: M (stock: 2) and G (stock: 8) -> Total: 10
        prod_resp = await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-fashion-stock",
                "title": "Camiseta Algodão Orgânico",
                "price": 89.90,
                "stock_quantity": 10,
                "category": "Moda",
                "variants": [
                    {"size": "M", "color": "Preto", "sku": "TSHIRT-M-BLK", "stock_quantity": 2},
                    {"size": "G", "color": "Preto", "sku": "TSHIRT-G-BLK", "stock_quantity": 8},
                ],
            },
        )
        assert prod_resp.status_code == 201
        prod_data = prod_resp.json()
        product_id = prod_data["id"]
        var_m_id = prod_data["variants"][0]["id"]
        var_g_id = prod_data["variants"][1]["id"]

        # 2. Multi-item Order "order-777": item 1 reserves Variant M (qty: 2)
        dec_m = {
            "store_id": "store-fashion-stock",
            "product_id": product_id,
            "variant_id": var_m_id,
            "quantity": 2,
            "operation_id": "order-777:item-variant-m",
        }
        res_m = await client.post("/internal/v1/inventory/decrement", json=dec_m, headers=internal_headers)
        assert res_m.status_code == 200
        assert res_m.json()["new_stock_quantity"] == 0

        # Check variant G was NOT affected (stock isolation between variants!)
        detail_after_m = await client.get(f"/api/v1/catalog/products/{product_id}")
        assert detail_after_m.status_code == 200
        detail_json = detail_after_m.json()
        variants_by_id = {v["id"]: v["stock_quantity"] for v in detail_json["variants"]}
        assert variants_by_id[var_m_id] == 0
        assert variants_by_id[var_g_id] == 8
        assert detail_json["stock_quantity"] == 8

        # 3. Attempting to decrement Variant M further fails (prevents negative stock)
        over_m = {
            "store_id": "store-fashion-stock",
            "product_id": product_id,
            "variant_id": var_m_id,
            "quantity": 1,
            "operation_id": "order-778:item-variant-m",
        }
        res_over = await client.post("/internal/v1/inventory/decrement", json=over_m, headers=internal_headers)
        assert res_over.status_code == 409
        assert res_over.json()["error"]["code"] == "INSUFFICIENT_STOCK"

        # 4. Multi-item Order "order-777": item 2 reserves Variant G (qty: 3)
        # Using item-level operation_id ensures UNIQUE(operation_id, movement_type) works per item
        dec_g = {
            "store_id": "store-fashion-stock",
            "product_id": product_id,
            "variant_id": var_g_id,
            "quantity": 3,
            "operation_id": "order-777:item-variant-g",
        }
        res_g = await client.post("/internal/v1/inventory/decrement", json=dec_g, headers=internal_headers)
        assert res_g.status_code == 200
        assert res_g.json()["new_stock_quantity"] == 5

        # Check updated aggregate and variant stocks
        detail_after_g = await client.get(f"/api/v1/catalog/products/{product_id}")
        detail_json_g = detail_after_g.json()
        variants_by_id_g = {v["id"]: v["stock_quantity"] for v in detail_json_g["variants"]}
        assert variants_by_id_g[var_m_id] == 0
        assert variants_by_id_g[var_g_id] == 5
        assert detail_json_g["stock_quantity"] == 5

        # 5. Idempotent Retry on item 2 (Variant G)
        retry_g = await client.post("/internal/v1/inventory/decrement", json=dec_g, headers=internal_headers)
        assert retry_g.status_code == 200
        assert retry_g.json()["new_stock_quantity"] == 5

        # 6. Saga Compensation: Restore Variant M (qty: 2)
        restore_m = {
            "store_id": "store-fashion-stock",
            "product_id": product_id,
            "variant_id": var_m_id,
            "quantity": 2,
            "operation_id": "order-777-restore:item-variant-m",
        }
        res_restore_m = await client.post("/internal/v1/inventory/restore", json=restore_m, headers=internal_headers)
        assert res_restore_m.status_code == 200
        assert res_restore_m.json()["new_stock_quantity"] == 2

        # Verify parent product stock updated to 7 (2 + 5)
        detail_after_restore = await client.get(f"/api/v1/catalog/products/{product_id}")
        assert detail_after_restore.json()["stock_quantity"] == 7
