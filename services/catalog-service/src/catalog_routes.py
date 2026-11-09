import os
import uuid
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import update
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import (
    HEADER_USER_ID,
    HEADER_USER_ROLE,
    HEADER_INTERNAL_TOKEN,
    validate_internal_token,
    decode_access_token,
    get_internal_service_key,
)
from python_common.manifest_provider import FeatureManifestProvider
from catalog_database import get_db
from catalog_models import Product, ProductVariant, ProductAttribute, InventoryMovement, Favorite, BackInStockAlert, utc_now
from catalog_schemas import (
    ProductCreateRequest,
    ProductResponse,
    VariantResponse,
    AttributeResponse,
    InventoryDecrementRequest,
    InventoryRestoreRequest,
    InventoryOperationResponse,
    FavoriteRequest,
    FavoriteToggleRequest,
    FavoriteResponse,
    ProductComparisonResponse,
    StockAlertCreateRequest,
    StockAlertResponse,
    TechnicalFilterGroup,
    TechnicalFiltersResponse,
)

router = APIRouter()
manifest_provider = FeatureManifestProvider()


def resolve_user_id(
    x_user_id: Optional[str] = Header(None, alias=HEADER_USER_ID),
    authorization: Optional[str] = Header(None),
) -> str:
    if x_user_id:
        return x_user_id
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        claims = decode_access_token(token)
        return str(claims.get("user_id") or claims.get("sub"))
    raise AppError(status_code=401, code="UNAUTHORIZED", message="Autenticação necessária.")


def serialize_product(product: Product, db: Session) -> ProductResponse:
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
    attributes = db.query(ProductAttribute).filter(ProductAttribute.product_id == product.id).all()

    return ProductResponse(
        id=product.id,
        store_id=product.store_id,
        title=product.title,
        description=product.description,
        price=product.price,
        stock_quantity=product.stock_quantity,
        category=product.category,
        image_url=product.image_url,
        preview_content=product.preview_content,
        is_active=product.is_active,
        variants=[VariantResponse.model_validate(v) for v in variants],
        attributes=[AttributeResponse.model_validate(a) for a in attributes],
        created_at=product.created_at,
    )


# --- Public Catalog Routes (/api/v1/catalog/*) ---


@router.get("/api/v1/catalog/stores/{store_id}/products", response_model=List[ProductResponse])
def list_store_products(
    store_id: str,
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.store_id == store_id, Product.is_active == True)
    if category:
        query = query.filter(Product.category == category)
    products = query.all()
    return [serialize_product(p, db) for p in products]


@router.get("/api/v1/catalog/products/compare", response_model=ProductComparisonResponse)
def compare_products(
    store_id: str = Query(...),
    product_ids: str = Query(..., description="IDs de 2 a 4 produtos separados por vírgula"),
    db: Session = Depends(get_db),
):
    manifest_provider.assert_segment(store_id, "TECH")
    manifest_provider.assert_feature_enabled(store_id, "product_comparison")

    p_ids = [pid.strip() for pid in product_ids.split(",") if pid.strip()]
    if len(p_ids) < 2 or len(p_ids) > 4:
        raise AppError(
            status_code=422,
            code="INVALID_COMPARISON_COUNT",
            message="O comparador exige a seleção de 2 a 4 produtos.",
        )

    products = (
        db.query(Product)
        .filter(Product.id.in_(p_ids), Product.store_id == store_id)
        .all()
    )

    if len(products) != len(p_ids):
        raise AppError(
            status_code=404,
            code="PRODUCT_NOT_FOUND",
            message="Um ou mais produtos da comparação não foram encontrados nesta loja.",
        )

    return ProductComparisonResponse(
        store_id=store_id,
        total_compared=len(products),
        products=[serialize_product(p, db) for p in products],
    )


