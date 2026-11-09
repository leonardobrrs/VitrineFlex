from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ThemeConfig(BaseModel):
    primary_color: str = Field("#2563eb", description="Cor primária em formato hexadecimal")
    secondary_color: str = Field("#1e40af", description="Cor secundária em formato hexadecimal")
    logo_url: Optional[str] = None
    store_name: Optional[str] = None


class StoreCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    segment: str = Field(..., description="FASHION, TECH ou BOOKS")
    features: Dict[str, Any] = Field(..., description="Mapa de ativação booleana das features")
    payment_methods: List[str] = Field(..., min_length=1, description="PIX, CARD, BOLETO")
    fulfillment_modes: List[str] = Field(..., min_length=1, description="DELIVERY, PICKUP")
    theme: Optional[ThemeConfig] = Field(default_factory=ThemeConfig)


class StoreUpdateRequest(BaseModel):
    features: Dict[str, Any]
    payment_methods: List[str]
    fulfillment_modes: List[str]
    theme: Optional[ThemeConfig] = None


class ManifestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_id: str
    store_slug: str
    store_name: str
    segment: str
    version: int
    schema_version: str
    features: Dict[str, bool]
    theme: Dict[str, Any]
    payment_methods: List[str]
    fulfillment_modes: List[str]
    created_at: datetime


class StoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    name: str
    segment: str
    created_at: datetime
    current_manifest: Optional[ManifestResponse] = None


class ValidationRequest(BaseModel):
    segment: str
    features: Dict[str, Any]
    payment_methods: List[str] = Field(default=["PIX"])
    fulfillment_modes: List[str] = Field(default=["DELIVERY"])


class ValidationResponse(BaseModel):
    is_valid: bool
    error_code: Optional[str] = None
    errors: List[str] = []


class FeatureItem(BaseModel):
    key: str
    name: str
    group: str
    description: str
    is_mandatory: bool
    segment: Optional[str] = None


class FeatureCatalogResponse(BaseModel):
    total_features: int
    features: List[FeatureItem]
