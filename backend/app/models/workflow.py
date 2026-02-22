from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class WorkflowQueue(Base):
    __tablename__ = "workflow_queue"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False)
    assigned_to_profile = Column(String(50), default="processos")
    action = Column(String(20), nullable=True)  # approve, reject
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    version = relationship("DocumentVersion", back_populates="workflow_items")
