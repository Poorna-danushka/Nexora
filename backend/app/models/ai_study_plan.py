from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class AIStudyPlan(Base):
    __tablename__ = "ai_study_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False)
    subject_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    days: Mapped[int] = mapped_column(Integer, nullable=False)
    minutes_per_day: Mapped[int] = mapped_column(Integer, nullable=False)
    priorities: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
