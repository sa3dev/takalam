"""daily usage

Revision ID: d74a0b3f8e25
Revises: b52e8d1f6c03
Create Date: 2026-11-08 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd74a0b3f8e25'
down_revision: Union[str, None] = 'b52e8d1f6c03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_usage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("spoken_seconds", sa.Float(), nullable=False, server_default="0"),
        sa.Column("turns", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("plan", sa.String(), nullable=False, server_default="free"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "day", name="uq_daily_usage_user_day"),
    )
    op.create_index("ix_daily_usage_id", "daily_usage", ["id"])
    op.create_index("ix_daily_usage_user_id", "daily_usage", ["user_id"])
    op.create_index("ix_daily_usage_day", "daily_usage", ["day"])


def downgrade() -> None:
    op.drop_index("ix_daily_usage_day", table_name="daily_usage")
    op.drop_index("ix_daily_usage_user_id", table_name="daily_usage")
    op.drop_index("ix_daily_usage_id", table_name="daily_usage")
    op.drop_table("daily_usage")
