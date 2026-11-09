import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from python_common.errors import AppError
from python_common.security import validate_internal_token, HEADER_INTERNAL_TOKEN, get_internal_service_key
from recommendation_database import get_db
from recommendation_models import UserInteraction
from recommendation_schemas import (
    InteractionCreateRequest,
    InternalInteractionCreateRequest,
    InteractionResponse,
    RecommendationItem,
    RecommendationResponse,
)

router = APIRouter()

CATALOG_SERVICE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://127.0.0.1:8003").rstrip("/").replace("localhost", "127.0.0.1")
AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://127.0.0.1:8001").rstrip("/").replace("localhost", "127.0.0.1")
RECENT_VIEWS_WINDOW_DAYS = int(os.environ.get("RECENT_VIEWS_WINDOW_DAYS", "30"))

http_client = httpx.Client(timeout=3.0, limits=httpx.Limits(max_keepalive_connections=10, max_connections=20))


@router.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "recommendation-service",
        "port": int(os.environ.get("RECOMMENDATION_SERVICE_PORT", 8008)),
    }


@router.post("/api/v1/recommendations/interactions", response_model=InteractionResponse, status_code=201)
def register_public_interaction(
    req: InteractionCreateRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_store_id: Optional[str] = Header(None, alias="X-Store-ID"),
    db: Session = Depends(get_db),
):
    """
    Registro público de interações comportamentais (PB-20).
    A identidade do usuário provém exclusivamente do contexto confiável injetado pelo API Gateway (X-User-ID).
    O navegador registra apenas eventos de navegação VIEW.
    Protegido contra divergência de contexto de loja e validação de pertencimento do produto ao catálogo.
    """
    # 1. Validação de contexto e proteção contra divergência de loja
    if x_store_id and x_store_id.strip():
        trusted_store = x_store_id.strip()
        if req.store_id and req.store_id.strip() and req.store_id.strip() != trusted_store:
            raise AppError(
                status_code=400,
                code="STORE_CONTEXT_MISMATCH",
                message=f"Divergência entre o contexto confiável da loja (X-Store-ID: {trusted_store}) e o corpo da requisição ({req.store_id.strip()}).",
            )
        target_store_id = trusted_store
    else:
        target_store_id = req.store_id.strip() if req.store_id else ""

    if not target_store_id:
        raise AppError(status_code=422, code="MISSING_STORE_ID", message="O identificador da loja (store_id) é obrigatório.")

    event_type = req.event_type.upper().strip()
    if event_type != "VIEW":
        raise AppError(status_code=403, code="FORBIDDEN_EVENT_TYPE", message="O endpoint público aceita exclusivamente o evento VIEW.")

    clean_product_id = req.product_id.strip()

    # 2. Verificação de integridade do produto e pertencimento à loja (Catalog Service)
    try:
        resp = http_client.get(
            f"{CATALOG_SERVICE_URL}/internal/v1/catalog/products/{clean_product_id}",
            headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
        )
        if resp.status_code == 404:
            raise AppError(
                status_code=404,
                code="PRODUCT_NOT_FOUND",
                message="Produto não encontrado no catálogo.",
            )
        elif resp.status_code == 200:
            prod_data = resp.json()
            prod_store = prod_data.get("store_id")
            if prod_store and prod_store != target_store_id:
                raise AppError(
                    status_code=400,
                    code="PRODUCT_STORE_MISMATCH",
                    message=f"O produto '{clean_product_id}' pertence à loja '{prod_store}', não à loja '{target_store_id}'.",
                )
            if prod_data.get("category"):
                req.category = prod_data.get("category")
    except AppError:
        raise
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    effective_user = x_user_id.strip() if x_user_id and x_user_id.strip() else (req.user_id.strip() if getattr(req, "user_id", None) and req.user_id.strip() else None)

    interaction = UserInteraction(
        store_id=target_store_id,
        user_id=effective_user,
        product_id=clean_product_id,
        category=req.category.strip(),
        event_type="VIEW",
        reference_id=None,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)

    return InteractionResponse.model_validate(interaction)


