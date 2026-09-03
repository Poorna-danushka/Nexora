from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectResponse, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["subjects"])


def get_owned_subject(subject_id: int, user: User, db: Session) -> Subject:
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.owner_id == user.id)
        .first()
    )
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    return subject


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    data: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = Subject(owner_id=current_user.id, **data.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("", response_model=list[SubjectResponse])
def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Subject)
        .filter(Subject.owner_id == current_user.id)
        .order_by(Subject.created_at.desc())
        .all()
    )


@router.patch("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    data: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = get_owned_subject(subject_id, current_user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    db.commit()
    db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = get_owned_subject(subject_id, current_user, db)
    db.delete(subject)
    db.commit()
