from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False)
    agent_type = Column(String(50), nullable=False)  # analysis, formatting, changelog
    prompt_used = Column(Text, nullable=True)
    response = Column(Text, nullable=True)
    feedback_items = Column(JSON, nullable=True)  # list of {item, status, suggestion}
    approved = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("DocumentVersion", back_populates="analyses")
