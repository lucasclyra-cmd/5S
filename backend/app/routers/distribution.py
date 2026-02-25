from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.distribution import DocumentDistribution
from app.models.document import Document
from app.schemas.distribution import DistributionCreate, DistributionResponse, DistributionListResponse

router = APIRouter(prefix="/api/distribution", tags=["distribution"])


@router.get("/{document_id}", response_model=DistributionListResponse)
async def list_distribution(document_id: int, db: AsyncSession = Depends(get_db)):
    """List all recipients in the distribution list for a document."""
    result = await db.execute(
        select(DocumentDistribution)
        .where(DocumentDistribution.document_id == document_id)
        .order_by(DocumentDistribution.created_at.asc())
    )
    items = list(result.scalars().all())
    return {"distributions": items, "total": len(items)}


@router.post("/{document_id}", response_model=DistributionResponse)
async def add_to_distribution(
    document_id: int,
    req: DistributionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a recipient to a document's controlled distribution list."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    entry = DocumentDistribution(
        document_id=document_id,
        recipient_name=req.recipient_name,
        recipient_role=req.recipient_role,
        recipient_email=req.recipient_email,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/{document_id}/notify-all")
async def notify_all_recipients(document_id: int, db: AsyncSession = Depends(get_db)):
    """Mark all un-notified recipients as notified (simulates notification dispatch)."""
    result = await db.execute(
        select(DocumentDistribution)
        .where(
            DocumentDistribution.document_id == document_id,
            DocumentDistribution.notified_at.is_(None),
        )
    )
    items = list(result.scalars().all())
    now = datetime.now(timezone.utc)
    for item in items:
        item.notified_at = now
    await db.commit()
    return {
        "message": f"{len(items)} destinatário(s) notificado(s)",
        "notified_at": now.isoformat(),
        "count": len(items),
    }


@router.post("/entries/{entry_id}/acknowledge", response_model=DistributionResponse)
async def acknowledge_receipt(entry_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a distribution entry as acknowledged (recipient confirmed receipt)."""
    entry = await db.get(DocumentDistribution, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrada de distribuição não encontrada")
    entry.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}")
async def remove_from_distribution(entry_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a recipient from the distribution list."""
    entry = await db.get(DocumentDistribution, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrada de distribuição não encontrada")
    await db.delete(entry)
    await db.commit()
    return {"message": "Destinatário removido da lista de distribuição"}
