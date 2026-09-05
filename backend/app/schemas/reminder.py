from datetime import datetime, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator

ReminderType = Literal[
    "study", "assignment", "exam", "interview", "job_application", "task", "general"
]
ReminderStatus = Literal["scheduled", "completed", "cancelled"]


def validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValueError("Timezone must be a valid IANA timezone.")
    return value


def normalize_scheduled_at(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("scheduled_at must include a timezone offset.")
    normalized = value.astimezone(timezone.utc)
    if normalized <= datetime.now(timezone.utc):
        raise ValueError("scheduled_at must be in the future.")
    return normalized


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    reminder_type: ReminderType = "general"
    scheduled_at: datetime
    timezone: str = Field(min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("scheduled_at")
    @classmethod
    def scheduled_at_must_be_future_and_aware(cls, value: datetime) -> datetime:
        return normalize_scheduled_at(value)

    @field_validator("timezone")
    @classmethod
    def timezone_must_be_valid(cls, value: str) -> str:
        return validate_timezone(value.strip())


class ReminderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    reminder_type: ReminderType | None = None
    scheduled_at: datetime | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=100)
    status: ReminderStatus | None = None

    @field_validator("title")
    @classmethod
    def update_title_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank.")
        return value

    @field_validator("description")
    @classmethod
    def update_description(cls, value: str | None) -> str | None:
        return value.strip() if value else value

    @field_validator("scheduled_at")
    @classmethod
    def update_scheduled_at(cls, value: datetime | None) -> datetime | None:
        return normalize_scheduled_at(value) if value is not None else None

    @field_validator("timezone")
    @classmethod
    def update_timezone(cls, value: str | None) -> str | None:
        return validate_timezone(value.strip()) if value is not None else None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None
    reminder_type: str
    scheduled_at: datetime
    timezone: str
    status: str
    notification_sent: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
