from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import get_database_url


def get_engine(url: str | None = None) -> Engine:
    return create_engine(url or get_database_url(), future=True)


def init_db(engine: Engine) -> None:
    from app.models import Base

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(engine)
