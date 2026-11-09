import os
from sqlalchemy.orm import Session
from python_common.database import DatabaseEngineFactory, Base

db_name = os.environ.get("CART_DB_NAME", "cart.db")
engine = DatabaseEngineFactory.create_sqlite_engine(db_name)
SessionFactory = DatabaseEngineFactory.create_session_factory(engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    session: Session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
