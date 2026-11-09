import os
import time
from typing import Any, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from python_common.errors import AppError

# HTTP Header Constants (ADR-007)
HEADER_USER_ID = "X-User-ID"
HEADER_USER_ROLE = "X-User-Role"
HEADER_STORE_ID = "X-Store-ID"
HEADER_REQUEST_ID = "X-Request-ID"
HEADER_INTERNAL_TOKEN = "X-Internal-Token"

DEFAULT_JWT_SECRET = "dev-jwt-secret-key-vitrineflex-ufal-2026-very-secure"
DEFAULT_INTERNAL_KEY = "dev-internal-service-token-vitrineflex-ufal-2026"

_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def get_jwt_secret_key() -> str:
    return os.environ.get("JWT_SECRET_KEY", DEFAULT_JWT_SECRET)


def get_internal_service_key() -> str:
    return os.environ.get("INTERNAL_SERVICE_KEY", DEFAULT_INTERNAL_KEY)


def hash_password(plain_password: str) -> str:
    """Hash password using Argon2id."""
    return _hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(
    user_id: str,
    email: str,
    role: str = "CUSTOMER",
    expires_in_seconds: int = 86400,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, get_jwt_secret_key(), algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, get_jwt_secret_key(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise AppError(status_code=401, code="TOKEN_EXPIRED", message="O token de autenticação expirou.")
    except jwt.InvalidTokenError:
        raise AppError(status_code=401, code="INVALID_TOKEN", message="O token de autenticação é inválido.")


def validate_internal_token(provided_token: Optional[str]) -> None:
    """
    Validates that X-Internal-Token matches INTERNAL_SERVICE_KEY.
    Raises AppError(403, INVALID_INTERNAL_TOKEN) if missing or mismatched.
    """
    expected = get_internal_service_key()
    if not provided_token or provided_token.strip() != expected.strip():
        raise AppError(
            status_code=403,
            code="INVALID_INTERNAL_TOKEN",
            message="Acesso negado: segredo interno de serviço ausente ou inválido.",
        )
