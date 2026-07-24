"""Alembic environment.

The database URL and the target schema both come from the application itself:
- URL: settings.database_url (the same DATABASE_URL env var the app uses), so
  migrations always target whatever the app targets — SQLite in dev, Postgres
  in production.
- Metadata: backend.models.Base.metadata, so `--autogenerate` compares against
  the live ORM models.

render_as_batch is enabled for SQLite so ALTER-style migrations work there too
(SQLite can't ALTER columns natively); on Postgres it's a harmless no-op.
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Application config + models (the single source of truth for the schema).
from backend.config import settings
from backend.db import Base
from backend import models  # noqa: F401  (import registers all tables on Base)

config = context.config

# Point Alembic at the app's database, without hard-coding it in alembic.ini.
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL, no DBAPI needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=_is_sqlite(url or ""),
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=connection.dialect.name == "sqlite",
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
