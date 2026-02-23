"""Add master list entries table

Revision ID: 003_master_list
Revises: 002_standardized_coding
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_master_list"
down_revision: Union[str, None] = "002_standardized_coding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "master_list_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id"), unique=True, nullable=False),
        sa.Column("master_list_code", sa.String(20), unique=True, nullable=False),
        sa.Column("entry_type", sa.String(20), nullable=False, server_default="document"),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_master_list_code", "master_list_entries", ["master_list_code"])
    op.create_index("idx_master_list_document_id", "master_list_entries", ["document_id"])


def downgrade() -> None:
    op.drop_index("idx_master_list_document_id", table_name="master_list_entries")
    op.drop_index("idx_master_list_code", table_name="master_list_entries")
    op.drop_table("master_list_entries")
