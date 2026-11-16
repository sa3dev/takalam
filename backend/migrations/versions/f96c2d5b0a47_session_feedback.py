"""session feedback

Revision ID: f96c2d5b0a47
Revises: e85b1c4a9f36
Create Date: 2026-11-16 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f96c2d5b0a47'
down_revision: Union[str, None] = 'e85b1c4a9f36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "session_feedback",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.String(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index("ix_session_feedback_id", "session_feedback", ["id"])
    op.create_index("ix_session_feedback_user_id", "session_feedback", ["user_id"])
    op.create_index("ix_session_feedback_created_at", "session_feedback", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_session_feedback_created_at", table_name="session_feedback")
    op.drop_index("ix_session_feedback_user_id", table_name="session_feedback")
    op.drop_index("ix_session_feedback_id", table_name="session_feedback")
    op.drop_table("session_feedback")
