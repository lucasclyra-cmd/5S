from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class TextReview(Base):
    __tablename__ = "text_reviews"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False)
    iteration = Column(Integer, nullable=False, default=1)

    # Text states
    original_text = Column(Text, nullable=False)
    ai_corrected_text = Column(Text, nullable=True)
    user_text = Column(Text, nullable=True)

    # AI findings
    spelling_errors = Column(JSON, nullable=True)       # [{original, corrected, position, context}]
    clarity_suggestions = Column(JSON, nullable=True)    # [{original, suggested, reason, position}]
    has_spelling_errors = Column(Boolean, nullable=False, default=False)
    has_clarity_suggestions = Column(Boolean, nullable=False, default=False)

    # Status tracking
    # pending, reviewed, user_accepted, user_edited, re_reviewing, clean
    status = Column(String(30), nullable=False, default="pending")
    user_skipped_clarity = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    version = relationship("DocumentVersion", back_populates="text_reviews")
