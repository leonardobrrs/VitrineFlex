"""
Endpoints administrativos de usuários (/api/v1/auth/admin/*).

Segurança:
- Todo endpoint exige JWT Bearer com assinatura válida; o papel e o estado da conta são relidos do banco
  a cada requisição (rebaixar/desativar um admin tem efeito imediato nestes endpoints).
- Só LPS_ADMIN ativo possui a permissão `users:manage`.
- Nunca retorna ou registra senhas, hashes ou tokens.
- Proteções: último admin ativo, auto-rebaixamento, auto-desativação e auto-exclusão.
- Exclusão é LÓGICA: preserva a linha (id) referenciada por pedidos e registros financeiros simulados;
  e-mail e nome são anonimizados para liberar o e-mail e minimizar dados pessoais.
"""
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import (
    ALL_ROLES,
    PERM_USERS_MANAGE,
    ROLE_LPS_ADMIN,
    ROLE_PERMISSIONS,
    decode_access_token,
    hash_password,
    role_has_permission,
)
from auth_database import get_db
from auth_models import User, UserPreference, UserAuditLog
from auth_schemas import (
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminUserResponse,
    AuditLogResponse,
    RoleInfo,
)

router = APIRouter()

ROLE_LABELS = {
    "CUSTOMER": "Cliente",
    "STORE_ADMIN": "Administrador de loja",
    "LPS_ADMIN": "Administrador da plataforma",
}


def require_user_admin(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Autoriza com base no JWT verificado + papel/estado atuais no banco (não confia em headers)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(status_code=401, code="UNAUTHORIZED", message="Autenticação necessária.")

    claims = decode_access_token(authorization.split(" ", 1)[1])
    user_id = claims.get("user_id") or claims.get("sub")
    actor = db.query(User).filter(User.id == user_id).first() if user_id else None

    if (
        not actor
        or not actor.is_active
        or actor.deleted_at is not None
        or not role_has_permission(actor.role, PERM_USERS_MANAGE)
    ):
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="Acesso negado: esta operação exige permissão de administrador.",
        )
    return actor


def _audit(db: Session, actor: User, action: str, target: Optional[User], details: Optional[dict] = None) -> None:
    safe = {k: v for k, v in (details or {}).items() if "password" not in k.lower() and "token" not in k.lower()}
    db.add(
        UserAuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            target_user_id=target.id if target else None,
            action=action,
            details=json.dumps(safe, ensure_ascii=False, default=str),
        )
    )


def _is_active_admin(u: User) -> bool:
    return u.role == ROLE_LPS_ADMIN and bool(u.is_active) and u.deleted_at is None


def _other_active_admins(db: Session, exclude_id: str) -> int:
    return (
        db.query(User)
        .filter(
            User.id != exclude_id,
            User.role == ROLE_LPS_ADMIN,
            User.is_active == True,  # noqa: E712
            User.deleted_at.is_(None),
        )
        .count()
    )


def _guard_last_admin(db: Session, target: User) -> None:
    if _is_active_admin(target) and _other_active_admins(db, target.id) == 0:
        raise AppError(
            status_code=409,
            code="LAST_ADMIN_PROTECTED",
            message="Operação bloqueada: este é o último administrador ativo da plataforma.",
        )


def _validate_role(role: str) -> str:
    r = (role or "").upper()
    if r not in ALL_ROLES:
        raise AppError(
            status_code=422,
            code="INVALID_ROLE",
            message=f"Papel inválido. Use um de: {', '.join(ALL_ROLES)}.",
        )
    return r


def _get_user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AppError(status_code=404, code="USER_NOT_FOUND", message="Usuário não encontrado.")
    return user


def _email_taken(db: Session, email: str, exclude_id: Optional[str] = None) -> bool:
    q = db.query(User).filter(func.lower(User.email) == email.lower())
    if exclude_id:
        q = q.filter(User.id != exclude_id)
    return q.first() is not None


@router.get("/api/v1/auth/admin/roles", response_model=List[RoleInfo])
def list_roles(_: User = Depends(require_user_admin)):
    return [
        RoleInfo(role=r, label=ROLE_LABELS.get(r, r), permissions=list(ROLE_PERMISSIONS.get(r, ())))
        for r in ALL_ROLES
    ]