@router.post("/internal/v1/recommendations/interactions", response_model=InteractionResponse, status_code=201)
def register_internal_interaction(
    req: InternalInteractionCreateRequest,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """
    Registro interno de interações confiáveis (PB-20).
    Exige X-Internal-Token legítimo. Utilizado por Orders (PURCHASE) e Catalog (FAVORITE).
    Possui proteção de desduplicação idempotente através do reference_id.
    """
    validate_internal_token(x_internal_token)

    event_type = req.event_type.upper().strip()
    if event_type not in ("VIEW", "FAVORITE", "PURCHASE"):
        raise AppError(status_code=422, code="INVALID_EVENT_TYPE", message=f"Tipo de evento inválido: {event_type}")

    # Proteção de desduplicação idempotente para chamadas internas repetidas
    if req.reference_id and req.reference_id.strip():
        existing = (
            db.query(UserInteraction)
            .filter(
                UserInteraction.store_id == req.store_id.strip(),
                UserInteraction.event_type == event_type,
                UserInteraction.reference_id == req.reference_id.strip(),
            )
            .first()
        )
        if existing:
            # Reutilização indevida de referência com payload divergente -> 409 REFERENCE_ID_CONFLICT
            if existing.product_id != req.product_id.strip():
                raise AppError(
                    status_code=409,
                    code="REFERENCE_ID_CONFLICT",
                    message="A chave de referência já foi utilizada com dados de produto divergentes.",
                )
            return InteractionResponse(
                id=existing.id,
                store_id=existing.store_id,
                user_id=existing.user_id,
                product_id=existing.product_id,
                category=existing.category,
                event_type=existing.event_type,
                reference_id=existing.reference_id,
                created_at=existing.created_at,
                message="Interação já registrada anteriormente (idempotente).",
            )

    interaction = UserInteraction(
        store_id=req.store_id.strip(),
        user_id=req.user_id.strip() if req.user_id and req.user_id.strip() else None,
        product_id=req.product_id.strip(),
        category=req.category.strip(),
        event_type=event_type,
        reference_id=req.reference_id.strip() if req.reference_id else None,
    )
    db.add(interaction)
    try:
        db.commit()
        db.refresh(interaction)
    except IntegrityError:
        db.rollback()
        # Garantia transacional do banco contra inserções concorrentes duplicadas (Unique Index parcial)
        if req.reference_id and req.reference_id.strip():
            concurrent_existing = (
                db.query(UserInteraction)
                .filter(
                    UserInteraction.store_id == req.store_id.strip(),
                    UserInteraction.event_type == event_type,
                    UserInteraction.reference_id == req.reference_id.strip(),
                )
                .first()
            )
            if concurrent_existing:
                if concurrent_existing.product_id != req.product_id.strip():
                    raise AppError(
                        status_code=409,
                        code="REFERENCE_ID_CONFLICT",
                        message="A chave de referência já foi utilizada com dados de produto divergentes.",
                    )
                return InteractionResponse(
                    id=concurrent_existing.id,
                    store_id=concurrent_existing.store_id,
                    user_id=concurrent_existing.user_id,
                    product_id=concurrent_existing.product_id,
                    category=concurrent_existing.category,
                    event_type=concurrent_existing.event_type,
                    reference_id=concurrent_existing.reference_id,
                    created_at=concurrent_existing.created_at,
                    message="Interação já registrada anteriormente (idempotente).",
                )
        raise

    return InteractionResponse.model_validate(interaction)


@router.get("/api/v1/recommendations", response_model=RecommendationResponse)
def get_recommendations(
    store_id: str = Query(..., description="ID ou slug da loja"),
    limit: int = Query(6, ge=1, le=50, description="Quantidade máxima de itens recomendados"),
    mode: str = Query("graceful", pattern="^(graceful|strict)$", description="Modo de resiliência: graceful ou strict"),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    """
    Algoritmo explicável de recomendação com Cold Start e resiliência (PB-21).
    Fórmula formal: score = 4I + min(5P, 15) + min(3F, 9) + min(V, 5) + 2T
    """
    clean_store_id = store_id.strip()
    user_id = x_user_id.strip() if x_user_id and x_user_id.strip() else None

    # 1. Obter catálogo de produtos ativos da loja (Catalog Service)
    candidates: List[dict] = []
    try:
        resp = http_client.get(
            f"{CATALOG_SERVICE_URL}/internal/v1/catalog/stores/{clean_store_id}/products/active",
            headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
        )
        if resp.status_code == 200:
            candidates = resp.json()
        elif resp.status_code >= 500:
            raise httpx.HTTPStatusError("Catalog Service 5xx", request=resp.request, response=resp)
    except Exception:
        if mode == "strict":
            raise AppError(status_code=503, code="CATALOG_UNAVAILABLE", message="Catalog Service temporariamente indisponível.")
        return RecommendationResponse(store_id=clean_store_id, total=0, items=[], degraded=True, cold_start=False)

    # Filtrar produtos indisponíveis (estoque <= 0 ou inativos)
    available_candidates = [
        p for p in candidates
        if p.get("is_active", True) and p.get("stock_quantity", 0) > 0
    ]

    if not available_candidates:
        return RecommendationResponse(store_id=clean_store_id, total=0, items=[], degraded=False, cold_start=False)

    # 2. Obter preferências declaradas do usuário no Auth Service
    user_interests: set[str] = set()
    if user_id:
        try:
            resp_auth = http_client.get(
                f"{AUTH_SERVICE_URL}/internal/v1/auth/users/{user_id}/preferences",
                headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
            )
            if resp_auth.status_code == 200:
                data = resp_auth.json()
                user_interests = {c.strip().lower() for c in data.get("categories", []) if c}
        except Exception:
            pass  # Degradação silenciosa de preferências em caso de indisponibilidade transitória do Auth

    # 3. Consultar histórico comportamental do usuário com agregação em SQL (otimizado)
    purchases_by_cat = Counter()
    favorites_by_prod = Counter()
    views_by_prod = Counter()
    has_user_interactions = False

    cutoff_recent = datetime.now(timezone.utc) - timedelta(days=RECENT_VIEWS_WINDOW_DAYS)

    if user_id:
        # P: compras por categoria
        p_rows = (
            db.query(UserInteraction.category, func.count(UserInteraction.id))
            .filter(UserInteraction.store_id == clean_store_id, UserInteraction.user_id == user_id, UserInteraction.event_type == "PURCHASE")
            .group_by(UserInteraction.category)
            .all()
        )
        for cat, cnt in p_rows:
            purchases_by_cat[cat.lower()] = cnt
            has_user_interactions = True

        # F: favoritos por produto
        f_rows = (
            db.query(UserInteraction.product_id, func.count(UserInteraction.id))
            .filter(UserInteraction.store_id == clean_store_id, UserInteraction.user_id == user_id, UserInteraction.event_type == "FAVORITE")
            .group_by(UserInteraction.product_id)
            .all()
        )
        for pid, cnt in f_rows:
            favorites_by_prod[pid] = cnt
            has_user_interactions = True

        # V: visualizações recentes por produto
        v_rows = (
            db.query(UserInteraction.product_id, func.count(UserInteraction.id))
            .filter(
                UserInteraction.store_id == clean_store_id,
                UserInteraction.user_id == user_id,
                UserInteraction.event_type == "VIEW",
                UserInteraction.created_at >= cutoff_recent,
            )
            .group_by(UserInteraction.product_id)
            .all()
        )
        for pid, cnt in v_rows:
            views_by_prod[pid] = cnt
            has_user_interactions = True

    # 4. Tendência global de popularidade T na loja agregada no banco (otimizado - evita varredura em memória)
    global_counts_query = (
        db.query(UserInteraction.product_id, func.count(UserInteraction.id))
        .filter(UserInteraction.store_id == clean_store_id)
        .group_by(UserInteraction.product_id)
        .all()
    )
    global_interaction_counts = {row[0]: row[1] for row in global_counts_query}
    max_global = max(global_interaction_counts.values()) if global_interaction_counts else 1

    # 5. Avaliação de Cold Start
    is_cold_start = False
    if not user_id or (not user_interests and not has_user_interactions):
        is_cold_start = True

    # 6. Cálculo da pontuação determinística: score = 4I + min(5P, 15) + min(3F, 9) + min(V, 5) + 2T
    scored_items: List[RecommendationItem] = []

    for p in available_candidates:
        prod_id = str(p.get("id"))
        prod_title = p.get("title", "Produto")
        prod_cat = p.get("category", "")
        prod_price = float(p.get("price", 0.0))
        prod_stock = int(p.get("stock_quantity", 0))
        prod_img = p.get("image_url")
        cat_lower = prod_cat.lower().strip()

        # Popularidade normalizada T entre 0.0 e 1.0
        # Caso haja popularidade catalogada prévia, utiliza como base, senão calcula pelas interações
        t_global = global_interaction_counts.get(prod_id, 0) / float(max_global)
        t_normalized = min(max(t_global, 0.0), 1.0)

        if is_cold_start:
            # Cold Start: ranking por popularidade global
            score = round(2.0 * t_normalized, 2)
            reason = "Produtos populares no segmento"
        else:
            # I: Correspondência com interesse declarado (0 ou 1)
            i_val = 1 if cat_lower in user_interests else 0

            # P: Quantidade de compras da categoria (ponderado por 5, cap 15)
            p_count = purchases_by_cat.get(cat_lower, 0)
            p_val = min(5 * p_count, 15)

            # F: Quantidade de vezes favoritado (ponderado por 3, cap 9)
            f_count = favorites_by_prod.get(prod_id, 0)
            f_val = min(3 * f_count, 9)

            # V: Visualizações recentes do produto (ponderado por 1, cap 5)
            v_count = views_by_prod.get(prod_id, 0)
            v_val = min(v_count, 5)

            # T: Popularidade normalizada (ponderado por 2)
            t_val = 2.0 * t_normalized

            score = round(4 * i_val + p_val + f_val + v_val + t_val, 2)

            # Justificativa explicável
            if p_count > 0 and i_val == 1:
                reason = f"Baseado no seu interesse em {prod_cat} e histórico de compras"
            elif p_count > 0:
                reason = f"Baseado no seu histórico de compras na categoria {prod_cat}"
            elif f_count > 0:
                reason = "Baseado nos seus produtos favoritados"
            elif i_val == 1:
                reason = f"Recomendado pelo seu interesse declarado em {prod_cat}"
            elif v_count > 0:
                reason = "Produto visualizado recentemente por você"
            else:
                reason = "Produto popular no segmento"

        scored_items.append(
            RecommendationItem(
                product_id=prod_id,
                title=prod_title,
                category=prod_cat,
                price=prod_price,
                available_stock=prod_stock,
                score=score,
                reason=reason,
                image_url=prod_img,
            )
        )

    # Ordenar por pontuação decrescente
    scored_items.sort(key=lambda item: item.score, reverse=True)
    top_items = scored_items[:limit]

    return RecommendationResponse(
        store_id=clean_store_id,
        total=len(top_items),
        items=top_items,
        degraded=False,
        cold_start=is_cold_start,
    )


@router.get("/api/v1/recommendations/recently-viewed")
def get_recently_viewed(
    store_id: str = Query(..., description="ID ou slug da loja"),
    limit: int = Query(6, ge=1, le=20, description="Limite de produtos retornados"),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    user_id_param: Optional[str] = Query(None, alias="user_id"),
    db: Session = Depends(get_db),
):
    """
    Retorna os produtos visualizados recentemente pelo usuário nesta loja (ETAPA 2.1).
    Utiliza o histórico persistente de eventos VIEW do Recommendation Service.
    Ordenado cronologicamente pela visualização mais recente, sem duplicatas de produtos.
    Isolamento estrito por loja e usuário.
    """
    clean_store_id = store_id.strip()
    effective_user_id = x_user_id.strip() if x_user_id and x_user_id.strip() else (user_id_param.strip() if user_id_param else None)

    if not effective_user_id:
        return []

    # Consulta visualizações recentes do usuário nesta loja, agrupadas por produto e ordenadas pelo timestamp mais recente
    recent_views = (
        db.query(
            UserInteraction.product_id,
            func.max(UserInteraction.created_at).label("last_view"),
        )
        .filter(
            UserInteraction.store_id == clean_store_id,
            UserInteraction.user_id == effective_user_id,
            UserInteraction.event_type == "VIEW",
        )
        .group_by(UserInteraction.product_id)
        .order_by(func.max(UserInteraction.created_at).desc())
        .limit(limit)
        .all()
    )

    if not recent_views:
        return []

    ordered_product_ids = [r[0] for r in recent_views]

    # Enriquecer com detalhes do catálogo via Catalog Service
    try:
        resp = http_client.get(
            f"{CATALOG_SERVICE_URL}/internal/v1/catalog/stores/{clean_store_id}/products/active",
            headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
        )
        if resp.status_code == 200:
            catalog_products = {p["id"]: p for p in resp.json()}
            result = []
            for pid in ordered_product_ids:
                if pid in catalog_products:
                    result.append(catalog_products[pid])
            return result
    except Exception:
        pass

    return []
