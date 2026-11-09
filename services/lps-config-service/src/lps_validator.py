from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel

VALID_SEGMENTS: Set[str] = {"FASHION", "TECH", "BOOKS"}

REQUIRED_CORE_FEATURES: Set[str] = {
    "auth",
    "catalog",
    "cart",
    "orders",
    "checkout",
    "recommendations",
}

REQUIRED_FEATURES_BY_SEGMENT: Dict[str, Set[str]] = {
    "FASHION": {"size_grid", "color_variants", "variant_sku"},
    "TECH": {"technical_specs", "warranty_info"},
    "BOOKS": {"isbn", "author", "publisher", "literary_genre", "edition"},
}

KNOWN_FEATURES: Set[str] = REQUIRED_CORE_FEATURES | {
    "size_grid",
    "color_variants",
    "variant_sku",
    "technical_specs",
    "warranty_info",
    "product_comparison",
    "isbn",
    "author",
    "publisher",
    "literary_genre",
    "edition",
    "favorites",
    # Novas features da evolução da LPS (ETAPA 2)
    "recently_viewed",
    "fashion_size_guide",
    "technical_filters",
    "book_preview",
    "back_in_stock_alert",
}

FORBIDDEN_MVP_FEATURES: Set[str] = {"reviews", "coupons", "dynamic_pricing"}

VALID_PAYMENTS: Set[str] = {"PIX", "CARD", "BOLETO"}
VALID_FULFILLMENT: Set[str] = {"DELIVERY", "PICKUP"}


class ValidationResult(BaseModel):
    is_valid: bool
    error_code: Optional[str] = None
    errors: List[str] = []


