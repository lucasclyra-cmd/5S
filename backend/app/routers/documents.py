import json
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.ai_service import run_analysis_background
from app.schemas.documents import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.schemas.versions import VersionResponse
from app.services import document_service, versioning_service, workflow_service, coding_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _document_to_response(doc) -> DocumentResponse:
    """Convert a Document model to a DocumentResponse schema."""
    return DocumentResponse(
        id=doc.id,
        code=doc.code,
        title=doc.title,
        category_id=doc.category_id,
        current_version=doc.current_version,
        status=doc.status,
        created_by_profile=doc.created_by_profile,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        tags=[tag.name for tag in doc.tags] if doc.tags else [],
        document_type=doc.document_type,
        sequential_number=doc.sequential_number,
        revision_number=doc.revision_number or 0,
        sector=doc.sector,
        effective_date=doc.effective_date,
    )


def _version_to_response(ver) -> VersionResponse:
    """Convert a DocumentVersion model to a VersionResponse schema."""
    return VersionResponse.model_validate(ver)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    metadata: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a new document with auto-generated standardized code.

    AI analysis is triggered automatically as a background task.
    """
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON de metadados inválido")

    document_type = meta.get("document_type")
    title = meta.get("title")
    created_by_profile = meta.get("created_by_profile", "autor")

    if not document_type or not title:
        raise HTTPException(
            status_code=400,
            detail="document_type e title são obrigatórios nos metadados",
        )

    if not coding_service.validate_document_type(document_type):
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de documento inválido: '{document_type}'. Use PQ, IT ou RQ.",
        )

    category_id = meta.get("category_id")
    tags = meta.get("tags")
    sector = meta.get("sector")

    try:
        doc, version = await document_service.upload_document(
            db, file, document_type, title, category_id, tags, created_by_profile, sector
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Set status to "analyzing" so the response immediately reflects the state
    doc.status = "analyzing"
    version.status = "analyzing"
    await db.flush()

    # Schedule background AI analysis
    background_tasks.add_task(run_analysis_background, version.id)

    return DocumentUploadResponse(
        document=_document_to_response(doc),
        version=_version_to_response(version),
    )


@router.get("/next-code/{document_type}")
async def get_next_code(
    document_type: str,
    db: AsyncSession = Depends(get_db),
):
    """Preview the next auto-generated code for a document type."""
    if not coding_service.validate_document_type(document_type):
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de documento inválido: '{document_type}'. Use PQ, IT ou RQ.",
        )

    next_seq = await coding_service.get_next_sequential_number(db, document_type)
    code = coding_service.generate_code(document_type, next_seq, 0)

    return {
        "code": code,
        "document_type": document_type,
        "sequential_number": next_seq,
        "revision_number": 0,
    }


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    code: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List documents with optional filters and pagination."""
    documents, total = await document_service.get_documents(
        db, status=status, category_id=category_id, code=code, page=page, limit=limit
    )
    return DocumentListResponse(
        documents=[_document_to_response(doc) for doc in documents],
        total=total,
    )


@router.get("/search", response_model=list[DocumentResponse])
async def search_documents(
    q: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Full-text search across documents."""
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query 'q' is required")

    documents = await document_service.search_documents(db, q)
    return [_document_to_response(doc) for doc in documents]


@router.get("/{code}", response_model=DocumentDetailResponse)
async def get_document(code: str, db: AsyncSession = Depends(get_db)):
    """Get document details by code, including version history."""
    doc = await document_service.get_document_by_code(db, code)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document '{code}' not found")

    resp = _document_to_response(doc)
    return DocumentDetailResponse(
        **resp.model_dump(),
        versions=[_version_to_response(v) for v in doc.versions],
    )


@router.get("/{code}/versions/{version_number}", response_model=VersionResponse)
async def get_document_version(
    code: str, version_number: int, db: AsyncSession = Depends(get_db)
):
    """Get a specific version of a document."""
    version = await versioning_service.get_version_by_doc_and_number(db, code, version_number)
    if version is None:
        raise HTTPException(
            status_code=404,
            detail=f"Version {version_number} of document '{code}' not found",
        )
    return _version_to_response(version)


@router.post("/{code}/resubmit", response_model=DocumentUploadResponse)
async def resubmit_document(
    code: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    created_by_profile: str = Form("autor"),
    change_summary: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Resubmit a document with a new file, creating a new version.

    AI analysis is triggered automatically as a background task.
    """
    try:
        doc, version = await document_service.resubmit_document(
            db, code, file, created_by_profile, change_summary or None
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Set status to "analyzing" so the response immediately reflects the state
    doc.status = "analyzing"
    version.status = "analyzing"
    await db.flush()

    # Schedule background AI analysis
    background_tasks.add_task(run_analysis_background, version.id)

    return DocumentUploadResponse(
        document=_document_to_response(doc),
        version=_version_to_response(version),
    )


@router.post("/{code}/skip-ai")
async def skip_ai_approval(
    code: str,
    version_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Skip AI approval and send document directly to the workflow queue."""
    # If no version_id provided, use the latest version
    if version_id is None:
        doc = await document_service.get_document_by_code(db, code)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"Document '{code}' not found")
        if not doc.versions:
            raise HTTPException(status_code=400, detail="Document has no versions")
        version_id = doc.versions[-1].id

    try:
        item = await workflow_service.skip_ai_approval(db, code, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"message": "Document sent to workflow queue", "workflow_item_id": item.id}


@router.post("/{code}/retry-analysis")
async def retry_analysis(
    code: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Retry AI analysis for a document stuck in analysis_failed or draft state."""
    doc = await document_service.get_document_by_code(db, code)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Documento '{code}' não encontrado")

    if doc.status not in ("analysis_failed", "draft", "analyzing"):
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível reiniciar análise para documento com status '{doc.status}'",
        )

    if not doc.versions:
        raise HTTPException(status_code=400, detail="Documento não possui versões")

    version = doc.versions[-1]
    doc.status = "analyzing"
    version.status = "analyzing"
    await db.commit()

    background_tasks.add_task(run_analysis_background, version.id)

    return {"message": "Análise reiniciada", "version_id": version.id}


@router.post("/{code}/publish")
async def publish_document(
    code: str,
    version_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Publish a document: set current version to 'published', mark previous published versions as 'obsolete'."""
    from datetime import datetime, timezone as tz
    from sqlalchemy import select
    from app.models.version import DocumentVersion

    doc = await document_service.get_document_by_code(db, code)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Documento '{code}' não encontrado")

    # Find the version to publish
    if version_id is None:
        target = next(
            (v for v in reversed(doc.versions) if v.status == "approved"),
            None
        )
        if target is None:
            raise HTTPException(
                status_code=400,
                detail="Nenhuma versão aprovada encontrada para publicar"
            )
    else:
        target = next((v for v in doc.versions if v.id == version_id), None)
        if target is None:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

    now = datetime.now(tz.utc)

    # Mark all previously published versions as obsolete
    for v in doc.versions:
        if v.id != target.id and v.status == "published":
            v.status = "obsolete"
            v.obsolete_at = now

    # Publish the target version
    target.status = "published"
    target.published_at = now

    # Update document-level status
    doc.status = "active"
    doc.effective_date = now
    doc.updated_at = now

    await db.commit()
    await db.refresh(doc)

    return {
        "message": f"Documento {code} publicado com sucesso",
        "version_id": target.id,
        "published_at": now.isoformat(),
    }