@router.get("/api/v1/catalog/stores/{store_id}/products/{product_id}", response_model=ProductResponse)
def get_store_product_detail(store_id: str, product_id: str, db: Session = Depends(get_db)):
    """Busca os detalhes de um produto validando estritamente seu pertencimento à loja."""
    product = db.query(Product).filter(Product.id == product_id, Product.store_id == store_id).first()
    if not product:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado nesta loja.")
    return serialize_product(product, db)


@router.get("/api/v1/catalog/products/{product_id}", response_model=ProductResponse)
def get_product_detail(
    product_id: str,
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.id == product_id)
    if store_id:
        query = query.filter(Product.store_id == store_id)
    product = query.first()
    if not product:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado nesta loja.")
    return serialize_product(product, db)


@router.post("/api/v1/catalog/products", response_model=ProductResponse, status_code=201)
def create_product(req: ProductCreateRequest, db: Session = Depends(get_db)):
    product = Product(
        store_id=req.store_id,
        title=req.title,
        description=req.description,
        price=req.price,
        stock_quantity=req.stock_quantity,
        category=req.category,
        image_url=req.image_url,
        is_active=True,
    )
    db.add(product)
    db.flush()

    if req.variants:
        for v in req.variants:
            variant = ProductVariant(
                product_id=product.id,
                size=v.size,
                color=v.color,
                sku=v.sku,
                stock_quantity=v.stock_quantity,
            )
            db.add(variant)

    if req.attributes:
        for a in req.attributes:
            attr = ProductAttribute(
                product_id=product.id,
                name=a.name,
                value=a.value,
            )
            db.add(attr)

    db.commit()
    db.refresh(product)
    return serialize_product(product, db)


# --- Canonical Favorites Contract (PB-13 / Homologação v1.1.3) ---


