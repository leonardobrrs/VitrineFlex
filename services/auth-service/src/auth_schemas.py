from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")
    name: str = Field(..., min_length=2, description="Nome completo")
    role: Optional[str] = Field("CUSTOMER", description="Papel: CUSTOMER, STORE_ADMIN, LPS_ADMIN")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: str
    store_id: Optional[str] = None
    created_at: datetime


class AdminUserResponse(UserResponse):
    """Visão administrativa: nunca inclui senha, hash ou tokens."""
    is_active: bool
    updated_at: datetime
    deleted_at: Optional[datetime] = None


class AdminUserCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="Senha inicial (mín. 8 caracteres)")
    role: str = Field(..., description="CUSTOMER, STORE_ADMIN ou LPS_ADMIN (escolha explícita)")
    store_id: Optional[str] = Field(None, max_length=64, description="ID da loja vinculada (obrigatório se STORE_ADMIN)")


class AdminUserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    store_id: Optional[str] = Field(None, max_length=64, description="ID da loja vinculada")
    is_active: Optional[bool] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=128)


class RoleInfo(BaseModel):
    role: str
    label: str
    permissions: List[str]


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor_id: str
    actor_email: Optional[str] = None
    target_user_id: Optional[str] = None
    action: str
    details: str
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserPreferencesUpdateRequest(BaseModel):
    categories: List[str] = Field(..., min_length=1, description="Lista de categorias de interesse (mínimo 1)")


class UserPreferencesResponse(BaseModel):
    user_id: str
    categories: List[str]
    updated_at: datetime
