from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MasterListEntryResponse(BaseModel):
    id: int
    document_id: int
    master_list_code: str
    entry_type: str

    # Joined from Document
    document_code: str
    document_title: str
    document_type: Optional[str] = None
    revision_number: int = 0
    effective_date: Optional[datetime] = None
    sector: Optional[str] = None
    status: str

    added_at: datetime
    removed_at: Optional[datetime] = None


class MasterListResponse(BaseModel):
    entries: list[MasterListEntryResponse]
    total: int


class MasterListStatsResponse(BaseModel):
    total_active: int
    total_by_type: dict[str, int]
    latest_update: Optional[datetime] = None
