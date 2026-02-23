from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.approval import ApprovalChain, ApprovalChainApprover, DefaultApprover
from app.models.version import DocumentVersion
from app.services import master_list_service


async def create_approval_chain(
    db: AsyncSession,
    version_id: int,
    chain_type: str,
    approvers: list[dict],
) -> ApprovalChain:
    """Create an approval chain with approvers for a document version."""
    chain = ApprovalChain(
        version_id=version_id,
        chain_type=chain_type,
        status="pending",
    )
    db.add(chain)
    await db.flush()

    for i, approver_data in enumerate(approvers):
        approver = ApprovalChainApprover(
            chain_id=chain.id,
            approver_name=approver_data["approver_name"],
            approver_role=approver_data["approver_role"],
            approver_profile=approver_data.get("approver_profile", "processos"),
            order=approver_data.get("order", i),
            is_required=approver_data.get("is_required", True),
            ai_recommended=approver_data.get("ai_recommended", False),
        )
        db.add(approver)

    await db.flush()

    # Update document version status
    version_result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.document))
        .where(DocumentVersion.id == version_id)
    )
    version = version_result.scalar_one_or_none()
    if version:
        version.status = "in_review"
        if version.document:
            version.document.status = "in_review"
    await db.flush()

    # Reload with approvers
    result = await db.execute(
        select(ApprovalChain)
        .options(selectinload(ApprovalChain.approvers))
        .where(ApprovalChain.id == chain.id)
    )
    return result.scalar_one()


async def get_chain(db: AsyncSession, chain_id: int) -> Optional[ApprovalChain]:
    """Get an approval chain by ID."""
    result = await db.execute(
        select(ApprovalChain)
        .options(selectinload(ApprovalChain.approvers))
        .where(ApprovalChain.id == chain_id)
    )
    return result.scalar_one_or_none()


async def get_chain_by_version(db: AsyncSession, version_id: int) -> Optional[ApprovalChain]:
    """Get the active approval chain for a version."""
    result = await db.execute(
        select(ApprovalChain)
        .options(selectinload(ApprovalChain.approvers))
        .where(
            ApprovalChain.version_id == version_id,
            ApprovalChain.status == "pending",
        )
        .order_by(ApprovalChain.created_at.desc())
    )
    return result.scalars().first()


async def record_approver_action(
    db: AsyncSession,
    chain_id: int,
    approver_id: int,
    action: str,
    comments: Optional[str] = None,
) -> ApprovalChain:
    """Record an individual approver's action and resolve chain if complete."""
    # Get the approver
    approver_result = await db.execute(
        select(ApprovalChainApprover).where(
            ApprovalChainApprover.id == approver_id,
            ApprovalChainApprover.chain_id == chain_id,
        )
    )
    approver = approver_result.scalar_one_or_none()
    if approver is None:
        raise ValueError(f"Aprovador {approver_id} não encontrado na cadeia {chain_id}")
    if approver.action is not None:
        raise ValueError(f"Aprovador {approver.approver_name} já registrou sua decisão")

    approver.action = action
    approver.comments = comments
    approver.acted_at = datetime.now(timezone.utc)
    await db.flush()

    # Check if chain is resolved
    chain = await get_chain(db, chain_id)
    if chain is None:
        raise ValueError(f"Cadeia {chain_id} não encontrada")

    await _resolve_chain_if_complete(db, chain)

    return chain


async def _resolve_chain_if_complete(db: AsyncSession, chain: ApprovalChain) -> None:
    """Check if all required approvers have acted and resolve the chain."""
    required_approvers = [a for a in chain.approvers if a.is_required]
    all_acted = all(a.action is not None for a in required_approvers)

    if not all_acted:
        return

    # Check for any rejection
    any_rejected = any(a.action == "reject" for a in required_approvers)

    if any_rejected:
        chain.status = "rejected"
        chain.completed_at = datetime.now(timezone.utc)
        await _update_document_status(db, chain.version_id, "rejected")
    else:
        chain.status = "approved"
        chain.completed_at = datetime.now(timezone.utc)
        await _approve_document(db, chain.version_id)

    await db.flush()


