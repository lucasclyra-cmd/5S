"""Add document templates table

Revision ID: 005_document_templates
Revises: 004_multi_approver
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_document_templates"
down_revision: Union[str, None] = "004_multi_approver"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("document_type", sa.String(10), nullable=False),
        sa.Column("template_file_path", sa.String(500), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("section_mapping", sa.JSON(), nullable=True),
        sa.Column("header_config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_templates_document_type", "document_templates", ["document_type"])


def downgrade() -> None:
    op.drop_index("idx_templates_document_type", table_name="document_templates")
    op.drop_table("document_templates")
