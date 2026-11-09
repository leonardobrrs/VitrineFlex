import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Integer, DateTime
from python_common.database import Base


class ShippingQuoteRecord(Base):
    __tablename__ = "shipping_quotes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(36), nullable=False, index=True)
    zip_code = Column(String(10), nullable=False)
    modality = Column(String(30), nullable=False)
    cost = Column(Numeric(10, 2), nullable=False)
    estimated_days = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
