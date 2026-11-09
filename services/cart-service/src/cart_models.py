import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from python_common.database import Base


class Cart(Base):
    __tablename__ = "carts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan", order_by="CartItem.created_at")

    __table_args__ = (
        UniqueConstraint("store_id", "user_id", name="uq_cart_store_user"),
    )


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cart_id = Column(String(36), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), nullable=False, index=True)
    variant_id = Column(String(36), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")

    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", "variant_id", name="uq_cart_item"),
    )
