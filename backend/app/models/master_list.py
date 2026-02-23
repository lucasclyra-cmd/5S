from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class MasterListEntry(Base):
    __tablename__ = "master_list_entries"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True, nullable=False)
    master_list_code = Column(String(20), unique=True, nullable=False, index=True)  # LM-001, LM-002
    entry_type = Column(String(20), nullable=False, default="document")  # document, form
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    removed_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", backref="master_list_entry")
