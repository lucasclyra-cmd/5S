"""009_iso_compliance_fields

Revision ID: 009
Revises: 008_change_summary
Create Date: 2026-02-25
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008_change_summary'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Document: campos ISO obrigatórios
    op.add_column('documents', sa.Column('review_due_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('retention_years', sa.Integer(), nullable=True))
    op.add_column('documents', sa.Column('confidentiality_level', sa.String(20), nullable=True, server_default='interno'))

    # DocumentVersion: campos de publicação e obsolescência
    op.add_column('document_versions', sa.Column('published_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('document_versions', sa.Column('obsolete_at', sa.DateTime(timezone=True), nullable=True))

    # ApprovalChainApprover: deadline + approval_level para aprovação paralela
    op.add_column('approval_chain_approvers', sa.Column('deadline', sa.DateTime(timezone=True), nullable=True))
    op.add_column('approval_chain_approvers', sa.Column('approval_level', sa.Integer(), nullable=False, server_default='0'))

    # DocumentDistribution: lista de distribuição controlada
    op.create_table(
        'document_distributions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_name', sa.String(200), nullable=False),
        sa.Column('recipient_role', sa.String(200), nullable=True),
        sa.Column('recipient_email', sa.String(200), nullable=True),
        sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("(datetime('now'))")),
    )
    op.create_index('ix_document_distributions_document_id', 'document_distributions', ['document_id'])

    # AIUsageLog: log de custo de IA por análise
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('version_id', sa.Integer(), sa.ForeignKey('document_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_type', sa.String(50), nullable=False),
        sa.Column('model', sa.String(50), nullable=False),
        sa.Column('tokens_input', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_output', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("(datetime('now'))")),
    )
    op.create_index('ix_ai_usage_logs_version_id', 'ai_usage_logs', ['version_id'])


def downgrade() -> None:
    op.drop_table('ai_usage_logs')
    op.drop_table('document_distributions')
    op.drop_column('approval_chain_approvers', 'approval_level')
    op.drop_column('approval_chain_approvers', 'deadline')
    op.drop_column('document_versions', 'obsolete_at')
    op.drop_column('document_versions', 'published_at')
    op.drop_column('documents', 'confidentiality_level')
    op.drop_column('documents', 'retention_years')
    op.drop_column('documents', 'review_due_date')
