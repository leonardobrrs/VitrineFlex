import os
from sqlalchemy.orm import Session
from python_common.database import DatabaseEngineFactory, Base

db_name = os.environ.get("PAYMENTS_DB_NAME", "payments.db")
engine = DatabaseEngineFactory.create_sqlite_engine(db_name)
SessionFactory = DatabaseEngineFactory.create_session_factory(engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(payment_attempts)").fetchall()
            columns = [row[1] for row in result]
            if "execution_token" not in columns and len(columns) > 0:
                conn.exec_driver_sql("ALTER TABLE payment_attempts ADD COLUMN execution_token VARCHAR(64)")
                conn.commit()
        except Exception:
            pass


def get_db():
    session: Session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
