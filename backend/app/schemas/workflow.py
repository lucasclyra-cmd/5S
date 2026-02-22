from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class WorkflowItemResponse(BaseModel):
    id: int
    version_id: int
    document_code: str
    document_title: str
    assigned_to_profile: str
    action: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class WorkflowActionRequest(BaseModel):
    action: str  # approve, reject
    comments: Optional[str] = None
