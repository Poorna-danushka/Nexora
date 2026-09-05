from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.note import Note
from app.models.subject import Subject
from app.models.user import User
from app.schemas.ai import NoteSummaryResponse
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.services.ai import AIConfigurationError, AIInputError, AIProviderError, summarize_note
from app.services.ai_usage import AIUsageLimitError, execute_with_ai_usage

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


@router.post("/{note_id}/summarize", response_model=NoteSummaryResponse)
def summarize_owned_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = get_owned_note(note_id, current_user, db)
    try:
        summary = execute_with_ai_usage(
            db,
            current_user.id,
            "note_summarization",
            lambda: summarize_note(note.title, note.content),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(status_code=429, detail="Rolling 24-hour AI request limit reached.") from exc
    except AIInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except AIConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI summarization is not configured.",
        ) from exc
    except AIProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to summarize note right now.",
        ) from exc
    return NoteSummaryResponse(note_id=note.id, summary=summary)


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