def validate_configuration(
    segment: str,
    features: Dict[str, Any],
    payment_methods: List[str],
    fulfillment_modes: List[str],
) -> ValidationResult:
    errors: List[str] = []
    error_code = "INVALID_FEATURE_CONFIGURATION"

    normalized_segment = segment.upper() if segment else ""
    if normalized_segment not in VALID_SEGMENTS:
        errors.append(f"Segmento '{segment}' é inválido. Deve ser exatamente um de {sorted(VALID_SEGMENTS)}.")
        return ValidationResult(is_valid=False, error_code=error_code, errors=errors)

    for feat_name, feat_val in features.items():
        if not isinstance(feat_val, bool):
            errors.append(
                f"A feature '{feat_name}' possui valor não booleano ({type(feat_val).__name__}). Deve ser True ou False."
            )

    submitted_features = set(features.keys())
    unknown_features = submitted_features - KNOWN_FEATURES - FORBIDDEN_MVP_FEATURES
    if unknown_features:
        errors.append(f"Features não reconhecidas no modelo formal da LPS: {sorted(unknown_features)}.")

    blocked_present = [f for f in FORBIDDEN_MVP_FEATURES if features.get(f) is True]
    if blocked_present:
        error_code = "FEATURE_NOT_SUPPORTED"
        errors.append(f"As features {blocked_present} não são suportadas no MVP (ADR-001).")

    for core_feat in sorted(REQUIRED_CORE_FEATURES):
        if core_feat not in features:
            errors.append(f"Feature obrigatória do núcleo ausente: '{core_feat}'.")
        elif features[core_feat] is not True:
            errors.append(f"Feature obrigatória do núcleo '{core_feat}' deve estar ativada (true).")

    required_seg_feats = REQUIRED_FEATURES_BY_SEGMENT.get(normalized_segment, set())
    for seg_feat in sorted(required_seg_feats):
        if seg_feat not in features:
            errors.append(f"Feature obrigatória do segmento {normalized_segment} ausente: '{seg_feat}'.")
        elif features[seg_feat] is not True:
            errors.append(f"Feature obrigatória do segmento {normalized_segment} '{seg_feat}' deve estar ativada (true).")

    # Incompatibilidades e Restrições de Segmento
    if normalized_segment == "FASHION":
        for tech_feat in ["technical_specs", "warranty_info", "product_comparison", "technical_filters"]:
            if features.get(tech_feat) is True:
                errors.append(f"Feature '{tech_feat}' é incompatível com o segmento FASHION (CTC-03/CTC-15).")
        for book_feat in ["isbn", "author", "publisher", "literary_genre", "edition", "book_preview"]:
            if features.get(book_feat) is True:
                errors.append(f"Feature '{book_feat}' é incompatível com o segmento FASHION (CTC-16).")

    elif normalized_segment == "TECH":
        for fash_feat in ["size_grid", "color_variants", "variant_sku", "fashion_size_guide"]:
            if features.get(fash_feat) is True:
                errors.append(f"Feature '{fash_feat}' é incompatível com o segmento TECH (CTC-14).")
        for book_feat in ["isbn", "author", "publisher", "literary_genre", "edition", "book_preview"]:
            if features.get(book_feat) is True:
                errors.append(f"Feature '{book_feat}' é incompatível com o segmento TECH (CTC-16).")

    elif normalized_segment == "BOOKS":
        for fash_feat in ["size_grid", "color_variants", "variant_sku", "fashion_size_guide"]:
            if features.get(fash_feat) is True:
                errors.append(f"Feature '{fash_feat}' é incompatível com o segmento BOOKS (CTC-14).")
        for tech_feat in ["technical_specs", "warranty_info", "product_comparison", "technical_filters"]:
            if features.get(tech_feat) is True:
                errors.append(f"Feature '{tech_feat}' é incompatível com o segmento BOOKS (CTC-04/CTC-15).")

    # CTC-02: Comparador exclusivo para TECH
    if features.get("product_comparison") is True and normalized_segment != "TECH":
        errors.append(f"A feature 'product_comparison' exige o segmento TECH e é incompatível com {normalized_segment} (CTC-02).")

    # CTC-14: fashion_size_guide requer FASHION e size_grid
    if features.get("fashion_size_guide") is True:
        if normalized_segment != "FASHION":
            errors.append(f"A feature 'fashion_size_guide' somente pode ser habilitada no segmento FASHION (CTC-14).")
        if features.get("size_grid") is not True:
            errors.append("A feature 'fashion_size_guide' depende de 'size_grid' ativado (CTC-14).")

    # CTC-15: technical_filters requer TECH e technical_specs
    if features.get("technical_filters") is True:
        if normalized_segment != "TECH":
            errors.append(f"A feature 'technical_filters' somente pode ser habilitada no segmento TECH (CTC-15).")
        if features.get("technical_specs") is not True:
            errors.append("A feature 'technical_filters' depende de 'technical_specs' ativado (CTC-15).")

    # CTC-16: book_preview requer BOOKS
    if features.get("book_preview") is True:
        if normalized_segment != "BOOKS":
            errors.append(f"A feature 'book_preview' somente pode ser habilitada no segmento BOOKS (CTC-16).")

    # CTC-17: recently_viewed requer recommendations
    if features.get("recently_viewed") is True:
        if features.get("recommendations") is not True:
            errors.append("A feature 'recently_viewed' depende de 'recommendations' ativado (CTC-17).")

    # CTC-18: back_in_stock_alert requer auth e catalog
    if features.get("back_in_stock_alert") is True:
        if features.get("auth") is not True or features.get("catalog") is not True:
            errors.append("A feature 'back_in_stock_alert' depende de 'auth' e 'catalog' ativados (CTC-18).")

    # Pagamentos
    selected_payments = set(payment_methods or [])
    if not selected_payments:
        errors.append("Pelo menos um método de pagamento simulado (PIX, CARD, BOLETO) deve estar habilitado.")
        error_code = "INVALID_PAYMENT_METHOD"
    invalid_payments = selected_payments - VALID_PAYMENTS
    if invalid_payments:
        errors.append(f"Métodos de pagamento desconhecidos/inválidos: {sorted(invalid_payments)}.")
        error_code = "INVALID_PAYMENT_METHOD"

    # Atendimento
    selected_fulfillment = set(fulfillment_modes or [])
    if not selected_fulfillment:
        errors.append("Pelo menos uma modalidade de atendimento (DELIVERY, PICKUP) deve estar habilitada.")
        error_code = "INVALID_FULFILLMENT_MODE"
    invalid_fulfillment = selected_fulfillment - VALID_FULFILLMENT
    if invalid_fulfillment:
        errors.append(f"Modalidades de atendimento desconhecidas/inválidas: {sorted(invalid_fulfillment)}.")
        error_code = "INVALID_FULFILLMENT_MODE"

    return ValidationResult(
        is_valid=(len(errors) == 0),
        error_code=error_code if errors else None,
        errors=errors,
    )
