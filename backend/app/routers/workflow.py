from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.workflow import WorkflowActionRequest, WorkflowItemResponse
from app.services import workflow_service

router = APIRouter(prefix="/api/workflow", tags=["workflow"])


@router.get("/queue", response_model=list[WorkflowItemResponse])
async def get_workflow_queue(db: AsyncSession = Depends(get_db)):
    """Get all pending items in the workflow queue."""
    items = await workflow_service.get_queue(db)
    return [WorkflowItemResponse(**item) for item in items]


@router.post("/{version_id}/approve")
async def approve_version(version_id: int, db: AsyncSession = Depends(get_db)):
    """Approve a document version in the workflow queue."""
    try:
        item = await workflow_service.approve_document(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "message": "Document version approved",
        "workflow_item_id": item.id,
        "action": item.action,
    }


@router.post("/{version_id}/reject")
async def reject_version(
    version_id: int,
    body: WorkflowActionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reject a document version in the workflow queue."""
    try:
        item = await workflow_service.reject_document(db, version_id, body.comments)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "message": "Document version rejected",
        "workflow_item_id": item.id,
        "action": item.action,
        "comments": item.comments,
    }
