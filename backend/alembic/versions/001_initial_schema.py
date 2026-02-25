"""Initial schema - create all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-02-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Categories table
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
    )

    # Tags table
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
    )

    # Documents table
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("current_version", sa.Integer(), default=0),
        sa.Column("status", sa.String(20), default="draft"),
        sa.Column("created_by_profile", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Document tags association table
    op.create_table(
        "document_tags",
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    # Document versions table
    op.create_table(
        "document_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("original_file_path", sa.String(1000), nullable=False),
        sa.Column("formatted_file_path_docx", sa.String(1000), nullable=True),
        sa.Column("formatted_file_path_pdf", sa.String(1000), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("ai_approved", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(30), default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )

    # AI analyses table
    op.create_table(
        "ai_analyses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "version_id",
            sa.Integer(),
            sa.ForeignKey("document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("agent_type", sa.String(50), nullable=False),
        sa.Column("prompt_used", sa.Text(), nullable=True),
        sa.Column("response", sa.Text(), nullable=True),
        sa.Column("feedback_items", sa.JSON(), nullable=True),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Changelogs table
    op.create_table(
        "changelogs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "version_id",
            sa.Integer(),
            sa.ForeignKey("document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("previous_version_id", sa.Integer(), nullable=True),
        sa.Column("diff_content", sa.JSON(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Workflow queue table
    op.create_table(
        "workflow_queue",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "version_id",
            sa.Integer(),
            sa.ForeignKey("document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("assigned_to_profile", sa.String(50), default="processos"),
        sa.Column("action", sa.String(20), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Admin configs table
    op.create_table(
        "admin_configs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("config_type", sa.String(50), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("document_type", sa.String(100), nullable=True),
        sa.Column("config_data", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )



def downgrade() -> None:
    op.drop_table("admin_configs")
    op.drop_table("workflow_queue")
    op.drop_table("changelogs")
    op.drop_table("ai_analyses")
    op.drop_table("document_versions")
    op.drop_table("document_tags")
    op.drop_table("documents")
    op.drop_table("tags")
    op.drop_table("categories")
