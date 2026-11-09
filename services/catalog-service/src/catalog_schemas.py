from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class VariantCreate(BaseModel):
    size: str = Field(..., min_length=1, max_length=32)
    color: str = Field(..., min_length=1, max_length=64)
    sku: str = Field(..., min_length=2, max_length=64)
    stock_quantity: int = Field(0, ge=0)


class VariantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    size: str
    color: str
    sku: str
    stock_quantity: int


class AttributeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1, max_length=500)


class AttributeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    value: str


class ProductCreateRequest(BaseModel):
    store_id: str
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field("", max_length=2000)
    price: float = Field(..., gt=0)
    stock_quantity: int = Field(0, ge=0)
    category: str = Field(..., min_length=2, max_length=100)
    image_url: Optional[str] = None
    preview_content: Optional[str] = None
    variants: Optional[List[VariantCreate]] = None
    attributes: Optional[List[AttributeCreate]] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    store_id: str
    title: str
    description: str
    price: float
    stock_quantity: int
    category: str
    image_url: Optional[str] = None
    preview_content: Optional[str] = None
    is_active: bool
    variants: List[VariantResponse] = []
    attributes: List[AttributeResponse] = []
    created_at: datetime


class InventoryDecrementRequest(BaseModel):
    store_id: str
    product_id: str
    variant_id: Optional[str] = Field(None, description="ID da variante de produto (obrigatório para Moda)")
    quantity: int = Field(..., gt=0)
    operation_id: str = Field(..., min_length=1, description="Idempotency key da operação de baixa (por linha de pedido)")


class InventoryRestoreRequest(BaseModel):
    store_id: str
    product_id: str
    variant_id: Optional[str] = Field(None, description="ID da variante restaurada")
    quantity: int = Field(..., gt=0)
    operation_id: str = Field(..., min_length=1, description="Idempotency key da operação de restauração")


class InventoryOperationResponse(BaseModel):
    success: bool
    operation_id: str
    product_id: str
    variant_id: Optional[str] = None
    new_stock_quantity: int
    message: str


class FavoriteRequest(BaseModel):
    store_id: str
    product_id: str


class FavoriteToggleRequest(BaseModel):
    store_id: str
    product_id: str


class FavoriteResponse(BaseModel):
    id: Optional[str] = None
    store_id: str
    user_id: str
    product_id: str
    is_favorite: bool
    message: Optional[str] = None


class ProductComparisonResponse(BaseModel):
    store_id: str
    total_compared: int
    products: List[ProductResponse]


class StockAlertCreateRequest(BaseModel):
    store_id: str
    product_id: str
    variant_id: Optional[str] = None


class StockAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    store_id: str
    user_id: str
    product_id: str
    variant_id: Optional[str] = None
    status: str
    created_at: datetime
    notified_at: Optional[datetime] = None
    product_title: Optional[str] = None
    variant_label: Optional[str] = None


class TechnicalFilterGroup(BaseModel):
    name: str
    options: List[str]


class TechnicalFiltersResponse(BaseModel):
    store_id: str
    filters: List[TechnicalFilterGroup]

