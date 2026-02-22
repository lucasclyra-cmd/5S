from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.version import DocumentVersion


async def get_version_history(db: AsyncSession, document_code: str) -> list[DocumentVersion]:
    """Get all versions for a document by its code."""
    result = await db.execute(
        select(Document).where(Document.code == document_code)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise ValueError(f"Document with code '{document_code}' not found")

    versions_result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document.id)
        .order_by(DocumentVersion.version_number.desc())
    )
    return list(versions_result.scalars().all())


async def get_version(db: AsyncSession, version_id: int) -> Optional[DocumentVersion]:
    """Get a specific version with its analyses and changelogs loaded."""
    result = await db.execute(
        select(DocumentVersion)
        .options(
            selectinload(DocumentVersion.analyses),
            selectinload(DocumentVersion.changelogs),
            selectinload(DocumentVersion.document),
        )
        .where(DocumentVersion.id == version_id)
    )
    return result.scalar_one_or_none()


async def get_version_by_doc_and_number(
    db: AsyncSession, document_code: str, version_number: int
) -> Optional[DocumentVersion]:
    """Get a specific version by document code and version number."""
    result = await db.execute(
        select(DocumentVersion)
        .join(Document)
        .options(
            selectinload(DocumentVersion.analyses),
            selectinload(DocumentVersion.changelogs),
            selectinload(DocumentVersion.document),
        )
        .where(Document.code == document_code, DocumentVersion.version_number == version_number)
    )
    return result.scalar_one_or_none()


async def archive_version(db: AsyncSession, version_id: int) -> DocumentVersion:
    """Mark a version as archived."""
    result = await db.execute(
        select(DocumentVersion).where(DocumentVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise ValueError(f"Version with id {version_id} not found")

    version.status = "archived"
    version.archived_at = datetime.now(timezone.utc)
    await db.flush()

    return version
