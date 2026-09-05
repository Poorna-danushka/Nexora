"""create ai study plans

Revision ID: e9f0a1b2c345
Revises: d8e9f0a1b234
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e9f0a1b2c345"
down_revision: Union[str, Sequence[str], None] = "d8e9f0a1b234"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_study_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("plan", sa.Text(), nullable=False),
        sa.Column("subject_ids", sa.JSON(), nullable=False),
        sa.Column("days", sa.Integer(), nullable=False),
        sa.Column("minutes_per_day", sa.Integer(), nullable=False),
        sa.Column("priorities", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_ai_study_plans_owner_id", "ai_study_plans", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_study_plans_owner_id", table_name="ai_study_plans")
    op.drop_table("ai_study_plans")
