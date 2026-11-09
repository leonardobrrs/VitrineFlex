import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

Base = declarative_base()


class DatabaseEngineFactory:
    """
    Factory responsible for creating isolated SQLite engines with mandatory WAL mode
    and busy_timeout=5000ms according to ADR-005.
    """

    @staticmethod
    def create_sqlite_engine(db_name_or_path: str | Path, echo: bool = False) -> Engine:
        path = Path(db_name_or_path)
        if not path.is_absolute() and not str(path).startswith("."):
            storage_dir = os.environ.get("DB_STORAGE_DIR", "./data")
            path = Path(storage_dir) / path

        path.parent.mkdir(parents=True, exist_ok=True)
        db_url = f"sqlite:///{path.resolve()}"

        engine = create_engine(
            db_url,
            echo=echo,
            connect_args={"check_same_thread": False},
        )

        @event.listens_for(engine, "connect")
        def configure_sqlite_wal(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")
            cursor.close()

        return engine

    @staticmethod
    def create_session_factory(engine: Engine) -> sessionmaker[Session]:
        return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    """FastAPI dependency to yield database sessions per request"""
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
