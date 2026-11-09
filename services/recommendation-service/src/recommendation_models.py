import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Index
from python_common.database import Base


class UserInteraction(Base):
    """
    Tabela persistente de interações comportamentais (PB-20).
    Armazena eventos com timestamp, loja, usuário (se autenticado), produto, categoria e tipo de evento.
    """
    __tablename__ = "user_interactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_id = Column(String(64), nullable=False, index=True)
    user_id = Column(String(64), nullable=True, index=True)
    product_id = Column(String(64), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    event_type = Column(String(32), nullable=False, index=True)  # VIEW, FAVORITE, PURCHASE
    reference_id = Column(String(128), nullable=True, index=True)  # Para desduplicação de chamadas internas repetidas
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    __table_args__ = (
        Index("idx_store_user_cat", "store_id", "user_id", "category"),
        Index("idx_store_prod_event", "store_id", "product_id", "event_type"),
        Index(
            "uq_interaction_dedup_ref",
            "store_id",
            "event_type",
            "reference_id",
            unique=True,
            sqlite_where=Column("reference_id").isnot(None),
        ),
    )
