import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv()

# Read the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Create the SQLAlchemy engine
# The engine is the core interface to the database.
# It manages the connection pool and translates Python calls into SQL.
engine = create_engine(DATABASE_URL)

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