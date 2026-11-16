"""session spoken seconds

Revision ID: e85b1c4a9f36
Revises: d74a0b3f8e25
Create Date: 2026-11-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e85b1c4a9f36'
down_revision: Union[str, None] = 'd74a0b3f8e25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("spoken_seconds", sa.Float(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("sessions", "spoken_seconds")
