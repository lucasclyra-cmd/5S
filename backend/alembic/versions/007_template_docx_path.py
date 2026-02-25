"""Add docx_file_path column to document_templates

Revision ID: 007_template_docx_path
Revises: 006_text_reviews
Create Date: 2026-02-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007_template_docx_path"
down_revision: Union[str, None] = "006_text_reviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "document_templates",
        sa.Column("docx_file_path", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_templates", "docx_file_path")