@router.get("/api/v1/catalog/favorites", response_model=List[ProductResponse])
def list_favorites(
    store_id: str = Query(...),
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Lista produtos favoritos do usuário na loja indicada (PB-13)."""
    manifest_provider.assert_feature_enabled(store_id, "favorites")

    fav_products = (
        db.query(Product)
        .join(Favorite, Favorite.product_id == Product.id)
        .filter(Favorite.store_id == store_id, Favorite.user_id == user_id)
        .all()
    )
    return [serialize_product(p, db) for p in fav_products]


def notify_recommendation_favorite(store_id: str, user_id: str, product_id: str, category: str, favorite_id: Optional[str] = None):
    recommendation_url = os.environ.get("RECOMMENDATION_SERVICE_URL", "http://localhost:8008").rstrip("/")
    ref_id = f"fav:{favorite_id}" if favorite_id else f"fav:{user_id}:{product_id}"
    try:
        with httpx.Client(timeout=1.0) as client:
            client.post(
                f"{recommendation_url}/internal/v1/recommendations/interactions",
                json={
                    "store_id": store_id,
                    "user_id": user_id,
                    "product_id": product_id,
                    "category": category,
                    "event_type": "FAVORITE",
                    "reference_id": ref_id,
                },
                headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
            )
    except Exception:
        pass


@router.post("/api/v1/catalog/favorites", response_model=FavoriteResponse, status_code=201)
def add_favorite(
    req: FavoriteRequest,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Cria vínculo de favorito com idempotência segura (PB-13 canônico)."""
    manifest_provider.assert_feature_enabled(req.store_id, "favorites")

    product = db.query(Product).filter(Product.id == req.product_id, Product.store_id == req.store_id).first()
    if not product:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado na loja indicada.")

    existing = (
        db.query(Favorite)
        .filter(
            Favorite.store_id == req.store_id,
            Favorite.user_id == user_id,
            Favorite.product_id == req.product_id,
        )
        .first()
    )
    if existing:
        return FavoriteResponse(
            id=existing.id,
            store_id=req.store_id,
            user_id=user_id,
            product_id=req.product_id,
            is_favorite=True,
            message="Produto já estava favoritado.",
        )

    fav = Favorite(store_id=req.store_id, user_id=user_id, product_id=req.product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)

    # Notifica Recommendation Service do evento FAVORITE (PB-20)
    notify_recommendation_favorite(
        store_id=req.store_id,
        user_id=user_id,
        product_id=req.product_id,
        category=product.category,
        favorite_id=fav.id,
    )

    return FavoriteResponse(
        id=fav.id,
        store_id=fav.store_id,
        user_id=fav.user_id,
        product_id=fav.product_id,
        is_favorite=True,
        message="Produto adicionado aos favoritos com sucesso.",
    )


@router.delete("/api/v1/catalog/favorites", response_model=FavoriteResponse)
def remove_favorite(
    store_id: str = Query(None),
    product_id: str = Query(None),
    body: Optional[FavoriteRequest] = None,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Remove vínculo de favorito com comportamento seguro e previsível (PB-13 canônico)."""
    target_store_id = store_id or (body.store_id if body else None)
    target_product_id = product_id or (body.product_id if body else None)

    if not target_store_id or not target_product_id:
        raise AppError(status_code=422, code="VALIDATION_ERROR", message="store_id e product_id são obrigatórios.")

    manifest_provider.assert_feature_enabled(target_store_id, "favorites")

    existing = (
        db.query(Favorite)
        .filter(
            Favorite.store_id == target_store_id,
            Favorite.user_id == user_id,
            Favorite.product_id == target_product_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()

    return FavoriteResponse(
        id=None,
        store_id=target_store_id,
        user_id=user_id,
        product_id=target_product_id,
        is_favorite=False,
        message="Produto removido dos favoritos com sucesso.",
    )


@router.post("/api/v1/catalog/favorites/toggle", response_model=FavoriteResponse)
def toggle_favorite(
    req: FavoriteToggleRequest,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Alternador de conveniência para interfaces web."""
    manifest_provider.assert_feature_enabled(req.store_id, "favorites")

    product = db.query(Product).filter(Product.id == req.product_id, Product.store_id == req.store_id).first()
    if not product:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado na loja indicada.")

    existing = (
        db.query(Favorite)
        .filter(
            Favorite.store_id == req.store_id,
            Favorite.user_id == user_id,
            Favorite.product_id == req.product_id,
        )
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return FavoriteResponse(
            id=None,
            store_id=req.store_id,
            user_id=user_id,
            product_id=req.product_id,
            is_favorite=False,
            message="Produto removido dos favoritos.",
        )
    else:
        fav = Favorite(store_id=req.store_id, user_id=user_id, product_id=req.product_id)
        db.add(fav)
        db.commit()
        db.refresh(fav)

        notify_recommendation_favorite(
            store_id=req.store_id,
            user_id=user_id,
            product_id=req.product_id,
            category=product.category,
            favorite_id=fav.id,
        )

        return FavoriteResponse(
            id=fav.id,
            store_id=fav.store_id,
            user_id=fav.user_id,
            product_id=fav.product_id,
            is_favorite=True,
            message="Produto adicionado aos favoritos.",
        )


# --- Internal Inventory Routes with Variant Support (PB-09, PB-12 / ADR-003) ---


@router.post("/internal/v1/inventory/decrement", response_model=InventoryOperationResponse)
def decrement_inventory(
    req: InventoryDecrementRequest,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """
    Baixa atômica de estoque condicional com suporte a variantes (PB-09, PB-12 / ADR-003).
    A operation_id identifica a reserva da linha do pedido.
    """
    validate_internal_token(x_internal_token)

    # 1. Idempotency Check: already decremented for this operation_id?
    existing_movement = (
        db.query(InventoryMovement)
        .filter(
            InventoryMovement.operation_id == req.operation_id,
            InventoryMovement.movement_type == "DECREMENT",
        )
        .first()
    )
    if existing_movement:
        # Check payload divergence
        if (
            existing_movement.product_id != req.product_id
            or existing_movement.variant_id != req.variant_id
            or existing_movement.quantity != req.quantity
            or existing_movement.store_id != req.store_id
        ):
            raise AppError(
                status_code=409,
                code="IDEMPOTENCY_CONFLICT",
                message="A chave operation_id já foi utilizada para decremento com parâmetros divergentes.",
            )

        if req.variant_id:
            v = db.query(ProductVariant).filter(ProductVariant.id == req.variant_id).first()
            current_stock = v.stock_quantity if v else 0
        else:
            p = db.query(Product).filter(Product.id == req.product_id).first()
            current_stock = p.stock_quantity if p else 0

        return InventoryOperationResponse(
            success=True,
            operation_id=req.operation_id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            new_stock_quantity=current_stock,
            message="Operação de baixa já realizada anteriormente (idempotente).",
        )

    # 2. Variant-specific decrement
    if req.variant_id:
        variant = (
            db.query(ProductVariant)
            .filter(ProductVariant.id == req.variant_id, ProductVariant.product_id == req.product_id)
            .first()
        )
        if not variant:
            raise AppError(status_code=404, code="VARIANT_NOT_FOUND", message="Variante não encontrada para o produto.")

        if variant.stock_quantity < req.quantity:
            raise AppError(
                status_code=409,
                code="INSUFFICIENT_STOCK",
                message=f"Estoque insuficiente na variante. Disponível: {variant.stock_quantity}, Solicitado: {req.quantity}",
                details={"available_stock": variant.stock_quantity, "requested_quantity": req.quantity},
            )

        # Atomic conditional decrement on the specific variant
        stmt_var = (
            update(ProductVariant)
            .where(
                ProductVariant.id == req.variant_id,
                ProductVariant.stock_quantity >= req.quantity,
            )
            .values(stock_quantity=ProductVariant.stock_quantity - req.quantity)
        )
        res_var = db.execute(stmt_var)
        if res_var.rowcount == 0:
            raise AppError(status_code=409, code="INSUFFICIENT_STOCK", message="Falha de concorrência no estoque da variante.")

        # Update parent product aggregated stock
        db.execute(
            update(Product)
            .where(Product.id == req.product_id, Product.store_id == req.store_id)
            .values(stock_quantity=Product.stock_quantity - req.quantity)
        )

        movement = InventoryMovement(
            store_id=req.store_id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            operation_id=req.operation_id,
            movement_type="DECREMENT",
            quantity=req.quantity,
        )
        db.add(movement)
        db.commit()

        db.refresh(variant)
        return InventoryOperationResponse(
            success=True,
            operation_id=req.operation_id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            new_stock_quantity=variant.stock_quantity,
            message="Estoque da variante baixado com sucesso de forma atômica.",
        )

    # 3. Product without variants
    stmt = (
        update(Product)
        .where(
            Product.id == req.product_id,
            Product.store_id == req.store_id,
            Product.stock_quantity >= req.quantity,
        )
        .values(stock_quantity=Product.stock_quantity - req.quantity)
    )
    result = db.execute(stmt)

    if result.rowcount == 0:
        product = db.query(Product).filter(Product.id == req.product_id, Product.store_id == req.store_id).first()
        if not product:
            raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado na loja.")
        raise AppError(
            status_code=409,
            code="INSUFFICIENT_STOCK",
            message=f"Estoque insuficiente. Disponível: {product.stock_quantity}, Solicitado: {req.quantity}",
            details={"available_stock": product.stock_quantity, "requested_quantity": req.quantity},
        )

    movement = InventoryMovement(
        store_id=req.store_id,
        product_id=req.product_id,
        variant_id=None,
        operation_id=req.operation_id,
        movement_type="DECREMENT",
        quantity=req.quantity,
    )
    db.add(movement)
    db.commit()

    updated_product = db.query(Product).filter(Product.id == req.product_id).first()
    return InventoryOperationResponse(
        success=True,
        operation_id=req.operation_id,
        product_id=req.product_id,
        variant_id=None,
        new_stock_quantity=updated_product.stock_quantity,
        message="Estoque baixado com sucesso de forma atômica.",
    )


@router.post("/internal/v1/inventory/restore", response_model=InventoryOperationResponse)
def restore_inventory(
    req: InventoryRestoreRequest,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """
    Restauração idempotente de estoque para compensação de falhas na Saga (ADR-003, PB-12).
    """
    validate_internal_token(x_internal_token)

    existing_restore = (
        db.query(InventoryMovement)
        .filter(
            InventoryMovement.operation_id == req.operation_id,
            InventoryMovement.movement_type == "RESTORE",
        )
        .first()
    )
    if existing_restore:
        # Check payload divergence
        if (
            existing_restore.product_id != req.product_id
            or existing_restore.variant_id != req.variant_id
            or existing_restore.quantity != req.quantity
            or existing_restore.store_id != req.store_id
        ):
            raise AppError(
                status_code=409,
                code="IDEMPOTENCY_CONFLICT",
                message="A chave operation_id já foi utilizada para restauração com parâmetros divergentes.",
            )

        if req.variant_id:
            v = db.query(ProductVariant).filter(ProductVariant.id == req.variant_id).first()
            current_stock = v.stock_quantity if v else 0
        else:
            p = db.query(Product).filter(Product.id == req.product_id).first()
            current_stock = p.stock_quantity if p else 0

        return InventoryOperationResponse(
            success=True,
            operation_id=req.operation_id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            new_stock_quantity=current_stock,
            message="Restauração de estoque já executada anteriormente (idempotente).",
        )

    if req.variant_id:
        variant = (
            db.query(ProductVariant)
            .filter(ProductVariant.id == req.variant_id, ProductVariant.product_id == req.product_id)
            .first()
        )
        if not variant:
            raise AppError(status_code=404, code="VARIANT_NOT_FOUND", message="Variante não encontrada.")

        db.execute(
            update(ProductVariant)
            .where(ProductVariant.id == req.variant_id)
            .values(stock_quantity=ProductVariant.stock_quantity + req.quantity)
        )
        db.execute(
            update(Product)
            .where(Product.id == req.product_id, Product.store_id == req.store_id)
            .values(stock_quantity=Product.stock_quantity + req.quantity)
        )

        movement = InventoryMovement(
            store_id=req.store_id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            operation_id=req.operation_id,
            movement_type="RESTORE",
            quantity=req.quantity,
        )
        db.add(movement)
        db.commit()
        db.refresh(variant)

        return InventoryOperationResponse(
            success=True,
            operation_id=req.operation_id,
            product_id=req.product_id,
            variant_id=req.variant_id,
            new_stock_quantity=variant.stock_quantity,
            message="Estoque da variante restaurado com sucesso (compensação idempotente).",
        )

    stmt = (
        update(Product)
        .where(
            Product.id == req.product_id,
            Product.store_id == req.store_id,
        )
        .values(stock_quantity=Product.stock_quantity + req.quantity)
    )
    result = db.execute(stmt)

    if result.rowcount == 0:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado na loja.")

    movement = InventoryMovement(
        store_id=req.store_id,
        product_id=req.product_id,
        variant_id=None,
        operation_id=req.operation_id,
        movement_type="RESTORE",
        quantity=req.quantity,
    )
    db.add(movement)
    db.commit()

    updated_product = db.query(Product).filter(Product.id == req.product_id).first()
    return InventoryOperationResponse(
        success=True,
        operation_id=req.operation_id,
        product_id=req.product_id,
        variant_id=None,
        new_stock_quantity=updated_product.stock_quantity,
        message="Estoque restaurado com sucesso (compensação idempotente).",
    )


@router.get("/internal/v1/catalog/products/{product_id}", response_model=ProductResponse)
def get_internal_product(
    product_id: str,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    validate_internal_token(x_internal_token)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado.")
    return serialize_product(product, db)


@router.get("/internal/v1/catalog/stores/{store_id}/products/active", response_model=List[ProductResponse])
def get_internal_active_products(
    store_id: str,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    validate_internal_token(x_internal_token)
    products = db.query(Product).filter(Product.store_id == store_id, Product.is_active == True).all()
    return [serialize_product(p, db) for p in products]


def notify_stock_replenishment(db: Session, store_id: str, product_id: str, variant_id: Optional[str] = None):
    """Quando o estoque de um produto ou variante se torna > 0, notifica os alertas pendentes (ETAPA 2.5)."""
    query = db.query(BackInStockAlert).filter(
        BackInStockAlert.store_id == store_id,
        BackInStockAlert.product_id == product_id,
        BackInStockAlert.status == "PENDING",
    )
    if variant_id:
        query = query.filter(BackInStockAlert.variant_id == variant_id)
    alerts = query.all()
    for alert in alerts:
        alert.status = "NOTIFIED"
        alert.notified_at = utc_now()
    db.commit()


@router.get("/api/v1/catalog/stores/{store_id}/filters", response_model=TechnicalFiltersResponse)
def get_store_technical_filters(store_id: str, db: Session = Depends(get_db)):
    """Descoberta dinâmica de filtros técnicos a partir de produtos ativos da loja (ETAPA 2.3)."""
    product_ids = [p.id for p in db.query(Product.id).filter(Product.store_id == store_id, Product.is_active == True).all()]
    if not product_ids:
        return TechnicalFiltersResponse(store_id=store_id, filters=[])

    attrs = db.query(ProductAttribute).filter(ProductAttribute.product_id.in_(product_ids)).all()
    grouped: dict[str, set[str]] = {}
    for a in attrs:
        name = a.name.strip()
        val = a.value.strip()
        if name and val:
            if name not in grouped:
                grouped[name] = set()
            grouped[name].add(val)

    filters = [
        TechnicalFilterGroup(name=k, options=sorted(list(v)))
        for k, v in grouped.items()
        if len(v) > 0
    ]
    return TechnicalFiltersResponse(store_id=store_id, filters=filters)


@router.post("/api/v1/catalog/alerts/stock", response_model=StockAlertResponse, status_code=201)
def create_stock_alert(
    req: StockAlertCreateRequest,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Inscrição em alerta de reposição de estoque (ETAPA 2.5)."""
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado.")
    if product.store_id != req.store_id:
        raise AppError(status_code=400, code="STORE_MISMATCH", message="O produto não pertence a esta loja.")

    variant_label = None
    if req.variant_id:
        variant = db.query(ProductVariant).filter(ProductVariant.id == req.variant_id, ProductVariant.product_id == req.product_id).first()
        if not variant:
            raise AppError(status_code=404, code="VARIANT_NOT_FOUND", message="Variante não encontrada.")
        if variant.stock_quantity > 0:
            raise AppError(status_code=400, code="ITEM_IN_STOCK", message="Esta variante já está disponível em estoque.")
        variant_label = f"{variant.size} - {variant.color}"
    else:
        if product.stock_quantity > 0:
            raise AppError(status_code=400, code="ITEM_IN_STOCK", message="Este produto já está disponível em estoque.")

    existing = db.query(BackInStockAlert).filter(
        BackInStockAlert.store_id == req.store_id,
        BackInStockAlert.user_id == user_id,
        BackInStockAlert.product_id == req.product_id,
        BackInStockAlert.variant_id == req.variant_id,
    ).first()

    if existing:
        if existing.status in ("CANCELLED", "NOTIFIED"):
            existing.status = "PENDING"
            existing.notified_at = None
            db.commit()
            db.refresh(existing)
        return StockAlertResponse(
            id=existing.id,
            store_id=existing.store_id,
            user_id=existing.user_id,
            product_id=existing.product_id,
            variant_id=existing.variant_id,
            status=existing.status,
            created_at=existing.created_at,
            notified_at=existing.notified_at,
            product_title=product.title,
            variant_label=variant_label,
        )

    alert = BackInStockAlert(
        store_id=req.store_id,
        user_id=user_id,
        product_id=req.product_id,
        variant_id=req.variant_id,
        status="PENDING",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return StockAlertResponse(
        id=alert.id,
        store_id=alert.store_id,
        user_id=alert.user_id,
        product_id=alert.product_id,
        variant_id=alert.variant_id,
        status=alert.status,
        created_at=alert.created_at,
        notified_at=alert.notified_at,
        product_title=product.title,
        variant_label=variant_label,
    )


@router.get("/api/v1/catalog/alerts/stock", response_model=List[StockAlertResponse])
def list_stock_alerts(
    store_id: Optional[str] = Query(None),
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Consulta os alertas de reposição de estoque do cliente autenticado."""
    query = db.query(BackInStockAlert).filter(BackInStockAlert.user_id == user_id, BackInStockAlert.status != "CANCELLED")
    if store_id:
        query = query.filter(BackInStockAlert.store_id == store_id)
    alerts = query.order_by(BackInStockAlert.created_at.desc()).all()

    result: List[StockAlertResponse] = []
    for a in alerts:
        p = db.query(Product).filter(Product.id == a.product_id).first()
        var_label = None
        if a.variant_id:
            v = db.query(ProductVariant).filter(ProductVariant.id == a.variant_id).first()
            if v:
                var_label = f"{v.size} - {v.color}"
        result.append(
            StockAlertResponse(
                id=a.id,
                store_id=a.store_id,
                user_id=a.user_id,
                product_id=a.product_id,
                variant_id=a.variant_id,
                status=a.status,
                created_at=a.created_at,
                notified_at=a.notified_at,
                product_title=p.title if p else None,
                variant_label=var_label,
            )
        )
    return result


@router.delete("/api/v1/catalog/alerts/stock/{alert_id}", status_code=204)
def cancel_stock_alert(
    alert_id: str,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Cancela uma inscrição de alerta de estoque."""
    alert = db.query(BackInStockAlert).filter(BackInStockAlert.id == alert_id, BackInStockAlert.user_id == user_id).first()
    if not alert:
        raise AppError(status_code=404, code="ALERT_NOT_FOUND", message="Alerta de estoque não encontrado.")
    alert.status = "CANCELLED"
    db.commit()
    return None


@router.post("/api/v1/catalog/products/{product_id}/replenish")
def replenish_product_stock(
    product_id: str,
    additional_stock: int = Query(..., gt=0),
    variant_id: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias=HEADER_USER_ROLE),
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Aumenta o estoque e dispara notificações de reposição para alertas pendentes.
    Protegido: requer perfil de administrador (ADMIN) ou token interno autenticado.
    """
    is_authorized = False
    if x_internal_token:
        try:
            validate_internal_token(x_internal_token)
            is_authorized = True
        except Exception:
            pass

    if not is_authorized and x_user_role and x_user_role.upper() == "ADMIN":
        is_authorized = True

    if not is_authorized and authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_access_token(authorization.split(" ")[1])
            if claims.get("role", "").upper() == "ADMIN":
                is_authorized = True
        except Exception:
            pass

    if not is_authorized:
        raise AppError(status_code=403, code="FORBIDDEN", message="Operação administrativa restrita. Autenticação de ADMIN necessária.")

    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise AppError(status_code=404, code="PRODUCT_NOT_FOUND", message="Produto não encontrado.")

    prod.stock_quantity += additional_stock
    if variant_id:
        v = db.query(ProductVariant).filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id).first()
        if not v:
            raise AppError(status_code=404, code="VARIANT_NOT_FOUND", message="Variante não encontrada.")
        v.stock_quantity += additional_stock
    db.commit()

    notify_stock_replenishment(db, prod.store_id, prod.id, variant_id)
    return {"success": True, "product_id": prod.id, "new_stock": prod.stock_quantity, "message": "Estoque reposto e alertas notificados com sucesso."}