async def _update_document_status(db: AsyncSession, version_id: int, status: str) -> None:
    """Update the document and version status."""
    version_result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.document))
        .where(DocumentVersion.id == version_id)
    )
    version = version_result.scalar_one_or_none()
    if version:
        version.status = status
        if version.document:
            version.document.status = status
            version.document.updated_at = datetime.now(timezone.utc)
    await db.flush()


async def _approve_document(db: AsyncSession, version_id: int) -> None:
    """Approve a document: set active, archive previous versions, add to master list."""
    version_result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.document))
        .where(DocumentVersion.id == version_id)
    )
    version = version_result.scalar_one_or_none()
    if not version:
        return

    version.status = "approved"

    if version.document:
        # Archive previous versions
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

        # Set document to active
        version.document.status = "active"
        version.document.updated_at = datetime.now(timezone.utc)
        version.document.effective_date = datetime.now(timezone.utc)

        # Add to master list
        await master_list_service.add_to_master_list(db, version.document.id)

    await db.flush()


async def update_training_requirement(
    db: AsyncSession, chain_id: int, requires_training: bool
) -> ApprovalChain:
    """Update whether the changes require training."""
    chain = await get_chain(db, chain_id)
    if chain is None:
        raise ValueError(f"Cadeia {chain_id} não encontrada")
    chain.requires_training = requires_training
    await db.flush()
    return chain


async def get_pending_approvals(db: AsyncSession) -> list[dict]:
    """Get all pending approval chains with document details."""
    result = await db.execute(
        select(ApprovalChain)
        .options(
            selectinload(ApprovalChain.approvers),
            selectinload(ApprovalChain.version).selectinload(DocumentVersion.document),
        )
        .where(ApprovalChain.status == "pending")
        .order_by(ApprovalChain.created_at.asc())
    )
    chains = result.scalars().all()

    items = []
    for chain in chains:
        doc = chain.version.document if chain.version else None
        approved_count = sum(1 for a in chain.approvers if a.action == "approve")
        pending_count = sum(1 for a in chain.approvers if a.action is None)

        items.append({
            "chain_id": chain.id,
            "version_id": chain.version_id,
            "document_code": doc.code if doc else "",
            "document_title": doc.title if doc else "",
            "chain_type": chain.chain_type,
            "chain_status": chain.status,
            "total_approvers": len(chain.approvers),
            "approved_count": approved_count,
            "pending_count": pending_count,
            "created_at": chain.created_at,
        })

    return items


# ─── Default Approvers CRUD ─────────────────────────────────

async def get_default_approvers(
    db: AsyncSession, document_type: Optional[str] = None
) -> list[DefaultApprover]:
    """Get default approvers, optionally filtered by document type."""
    query = select(DefaultApprover).order_by(DefaultApprover.order)
    if document_type:
        query = query.where(
            (DefaultApprover.document_type == document_type)
            | (DefaultApprover.document_type.is_(None))
        )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_default_approver(db: AsyncSession, data: dict) -> DefaultApprover:
    """Create a new default approver."""
    approver = DefaultApprover(**data)
    db.add(approver)
    await db.flush()
    return approver


async def update_default_approver(db: AsyncSession, approver_id: int, data: dict) -> DefaultApprover:
    """Update an existing default approver."""
    result = await db.execute(
        select(DefaultApprover).where(DefaultApprover.id == approver_id)
    )
    approver = result.scalar_one_or_none()
    if approver is None:
        raise ValueError(f"Aprovador padrão {approver_id} não encontrado")

    for key, value in data.items():
        if hasattr(approver, key):
            setattr(approver, key, value)
    await db.flush()
    return approver


async def delete_default_approver(db: AsyncSession, approver_id: int) -> None:
    """Delete a default approver."""
    result = await db.execute(
        select(DefaultApprover).where(DefaultApprover.id == approver_id)
    )
    approver = result.scalar_one_or_none()
    if approver is None:
        raise ValueError(f"Aprovador padrão {approver_id} não encontrado")
    await db.delete(approver)
    await db.flush()
