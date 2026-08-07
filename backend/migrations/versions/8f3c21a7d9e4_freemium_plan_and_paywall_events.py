"""freemium plan and paywall events

Revision ID: 8f3c21a7d9e4
Revises: 622eb7bc76e4
Create Date: 2026-07-29 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f3c21a7d9e4'
down_revision: Union[str, None] = '622eb7bc76e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default backfills every existing row to "free" in the same
    # statement, so the column can be NOT NULL from the start.
    op.add_column(
        "users",
        sa.Column("plan", sa.String(), nullable=False, server_default="free"),
    )
    op.add_column("users", sa.Column("plan_updated_at", sa.DateTime(), nullable=True))

    op.create_table(
        "paywall_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("event", sa.String(), nullable=False),
        sa.Column("plan_choice", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_paywall_events_id", "paywall_events", ["id"])
    op.create_index("ix_paywall_events_user_id", "paywall_events", ["user_id"])
    op.create_index("ix_paywall_events_created_at", "paywall_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("paywall_events")
    op.drop_column("users", "plan_updated_at")
    op.drop_column("users", "plan")
