import logging
from dataclasses import dataclass

from app.models.device_token import DeviceToken
from app.services.firebase_service import (
    FirebaseConfigurationError,
    send_message,
)
from app.services.notification_history_service import create_history

logger = logging.getLogger(__name__)


class NotificationServiceError(Exception):
    pass


@dataclass(frozen=True)
class NotificationPayload:
    title: str
    body: str
    data: dict[str, str]


@dataclass(frozen=True)
class NotificationResult:
    attempted: int
    sent: int
    deactivated: int
    failed: int


def _is_permanent_token_error(error: Exception) -> bool:
    return str(getattr(error, "code", "")).lower() in {
        "unregistered",
        "invalid-argument",
        "invalid_argument",
        "invalid_registration_token",
    }


def send_to_user(db, user_id: int, payload: NotificationPayload) -> NotificationResult:
    try:
        from firebase_admin import messaging
    except ImportError as exc:
        raise NotificationServiceError("Notification service is unavailable.") from exc

    devices = db.query(DeviceToken).filter(
        DeviceToken.user_id == user_id,
        DeviceToken.is_active.is_(True),
    ).all()
    notification_type = payload.data.get("type", "general")
    source_key = None
    if payload.data.get("reminder_id"):
        source_key = f"reminder:{payload.data['reminder_id']}"
    create_history(
        db,
        user_id,
        payload.title,
        payload.body,
        notification_type,
        payload.data,
        source_key,
    )
    db.commit()
    result = NotificationResult(attempted=len(devices), sent=0, deactivated=0, failed=0)

    for device in devices:
        message = messaging.Message(
            token=device.token,
            notification=messaging.Notification(
                title=payload.title,
                body=payload.body,
            ),
            data=payload.data,
        )
        try:
            send_message(message)
            result = NotificationResult(
                result.attempted, result.sent + 1, result.deactivated, result.failed
            )
        except FirebaseConfigurationError as exc:
            raise NotificationServiceError("Notification service is unavailable.") from exc
        except Exception as exc:
            if _is_permanent_token_error(exc):
                device.is_active = False
                result = NotificationResult(
                    result.attempted, result.sent, result.deactivated + 1, result.failed
                )
            else:
                result = NotificationResult(
                    result.attempted, result.sent, result.deactivated, result.failed + 1
                )
            logger.warning("FCM delivery failed for one device: %s", type(exc).__name__)

    if result.deactivated:
        db.commit()
    return result
