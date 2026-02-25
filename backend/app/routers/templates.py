import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.models.template import DocumentTemplate
from app.schemas.template import TemplateResponse, TemplateListResponse
from app.services.template_service import find_placeholders, convert_odt_to_docx

router = APIRouter(prefix="/api/templates", tags=["templates"])

ALLOWED_EXTENSIONS = {".docx", ".odt"}


@router.post("/upload", response_model=TemplateResponse)
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    document_type: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a .docx or .odt template file."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Formato não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    if document_type not in ("PQ", "IT", "RQ"):
        raise HTTPException(400, "document_type deve ser PQ, IT ou RQ")

    # Save file
    templates_dir = os.path.join(settings.STORAGE_PATH, "templates")
    os.makedirs(templates_dir, exist_ok=True)

    safe_name = f"{document_type}_{name.replace(' ', '_')}{ext}"
    file_path = os.path.join(templates_dir, safe_name)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Convert .odt to .docx eagerly so formatting always has a native .docx
    docx_file_path = file_path
    if ext == ".odt":
        try:
            temp_dir = os.path.join(settings.STORAGE_PATH, "temp")
            os.makedirs(temp_dir, exist_ok=True)
            converted = convert_odt_to_docx(file_path, temp_dir)
            # Move converted file to templates dir
            docx_name = safe_name.replace(".odt", ".docx")
            docx_file_path = os.path.join(templates_dir, docx_name)
            shutil.move(converted, docx_file_path)
        except Exception as e:
            # Clean up the uploaded file on failure
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                400,
                f"Falha ao converter .odt para .docx: {str(e)}. "
                "Verifique se o arquivo está correto ou use .docx diretamente.",
            )

    # Extract placeholders from the .docx version
    section_mapping = None
    if os.path.exists(docx_file_path):
        try:
            placeholders = find_placeholders(docx_file_path)
            section_mapping = {"placeholders": placeholders}
        except Exception:
            section_mapping = {"placeholders": []}

    # Deactivate existing templates for same document_type
    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.document_type == document_type,
            DocumentTemplate.is_active == True,
        )
    )
    for existing in result.scalars().all():
        existing.is_active = False

    # Create record
    template = DocumentTemplate(
        name=name,
        description=description or None,
        document_type=document_type,
        template_file_path=file_path,
        docx_file_path=docx_file_path,
        is_active=True,
        section_mapping=section_mapping,
    )
    db.add(template)
    await db.flush()
    await db.commit()
    await db.refresh(template)

    return template


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    document_type: str | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """List all templates, optionally filtered by document type."""
    query = select(DocumentTemplate)
    if document_type:
        query = query.where(DocumentTemplate.document_type == document_type)
    if active_only:
        query = query.where(DocumentTemplate.is_active == True)
    query = query.order_by(DocumentTemplate.document_type, DocumentTemplate.created_at.desc())

    result = await db.execute(query)
    templates = result.scalars().all()

    return {"templates": templates, "total": len(templates)}


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific template by ID."""
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(404, "Template não encontrado")
    return template


@router.get("/{template_id}/download")
async def download_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Download the original template file."""
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(404, "Template não encontrado")

    file_path = template.template_file_path
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(404, "Arquivo do template não encontrado no servidor")

    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".odt": "application/vnd.oasis.opendocument.text",
    }

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_types.get(ext, "application/octet-stream"),
    )


@router.get("/{template_id}/preview")
async def preview_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get the placeholders found in a template."""
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(404, "Template não encontrado")

    # Prefer pre-converted .docx for placeholder extraction
    placeholders = []
    docx_path = template.docx_file_path or template.template_file_path
    if docx_path and os.path.exists(docx_path):
        try:
            preview_path = docx_path
            if docx_path.lower().endswith(".odt"):
                temp_dir = os.path.join(settings.STORAGE_PATH, "temp")
                preview_path = convert_odt_to_docx(docx_path, temp_dir)
            placeholders = find_placeholders(preview_path)
        except Exception:
            placeholders = template.section_mapping.get("placeholders", []) if template.section_mapping else []
    elif template.section_mapping:
        placeholders = template.section_mapping.get("placeholders", [])

    return {
        "template_id": template.id,
        "name": template.name,
        "document_type": template.document_type,
        "placeholders": placeholders,
    }


@router.delete("/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a template and clean up associated files."""
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    # Remove files from disk
    for path in [template.template_file_path, template.docx_file_path]:
        if path:
            abs_path = path if os.path.isabs(path) else os.path.join(settings.STORAGE_PATH, path)
            if os.path.isfile(abs_path):
                try:
                    os.remove(abs_path)
                except OSError:
                    pass

    await db.delete(template)
    await db.commit()
    return {"message": "Template excluído com sucesso"}
