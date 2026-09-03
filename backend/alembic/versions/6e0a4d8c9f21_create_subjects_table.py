"""create subjects table

Revision ID: 6e0a4d8c9f21
Revises: 41d07f72f5b9
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "6e0a4d8c9f21"
down_revision: Union[str, Sequence[str], None] = "41d07f72f5b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=False, server_default="#6366f1"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_subjects_owner_id", "subjects", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_subjects_owner_id", table_name="subjects")
    op.drop_table("subjects")
