import os
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session
import httpx

from python_common.errors import AppError
from python_common.security import (
    decode_access_token,
    validate_internal_token,
    HEADER_INTERNAL_TOKEN,
    HEADER_USER_ID,
)
from cart_database import get_db
from cart_models import Cart, CartItem
from cart_schemas import (
    CartItemAddRequest,
    CartItemUpdateRequest,
    CartItemResponse,
    CartResponse,
    ClearCartResponse,
)

router = APIRouter()

CATALOG_SERVICE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://localhost:8003").rstrip("/")


def resolve_user_id(
    x_user_id: Optional[str] = Header(None, alias=HEADER_USER_ID),
    authorization: Optional[str] = Header(None),
) -> str:
    """Resolve o ID do usuário através do cabeçalho injetado pelo Gateway ou do Bearer JWT (ADR-008)."""
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return payload["sub"]

    raise AppError(status_code=401, code="UNAUTHORIZED", message="Autenticação obrigatória para acessar o carrinho.")


def fetch_product_from_catalog(product_id: str, store_id: str, variant_id: Optional[str] = None) -> dict:
    """Valida existência, preço, loja e estoque do produto e variante no Catalog Service."""
    url = f"{CATALOG_SERVICE_URL}/api/v1/catalog/products/{product_id}"
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(url)
            if resp.status_code == 404:
                raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message=f"Produto '{product_id}' não encontrado no catálogo.")
            if resp.status_code == 403 and "STORE_ARCHIVED" in resp.text:
                raise AppError(status_code=403, code="STORE_ARCHIVED", message="Esta loja foi arquivada e não aceita novas compras.")
            if resp.status_code != 200:
                raise AppError(status_code=502, code="CATALOG_UNAVAILABLE", message="Falha ao consultar catálogo de produtos.")
            data = resp.json()
    except httpx.RequestError:
        # Em testes locais ou falha de rede se Catalog não estiver ouvindo via HTTP
        raise AppError(status_code=503, code="CATALOG_SERVICE_UNAVAILABLE", message="Catalog Service indisponível para validação de produto.")

    if data.get("store_id") != store_id:
        raise AppError(status_code=400, code="STORE_MISMATCH", message="O produto não pertence à loja indicada.")

    if not data.get("is_active", True):
        raise AppError(status_code=400, code="PRODUCT_INACTIVE", message="O produto não está disponível para venda.")

    title = data.get("title", "")
    price = float(data.get("price", 0.0))
    stock = int(data.get("stock_quantity", 0))
    image_url = data.get("image_url")

    if variant_id:
        variants = data.get("variants", [])
        matched = next((v for v in variants if v["id"] == variant_id), None)
        if not matched:
            raise AppError(status_code=404, code="VARIANT_NOT_FOUND", message=f"Variante '{variant_id}' não encontrada para o produto.")
        var_desc = f"{matched.get('size', '')} / {matched.get('color', '')}".strip(" /")
        title = f"{title} ({var_desc})" if var_desc else title
        stock = int(matched.get("stock_quantity", 0))

    return {
        "title": title,
        "price": price,
        "stock": stock,
        "image_url": image_url,
    }


def serialize_cart(cart: Cart) -> CartResponse:
    items_resp = []
    subtotal = 0.0
    total_qty = 0

    for item in cart.items:
        item_subtotal = float(item.unit_price) * item.quantity
        subtotal += item_subtotal
        total_qty += item.quantity
        items_resp.append(
            CartItemResponse(
                id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                title=item.title,
                unit_price=float(item.unit_price),
                quantity=item.quantity,
                subtotal=round(item_subtotal, 2),
                image_url=item.image_url,
            )
        )

    return CartResponse(
        id=cart.id,
        store_id=cart.store_id,
        user_id=cart.user_id,
        items=items_resp,
        total_items=total_qty,
        subtotal=round(subtotal, 2),
    )


