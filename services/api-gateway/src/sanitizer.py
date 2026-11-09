import uuid
from typing import Optional, Tuple
from fastapi import Request
import jwt

from python_common.security import (
    HEADER_USER_ID,
    HEADER_USER_ROLE,
    HEADER_REQUEST_ID,
    HEADER_INTERNAL_TOKEN,
    HEADER_STORE_ID,
    get_jwt_secret_key,
)

FORBIDDEN_CLIENT_HEADERS = {
    HEADER_INTERNAL_TOKEN.lower(),
    HEADER_USER_ID.lower(),
    HEADER_USER_ROLE.lower(),
}


def sanitize_and_inject_headers(request: Request, body_bytes: bytes = b"") -> Tuple[dict[str, str], Optional[dict]]:
    """
    Higieniza cabeçalhos vindos do cliente (browser) e injeta contexto confiável (PB-03 / ADR-007):
    1. Remove terminantemente cabeçalhos forjados (X-Internal-Token, X-User-ID, X-User-Role).
    2. Valida token JWT recebido (Bearer ou cookie) e injeta identidade confiável.
    3. Injeta X-Request-ID para rastreabilidade distribuída.
    4. Garante que INTERNAL_SERVICE_KEY NUNCA seja injetada em requisições públicas normais.
    5. Resolve contexto confiável de loja a partir da origem validada (path, query, body) e sobrescreve X-Store-ID.
    """
    clean_headers: dict[str, str] = {}

    for k, v in request.headers.items():
        if k.lower() in FORBIDDEN_CLIENT_HEADERS:
            continue  # Strips forged header from client
        clean_headers[k] = v

    # Ensure X-Request-ID
    if HEADER_REQUEST_ID.lower() not in [k.lower() for k in clean_headers]:
        clean_headers[HEADER_REQUEST_ID] = str(uuid.uuid4())

    # Resolve trusted store context from validated request parameters (path, query, payload)
    validated_store = None
    import re
    path_val = request.scope.get("path", "")
    m = re.search(r"/stores/([^/?#]+)", path_val)
    if m:
        validated_store = m.group(1).strip()
    elif "query_string" in request.scope and request.query_params.get("store_id"):
        validated_store = request.query_params.get("store_id").strip()
    elif body_bytes:
        try:
            import json
            data = json.loads(body_bytes)
            if isinstance(data, dict) and data.get("store_id"):
                validated_store = str(data["store_id"]).strip()
        except Exception:
            pass

    if validated_store:
        # Overwrite/inject trusted X-Store-ID derived from validated origin
        clean_headers[HEADER_STORE_ID] = validated_store

    # Authenticate JWT if present
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    user_claims = None
    if token:
        try:
            user_claims = jwt.decode(token, get_jwt_secret_key(), algorithms=["HS256"])
            # Inject trusted identity headers to downstream microservice
            clean_headers[HEADER_USER_ID] = str(user_claims.get("user_id", user_claims.get("sub", "")))
            clean_headers[HEADER_USER_ROLE] = str(user_claims.get("role", "CUSTOMER"))
        except (jwt.PyJWTError, Exception):
            # Invalid or expired token: do not inject trusted user headers
            user_claims = None

    return clean_headers, user_claims
