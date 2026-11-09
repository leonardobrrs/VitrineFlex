#!/usr/bin/env python3
"""
VitrineFlex — Script de Carga de Demonstração, Expansão dos Catálogos e Derivação de Produtos.
Povoados ~25 produtos ativos em cada uma das 3 vitrines da LPS (total ~75 produtos):
1. Vitrine Moda (FASHION) - 25 produtos com variantes (tamanho, cor, SKU), guia de medidas e estoque.
2. Vitrine Tech (TECH) - 25 produtos com ficha técnica, atributos dinâmicos para filtros técnicos e garantia.
3. Vitrine Books (BOOKS) - 25 livros com metadados bibliográficos completos e amostras originais de prévia demonstrativa.

Totalmente idempotente: utiliza identificadores estáveis e estratégia segura de upsert.
Não apaga usuários, pedidos ou carrinhos.
"""

import json
import os
import sys
from pathlib import Path

# Adiciona diretórios do monorepo ao sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "packages" / "python-common"))
sys.path.insert(0, str(BASE_DIR / "services" / "lps-config-service" / "src"))
sys.path.insert(0, str(BASE_DIR / "services" / "catalog-service" / "src"))
sys.path.insert(0, str(BASE_DIR / "services" / "recommendation-service" / "src"))

# Configurar caminhos dos bancos caso executado de raiz
if "LPS_DB_NAME" not in os.environ:
    os.environ["LPS_DB_NAME"] = "lps.db"
if "CATALOG_DB_NAME" not in os.environ:
    os.environ["CATALOG_DB_NAME"] = "catalog.db"
if "RECOMMENDATION_DB_NAME" not in os.environ:
    os.environ["RECOMMENDATION_DB_NAME"] = "recommendations.db"

from lps_database import init_db as init_lps_db, SessionFactory as LpsSessionFactory
from lps_models import Store, ProductManifest
from catalog_database import init_db as init_catalog_db, SessionFactory as CatalogSessionFactory
from catalog_models import Product, ProductVariant, ProductAttribute
from recommendation_database import init_db as init_rec_db, SessionFactory as RecSessionFactory
from recommendation_models import UserInteraction


def seed_stores_and_manifests():
    init_lps_db()
    with LpsSessionFactory() as session:
        stores_data = [
            {
                "id": "store-fashion",
                "slug": "vitrine-moda",
                "name": "Vitrine Moda",
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
                    "technical_specs": False,
                    "warranty_info": False,
                    "product_comparison": False,
                    "technical_filters": False,
                    "isbn": False,
                    "author": False,
                    "publisher": False,
                    "literary_genre": False,
                    "edition": False,
                    "book_preview": False,
                    "favorites": True,
                    "recently_viewed": True,
                    "fashion_size_guide": True,
                    "back_in_stock_alert": True,
                },
                "payment_methods": ["PIX", "CARD"],
                "fulfillment_modes": ["DELIVERY", "PICKUP"],
                "theme": {
                    "primary_color": "#ec4899",
                    "secondary_color": "#fbcfe8",
                    "font_family": "Inter, sans-serif",
                    "border_radius": "8px",
                },
            },
            {
                "id": "store-tech",
                "slug": "vitrine-tech",
                "name": "Vitrine Tech",
                "segment": "TECH",
                "features": {
                    "auth": True,
                    "catalog": True,
                    "cart": True,
                    "orders": True,
                    "checkout": True,
                    "recommendations": True,
                    "size_grid": False,
                    "color_variants": False,
                    "variant_sku": False,
                    "fashion_size_guide": False,
                    "technical_specs": True,
                    "warranty_info": True,
                    "product_comparison": True,
                    "technical_filters": True,
                    "isbn": False,
                    "author": False,
                    "publisher": False,
                    "literary_genre": False,
                    "edition": False,
                    "book_preview": False,
                    "favorites": True,
                    "recently_viewed": True,
                    "back_in_stock_alert": True,
                },
                "payment_methods": ["PIX", "CARD", "BOLETO"],
                "fulfillment_modes": ["DELIVERY"],
                "theme": {
                    "primary_color": "#2563eb",
                    "secondary_color": "#bfdbfe",
                    "font_family": "Inter, sans-serif",
                    "border_radius": "6px",
                },
            },
            {
                "id": "store-books",
                "slug": "vitrine-books",
                "name": "Vitrine Books",
                "segment": "BOOKS",
                "features": {
                    "auth": True,
                    "catalog": True,
                    "cart": True,
                    "orders": True,
                    "checkout": True,
                    "recommendations": True,
                    "size_grid": False,
                    "color_variants": False,
                    "variant_sku": False,
                    "fashion_size_guide": False,
                    "technical_specs": False,
                    "warranty_info": False,
                    "product_comparison": False,
                    "technical_filters": False,
                    "isbn": True,
                    "author": True,
                    "publisher": True,
                    "literary_genre": True,
                    "edition": True,
                    "book_preview": True,
                    "favorites": True,
                    "recently_viewed": True,
                    "back_in_stock_alert": True,
                },
                "payment_methods": ["PIX", "BOLETO"],
                "fulfillment_modes": ["DELIVERY", "PICKUP"],
                "theme": {
                    "primary_color": "#d97706",
                    "secondary_color": "#fef3c7",
                    "font_family": "Inter, sans-serif",
                    "border_radius": "4px",
                },
            },
        ]

        for s_data in stores_data:
            store = session.query(Store).filter(Store.id == s_data["id"]).first()
            if not store:
                store = Store(
                    id=s_data["id"],
                    slug=s_data["slug"],
                    name=s_data["name"],
                    segment=s_data["segment"],
                )
                session.add(store)
                session.flush()
            else:
                store.slug = s_data["slug"]
                store.name = s_data["name"]
                store.segment = s_data["segment"]

            manifest = session.query(ProductManifest).filter(ProductManifest.store_id == s_data["id"], ProductManifest.is_active == True).first()
            if not manifest:
                manifest = ProductManifest(
                    store_id=s_data["id"],
                    version=1,
                    schema_version="1.1.0",
                    features_json=json.dumps(s_data["features"]),
                    theme_json=json.dumps(s_data["theme"]),
                    payment_methods_json=json.dumps(s_data["payment_methods"]),
                    fulfillment_modes_json=json.dumps(s_data["fulfillment_modes"]),
                    is_active=True,
                )
                session.add(manifest)
            else:
                manifest.features_json = json.dumps(s_data["features"])
                manifest.theme_json = json.dumps(s_data["theme"])
                manifest.payment_methods_json = json.dumps(s_data["payment_methods"])
                manifest.fulfillment_modes_json = json.dumps(s_data["fulfillment_modes"])

        session.commit()
        print("✓ Lojas e Manifestos versionados da LPS sincronizados com sucesso.")


