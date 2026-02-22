import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.document import Document
from app.models.version import DocumentVersion
from app.models.config import Tag, DocumentTag, Category
from app.services.document_parser import extract_text


async def upload_document(
    db: AsyncSession,
    file: UploadFile,
    code: str,
    title: str,
    category_id: Optional[int],
    tags: Optional[list[str]],
    profile: str,
) -> tuple[Document, DocumentVersion]:
    """Upload a document file and create/update the Document and DocumentVersion records."""
    # Ensure storage directory exists
    originals_dir = os.path.join(settings.STORAGE_PATH, "originals")
    os.makedirs(originals_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".docx"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(originals_dir, unique_filename)

    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Check if document with this code already exists
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.versions), selectinload(Document.tags))
        .where(Document.code == code)
    )
    document = result.scalar_one_or_none()

    if document is None:
        # Create new document
        document = Document(
            code=code,
            title=title,
            category_id=category_id,
            current_version=1,
            status="draft",
            created_by_profile=profile,
        )
        db.add(document)
        await db.flush()

        # Handle tags
        if tags:
            await _sync_tags(db, document.id, tags)

        version_number = 1
    else:
        # Update existing document
        document.title = title
        if category_id is not None:
            document.category_id = category_id
        document.current_version += 1
        document.updated_at = datetime.now(timezone.utc)
        version_number = document.current_version

        # Update tags if provided
        if tags is not None:
            await _sync_tags(db, document.id, tags)

    # Extract text
    try:
        extracted_text = extract_text(file_path)
    except Exception:
        extracted_text = ""

    # Create version
    version = DocumentVersion(
        document_id=document.id,
        version_number=version_number,
        original_file_path=file_path,
        extracted_text=extracted_text,
        status="draft",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(version)
    await db.flush()

    # Refresh to get relationships loaded
    await db.refresh(document, ["tags", "versions"])

    return document, version


async def _sync_tags(db: AsyncSession, document_id: int, tag_names: list[str]) -> None:
    """Sync tags for a document: create missing tags and update the association table."""
    # Remove existing associations
    existing = await db.execute(
        select(DocumentTag).where(DocumentTag.document_id == document_id)
    )
    for row in existing.scalars().all():
        await db.delete(row)

    # Add new tags
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        # Find or create tag
        result = await db.execute(select(Tag).where(Tag.name == name))
        tag = result.scalar_one_or_none()
        if tag is None:
            tag = Tag(name=name)
            db.add(tag)
            await db.flush()

        doc_tag = DocumentTag(document_id=document_id, tag_id=tag.id)
        db.add(doc_tag)


async def get_documents(
    db: AsyncSession,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    code: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Document], int]:
    """Get a filtered, paginated list of documents."""
    query = select(Document).options(selectinload(Document.tags))

    if status:
        query = query.where(Document.status == status)
    if category_id is not None:
        query = query.where(Document.category_id == category_id)
    if code:
        query = query.where(Document.code.ilike(f"%{code}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    query = query.order_by(Document.updated_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    documents = list(result.scalars().all())

    return documents, total


async def get_document_by_code(db: AsyncSession, code: str) -> Optional[Document]:
    """Get a single document by its code, with versions and tags loaded."""
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.versions),
            selectinload(Document.tags),
        )
        .where(Document.code == code)
    )
    return result.scalar_one_or_none()


async def search_documents(db: AsyncSession, query_str: str) -> list[Document]:
    """Full-text search on documents using ILIKE on code, title and extracted_text."""
    search_pattern = f"%{query_str}%"

    # Search in documents table
    stmt = (
        select(Document)
        .options(selectinload(Document.tags))
        .outerjoin(DocumentVersion, Document.id == DocumentVersion.document_id)
        .where(
            or_(
                Document.code.ilike(search_pattern),
                Document.title.ilike(search_pattern),
                DocumentVersion.extracted_text.ilike(search_pattern),
            )
        )
        .distinct()
        .order_by(Document.updated_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def resubmit_document(
    db: AsyncSession,
    code: str,
    file: UploadFile,
    profile: str,
) -> tuple[Document, DocumentVersion]:
    """Create a new version for an existing document."""
    document = await get_document_by_code(db, code)
    if document is None:
        raise ValueError(f"Document with code '{code}' not found")

    # Archive the current latest version if it exists
    if document.versions:
        latest = document.versions[-1]
        if latest.status not in ("archived", "rejected"):
            latest.status = "archived"
            latest.archived_at = datetime.now(timezone.utc)

    # Save file
    originals_dir = os.path.join(settings.STORAGE_PATH, "originals")
    os.makedirs(originals_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] if file.filename else ".docx"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(originals_dir, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Extract text
    try:
        extracted_text = extract_text(file_path)
    except Exception:
        extracted_text = ""

    # Increment version
    document.current_version += 1
    document.status = "draft"
    document.updated_at = datetime.now(timezone.utc)

    version = DocumentVersion(
        document_id=document.id,
        version_number=document.current_version,
        original_file_path=file_path,
        extracted_text=extracted_text,
        status="draft",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(version)
    await db.flush()

    await db.refresh(document, ["tags", "versions"])

    return document, version
