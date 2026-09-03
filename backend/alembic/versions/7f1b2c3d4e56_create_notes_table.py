"""create notes table

Revision ID: 7f1b2c3d4e56
Revises: 6e0a4d8c9f21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "7f1b2c3d4e56"
down_revision: Union[str, Sequence[str], None] = "6e0a4d8c9f21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notes_owner_id", "notes", ["owner_id"])
    op.create_index("ix_notes_subject_id", "notes", ["subject_id"])


def downgrade() -> None:
    op.drop_index("ix_notes_subject_id", table_name="notes")
    op.drop_index("ix_notes_owner_id", table_name="notes")
    op.drop_table("notes")
