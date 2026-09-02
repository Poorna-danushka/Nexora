from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# UserCreate — the shape of data the client sends when registering
# ---------------------------------------------------------------------------
# This schema validates what comes IN through POST /users.
# It contains `password` (plain text from the client) — NOT `password_hash`.
# The router will be responsible for hashing it before touching the database.
# (Hashing is implemented in Phase 4. For now, we validate but don't persist.)
class UserCreate(BaseModel):
    # EmailStr is a special Pydantic type that validates proper email format.
    # It checks for things like "@" and a valid domain structure.
    # If the client sends "notanemail", Pydantic rejects it automatically.
    email: EmailStr

    # Field(min_length=8) enforces a minimum password length at the API level.
    # The client must send at least 8 characters or Pydantic returns a 422 error.
    # We use str here because this is the raw password from the user.
    # It will NEVER be stored as-is — only its hash will go into the database.
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value: str) -> str:
        """Reject passwords that are only whitespace.

        Field(min_length=8) counts spaces, so "        " (8 spaces) would
        pass the length check. This validator adds the extra rule that the
        password must contain at least some non-whitespace characters.
        """
        if value.strip() == "":
            raise ValueError("Password must not be blank or only whitespace.")
        return value


# ---------------------------------------------------------------------------
# UserResponse — the shape of data we send BACK to the client
# ---------------------------------------------------------------------------
# This schema controls exactly what the client can see after a successful request.
# Notice what is NOT here: password, password_hash.
# Even if we accidentally pass a full SQLAlchemy User object (which has
# password_hash), Pydantic will only include the fields declared here.
class UserResponse(BaseModel):
    id: int
    email: str

    # datetime fields: Pydantic serializes these to ISO 8601 strings automatically.
    # Example: "2026-09-02T21:07:14.129915+05:30"
    created_at: datetime
    updated_at: datetime

    # model_config tells Pydantic how to handle this schema.
    # from_attributes=True (Pydantic v2) allows Pydantic to read data
    # from SQLAlchemy model attributes, not just from plain dictionaries.
    # Without this, passing a SQLAlchemy User object would fail.
    # In Pydantic v1 this was called: class Config: orm_mode = True
    model_config = {"from_attributes": True}
