"""create notification history

Revision ID: c3d4e5f6a789
Revises: b2c3d4e5f678
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d4e5f6a789"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f678"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("notification_type", sa.String(length=50), nullable=False),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("source_key", sa.String(length=150), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("source_key"),
    )
    op.create_index("ix_notification_history_user_id", "notification_history", ["user_id"])
    op.create_index(
        "ix_notification_history_user_created",
        "notification_history",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_notification_history_user_read",
        "notification_history",
        ["user_id", "is_read"],
    )
    op.create_index("ix_notification_history_is_read", "notification_history", ["is_read"])


def downgrade() -> None:
    op.drop_index("ix_notification_history_is_read", table_name="notification_history")
    op.drop_index("ix_notification_history_user_read", table_name="notification_history")
    op.drop_index("ix_notification_history_user_created", table_name="notification_history")
    op.drop_index("ix_notification_history_user_id", table_name="notification_history")
    op.drop_table("notification_history")
