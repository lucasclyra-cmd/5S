import os
import tempfile

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException
from fastapi.background import BackgroundTask
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import versioning_service

router = APIRouter(prefix="/api/export", tags=["export"])


def _add_obsolete_watermark(input_pdf_path: str) -> str:
    """Add a red diagonal 'VERSÃO DESATUALIZADA' watermark to all pages of a PDF.
    Returns path to a temporary watermarked PDF file.
    """
    doc = fitz.open(input_pdf_path)
    watermark_text = "VERSÃO DESATUALIZADA"

    for page in doc:
        rect = page.rect
        center_x = rect.width / 2
        center_y = rect.height / 2
        page.insert_text(
            fitz.Point(center_x - 220, center_y + 30),
            watermark_text,
            fontname="Helvetica-Bold",
            fontsize=55,
            color=(0.85, 0.0, 0.0),  # Vermelho
            rotate=45,
            overlay=True,
        )

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_path = tmp.name
    tmp.close()
    doc.save(tmp_path)
    doc.close()
    return tmp_path


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
    """Download the formatted PDF. Adds a red watermark if the version is archived or obsolete."""
    version = await versioning_service.get_version(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    file_path = version.formatted_file_path_pdf
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="PDF file not available. Run formatting first.",
        )

    doc_code = version.document.code if version.document else "doc"
    filename = f"{doc_code}_v{version.version_number}.pdf"

    if version.status in ("archived", "obsolete"):
        watermarked_path = _add_obsolete_watermark(file_path)
        return FileResponse(
            path=watermarked_path,
            filename=filename,
            media_type="application/pdf",
            background=BackgroundTask(os.unlink, watermarked_path),
        )

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf",
    )
