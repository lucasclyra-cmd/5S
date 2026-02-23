import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.documents import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.schemas.versions import VersionResponse
from app.services import document_service, versioning_service, workflow_service

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
    )


def _version_to_response(ver) -> VersionResponse:
    """Convert a DocumentVersion model to a VersionResponse schema."""
    return VersionResponse.model_validate(ver)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a new document or new version of an existing document."""
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")

    code = meta.get("code")
    title = meta.get("title")
    created_by_profile = meta.get("created_by_profile", "autor")

    if not code or not title:
        raise HTTPException(status_code=400, detail="code and title are required in metadata")

    category_id = meta.get("category_id")
    tags = meta.get("tags")

    try:
        doc, version = await document_service.upload_document(
            db, file, code, title, category_id, tags, created_by_profile
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return DocumentUploadResponse(
        document=_document_to_response(doc),
        version=_version_to_response(version),
    )


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
    file: UploadFile = File(...),
    created_by_profile: str = Form("autor"),
    db: AsyncSession = Depends(get_db),
):
    """Resubmit a document with a new file, creating a new version."""
    try:
        doc, version = await document_service.resubmit_document(
            db, code, file, created_by_profile
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
