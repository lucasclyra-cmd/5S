"""Router for bulk document import from a folder."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.bulk_import import ImportRequest, ImportResponse, ScanResponse
from app.services import bulk_import_service

router = APIRouter(prefix="/api/import", tags=["bulk-import"])


@router.get("/scan", response_model=ScanResponse)
async def scan_import_folder(db: AsyncSession = Depends(get_db)):
    """Scan storage/import/ folder, parse filenames, and return a preview of what will be imported."""
    return await bulk_import_service.scan_import_folder(db)


@router.post("/execute", response_model=ImportResponse)
async def execute_import(
    request: ImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Execute the bulk import. Creates documents as active with approved versions and master list entries."""
    return await bulk_import_service.execute_import(db, request)
