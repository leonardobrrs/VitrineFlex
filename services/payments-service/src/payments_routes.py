import hashlib
import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from python_common.errors import AppError
from python_common.security import validate_internal_token, HEADER_INTERNAL_TOKEN
from python_common.manifest_provider import FeatureManifestProvider
from payments_database import get_db
from payments_models import PaymentAttempt
from payments_schemas import PaymentProcessRequest, PaymentResponse

router = APIRouter()

LPS_CONFIG_SERVICE_URL = os.environ.get("LPS_CONFIG_SERVICE_URL", "http://localhost:8002").rstrip("/")
manifest_provider = FeatureManifestProvider(lps_base_url=LPS_CONFIG_SERVICE_URL)


def compute_payload_hash(req: PaymentProcessRequest) -> str:
    raw = f"{req.store_id}:{req.order_id}:{req.payment_method.upper()}:{req.amount:.2f}"
    return hashlib.sha256(raw.encode()).hexdigest()


def serialize_payment_response(attempt: PaymentAttempt) -> PaymentResponse:
    qr_pix = None
    barcode = None
    if attempt.payment_method == "PIX" and attempt.status in ("APPROVED", "PENDING"):
        qr_pix = f"00020126580014BR.GOV.BCB.PIX0136{attempt.transaction_id or attempt.id}5204000053039865405{attempt.amount:.2f}5802BR"
    elif attempt.payment_method == "BOLETO" and attempt.status in ("APPROVED", "PENDING"):
        barcode = f"34191.79001 01043.510047 91020.150008 8 {attempt.id.replace('-', '')[:14]}"

    return PaymentResponse(
        id=attempt.id,
        store_id=attempt.store_id,
        order_id=attempt.order_id,
        idempotency_key=attempt.idempotency_key,
        payment_method=attempt.payment_method,
        amount=float(attempt.amount),
        status=attempt.status,
        transaction_id=attempt.transaction_id,
        qr_code_pix=qr_pix,
        boleto_barcode=barcode,
        error_message=attempt.error_message,
        created_at=attempt.created_at,
    )


@router.get("/health")
def health_check():
    return {"status": "UP", "service": "payments-service", "port": 8006}


PAYMENT_LEASE_SECONDS = 10.0


