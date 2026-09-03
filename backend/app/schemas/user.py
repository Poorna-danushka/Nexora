from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    university: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = Field(default=None, ge=2020, le=2035)

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value: str) -> str:
        if value.strip() == "":
            raise ValueError("Password must not be blank or only whitespace.")
        return value

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if value.strip() == "":
            raise ValueError("Full name must not be blank.")
        return value.strip()


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    university: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
