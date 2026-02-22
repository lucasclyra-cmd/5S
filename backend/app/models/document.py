from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    current_version = Column(Integer, default=0)
    status = Column(String(20), default="draft")  # draft, active, archived
    created_by_profile = Column(String(50), nullable=False)  # autor, processos, admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    category = relationship("Category", back_populates="documents")
    versions = relationship(
        "DocumentVersion", back_populates="document", order_by="DocumentVersion.version_number"
    )
    tags = relationship("Tag", secondary="document_tags", backref="documents")