@router.post("/internal/v1/payments/simulate", response_model=PaymentResponse)
@router.post("/internal/v1/payments/process", response_model=PaymentResponse)
def process_payment(
    req: PaymentProcessRequest,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """
    Processa ou recupera uma tentativa de pagamento simulada com idempotência estrita,
    concessão de lease e recuperação atômica de falhas (Contrato Canônico PB-16).
    """
    validate_internal_token(x_internal_token)

    norm_method = req.payment_method.upper()
    req_hash = compute_payload_hash(req)
    executor_token = str(uuid.uuid4())

    # 1. Validar métodos habilitados no ProductManifest da loja
    try:
        manifest = manifest_provider.get_manifest(req.store_id)
        allowed_methods = manifest.get("payment_methods", [])
        if norm_method not in allowed_methods:
            raise AppError(
                status_code=422,
                code="UNSUPPORTED_PAYMENT_METHOD",
                message=f"O método de pagamento '{norm_method}' não está habilitado para a loja '{req.store_id}'. Habilitados: {allowed_methods}",
            )
    except AppError:
        raise
    except Exception:
        # Se manifesto não responder (ex: testes isolados), aceita métodos padrão
        if norm_method not in {"PIX", "CARD", "BOLETO"}:
            raise AppError(status_code=422, code="UNSUPPORTED_PAYMENT_METHOD", message=f"Método '{norm_method}' inválido.")

    # 2. Verificar se já existe tentativa com a mesma chave de idempotência
    existing = (
        db.query(PaymentAttempt)
        .filter(PaymentAttempt.store_id == req.store_id, PaymentAttempt.idempotency_key == req.idempotency_key)
        .first()
    )

    attempt_id = None
    is_resumed = False

    if existing:
        # Mesma chave e payload divergente -> 409 IDEMPOTENCY_CONFLICT
        if existing.request_payload_hash != req_hash:
            raise AppError(
                status_code=409,
                code="IDEMPOTENCY_CONFLICT",
                message="A chave de idempotência já foi utilizada com parâmetros de pagamento divergentes.",
            )

        # Tentativa terminal definitiva: apenas APPROVED ou REJECTED encerram o ciclo de negócio
        if existing.status in ("APPROVED", "REJECTED"):
            return serialize_payment_response(existing)

        # Tentativa ambígua (TIMEOUT) ou em andamento (PENDING):
        # Permanece recuperável e não é tratada como recusa definitiva de pagamento
        if existing.status in ("PENDING", "TIMEOUT"):
            elapsed = (datetime.utcnow() - existing.updated_at).total_seconds()
            if elapsed < PAYMENT_LEASE_SECONDS and existing.status == "PENDING":
                # Processamento legítimo ativo por outro executor: não processar em paralelo
                return serialize_payment_response(existing)

            # Tentativa ambígua ou com lease expirado: Adquirir concessão atomicamente via CAS
            stmt_cas = (
                update(PaymentAttempt)
                .where(
                    PaymentAttempt.id == existing.id,
                    PaymentAttempt.status.in_(["PENDING", "TIMEOUT"]),
                    PaymentAttempt.execution_token == existing.execution_token,
                )
                .values(
                    execution_token=executor_token,
                    status="PENDING",
                    updated_at=datetime.utcnow(),
                )
            )
            res_cas = db.execute(stmt_cas)
            db.commit()
            if res_cas.rowcount == 0:
                # Outro executor assumiu paralelamente
                refreshed = db.query(PaymentAttempt).filter(PaymentAttempt.id == existing.id).first()
                return serialize_payment_response(refreshed)

            attempt_id = existing.id
            is_resumed = True
    else:
        # 3. Criar atomicamente o registro com status PENDING e execution_token antes da simulação
        new_attempt = PaymentAttempt(
            store_id=req.store_id,
            order_id=req.order_id,
            idempotency_key=req.idempotency_key,
            request_payload_hash=req_hash,
            payment_method=norm_method,
            amount=req.amount,
            status="PENDING",
            execution_token=executor_token,
        )
        db.add(new_attempt)
        try:
            db.commit()
            db.refresh(new_attempt)
            attempt_id = new_attempt.id
        except IntegrityError:
            db.rollback()
            # Concorrência: outra requisição acabou de registrar a mesma chave
            concurrent_existing = (
                db.query(PaymentAttempt)
                .filter(PaymentAttempt.store_id == req.store_id, PaymentAttempt.idempotency_key == req.idempotency_key)
                .first()
            )
            if concurrent_existing:
                if concurrent_existing.request_payload_hash != req_hash:
                    raise AppError(
                        status_code=409,
                        code="IDEMPOTENCY_CONFLICT",
                        message="A chave de idempotência já foi utilizada com parâmetros divergentes.",
                    )
                return serialize_payment_response(concurrent_existing)
            raise

    # 4. Executar simulação de processamento (fora de transação de banco)
    final_status = "APPROVED"
    tx_id: Optional[str] = f"tx-{uuid.uuid4().hex[:12].upper()}"
    err_msg: Optional[str] = None

    if req.simulation_scenario == "CARD_DECLINED" or (req.card_number and req.card_number.endswith("0002")):
        final_status = "REJECTED"
        err_msg = "Cartão de crédito recusado pela operadora simulada (saldo insuficiente ou cartão inválido)."
        tx_id = None
    elif req.simulation_scenario == "TIMEOUT":
        final_status = "TIMEOUT"
        err_msg = "Tempo limite excedido na comunicação com a instituição financeira simulada."
        tx_id = None

    # 5. Finalizar tentativa com Compare-And-Swap garantindo posse do execution_token
    stmt_finalize = (
        update(PaymentAttempt)
        .where(
            PaymentAttempt.id == attempt_id,
            PaymentAttempt.execution_token == executor_token,
            PaymentAttempt.status == "PENDING",
        )
        .values(
            status=final_status,
            transaction_id=tx_id,
            error_message=err_msg,
            updated_at=datetime.utcnow(),
        )
    )
    res_fin = db.execute(stmt_finalize)
    db.commit()

    if res_fin.rowcount == 0:
        # O executor perdeu a concessão para outro processo enquanto processava!
        # Não pode finalizar nem sobrescrever. Retorna o estado atual no banco.
        current_state = db.query(PaymentAttempt).filter(PaymentAttempt.id == attempt_id).first()
        return serialize_payment_response(current_state)

    updated_attempt = db.query(PaymentAttempt).filter(PaymentAttempt.id == attempt_id).first()
    return serialize_payment_response(updated_attempt)


@router.get("/internal/v1/payments/attempts/{idempotency_key}", response_model=PaymentResponse)
def get_payment_attempt(
    idempotency_key: str,
    store_id: Optional[str] = Query(None, description="ID ou slug da loja"),
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    """Consulta o resultado persistido de uma tentativa de pagamento (PB-16)."""
    validate_internal_token(x_internal_token)

    query = db.query(PaymentAttempt).filter(PaymentAttempt.idempotency_key == idempotency_key)
    if store_id:
        query = query.filter(PaymentAttempt.store_id == store_id)
    attempt = query.first()
    if not attempt:
        raise AppError(status_code=404, code="PAYMENT_NOT_FOUND", message="Tentativa de pagamento não encontrada.")

    return serialize_payment_response(attempt)
