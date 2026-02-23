from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ─── Approver DTOs ───────────────────────────────────────────

class ApproverInput(BaseModel):
    approver_name: str
    approver_role: str
    approver_profile: str = "processos"
    is_required: bool = True
    ai_recommended: bool = False
    order: int = 0


class ApproverResponse(BaseModel):
    id: int
    chain_id: int
    approver_name: str
    approver_role: str
    approver_profile: str
    order: int
    action: Optional[str] = None
    comments: Optional[str] = None
    is_required: bool
    ai_recommended: bool
    acted_at: Optional[datetime] = None


# ─── Chain DTOs ──────────────────────────────────────────────

class CreateChainRequest(BaseModel):
    version_id: int
    chain_type: str = "A"
    approvers: list[ApproverInput]


class ApproverActionRequest(BaseModel):
    action: str  # approve, reject
    comments: Optional[str] = None


class TrainingUpdateRequest(BaseModel):
    requires_training: bool


class ChainResponse(BaseModel):
    id: int
    version_id: int
    chain_type: str
    requires_training: Optional[bool] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    approvers: list[ApproverResponse] = []


# ─── Default Approvers ──────────────────────────────────────

class DefaultApproverInput(BaseModel):
    approver_name: str
    approver_role: str
    approver_profile: str = "processos"
    document_type: Optional[str] = None
    is_default: bool = True
    order: int = 0


class DefaultApproverResponse(BaseModel):
    id: int
    approver_name: str
    approver_role: str
    approver_profile: str
    document_type: Optional[str] = None
    is_default: bool
    order: int


# ─── Pending Queue ───────────────────────────────────────────

class PendingApprovalItem(BaseModel):
    chain_id: int
    version_id: int
    document_code: str
    document_title: str
    chain_type: str
    chain_status: str
    total_approvers: int
    approved_count: int
    pending_count: int
    created_at: datetime
