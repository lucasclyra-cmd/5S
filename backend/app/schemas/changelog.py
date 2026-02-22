from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class ChangelogResponse(BaseModel):
    id: int
    version_id: int
    previous_version_id: Optional[int] = None
    diff_content: Optional[dict[str, Any]] = None
    summary: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
