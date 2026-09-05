from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DeviceTokenCreate(BaseModel):
    token: str = Field(min_length=20, max_length=4096)
    platform: Literal["android", "ios", "web"]
    device_id: str | None = Field(default=None, min_length=1, max_length=255)

    @field_validator("token")
    @classmethod
    def token_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Token must not be blank.")
        return value


class DeviceTokenResponse(BaseModel):
    id: int
    platform: str
    device_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
