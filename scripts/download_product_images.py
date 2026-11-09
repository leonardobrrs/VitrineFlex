#!/usr/bin/env python3
"""
VitrineFlex — Download, Geração e Otimização de Imagens Locais WebP.
Garante que todos os 75 produtos (Moda, Tech, Livros) possuam arquivos WebP locais
em apps/web/public/images/products/{fashion,tech,books}/
compatíveis com build estático e futuro deploy CDN/S3.
"""

import io
import os
import re
import sys
import sqlite3
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "apps" / "web" / "public" / "images" / "products"
FASHION_DIR = PUBLIC_DIR / "fashion"
TECH_DIR = PUBLIC_DIR / "tech"
BOOKS_DIR = PUBLIC_DIR / "books"

FASHION_DIR.mkdir(parents=True, exist_ok=True)
TECH_DIR.mkdir(parents=True, exist_ok=True)
BOOKS_DIR.mkdir(parents=True, exist_ok=True)


def create_placeholder_webp(filepath: Path, title: str, category: str, segment: str):
    """Gera uma imagem WebP de fallback de alta qualidade estilizada por tema."""
    width, height = (600, 800) if segment == "fashion" else ((600, 900) if segment == "books" else (600, 600))
    
    if segment == "fashion":
        bg_color = (246, 244, 240)  # #F6F4F0
        border_color = (222, 217, 209)
        text_color = (25, 25, 24)
        tag_color = (105, 101, 95)
    elif segment == "tech":
        bg_color = (245, 246, 247)  # #F5F6F7
        border_color = (221, 225, 229)
        text_color = (21, 24, 27)
        tag_color = (21, 94, 239)
    else:  # books
        bg_color = (244, 239, 230)  # Warm paper
        border_color = (222, 210, 193)
        text_color = (33, 28, 24)
        tag_color = (116, 58, 63)

    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Borda sutil
    draw.rectangle([14, 14, width - 15, height - 15], outline=border_color, width=2)
    
    # Detalhe visual central
    center_y = height // 2 - 20
    draw.rectangle([width // 2 - 35, center_y - 35, width // 2 + 35, center_y + 35], outline=tag_color, width=2)

    # Texto do produto
    draw.text((width // 2, center_y + 50), f"[{segment.upper()}]", fill=tag_color, anchor="mm")
    draw.text((width // 2, center_y + 75), title[:30], fill=text_color, anchor="mm")
    if category:
        draw.text((width // 2, center_y + 100), category[:25], fill=tag_color, anchor="mm")

    img.save(filepath, "WEBP", quality=85)


def download_or_generate_image(url: str, filepath: Path, title: str, category: str, segment: str):
    """Baixa a imagem externa do Unsplash e converte para WebP, ou gera placeholder se falhar."""
    if filepath.exists() and filepath.stat().st_size > 500:
        return True

    success = False
    if url and url.startswith("http"):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                content = response.read()
                img = Image.open(io.BytesIO(content)).convert("RGB")
                
                # Resize mantendo proporção (largura máxima 600px)
                w, h = img.size
                if w > 600:
                    new_h = int(h * (600 / w))
                    img = img.resize((600, new_h), Image.Resampling.LANCZOS)
                
                img.save(filepath, "WEBP", quality=82, method=4)
                success = True
        except Exception:
            pass

    if not success:
        create_placeholder_webp(filepath, title, category, segment)

    return True


def run():
    db_path = BASE_DIR / "data" / "catalog.db"
    if not db_path.exists():
        print(f"Erro: {db_path} não encontrado.")
        return

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    rows = cur.execute("SELECT id, store_id, title, category, image_url FROM products").fetchall()
    conn.close()

    print(f"Carregados {len(rows)} produtos de {db_path}.")

    updates = []
    url_replacements = {}

    for prod_id, store_id, title, category, img_url in rows:
        segment = "fashion" if "fashion" in store_id else ("tech" if "tech" in store_id else "books")
        target_dir = FASHION_DIR if segment == "fashion" else (TECH_DIR if segment == "tech" else BOOKS_DIR)
        
        filename = f"{prod_id}.webp"
        filepath = target_dir / filename
        local_url = f"/images/products/{segment}/{filename}"

        download_or_generate_image(img_url, filepath, title, category or "", segment)
        updates.append((local_url, prod_id))
        if img_url and img_url.startswith("http"):
            url_replacements[img_url] = local_url

    print(f"Processamento concluído. {len(updates)} arquivos WebP verificados em {PUBLIC_DIR}.")

    # Atualiza bancos catalog.db reais
    target_dbs = [
        BASE_DIR / "data" / "catalog.db",
        BASE_DIR / "data" / "data" / "catalog.db",
    ]
    for db in target_dbs:
        if db.exists() and db.stat().st_size > 1000:
            print(f"Atualizando {db}...")
            c = sqlite3.connect(str(db))
            cu = c.cursor()
            for local_url, prod_id in updates:
                cu.execute("UPDATE products SET image_url = ? WHERE id = ?", (local_url, prod_id))
            c.commit()
            c.close()
            print(f"Banco {db} atualizado com URLs locais!")

    # Atualiza seed_demo_stores.py
    seed_file = BASE_DIR / "scripts" / "seed_demo_stores.py"
    if seed_file.exists():
        print(f"Atualizando {seed_file}...")
        with open(seed_file, "r", encoding="utf-8") as f:
            code = f.read()

        for old_url, new_url in url_replacements.items():
            code = code.replace(old_url, new_url)

        with open(seed_file, "w", encoding="utf-8") as f:
            f.write(code)
        print("Script seed_demo_stores.py atualizado para usar rotas locais WebP!")


if __name__ == "__main__":
    run()
