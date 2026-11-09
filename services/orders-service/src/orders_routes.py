from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import (
    decode_access_token,
    HEADER_USER_ID,
)
from orders_database import get_db
from orders_models import Order
from orders_schemas import CheckoutRequest, CheckoutResponse, OrderResponse
from saga_orchestrator import SagaOrchestrator, serialize_order

router = APIRouter()


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

    raise AppError(status_code=401, code="UNAUTHORIZED", message="Autenticação obrigatória para acessar pedidos.")


@router.get("/health")
def health_check():
    return {"status": "UP", "service": "orders-service", "port": 8005}


@router.post("/api/v1/orders/checkout", response_model=CheckoutResponse)
def checkout(
    req: CheckoutRequest,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user_id: str = Depends(resolve_user_id),
):
    """
    Orquestra a Saga de checkout com execução exclusiva, reserva de estoque atômica,
    pagamento simulado e compensação síncrona (PB-18).
    Códigos HTTP padronizados:
    - 200 OK: Pagamento aprovado (Saga COMPLETED)
    - 202 Accepted: Pagamento pendente / timeout (PAYMENT_PENDING_CONFIRMATION)
    - 402 Payment Required: Pagamento recusado (PAYMENT_DECLINED)
    - 409 Conflict: Divergência de idempotência (IDEMPOTENCY_CONFLICT)
    """
    if not idempotency_key or not idempotency_key.strip():
        raise AppError(status_code=422, code="MISSING_IDEMPOTENCY_KEY", message="O cabeçalho Idempotency-Key é obrigatório para checkout.")

    result = SagaOrchestrator.execute_checkout(
        store_id=req.store_id,
        user_id=user_id,
        idempotency_key=idempotency_key.strip(),
        req=req,
    )

    if result.saga_status == "COMPLETED":
        response.status_code = 200
    elif result.saga_status in ("PAYMENT_PENDING_CONFIRMATION", "STARTED", "INVENTORY_RESERVED"):
        response.status_code = 202
    elif result.saga_status in ("FAILED", "COMPENSATED"):
        response.status_code = 402

    return result


@router.get("/api/v1/orders", response_model=List[OrderResponse])
def list_user_orders(
    store_id: str = Query(..., description="ID ou slug da loja"),
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Consulta o histórico de pedidos do usuário na loja ativa (PB-19)."""
    orders = (
        db.query(Order)
        .filter(Order.store_id == store_id, Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [serialize_order(o) for o in orders]


@router.get("/api/v1/orders/{order_id}", response_model=OrderResponse)
def get_order_detail(
    order_id: str,
    user_id: str = Depends(resolve_user_id),
    db: Session = Depends(get_db),
):
    """Consulta os detalhes e snapshots imutáveis de um pedido (PB-19)."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()
    if not order:
        raise AppError(status_code=404, code="ORDER_NOT_FOUND", message="Pedido não encontrado para este usuário.")

    return serialize_order(order)
