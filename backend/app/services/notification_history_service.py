from datetime import datetime, timezone

from sqlalchemy import func, update
from sqlalchemy.orm import Session

from app.models.notification_history import NotificationHistory


def create_history(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    notification_type: str,
    data: dict[str, str] | None = None,
    source_key: str | None = None,
) -> NotificationHistory:
    if source_key:
        existing = db.query(NotificationHistory).filter(
            NotificationHistory.source_key == source_key
        ).first()
        if existing:
            return existing
    history = NotificationHistory(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        data=data,
        source_key=source_key,
    )
    db.add(history)
    db.flush()
    return history


def list_history(
    db: Session,
    user_id: int,
    page: int,
    limit: int,
    unread_only: bool,
) -> tuple[list[NotificationHistory], int]:
    query = db.query(NotificationHistory).filter(NotificationHistory.user_id == user_id)
    if unread_only:
        query = query.filter(NotificationHistory.is_read.is_(False))
    total = query.with_entities(func.count(NotificationHistory.id)).scalar() or 0
    items = query.order_by(
        NotificationHistory.created_at.desc(), NotificationHistory.id.desc()
    ).offset((page - 1) * limit).limit(limit).all()
    return items, total


def unread_count(db: Session, user_id: int) -> int:
    return db.query(NotificationHistory).filter(
        NotificationHistory.user_id == user_id,
        NotificationHistory.is_read.is_(False),
    ).count()


def mark_read(db: Session, notification: NotificationHistory) -> NotificationHistory:
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_read(db: Session, user_id: int) -> int:
    result = db.execute(
        update(NotificationHistory)
        .where(
            NotificationHistory.user_id == user_id,
            NotificationHistory.is_read.is_(False),
        )
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    db.commit()
    return result.rowcount
