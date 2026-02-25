from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class ApprovalChain(Base):
    __tablename__ = "approval_chains"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    chain_type = Column(String(10), nullable=False, default="A")  # A=Aprovação, Ra=Reaprovação, C=Cancelamento
    requires_training = Column(Boolean, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    approvers = relationship("ApprovalChainApprover", back_populates="chain", order_by="ApprovalChainApprover.order")
    version = relationship("DocumentVersion", backref="approval_chains")


class ApprovalChainApprover(Base):
    __tablename__ = "approval_chain_approvers"

    id = Column(Integer, primary_key=True, index=True)
    chain_id = Column(Integer, ForeignKey("approval_chains.id"), nullable=False)
    approver_name = Column(String(200), nullable=False)
    approver_role = Column(String(200), nullable=False)
    approver_profile = Column(String(50), nullable=False, default="processos")
    order = Column(Integer, nullable=False, default=0)
    action = Column(String(20), nullable=True)  # approve, reject, null=pending
    comments = Column(String(2000), nullable=True)
    is_required = Column(Boolean, default=True)
    ai_recommended = Column(Boolean, default=False)
    acted_at = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    approval_level = Column(Integer, nullable=False, default=0)  # Aprovadores do mesmo nível agem em paralelo

    chain = relationship("ApprovalChain", back_populates="approvers")


class DefaultApprover(Base):
    __tablename__ = "default_approvers"

    id = Column(Integer, primary_key=True, index=True)
    approver_name = Column(String(200), nullable=False)
    approver_role = Column(String(200), nullable=False)
    approver_profile = Column(String(50), nullable=False, default="processos")
    document_type = Column(String(10), nullable=True)  # PQ, IT, RQ, or null=all
    is_default = Column(Boolean, default=True)
    order = Column(Integer, default=0)
