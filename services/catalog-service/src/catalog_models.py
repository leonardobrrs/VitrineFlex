import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from python_common.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False, default="")
    price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    category = Column(String(100), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    preview_content = Column(Text, nullable=True)  # Amostra de leitura prévia para livros (book_preview)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    size = Column(String(32), nullable=False)
    color = Column(String(64), nullable=False)
    sku = Column(String(64), unique=True, nullable=False, index=True)
    stock_quantity = Column(Integer, nullable=False, default=0)


class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    value = Column(String(500), nullable=False)


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    product_id = Column(String(36), nullable=False, index=True)
    variant_id = Column(String(36), nullable=True, index=True)
    operation_id = Column(String(64), nullable=False, index=True)
    movement_type = Column(String(32), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("operation_id", "movement_type", name="uq_operation_movement"),
    )


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "user_id", "product_id", name="uq_user_store_product_fav"),
    )


class BackInStockAlert(Base):
    __tablename__ = "back_in_stock_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    variant_id = Column(String(36), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, NOTIFIED, CANCELLED
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "user_id", "product_id", "variant_id", name="uq_user_store_stock_alert"),
    )
