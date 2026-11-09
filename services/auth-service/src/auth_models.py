import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean
from python_common.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="CUSTOMER")
    is_active = Column(Boolean, nullable=False, default=True)
    deleted_at = Column(DateTime, nullable=True)  # exclusão lógica (preserva histórico de pedidos)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class UserAuditLog(Base):
    """Auditoria de ações administrativas sobre contas. Nunca armazena senhas, hashes ou tokens."""
    __tablename__ = "user_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), nullable=False, index=True)
    actor_email = Column(String(255), nullable=True)
    target_user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(64), nullable=False)
    details = Column(Text, nullable=False, default="{}")  # JSON sem dados sensíveis
    created_at = Column(DateTime, default=utc_now, nullable=False)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(String(36), primary_key=True)
    categories = Column(Text, nullable=False, default="[]")  # JSON string of category list
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
