from pydantic import BaseModel, Field


class NotificationSendRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=2000)
    data: dict[str, str] = Field(default_factory=dict, max_length=20)


class NotificationSendResponse(BaseModel):
    attempted: int
    sent: int
    deactivated: int
    failed: int
