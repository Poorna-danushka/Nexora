from datetime import datetime, timedelta, timezone

from app.models.reminder import Reminder
from app.services import reminder_scheduler
from app.services.notification_service import NotificationResult
from tests.test_users import _auth_headers


def create_reminder(client, headers, scheduled_at, **extra):
    payload = {
        "title": extra.pop("title", "Review algorithms"),
        "description": extra.pop("description", "Review graph algorithms"),
        "reminder_type": "study",
        "scheduled_at": scheduled_at.isoformat(),
        "timezone": "UTC",
    }
    payload.update(extra)
    return client.post("/reminders", json=payload, headers=headers).json()


def test_due_reminder_is_sent_and_marked(client, db, monkeypatch):
    headers = _auth_headers(client, "scheduler-owner@example.com", "Scheduler Owner")
    reminder = create_reminder(
        client,
        headers,
        datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db.query(Reminder).filter(Reminder.id == reminder["id"]).update(
        {"scheduled_at": datetime.now(timezone.utc) - timedelta(minutes=1)}
    )
    db.commit()
    sent = []
    monkeypatch.setattr(
        reminder_scheduler,
        "send_to_user",
        lambda db, user_id, payload: (
            sent.append((user_id, payload.title, payload.body))
            or NotificationResult(1, 1, 0, 0)
        ),
    )

    result = reminder_scheduler.process_due_reminders(
        session_factory=lambda: db,
        now=datetime.now(timezone.utc),
        close_session=False,
    )

    assert result == {"processed": 1, "sent": 1, "failed": 0, "no_devices": 0}
    assert sent[0][0] > 0
    assert sent[0][1] == "Reminder: Review algorithms"
    assert db.query(Reminder).filter(Reminder.id == reminder["id"]).one().notification_sent is True


def test_future_completed_cancelled_and_sent_reminders_are_ignored(db):
    user_id = 1
    now = datetime.now(timezone.utc)
    db.add_all(
        [
            Reminder(
                user_id=user_id,
                title="future",
                reminder_type="study",
                scheduled_at=now + timedelta(hours=1),
                timezone="UTC",
            ),
            Reminder(
                user_id=user_id,
                title="completed",
                reminder_type="study",
                scheduled_at=now - timedelta(minutes=1),
                timezone="UTC",
                status="completed",
            ),
            Reminder(
                user_id=user_id,
                title="cancelled",
                reminder_type="study",
                scheduled_at=now - timedelta(minutes=1),
                timezone="UTC",
                status="cancelled",
            ),
            Reminder(
                user_id=user_id,
                title="sent",
                reminder_type="study",
                scheduled_at=now - timedelta(minutes=1),
                timezone="UTC",
                notification_sent=True,
            ),
        ]
    )
    db.commit()

    result = reminder_scheduler.process_due_reminders(
        session_factory=lambda: db,
        now=now,
        close_session=False,
    )

    assert result == {"processed": 0, "sent": 0, "failed": 0, "no_devices": 0}


def test_temporary_failure_leaves_reminder_retryable(db, monkeypatch):
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        user_id=1,
        title="Retry me",
        reminder_type="general",
        scheduled_at=now - timedelta(minutes=1),
        timezone="UTC",
    )
    db.add(reminder)
    db.commit()
    reminder_id = reminder.id
    monkeypatch.setattr(
        reminder_scheduler,
        "send_to_user",
        lambda *args: (_ for _ in ()).throw(
            reminder_scheduler.NotificationServiceError("temporary")
        ),
    )

    result = reminder_scheduler.process_due_reminders(
        session_factory=lambda: db, now=now, close_session=False
    )

    stored = db.query(Reminder).filter(Reminder.id == reminder_id).one()
    assert result["failed"] == 1
    assert stored.notification_sent is False
    assert stored.notification_claimed_at is None


def test_no_devices_is_not_marked_sent(db, monkeypatch):
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        user_id=1,
        title="No device",
        reminder_type="general",
        scheduled_at=now - timedelta(minutes=1),
        timezone="UTC",
    )
    db.add(reminder)
    db.commit()
    reminder_id = reminder.id
    monkeypatch.setattr(
        reminder_scheduler,
        "send_to_user",
        lambda *args: NotificationResult(0, 0, 0, 0),
    )

    result = reminder_scheduler.process_due_reminders(
        session_factory=lambda: db, now=now, close_session=False
    )

    stored = db.query(Reminder).filter(Reminder.id == reminder_id).one()
    assert result["no_devices"] == 1
    assert stored.notification_sent is False
    assert stored.notification_claimed_at is not None


def test_one_failure_does_not_stop_other_due_reminders(db, monkeypatch):
    now = datetime.now(timezone.utc)
    db.add_all(
        [
            Reminder(
                user_id=1,
                title="A",
                reminder_type="general",
                scheduled_at=now - timedelta(minutes=1),
                timezone="UTC",
            ),
            Reminder(
                user_id=1,
                title="B",
                reminder_type="general",
                scheduled_at=now - timedelta(minutes=1),
                timezone="UTC",
            ),
        ]
    )
    db.commit()

    def send(db, user_id, payload):
        if payload.title.endswith("A"):
            raise reminder_scheduler.NotificationServiceError("temporary")
        return NotificationResult(1, 1, 0, 0)

    monkeypatch.setattr(reminder_scheduler, "send_to_user", send)
    result = reminder_scheduler.process_due_reminders(
        session_factory=lambda: db, now=now, close_session=False
    )

    assert result["processed"] == 2
    assert result["failed"] == 1
    assert result["sent"] == 1


def test_claim_prevents_duplicate_processing_of_same_reminder(db):
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        user_id=1,
        title="Claim once",
        reminder_type="general",
        scheduled_at=now - timedelta(minutes=1),
        timezone="UTC",
    )
    db.add(reminder)
    db.commit()

    first = reminder_scheduler.claim_due_reminder(db, now)
    second = reminder_scheduler.claim_due_reminder(db, now)

    assert first is not None
    assert second is None


def test_scheduler_registers_one_interval_job():
    scheduler = reminder_scheduler.create_reminder_scheduler()
    try:
        scheduler.start()
        jobs = scheduler.get_jobs()
        assert len(jobs) == 1
        assert jobs[0].id == "process_due_reminders"
    finally:
        scheduler.shutdown(wait=False)
