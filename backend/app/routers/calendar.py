from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.calendar_event import CalendarEvent
from app.models.subject import Subject
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

router = APIRouter(tags=["calendar"])


def ensure_subject_owner(subject_id: int | None, user: User, db: Session) -> None:
    if subject_id is not None and not db.query(Subject).filter(
        Subject.id == subject_id, Subject.owner_id == user.id
    ).first():
        raise HTTPException(status_code=404, detail="Subject not found.")


def get_owned_event(event_id: int, user: User, db: Session) -> CalendarEvent:
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.owner_id == user.id
    ).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    return event


def validate_update_times(event: CalendarEvent, updates: dict) -> None:
    starts_at = updates.get("starts_at", event.starts_at)
    ends_at = updates.get("ends_at", event.ends_at)
    def as_utc(value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

    if as_utc(ends_at) <= as_utc(starts_at):
        raise HTTPException(status_code=422, detail="Event end must be after event start.")


@router.post("/calendar-events", response_model=CalendarEventResponse, status_code=201)
def create_event(
    data: CalendarEventCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_subject_owner(data.subject_id, user, db)
    event = CalendarEvent(owner_id=user.id, **data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/calendar-events", response_model=list[CalendarEventResponse])
def list_events(
    upcoming_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.owner_id == user.id)
    if upcoming_only:
        query = query.filter(CalendarEvent.ends_at >= datetime.now(timezone.utc))
    return query.order_by(CalendarEvent.starts_at).all()


@router.get("/calendar-events/{event_id}", response_model=CalendarEventResponse)
def get_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_event(event_id, user, db)


@router.patch("/calendar-events/{event_id}", response_model=CalendarEventResponse)
def update_event(
    event_id: int,
    data: CalendarEventUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = get_owned_event(event_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    ensure_subject_owner(updates.get("subject_id"), user, db)
    validate_update_times(event, updates)
    for field, value in updates.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/calendar-events/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = get_owned_event(event_id, user, db)
    db.delete(event)
    db.commit()
