import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
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
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(String(36), primary_key=True)
    categories = Column(Text, nullable=False, default="[]")  # JSON string of category list
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
