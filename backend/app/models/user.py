from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class User(Base):
    """Represents a registered Nexora user.

    This is the central authentication table.
    Other tables (profiles, notes, jobs, etc.) will reference this one
    through foreign keys in future phases.
    """

    # __tablename__ tells SQLAlchemy (and PostgreSQL) the actual table name.
    # Convention: lowercase, plural, underscores — not "User" or "Users".
    __tablename__ = "users"

    # -------------------------------------------------------------------------
    # id
    # -------------------------------------------------------------------------
    # Mapped[int] → this column holds integers, is required (NOT NULL)
    # primary_key=True → uniquely identifies each row; PostgreSQL auto-increments it
    # NOTE: We do NOT set index=True here.
    # PostgreSQL automatically creates an index for every primary key (users_pkey).
    # Adding index=True would create a second, redundant ix_users_id index
    # that wastes storage and adds overhead on every INSERT with no benefit.
    id: Mapped[int] = mapped_column(primary_key=True)

    # -------------------------------------------------------------------------
    # email
    # -------------------------------------------------------------------------
    # String(255) → up to 255 characters (standard max for email addresses)
    # unique=True → PostgreSQL enforces that no two rows can have the same email
    # index=True  → creates a database index for fast lookups during login
    # Mapped[str] → required, cannot be NULL
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)

    # -------------------------------------------------------------------------
    # password_hash
    # -------------------------------------------------------------------------
    # We NEVER store a plain password.
    # This column holds the bcrypt hash of the user's password.
    # String(255) is more than enough for bcrypt hashes (~60 chars).
    # Mapped[str] → required, cannot be NULL
    password_hash: Mapped[str] = mapped_column(String(255))

    # -------------------------------------------------------------------------
    # created_at
    # -------------------------------------------------------------------------
    # Records when this row was first inserted.
    # timezone=True → stores the time with UTC timezone info (best practice)
    # server_default=func.now() → PostgreSQL sets this automatically on INSERT.
    #   We use server_default (runs on the DB side) rather than a Python default
    #   so the timestamp is always consistent regardless of the Python server's timezone.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # -------------------------------------------------------------------------
    # updated_at
    # -------------------------------------------------------------------------
    # Records when this row was last modified.
    # server_default=func.now() → set automatically on INSERT
    # onupdate=func.now() → automatically refreshed on every UPDATE
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
