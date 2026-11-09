import json
from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from python_common.errors import AppError
from python_common.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    validate_internal_token,
    HEADER_USER_ID,
    HEADER_INTERNAL_TOKEN,
)
from auth_database import get_db
from auth_models import User, UserPreference
from auth_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    LoginResponse,
    UserPreferencesUpdateRequest,
    UserPreferencesResponse,
)

router = APIRouter()


def resolve_authenticated_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    authorization: Optional[str] = Header(None),
) -> str:
    if x_user_id:
        return x_user_id

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        return payload["user_id"]

    raise AppError(
        status_code=401,
        code="UNAUTHORIZED",
        message="Autenticação necessária para acessar este recurso.",
    )


# --- Public / API Gateway Routes (/api/v1/auth/*) ---


@router.post("/api/v1/auth/register", response_model=UserResponse, status_code=201)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise AppError(
            status_code=409,
            code="EMAIL_ALREADY_EXISTS",
            message="O e-mail informado já está cadastrado na plataforma.",
        )

    hashed_pwd = hash_password(req.password)
    user = User(
        email=req.email,
        password_hash=hashed_pwd,
        name=req.name,
        role=req.role or "CUSTOMER",
    )
    db.add(user)
    db.flush()

    pref = UserPreference(user_id=user.id, categories="[]")
    db.add(pref)
    db.commit()
    db.refresh(user)

    return user


@router.post("/api/v1/auth/login", response_model=LoginResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise AppError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Credenciais inválidas: e-mail ou senha incorretos.",
        )

    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return LoginResponse(access_token=token, token_type="bearer", user=user)


@router.get("/api/v1/auth/me", response_model=UserResponse)
def get_current_user(
    user_id: str = Depends(resolve_authenticated_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AppError(status_code=404, code="USER_NOT_FOUND", message="Usuário não encontrado.")
    return user


@router.post("/api/v1/auth/logout")
def logout_user():
    return {"message": "Sessão encerrada com sucesso."}


@router.put("/api/v1/auth/me/preferences", response_model=UserPreferencesResponse)
def update_my_preferences(
    req: UserPreferencesUpdateRequest,
    user_id: str = Depends(resolve_authenticated_user_id),
    db: Session = Depends(get_db),
):
    cleaned = [c.strip() for c in req.categories if c and c.strip()]
    if not cleaned:
        raise AppError(
            status_code=422,
            code="INVALID_PREFERENCES",
            message="A lista de categorias de interesse deve conter ao menos uma categoria válida.",
        )

    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if not pref:
        pref = UserPreference(user_id=user_id, categories=json.dumps(cleaned))
        db.add(pref)
    else:
        pref.categories = json.dumps(cleaned)

    db.commit()
    db.refresh(pref)

    return UserPreferencesResponse(
        user_id=pref.user_id,
        categories=json.loads(pref.categories),
        updated_at=pref.updated_at,
    )


@router.get("/api/v1/auth/me/preferences", response_model=UserPreferencesResponse)
def get_my_preferences(
    user_id: str = Depends(resolve_authenticated_user_id),
    db: Session = Depends(get_db),
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    categories = json.loads(pref.categories) if pref else []
    updated_at = pref.updated_at if pref else None

    from datetime import datetime, timezone
    return UserPreferencesResponse(
        user_id=user_id,
        categories=categories,
        updated_at=updated_at or datetime.now(timezone.utc),
    )


# --- Internal Service Routes (/internal/v1/*) ---


@router.get("/internal/v1/auth/users/{user_id}/preferences", response_model=UserPreferencesResponse)
def get_user_preferences_internal(
    user_id: str,
    x_internal_token: Optional[str] = Header(None, alias=HEADER_INTERNAL_TOKEN),
    db: Session = Depends(get_db),
):
    validate_internal_token(x_internal_token)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AppError(status_code=404, code="USER_NOT_FOUND", message="Usuário não encontrado.")

    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    categories = json.loads(pref.categories) if pref else []
    from datetime import datetime, timezone

    return UserPreferencesResponse(
        user_id=user_id,
        categories=categories,
        updated_at=pref.updated_at if pref else datetime.now(timezone.utc),
    )
