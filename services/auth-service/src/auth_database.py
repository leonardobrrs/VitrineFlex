import os
from sqlalchemy.orm import Session
from python_common.database import DatabaseEngineFactory, Base, ensure_sqlite_columns

db_name = os.environ.get("AUTH_DB_NAME", "auth.db")
engine = DatabaseEngineFactory.create_sqlite_engine(db_name)
SessionFactory = DatabaseEngineFactory.create_session_factory(engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Migração aditiva para bancos criados antes do gerenciamento de usuários
    ensure_sqlite_columns(engine, "users", {
        "is_active": "BOOLEAN NOT NULL DEFAULT 1",
        "deleted_at": "DATETIME",
    })


def get_db():
    session: Session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
