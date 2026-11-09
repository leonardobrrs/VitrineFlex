import os
from sqlalchemy.orm import Session
from python_common.database import DatabaseEngineFactory, Base

db_name = os.environ.get("CATALOG_DB_NAME", "catalog.db")
engine = DatabaseEngineFactory.create_sqlite_engine(db_name)
SessionFactory = DatabaseEngineFactory.create_session_factory(engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Lightweight migration for existing SQLite databases
    with engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(inventory_movements)").fetchall()
            columns = [row[1] for row in result]
            if "variant_id" not in columns and len(columns) > 0:
                conn.exec_driver_sql("ALTER TABLE inventory_movements ADD COLUMN variant_id VARCHAR(36)")
                conn.commit()
        except Exception:
            pass

        try:
            prod_result = conn.exec_driver_sql("PRAGMA table_info(products)").fetchall()
            prod_columns = [row[1] for row in prod_result]
            if "preview_content" not in prod_columns and len(prod_columns) > 0:
                conn.exec_driver_sql("ALTER TABLE products ADD COLUMN preview_content TEXT")
                conn.commit()
        except Exception:
            pass


def get_db():
    session: Session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
