"""Add text_reviews table for spelling/clarity review loop

Revision ID: 006_text_reviews
Revises: 005_document_templates
Create Date: 2026-02-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_text_reviews"
down_revision: Union[str, None] = "005_document_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "text_reviews",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "version_id",
            sa.Integer(),
            sa.ForeignKey("document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("iteration", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("ai_corrected_text", sa.Text(), nullable=True),
        sa.Column("user_text", sa.Text(), nullable=True),
        sa.Column("spelling_errors", sa.JSON(), nullable=True),
        sa.Column("clarity_suggestions", sa.JSON(), nullable=True),
        sa.Column(
            "has_spelling_errors",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "has_clarity_suggestions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "status", sa.String(30), nullable=False, server_default="pending"
        ),
        sa.Column(
            "user_skipped_clarity",
            sa.Boolean(),
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "idx_text_reviews_version_id", "text_reviews", ["version_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_text_reviews_version_id", table_name="text_reviews")
    op.drop_table("text_reviews")
