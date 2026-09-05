"""create reminders

Revision ID: a1b2c3d4e567
Revises: f0a1b2c3d456
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e567"
down_revision: Union[str, Sequence[str], None] = "f0a1b2c3d456"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reminders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reminder_type", sa.String(length=30), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("notification_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "reminder_type IN ('study', 'assignment', 'exam', 'interview', 'job_application', 'task', 'general')",
            name="ck_reminders_type",
        ),
        sa.CheckConstraint(
            "status IN ('scheduled', 'completed', 'cancelled')",
            name="ck_reminders_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_reminders_user_id", "reminders", ["user_id"])
    op.create_index("ix_reminders_scheduled_at", "reminders", ["scheduled_at"])
    op.create_index("ix_reminders_status", "reminders", ["status"])
    op.create_index("ix_reminders_notification_sent", "reminders", ["notification_sent"])
    op.create_index(
        "ix_reminders_scheduler",
        "reminders",
        ["status", "notification_sent", "scheduled_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_reminders_scheduler", table_name="reminders")
    op.drop_index("ix_reminders_notification_sent", table_name="reminders")
    op.drop_index("ix_reminders_status", table_name="reminders")
    op.drop_index("ix_reminders_scheduled_at", table_name="reminders")
    op.drop_index("ix_reminders_user_id", table_name="reminders")
    op.drop_table("reminders")
