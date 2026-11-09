import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import validate_internal_token, HEADER_INTERNAL_TOKEN, PERM_STORES_MANAGE
from python_common.admin_auth import require_permission
from lps_database import get_db
from lps_models import Store, ProductManifest, StoreAuditLog
from lps_schemas import (
    StoreCreateRequest,
    StoreUpdateRequest,
    StoreResponse,
    ManifestResponse,
    ValidationRequest,
    ValidationResponse,
    FeatureCatalogResponse,
    FeatureItem,
)
from lps_validator import (
    validate_configuration,
    REQUIRED_CORE_FEATURES,
    REQUIRED_FEATURES_BY_SEGMENT,
    KNOWN_FEATURES,
)

router = APIRouter()


def build_manifest_response(store: Store, manifest: ProductManifest) -> ManifestResponse:
    raw_features = json.loads(manifest.features_json)
    # Ensure all 18 formal features are explicitly represented as booleans
    features = {feat: bool(raw_features.get(feat, False)) for feat in sorted(KNOWN_FEATURES)}
    theme = json.loads(manifest.theme_json)
    payment_methods = json.loads(manifest.payment_methods_json)
    fulfillment_modes = json.loads(manifest.fulfillment_modes_json)

    return ManifestResponse(
        store_id=store.id,
        store_slug=store.slug,
        store_name=store.name,
        segment=store.segment,
        version=manifest.version,
        schema_version=manifest.schema_version,
        features=features,
        theme=theme,
        payment_methods=payment_methods,
        fulfillment_modes=fulfillment_modes,
        created_at=manifest.created_at,
        store_status=store.status or "ACTIVE",
    )


def build_store_response(store: Store, manifest: Optional[ProductManifest]) -> StoreResponse:
    manifest_resp = build_manifest_response(store, manifest) if manifest else None
    return StoreResponse(
        id=store.id,
        slug=store.slug,
        name=store.name,
        segment=store.segment,
        created_at=store.created_at,
        status=store.status or "ACTIVE",
        archived_at=store.archived_at,
        active_features_count=sum(1 for v in manifest_resp.features.values() if v) if manifest_resp else None,
        current_manifest=manifest_resp,
    )


def latest_active_manifest(db: Session, store_id: str) -> Optional[ProductManifest]:
    return (
        db.query(ProductManifest)
        .filter(ProductManifest.store_id == store_id, ProductManifest.is_active == True)
        .order_by(ProductManifest.version.desc())
        .first()
    )


def get_public_store_or_error(db: Session, slug: str) -> Store:
    """Resolução pública de slug: lojas arquivadas (exclusão lógica) respondem 410 STORE_ARCHIVED."""
    store = db.query(Store).filter(Store.slug == slug).first()
    if not store:
        raise AppError(status_code=404, code="STORE_NOT_FOUND", message=f"Loja '{slug}' não encontrada.")
    if (store.status or "ACTIVE") != "ACTIVE":
        raise AppError(status_code=410, code="STORE_ARCHIVED", message=f"A loja '{slug}' não está mais disponível.")
    return store


# --- Public API Routes (/api/v1/lps/*) ---


@router.post("/api/v1/lps/validate", response_model=ValidationResponse)
def validate_store_config(req: ValidationRequest):
    result = validate_configuration(
        segment=req.segment,
        features=req.features,
        payment_methods=req.payment_methods,
        fulfillment_modes=req.fulfillment_modes,
    )
    return ValidationResponse(
        is_valid=result.is_valid,
        error_code=result.error_code,
        errors=result.errors,
    )


