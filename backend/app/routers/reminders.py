from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderResponse, ReminderStatus, ReminderType, ReminderUpdate
from app.services.reminder_service import (
    create_reminder,
    delete_reminder,
    get_owned_reminder,
    list_reminders,
    update_reminder,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])


def owned_or_404(db: Session, user: User, reminder_id: int):
    reminder = get_owned_reminder(db, user.id, reminder_id)
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    return reminder


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_reminder(db, current_user.id, data)


@router.get("", response_model=list[ReminderResponse])
def list_all(
    status: ReminderStatus | None = None,
    reminder_type: ReminderType | None = None,
    upcoming: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_reminders(db, current_user.id, status, reminder_type, upcoming)


@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_one(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return owned_or_404(db, current_user, reminder_id)


@router.patch("/{reminder_id}", response_model=ReminderResponse)
def update(
    reminder_id: int,
    data: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = owned_or_404(db, current_user, reminder_id)
    return update_reminder(db, reminder, data)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = owned_or_404(db, current_user, reminder_id)
    delete_reminder(db, reminder)
