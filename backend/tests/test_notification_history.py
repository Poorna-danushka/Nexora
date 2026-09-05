from app.models.notification_history import NotificationHistory
from app.services.notification_service import NotificationPayload
from tests.test_users import _auth_headers


def _send(client, headers, title, body="Body", notification_type="general"):
    return client.post(
        "/notifications/test",
        json={"title": title, "body": body, "data": {"type": notification_type}},
        headers=headers,
    )


def test_history_requires_authentication(client):
    assert client.get("/notifications/history").status_code == 401
    assert client.get("/notifications/history/unread-count").status_code == 401
    assert client.patch("/notifications/history/read-all").status_code == 401
    assert client.patch("/notifications/history/1/read").status_code == 401


def test_notification_send_creates_unread_history(client, db, monkeypatch):
    headers = _auth_headers(client, "history-owner@example.com", "History Owner")

    response = _send(client, headers, "Study Reminder", "Read chapter five", "study")

    assert response.status_code == 200
    item = client.get("/notifications/history", headers=headers).json()["items"][0]
    assert item["title"] == "Study Reminder"
    assert item["is_read"] is False
    assert item["read_at"] is None
    assert db.query(NotificationHistory).count() == 1


def test_history_is_owner_scoped_paginated_and_filterable(client):
    owner = _auth_headers(client, "history-page-owner@example.com", "Page Owner")
    other = _auth_headers(client, "history-page-other@example.com", "Page Other")
    for title in ("First", "Second", "Third"):
        _send(client, owner, title)
    _send(client, other, "Other")

    page = client.get("/notifications/history?page=1&limit=2", headers=owner)
    assert page.status_code == 200
    assert page.json()["total"] == 3
    assert page.json()["has_next"] is True
    assert len(page.json()["items"]) == 2
    assert all(item["title"] != "Other" for item in page.json()["items"])
    assert client.get(
        "/notifications/history?unread_only=true", headers=owner
    ).json()["total"] == 3


def test_mark_one_and_all_read_are_idempotent_and_scoped(client, db, monkeypatch):
    owner = _auth_headers(client, "history-read-owner@example.com", "Read Owner")
    other = _auth_headers(client, "history-read-other@example.com", "Read Other")
    _send(client, owner, "One")
    _send(client, owner, "Two")
    _send(client, other, "Private")
    notification_id = client.get("/notifications/history", headers=owner).json()["items"][0]["id"]

    assert client.patch(
        f"/notifications/history/{notification_id}/read", headers=other
    ).status_code == 404
    first = client.patch(
        f"/notifications/history/{notification_id}/read", headers=owner
    )
    second = client.patch(
        f"/notifications/history/{notification_id}/read", headers=owner
    )
    assert first.status_code == second.status_code == 200
    assert first.json()["read_at"] == second.json()["read_at"]
    assert client.get("/notifications/history/unread-count", headers=owner).json()["count"] == 1

    all_read = client.patch("/notifications/history/read-all", headers=owner)
    assert all_read.json()["updated"] == 1
    assert client.get("/notifications/history/unread-count", headers=owner).json()["count"] == 0


def test_reminder_history_is_idempotent_by_source_key(client, db, monkeypatch):
    headers = _auth_headers(client, "history-reminder-owner@example.com", "Reminder History Owner")
    monkeypatch.setattr(
        "app.services.notification_service.send_message",
        lambda message: "message-id",
    )
    payload = NotificationPayload(
        "Reminder: Exam",
        "Review notes",
        {"type": "reminder", "reminder_id": "42"},
    )
    from app.services.notification_service import send_to_user

    send_to_user(db, 1, payload)
    send_to_user(db, 1, payload)
    assert db.query(NotificationHistory).filter(
        NotificationHistory.source_key == "reminder:42"
    ).count() == 1
