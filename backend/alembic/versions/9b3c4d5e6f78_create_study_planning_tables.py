"""create study planning tables

Revision ID: 9b3c4d5e6f78
Revises: 8a2b3c4d5e67
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9b3c4d5e6f78"
down_revision: Union[str, Sequence[str], None] = "8a2b3c4d5e67"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table, extra in (
        ("study_sessions", [
            sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
            sa.Column("duration_minutes", sa.Integer(), nullable=False),
        ]),
        ("study_goals", [
            sa.Column("target_date", sa.DateTime(timezone=True), nullable=True),
        ]),
    ):
        columns = [
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("owner_id", sa.Integer(), nullable=False),
            sa.Column("subject_id", sa.Integer(), nullable=True),
            sa.Column("title", sa.String(length=160), nullable=False),
            *extra,
            sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
        ]
        op.create_table(table, *columns)
        op.create_index(f"ix_{table}_owner_id", table, ["owner_id"])
        op.create_index(f"ix_{table}_subject_id", table, ["subject_id"])


def downgrade() -> None:
    for table in ("study_goals", "study_sessions"):
        op.drop_index(f"ix_{table}_subject_id", table_name=table)
        op.drop_index(f"ix_{table}_owner_id", table_name=table)
        op.drop_table(table)
