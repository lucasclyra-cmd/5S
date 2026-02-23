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
from app.services import coding_service


async def _save_uploaded_file(file: UploadFile) -> tuple[str, str]:
    """Save an uploaded file to storage and extract its text. Returns (file_path, extracted_text)."""
    originals_dir = os.path.join(settings.STORAGE_PATH, "originals")
    os.makedirs(originals_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] if file.filename else ".docx"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(originals_dir, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        extracted_text = extract_text(file_path)
    except Exception:
        extracted_text = ""

    return file_path, extracted_text


async def upload_document(
    db: AsyncSession,
    file: UploadFile,
    document_type: str,
    title: str,
    category_id: Optional[int],
    tags: Optional[list[str]],
    profile: str,
    sector: Optional[str] = None,
) -> tuple[Document, DocumentVersion]:
    """Upload a new document with auto-generated standardized code."""
    if not coding_service.validate_document_type(document_type):
        raise ValueError(f"Tipo de documento inválido: '{document_type}'. Use PQ, IT ou RQ.")

    file_path, extracted_text = await _save_uploaded_file(file)

    # Auto-generate code
    seq_number = await coding_service.get_next_sequential_number(db, document_type)
    code = coding_service.generate_code(document_type, seq_number, 0)

    document = Document(
        code=code,
        title=title,
        category_id=category_id,
        current_version=1,
        status="draft",
        created_by_profile=profile,
        document_type=document_type,
        sequential_number=seq_number,
        revision_number=0,
        sector=sector,
    )
    db.add(document)
    await db.flush()

    if tags:
        await _sync_tags(db, document.id, tags)

    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        original_file_path=file_path,
        extracted_text=extracted_text,
        status="draft",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(version)
    await db.flush()

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
    """Create a new version for an existing document, auto-incrementing revision."""
    document = await get_document_by_code(db, code)
    if document is None:
        raise ValueError(f"Document with code '{code}' not found")

    # Archive the current latest version if it exists
    if document.versions:
        latest = document.versions[-1]
        if latest.status not in ("archived", "rejected"):
            latest.status = "archived"
            latest.archived_at = datetime.now(timezone.utc)

    file_path, extracted_text = await _save_uploaded_file(file)

    # Increment version and revision
    document.current_version += 1
    document.status = "draft"
    document.updated_at = datetime.now(timezone.utc)

    # Auto-increment revision number and update code
    if document.document_type and document.sequential_number is not None:
        document.revision_number = (document.revision_number or 0) + 1
        document.code = coding_service.generate_code(
            document.document_type, document.sequential_number, document.revision_number
        )

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
