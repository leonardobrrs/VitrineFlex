from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PaymentProcessRequest(BaseModel):
    store_id: str = Field(..., description="ID ou slug da loja")
    order_id: str = Field(..., description="ID do pedido")
    idempotency_key: str = Field(..., description="Chave de idempotência única por pedido/tentativa")
    payment_method: str = Field(..., description="Método de pagamento (PIX, CARD, BOLETO)")
    amount: float = Field(..., gt=0, description="Valor total a ser cobrado")
    card_number: Optional[str] = Field(None, description="Número de cartão simulado (opcional)")
    simulation_scenario: Optional[str] = Field(None, description="Cenário de simulação: CARD_DECLINED, TIMEOUT, etc.")


class PaymentResponse(BaseModel):
    id: str
    store_id: str
    order_id: str
    idempotency_key: str
    payment_method: str
    amount: float
    status: str
    transaction_id: Optional[str] = None
    qr_code_pix: Optional[str] = None
    boleto_barcode: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
