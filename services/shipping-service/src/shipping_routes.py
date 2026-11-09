import os
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import validate_internal_token, HEADER_INTERNAL_TOKEN
from python_common.manifest_provider import FeatureManifestProvider
from shipping_database import get_db
from shipping_models import ShippingQuoteRecord
from shipping_schemas import (
    ShippingQuoteRequest,
    ShippingOption,
    ShippingQuoteResponse,
    ShippingValidateRequest,
)

router = APIRouter()

LPS_CONFIG_SERVICE_URL = os.environ.get("LPS_CONFIG_SERVICE_URL", "http://localhost:8002").rstrip("/")
manifest_provider = FeatureManifestProvider(lps_base_url=LPS_CONFIG_SERVICE_URL)


def normalize_zip(zip_str: str) -> str:
    cleaned = re.sub(r"\D", "", zip_str or "")
    if len(cleaned) != 8:
        raise AppError(status_code=422, code="INVALID_ZIP_CODE", message="CEP inválido. Deve conter exatamente 8 dígitos numéricos.")
    return cleaned


def calculate_shipping_options(store_id: str, clean_zip: str, allowed_modes: List[str]) -> List[ShippingOption]:
    options: List[ShippingOption] = []
    first_digit = int(clean_zip[0])

    if "DELIVERY" in allowed_modes:
        if first_digit <= 3:  # Sudeste
            options.append(ShippingOption(code="STANDARD_DELIVERY", modality="DELIVERY", name="Entrega Padrão", cost=14.90, estimated_days=3))
            options.append(ShippingOption(code="EXPRESS_DELIVERY", modality="DELIVERY", name="Entrega Expressa", cost=24.90, estimated_days=1))
        elif first_digit <= 6:  # Sul / Nordeste (ex: Alagoas 57xxx)
            options.append(ShippingOption(code="STANDARD_DELIVERY", modality="DELIVERY", name="Entrega Padrão", cost=19.90, estimated_days=5))
            options.append(ShippingOption(code="EXPRESS_DELIVERY", modality="DELIVERY", name="Entrega Expressa", cost=34.90, estimated_days=2))
        else:  # Centro-Oeste / Norte
            options.append(ShippingOption(code="STANDARD_DELIVERY", modality="DELIVERY", name="Entrega Padrão", cost=29.90, estimated_days=7))
            options.append(ShippingOption(code="EXPRESS_DELIVERY", modality="DELIVERY", name="Entrega Expressa", cost=49.90, estimated_days=3))

    if "PICKUP" in allowed_modes:
        options.append(ShippingOption(code="STORE_PICKUP", modality="PICKUP", name="Retirada em Loja", cost=0.00, estimated_days=1))

    return options


@router.get("/health")
def health_check():
    return {"status": "UP", "service": "shipping-service", "port": 8007}


@router.post("/api/v1/shipping/quote", response_model=ShippingQuoteResponse)
def get_shipping_quote(req: ShippingQuoteRequest, db: Session = Depends(get_db)):
    """Cotação determinística de frete baseada na faixa de CEP e no manifesto da loja (PB-17)."""
    clean_zip = normalize_zip(req.zip_code)

    # 1. Obter modalidades habilitadas na LPS
    try:
        manifest = manifest_provider.get_manifest(req.store_id)
        allowed_modes = manifest.get("fulfillment_modes", ["DELIVERY", "PICKUP"])
    except Exception:
        # Fallback para ambiente isolado
        allowed_modes = ["DELIVERY", "PICKUP"]

    options = calculate_shipping_options(req.store_id, clean_zip, allowed_modes)

    # Registrar cotação gerada
    for opt in options:
        rec = ShippingQuoteRecord(
            store_id=req.store_id,
            zip_code=clean_zip,
            modality=opt.modality,
            cost=opt.cost,
            estimated_days=opt.estimated_days,
        )
        db.add(rec)
    db.commit()

    return ShippingQuoteResponse(
        store_id=req.store_id,
        zip_code=f"{clean_zip[:5]}-{clean_zip[5:]}",
        options=options,
    )


@router.post("/internal/v1/shipping/validate-option", response_model=ShippingOption)
def validate_shipping_option(
    req: ShippingValidateRequest,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
):
    """Valida a opção de frete selecionada no checkout (Orders Service)."""
    validate_internal_token(x_internal_token)
    clean_zip = normalize_zip(req.zip_code)

    try:
        manifest = manifest_provider.get_manifest(req.store_id)
        allowed_modes = manifest.get("fulfillment_modes", ["DELIVERY", "PICKUP"])
    except Exception:
        allowed_modes = ["DELIVERY", "PICKUP"]

    norm_modality = req.modality.upper()
    if norm_modality not in allowed_modes:
        raise AppError(
            status_code=422,
            code="UNSUPPORTED_FULFILLMENT_MODE",
            message=f"A modalidade '{norm_modality}' não é suportada pela loja '{req.store_id}'. Habilitadas: {allowed_modes}",
        )

    available_options = calculate_shipping_options(req.store_id, clean_zip, allowed_modes)
    matched = next((opt for opt in available_options if opt.code == req.code or opt.modality == norm_modality), None)
    if not matched:
        raise AppError(status_code=422, code="UNSUPPORTED_FULFILLMENT_MODE", message=f"Opção de entrega '{req.code}' inválida para este CEP.")

    return matched
