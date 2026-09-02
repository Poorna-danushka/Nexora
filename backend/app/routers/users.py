from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

# ---------------------------------------------------------------------------
# APIRouter — a mini-application that groups related endpoints
# ---------------------------------------------------------------------------
# prefix="/users" means every route defined here automatically starts with /users
#   e.g. @router.get("/test") becomes GET /users/test
#        @router.post("") becomes POST /users
#
# tags=["users"] groups these endpoints together in the Swagger UI documentation.
router = APIRouter(
    prefix="/users",
    tags=["users"],
)


# ---------------------------------------------------------------------------
# GET /users/test
# ---------------------------------------------------------------------------
# A simple health-check endpoint for the users router.
# No database interaction, no authentication — just a sanity check.
@router.get("/test")
def test_users_router():
    """Confirm the users router is registered and reachable."""
    return {"message": "Users router is working."}


# ---------------------------------------------------------------------------
# POST /users
# ---------------------------------------------------------------------------
# Registers a new Nexora user.
#
# Full flow:
#   1. FastAPI reads the request body as JSON
#   2. Pydantic validates it against UserCreate (email format, password length)
#      → If invalid, FastAPI returns 422 automatically before this code runs
#   3. We query the database to check if the email is already taken
#      → If taken, we return 409 Conflict
#   4. We hash the plaintext password using Argon2
#      → The plaintext password is NEVER stored or logged
#   5. We create a User SQLAlchemy object with email + password_hash
#   6. We add it to the session, commit it, then refresh it
#      → refresh() re-reads the row from the database so we get the
#         server-generated id, created_at, and updated_at values
#   7. Pydantic shapes the User object into UserResponse
#      → password_hash is excluded automatically (not declared in UserResponse)
#   8. FastAPI returns 201 Created with the UserResponse JSON
#
# response_model=UserResponse → Pydantic filters the return value.
#   Even though we return a full User object, only the fields in
#   UserResponse (id, email, created_at, updated_at) appear in the response.
#   password_hash is silently excluded.
#
# status_code=201 → "201 Created" is the correct HTTP status for a
#   resource that was successfully created. 200 means "OK" (used for GET).
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new Nexora user.

    Validates the request, checks for duplicate emails, hashes the password
    with Argon2, and creates the user in PostgreSQL.
    """
    # ------------------------------------------------------------------
    # Step 1 — Check for duplicate email (application-level check)
    # ------------------------------------------------------------------
    # We query the users table for any existing row with this email.
    # .first() returns the first matching row, or None if nothing matches.
    #
    # Why check here AND have a unique constraint in the database?
    # - This check gives the user a clean, readable 409 error message.
    # - The database unique constraint is the final safety net — if two
    #   requests slip through simultaneously (race condition), the DB
    #   will still refuse the second insert with an IntegrityError.
    # - Both layers are needed. The app check is for user experience;
    #   the DB constraint is for data integrity.
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # ------------------------------------------------------------------
    # Step 2 — Hash the password
    # ------------------------------------------------------------------
    # hash_password() takes the raw plaintext password and returns an
    # Argon2 hash string. After this line, we discard user_data.password
    # entirely — it is never stored, logged, or referenced again.
    #
    # Example:
    #   "securepass123"  →  "$argon2id$v=19$m=65536,t=3,p=4$..."
    hashed = hash_password(user_data.password)

    # ------------------------------------------------------------------
    # Step 3 — Build the SQLAlchemy User object
    # ------------------------------------------------------------------
    # We pass email and password_hash to the User model.
    # We do NOT pass id, created_at, or updated_at — the database sets
    # these automatically via the server_default=func.now() we defined.
    new_user = User(
        email=user_data.email,
        password_hash=hashed,
    )

    # ------------------------------------------------------------------
    # Step 4 — Persist to the database
    # ------------------------------------------------------------------
    # db.add(new_user)
    #   Tells SQLAlchemy: "track this object and include it in the next commit."
    #   Nothing is written to PostgreSQL yet at this point.
    #
    # db.commit()
    #   Sends the INSERT statement to PostgreSQL and finalises the transaction.
    #   After this line, the row exists in the database permanently.
    #
    # db.refresh(new_user)
    #   Re-reads the row from the database back into the new_user object.
    #   This is essential because PostgreSQL populated id, created_at, and
    #   updated_at on the server side. Without refresh(), new_user.id would
    #   still be None in Python even though it exists in the database.
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        # If anything goes wrong (e.g., a race-condition duplicate email
        # that slipped past our application-level check), roll back the
        # session so it is not left in a broken state, then re-raise.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the user.",
        )

    # ------------------------------------------------------------------
    # Step 5 — Return the created user
    # ------------------------------------------------------------------
    # We return the SQLAlchemy User object directly.
    # FastAPI passes it through UserResponse (because of response_model=UserResponse).
    # UserResponse only declares id, email, created_at, updated_at —
    # so password_hash is automatically excluded from the JSON response.
    return new_user
