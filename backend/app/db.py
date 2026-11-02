from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


def _url() -> str:
    url = get_settings().database_url
    # Render/Heroku give "postgres://", SQLAlchemy needs "postgresql://"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


_url_value = _url()
engine = create_engine(
    _url_value,
    connect_args={"check_same_thread": False} if _url_value.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
