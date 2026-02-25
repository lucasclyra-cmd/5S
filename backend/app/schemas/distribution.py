from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DistributionCreate(BaseModel):
    recipient_name: str
    recipient_role: Optional[str] = None
    recipient_email: Optional[str] = None


class DistributionResponse(BaseModel):
    id: int
    document_id: int
    recipient_name: str
    recipient_role: Optional[str] = None
    recipient_email: Optional[str] = None
    notified_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DistributionListResponse(BaseModel):
    distributions: list[DistributionResponse]
    total: int
