from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class InteractionCreateRequest(BaseModel):
    product_id: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    store_id: Optional[str] = None
    user_id: Optional[str] = None
    event_type: str = Field("VIEW", description="Tipo de interação (público registra apenas VIEW)")


class InternalInteractionCreateRequest(BaseModel):
    store_id: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    product_id: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    event_type: str = Field(..., description="VIEW, FAVORITE, PURCHASE")
    reference_id: Optional[str] = Field(None, description="Identificador único da operação para desduplicação")


class InteractionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    store_id: str
    user_id: Optional[str]
    product_id: str
    category: str
    event_type: str
    reference_id: Optional[str] = None
    created_at: datetime
    message: str = "Interação registrada com sucesso."


class RecommendationItem(BaseModel):
    product_id: str
    title: str
    category: str
    price: float
    available_stock: int
    score: float
    reason: str
    image_url: Optional[str] = None


class RecommendationResponse(BaseModel):
    store_id: str
    total: int
    items: List[RecommendationItem]
    degraded: bool = False
    cold_start: bool = False
