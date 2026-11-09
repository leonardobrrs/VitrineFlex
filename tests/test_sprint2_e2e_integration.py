import asyncio
import pytest
import httpx

from lps_app import app as lps_app
from catalog_app import app as catalog_app
from lps_database import SessionFactory as LpsSessionFactory, init_db as init_lps_db
from lps_models import Store as LpsStore, ProductManifest as LpsProductManifest
from catalog_database import SessionFactory as CatalogSessionFactory, init_db as init_catalog_db
from catalog_models import Product as CatalogProduct, ProductVariant, ProductAttribute, InventoryMovement, Favorite
from catalog_routes import manifest_provider
from python_common.security import HEADER_INTERNAL_TOKEN, get_internal_service_key


@pytest.fixture(autouse=True)
def clean_e2e_databases():
    init_lps_db()
    with LpsSessionFactory() as session:
        session.query(LpsProductManifest).delete()
        session.query(LpsStore).delete()
        session.commit()

    init_catalog_db()
    with CatalogSessionFactory() as session:
        session.query(Favorite).delete()
        session.query(InventoryMovement).delete()
        session.query(ProductVariant).delete()
        session.query(ProductAttribute).delete()
        session.query(CatalogProduct).delete()
        session.commit()

    manifest_provider.clear_cache()


@pytest.mark.asyncio
async def test_derivation_of_three_segments_and_cataloging():
    """
    Testa a derivação formal dos 3 produtos da LPS (Moda, Tech, Livros)
    e o cadastro com os pontos de extensão correspondentes.
    """
    lps_transport = httpx.ASGITransport(app=lps_app)
    cat_transport = httpx.ASGITransport(app=catalog_app)

    async with httpx.AsyncClient(transport=lps_transport, base_url="http://lps:8002") as lps_client, \
               httpx.AsyncClient(transport=cat_transport, base_url="http://cat:8003") as cat_client:

        # 1. Derivar Loja de Moda: Vitrine Moda
        fashion_store_req = {
            "name": "Vitrine Moda Alagoas",
            "slug": "vitrine-moda",
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
        resp_fash = await lps_client.post("/api/v1/lps/stores", json=fashion_store_req)
        assert resp_fash.status_code == 201
        store_fashion_id = resp_fash.json()["id"]

        # Cadastrar produto com variantes de tamanho e cor na loja de moda
        prod_fashion_req = {
            "store_id": store_fashion_id,
            "title": "Vestido Linho Floral",
            "description": "Vestido de linho puro",
            "price": 289.0,
            "stock_quantity": 20,
            "category": "Vestuário Feminino",
            "variants": [
                {"size": "P", "color": "Branco", "sku": "VEST-LINHO-P-WHT", "stock_quantity": 10},
                {"size": "M", "color": "Branco", "sku": "VEST-LINHO-M-WHT", "stock_quantity": 10},
            ],
        }
        cat_fash = await cat_client.post("/api/v1/catalog/products", json=prod_fashion_req)
        assert cat_fash.status_code == 201
        assert len(cat_fash.json()["variants"]) == 2

        # 2. Derivar Loja de Tecnologia: Vitrine Tech
        tech_store_req = {
            "name": "Vitrine Tech Ponta Verde",
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
                "favorites": True,
            },
            "payment_methods": ["PIX", "CARD", "BOLETO"],
            "fulfillment_modes": ["DELIVERY", "PICKUP"],
        }
        resp_tech = await lps_client.post("/api/v1/lps/stores", json=tech_store_req)
        assert resp_tech.status_code == 201
        store_tech_id = resp_tech.json()["id"]

        # Cadastrar produto com especificações técnicas e garantia na loja de tecnologia
        prod_tech_req = {
            "store_id": store_tech_id,
            "title": "Monitor Gamer UltraWide 34",
            "description": "144Hz 1ms IPS",
            "price": 3299.0,
            "stock_quantity": 8,
            "category": "Monitores",
            "attributes": [
                {"name": "resolution", "value": "3440x1440 WQHD"},
                {"name": "refresh_rate", "value": "144Hz"},
                {"name": "warranty_months", "value": "24 meses"},
            ],
        }
        cat_tech = await cat_client.post("/api/v1/catalog/products", json=prod_tech_req)
        assert cat_tech.status_code == 201
        assert len(cat_tech.json()["attributes"]) == 3

        # 3. Derivar Loja de Livros: Vitrine Books
        books_store_req = {
            "name": "Vitrine Books Universitária",
            "slug": "vitrine-books",
            "segment": "BOOKS",
            "features": {
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
                "favorites": False,
            },
            "payment_methods": ["PIX", "BOLETO"],
            "fulfillment_modes": ["DELIVERY"],
        }
        resp_books = await lps_client.post("/api/v1/lps/stores", json=books_store_req)
        assert resp_books.status_code == 201
        store_books_id = resp_books.json()["id"]

        # Cadastrar produto com ficha bibliográfica completa
        prod_book_req = {
            "store_id": store_books_id,
            "title": "Software Product Lines in Action",
            "description": "Best Practices in European Software Product Line Engineering",
            "price": 120.0,
            "stock_quantity": 15,
            "category": "Computação",
            "attributes": [
                {"name": "isbn", "value": "978-3-540-74312-5"},
                {"name": "author", "value": "Frank van der Linden, Klaus Schmid, Eelco Rommes"},
                {"name": "publisher", "value": "Springer"},
                {"name": "literary_genre", "value": "Engenharia de Software"},
                {"name": "edition", "value": "1st Edition"},
            ],
        }
        cat_books = await cat_client.post("/api/v1/catalog/products", json=prod_book_req)
        assert cat_books.status_code == 201
        assert len(cat_books.json()["attributes"]) == 5

        # 4. Validar Isolamento Multiloja (RNF-04)
        list_fashion = await cat_client.get(f"/api/v1/catalog/stores/{store_fashion_id}/products")
        assert len(list_fashion.json()) == 1
        assert list_fashion.json()[0]["title"] == "Vestido Linho Floral"

        list_tech = await cat_client.get(f"/api/v1/catalog/stores/{store_tech_id}/products")
        assert len(list_tech.json()) == 1
        assert list_tech.json()[0]["title"] == "Monitor Gamer UltraWide 34"

        list_books = await cat_client.get(f"/api/v1/catalog/stores/{store_books_id}/products")
        assert len(list_books.json()) == 1
        assert list_books.json()[0]["title"] == "Software Product Lines in Action"


