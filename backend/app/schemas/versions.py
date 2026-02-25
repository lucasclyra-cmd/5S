from pydantic import BaseModel
from datetime import datetime
from typing import Any, Optional


class VersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    original_file_path: str
    formatted_file_path_docx: Optional[str] = None
    formatted_file_path_pdf: Optional[str] = None
    extracted_text: Optional[str] = None
    ai_approved: Optional[bool] = None
    status: str
    submitted_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    change_summary: Optional[str] = None

    model_config = {"from_attributes": True}


class ChangelogResponse(BaseModel):
    id: int
    version_id: int
    previous_version_id: Optional[int] = None
    diff_content: Optional[dict[str, Any]] = None
    summary: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
