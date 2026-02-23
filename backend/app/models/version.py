from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    original_file_path = Column(String(1000), nullable=False)
    formatted_file_path_docx = Column(String(1000), nullable=True)
    formatted_file_path_pdf = Column(String(1000), nullable=True)
    extracted_text = Column(Text, nullable=True)
    ai_approved = Column(Boolean, nullable=True)
    status = Column(String(30), default="draft")
    # status values: draft, analyzing, in_review, formatting, approved, rejected, archived
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="versions")
    analyses = relationship("AIAnalysis", back_populates="version", order_by="AIAnalysis.created_at")
    changelogs = relationship("Changelog", back_populates="version")
    workflow_items = relationship("WorkflowQueue", back_populates="version")