def seed_catalog_products():
    init_catalog_db()
    with CatalogSessionFactory() as session:
        # ==========================================
        # 1. VITRINE MODA (25 PRODUTOS COM VARIANTES)
        # ==========================================
        fashion_products = [
            {
                "id": "prod-moda-polo",
                "store_id": "store-fashion",
                "title": "Camisa Polo Algodão Pima",
                "description": "Camisa polo clássica confeccionada em algodão Pima peruano, toque extremamente macio e corte regular.",
                "price": 149.90,
                "category": "Camisas",
                "image_url": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Azul Marinho", "sku": "POLO-P-NVY", "stock_quantity": 8},
                    {"size": "M", "color": "Azul Marinho", "sku": "POLO-M-NVY", "stock_quantity": 12},
                    {"size": "G", "color": "Azul Marinho", "sku": "POLO-G-NVY", "stock_quantity": 6},
                    {"size": "GG", "color": "Azul Marinho", "sku": "POLO-GG-NVY", "stock_quantity": 4},
                    {"size": "M", "color": "Branco", "sku": "POLO-M-WHT", "stock_quantity": 10},
                ],
            },
            {
                "id": "prod-moda-vestido",
                "store_id": "store-fashion",
                "title": "Vestido Midi Floral Elegance",
                "description": "Vestido com estampa botânica exclusiva, tecido fluido, forro leve e decote suave em V.",
                "price": 279.90,
                "category": "Vestidos",
                "image_url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Estampa Floral Rosa", "sku": "VEST-P-FLR", "stock_quantity": 5},
                    {"size": "M", "color": "Estampa Floral Rosa", "sku": "VEST-M-FLR", "stock_quantity": 7},
                    {"size": "G", "color": "Estampa Floral Rosa", "sku": "VEST-G-FLR", "stock_quantity": 4},
                ],
            },
            {
                "id": "prod-moda-jaqueta",
                "store_id": "store-fashion",
                "title": "Jaqueta Biker Couro Ecológico",
                "description": "Jaqueta estilo biker com zíperes metálicos escovados, forro térmico e acabamento acetinado de alta resistência.",
                "price": 389.90,
                "category": "Jaquetas",
                "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "M", "color": "Preto", "sku": "JAQ-M-BLK", "stock_quantity": 4},
                    {"size": "G", "color": "Preto", "sku": "JAQ-G-BLK", "stock_quantity": 6},
                    {"size": "GG", "color": "Preto", "sku": "JAQ-GG-BLK", "stock_quantity": 3},
                    {"size": "M", "color": "Marrom", "sku": "JAQ-M-BRN", "stock_quantity": 3},
                ],
            },
            {
                "id": "prod-moda-jeans",
                "store_id": "store-fashion",
                "title": "Calça Jeans Skinny Premium",
                "description": "Jeans com elastano de alta recuperação, lavagem escura contemporânea e costuras reforçadas.",
                "price": 199.90,
                "category": "Calças",
                "image_url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "38", "color": "Azul Escuro", "sku": "JNS-38-DKBLU", "stock_quantity": 9},
                    {"size": "40", "color": "Azul Escuro", "sku": "JNS-40-DKBLU", "stock_quantity": 11},
                    {"size": "42", "color": "Azul Escuro", "sku": "JNS-42-DKBLU", "stock_quantity": 7},
                ],
            },
            {
                "id": "prod-moda-tshirt-basic",
                "store_id": "store-fashion",
                "title": "Camiseta Básica Algodão Egípcio",
                "description": "Camiseta gola redonda essencial em fio nobre penteado, caimento impecável e toque aveludado.",
                "price": 89.90,
                "category": "Camisetas",
                "image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Preto", "sku": "TSH-P-BLK", "stock_quantity": 15},
                    {"size": "M", "color": "Preto", "sku": "TSH-M-BLK", "stock_quantity": 20},
                    {"size": "G", "color": "Preto", "sku": "TSH-G-BLK", "stock_quantity": 12},
                    {"size": "M", "color": "Branco", "sku": "TSH-M-WHT", "stock_quantity": 18},
                ],
            },
            {
                "id": "prod-moda-camisa-linho",
                "store_id": "store-fashion",
                "title": "Camisa Manga Longa em Linho Puro",
                "description": "Camisa clássica com corte contemporâneo em 100% linho natural, ideal para dias amenos e ensolarados.",
                "price": 249.90,
                "category": "Camisas",
                "image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "M", "color": "Areia", "sku": "LNH-M-SND", "stock_quantity": 7},
                    {"size": "G", "color": "Areia", "sku": "LNH-G-SND", "stock_quantity": 9},
                    {"size": "M", "color": "Azul Céu", "sku": "LNH-M-SKY", "stock_quantity": 6},
                ],
            },
            {
                "id": "prod-moda-blazer-alfaiataria",
                "store_id": "store-fashion",
                "title": "Blazer Slim Fit Alfaiataria Italiana",
                "description": "Blazer com lapela chanfrada, forro em cetim jacquard e corte estruturado de alfaiataria premium.",
                "price": 459.90,
                "category": "Jaquetas",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "M", "color": "Cinza Chumbo", "sku": "BLZ-M-GRY", "stock_quantity": 5},
                    {"size": "G", "color": "Cinza Chumbo", "sku": "BLZ-G-GRY", "stock_quantity": 6},
                ],
            },
            {
                "id": "prod-moda-moletom-hoodie",
                "store_id": "store-fashion",
                "title": "Moletom Hoodie Confort Fleece",
                "description": "Moletom com capuz duplo ajustável, bolso canguru e felpa interna térmica de gramatura pesada.",
                "price": 189.90,
                "category": "Moletons",
                "image_url": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Verde Oliva", "sku": "MLT-P-OLV", "stock_quantity": 8},
                    {"size": "M", "color": "Verde Oliva", "sku": "MLT-M-OLV", "stock_quantity": 14},
                    {"size": "G", "color": "Verde Oliva", "sku": "MLT-G-OLV", "stock_quantity": 10},
                ],
            },
            {
                "id": "prod-moda-calca-chino",
                "store_id": "store-fashion",
                "title": "Calça Chino Sarja Acetinada",
                "description": "Calça com modelagem regular em sarja peletizada, cós com passantes e bolsos faca funcionais.",
                "price": 179.90,
                "category": "Calças",
                "image_url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "38", "color": "Bege Khaki", "sku": "CHN-38-KHK", "stock_quantity": 8},
                    {"size": "40", "color": "Bege Khaki", "sku": "CHN-40-KHK", "stock_quantity": 12},
                    {"size": "42", "color": "Bege Khaki", "sku": "CHN-42-KHK", "stock_quantity": 6},
                ],
            },
            {
                "id": "prod-moda-vestido-festa",
                "store_id": "store-fashion",
                "title": "Vestido Longo Seda Noturna",
                "description": "Vestido longo com caimento reto sofisticado, fenda lateral elegante e fechamento invisível.",
                "price": 499.90,
                "category": "Vestidos",
                "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Azul Marinho", "sku": "VLG-P-NVY", "stock_quantity": 3},
                    {"size": "M", "color": "Azul Marinho", "sku": "VLG-M-NVY", "stock_quantity": 5},
                ],
            },
            {
                "id": "prod-moda-tenis-casual",
                "store_id": "store-fashion",
                "title": "Tênis Couro Casual Minimalist",
                "description": "Tênis de solado reto em borracha vulcanizada, palmilha anti-impacto e cabedal em couro bovino legítimo.",
                "price": 299.90,
                "category": "Calçados",
                "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "39", "color": "Branco Puro", "sku": "TNS-39-WHT", "stock_quantity": 6},
                    {"size": "40", "color": "Branco Puro", "sku": "TNS-40-WHT", "stock_quantity": 10},
                    {"size": "41", "color": "Branco Puro", "sku": "TNS-41-WHT", "stock_quantity": 8},
                ],
            },
            {
                "id": "prod-moda-bolsa-couro",
                "store_id": "store-fashion",
                "title": "Bolsa Tote Couro Legítimo Carmim",
                "description": "Bolsa tote espaçosa com compartimento acolchoado para notebook de até 14 polegadas e alça reforçada.",
                "price": 359.90,
                "category": "Bolsas",
                "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "Único", "color": "Carmim", "sku": "BLS-U-CRM", "stock_quantity": 7},
                    {"size": "Único", "color": "Preto Clássico", "sku": "BLS-U-BLK", "stock_quantity": 9},
                ],
            },
            {
                "id": "prod-moda-cinto-elegance",
                "store_id": "store-fashion",
                "title": "Cinto Fivela Metálica Escovada",
                "description": "Cinto em couro dupla face com fivela giratória metálica de perfil slim.",
                "price": 79.90,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "95cm", "color": "Preto e Marrom", "sku": "CNT-95-DF", "stock_quantity": 12},
                    {"size": "105cm", "color": "Preto e Marrom", "sku": "CNT-105-DF", "stock_quantity": 14},
                ],
            },
            {
                "id": "prod-moda-trench-coat",
                "store_id": "store-fashion",
                "title": "Trench Coat Clássico Impermeável",
                "description": "Casaco clássico com cinto de amarração, botões em resina tartaruga e tecido hidrorrepelente.",
                "price": 539.90,
                "category": "Jaquetas",
                "image_url": "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Camel", "sku": "TRN-P-CML", "stock_quantity": 4},
                    {"size": "M", "color": "Camel", "sku": "TRN-M-CML", "stock_quantity": 6},
                    {"size": "G", "color": "Camel", "sku": "TRN-G-CML", "stock_quantity": 3},
                ],
            },
            {
                "id": "prod-moda-bermuda-linho",
                "store_id": "store-fashion",
                "title": "Bermuda Chino Linho & Algodão",
                "description": "Bermuda acima do joelho com bolsos funcionais e textura fresca natural.",
                "price": 139.90,
                "category": "Bermudas",
                "image_url": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "40", "color": "Areia", "sku": "BRM-40-SND", "stock_quantity": 8},
                    {"size": "42", "color": "Areia", "sku": "BRM-42-SND", "stock_quantity": 7},
                ],
            },
            {
                "id": "prod-moda-cardigan-tricot",
                "store_id": "store-fashion",
                "title": "Cardigan Tricot Modal Premium",
                "description": "Cardigan em malha tricot com toque de seda modal, abotoamento frontal e punhos canelados.",
                "price": 219.90,
                "category": "Casacos",
                "image_url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "M", "color": "Cinza Mescla", "sku": "CRD-M-GRY", "stock_quantity": 6},
                    {"size": "G", "color": "Cinza Mescla", "sku": "CRD-G-GRY", "stock_quantity": 7},
                ],
            },
            {
                "id": "prod-moda-jaqueta-jeans",
                "store_id": "store-fashion",
                "title": "Jaqueta Jeans Trucker Vintage",
                "description": "Jaqueta jeans com lavagem estonada autêntica, bolsos frontais com aba e botões de cobre envelhecido.",
                "price": 269.90,
                "category": "Jaquetas",
                "image_url": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Jeans Médio", "sku": "JKJ-P-MED", "stock_quantity": 5},
                    {"size": "M", "color": "Jeans Médio", "sku": "JKJ-M-MED", "stock_quantity": 9},
                    {"size": "G", "color": "Jeans Médio", "sku": "JKJ-G-MED", "stock_quantity": 6},
                ],
            },
            {
                "id": "prod-moda-blusa-crepe",
                "store_id": "store-fashion",
                "title": "Blusa Gola Alta em Crepe Leve",
                "description": "Blusa feminina sem mangas com gola alta drapeada, perfeita para composições elegantes de trabalho.",
                "price": 149.90,
                "category": "Camisas",
                "image_url": "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Off-White", "sku": "BLU-P-OFW", "stock_quantity": 8},
                    {"size": "M", "color": "Off-White", "sku": "BLU-M-OFW", "stock_quantity": 11},
                ],
            },
            {
                "id": "prod-moda-calca-jogger",
                "store_id": "store-fashion",
                "title": "Calça Jogger Casual Urban",
                "description": "Calça jogger com cós elástico com cordão de ajuste e punhos canelados na barra.",
                "price": 169.90,
                "category": "Calças",
                "image_url": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "M", "color": "Preto", "sku": "JOG-M-BLK", "stock_quantity": 12},
                    {"size": "G", "color": "Preto", "sku": "JOG-G-BLK", "stock_quantity": 9},
                ],
            },
            {
                "id": "prod-moda-scarpin-classic",
                "store_id": "store-fashion",
                "title": "Scarpin Salto Médio Conforto",
                "description": "Sapato scarpin em napa fosca com palmilha acolchoada e salto bloco de 6cm para uso prolongado.",
                "price": 279.90,
                "category": "Calçados",
                "image_url": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "36", "color": "Nude Rosado", "sku": "SCP-36-NUD", "stock_quantity": 5},
                    {"size": "37", "color": "Nude Rosado", "sku": "SCP-37-NUD", "stock_quantity": 7},
                    {"size": "38", "color": "Nude Rosado", "sku": "SCP-38-NUD", "Nx": 4, "stock_quantity": 4},
                ],
            },
            {
                "id": "prod-moda-carteira-slim",
                "store_id": "store-fashion",
                "title": "Carteira Porta-Cartões Couro Slim",
                "description": "Carteira ultrafina com bloqueio RFID para cartões e compartimento para cédulas dobradas.",
                "price": 69.90,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "Único", "color": "Caramelo", "sku": "CRT-U-CRM", "stock_quantity": 20},
                    {"size": "Único", "color": "Preto", "sku": "CRT-U-BLK", "stock_quantity": 18},
                ],
            },
            {
                "id": "prod-moda-cachecol-cashmere",
                "store_id": "store-fashion",
                "title": "Cachecol Toque de Cashmere",
                "description": "Cachecol com franjas artesanais em trama macia e isolamento térmico suave.",
                "price": 119.90,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "Único", "color": "Bordeaux", "sku": "CCH-U-BDX", "stock_quantity": 9},
                    {"size": "Único", "color": "Cinza Claro", "sku": "CCH-U-LGRY", "stock_quantity": 11},
                ],
            },
            {
                "id": "prod-moda-regata-rib",
                "store_id": "store-fashion",
                "title": "Regata Canelada Gola Halter",
                "description": "Regata de modelagem justa com decote halter e malha ribana com elasticidade confortável.",
                "price": 69.90,
                "category": "Camisetas",
                "image_url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Branco", "sku": "RGT-P-WHT", "stock_quantity": 10},
                    {"size": "M", "color": "Branco", "sku": "RGT-M-WHT", "stock_quantity": 14},
                    {"size": "G", "color": "Branco", "sku": "RGT-G-WHT", "stock_quantity": 8},
                ],
            },
            {
                "id": "prod-moda-camisa-social",
                "store_id": "store-fashion",
                "title": "Camisa Social Slim Fit Microfibra",
                "description": "Camisa que não amassa fácil com colarinho estruturado francês e punhos chanfrados.",
                "price": 179.90,
                "category": "Camisas",
                "image_url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "M", "color": "Azul Claro", "sku": "SOC-M-LBLU", "stock_quantity": 8},
                    {"size": "G", "color": "Azul Claro", "sku": "SOC-G-LBLU", "stock_quantity": 10},
                ],
            },
            {
                "id": "prod-moda-vestido-esgotado",
                "store_id": "store-fashion",
                "title": "Vestido Slip Dress Cetim Champagne (Esgotado)",
                "description": "Vestido drapeado com alças reguláveis finas em cetim toque de seda. Peça esgotada no estoque atual.",
                "price": 289.90,
                "category": "Vestidos",
                "image_url": "https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"size": "P", "color": "Champagne", "sku": "SLP-P-CHP", "stock_quantity": 0},
                    {"size": "M", "color": "Champagne", "sku": "SLP-M-CHP", "stock_quantity": 0},
                ],
            },
        ]

        for p_data in fashion_products:
            total_stock = sum(v["stock_quantity"] for v in p_data["variants"])
            prod = session.query(Product).filter(Product.id == p_data["id"]).first()
            if not prod:
                prod = Product(
                    id=p_data["id"],
                    store_id=p_data["store_id"],
                    title=p_data["title"],
                    description=p_data["description"],
                    price=p_data["price"],
                    stock_quantity=total_stock,
                    category=p_data["category"],
                    image_url=p_data["image_url"],
                    is_active=True,
                )
                session.add(prod)
                session.flush()
            else:
                prod.title = p_data["title"]
                prod.description = p_data["description"]
                prod.price = p_data["price"]
                prod.stock_quantity = total_stock
                prod.category = p_data["category"]
                prod.image_url = p_data["image_url"]

            for v_data in p_data["variants"]:
                var = session.query(ProductVariant).filter(ProductVariant.sku == v_data["sku"]).first()
                if not var:
                    var = ProductVariant(
                        product_id=prod.id,
                        size=v_data["size"],
                        color=v_data["color"],
                        sku=v_data["sku"],
                        stock_quantity=v_data["stock_quantity"],
                    )
                    session.add(var)
                else:
                    var.stock_quantity = v_data["stock_quantity"]

        # ===============================================
        # 2. VITRINE TECH (25 PRODUTOS COM ESPECIFICAÇÕES)
        # ===============================================
        tech_products = [
            {
                "id": "prod-tech-dell-xps",
                "store_id": "store-tech",
                "title": "Notebook Dell XPS 15 OLED",
                "description": "Notebook ultrafino de alta performance com tela OLED 3.5K e chassi em alumínio usinado.",
                "price": 8499.00,
                "stock_quantity": 6,
                "category": "Notebooks",
                "image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "Intel Core i9-13900H"},
                    {"name": "Memória RAM", "value": "32GB DDR5"},
                    {"name": "Armazenamento", "value": "1TB SSD NVMe"},
                    {"name": "Placa de Vídeo", "value": "GeForce RTX 4070 8GB"},
                    {"name": "Tela", "value": "15.6 OLED 3.5K 120Hz"},
                    {"name": "Garantia", "value": "24 meses pelo fabricante"},
                ],
            },
            {
                "id": "prod-tech-monitor-34",
                "store_id": "store-tech",
                "title": "Monitor Curvo 34 Ultrawide 144Hz",
                "description": "Monitor profissional imersivo com painel IPS, resolução WQHD e suporte a HDR400.",
                "price": 3299.00,
                "stock_quantity": 8,
                "category": "Monitores",
                "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Resolução", "value": "3440 x 1440 WQHD"},
                    {"name": "Taxa de Atualização", "value": "144Hz"},
                    {"name": "Conectividade", "value": "USB-C 90W, 2x HDMI 2.1, 1x DP 1.4"},
                    {"name": "Garantia", "value": "36 meses on-site"},
                ],
            },
            {
                "id": "prod-tech-keyboard-rgb",
                "store_id": "store-tech",
                "title": "Teclado Mecânico Wireless RGB Pro",
                "description": "Teclado mecânico compacto 75% com switches lubrificados de fábrica e conectividade tri-mode.",
                "price": 649.90,
                "stock_quantity": 15,
                "category": "Periféricos",
                "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "ARM Cortex-M4"},
                    {"name": "Conectividade", "value": "Bluetooth 5.1 / 2.4GHz / USB-C"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-mouse-wireless",
                "store_id": "store-tech",
                "title": "Mouse Gamer Ultraleve 26000 DPI",
                "description": "Mouse ergonômico competitivo pesando apenas 59g com sensor óptico de última geração.",
                "price": 489.90,
                "stock_quantity": 12,
                "category": "Periféricos",
                "image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Wireless 2.4GHz / USB-C"},
                    {"name": "Resolução", "value": "26000 DPI Sensor Óptico"},
                    {"name": "Garantia", "value": "24 meses"},
                ],
            },
            {
                "id": "prod-tech-macbook-pro",
                "store_id": "store-tech",
                "title": "MacBook Pro 14 M3 Pro",
                "description": "Estação de trabalho portátil com chip M3 Pro, tela Liquid Retina XDR e autonomia de até 18 horas.",
                "price": 14999.00,
                "stock_quantity": 5,
                "category": "Notebooks",
                "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "Apple M3 Pro 11-Core"},
                    {"name": "Memória RAM", "value": "18GB Unificada"},
                    {"name": "Armazenamento", "value": "512GB SSD Ultrarrápido"},
                    {"name": "Tela", "value": "14.2 Liquid Retina XDR 120Hz"},
                    {"name": "Garantia", "value": "12 meses Apple Care"},
                ],
            },
            {
                "id": "prod-tech-s24-ultra",
                "store_id": "store-tech",
                "title": "Galaxy S24 Ultra 5G 512GB",
                "description": "Smartphone premium com estrutura em titânio, câmera de 200MP com zoom óptico e Galaxy AI integrada.",
                "price": 6499.00,
                "stock_quantity": 9,
                "category": "Smartphones",
                "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "Snapdragon 8 Gen 3 for Galaxy"},
                    {"name": "Memória RAM", "value": "12GB LPDDR5X"},
                    {"name": "Armazenamento", "value": "512GB UFS 4.0"},
                    {"name": "Conectividade", "value": "5G / Wi-Fi 7 / Bluetooth 5.3"},
                    {"name": "Garantia", "value": "12 meses oficial Samsung"},
                ],
            },
            {
                "id": "prod-tech-iphone-15-pro",
                "store_id": "store-tech",
                "title": "iPhone 15 Pro Max 256GB Titânio",
                "description": "Design em titânio de grau aeroespacial, chip A17 Pro com GPU de nível console e teleobjetiva de 5x.",
                "price": 7899.00,
                "stock_quantity": 7,
                "category": "Smartphones",
                "image_url": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "Apple A17 Pro Hexa-Core"},
                    {"name": "Memória RAM", "value": "8GB LPDDR5"},
                    {"name": "Armazenamento", "value": "256GB NVMe"},
                    {"name": "Conectividade", "value": "5G / Wi-Fi 6E / USB-C 10Gbps"},
                    {"name": "Garantia", "value": "12 meses Apple Brasil"},
                ],
            },
            {
                "id": "prod-tech-monitor-27-4k",
                "store_id": "store-tech",
                "title": "Monitor Gamer 27 4K IPS 144Hz",
                "description": "Monitor de alta definição com fidelidade de cores 99% DCI-P3, taxa de 144Hz e tempo de resposta de 1ms.",
                "price": 2899.00,
                "stock_quantity": 11,
                "category": "Monitores",
                "image_url": "https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Resolução", "value": "3840 x 2160 4K UHD"},
                    {"name": "Taxa de Atualização", "value": "144Hz"},
                    {"name": "Conectividade", "value": "HDMI 2.1, DisplayPort 1.4"},
                    {"name": "Garantia", "value": "36 meses"},
                ],
            },
            {
                "id": "prod-tech-headset-anc",
                "store_id": "store-tech",
                "title": "Headset Wireless Hi-Res com ANC",
                "description": "Headphone over-ear com cancelamento ativo de ruído híbrido, drivers de 40mm em biocelulose e 50h de bateria.",
                "price": 949.90,
                "stock_quantity": 14,
                "category": "Áudio",
                "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Bluetooth 5.3 / Cabo 3.5mm"},
                    {"name": "Garantia", "value": "24 meses"},
                ],
            },
            {
                "id": "prod-tech-earbuds-anc",
                "store_id": "store-tech",
                "title": "Fones Bluetooth TWS Pro ANC",
                "description": "Fones intra-auriculares com som espacial 3D, estojo com carregamento sem fio e proteção IPX4 contra suor.",
                "price": 589.90,
                "stock_quantity": 15,
                "category": "Áudio",
                "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Bluetooth 5.3 / Qi Wireless"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-ssd-2tb",
                "store_id": "store-tech",
                "title": "SSD NVMe M.2 2TB PCIe 4.0 7400MB/s",
                "description": "Unidade de armazenamento ultrarrápida com dissipador térmico em grafeno para consoles e desktops.",
                "price": 799.90,
                "stock_quantity": 16,
                "category": "Armazenamento",
                "image_url": "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Armazenamento", "value": "2TB NVMe M.2 PCIe Gen 4"},
                    {"name": "Garantia", "value": "60 meses (5 anos)"},
                ],
            },
            {
                "id": "prod-tech-ram-32gb",
                "store_id": "store-tech",
                "title": "Memória RAM DDR5 32GB (2x16GB) 6000MHz",
                "description": "Kit de memória dual-channel com suporte a perfis XMP 3.0 e AMD EXPO, dissipador de alumínio anodizado.",
                "price": 729.90,
                "stock_quantity": 18,
                "category": "Hardware",
                "image_url": "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Memória RAM", "value": "32GB (2x16GB) DDR5 6000MHz"},
                    {"name": "Garantia", "value": "Garantia vitalícia pelo fabricante"},
                ],
            },
            {
                "id": "prod-tech-gpu-rtx4080",
                "store_id": "store-tech",
                "title": "Placa de Vídeo RTX 4080 Super 16GB",
                "description": "GPU topo de linha com arquitetura Ada Lovelace, suporte a DLSS 3.5 com Ray Tracing completo em 4K.",
                "price": 6899.00,
                "stock_quantity": 4,
                "category": "Hardware",
                "image_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Placa de Vídeo", "value": "GeForce RTX 4080 Super 16GB GDDR6X"},
                    {"name": "Conectividade", "value": "3x DisplayPort 1.4a, 1x HDMI 2.1a"},
                    {"name": "Garantia", "value": "36 meses"},
                ],
            },
            {
                "id": "prod-tech-webcam-4k",
                "store_id": "store-tech",
                "title": "Webcam Profissional 4K Ultra HD",
                "description": "Câmera com sensor Sony Starvis, foco automático por detecção de fase e microfones duplos com redução de ruído.",
                "price": 499.90,
                "stock_quantity": 15,
                "category": "Periféricos",
                "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Resolução", "value": "4K Ultra HD 30fps / 1080p 60fps"},
                    {"name": "Conectividade", "value": "USB-C 3.0 Plug and Play"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-dock-thunderbolt",
                "store_id": "store-tech",
                "title": "Docking Station Thunderbolt 4 120W",
                "description": "Hub profissional com 14 portas, suporte a monitores duplos 4K 60Hz e carregamento Power Delivery de 96W.",
                "price": 899.90,
                "stock_quantity": 9,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Thunderbolt 4 / USB4 / HDMI / DP / RJ45"},
                    {"name": "Garantia", "value": "24 meses"},
                ],
            },
            {
                "id": "prod-tech-pad-wireless",
                "store_id": "store-tech",
                "title": "Base Carregador Wireless Magnético 3 em 1",
                "description": "Estação de recarga rápida Qi de 15W para smartphone, smartwatch e fones de ouvido simultaneamente.",
                "price": 249.90,
                "stock_quantity": 22,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1622445262464-84b1456045b6?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Indução Magnética Qi 15W / USB-C"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-tablet-pro",
                "store_id": "store-tech",
                "title": "Tablet Pro 11 128GB Wi-Fi 120Hz",
                "description": "Tablet ultrafino com tela de 120Hz de alta densidade, suporte a caneta magnética stylus e som estéreo quádruplo.",
                "price": 3499.00,
                "stock_quantity": 8,
                "category": "Tablets",
                "image_url": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "Octa-Core 3.2GHz 4nm"},
                    {"name": "Memória RAM", "value": "8GB LPDDR5"},
                    {"name": "Armazenamento", "value": "128GB UFS"},
                    {"name": "Tela", "value": "11.0 IPS 120Hz 2560x1600"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-smartwatch-titanium",
                "store_id": "store-tech",
                "title": "Smartwatch Titanium GPS Sapphire ECG",
                "description": "Relógio inteligente com caixa em titânio aeroespacial, vidro de safira e sensores de saúde com ECG e oxímetro.",
                "price": 1899.00,
                "stock_quantity": 10,
                "category": "Wearables",
                "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Processador", "value": "Dual-Core S9 SiP"},
                    {"name": "Conectividade", "value": "Bluetooth 5.3 / Wi-Fi / GPS L1+L5"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-cooler-liquid",
                "store_id": "store-tech",
                "title": "Water Cooler 360mm ARGB Alto Desempenho",
                "description": "Sistema de refrigeração líquida selado para processadores de até 350W TDP, com 3 ventoinhas PWM silenciosas.",
                "price": 629.90,
                "stock_quantity": 11,
                "category": "Hardware",
                "image_url": "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Header 4-pin PWM / ARGB 3-pin 5V"},
                    {"name": "Garantia", "value": "36 meses"},
                ],
            },
            {
                "id": "prod-tech-power-850w",
                "store_id": "store-tech",
                "title": "Fonte Modular 850W 80 Plus Gold",
                "description": "Fonte totalmente modular padrão ATX 3.0 com cabo nativo PCIe 5.0 12VHPWR e capacitores 100% japoneses.",
                "price": 689.90,
                "stock_quantity": 13,
                "category": "Hardware",
                "image_url": "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Garantia", "value": "120 meses (10 anos)"},
                ],
            },
            {
                "id": "prod-tech-router-wifi6",
                "store_id": "store-tech",
                "title": "Roteador Mesh Wi-Fi 6 AX3000 Gigabit",
                "description": "Roteador dual-band com tecnologia OFDMA e MU-MIMO para conectar até 128 dispositivos simultâneos sem latência.",
                "price": 459.90,
                "stock_quantity": 17,
                "category": "Redes",
                "image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Wi-Fi 6 AX3000 / 4x Portas Gigabit RJ45"},
                    {"name": "Garantia", "value": "24 meses"},
                ],
            },
            {
                "id": "prod-tech-mic-podcast",
                "store_id": "store-tech",
                "title": "Microfone Condensador USB Studio Cardióide",
                "description": "Microfone profissional para streaming e gravação vocal com botão mute capacitivo e saída para fone com zero latência.",
                "price": 389.90,
                "stock_quantity": 14,
                "category": "Áudio",
                "image_url": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "USB-C / Saída P2 3.5mm"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-lightbar-monitor",
                "store_id": "store-tech",
                "title": "Barra de Luz LED para Monitor Anti-Reflexo",
                "description": "Luminária inteligente para monitor com controle touch sem fio, ajuste de temperatura de cor e sem reflexos na tela.",
                "price": 199.90,
                "stock_quantity": 25,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "Alimentação USB 5V 1A"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-hub-usbc",
                "store_id": "store-tech",
                "title": "Hub USB-C 8 em 1 Alumínio HDMI 4K",
                "description": "Adaptador portátil em alumínio espacial com leitor SD/TF, 3 portas USB 3.0, HDMI 4K 60Hz e Power Delivery 100W.",
                "price": 179.90,
                "stock_quantity": 28,
                "category": "Acessórios",
                "image_url": "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Conectividade", "value": "USB-C PD 100W, HDMI 4K, 3x USB-A 3.0, SD/TF"},
                    {"name": "Garantia", "value": "12 meses"},
                ],
            },
            {
                "id": "prod-tech-gpu-esgotada",
                "store_id": "store-tech",
                "title": "Placa de Vídeo RTX 4090 24GB Extreme OC (Esgotada)",
                "description": "Placa topo de linha para renderização 3D pesada e inteligência artificial generativa. Produto fora de estoque.",
                "price": 13999.00,
                "stock_quantity": 0,
                "category": "Hardware",
                "image_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80",
                "attributes": [
                    {"name": "Placa de Vídeo", "value": "GeForce RTX 4090 24GB GDDR6X"},
                    {"name": "Garantia", "value": "36 meses"},
                ],
            },
        ]

        for p_data in tech_products:
            prod = session.query(Product).filter(Product.id == p_data["id"]).first()
            if not prod:
                prod = Product(
                    id=p_data["id"],
                    store_id=p_data["store_id"],
                    title=p_data["title"],
                    description=p_data["description"],
                    price=p_data["price"],
                    stock_quantity=p_data["stock_quantity"],
                    category=p_data["category"],
                    image_url=p_data["image_url"],
                    is_active=True,
                )
                session.add(prod)
                session.flush()
            else:
                prod.title = p_data["title"]
                prod.description = p_data["description"]
                prod.price = p_data["price"]
                prod.stock_quantity = p_data["stock_quantity"]
                prod.category = p_data["category"]
                prod.image_url = p_data["image_url"]

            session.query(ProductAttribute).filter(ProductAttribute.product_id == prod.id).delete()
            for attr in p_data["attributes"]:
                session.add(ProductAttribute(product_id=prod.id, name=attr["name"], value=attr["value"]))

        # ====================================================
        # 3. VITRINE BOOKS (25 LIVROS COM METADADOS E PRÉVIAS)
        # ====================================================
        books_products = [
            {
                "id": "prod-book-spl",
                "store_id": "store-books",
                "title": "Software Product Lines: Practices and Patterns",
                "description": "Obra seminal sobre Engenharia de Linhas de Produto de Software por pioneiros do Software Engineering Institute (SEI).",
                "price": 189.90,
                "stock_quantity": 10,
                "category": "Engenharia de Software",
                "image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — O QUE É UMA LINHA DE PRODUTO DE SOFTWARE?\n\n"
                    "Uma Linha de Produto de Software (LPS) é um conjunto de sistemas intensivos em software que compartilham "
                    "um conjunto comum e gerenciado de características que satisfazem as necessidades específicas de um determinado "
                    "segmento de mercado ou missão e que são desenvolvidos a partir de um conjunto comum de ativos essenciais de forma prescrita.\n\n"
                    "A essência das LPS reside no conceito de reuso planejado e sistemático. Em vez de construir cada novo sistema do zero "
                    "ou através de cópia e modificação oportunista ('clone and own'), uma organização projeta a arquitetura para suportar variabilidade "
                    "controlada desde o início da modelagem formal."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-0201703320"},
                    {"name": "Autor", "value": "Paul Clements & Linda Northrop"},
                    {"name": "Editora", "value": "Addison-Wesley Professional"},
                    {"name": "Gênero Literário", "value": "Engenharia de Software e Arquitetura"},
                    {"name": "Edição", "value": "1ª Edição"},
                ],
            },
            {
                "id": "prod-book-clean-code",
                "store_id": "store-books",
                "title": "Clean Code: Habilidades Ágeis de Software",
                "description": "Guia fundamental sobre boas práticas de codificação limpa, refatoração e testes automatizados.",
                "price": 99.90,
                "stock_quantity": 18,
                "category": "Computação",
                "image_url": "https://images.unsplash.com/photo-1532012164546-f432f2e3ddb5?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — CÓDIGO LIMPO\n\n"
                    "Haverá código? Alguns argumentam que estamos próximos do fim do código, que programadores em breve não serão mais necessários. "
                    "Bobagem. Jamais ficaremos livres do código, pois o código representa a especificação detalhada de requisitos.\n\n"
                    "Qualquer tolo pode escrever código que um computador entenda. Bons programadores escrevem código que humanos podem entender. "
                    "A única medida válida de qualidade de código é o número de 'WTFs' por minuto durante uma revisão."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8576082675"},
                    {"name": "Autor", "value": "Robert C. Martin"},
                    {"name": "Editora", "value": "Alta Books"},
                    {"name": "Gênero Literário", "value": "Desenvolvimento de Software"},
                    {"name": "Edição", "value": "1ª Edição Revisada"},
                ],
            },
            {
                "id": "prod-book-ddia",
                "store_id": "store-books",
                "title": "Designing Data-Intensive Applications",
                "description": "Tratado essencial e aprofundado sobre sistemas distribuídos, armazenamento confiável e escalabilidade.",
                "price": 219.00,
                "stock_quantity": 12,
                "category": "Sistemas Distribuídos",
                "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PARTE I — FUNDAMENTOS DE SISTEMAS DE DADOS\n\n"
                    "Aplicações orientadas a dados continuam desafiando os limites do que é possível na computação moderna. "
                    "Três preocupações fundamentais sustentam a maior parte dos sistemas de software:\n\n"
                    "1. Confiabilidade (Reliability): O sistema deve continuar funcionando corretamente mesmo quando falhas de hardware ou software ocorrem.\n"
                    "2. Escalabilidade (Scalability): O sistema deve apresentar mecanismos razoáveis para lidar com o crescimento da carga de trabalho.\n"
                    "3. Manutenibilidade (Maintainability): Diferentes pessoas devem conseguir trabalhar produtivamente no sistema ao longo dos anos."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-1449373320"},
                    {"name": "Autor", "value": "Martin Kleppmann"},
                    {"name": "Editora", "value": "O'Reilly Media"},
                    {"name": "Gênero Literário", "value": "Bancos de Dados e Arquitetura"},
                    {"name": "Edição", "value": "1ª Edição"},
                ],
            },
            {
                "id": "prod-book-mochileiro",
                "store_id": "store-books",
                "title": "O Guia do Mochileiro das Galáxias",
                "description": "Clássico hilário da ficção científica britânica sobre as aventuras cósmicas de Arthur Dent e Ford Prefect.",
                "price": 49.90,
                "stock_quantity": 25,
                "category": "Ficção Científica",
                "image_url": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PRÓLOGO\n\n"
                    "Longe, nas paragens não mapeadas da ponta mais brega do Braço Ocidental da Galáxia, há um sol amarelo e esquecido.\n\n"
                    "Orbitando esse sol, a uma distância de cerca de cento e cinquenta milhões de quilômetros, há um planeta verde-azulado "
                    "absolutamente insignificante, cujas formas de vida, descendentes de macacos, são tão primitivas que ainda acham relógios digitais "
                    "uma ideia muito interessante.\n\n"
                    "Este planeta tem — ou melhor, tinha — um problema: a maioria de seus habitantes passava a maior parte do tempo infeliz. "
                    "Muitas soluções foram sugeridas, mas quase todas envolviam o movimento de pedacinhos de papel verde com números impressos..."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8599296578"},
                    {"name": "Autor", "value": "Douglas Adams"},
                    {"name": "Editora", "value": "Editora Arqueiro"},
                    {"name": "Gênero Literário", "value": "Ficção Científica e Comédia"},
                    {"name": "Edição", "value": "Edição Especial Comemorativa"},
                ],
            },
            {
                "id": "prod-book-1984",
                "store_id": "store-books",
                "title": "1984 (Edição Especial Comemorativa)",
                "description": "A distopia clássica que definiu o vocabulário da vigilância estatal, censura e manipulação ideológica.",
                "price": 44.90,
                "stock_quantity": 22,
                "category": "Ficção Clássica",
                "image_url": "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PARTE 1 — CAPÍTULO 1\n\n"
                    "Era um dia frio e luminoso de abril, e os relógios batiam treze horas. Winston Smith, queixo enterrado no peito "
                    "para tentar fugir ao vento vil, esgueirou-se rapidamente pelas portas de vidro dos Edifícios da Vitória, "
                    "embora não com a rapidez necessária para impedir que uma rajada de poeira áspera entrasse com ele.\n\n"
                    "O corredor cheirava a repolho cozido e a velhos capachos de trapos. Na ponta do corredor, um pôster colorido, "
                    "grande demais para ambientes fechados, fora pregado na parede. Representava apenas um rosto enorme, com mais de um metro de largura: "
                    "o rosto de um homem de cerca de quarenta e cinco anos, de espesso bigode preto e traços rudes e atraentes. "
                    "O Grande Irmão está de olho em você."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8535914849"},
                    {"name": "Autor", "value": "George Orwell"},
                    {"name": "Editora", "value": "Companhia das Letras"},
                    {"name": "Gênero Literário", "value": "Ficção Distópica"},
                    {"name": "Edição", "value": "Edição Clássica"},
                ],
            },
            {
                "id": "prod-book-duna",
                "store_id": "store-books",
                "title": "Duna — Livro 1 (Edição de Luxo)",
                "description": "A epopeia planetária no deserto de Arrakis, misturando intriga política feudal, ecologia e misticismo.",
                "price": 79.90,
                "stock_quantity": 15,
                "category": "Ficção Científica",
                "image_url": "https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "LIVRO PRIMEIRO — DUNA\n\n"
                    "No início de todas as coisas, é preciso ter o cuidado de estabelecer os equilíbrios mais delicados. "
                    "Isso sabe toda irmã Bene Gesserit.\n\n"
                    "Assim, ao começar o estudo sobre a vida de Muad'Dib, cuide primeiro de situá-lo em seu próprio tempo: nascido no 57º ano "
                    "do Imperador Padixá, Shaddam IV. E cuide principalmente de situá-lo em seu próprio planeta: o planeta Arrakis. "
                    "Não se deixe enganar pelo fato de ele ter nascido em Caladan e ter vivido seus primeiros quinze anos ali. "
                    "Arrakis, o planeta conhecido como Duna, é para sempre o seu lugar."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8576573135"},
                    {"name": "Autor", "value": "Frank Herbert"},
                    {"name": "Editora", "value": "Editora Aleph"},
                    {"name": "Gênero Literário", "value": "Space Opera e Ficção Científica"},
                    {"name": "Edição", "value": "Edição Ilustrada em Capa Dura"},
                ],
            },
            {
                "id": "prod-book-senhor-aneis",
                "store_id": "store-books",
                "title": "O Senhor dos Anéis: A Sociedade do Anel",
                "description": "O início da jornada definitiva pela Terra-média para destruir o Um Anel nas chamas da Montanha da Perdição.",
                "price": 69.90,
                "stock_quantity": 14,
                "category": "Fantasia",
                "image_url": "https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "LIVRO UM — CAPÍTULO 1: UMA FESTA MUITO ESPERADA\n\n"
                    "Quando o senhor Bilbo Bolseiro de Bolsão anunciou que em breve comemoraria seu centésimo décimo primeiro aniversário "
                    "com uma festa de magnificência especial, houve muito falatório e excitação na Vila dos Hobbits.\n\n"
                    "Bilbo era muito rico e muito excêntrico, e havia sido o assombro do Condado por sessenta anos, desde seu memorável desaparecimento "
                    "e inesperado retorno. As riquezas que ele havia trazido de suas viagens tinham se tornado uma lenda local."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8595084759"},
                    {"name": "Autor", "value": "J.R.R. Tolkien"},
                    {"name": "Editora", "value": "HarperCollins Brasil"},
                    {"name": "Gênero Literário", "value": "Alta Fantasia"},
                    {"name": "Edição", "value": "Edição Revisada"},
                ],
            },
            {
                "id": "prod-book-sapiens",
                "store_id": "store-books",
                "title": "Sapiens: Uma Breve História da Humanidade",
                "description": "Uma narrativa fascinante sobre como uma espécie insignificante de primata conquistou o domínio da Terra.",
                "price": 59.90,
                "stock_quantity": 20,
                "category": "História",
                "image_url": "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PARTE UM — A REVOLUÇÃO COGNITIVA\n\n"
                    "Cerca de 100 mil anos atrás, pelo menos seis espécies de humanos habitavam a Terra. Hoje há apenas uma. Nós: Homo sapiens.\n\n"
                    "Como nossa espécie conseguiu vencer a batalha pelo domínio do planeta? Por que nossos ancestrais caçadores-coletores "
                    "se uniram para criar cidades e reinos? A resposta é nossa capacidade única de criar e acreditar em ficções compartilhadas: "
                    "mitos, deuses, nações e dinheiro."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8525432186"},
                    {"name": "Autor", "value": "Yuval Noah Harari"},
                    {"name": "Editora", "value": "L&PM Editores"},
                    {"name": "Gênero Literário", "value": "Não-Ficção e História Geral"},
                    {"name": "Edição", "value": "1ª Edição"},
                ],
            },
            {
                "id": "prod-book-dom-casmurro",
                "store_id": "store-books",
                "title": "Dom Casmurro (Edição Crítica)",
                "description": "A obra-prima do realismo machadiano com a ambiguidade inesquecível dos olhos de ressaca de Capitu.",
                "price": 39.90,
                "stock_quantity": 30,
                "category": "Literatura Brasileira",
                "image_url": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — DO TÍTULO\n\n"
                    "Uma noite destas, vindo da cidade para o Engenho Novo, encontrei num trem da Central um rapaz aqui do bairro, "
                    "que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, "
                    "e acabou recitando-me versos.\n\n"
                    "No dia seguinte já os vizinhos me chamavam de Dom Casmurro. Casmurro não está aqui no sentido de teimoso, "
                    "mas no sentido de homem calado e metido consigo mesmo. Não achei ruim o apelido."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8572329712"},
                    {"name": "Autor", "value": "Machado de Assis"},
                    {"name": "Editora", "value": "Martin Claret"},
                    {"name": "Gênero Literário", "value": "Realismo Brasileiro"},
                    {"name": "Edição", "value": "Edição Crítica de Bolso"},
                ],
            },
            {
                "id": "prod-book-refactoring",
                "store_id": "store-books",
                "title": "Refactoring: Improving the Design of Existing Code",
                "description": "Catálogo indispensável de técnicas comprovadas para melhorar a arquitetura e manutenibilidade de bases de código.",
                "price": 199.90,
                "stock_quantity": 11,
                "category": "Engenharia de Software",
                "image_url": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — REFATORAÇÃO: O PRIMEIRO EXEMPLO\n\n"
                    "Se você estiver tentando aprender refatoração, comece por um exemplo prático. "
                    "Quando você tiver que adicionar uma funcionalidade a um programa cujo código não está estruturado de forma conveniente, "
                    "primeiro refatore o código para tornar fácil adicionar a funcionalidade, e depois a adicione.\n\n"
                    "Antes de começar a refatorar, verifique se você possui um conjunto sólido de testes automatizados. "
                    "Esses testes devem ser autoverificáveis."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-0134757599"},
                    {"name": "Autor", "value": "Martin Fowler"},
                    {"name": "Editora", "value": "Addison-Wesley Professional"},
                    {"name": "Gênero Literário", "value": "Arquitetura e Refatoração de Software"},
                    {"name": "Edição", "value": "2ª Edição"},
                ],
            },
            {
                "id": "prod-book-ddd",
                "store_id": "store-books",
                "title": "Domain-Driven Design: Atacando Complexidades no Software",
                "description": "O livro seminal que introduziu a linguagem ubíqua, bounded contexts e modelos de domínio ricos.",
                "price": 159.90,
                "stock_quantity": 13,
                "category": "Engenharia de Software",
                "image_url": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PARTE I — COLOCANDO O MODELO DE DOMÍNIO PARA FUNCIONAR\n\n"
                    "O coração do software reside na sua capacidade de resolver problemas relacionados ao domínio para seus usuários. "
                    "Para criar um software que atenda a necessidades complexas, os desenvolvedores devem mergulhar no conhecimento do domínio.\n\n"
                    "A linguagem ubíqua (Ubiquitous Language) é a base de comunicação compartilhada rigorosamente entre especialistas "
                    "de negócio e a equipe de desenvolvimento de software."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8550800653"},
                    {"name": "Autor", "value": "Eric Evans"},
                    {"name": "Editora", "value": "Alta Books"},
                    {"name": "Gênero Literário", "value": "Arquitetura de Software"},
                    {"name": "Edição", "value": "1ª Edição em Português"},
                ],
            },
            {
                "id": "prod-book-metamorfose",
                "store_id": "store-books",
                "title": "A Metamorfose",
                "description": "A narrativa kafkiana sobre Gregor Samsa e sua súbita transformação em um inseto monstruoso.",
                "price": 29.90,
                "stock_quantity": 28,
                "category": "Literatura Clássica",
                "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1\n\n"
                    "Quando Gregor Samsa despertou certa manhã de sonhos intranquilos, viu-se em sua cama metamorfoseado num inseto monstruoso. "
                    "Estava deitado sobre o dorso duro como uma couraça e, se levantava um pouco a cabeça, via seu ventre abaulado, castanho, "
                    "dividido por arcos rígidos.\n\n"
                    "— O que aconteceu comigo? — pensou. Não era um sonho. Seu quarto, um autêntico quarto humano, apenas um pouco pequeno demais, "
                    "repousava tranquilamente entre as quatro paredes bem conhecidas."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8572328227"},
                    {"name": "Autor", "value": "Franz Kafka"},
                    {"name": "Editora", "value": "Companhia das Letras"},
                    {"name": "Gênero Literário", "value": "Ficção Existencialista"},
                    {"name": "Edição", "value": "Edição com Posfácio"},
                ],
            },
            {
                "id": "prod-book-crime-castigo",
                "store_id": "store-books",
                "title": "Crime e Castigo (Tradução Direta)",
                "description": "O conflito psicológico e moral de Raskólnikov na São Petersburgo do século XIX.",
                "price": 69.90,
                "stock_quantity": 16,
                "category": "Literatura Clássica",
                "image_url": "https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PARTE PRIMEIRA — CAPÍTULO 1\n\n"
                    "No início de julho, por uma tarde extraordinariamente quente, um jovem saiu do cubículo que sublocava na travessa de S., "
                    "foi para a rua e dirigiu-se lentamente, como que indeciso, para a ponte K.\n\n"
                    "Ele conseguira evitar o encontro com a senhoria na escada. Seu cubículo ficava debaixo do próprio telhado de um alto prédio "
                    "de cinco andares e lembrava mais um armário do que um aposento."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8573262087"},
                    {"name": "Autor", "value": "Fiódor Dostoiévski"},
                    {"name": "Editora", "value": "Editora 34"},
                    {"name": "Gênero Literário", "value": "Romance Psicológico Russo"},
                    {"name": "Edição", "value": "Edição Traduzida do Russo"},
                ],
            },
            {
                "id": "prod-book-breve-tempo",
                "store_id": "store-books",
                "title": "Uma Breve História do Tempo",
                "description": "Da teoria do Big Bang aos buracos negros, uma exploração dos limites da física e do cosmos.",
                "price": 49.90,
                "stock_quantity": 19,
                "category": "Ciência e Filosofia",
                "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — NOSSA IMAGEM DO UNIVERSO\n\n"
                    "Um cientista famoso deu uma palestra pública sobre astronomia. Ele descreveu como a Terra orbita o Sol "
                    "e como o Sol, por sua vez, orbita o centro de uma vasta coleção de estrelas chamada nossa galáxia.\n\n"
                    "No final da palestra, uma senhora idosa levantou-se no fundo da sala e disse: 'O que você nos disse não passa de bobagem. "
                    "O mundo é na verdade um prato plano apoiado no lombo de uma tartaruga gigante.'\n"
                    "O cientista sorriu com ar de superioridade antes de responder: 'E onde a tartaruga está apoiada?'\n"
                    "'Você é muito esperto, meu jovem', disse a velha senhora. 'Mas são tartarugas até o fim!'"
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8580576467"},
                    {"name": "Autor", "value": "Stephen Hawking"},
                    {"name": "Editora", "value": "Editora Intrínseca"},
                    {"name": "Gênero Literário", "value": "Divulgação Científica e Cosmologia"},
                    {"name": "Edição", "value": "Edição Revista e Atualizada"},
                ],
            },
            {
                "id": "prod-book-republica",
                "store_id": "store-books",
                "title": "A República (Tradução e Notas)",
                "description": "O diálogo platônico fundamental sobre a justiça, a cidade ideal e a célebre alegoria da caverna.",
                "price": 42.90,
                "stock_quantity": 24,
                "category": "Ciência e Filosofia",
                "image_url": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "LIVRO VII — A ALEGORIA DA CAVERNA\n\n"
                    "— Agora — disse eu —, compara a nossa natureza, no que diz respeito à educação e à falta dela, à seguinte experiência.\n\n"
                    "Imagina homens numa morada subterrânea em forma de caverna, com uma entrada aberta para a luz em toda a sua largura. "
                    "Estão lá dentro desde a infância, com as pernas e o pescoço acorrentados, de modo que permanecem no mesmo lugar "
                    "e só conseguem olhar para a frente, impedidos de voltar a cabeça por causa dos grilhões.\n\n"
                    "A luz que lhes chega vem de um fogo aceso a uma certa distância, atrás e no alto; entre o fogo e os prisioneiros, "
                    "passa um caminho elevado ao longo do qual foi erguido um muro semelhante aos biombos que os titeriteiros usam."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8572327749"},
                    {"name": "Autor", "value": "Platão"},
                    {"name": "Editora", "value": "Edipro"},
                    {"name": "Gênero Literário", "value": "Filosofia Clássica"},
                    {"name": "Edição", "value": "Edição Integral Bilíngue"},
                ],
            },
            {
                "id": "prod-book-memorias-postumas",
                "store_id": "store-books",
                "title": "Memórias Póstumas de Brás Cubas",
                "description": "Narrado do além-túmulo, o romance que inaugurou o Realismo no Brasil com ironia fulgurante.",
                "price": 36.90,
                "stock_quantity": 26,
                "category": "Literatura Brasileira",
                "image_url": "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "AO LEITOR\n\n"
                    "Que Stendhal confessasse haver escrito um de seus livros para cem leitores, coisa é que admira e consterna. "
                    "O que não admira, nem provavelmente consternará, é se este outro livro não tiver os cem leitores de Stendhal, "
                    "nem cinquenta, nem vinte e, quando muito, dez. Dez? Talvez cinco.\n\n"
                    "Trata-se de uma obra difusa, na qual eu, Brás Cubas, se adotei a forma livre de um Sterne ou de um Xavier de Maistre, "
                    "não sei se lhe meti algumas rabugens de pessimismo. Escrito com a pena da galhofa e a tinta da melancolia."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8535924763"},
                    {"name": "Autor", "value": "Machado de Assis"},
                    {"name": "Editora", "value": "Companhia das Letras"},
                    {"name": "Gênero Literário", "value": "Realismo Brasileiro"},
                    {"name": "Edição", "value": "Edição de Bolso de Luxo"},
                ],
            },
            {
                "id": "prod-book-algoritmos-cormen",
                "store_id": "store-books",
                "title": "Algoritmos: Teoria e Prática",
                "description": "A referência universal e rigorosa sobre estruturas de dados, complexidade computacional e análise de algoritmos.",
                "price": 249.00,
                "stock_quantity": 8,
                "category": "Computação",
                "image_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — O PAPEL DOS ALGORITMOS NA COMPUTAÇÃO\n\n"
                    "O que são algoritmos? Informalmente, um algoritmo é qualquer procedimento computacional bem definido que toma algum valor, "
                    "ou conjunto de valores, como entrada e produz algum valor, ou conjunto de valores, como saída.\n\n"
                    "Podemos também ver um algoritmo como uma ferramenta para resolver um problema computacional bem especificado. "
                    "A declaração do problema especifica em termos gerais a relação desejada entre entrada e saída."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8535236996"},
                    {"name": "Autor", "value": "Thomas H. Cormen et al."},
                    {"name": "Editora", "value": "GEN LTC"},
                    {"name": "Gênero Literário", "value": "Ciência da Computação e Algoritmos"},
                    {"name": "Edição", "value": "3ª Edição"},
                ],
            },
            {
                "id": "prod-book-neuromancer",
                "store_id": "store-books",
                "title": "Neuromancer (Trilogia Sprawl Vol. 1)",
                "description": "O romance cyberpunk seminal que cunhou o termo ciberespaço e inspirou gerações da cultura digital.",
                "price": 52.90,
                "stock_quantity": 17,
                "category": "Ficção Científica",
                "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — CHIVA SOMBRIO\n\n"
                    "O céu sobre o porto tinha cor de televisão num canal fora do ar.\n\n"
                    "— Não é que eu esteja usando — disse Case a alguém que tentava lhe vender drogas no bar Chatsubo. — Meu corpo desenvolveu "
                    "uma tremenda rejeição espontânea.\n\n"
                    "O Chatsubo era um bar para expatriados profissionais; você podia beber ali uma semana sem ouvir duas palavras em japonês. "
                    "O barman chamava-se Ratz e tinha uma prótese russa em lugar do braço direito."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8576573005"},
                    {"name": "Autor", "value": "William Gibson"},
                    {"name": "Editora", "value": "Editora Aleph"},
                    {"name": "Gênero Literário", "value": "Cyberpunk e Ficção Científica"},
                    {"name": "Edição", "value": "Edição Comemorativa 30 Anos"},
                ],
            },
            {
                "id": "prod-book-fundacao",
                "store_id": "store-books",
                "title": "Fundação (Trilogia da Fundação Vol. 1)",
                "description": "Hari Seldon e a psicohistória calculando a queda do Império Galáctico e o renascimento da civilização.",
                "price": 58.90,
                "stock_quantity": 14,
                "category": "Ficção Científica",
                "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PARTE I — OS PSICOHISTORIADORES\n\n"
                    "Hari Seldon... nascido no 11.988º ano da Era Galáctica; falecido em 12.069. "
                    "Os detalhes de sua vida pública são conhecidos através de seus escritos biográficos.\n\n"
                    "A psicohistória é o ramo da matemática que trata das reações de aglomerados humanos a estímulos econômicos e sociais fixos. "
                    "Não pode prever o comportamento de um indivíduo, assim como a teoria cinética dos gases não prevê o movimento de uma molécula individual; "
                    "mas prevê o destino de trilhões de seres humanos com precisão estatística."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8576570745"},
                    {"name": "Autor", "value": "Isaac Asimov"},
                    {"name": "Editora", "value": "Editora Aleph"},
                    {"name": "Gênero Literário", "value": "Ficção Científica Clássica"},
                    {"name": "Edição", "value": "Edição Especial Capa Dura"},
                ],
            },
            {
                "id": "prod-book-ensaio-cegueira",
                "store_id": "store-books",
                "title": "Ensaio sobre a Cegueira",
                "description": "A parábola visceral sobre uma epidemia de cegueira branca que desvela as fragilidades da civilização humana.",
                "price": 56.90,
                "stock_quantity": 15,
                "category": "Literatura Clássica",
                "image_url": "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1\n\n"
                    "O disco amarelo acendeu-se. Dois dos automóveis da frente aceleraram antes que o sinal vermelho aparecesse. "
                    "Na passagem de peões surgiu o desenho do homem verde. A multidão avançou.\n\n"
                    "De súbito, no meio da fila, um carro parou. Não arrancou quando a luz mudou. "
                    "O homem lá dentro debatia-se ao volante, gesticulava em pânico. Quando outros condutores bateram no vidro, "
                    "ele abriu a porta em desespero e gritou: 'Estou cego! Não vejo nada!'"
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8571648982"},
                    {"name": "Autor", "value": "José Saramago"},
                    {"name": "Editora", "value": "Companhia das Letras"},
                    {"name": "Gênero Literário", "value": "Ficção Literária e Parábola Social"},
                    {"name": "Edição", "value": "Edição Especial Prêmio Nobel"},
                ],
            },
            {
                "id": "prod-book-grande-sertao",
                "store_id": "store-books",
                "title": "Grande Sertão: Veredas (Edição Comentada)",
                "description": "Riobaldo narra suas andanças como jagunço pelo sertão mineiro e seu amor profundo por Diadorim.",
                "price": 74.90,
                "stock_quantity": 12,
                "category": "Literatura Brasileira",
                "image_url": "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "INÍCIO\n\n"
                    "Nonada. Tiros que o senhor ouviu foram de briga de homem não, Deus esteja. "
                    "Alvejei mira em árvore, no quintal, no baixo do córrego. Por meu acerto.\n\n"
                    "O diabo não há! É o que eu digo, se for. Existe é homem humano. Travessia. "
                    "O sertão está em toda parte. O sertão é do tamanho do mundo. O sertão é dentro da gente."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8535931983"},
                    {"name": "Autor", "value": "João Guimarães Rosa"},
                    {"name": "Editora", "value": "Companhia das Letras"},
                    {"name": "Gênero Literário", "value": "Modernismo Brasileiro"},
                    {"name": "Edição", "value": "Edição Crítica Definitiva"},
                ],
            },
            {
                "id": "prod-book-hobbit",
                "store_id": "store-books",
                "title": "O Hobbit (Edição Ilustrada em Capa Dura)",
                "description": "Bilbo Bolseiro é arrastado para uma expedição com treze anões e o mago Gandalf para recuperar o tesouro de Erebor.",
                "price": 54.90,
                "stock_quantity": 21,
                "category": "Fantasia",
                "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1 — UMA FESTA INESPERADA\n\n"
                    "Num buraco no chão vivia um hobbit. Não um buraco nojento, sujo, úmido, cheio de restos de minhocas e com cheiro de lodo, "
                    "nem tampouco um buraco seco, de areia, sem lugar onde sentar ou o que comer: era um buraco de hobbit, "
                    "e isso significa conforto.\n\n"
                    "Tinha uma porta perfeitamente redonda como uma escotilha, pintada de verde, com uma maçaneta de latão amarelo bem no centro."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8595084742"},
                    {"name": "Autor", "value": "J.R.R. Tolkien"},
                    {"name": "Editora", "value": "HarperCollins Brasil"},
                    {"name": "Gênero Literário", "value": "Fantasia Infantojuvenil e Aventura"},
                    {"name": "Edição", "value": "Edição de Colecionador"},
                ],
            },
            {
                "id": "prod-book-principia",
                "store_id": "store-books",
                "title": "Princípios Matemáticos da Filosofia Natural",
                "description": "O tratado de Isaac Newton que formulou as leis do movimento e a lei da gravitação universal.",
                "price": 94.90,
                "stock_quantity": 9,
                "category": "Ciência e Filosofia",
                "image_url": "https://images.unsplash.com/photo-1532012164546-f432f2e3ddb5?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "AXIOMAS OU LEIS DO MOVIMENTO\n\n"
                    "LEI I: Todo corpo continua em seu estado de repouso ou de movimento uniforme em linha reta, "
                    "a menos que seja compelido a mudar esse estado por forças nele impressas.\n\n"
                    "LEI II: A mudança de movimento é proporcional à força motriz impressa, e é produzida na direção "
                    "da linha reta na qual aquela força é impressa.\n\n"
                    "LEI III: A toda ação há sempre uma reação oposta e de igual intensidade; ou, as ações mútuas de dois corpos "
                    "um sobre o outro são sempre iguais e dirigidas a partes opostas."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8531410406"},
                    {"name": "Autor", "value": "Isaac Newton"},
                    {"name": "Editora", "value": "Edusp"},
                    {"name": "Gênero Literário", "value": "Física Clássica e História da Ciência"},
                    {"name": "Edição", "value": "Edição Fac-similar Comentada"},
                ],
            },
            {
                "id": "prod-book-pequeno-principe",
                "store_id": "store-books",
                "title": "O Pequeno Príncipe (Edição Especial)",
                "description": "A comovente narrativa lírica e filosófica sobre a inocência, a amizade e o essencial invisível aos olhos.",
                "price": 34.90,
                "stock_quantity": 35,
                "category": "Literatura Clássica",
                "image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "CAPÍTULO 1\n\n"
                    "Certa vez, quando eu tinha seis anos, vi num livro sobre a Floresta Virgem uma gravura magnífica. "
                    "Representava uma serpente jiboia engolindo uma fera.\n\n"
                    "Refleti muito sobre as aventuras da selva e consegui, com um lápis de cor, fazer meu primeiro desenho. "
                    "Mostrei minha obra-prima às pessoas grandes e perguntei se meu desenho lhes dava medo.\n"
                    "Elas me responderam: 'Por que um chapéu daria medo?'\n"
                    "Meu desenho não representava um chapéu. Representava uma jiboia digerindo um elefante."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8522031443"},
                    {"name": "Autor", "value": "Antoine de Saint-Exupéry"},
                    {"name": "Editora", "value": "Agir"},
                    {"name": "Gênero Literário", "value": "Fábula e Filosofia Poética"},
                    {"name": "Edição", "value": "Edição com Aquarelas Originais"},
                ],
            },
            {
                "id": "prod-book-esgotado",
                "store_id": "store-books",
                "title": "O Nome da Rosa (Edição Esgotada de Colecionador)",
                "description": "Mistério e erudição medieval em uma abadia beneditina no século XIV. Edição fora de estoque.",
                "price": 89.90,
                "stock_quantity": 0,
                "category": "Literatura Clássica",
                "image_url": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
                "preview_content": (
                    "PRÓLOGO\n\n"
                    "No princípio era o Verbo e o Verbo estava junto a Deus e o Verbo era Deus. Ele estava no princípio junto a Deus.\n\n"
                    "Já próximo ao fim de minha vida de pecador, encanecido pela velhice e prestes a me dissolver no abismo sem fundo "
                    "da divindade silenciosa, preparo-me para deixar testemunho na folha de pergaminho dos fatos admiráveis e terríveis "
                    "a que me foi dado assistir na minha juventude..."
                ),
                "attributes": [
                    {"name": "ISBN", "value": "978-8501099838"},
                    {"name": "Autor", "value": "Umberto Eco"},
                    {"name": "Editora", "value": "Editora Record"},
                    {"name": "Gênero Literário", "value": "Romance Histórico e Semiótica"},
                    {"name": "Edição", "value": "Edição Comemorativa 40 Anos"},
                ],
            },
        ]

        for p_data in books_products:
            prod = session.query(Product).filter(Product.id == p_data["id"]).first()
            if not prod:
                prod = Product(
                    id=p_data["id"],
                    store_id=p_data["store_id"],
                    title=p_data["title"],
                    description=p_data["description"],
                    price=p_data["price"],
                    stock_quantity=p_data["stock_quantity"],
                    category=p_data["category"],
                    image_url=p_data["image_url"],
                    preview_content=p_data.get("preview_content"),
                    is_active=True,
                )
                session.add(prod)
                session.flush()
            else:
                prod.title = p_data["title"]
                prod.description = p_data["description"]
                prod.price = p_data["price"]
                prod.stock_quantity = p_data["stock_quantity"]
                prod.category = p_data["category"]
                prod.image_url = p_data["image_url"]
                prod.preview_content = p_data.get("preview_content")

            session.query(ProductAttribute).filter(ProductAttribute.product_id == prod.id).delete()
            for attr in p_data["attributes"]:
                session.add(ProductAttribute(product_id=prod.id, name=attr["name"], value=attr["value"]))

        session.commit()
        print("✓ Catálogos dos 3 segmentos derivados povoados com 25 produtos cada (total 75 produtos).")


