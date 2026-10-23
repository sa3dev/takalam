"""session scenario

Revision ID: a41d7c5e9b02
Revises: 8f3c21a7d9e4
Create Date: 2026-10-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a41d7c5e9b02'
down_revision: Union[str, None] = '8f3c21a7d9e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable: every existing session is, by definition, free conversation.
    op.add_column("sessions", sa.Column("scenario_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "scenario_id")
