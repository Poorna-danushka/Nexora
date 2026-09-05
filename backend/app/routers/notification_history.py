from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.notification_history import NotificationHistory
from app.models.user import User
from app.schemas.notification_history import (
    MarkAllReadResponse,
    NotificationHistoryPage,
    NotificationHistoryResponse,
    UnreadNotificationCount,
)
from app.services.notification_history_service import (
    list_history,
    mark_all_read,
    mark_read,
    unread_count,
)

router = APIRouter(prefix="/notifications/history", tags=["notification history"])


@router.get("", response_model=NotificationHistoryPage)
def get_history(
    page: int = 1,
    limit: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="Invalid pagination parameters.")
    items, total = list_history(db, current_user.id, page, limit, unread_only)
    return NotificationHistoryPage(
        items=items,
        page=page,
        limit=limit,
        total=total,
        has_next=page * limit < total,
    )


@router.get("/unread-count", response_model=UnreadNotificationCount)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UnreadNotificationCount(count=unread_count(db, current_user.id))


@router.patch("/read-all", response_model=MarkAllReadResponse)
def read_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return MarkAllReadResponse(updated=mark_all_read(db, current_user.id))


@router.patch("/{notification_id}/read", response_model=NotificationHistoryResponse)
def read_one(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.query(NotificationHistory).filter(
        NotificationHistory.id == notification_id,
        NotificationHistory.user_id == current_user.id,
    ).first()
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return mark_read(db, notification)