@router.get("/api/v1/lps/features", response_model=FeatureCatalogResponse)
def get_feature_catalog():
    items: List[FeatureItem] = []

    core_desc = {
        "auth": "Autenticação e Perfis de Usuário",
        "catalog": "Catálogo de Produtos e Busca",
        "cart": "Carrinho de Compras Multiloja",
        "orders": "Gestão e Histórico de Pedidos",
        "checkout": "Checkout Idempotente com Saga",
        "recommendations": "Recomendações Personalizadas e Cold Start",
    }
    for f in sorted(REQUIRED_CORE_FEATURES):
        items.append(
            FeatureItem(
                key=f,
                name=f.capitalize(),
                group="store_core",
                description=core_desc.get(f, "Feature obrigatória do núcleo"),
                is_mandatory=True,
                segment=None,
            )
        )

    seg_desc = {
        "size_grid": ("Grade de Tamanhos", "FASHION", True, "Grade padronizada de tamanhos de vestuário"),
        "color_variants": ("Variações de Cores", "FASHION", True, "Variações cromáticas e paleta de produtos"),
        "variant_sku": ("SKU por Variante", "FASHION", True, "Gestão de código SKU individual por variante"),
        "fashion_size_guide": ("Guia de Medidas", "FASHION", False, "Tabela de medidas em centímetros para orientação de tamanhos"),
        "technical_specs": ("Especificações Técnicas", "TECH", True, "Ficha técnica e especificações de hardware"),
        "warranty_info": ("Informações de Garantia", "TECH", True, "Prazos e termos de garantia do fabricante"),
        "product_comparison": ("Comparador de Produtos", "TECH", False, "Matriz comparativa de especificações técnicas"),
        "technical_filters": ("Filtros Técnicos", "TECH", False, "Filtros dinâmicos por atributos técnicos de hardware"),
        "isbn": ("ISBN", "BOOKS", True, "Identificador canônico bibliográfico"),
        "author": ("Autor da Obra", "BOOKS", True, "Autoria e escritores catalogados"),
        "publisher": ("Editora", "BOOKS", True, "Casa editorial responsável pela publicação"),
        "literary_genre": ("Gênero Literário", "BOOKS", True, "Classificação por gênero literário"),
        "edition": ("Edição do Livro", "BOOKS", True, "Número e tipo da edição"),
        "book_preview": ("Prévia do Livro", "BOOKS", False, "Amostra demonstrativa de leitura prévia da obra"),
    }
    for key, (name, seg, mandatory, desc) in seg_desc.items():
        items.append(
            FeatureItem(
                key=key,
                name=name,
                group=f"segment_{seg.lower()}",
                description=desc,
                is_mandatory=mandatory,
                segment=seg,
            )
        )

    transversal_desc = {
        "favorites": ("Favoritos de Produtos", "Permite aos clientes favoritar produtos da loja"),
        "recently_viewed": ("Vistos Recentemente", "Histórico cronológico de produtos navegados pelo cliente"),
        "back_in_stock_alert": ("Alerta de Estoque", "Notificação de reposição quando produto esgotado voltar ao estoque"),
    }
    for key, (name, desc) in transversal_desc.items():
        items.append(
            FeatureItem(
                key=key,
                name=name,
                group="optional_transversal",
                description=desc,
                is_mandatory=False,
                segment=None,
            )
        )

    return FeatureCatalogResponse(total_features=len(items), features=items)


@router.post("/api/v1/lps/stores", response_model=StoreResponse, status_code=201)
def create_store(req: StoreCreateRequest, db: Session = Depends(get_db)):
    norm_segment = req.segment.upper()
    val_result = validate_configuration(
        segment=norm_segment,
        features=req.features,
        payment_methods=req.payment_methods,
        fulfillment_modes=req.fulfillment_modes,
    )
    if not val_result.is_valid:
        raise AppError(
            status_code=422,
            code=val_result.error_code or "INVALID_FEATURE_CONFIGURATION",
            message="Configuração de features da loja viola as regras da LPS.",
            details=val_result.errors,
        )

    existing_store = db.query(Store).filter(Store.slug == req.slug).first()
    if existing_store:
        raise AppError(
            status_code=409,
            code="SLUG_ALREADY_EXISTS",
            message=f"O slug '{req.slug}' já está em uso por outra loja da LPS.",
        )

    store = Store(
        name=req.name,
        slug=req.slug,
        segment=norm_segment,
    )
    db.add(store)
    db.flush()

    theme_dict = req.theme.model_dump() if req.theme else {}
    if not theme_dict.get("store_name"):
        theme_dict["store_name"] = store.name

    features_to_store = {feat: bool(req.features.get(feat, False)) for feat in sorted(KNOWN_FEATURES)}
    manifest = ProductManifest(
        store_id=store.id,
        version=1,
        schema_version="1.1.0",
        features_json=json.dumps(features_to_store),
        theme_json=json.dumps(theme_dict),
        payment_methods_json=json.dumps(req.payment_methods),
        fulfillment_modes_json=json.dumps(req.fulfillment_modes),
        is_active=True,
    )
    db.add(manifest)
    db.commit()
    db.refresh(store)
    db.refresh(manifest)

    return StoreResponse(
        id=store.id,
        slug=store.slug,
        name=store.name,
        segment=store.segment,
        created_at=store.created_at,
        current_manifest=build_manifest_response(store, manifest),
    )


