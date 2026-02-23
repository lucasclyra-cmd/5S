from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON
from datetime import datetime, timezone

from app.database import Base


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    document_type = Column(String(10), nullable=False, index=True)  # PQ, IT, RQ
    template_file_path = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    section_mapping = Column(JSON, nullable=True)  # Maps placeholder → section
    header_config = Column(JSON, nullable=True)  # Header field positions
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
