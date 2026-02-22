from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Changelog(Base):
    __tablename__ = "changelogs"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False)
    previous_version_id = Column(Integer, nullable=True)
    diff_content = Column(JSON, nullable=True)  # structured by section
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("DocumentVersion", back_populates="changelogs")
