from typing import List
from pydantic import BaseModel, Field


class ShippingQuoteRequest(BaseModel):
    store_id: str = Field(..., description="ID ou slug da loja")
    zip_code: str = Field(..., description="CEP de destino com 8 dígitos")


class ShippingOption(BaseModel):
    code: str
    modality: str
    name: str
    cost: float
    estimated_days: int


class ShippingQuoteResponse(BaseModel):
    store_id: str
    zip_code: str
    options: List[ShippingOption]


class ShippingValidateRequest(BaseModel):
    store_id: str
    zip_code: str
    modality: str
    code: str
