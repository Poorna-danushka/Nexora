from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    color: str = Field(default="#6366f1", min_length=4, max_length=20)
    progress: int = Field(default=0, ge=0, le=100)
    is_completed: bool = False

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Subject name must not be blank.")
        return value.strip()


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, min_length=4, max_length=20)
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    is_completed: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def updated_name_must_not_be_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("Subject name must not be blank.")
        return value.strip() if value is not None else value


class SubjectResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    color: str
    progress: int
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