@pytest.mark.asyncio
async def test_concurrent_inventory_decrements_no_overselling():
    """
    Testa baixa concorrente de estoque (PB-12 / ADR-003):
    10 requisições simultâneas para um estoque de 10 unidades.
    Exatamente 10 devem ter sucesso e o estoque deve chegar a 0.
    Uma 11ª requisição deve falhar com 409 INSUFFICIENT_STOCK.
    """
    cat_transport = httpx.ASGITransport(app=catalog_app)
    internal_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

    async with httpx.AsyncClient(transport=cat_transport, base_url="http://cat:8003") as client:
        p_resp = await client.post(
            "/api/v1/catalog/products",
            json={
                "store_id": "store-concurrency",
                "title": "Item Concorrente",
                "price": 100.0,
                "stock_quantity": 10,
                "category": "Geral",
            },
        )
        product_id = p_resp.json()["id"]

        async def do_decrement(idx: int):
            return await client.post(
                "/internal/v1/inventory/decrement",
                json={
                    "store_id": "store-concurrency",
                    "product_id": product_id,
                    "quantity": 1,
                    "operation_id": f"concurrent-op-{idx}",
                },
                headers=internal_headers,
            )

        responses = await asyncio.gather(*[do_decrement(i) for i in range(10)])
        assert all(r.status_code == 200 for r in responses)

        detail_resp = await client.get(
            f"/internal/v1/catalog/products/{product_id}",
            headers=internal_headers,
        )
        assert detail_resp.json()["stock_quantity"] == 0

        overflow_resp = await client.post(
            "/internal/v1/inventory/decrement",
            json={
                "store_id": "store-concurrency",
                "product_id": product_id,
                "quantity": 1,
                "operation_id": "concurrent-op-overflow",
            },
            headers=internal_headers,
        )
        assert overflow_resp.status_code == 409
        assert overflow_resp.json()["error"]["code"] == "INSUFFICIENT_STOCK"
