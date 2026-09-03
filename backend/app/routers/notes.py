from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.note import Note
from app.models.subject import Subject
from app.models.user import User
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


def get_owned_note(note_id: int, user: User, db: Session) -> Note:
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == user.id).first()
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note


def get_owned_subject(subject_id: int, user: User, db: Session) -> Subject:
    subject = db.query(Subject).filter(
        Subject.id == subject_id, Subject.owner_id == user.id
    ).first()
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    return subject


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_subject(data.subject_id, current_user, db)
    note = Note(owner_id=current_user.id, **data.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=list[NoteResponse])
def list_notes(
    subject_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Note).filter(Note.owner_id == current_user.id)
    if subject_id is not None:
        query = query.filter(Note.subject_id == subject_id)
    return query.order_by(Note.updated_at.desc()).all()


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_note(note_id, current_user, db)


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = get_owned_note(note_id, current_user, db)
    updates = data.model_dump(exclude_unset=True)
    if "subject_id" in updates:
        get_owned_subject(updates["subject_id"], current_user, db)
    for field, value in updates.items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = get_owned_note(note_id, current_user, db)
    db.delete(note)
    db.commit()
