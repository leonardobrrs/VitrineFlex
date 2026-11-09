import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, Text, UniqueConstraint
from python_common.database import Base


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    order_id = Column(String(36), nullable=False, index=True)
    idempotency_key = Column(String(128), nullable=False, index=True)
    request_payload_hash = Column(String(64), nullable=False)
    payment_method = Column(String(20), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    execution_token = Column(String(64), nullable=True)
    transaction_id = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("store_id", "idempotency_key", name="uq_payment_store_idempotency"),
    )
