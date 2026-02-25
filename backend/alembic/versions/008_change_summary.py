"""Add change_summary column to document_versions

Revision ID: 008_change_summary
Revises: 007_template_docx_path
Create Date: 2026-02-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "008_change_summary"
down_revision: Union[str, None] = "007_template_docx_path"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "document_versions",
        sa.Column("change_summary", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_versions", "change_summary")
