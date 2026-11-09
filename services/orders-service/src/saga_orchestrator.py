import hashlib
import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import httpx
from sqlalchemy import update
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import get_internal_service_key, HEADER_INTERNAL_TOKEN
from orders_database import SessionFactory
from orders_models import CheckoutOperation, Order, OrderItemSnapshot, OrderStatusHistory
from orders_schemas import CheckoutRequest, CheckoutResponse, OrderResponse, OrderItemSnapshotResponse, OrderStatusHistoryResponse

CATALOG_SERVICE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://localhost:8003").rstrip("/")
PAYMENTS_SERVICE_URL = os.environ.get("PAYMENTS_SERVICE_URL", "http://localhost:8006").rstrip("/")
SHIPPING_SERVICE_URL = os.environ.get("SHIPPING_SERVICE_URL", "http://localhost:8007").rstrip("/")
CART_SERVICE_URL = os.environ.get("CART_SERVICE_URL", "http://localhost:8004").rstrip("/")
RECOMMENDATION_SERVICE_URL = os.environ.get("RECOMMENDATION_SERVICE_URL", "http://localhost:8008").rstrip("/")


SAGA_LEASE_SECONDS = 15.0


def compute_checkout_hash(req: CheckoutRequest) -> str:
    items_str = ""
    if req.items:
        items_str = "|".join(f"{it.product_id}:{it.variant_id or ''}:{it.quantity}" for it in req.items)
    raw = f"{req.store_id}:{req.shipping_zip_code}:{req.fulfillment_mode}:{req.shipping_option_code}:{req.payment_method}:{items_str}"
    return hashlib.sha256(raw.encode()).hexdigest()