def get_or_create_cart(db: Session, store_id: str, user_id: str) -> Cart:
    cart = db.query(Cart).filter(Cart.store_id == store_id, Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(store_id=store_id, user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


# --- Public API Routes (/api/v1/cart/*) ---


@router.get("/health")
def health_check():
    return {"status": "UP", "service": "cart-service", "port": 8004}


@router.get("/api/v1/cart", response_model=CartResponse)
def get_user_cart(
    store_id: str = Query(..., description="ID ou slug da loja"),
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Consulta carrinho do usuário na loja indicada (PB-15)."""
    cart = get_or_create_cart(db, store_id=store_id, user_id=user_id)
    return serialize_cart(cart)


@router.post("/api/v1/cart/items", response_model=CartResponse)
def add_item_to_cart(
    req: CartItemAddRequest,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Adiciona produto/variante ao carrinho com validação no catálogo."""
    cart = get_or_create_cart(db, store_id=req.store_id, user_id=user_id)

    # Verifica se o item já está no carrinho
    existing_item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == req.product_id,
            CartItem.variant_id == req.variant_id,
        )
        .first()
    )

    requested_total_qty = req.quantity + (existing_item.quantity if existing_item else 0)

    # Valida no Catalog Service
    catalog_info = fetch_product_from_catalog(
        product_id=req.product_id,
        store_id=req.store_id,
        variant_id=req.variant_id,
    )

    if catalog_info["stock"] < requested_total_qty:
        raise AppError(
            status_code=409,
            code="INSUFFICIENT_STOCK",
            message=f"Estoque insuficiente. Disponível: {catalog_info['stock']}, Solicitado no carrinho: {requested_total_qty}",
        )

    if existing_item:
        existing_item.quantity = requested_total_qty
    else:
        new_item = CartItem(
            cart_id=cart.id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            title=catalog_info["title"],
            unit_price=catalog_info["price"],
            quantity=req.quantity,
            image_url=catalog_info["image_url"],
        )
        db.add(new_item)

    db.commit()
    db.refresh(cart)
    return serialize_cart(cart)


@router.patch("/api/v1/cart/items/{item_id}", response_model=CartResponse)
def update_cart_item_quantity(
    item_id: str,
    req: CartItemUpdateRequest,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Atualiza a quantidade de um item no carrinho."""
    item = db.query(CartItem).join(Cart).filter(CartItem.id == item_id, Cart.user_id == user_id).first()
    if not item:
        raise AppError(status_code=404, code="CART_ITEM_NOT_FOUND", message="Item não encontrado no carrinho do usuário.")

    catalog_info = fetch_product_from_catalog(
        product_id=item.product_id,
        store_id=item.cart.store_id,
        variant_id=item.variant_id,
    )

    if catalog_info["stock"] < req.quantity:
        raise AppError(
            status_code=409,
            code="INSUFFICIENT_STOCK",
            message=f"Estoque insuficiente. Disponível: {catalog_info['stock']}, Solicitado: {req.quantity}",
        )

    item.quantity = req.quantity
    db.commit()
    db.refresh(item.cart)
    return serialize_cart(item.cart)


@router.delete("/api/v1/cart/items/{item_id}", response_model=CartResponse)
def remove_cart_item(
    item_id: str,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Remove um item do carrinho."""
    item = db.query(CartItem).join(Cart).filter(CartItem.id == item_id, Cart.user_id == user_id).first()
    if not item:
        raise AppError(status_code=404, code="CART_ITEM_NOT_FOUND", message="Item não encontrado no carrinho.")

    cart = item.cart
    db.delete(item)
    db.commit()
    db.refresh(cart)
    return serialize_cart(cart)


@router.delete("/api/v1/cart", response_model=ClearCartResponse)
def clear_user_cart(
    store_id: str = Query(..., description="ID ou slug da loja"),
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Limpa todos os itens do carrinho do usuário na loja indicada."""
    cart = db.query(Cart).filter(Cart.store_id == store_id, Cart.user_id == user_id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    return ClearCartResponse(success=True, message="Carrinho esvaziado com sucesso.")


# --- Internal Service Routes (/internal/v1/cart/*) ---


@router.get("/internal/v1/cart/{store_id}/{user_id}", response_model=CartResponse)
@router.get("/internal/v1/cart/stores/{store_id}/users/{user_id}", response_model=CartResponse)
def get_cart_for_internal_service(
    store_id: str,
    user_id: str,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """Consulta interna do carrinho para checkout pelo Orders Service (Contrato Canônico PB-15)."""
    validate_internal_token(x_internal_token)
    cart = get_or_create_cart(db, store_id=store_id, user_id=user_id)
    return serialize_cart(cart)


@router.delete("/internal/v1/cart/{store_id}/{user_id}", response_model=ClearCartResponse)
@router.delete("/internal/v1/cart/stores/{store_id}/users/{user_id}", response_model=ClearCartResponse)
def clear_cart_for_internal_service(
    store_id: str,
    user_id: str,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """Limpeza do carrinho após conclusão da Saga de Checkout (Contrato Canônico PB-15)."""
    validate_internal_token(x_internal_token)
    cart = db.query(Cart).filter(Cart.store_id == store_id, Cart.user_id == user_id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    return ClearCartResponse(success=True, message="Carrinho limpo com sucesso após checkout.")
