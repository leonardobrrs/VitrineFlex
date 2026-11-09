import os
from sqlalchemy.orm import Session
from python_common.database import DatabaseEngineFactory, Base, ensure_sqlite_columns

db_name = os.environ.get("LPS_DB_NAME", "lps.db")
engine = DatabaseEngineFactory.create_sqlite_engine(db_name)
SessionFactory = DatabaseEngineFactory.create_session_factory(engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns(engine, "stores", {
        "status": "VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'",
        "archived_at": "DATETIME",
        "archived_by": "VARCHAR(36)",
    })


def get_db():
    session: Session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
