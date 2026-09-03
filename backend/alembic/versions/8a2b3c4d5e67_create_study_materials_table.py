"""create study materials table

Revision ID: 8a2b3c4d5e67
Revises: 7f1b2c3d4e56
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "8a2b3c4d5e67"
down_revision: Union[str, Sequence[str], None] = "7f1b2c3d4e56"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "study_materials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False, unique=True),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_study_materials_owner_id", "study_materials", ["owner_id"])
    op.create_index("ix_study_materials_subject_id", "study_materials", ["subject_id"])


def downgrade() -> None:
    op.drop_index("ix_study_materials_subject_id", table_name="study_materials")
    op.drop_index("ix_study_materials_owner_id", table_name="study_materials")
    op.drop_table("study_materials")
