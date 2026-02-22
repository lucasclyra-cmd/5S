import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import versioning_service

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{version_id}/docx")
async def download_docx(version_id: int, db: AsyncSession = Depends(get_db)):
    """Download the formatted .docx file for a document version."""
    version = await versioning_service.get_version(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    file_path = version.formatted_file_path_docx
    if not file_path or not os.path.isfile(file_path):
        # Fall back to original file if formatted version doesn't exist
        file_path = version.original_file_path
        if not file_path or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="No file available for download")

    filename = f"{version.document.code}_v{version.version_number}.docx"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.get("/{version_id}/pdf")
async def download_pdf(version_id: int, db: AsyncSession = Depends(get_db)):
    """Download the formatted PDF file for a document version."""
    version = await versioning_service.get_version(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    file_path = version.formatted_file_path_pdf
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="PDF file not available. Run formatting first.",
        )

    filename = f"{version.document.code}_v{version.version_number}.pdf"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf",
    )
