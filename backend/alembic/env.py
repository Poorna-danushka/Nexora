import os
import sys
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Make sure Python can find our app package.
# sys.path is the list of directories Python searches when you do `import`.
# We add the backend/ directory to it so that `from app.database...` works.
# ---------------------------------------------------------------------------
# os.path.dirname(__file__) → the folder containing this env.py (alembic/)
# os.path.join(..., "..") → one level up → backend/
# os.path.abspath() → converts to an absolute path to avoid ambiguity
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load our .env file so DATABASE_URL is available in the environment
load_dotenv()

# Import Base and all models via base.py so Alembic discovers all tables.
from app.database.base import Base  # noqa: F401, E402


# This is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override sqlalchemy.url with the value from our .env file.
# This way, our database credentials never appear in alembic.ini or env.py.
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata tells Alembic what the schema SHOULD look like.
# By pointing to Base.metadata, Alembic can compare current DB state vs our models
# and auto-generate the correct migration.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    In offline mode, Alembic does not connect to the database.
    It just generates the SQL script that WOULD be run.
    Useful for reviewing migrations before applying them.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In online mode, Alembic connects to the database and applies
    the migrations directly. This is the mode we use most of the time.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


# Alembic checks whether it was called with --sql flag (offline) or not (online)
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
