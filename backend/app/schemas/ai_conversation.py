from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AIConversationCreate(BaseModel):
    title: str = Field(default="New conversation", min_length=1, max_length=160)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Conversation title must not be blank.")
        return value.strip()


class AIConversationUpdate(AIConversationCreate):
    pass


class AIConversationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AIMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=12000)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message must not be blank.")
        return value.strip()


class AIMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
