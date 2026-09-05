from app.models.device_token import DeviceToken
from tests.test_users import _auth_headers


TOKEN = "fcm-token-" + "a" * 30


def test_authenticated_user_registers_device_token(client, db):
    headers = _auth_headers(client, "notifications-owner@example.com", "Notification Owner")

    response = client.post(
        "/notifications/devices",
        json={"token": TOKEN, "platform": "android", "device_id": "device-1"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["platform"] == "android"
    assert response.json()["is_active"] is True
    assert db.query(DeviceToken).count() == 1


def test_duplicate_token_updates_existing_record(client, db):
    headers = _auth_headers(client, "notifications-duplicate@example.com", "Duplicate Owner")
    payload = {"token": TOKEN + "1", "platform": "ios", "device_id": "device-2"}

    first = client.post("/notifications/devices", json=payload, headers=headers)
    second = client.post(
        "/notifications/devices",
        json={**payload, "platform": "android"},
        headers=headers,
    )

    assert first.status_code == second.status_code == 200
    assert second.json()["platform"] == "android"
    assert db.query(DeviceToken).filter(DeviceToken.token == payload["token"]).count() == 1


def test_registering_device_reactivates_token_and_deactivates_replaced_token(client, db):
    headers = _auth_headers(client, "notifications-refresh@example.com", "Refresh Owner")
    old_payload = {"token": TOKEN + "2", "platform": "android", "device_id": "device-3"}
    new_payload = {"token": TOKEN + "3", "platform": "android", "device_id": "device-3"}

    client.post("/notifications/devices", json=old_payload, headers=headers)
    client.post("/notifications/devices", json=new_payload, headers=headers)

    old = db.query(DeviceToken).filter(DeviceToken.token == old_payload["token"]).one()
    new = db.query(DeviceToken).filter(DeviceToken.token == new_payload["token"]).one()
    assert old.is_active is False
    assert new.is_active is True


def test_user_can_only_remove_own_device_token(client):
    owner_headers = _auth_headers(client, "notifications-delete-owner@example.com", "Delete Owner")
    other_headers = _auth_headers(client, "notifications-delete-other@example.com", "Delete Other")
    token = TOKEN + "4"

    client.post(
        "/notifications/devices",
        json={"token": token, "platform": "android"},
        headers=owner_headers,
    )

    forbidden = client.delete(f"/notifications/devices/{token}", headers=other_headers)
    removed = client.delete(f"/notifications/devices/{token}", headers=owner_headers)

    assert forbidden.status_code == 404
    assert removed.status_code == 204


def test_device_token_registration_validates_auth_and_platform(client):
    unauthenticated = client.post(
        "/notifications/devices",
        json={"token": TOKEN + "5", "platform": "android"},
    )
    invalid_platform = client.post(
        "/notifications/devices",
        json={"token": TOKEN + "6", "platform": "windows"},
        headers=_auth_headers(client, "notifications-invalid@example.com", "Invalid Platform"),
    )

    assert unauthenticated.status_code == 401
    assert invalid_platform.status_code == 422
