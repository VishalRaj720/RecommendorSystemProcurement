from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_database_url

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine(url: str | None = None) -> Engine:
    global _engine
    if url:
        return create_engine(url, connect_args={"check_same_thread": False}, future=True)
    if _engine is None:
        db_url = get_database_url()
        # Default fallback to sqlite if user forgot to change .env
        if db_url.startswith("postgresql"):
            db_url = "sqlite:///./bis_recommend_v2.db"
        return create_engine(db_url, connect_args={"check_same_thread": False}, future=True)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)
    return _SessionLocal


def get_session() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def init_db(engine: Engine) -> None:
    from app.models import Base
    pass


def ping_db() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
