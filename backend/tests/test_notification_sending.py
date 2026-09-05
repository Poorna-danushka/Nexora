from app.models.device_token import DeviceToken
from app.services import notification_service
from app.services.notification_service import NotificationPayload, NotificationResult
from tests.test_users import _auth_headers


def _register(client, headers, token):
    return client.post(
        "/notifications/devices",
        json={"token": token, "platform": "android"},
        headers=headers,
    )


def test_authenticated_user_can_trigger_test_notification(client, monkeypatch):
    headers = _auth_headers(client, "send-owner@example.com", "Send Owner")
    _register(client, headers, "send-token-" + "a" * 30)
    monkeypatch.setattr(
        "app.routers.notifications.send_to_user",
        lambda db, user_id, payload: NotificationResult(1, 1, 0, 0),
    )

    response = client.post(
        "/notifications/test",
        json={"title": "Nexora Test", "body": "Hello", "data": {"type": "test"}},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {"attempted": 1, "sent": 1, "deactivated": 0, "failed": 0}


def test_notification_service_handles_multiple_devices_and_invalid_tokens(db, monkeypatch):
    db.add_all(
        [
            DeviceToken(user_id=1, token="valid-token-" + "a" * 30, platform="android"),
            DeviceToken(user_id=1, token="invalid-token-" + "b" * 30, platform="ios"),
            DeviceToken(user_id=1, token="temporary-token-" + "c" * 30, platform="android"),
        ]
    )
    db.commit()

    class PermanentError(Exception):
        code = "unregistered"

    def fake_send(message):
        if message.token.startswith("invalid"):
            raise PermanentError
        if message.token.startswith("temporary"):
            raise RuntimeError("temporary provider failure")

    monkeypatch.setattr(notification_service, "send_message", fake_send)
    monkeypatch.setattr(
        "firebase_admin.messaging.Message",
        lambda **kwargs: type("Message", (), kwargs)(),
    )

    result = notification_service.send_to_user(
        db,
        1,
        NotificationPayload("Title", "Body", {"type": "test"}),
    )

    assert result == NotificationResult(3, 1, 1, 1)
    assert db.query(DeviceToken).filter(DeviceToken.token.like("invalid%")).one().is_active is False
    assert db.query(DeviceToken).filter(DeviceToken.token.like("temporary%")).one().is_active is True


def test_unauthenticated_test_notification_is_rejected(client):
    response = client.post(
        "/notifications/test",
        json={"title": "Nexora Test", "body": "Hello"},
    )
    assert response.status_code == 401
