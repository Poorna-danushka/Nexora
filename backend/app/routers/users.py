from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new Nexora user with full student details."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    hashed = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed,
        university=user_data.university,
        degree=user_data.degree,
        graduation_year=user_data.graduation_year,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the user.",
        )

    return new_user