@router.get("/api/v1/lps/stores", response_model=List[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    """Lista pública: somente lojas ACTIVE (lojas arquivadas saem da homepage, do configurador etc.)."""
    stores = db.query(Store).filter(Store.status == "ACTIVE").all()
    return [build_store_response(s, latest_active_manifest(db, s.id)) for s in stores]


@router.get("/api/v1/lps/admin/stores", response_model=List[StoreResponse])
def admin_list_stores(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Lista administrativa: todas as lojas, inclusive arquivadas. Exige permissão stores:manage."""
    require_permission(authorization, PERM_STORES_MANAGE)
    stores = db.query(Store).order_by(Store.created_at.asc()).all()
    return [build_store_response(s, latest_active_manifest(db, s.id)) for s in stores]


def _set_store_status(db: Session, store_id: str, new_status: str, authorization: Optional[str]) -> StoreResponse:
    actor = require_permission(authorization, PERM_STORES_MANAGE)
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise AppError(status_code=404, code="STORE_NOT_FOUND", message=f"Loja '{store_id}' não encontrada.")
    if (store.status or "ACTIVE") == new_status:
        raise AppError(
            status_code=409,
            code="STORE_STATUS_UNCHANGED",
            message=f"A loja já está {'ativa' if new_status == 'ACTIVE' else 'arquivada'}.",
        )
    store.status = new_status
    store.archived_at = None if new_status == "ACTIVE" else datetime.now(timezone.utc)
    store.archived_by = None if new_status == "ACTIVE" else actor["id"]
    db.add(
        StoreAuditLog(
            store_id=store.id,
            store_slug=store.slug,
            actor_id=actor["id"],
            actor_email=actor.get("email"),
            action="STORE_RESTORED" if new_status == "ACTIVE" else "STORE_ARCHIVED",
        )
    )
    db.commit()
    db.refresh(store)
    return build_store_response(store, latest_active_manifest(db, store.id))


@router.post("/api/v1/lps/admin/stores/{store_id}/archive", response_model=StoreResponse)
def archive_store(
    store_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Exclusão LÓGICA: nada é apagado (manifestos, catálogo, pedidos e financeiro são preservados)."""
    return _set_store_status(db, store_id, "ARCHIVED", authorization)


@router.post("/api/v1/lps/admin/stores/{store_id}/restore", response_model=StoreResponse)
def restore_store(
    store_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    return _set_store_status(db, store_id, "ACTIVE", authorization)


@router.get("/api/v1/lps/admin/store-audit-logs")
def list_store_audit_logs(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    require_permission(authorization, PERM_STORES_MANAGE)
    rows = db.query(StoreAuditLog).order_by(StoreAuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "store_id": r.store_id,
            "store_slug": r.store_slug,
            "actor_id": r.actor_id,
            "actor_email": r.actor_email,
            "action": r.action,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.get("/api/v1/lps/stores/{slug}/manifest", response_model=ManifestResponse)
def get_store_manifest_by_slug(slug: str, db: Session = Depends(get_db)):
    store = get_public_store_or_error(db, slug)
    latest_manifest = latest_active_manifest(db, store.id)
    if not latest_manifest:
        raise AppError(status_code=404, code="MANIFEST_NOT_FOUND", message="Manifesto ativo não encontrado para a loja.")
    return build_manifest_response(store, latest_manifest)


@router.get("/api/v1/lps/stores/{slug}", response_model=StoreResponse)
def get_store_by_slug(slug: str, db: Session = Depends(get_db)):
    store = get_public_store_or_error(db, slug)
    latest_manifest = latest_active_manifest(db, store.id)
    if not latest_manifest:
        raise AppError(status_code=404, code="MANIFEST_NOT_FOUND", message="Manifesto ativo não encontrado para a loja.")
    return build_store_response(store, latest_manifest)


@router.get("/api/v1/lps/stores/{slug}/manifests", response_model=List[ManifestResponse])
def get_store_manifest_history(slug: str, db: Session = Depends(get_db)):
    store = get_public_store_or_error(db, slug)
    manifests = (
        db.query(ProductManifest)
        .filter(ProductManifest.store_id == store.id)
        .order_by(ProductManifest.version.asc())
        .all()
    )
    return [build_manifest_response(store, m) for m in manifests]


@router.patch("/api/v1/lps/stores/{store_id}/manifest", response_model=ManifestResponse)
def update_store_manifest(store_id: str, req: StoreUpdateRequest, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise AppError(status_code=404, code="STORE_NOT_FOUND", message=f"Loja '{store_id}' não encontrada.")
    if (store.status or "ACTIVE") != "ACTIVE":
        raise AppError(
            status_code=409,
            code="STORE_ARCHIVED",
            message="Loja arquivada não pode ser reconfigurada. Reative-a primeiro.",
        )

    val_result = validate_configuration(
        segment=store.segment,
        features=req.features,
        payment_methods=req.payment_methods,
        fulfillment_modes=req.fulfillment_modes,
    )
    if not val_result.is_valid:
        raise AppError(
            status_code=422,
            code=val_result.error_code or "INVALID_FEATURE_CONFIGURATION",
            message="Nova configuração de features viola as regras da LPS.",
            details=val_result.errors,
        )

    latest = (
        db.query(ProductManifest)
        .filter(ProductManifest.store_id == store.id)
        .order_by(ProductManifest.version.desc())
        .first()
    )
    new_version = (latest.version + 1) if latest else 1

    db.query(ProductManifest).filter(ProductManifest.store_id == store.id).update({"is_active": False})

    theme_dict = req.theme.model_dump() if req.theme else (json.loads(latest.theme_json) if latest else {})
    features_to_store = {feat: bool(req.features.get(feat, False)) for feat in sorted(KNOWN_FEATURES)}
    new_manifest = ProductManifest(
        store_id=store.id,
        version=new_version,
        schema_version="1.1.0",
        features_json=json.dumps(features_to_store),
        theme_json=json.dumps(theme_dict),
        payment_methods_json=json.dumps(req.payment_methods),
        fulfillment_modes_json=json.dumps(req.fulfillment_modes),
        is_active=True,
    )
    db.add(new_manifest)
    db.commit()
    db.refresh(new_manifest)

    return build_manifest_response(store, new_manifest)


# --- Internal Service Routes (/internal/v1/lps/*) ---


@router.get("/internal/v1/lps/stores/{store_id}/manifest", response_model=ManifestResponse)
def get_internal_store_manifest(
    store_id: str,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    validate_internal_token(x_internal_token)

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        store = db.query(Store).filter(Store.slug == store_id).first()

    if not store:
        raise AppError(status_code=404, code="STORE_NOT_FOUND", message=f"Loja '{store_id}' não encontrada.")

    latest_manifest = (
        db.query(ProductManifest)
        .filter(ProductManifest.store_id == store.id, ProductManifest.is_active == True)
        .order_by(ProductManifest.version.desc())
        .first()
    )
    if not latest_manifest:
        raise AppError(status_code=404, code="MANIFEST_NOT_FOUND", message="Manifesto ativo não encontrado.")

    return build_manifest_response(store, latest_manifest)

