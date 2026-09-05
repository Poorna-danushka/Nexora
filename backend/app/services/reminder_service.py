from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate


def get_owned_reminder(db: Session, user_id: int, reminder_id: int) -> Reminder | None:
    return db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == user_id,
    ).first()


def create_reminder(db: Session, user_id: int, data: ReminderCreate) -> Reminder:
    reminder = Reminder(user_id=user_id, **data.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def list_reminders(
    db: Session,
    user_id: int,
    status: str | None = None,
    reminder_type: str | None = None,
    upcoming: bool = False,
) -> list[Reminder]:
    query = db.query(Reminder).filter(Reminder.user_id == user_id)
    if status:
        query = query.filter(Reminder.status == status)
    if reminder_type:
        query = query.filter(Reminder.reminder_type == reminder_type)
    if upcoming:
        query = query.filter(
            Reminder.status == "scheduled",
            Reminder.scheduled_at >= datetime.now(timezone.utc),
        )
    return query.order_by(Reminder.scheduled_at.asc()).all()


def update_reminder(db: Session, reminder: Reminder, data: ReminderUpdate) -> Reminder:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, reminder: Reminder) -> None:
    db.delete(reminder)
    db.commit()
