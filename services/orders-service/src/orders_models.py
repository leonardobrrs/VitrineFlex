import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from python_common.database import Base


class CheckoutOperation(Base):
    __tablename__ = "checkout_operations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    idempotency_key = Column(String(128), nullable=False, index=True)
    request_payload_hash = Column(String(64), nullable=False)
    order_id = Column(String(36), nullable=True, index=True)
    saga_status = Column(String(32), nullable=False, default="STARTED")
    execution_token = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("store_id", "user_id", "idempotency_key", name="uq_checkout_op"),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    shipping_cost = Column(Numeric(10, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(20), nullable=False)
    fulfillment_mode = Column(String(20), nullable=False)
    shipping_zip_code = Column(String(10), nullable=False)
    shipping_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItemSnapshot", back_populates="order", cascade="all, delete-orphan", order_by="OrderItemSnapshot.id")
    history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at")


class OrderItemSnapshot(Base):
    __tablename__ = "order_item_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), nullable=False)
    variant_id = Column(String(36), nullable=True)
    title = Column(String(255), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    snapshot_attributes_json = Column(Text, nullable=False, default="{}")
    reservation_operation_id = Column(String(128), nullable=False, index=True)

    order = relationship("Order", back_populates="items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(32), nullable=False)
    to_status = Column(String(32), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="history")
