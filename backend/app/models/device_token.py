from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    __table_args__ = (
        CheckConstraint("platform IN ('android', 'ios', 'web')", name="ck_device_tokens_platform"),
        Index("ix_device_tokens_user_active", "user_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(4096), nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
