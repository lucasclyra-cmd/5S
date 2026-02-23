from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("document_type", "sequential_number", name="uq_doc_type_seq"),
    )

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    current_version = Column(Integer, default=0)
    status = Column(String(20), default="draft")  # draft, active, archived, obsolete, cancelled
    created_by_profile = Column(String(50), nullable=False)  # autor, processos, admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Codificação padronizada (PQ-001.03 Anexo A)
    document_type = Column(String(10), nullable=True, index=True)  # PQ, IT, RQ
    sequential_number = Column(Integer, nullable=True)  # 001, 002, etc.
    revision_number = Column(Integer, default=0)  # .00, .01, .02
    sector = Column(String(200), nullable=True)  # Setor responsável
    effective_date = Column(DateTime(timezone=True), nullable=True)  # Data em vigor

    category = relationship("Category", back_populates="documents")
    versions = relationship(
        "DocumentVersion", back_populates="document", order_by="DocumentVersion.version_number"
    )
    tags = relationship("Tag", secondary="document_tags", backref="documents")
