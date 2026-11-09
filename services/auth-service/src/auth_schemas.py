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
