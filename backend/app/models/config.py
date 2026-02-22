from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class AdminConfig(Base):
    __tablename__ = "admin_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_type = Column(String(50), nullable=False)  # template, analysis_rules, prompt
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    document_type = Column(String(100), nullable=True)
    config_data = Column(JSON, nullable=False, default=dict)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    category = relationship("Category", back_populates="admin_configs")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    parent = relationship("Category", remote_side="Category.id", backref="children")
    documents = relationship("Document", back_populates="category")
    admin_configs = relationship("AdminConfig", back_populates="category")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


class DocumentTag(Base):
    __tablename__ = "document_tags"

    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
