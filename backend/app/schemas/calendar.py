from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class CalendarEventBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    subject_id: Optional[int] = Field(default=None, gt=0)
    starts_at: datetime
    ends_at: datetime
    all_day: bool = False
    reminder_minutes: Optional[int] = Field(default=None, ge=0, le=10080)

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("Event end must be after event start.")
        return self


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    subject_id: Optional[int] = Field(default=None, gt=0)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    all_day: Optional[bool] = None
    reminder_minutes: Optional[int] = Field(default=None, ge=0, le=10080)


class CalendarEventResponse(CalendarEventBase):
    id: int
    owner_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
