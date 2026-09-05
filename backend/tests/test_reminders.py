from datetime import datetime, timedelta, timezone

from app.models.reminder import Reminder
from tests.test_users import _auth_headers


def payload(**overrides):
    value = {
        "title": "Study data structures",
        "description": "Review graph algorithms",
        "reminder_type": "study",
        "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "timezone": "Asia/Colombo",
    }
    value.update(overrides)
    return value


def test_authenticated_user_can_create_and_list_reminder(client):
    headers = _auth_headers(client, "reminder-owner@example.com", "Reminder Owner")
    created = client.post("/reminders", json=payload(), headers=headers)

    assert created.status_code == 201
    assert created.json()["notification_sent"] is False
    listed = client.get("/reminders", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["timezone"] == "Asia/Colombo"


def test_reminder_crud_enforces_ownership(client):
    owner = _auth_headers(client, "reminder-crud-owner@example.com", "CRUD Owner")
    other = _auth_headers(client, "reminder-crud-other@example.com", "CRUD Other")
    reminder = client.post("/reminders", json=payload(), headers=owner).json()

    assert client.get(f"/reminders/{reminder['id']}", headers=other).status_code == 404
    assert client.patch(
        f"/reminders/{reminder['id']}",
        json={"title": "Changed"},
        headers=other,
    ).status_code == 404
    assert client.delete(f"/reminders/{reminder['id']}", headers=other).status_code == 404

    updated = client.patch(
        f"/reminders/{reminder['id']}",
        json={"title": "Updated", "status": "completed"},
        headers=owner,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated"
    assert updated.json()["status"] == "completed"
    assert client.delete(f"/reminders/{reminder['id']}", headers=owner).status_code == 204


def test_reminder_validation_and_protected_fields(client, db):
    headers = _auth_headers(client, "reminder-validation@example.com", "Validation Owner")
    assert client.post("/reminders", json=payload(reminder_type="invalid"), headers=headers).status_code == 422
    assert client.post(
        "/reminders",
        json=payload(title="   "),
        headers=headers,
    ).status_code == 422
    assert client.post(
        "/reminders",
        json=payload(timezone="Not/AZone"),
        headers=headers,
    ).status_code == 422
    assert client.post(
        "/reminders",
        json=payload(
            scheduled_at=(datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        ),
        headers=headers,
    ).status_code == 422

    reminder = client.post("/reminders", json=payload(), headers=headers).json()
    response = client.patch(
        f"/reminders/{reminder['id']}",
        json={"notification_sent": True, "user_id": 999},
        headers=headers,
    )
    assert response.status_code == 200
    stored = db.query(Reminder).filter(Reminder.id == reminder["id"]).one()
    assert stored.notification_sent is False
    assert stored.user_id != 999


def test_unauthenticated_user_cannot_create_reminder(client):
    assert client.post("/reminders", json=payload()).status_code == 401


def test_upcoming_filter_only_returns_scheduled_future_reminders(client):
    headers = _auth_headers(client, "reminder-filter@example.com", "Filter Owner")
    client.post("/reminders", json=payload(), headers=headers)
    response = client.get("/reminders?upcoming=true&status=scheduled", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