def serialize_order(order: Order) -> OrderResponse:
    items_resp = []
    for it in order.items:
        attrs = {}
        try:
            attrs = json.loads(it.snapshot_attributes_json)
        except Exception:
            pass

        items_resp.append(
            OrderItemSnapshotResponse(
                id=it.id,
                product_id=it.product_id,
                variant_id=it.variant_id,
                title=it.title,
                unit_price=float(it.unit_price),
                quantity=it.quantity,
                subtotal=float(it.subtotal),
                snapshot_attributes=attrs,
                reservation_operation_id=it.reservation_operation_id,
            )
        )

    hist_resp = [
        OrderStatusHistoryResponse(
            id=h.id,
            from_status=h.from_status,
            to_status=h.to_status,
            reason=h.reason,
            created_at=h.created_at,
        )
        for h in order.history
    ]

    return OrderResponse(
        id=order.id,
        store_id=order.store_id,
        user_id=order.user_id,
        status=order.status,
        subtotal=float(order.subtotal),
        shipping_cost=float(order.shipping_cost),
        total_amount=float(order.total_amount),
        payment_method=order.payment_method,
        fulfillment_mode=order.fulfillment_mode,
        shipping_zip_code=order.shipping_zip_code,
        shipping_address=order.shipping_address,
        items=items_resp,
        history=hist_resp,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


class SagaOrchestrator:
    """
    Orquestrador da Saga de Checkout com compensação síncrona (PB-18, ADR-003).
    Garante controle de concorrência com lease token atômico e transações curtas.
    """

    @classmethod
    def execute_checkout(
        cls,
        store_id: str,
        user_id: str,
        idempotency_key: str,
        req: CheckoutRequest,
    ) -> CheckoutResponse:
        req_hash = compute_checkout_hash(req)
        execution_token = str(uuid.uuid4())

        # 1. Fase de Adquirição do Lease Atômico da Saga (transação curta)
        with SessionFactory() as session:
            op = (
                session.query(CheckoutOperation)
                .filter(
                    CheckoutOperation.store_id == store_id,
                    CheckoutOperation.user_id == user_id,
                    CheckoutOperation.idempotency_key == idempotency_key,
                )
                .first()
            )

            if op:
                # Verificar divergência de payload
                if op.request_payload_hash != req_hash:
                    raise AppError(
                        status_code=409,
                        code="IDEMPOTENCY_CONFLICT",
                        message="A chave de idempotência já foi utilizada com dados de checkout divergentes.",
                    )

                # Se a operação já foi concluída, retornar o pedido existente
                if op.saga_status == "COMPLETED" and op.order_id:
                    order = session.query(Order).filter(Order.id == op.order_id).first()
                    if order:
                        return CheckoutResponse(
                            operation_id=op.id,
                            idempotency_key=op.idempotency_key,
                            saga_status=op.saga_status,
                            order=serialize_order(order),
                            message="Pedido já processado com sucesso anteriormente (idempotente).",
                        )

                # Se a operação está ativa, verificar se o lease atual é recente (< 15 segundos)
                # para evitar duas execuções paralelas concorrentes
                elapsed_seconds = (datetime.utcnow() - op.updated_at).total_seconds()
                if op.saga_status in ("STARTED", "INVENTORY_RESERVED", "PAYMENT_PENDING_CONFIRMATION"):
                    if elapsed_seconds < SAGA_LEASE_SECONDS:
                        # Execução concorrente ativa: não disparar outra Saga em paralelo!
                        order = session.query(Order).filter(Order.id == op.order_id).first() if op.order_id else None
                        return CheckoutResponse(
                            operation_id=op.id,
                            idempotency_key=op.idempotency_key,
                            saga_status=op.saga_status,
                            order=serialize_order(order) if order else None,
                            message="Operação de checkout em andamento. Aguarde a conclusão.",
                        )

                # Se o lease expirou ou processo anterior caiu, assumir a execução da Saga atomicamente (CAS)
                stmt_acquire = (
                    update(CheckoutOperation)
                    .where(
                        CheckoutOperation.id == op.id,
                        CheckoutOperation.execution_token == op.execution_token,
                    )
                    .values(
                        execution_token=execution_token,
                        updated_at=datetime.utcnow(),
                    )
                )
                res_acq = session.execute(stmt_acquire)
                session.commit()
                if res_acq.rowcount == 0:
                    raise AppError(status_code=409, code="CONCURRENT_EXECUTION_ABORTED", message="Execução assumida por outro processo concorrente.")

                operation_id = op.id
                existing_order_id = op.order_id
            else:
                # Criar nova CheckoutOperation
                op = CheckoutOperation(
                    store_id=store_id,
                    user_id=user_id,
                    idempotency_key=idempotency_key,
                    request_payload_hash=req_hash,
                    saga_status="STARTED",
                    execution_token=execution_token,
                )
                session.add(op)
                session.commit()
                session.refresh(op)
                operation_id = op.id
                existing_order_id = None

        # 2. Executar a Orquestração Fora de Transações Abertas
        return cls._run_saga_steps(
            operation_id=operation_id,
            execution_token=execution_token,
            store_id=store_id,
            user_id=user_id,
            idempotency_key=idempotency_key,
            req=req,
            existing_order_id=existing_order_id,
        )

    @classmethod
    def _verify_lease(cls, operation_id: str, execution_token: str) -> None:
        """Garante que outra requisição não tomou a posse da execução da Saga."""
        with SessionFactory() as session:
            op = session.query(CheckoutOperation).filter(CheckoutOperation.id == operation_id).first()
            if not op or op.execution_token != execution_token:
                raise AppError(status_code=409, code="CONCURRENT_EXECUTION_ABORTED", message="Execução da Saga assumida por outro processo.")

    @classmethod
    def _touch_lease(cls, operation_id: str, execution_token: str) -> None:
        """Renova a concessão de tempo da Saga antes de operações externas demoradas."""
        with SessionFactory() as session:
            stmt = (
                update(CheckoutOperation)
                .where(
                    CheckoutOperation.id == operation_id,
                    CheckoutOperation.execution_token == execution_token,
                )
                .values(updated_at=datetime.utcnow())
            )
            res = session.execute(stmt)
            session.commit()
            if res.rowcount == 0:
                raise AppError(status_code=409, code="CONCURRENT_EXECUTION_ABORTED", message="A concessão da Saga expirou ou foi assumida por outro executor.")

    @classmethod
    def _update_saga_status(
        cls,
        operation_id: str,
        execution_token: str,
        saga_status: str,
        order_id: Optional[str] = None,
    ) -> None:
        with SessionFactory() as session:
            stmt = (
                update(CheckoutOperation)
                .where(
                    CheckoutOperation.id == operation_id,
                    CheckoutOperation.execution_token == execution_token,
                )
                .values(
                    saga_status=saga_status,
                    order_id=order_id if order_id else CheckoutOperation.order_id,
                    updated_at=datetime.utcnow(),
                )
            )
            res = session.execute(stmt)
            session.commit()
            if res.rowcount == 0:
                raise AppError(status_code=409, code="CONCURRENT_EXECUTION_ABORTED", message="A concessão de execução da Saga foi perdida para outro processo.")

    @classmethod
    def _run_saga_steps(
        cls,
        operation_id: str,
        execution_token: str,
        store_id: str,
        user_id: str,
        idempotency_key: str,
        req: CheckoutRequest,
        existing_order_id: Optional[str],
    ) -> CheckoutResponse:
        internal_headers = {HEADER_INTERNAL_TOKEN: get_internal_service_key()}

        # -------------------------------------------------------------
        # ETAPA 1: Obter Itens e Validar Frete
        # -------------------------------------------------------------
        cls._verify_lease(operation_id, execution_token)

        # 1.1 Obter itens do pedido
        items_to_order = []
        if req.items and len(req.items) > 0:
            for it in req.items:
                items_to_order.append({
                    "product_id": it.product_id,
                    "variant_id": it.variant_id,
                    "quantity": it.quantity,
                    "unit_price": it.unit_price,
                    "title": it.title,
                    "attributes": it.attributes or {},
                })
        else:
            # Buscar itens do carrinho do usuário no Cart Service (Contrato Canônico PB-15)
            cart_url = f"{CART_SERVICE_URL}/internal/v1/cart/{store_id}/{user_id}"
            try:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(cart_url, headers=internal_headers)
                    if resp.status_code != 200:
                        raise AppError(status_code=400, code="CART_FETCH_FAILED", message="Falha ao obter carrinho para checkout.")
                    cart_data = resp.json()
                    cart_items = cart_data.get("items", [])
                    if not cart_items:
                        raise AppError(status_code=400, code="EMPTY_CART", message="O carrinho está vazio para esta loja.")
                    for it in cart_items:
                        items_to_order.append({
                            "product_id": it["product_id"],
                            "variant_id": it.get("variant_id"),
                            "quantity": it["quantity"],
                            "unit_price": it["unit_price"],
                            "title": it["title"],
                            "attributes": {},
                        })
            except httpx.RequestError:
                raise AppError(status_code=503, code="CART_SERVICE_UNAVAILABLE", message="Cart Service indisponível.")

        # 1.2 Validar e calcular frete no Shipping Service
        shipping_cost = 0.0
        ship_url = f"{SHIPPING_SERVICE_URL}/internal/v1/shipping/validate-option"
        ship_payload = {
            "store_id": store_id,
            "zip_code": req.shipping_zip_code,
            "modality": req.fulfillment_mode,
            "code": req.shipping_option_code,
        }
        try:
            with httpx.Client(timeout=5.0) as client:
                ship_resp = client.post(ship_url, json=ship_payload, headers=internal_headers)
                if ship_resp.status_code == 200:
                    shipping_cost = float(ship_resp.json().get("cost", 0.0))
                else:
                    err_json = ship_resp.json()
                    raise AppError(
                        status_code=ship_resp.status_code,
                        code=err_json.get("error", {}).get("code", "SHIPPING_VALIDATION_FAILED"),
                        message=err_json.get("error", {}).get("message", "Falha na validação do frete."),
                    )
        except httpx.RequestError:
            raise AppError(status_code=503, code="SHIPPING_SERVICE_UNAVAILABLE", message="Shipping Service indisponível.")

        # -------------------------------------------------------------
        # ETAPA 2: Criação Inicial do Pedido (Transação Curta)
        # -------------------------------------------------------------
        cls._verify_lease(operation_id, execution_token)

        order_id = existing_order_id or str(uuid.uuid4())
        subtotal = 0.0

        with SessionFactory() as session:
            existing_order = session.query(Order).filter(Order.id == order_id).first()
            if not existing_order:
                order = Order(
                    id=order_id,
                    store_id=store_id,
                    user_id=user_id,
                    status="PENDING",
                    subtotal=0.0,
                    shipping_cost=shipping_cost,
                    total_amount=0.0,
                    payment_method=req.payment_method.upper(),
                    fulfillment_mode=req.fulfillment_mode.upper(),
                    shipping_zip_code=req.shipping_zip_code,
                    shipping_address=req.shipping_address,
                )
                session.add(order)
                session.flush()

                # Criar snapshots dos itens com ID de reserva estável
                for idx, it in enumerate(items_to_order, start=1):
                    # Identificador estável de reserva: {order_id}:{item_index}
                    reservation_id = f"{order_id}:item:{idx}"
                    it_price = float(it.get("unit_price") or 0.0)
                    it_qty = int(it.get("quantity") or 1)
                    it_subtotal = round(it_price * it_qty, 2)
                    subtotal += it_subtotal

                    snapshot = OrderItemSnapshot(
                        order_id=order.id,
                        product_id=it["product_id"],
                        variant_id=it.get("variant_id"),
                        title=it.get("title") or f"Produto {it['product_id']}",
                        unit_price=it_price,
                        quantity=it_qty,
                        subtotal=it_subtotal,
                        snapshot_attributes_json=json.dumps(it.get("attributes") or {}),
                        reservation_operation_id=reservation_id,
                    )
                    session.add(snapshot)

                order.subtotal = round(subtotal, 2)
                order.total_amount = round(subtotal + shipping_cost, 2)

                hist = OrderStatusHistory(
                    order_id=order.id,
                    from_status="NONE",
                    to_status="PENDING",
                    reason="Pedido criado e aguardando reserva de estoque na Saga.",
                )
                session.add(hist)
                session.commit()
            else:
                order = existing_order

        # Vincular order_id na CheckoutOperation
        cls._update_saga_status(operation_id, execution_token, "STARTED", order_id=order_id)

        # -------------------------------------------------------------
        # ETAPA 3: Reserva Atômica de Estoque no Catalog Service
        # -------------------------------------------------------------
        cls._verify_lease(operation_id, execution_token)

        # Carregar snapshots para reservar item por item
        with SessionFactory() as session:
            snapshots = session.query(OrderItemSnapshot).filter(OrderItemSnapshot.order_id == order_id).all()
            snapshot_items = [
                {
                    "item_id": s.id,
                    "product_id": s.product_id,
                    "variant_id": s.variant_id,
                    "quantity": s.quantity,
                    "reservation_id": s.reservation_operation_id,
                }
                for s in snapshots
            ]

        reserved_so_far: List[dict] = []
        reservation_failed = False
        failure_error_msg = ""

        with httpx.Client(timeout=10.0) as client:
            for item in snapshot_items:
                dec_payload = {
                    "store_id": store_id,
                    "product_id": item["product_id"],
                    "variant_id": item["variant_id"],
                    "quantity": item["quantity"],
                    "operation_id": item["reservation_id"],
                }
                try:
                    dec_resp = client.post(
                        f"{CATALOG_SERVICE_URL}/internal/v1/inventory/decrement",
                        json=dec_payload,
                        headers=internal_headers,
                    )
                    if dec_resp.status_code == 200:
                        reserved_so_far.append(item)
                    else:
                        reservation_failed = True
                        err = dec_resp.json()
                        failure_error_msg = err.get("error", {}).get("message", "Estoque insuficiente.")
                        break
                except httpx.RequestError:
                    reservation_failed = True
                    failure_error_msg = "Catalog Service indisponível durante reserva de estoque."
                    break

        if reservation_failed:
            # COMPENSAÇÃO SÍNCRONA: Desfazer quaisquer reservas já realizadas nesta Saga
            cls._compensate_reservations(store_id, order_id, reserved_so_far, internal_headers)

            with SessionFactory() as session:
                ord_rec = session.query(Order).filter(Order.id == order_id).first()
                if ord_rec:
                    ord_rec.status = "CANCELLED"
                    session.add(
                        OrderStatusHistory(
                            order_id=order_id,
                            from_status="PENDING",
                            to_status="CANCELLED",
                            reason=f"Reserva de estoque falhou: {failure_error_msg}. Compensação executada.",
                        )
                    )
                    session.commit()

            cls._update_saga_status(operation_id, execution_token, "FAILED")
            raise AppError(status_code=409, code="INSUFFICIENT_STOCK", message=failure_error_msg)

        # Atualizar status para INVENTORY_RESERVED
        with SessionFactory() as session:
            ord_rec = session.query(Order).filter(Order.id == order_id).first()
            if ord_rec:
                ord_rec.status = "INVENTORY_RESERVED"
                session.add(
                    OrderStatusHistory(
                        order_id=order_id,
                        from_status="PENDING",
                        to_status="INVENTORY_RESERVED",
                        reason="Todas as reservas de estoque foram efetuadas com sucesso.",
                    )
                )
                session.commit()

        cls._update_saga_status(operation_id, execution_token, "INVENTORY_RESERVED")

        # -------------------------------------------------------------
        # ETAPA 4: Processar Pagamento no Payments Service
        # -------------------------------------------------------------
        cls._verify_lease(operation_id, execution_token)
        cls._update_saga_status(operation_id, execution_token, "PAYMENT_PENDING_CONFIRMATION")

        with SessionFactory() as session:
            ord_rec = session.query(Order).filter(Order.id == order_id).first()
            total_amount = float(ord_rec.total_amount)

        pay_payload = {
            "store_id": store_id,
            "order_id": order_id,
            "idempotency_key": f"{idempotency_key}:pay",
            "payment_method": req.payment_method.upper(),
            "amount": total_amount,
            "card_number": req.card_number,
            "simulation_scenario": req.simulation_scenario,
        }

        payment_result: Dict[str, Any] = {}
        try:
            with httpx.Client(timeout=10.0) as client:
                pay_resp = client.post(
                    f"{PAYMENTS_SERVICE_URL}/internal/v1/payments/simulate",
                    json=pay_payload,
                    headers=internal_headers,
                )
                if pay_resp.status_code in (200, 201):
                    payment_result = pay_resp.json()
                else:
                    err = pay_resp.json()
                    payment_result = {
                        "status": "REJECTED",
                        "error_message": err.get("error", {}).get("message", "Falha na cobrança."),
                    }
        except httpx.RequestError:
            # Tratar como TIMEOUT na comunicação
            payment_result = {
                "status": "TIMEOUT",
                "error_message": "Timeout de conexão com o Payments Service.",
            }

        pay_status = payment_result.get("status")

        # -------------------------------------------------------------
        # ETAPA 5: Avaliação do Pagamento e Conclusão / Compensação
        # -------------------------------------------------------------
        cls._verify_lease(operation_id, execution_token)

        if pay_status == "APPROVED":
            # Pagamento Aprovado: Marcar Order como PAID, concluir CheckoutOperation e limpar carrinho
            with SessionFactory() as session:
                ord_rec = session.query(Order).filter(Order.id == order_id).first()
                if ord_rec:
                    ord_rec.status = "PAID"
                    session.add(
                        OrderStatusHistory(
                            order_id=order_id,
                            from_status="INVENTORY_RESERVED",
                            to_status="PAID",
                            reason="Pagamento aprovado pelo provedor simulado.",
                        )
                    )
                    session.commit()
                    ord_serialized = serialize_order(ord_rec)

            cls._update_saga_status(operation_id, execution_token, "COMPLETED")

            # Limpar o carrinho do usuário de forma assíncrona/segura (Contrato Canônico PB-15)
            try:
                with httpx.Client(timeout=5.0) as client:
                    client.delete(
                        f"{CART_SERVICE_URL}/internal/v1/cart/{store_id}/{user_id}",
                        headers=internal_headers,
                    )
            except Exception:
                pass

            # Notificar Recommendation Service do evento PURCHASE para cada item (PB-20)
            for it in snapshot_items:
                try:
                    with httpx.Client(timeout=2.0) as client:
                        client.post(
                            f"{RECOMMENDATION_SERVICE_URL}/internal/v1/recommendations/interactions",
                            json={
                                "store_id": store_id,
                                "user_id": user_id,
                                "product_id": it["product_id"],
                                "category": "Geral",
                                "event_type": "PURCHASE",
                                "reference_id": f"purchase:{order_id}:{it['product_id']}",
                            },
                            headers=internal_headers,
                        )
                except Exception:
                    pass

            return CheckoutResponse(
                operation_id=operation_id,
                idempotency_key=idempotency_key,
                saga_status="COMPLETED",
                order=ord_serialized,
                payment=payment_result,
                message="Pedido realizado com sucesso e pagamento confirmado.",
            )

        elif pay_status == "REJECTED":
            # Recusa definitiva: Compensar estoque exatamente uma vez
            cls._compensate_reservations(store_id, order_id, snapshot_items, internal_headers)

            with SessionFactory() as session:
                ord_rec = session.query(Order).filter(Order.id == order_id).first()
                if ord_rec:
                    ord_rec.status = "PAYMENT_FAILED"
                    session.add(
                        OrderStatusHistory(
                            order_id=order_id,
                            from_status="INVENTORY_RESERVED",
                            to_status="PAYMENT_FAILED",
                            reason=f"Pagamento recusado: {payment_result.get('error_message')}. Estoque compensado.",
                        )
                    )
                    session.commit()
                    ord_serialized = serialize_order(ord_rec)

            cls._update_saga_status(operation_id, execution_token, "FAILED")

            return CheckoutResponse(
                operation_id=operation_id,
                idempotency_key=idempotency_key,
                saga_status="FAILED",
                order=ord_serialized,
                payment=payment_result,
                message=f"Pagamento não autorizado: {payment_result.get('error_message')}. Estoque liberado.",
            )

        else:
            # TIMEOUT: Manter PAYMENT_PENDING_CONFIRMATION, reter o estoque, NÃO compensar preventivamente!
            with SessionFactory() as session:
                ord_rec = session.query(Order).filter(Order.id == order_id).first()
                if ord_rec:
                    session.add(
                        OrderStatusHistory(
                            order_id=order_id,
                            from_status="INVENTORY_RESERVED",
                            to_status="INVENTORY_RESERVED",
                            reason="Pagamento pendente de confirmação (timeout). Estoque permanece reservado.",
                        )
                    )
                    session.commit()
                    ord_serialized = serialize_order(ord_rec)

            cls._update_saga_status(operation_id, execution_token, "PAYMENT_PENDING_CONFIRMATION")

            return CheckoutResponse(
                operation_id=operation_id,
                idempotency_key=idempotency_key,
                saga_status="PAYMENT_PENDING_CONFIRMATION",
                order=ord_serialized,
                payment=payment_result,
                message="Pagamento pendente de confirmação junto à operadora. O estoque continua retido aguardando conciliação.",
            )

    @classmethod
    def _compensate_reservations(
        cls,
        store_id: str,
        order_id: str,
        reserved_items: List[dict],
        headers: dict,
    ) -> None:
        """Executa a compensação síncrona das reservas realizadas (PB-18)."""
        with httpx.Client(timeout=10.0) as client:
            for item in reserved_items:
                restore_op_id = f"{item['reservation_id']}:restore"
                restore_payload = {
                    "store_id": store_id,
                    "product_id": item["product_id"],
                    "variant_id": item["variant_id"],
                    "quantity": item["quantity"],
                    "operation_id": restore_op_id,
                }
                try:
                    client.post(
                        f"{CATALOG_SERVICE_URL}/internal/v1/inventory/restore",
                        json=restore_payload,
                        headers=headers,
                    )
                except Exception:
                    pass
