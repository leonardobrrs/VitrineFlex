import os
from sqlalchemy import text
from sqlalchemy.orm import Session
from python_common.database import DatabaseEngineFactory, Base
import recommendation_models  # noqa: F401

db_name = os.environ.get("RECOMMENDATION_DB_NAME", "recommendations.db")
engine = DatabaseEngineFactory.create_sqlite_engine(db_name)
SessionFactory = DatabaseEngineFactory.create_session_factory(engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_interaction_dedup_ref "
                "ON user_interactions (store_id, event_type, reference_id) "
                "WHERE reference_id IS NOT NULL"
            )
        )
        conn.commit()


def get_db():
    session: Session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
