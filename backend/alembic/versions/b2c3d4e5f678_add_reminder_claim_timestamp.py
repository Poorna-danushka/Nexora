"""add reminder claim timestamp

Revision ID: b2c3d4e5f678
Revises: a1b2c3d4e567
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f678"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e567"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reminders",
        sa.Column("notification_claimed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reminders", "notification_claimed_at")