@router.get("/api/v1/auth/admin/users", response_model=List[AdminUserResponse])
def list_users(
    q: Optional[str] = Query(None, description="Busca por nome ou e-mail"),
    role: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    _: User = Depends(require_user_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if not include_deleted:
        query = query.filter(User.deleted_at.is_(None))
    if role:
        query = query.filter(User.role == role.upper())
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        query = query.filter(or_(func.lower(User.name).like(like), func.lower(User.email).like(like)))
    return query.order_by(User.created_at.desc()).all()


@router.post("/api/v1/auth/admin/users", response_model=AdminUserResponse, status_code=201)
def create_user(
    req: AdminUserCreateRequest,
    actor: User = Depends(require_user_admin),
    db: Session = Depends(get_db),
):
    role = _validate_role(req.role)
    if _email_taken(db, req.email):
        raise AppError(status_code=409, code="EMAIL_ALREADY_EXISTS", message="O e-mail informado já está cadastrado.")

    store_id = None
    if role == "STORE_ADMIN" and req.store_id and req.store_id.strip():
        store_id = req.store_id.strip()

    user = User(
        email=str(req.email).lower(),
        name=req.name.strip(),
        role=role,
        store_id=store_id,
        is_active=True,
        password_hash=hash_password(req.password),  # Argon2id
    )
    db.add(user)
    db.flush()
    db.add(UserPreference(user_id=user.id, categories="[]"))
    _audit(db, actor, "USER_CREATED", user, {"email": user.email, "role": role, "store_id": store_id})
    db.commit()
    db.refresh(user)
    return user


@router.get("/api/v1/auth/admin/users/{user_id}", response_model=AdminUserResponse)
def get_user(user_id: str, _: User = Depends(require_user_admin), db: Session = Depends(get_db)):
    return _get_user_or_404(db, user_id)


@router.patch("/api/v1/auth/admin/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: str,
    req: AdminUserUpdateRequest,
    actor: User = Depends(require_user_admin),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(db, user_id)
    if user.deleted_at is not None:
        raise AppError(status_code=409, code="USER_DELETED", message="Usuário excluído não pode ser alterado.")

    is_self = user.id == actor.id
    changes: dict = {}

    if req.role is not None:
        new_role = _validate_role(req.role)
        if new_role != user.role:
            if is_self:
                raise AppError(
                    status_code=409,
                    code="SELF_ROLE_CHANGE_FORBIDDEN",
                    message="Você não pode alterar o seu próprio papel.",
                )
            if user.role == ROLE_LPS_ADMIN:
                _guard_last_admin(db, user)
            changes["role"] = {"from": user.role, "to": new_role}
            user.role = new_role
            if new_role != "STORE_ADMIN" and user.store_id is not None:
                changes["store_id"] = {"from": user.store_id, "to": None}
                user.store_id = None

    if req.store_id is not None:
        cleaned_store = req.store_id.strip() if req.store_id else None
        if user.role == "STORE_ADMIN":
            if cleaned_store != user.store_id:
                changes["store_id"] = {"from": user.store_id, "to": cleaned_store}
                user.store_id = cleaned_store
        else:
            if user.store_id is not None:
                changes["store_id"] = {"from": user.store_id, "to": None}
                user.store_id = None

    if req.is_active is not None and req.is_active != bool(user.is_active):
        if not req.is_active:
            if is_self:
                raise AppError(
                    status_code=409,
                    code="SELF_DEACTIVATION_FORBIDDEN",
                    message="Você não pode desativar a sua própria conta.",
                )
            _guard_last_admin(db, user)
        changes["is_active"] = {"from": bool(user.is_active), "to": req.is_active}
        user.is_active = req.is_active

    if req.name is not None and req.name.strip() != user.name:
        changes["name"] = {"from": user.name, "to": req.name.strip()}
        user.name = req.name.strip()

    if req.email is not None and str(req.email).lower() != user.email.lower():
        if _email_taken(db, str(req.email), exclude_id=user.id):
            raise AppError(status_code=409, code="EMAIL_ALREADY_EXISTS", message="O e-mail informado já está em uso.")
        changes["email"] = {"from": user.email, "to": str(req.email).lower()}
        user.email = str(req.email).lower()

    if req.new_password:
        user.password_hash = hash_password(req.new_password)
        changes["credentials_reset"] = True  # apenas o fato; nunca o valor

    if not changes:
        return user

    action = "USER_ROLE_CHANGED" if "role" in changes else (
        "USER_STATUS_CHANGED" if "is_active" in changes else "USER_UPDATED"
    )
    _audit(db, actor, action, user, changes)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/api/v1/auth/admin/users/{user_id}", response_model=AdminUserResponse)
def delete_user(
    user_id: str,
    actor: User = Depends(require_user_admin),
    db: Session = Depends(get_db),
):
    """Exclusão lógica: desativa, anonimiza e marca `deleted_at`. O id permanece para o histórico."""
    user = _get_user_or_404(db, user_id)
    if user.deleted_at is not None:
        raise AppError(status_code=409, code="USER_DELETED", message="Usuário já foi excluído.")
    if user.id == actor.id:
        raise AppError(
            status_code=409,
            code="SELF_DELETE_FORBIDDEN",
            message="Você não pode excluir a sua própria conta.",
        )
    _guard_last_admin(db, user)

    original_email = user.email
    user.is_active = False
    user.deleted_at = datetime.now(timezone.utc)
    user.email = f"removido-{user.id[:8]}@removed.invalid"
    user.name = "Usuário removido"
    user.password_hash = hash_password(user.id + str(datetime.now(timezone.utc).timestamp()))  # invalida a senha
    db.query(UserPreference).filter(UserPreference.user_id == user.id).delete()
    _audit(db, actor, "USER_DELETED", user, {"email": original_email, "mode": "soft"})
    db.commit()
    db.refresh(user)
    return user


@router.get("/api/v1/auth/admin/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(50, ge=1, le=500),
    _: User = Depends(require_user_admin),
    db: Session = Depends(get_db),
):
    return db.query(UserAuditLog).order_by(UserAuditLog.created_at.desc()).limit(limit).all()
