"""Add multi-approver consensus tables

Revision ID: 004_multi_approver
Revises: 003_master_list
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_multi_approver"
down_revision: Union[str, None] = "003_master_list"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Approval chains
    op.create_table(
        "approval_chains",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("version_id", sa.Integer(), sa.ForeignKey("document_versions.id"), nullable=False),
        sa.Column("chain_type", sa.String(10), nullable=False, server_default="A"),
        sa.Column("requires_training", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_approval_chains_version", "approval_chains", ["version_id"])

    # Approval chain approvers
    op.create_table(
        "approval_chain_approvers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("chain_id", sa.Integer(), sa.ForeignKey("approval_chains.id"), nullable=False),
        sa.Column("approver_name", sa.String(200), nullable=False),
        sa.Column("approver_role", sa.String(200), nullable=False),
        sa.Column("approver_profile", sa.String(50), nullable=False, server_default="processos"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("action", sa.String(20), nullable=True),
        sa.Column("comments", sa.String(2000), nullable=True),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("ai_recommended", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("acted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_chain_approvers_chain", "approval_chain_approvers", ["chain_id"])

    # Default approvers
    op.create_table(
        "default_approvers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("approver_name", sa.String(200), nullable=False),
        sa.Column("approver_role", sa.String(200), nullable=False),
        sa.Column("approver_profile", sa.String(50), nullable=False, server_default="processos"),
        sa.Column("document_type", sa.String(10), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("idx_default_approvers_type", "default_approvers", ["document_type"])


def downgrade() -> None:
    op.drop_index("idx_default_approvers_type", table_name="default_approvers")
    op.drop_table("default_approvers")
    op.drop_index("idx_chain_approvers_chain", table_name="approval_chain_approvers")
    op.drop_table("approval_chain_approvers")
    op.drop_index("idx_approval_chains_version", table_name="approval_chains")
    op.drop_table("approval_chains")
