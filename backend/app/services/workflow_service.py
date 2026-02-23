from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.version import DocumentVersion
from app.models.workflow import WorkflowQueue


async def create_workflow_item(db: AsyncSession, version_id: int) -> WorkflowQueue:
    """Add a document version to the workflow queue for review."""
    item = WorkflowQueue(
        version_id=version_id,
        assigned_to_profile="processos",
    )
    db.add(item)
    await db.flush()
    return item


async def get_queue(db: AsyncSession) -> list[dict]:
    """Get all pending (unresolved) workflow items with document details."""
    result = await db.execute(
        select(WorkflowQueue)
        .options(
            selectinload(WorkflowQueue.version).selectinload(DocumentVersion.document),
        )
        .where(WorkflowQueue.action.is_(None))
        .order_by(WorkflowQueue.created_at.asc())
    )
    items = result.scalars().all()

    queue = []
    for item in items:
        version = item.version
        document = version.document if version else None
        queue.append({
            "id": item.id,
            "version_id": item.version_id,
            "document_code": document.code if document else "",
            "document_title": document.title if document else "",
            "assigned_to_profile": item.assigned_to_profile,
            "action": item.action,
            "comments": item.comments,
            "created_at": item.created_at,
            "resolved_at": item.resolved_at,
        })

    return queue


async def approve_document(db: AsyncSession, version_id: int) -> WorkflowQueue:
    """Approve a document version in the workflow."""
    # Find the pending workflow item for this version
    result = await db.execute(
        select(WorkflowQueue).where(
            WorkflowQueue.version_id == version_id,
            WorkflowQueue.action.is_(None),
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise ValueError(f"No pending workflow item for version {version_id}")

    item.action = "approve"
    item.resolved_at = datetime.now(timezone.utc)

    # Update version status
    version_result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.document))
        .where(DocumentVersion.id == version_id)
    )
    version = version_result.scalar_one_or_none()
    if version:
        version.status = "approved"

        # Archive previous approved versions
        if version.document:
            prev_result = await db.execute(
                select(DocumentVersion).where(
                    DocumentVersion.document_id == version.document_id,
                    DocumentVersion.id != version.id,
                    DocumentVersion.status == "approved",
                )
            )
            for prev in prev_result.scalars().all():
                prev.status = "archived"
                prev.archived_at = datetime.now(timezone.utc)

            # Update document status to active
            version.document.status = "active"
            version.document.updated_at = datetime.now(timezone.utc)

    await db.flush()
    return item


async def reject_document(
    db: AsyncSession, version_id: int, comments: Optional[str] = None
) -> WorkflowQueue:
    """Reject a document version in the workflow."""
    result = await db.execute(
        select(WorkflowQueue).where(
            WorkflowQueue.version_id == version_id,
            WorkflowQueue.action.is_(None),
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise ValueError(f"No pending workflow item for version {version_id}")

    item.action = "reject"
    item.comments = comments
    item.resolved_at = datetime.now(timezone.utc)

    # Update version status
    version_result = await db.execute(
        select(DocumentVersion).where(DocumentVersion.id == version_id)
    )
    version = version_result.scalar_one_or_none()
    if version:
        version.status = "rejected"

    await db.flush()
    return item


async def skip_ai_approval(db: AsyncSession, code: str, version_id: int) -> WorkflowQueue:
    """Skip AI approval for a document version and send directly to workflow queue."""
    # Verify version exists and belongs to the document
    result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.document))
        .where(DocumentVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise ValueError(f"Version with id {version_id} not found")
    if version.document.code != code:
        raise ValueError(f"Version {version_id} does not belong to document '{code}'")

    # Mark as not AI approved
    version.ai_approved = False
    version.status = "in_review"

    # Create workflow item
    item = await create_workflow_item(db, version_id)
    await db.flush()
    return item
