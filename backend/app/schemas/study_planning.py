from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PlanningBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    subject_id: Optional[int] = Field(default=None, gt=0)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Title must not be blank.")
        return value.strip()


class StudySessionCreate(PlanningBase):
    scheduled_for: datetime
    duration_minutes: int = Field(ge=1, le=1440)
    is_completed: bool = False


class StudySessionUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    subject_id: Optional[int] = Field(default=None, gt=0)
    scheduled_for: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    is_completed: Optional[bool] = None


class StudySessionResponse(StudySessionCreate):
    id: int
    owner_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class StudyGoalCreate(PlanningBase):
    target_date: Optional[datetime] = None
    is_completed: bool = False


class StudyGoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    subject_id: Optional[int] = Field(default=None, gt=0)
    target_date: Optional[datetime] = None
    is_completed: Optional[bool] = None


class StudyGoalResponse(StudyGoalCreate):
    id: int
    owner_id: int
    created_at: datetime
    model_config = {"from_attributes": True}
