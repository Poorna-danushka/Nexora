import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import sessionmaker

from app.core.config import REMINDER_SCHEDULER_INTERVAL_SECONDS
from app.database.database import SessionLocal
from app.models.reminder import Reminder
from app.services.notification_service import (
    NotificationPayload,
    NotificationServiceError,
    NotificationResult,
    send_to_user,
)

logger = logging.getLogger(__name__)
CLAIM_TIMEOUT_SECONDS = max(60, REMINDER_SCHEDULER_INTERVAL_SECONDS * 3)


def claim_due_reminder(
    db, now: datetime, excluded_ids: set[int] | None = None
) -> Reminder | None:
    cutoff = now - timedelta(seconds=CLAIM_TIMEOUT_SECONDS)
    query = db.query(Reminder).filter(
        Reminder.status == "scheduled",
        Reminder.notification_sent.is_(False),
        Reminder.scheduled_at <= now,
        or_(
            Reminder.notification_claimed_at.is_(None),
            Reminder.notification_claimed_at < cutoff,
        ),
    )
    if excluded_ids:
        query = query.filter(Reminder.id.not_in(excluded_ids))
    reminder = query.order_by(Reminder.id.asc()).with_for_update(skip_locked=True).first()
    if reminder is None:
        return None
    reminder.notification_claimed_at = now
    db.commit()
    return reminder


def process_due_reminders(
    session_factory: sessionmaker = SessionLocal,
    now: datetime | None = None,
    close_session: bool = True,
) -> dict[str, int]:
    current_time = now or datetime.now(timezone.utc)
    processed = sent = failed = no_devices = 0
    processed_ids: set[int] = set()
    db = session_factory()
    try:
        while True:
            reminder = claim_due_reminder(db, current_time, processed_ids)
            if reminder is None:
                break
            reminder_id = reminder.id
            processed_ids.add(reminder_id)
            processed += 1
            payload = NotificationPayload(
                title=f"Reminder: {reminder.title}",
                body=reminder.description or "You have a scheduled reminder.",
                data={"type": "reminder", "screen": "planning", "reminder_id": str(reminder.id)},
            )
            try:
                result: NotificationResult = send_to_user(db, reminder.user_id, payload)
                if result.attempted == 0:
                    no_devices += 1
                    # Retain the claim briefly so an unregistered device does not
                    # cause a provider lookup on every scheduler tick.
                    db.commit()
                elif result.failed == 0:
                    reminder.notification_sent = True
                    reminder.notification_claimed_at = None
                    db.commit()
                    sent += 1
                else:
                    reminder.notification_claimed_at = None
                    db.commit()
                    failed += 1
            except NotificationServiceError:
                claimed = db.query(Reminder).filter(Reminder.id == reminder_id).first()
                if claimed:
                    claimed.notification_claimed_at = None
                    db.commit()
                failed += 1
                logger.exception("Reminder notification failed for reminder %s.", reminder_id)
            except Exception:
                db.rollback()
                claimed = db.query(Reminder).filter(Reminder.id == reminder_id).first()
                if claimed:
                    claimed.notification_claimed_at = None
                    db.commit()
                failed += 1
                logger.exception("Unexpected reminder processing failure for reminder %s.", reminder_id)
    finally:
        if close_session:
            db.close()
    return {
        "processed": processed,
        "sent": sent,
        "failed": failed,
        "no_devices": no_devices,
    }


def create_reminder_scheduler():
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        process_due_reminders,
        "interval",
        seconds=REMINDER_SCHEDULER_INTERVAL_SECONDS,
        id="process_due_reminders",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    return scheduler
