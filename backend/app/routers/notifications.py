from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import NOTIFICATIONS_TEST_ENABLED
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.device_token import DeviceToken
from app.models.user import User
from app.schemas.device_token import DeviceTokenCreate, DeviceTokenResponse
from app.schemas.notification import NotificationSendRequest, NotificationSendResponse
from app.services.notification_service import NotificationServiceError, NotificationPayload, send_to_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/devices", response_model=DeviceTokenResponse)
def register_device(
    data: DeviceTokenCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = db.query(DeviceToken).filter(DeviceToken.token == data.token).first()
    if device is None:
        device = DeviceToken(
            user_id=current_user.id,
            token=data.token,
            platform=data.platform,
            device_id=data.device_id,
            is_active=True,
        )
        db.add(device)
    else:
        device.user_id = current_user.id
        device.platform = data.platform
        device.device_id = data.device_id
        device.is_active = True

    if data.device_id:
        db.query(DeviceToken).filter(
            DeviceToken.user_id == current_user.id,
            DeviceToken.device_id == data.device_id,
            DeviceToken.platform == data.platform,
            DeviceToken.token != data.token,
        ).update({"is_active": False}, synchronize_session=False)

    db.commit()
    db.refresh(device)
    return device


@router.delete("/devices/{token}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_device(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = db.query(DeviceToken).filter(
        DeviceToken.token == token,
        DeviceToken.user_id == current_user.id,
    ).first()
    if device is None:
        raise HTTPException(status_code=404, detail="Device token not found.")
    device.is_active = False
    db.commit()


@router.post("/test", response_model=NotificationSendResponse)
def send_test_notification(
    data: NotificationSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not NOTIFICATIONS_TEST_ENABLED:
        raise HTTPException(status_code=404, detail="Notification test endpoint not found.")
    try:
        result = send_to_user(
            db,
            current_user.id,
            NotificationPayload(title=data.title, body=data.body, data=data.data),
        )
    except NotificationServiceError as exc:
        raise HTTPException(status_code=503, detail="Notification service is unavailable.") from exc
    return result