def seed_demo_interactions():
    """Popula interações comportamentais preliminares para alimentar estatísticas de recomendação."""
    init_rec_db()
    with RecSessionFactory() as session:
        # Insere interações de demonstração caso não existam
        existing = session.query(UserInteraction).count()
        if existing < 10:
            demo_events = [
                # Vitrine Moda
                {"store_id": "store-fashion", "user_id": None, "product_id": "prod-moda-polo", "category": "Camisas", "event_type": "VIEW", "ref": "seed-view-1"},
                {"store_id": "store-fashion", "user_id": None, "product_id": "prod-moda-polo", "category": "Camisas", "event_type": "VIEW", "ref": "seed-view-2"},
                {"store_id": "store-fashion", "user_id": None, "product_id": "prod-moda-jaqueta", "category": "Jaquetas", "event_type": "VIEW", "ref": "seed-view-3"},
                {"store_id": "store-fashion", "user_id": None, "product_id": "prod-moda-vestido", "category": "Vestidos", "event_type": "VIEW", "ref": "seed-view-4"},
                # Vitrine Tech
                {"store_id": "store-tech", "user_id": None, "product_id": "prod-tech-dell-xps", "category": "Notebooks", "event_type": "VIEW", "ref": "seed-view-5"},
                {"store_id": "store-tech", "user_id": None, "product_id": "prod-tech-dell-xps", "category": "Notebooks", "event_type": "VIEW", "ref": "seed-view-6"},
                {"store_id": "store-tech", "user_id": None, "product_id": "prod-tech-monitor-34", "category": "Monitores", "event_type": "VIEW", "ref": "seed-view-7"},
                {"store_id": "store-tech", "user_id": None, "product_id": "prod-tech-macbook-pro", "category": "Notebooks", "event_type": "VIEW", "ref": "seed-view-8"},
                # Vitrine Books
                {"store_id": "store-books", "user_id": None, "product_id": "prod-book-spl", "category": "Engenharia de Software", "event_type": "VIEW", "ref": "seed-view-9"},
                {"store_id": "store-books", "user_id": None, "product_id": "prod-book-spl", "category": "Engenharia de Software", "event_type": "VIEW", "ref": "seed-view-10"},
                {"store_id": "store-books", "user_id": None, "product_id": "prod-book-clean-code", "category": "Computação", "event_type": "VIEW", "ref": "seed-view-11"},
                {"store_id": "store-books", "user_id": None, "product_id": "prod-book-1984", "category": "Ficção Clássica", "event_type": "VIEW", "ref": "seed-view-12"},
            ]
            for ev in demo_events:
                session.add(
                    UserInteraction(
                        store_id=ev["store_id"],
                        user_id=ev["user_id"],
                        product_id=ev["product_id"],
                        category=ev["category"],
                        event_type=ev["event_type"],
                        reference_id=ev["ref"],
                    )
                )
            session.commit()
            print("✓ Interações demonstrativas preliminares sincronizadas.")


if __name__ == "__main__":
    print("Iniciando carga e sincronização da Linha de Produto de Software VitrineFlex...")
    seed_stores_and_manifests()
    seed_catalog_products()
    seed_demo_interactions()
    print("Carga e derivação dos catálogos concluídas com êxito!")
