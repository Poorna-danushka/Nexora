from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import hash_password
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new Nexora user with full student details."""
    normalized_email = user_data.email.lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    hashed = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=normalized_email,
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


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in user_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user
