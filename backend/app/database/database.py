import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv()

# Read the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create the SQLAlchemy engine.
# Neon free tier suspends after inactivity — pool_pre_ping tests connections
# before use, pool_recycle forces reconnects, and pool_timeout prevents hangs.
engine_options: dict = {
    "pool_pre_ping":  True,   # ping before each checkout — detects stale connections
    "pool_recycle":   180,    # recycle connections every 3 min (shorter than Neon's idle timeout)
    "pool_size":      3,      # keep 3 connections warm
    "max_overflow":   5,      # allow up to 8 total under load
    "pool_timeout":   15,     # wait max 15s for a connection before raising
}
if DATABASE_URL and DATABASE_URL.startswith("postgresql+psycopg://"):
    engine_options["connect_args"] = {
        "connect_timeout": 10,  # TCP connect timeout in seconds
    }
engine = create_engine(DATABASE_URL, **engine_options)

# Create a session factory
# A session is a "unit of work" — a temporary conversation with the database.
# autocommit=False means changes are NOT saved until you explicitly call commit()
# autoflush=False means SQLAlchemy won't automatically send pending changes to the DB
# bind=engine connects this session factory to our database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the Base class
# Every SQLAlchemy model (table) we create will inherit from this Base.
# Base.metadata holds information about all those tables.
# Alembic will read Base.metadata to know what the schema should look like.
Base = declarative_base()


# ---------------------------------------------------------------------------
# get_db — Database session dependency for FastAPI
# ---------------------------------------------------------------------------
# This is a FastAPI "dependency" — a function FastAPI calls automatically
# before running any endpoint that declares it as a parameter.
#
# How it works:
#   1. SessionLocal() opens a new database session (a conversation with the DB)
#   2. yield hands that session to the endpoint function
#   3. The endpoint does its work using the session
#   4. When the endpoint finishes (or crashes), Python resumes here
#   5. db.close() closes the session — releasing the connection back to the pool
#
# The try/finally block is critical: it ensures the session is ALWAYS closed,
# even if the endpoint raises an exception. Without this, connections would
# leak and eventually exhaust the connection pool.
#
# Usage in a router:
#   from fastapi import Depends
#   from app.database.database import get_db
#   from sqlalchemy.orm import Session
#
#   def my_endpoint(db: Session = Depends(get_db)):
#       ...
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()