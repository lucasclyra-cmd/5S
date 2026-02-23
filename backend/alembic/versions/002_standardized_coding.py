"""Add standardized coding fields to documents

Revision ID: 002_standardized_coding
Revises: 001_initial
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_standardized_coding"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("document_type", sa.String(10), nullable=True))
    op.add_column("documents", sa.Column("sequential_number", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("revision_number", sa.Integer(), server_default="0"))
    op.add_column("documents", sa.Column("sector", sa.String(200), nullable=True))
    op.add_column(
        "documents", sa.Column("effective_date", sa.DateTime(timezone=True), nullable=True)
    )

    op.create_unique_constraint("uq_doc_type_seq", "documents", ["document_type", "sequential_number"])
    op.create_index("idx_documents_type", "documents", ["document_type"])


def downgrade() -> None:
    op.drop_index("idx_documents_type", table_name="documents")
    op.drop_constraint("uq_doc_type_seq", "documents", type_="unique")
    op.drop_column("documents", "effective_date")
    op.drop_column("documents", "sector")
    op.drop_column("documents", "revision_number")
    op.drop_column("documents", "sequential_number")
    op.drop_column("documents", "document_type")
