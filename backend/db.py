"""Database engine, session, and declarative base."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

# Neon closes idle connections server-side, so a pooled connection can be dead
# by the time it is handed out — surfacing as "SSL connection has been closed
# unexpectedly" on whatever endpoint happened to draw it, not on any one route.
#   pool_pre_ping: cheap liveness check on checkout; a stale connection is
#                  discarded and replaced instead of raising.
#   pool_recycle:  proactively retire connections before the idle timeout, so
#                  most of them never reach the stale state in the first place.
# Not applied to SQLite: there is no server to drop the connection, and
# recycling an in-memory database would silently discard its contents.
pool_args = {} if _is_sqlite else {"pool_pre_ping": True, "pool_recycle": 280}

engine = create_engine(settings.database_url, connect_args=connect_args,
                       future=True, **pool_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
