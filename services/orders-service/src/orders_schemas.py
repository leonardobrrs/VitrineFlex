from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class CheckoutLineItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(..., ge=1)
    unit_price: Optional[float] = None
    title: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class CheckoutRequest(BaseModel):
    store_id: str = Field(..., description="ID ou slug da loja")
    shipping_zip_code: str = Field(..., description="CEP de entrega")
    shipping_address: Optional[str] = Field(None, description="Endereço textual de entrega")
    fulfillment_mode: str = Field(..., description="DELIVERY ou PICKUP")
    shipping_option_code: str = Field("STANDARD_DELIVERY", description="Código da modalidade de entrega calculada")
    payment_method: str = Field(..., description="PIX, CARD, BOLETO")
    card_number: Optional[str] = Field(None, description="Número de cartão simulado (opcional)")
    simulation_scenario: Optional[str] = Field(None, description="Cenário de simulação: CARD_DECLINED, TIMEOUT")
    items: Optional[List[CheckoutLineItem]] = Field(None, description="Itens explícitos ou obtidos do carrinho")


class OrderItemSnapshotResponse(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str] = None
    title: str
    unit_price: float
    quantity: int
    subtotal: float
    snapshot_attributes: Dict[str, Any]
    reservation_operation_id: str


class OrderStatusHistoryResponse(BaseModel):
    id: str
    from_status: str
    to_status: str
    reason: Optional[str] = None
    created_at: datetime


class OrderResponse(BaseModel):
    id: str
    store_id: str
    user_id: str
    status: str
    subtotal: float
    shipping_cost: float
    total_amount: float
    payment_method: str
    fulfillment_mode: str
    shipping_zip_code: str
    shipping_address: Optional[str] = None
    items: List[OrderItemSnapshotResponse]
    history: List[OrderStatusHistoryResponse]
    created_at: datetime
    updated_at: datetime


class CheckoutResponse(BaseModel):
    operation_id: str
    idempotency_key: str
    saga_status: str
    order: Optional[OrderResponse] = None
    payment: Optional[Dict[str, Any]] = None
    message: str
