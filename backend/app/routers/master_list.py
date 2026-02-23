from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.master_list import (
    MasterListEntryResponse,
    MasterListResponse,
    MasterListStatsResponse,
)
from app.services import master_list_service

router = APIRouter(prefix="/api/master-list", tags=["master-list"])


@router.get("", response_model=MasterListResponse)
async def get_master_list(
    document_type: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get the Lista Mestra with optional filters and pagination."""
    entries, total = await master_list_service.get_master_list(
        db,
        document_type=document_type,
        search=search,
        status=status,
        page=page,
        limit=limit,
    )
    return MasterListResponse(
        entries=[MasterListEntryResponse(**e) for e in entries],
        total=total,
    )


@router.get("/stats", response_model=MasterListStatsResponse)
async def get_master_list_stats(db: AsyncSession = Depends(get_db)):
    """Get statistics about the Lista Mestra."""
    stats = await master_list_service.get_master_list_stats(db)
    return MasterListStatsResponse(**stats)


@router.get("/export")
async def export_master_list(
    format: str = "csv",
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Export the Lista Mestra as CSV."""
    if format != "csv":
        raise HTTPException(status_code=400, detail="Formato de exportação não suportado. Use 'csv'.")

    csv_content = await master_list_service.export_master_list_csv(db, document_type=document_type)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=lista-mestra.csv"},
    )
