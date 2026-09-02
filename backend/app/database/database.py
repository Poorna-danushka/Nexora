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