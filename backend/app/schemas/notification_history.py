from datetime import datetime

from pydantic import BaseModel


class NotificationHistoryResponse(BaseModel):
    id: int
    title: str
    body: str
    notification_type: str
    data: dict | None
    is_read: bool
    created_at: datetime
    read_at: datetime | None

    model_config = {"from_attributes": True}


class NotificationHistoryPage(BaseModel):
    items: list[NotificationHistoryResponse]
    page: int
    limit: int
    total: int
    has_next: bool


class UnreadNotificationCount(BaseModel):
    count: int


class MarkAllReadResponse(BaseModel):
    updated: int
