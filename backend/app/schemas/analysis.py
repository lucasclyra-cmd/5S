from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FeedbackItem(BaseModel):
    item: str
    status: str  # approved, rejected
    suggestion: Optional[str] = None


class AnalysisResponse(BaseModel):
    id: int
    version_id: int
    agent_type: str
    feedback_items: list[FeedbackItem] = []
    approved: Optional[bool] = None
    created_at: datetime

    model_config = {"from_attributes": True}
