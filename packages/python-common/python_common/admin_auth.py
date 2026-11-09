"""
Autorização administrativa para serviços que não possuem base de usuários própria (ex.: LPS Config).

O chamador precisa apresentar um JWT Bearer válido (assinatura verificada). Em seguida, o papel e o
estado ATUAIS da conta são confirmados no Auth Service via endpoint interno, de forma que rebaixar ou
desativar um administrador tenha efeito imediato mesmo com um JWT antigo ainda não expirado.
Falha fechada: se o Auth Service não puder confirmar, o acesso é negado.
"""
import os
from typing import Any, Optional

import httpx

from python_common.errors import AppError
from python_common.security import (
    HEADER_INTERNAL_TOKEN,
    decode_access_token,
    get_internal_service_key,
    role_has_permission,
)

DEFAULT_AUTH_URL = "http://localhost:8001"


def fetch_user_authz(user_id: str) -> Optional[dict[str, Any]]:
    """Consulta o Auth Service (endpoint interno). Retorna None se o usuário não existir."""
    base = os.environ.get("AUTH_SERVICE_URL", DEFAULT_AUTH_URL).rstrip("/")
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(
                f"{base}/internal/v1/auth/users/{user_id}/authz",
                headers={HEADER_INTERNAL_TOKEN: get_internal_service_key()},
            )
    except httpx.RequestError:
        raise AppError(
            status_code=503,
            code="AUTH_SERVICE_UNAVAILABLE",
            message="Não foi possível validar as permissões do usuário no Auth Service.",
        )
    if resp.status_code == 404:
        return None
    if resp.status_code != 200:
        raise AppError(
            status_code=502,
            code="AUTH_SERVICE_ERROR",
            message="Erro ao validar permissões do usuário no Auth Service.",
        )
    return resp.json()


def require_permission(authorization: Optional[str], permission: str) -> dict[str, Any]:
    """Exige JWT válido e conta ativa com a permissão informada. Retorna {id, email, role}."""
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(status_code=401, code="UNAUTHORIZED", message="Autenticação necessária.")

    claims = decode_access_token(authorization.split(" ", 1)[1])
    user_id = claims.get("user_id") or claims.get("sub")
    authz = fetch_user_authz(str(user_id)) if user_id else None

    if not authz or not authz.get("is_active") or not role_has_permission(authz.get("role"), permission):
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="Operação restrita a administradores da plataforma.",
        )
    return {"id": authz["id"], "email": authz.get("email"), "role": authz["role"]}
