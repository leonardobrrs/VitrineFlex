from typing import List, Optional
from pydantic import BaseModel, Field


class CartItemAddRequest(BaseModel):
    store_id: str = Field(..., description="ID ou slug da loja")
    product_id: str = Field(..., description="ID do produto")
    variant_id: Optional[str] = Field(None, description="ID da variante (se aplicável ao segmento)")
    quantity: int = Field(1, ge=1, description="Quantidade a adicionar")


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=1, description="Nova quantidade do item")


class CartItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str] = None
    title: str
    unit_price: float
    quantity: int
    subtotal: float
    image_url: Optional[str] = None


class CartResponse(BaseModel):
    id: str
    store_id: str
    user_id: str
    items: List[CartItemResponse]
    total_items: int
    subtotal: float


class ClearCartResponse(BaseModel):
    success: bool
    message: str
