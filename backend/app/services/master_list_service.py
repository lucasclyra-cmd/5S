import csv
import io
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.master_list import MasterListEntry


async def get_next_master_list_code(db: AsyncSession) -> str:
    """Generate the next sequential LM code (LM-001, LM-002, etc.)."""
    result = await db.execute(
        select(func.count(MasterListEntry.id))
    )
    count = result.scalar() or 0
    return f"LM-{count + 1:03d}"


async def add_to_master_list(db: AsyncSession, document_id: int) -> MasterListEntry:
    """Add a document to the master list or reactivate its existing entry."""
    # Check if already exists
    result = await db.execute(
        select(MasterListEntry).where(MasterListEntry.document_id == document_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Reactivate if it was removed
        existing.removed_at = None
        await db.flush()
        return existing

    # Get the document to determine entry_type
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise ValueError(f"Documento com id {document_id} não encontrado")

    entry_type = "form" if doc.document_type == "RQ" else "document"
    master_list_code = await get_next_master_list_code(db)

    entry = MasterListEntry(
        document_id=document_id,
        master_list_code=master_list_code,
        entry_type=entry_type,
    )
    db.add(entry)
    await db.flush()
    return entry


async def remove_from_master_list(db: AsyncSession, document_id: int) -> None:
    """Soft-remove a document from the master list."""
    result = await db.execute(
        select(MasterListEntry).where(MasterListEntry.document_id == document_id)
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.removed_at = datetime.now(timezone.utc)
        await db.flush()


async def get_master_list(
    db: AsyncSession,
    document_type: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[dict], int]:
    """Get the master list with filters and pagination."""
    base_query = (
        select(MasterListEntry)
        .join(Document, MasterListEntry.document_id == Document.id)
        .where(MasterListEntry.removed_at.is_(None))
    )

    if document_type:
        base_query = base_query.where(Document.document_type == document_type)
    if status:
        base_query = base_query.where(Document.status == status)
    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.where(
            (Document.title.ilike(search_pattern))
            | (Document.code.ilike(search_pattern))
            | (MasterListEntry.master_list_code.ilike(search_pattern))
        )

    # Count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch with pagination
    query = (
        base_query
        .options(selectinload(MasterListEntry.document))
        .order_by(MasterListEntry.master_list_code)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    items = []
    for entry in entries:
        doc = entry.document
        items.append({
            "id": entry.id,
            "document_id": entry.document_id,
            "master_list_code": entry.master_list_code,
            "entry_type": entry.entry_type,
            "document_code": doc.code if doc else "",
            "document_title": doc.title if doc else "",
            "document_type": doc.document_type if doc else None,
            "revision_number": doc.revision_number or 0 if doc else 0,
            "effective_date": doc.effective_date if doc else None,
            "sector": doc.sector if doc else None,
            "status": doc.status if doc else "unknown",
            "added_at": entry.added_at,
            "removed_at": entry.removed_at,
        })

    return items, total


async def get_master_list_stats(db: AsyncSession) -> dict:
    """Get statistics about the master list."""
    # Total active
    total_result = await db.execute(
        select(func.count(MasterListEntry.id))
        .where(MasterListEntry.removed_at.is_(None))
    )
    total_active = total_result.scalar() or 0

    # Count by type
    type_result = await db.execute(
        select(Document.document_type, func.count(MasterListEntry.id))
        .join(Document, MasterListEntry.document_id == Document.id)
        .where(MasterListEntry.removed_at.is_(None))
        .group_by(Document.document_type)
    )
    total_by_type = {row[0] or "unknown": row[1] for row in type_result.all()}

    # Latest update
    latest_result = await db.execute(
        select(func.max(MasterListEntry.added_at))
        .where(MasterListEntry.removed_at.is_(None))
    )
    latest_update = latest_result.scalar()

    return {
        "total_active": total_active,
        "total_by_type": total_by_type,
        "latest_update": latest_update,
    }


async def export_master_list_csv(
    db: AsyncSession,
    document_type: Optional[str] = None,
) -> str:
    """Export the master list as CSV string."""
    entries, _ = await get_master_list(db, document_type=document_type, limit=10000)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    # Header
    writer.writerow([
        "Código LM",
        "Código Documento",
        "Título",
        "Tipo",
        "Revisão",
        "Data em Vigor",
        "Setor Responsável",
        "Status",
    ])

    for entry in entries:
        effective = ""
        if entry["effective_date"]:
            if isinstance(entry["effective_date"], str):
                effective = entry["effective_date"]
            else:
                effective = entry["effective_date"].strftime("%d/%m/%Y")

        writer.writerow([
            entry["master_list_code"],
            entry["document_code"],
            entry["document_title"],
            entry["document_type"] or "",
            f".{entry['revision_number']:02d}",
            effective,
            entry["sector"] or "",
            entry["status"],
        ])

    return output.getvalue()
