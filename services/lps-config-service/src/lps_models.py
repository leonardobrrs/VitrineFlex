import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from python_common.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Store(Base):
    __tablename__ = "stores"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    segment = Column(String(32), nullable=False)  # FASHION, TECH, BOOKS (Immutable - ADR-006)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class ProductManifest(Base):
    """
    Manifesto de Produto Versionado da LPS (ADR-006).
    Mantém histórico ordenado; uma nova alteração de features opcionais gera version = version + 1.
    """
    __tablename__ = "product_manifests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    schema_version = Column(String(16), nullable=False, default="1.1.0")
    features_json = Column(Text, nullable=False)  # JSON-encoded features dictionary
    theme_json = Column(Text, nullable=False)     # JSON-encoded theme config (colors, logo, etc.)
    payment_methods_json = Column(Text, nullable=False)  # JSON list
    fulfillment_modes_json = Column(Text, nullable=False)  # JSON list
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
