"""create device tokens

Revision ID: f0a1b2c3d456
Revises: e9f0a1b2c345
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f0a1b2c3d456"
down_revision: Union[str, Sequence[str], None] = "e9f0a1b2c345"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=4096), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("device_id", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "platform IN ('android', 'ios', 'web')", name="ck_device_tokens_platform"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"])
    op.create_index("ix_device_tokens_user_active", "device_tokens", ["user_id", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_device_tokens_user_active", table_name="device_tokens")
    op.drop_index("ix_device_tokens_user_id", table_name="device_tokens")
    op.drop_table("device_tokens")
