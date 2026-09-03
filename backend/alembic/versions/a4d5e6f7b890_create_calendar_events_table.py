"""create calendar events table

Revision ID: a4d5e6f7b890
Revises: 9b3c4d5e6f78
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a4d5e6f7b890"
down_revision: Union[str, Sequence[str], None] = "9b3c4d5e6f78"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reminder_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_calendar_events_owner_id", "calendar_events", ["owner_id"])
    op.create_index("ix_calendar_events_subject_id", "calendar_events", ["subject_id"])
    op.create_index("ix_calendar_events_starts_at", "calendar_events", ["starts_at"])


def downgrade() -> None:
    op.drop_index("ix_calendar_events_starts_at", table_name="calendar_events")
    op.drop_index("ix_calendar_events_subject_id", table_name="calendar_events")
    op.drop_index("ix_calendar_events_owner_id", table_name="calendar_events")
    op.drop_table("calendar_events")
