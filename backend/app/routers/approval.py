from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.approval import (
    ApproverResponse,
    ChainResponse,
    CreateChainRequest,
    ApproverActionRequest,
    TrainingUpdateRequest,
    DefaultApproverInput,
    DefaultApproverResponse,
    PendingApprovalItem,
)
from app.services import approval_service

router = APIRouter(prefix="/api/approval", tags=["approval"])


def _chain_to_response(chain) -> ChainResponse:
    return ChainResponse(
        id=chain.id,
        version_id=chain.version_id,
        chain_type=chain.chain_type,
        requires_training=chain.requires_training,
        status=chain.status,
        created_at=chain.created_at,
        completed_at=chain.completed_at,
        approvers=[
            ApproverResponse(
                id=a.id,
                chain_id=a.chain_id,
                approver_name=a.approver_name,
                approver_role=a.approver_role,
                approver_profile=a.approver_profile,
                order=a.order,
                action=a.action,
                comments=a.comments,
                is_required=a.is_required,
                ai_recommended=a.ai_recommended,
                acted_at=a.acted_at,
            )
            for a in (chain.approvers or [])
        ],
    )


# ─── Chains ─────────────────────────────────────────────────

@router.post("/chains", response_model=ChainResponse)
async def create_chain(
    req: CreateChainRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new approval chain with approvers."""
    approvers = [a.model_dump() for a in req.approvers]
    try:
        chain = await approval_service.create_approval_chain(
            db, req.version_id, req.chain_type, approvers
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _chain_to_response(chain)


@router.get("/chains/{version_id}", response_model=ChainResponse)
async def get_chain_by_version(
    version_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the active approval chain for a version."""
    chain = await approval_service.get_chain_by_version(db, version_id)
    if chain is None:
        raise HTTPException(status_code=404, detail="Nenhuma cadeia de aprovação ativa encontrada")
    return _chain_to_response(chain)


@router.post("/chains/{chain_id}/approvers/{approver_id}/action", response_model=ChainResponse)
async def record_action(
    chain_id: int,
    approver_id: int,
    req: ApproverActionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Record an approver's action (approve/reject)."""
    if req.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Ação deve ser 'approve' ou 'reject'")
    try:
        chain = await approval_service.record_approver_action(
            db, chain_id, approver_id, req.action, req.comments
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _chain_to_response(chain)


@router.put("/chains/{chain_id}/training", response_model=ChainResponse)
async def update_training(
    chain_id: int,
    req: TrainingUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update the training requirement for an approval chain."""
    try:
        chain = await approval_service.update_training_requirement(
            db, chain_id, req.requires_training
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _chain_to_response(chain)


@router.get("/pending", response_model=list[PendingApprovalItem])
async def get_pending(db: AsyncSession = Depends(get_db)):
    """Get all pending approval items."""
    items = await approval_service.get_pending_approvals(db)
    return [PendingApprovalItem(**item) for item in items]


# ─── Default Approvers ──────────────────────────────────────

@router.get("/defaults", response_model=list[DefaultApproverResponse])
async def get_defaults(
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get default approvers."""
    approvers = await approval_service.get_default_approvers(db, document_type)
    return [
        DefaultApproverResponse(
            id=a.id,
            approver_name=a.approver_name,
            approver_role=a.approver_role,
            approver_profile=a.approver_profile,
            document_type=a.document_type,
            is_default=a.is_default,
            order=a.order,
        )
        for a in approvers
    ]


@router.post("/defaults", response_model=DefaultApproverResponse)
async def create_default(
    req: DefaultApproverInput,
    db: AsyncSession = Depends(get_db),
):
    """Create a new default approver."""
    approver = await approval_service.create_default_approver(db, req.model_dump())
    return DefaultApproverResponse(
        id=approver.id,
        approver_name=approver.approver_name,
        approver_role=approver.approver_role,
        approver_profile=approver.approver_profile,
        document_type=approver.document_type,
        is_default=approver.is_default,
        order=approver.order,
    )


@router.put("/defaults/{approver_id}", response_model=DefaultApproverResponse)
async def update_default(
    approver_id: int,
    req: DefaultApproverInput,
    db: AsyncSession = Depends(get_db),
):
    """Update a default approver."""
    try:
        approver = await approval_service.update_default_approver(db, approver_id, req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return DefaultApproverResponse(
        id=approver.id,
        approver_name=approver.approver_name,
        approver_role=approver.approver_role,
        approver_profile=approver.approver_profile,
        document_type=approver.document_type,
        is_default=approver.is_default,
        order=approver.order,
    )


@router.delete("/defaults/{approver_id}")
async def delete_default(
    approver_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a default approver."""
    try:
        await approval_service.delete_default_approver(db, approver_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": "Aprovador padrão removido"}


# ─── Safety Detection ────────────────────────────────────────

@router.post("/detect-safety/{version_id}")
async def detect_safety(
    version_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Run safety detection on a document version."""
    from app.services.ai_service import _get_version, _call_with_fallback
    from app.services.ai_agents import safety_detector

    version = await _get_version(db, version_id)
    text = version.extracted_text or ""

    result = await _call_with_fallback(
        lambda client: safety_detector.detect_safety(client, text),
        lambda: safety_detector.get_mock_safety_detection(text),
    )

    return result
