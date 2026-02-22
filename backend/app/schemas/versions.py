from pydantic import BaseModel
from datetime import datetime
from typing import Optional


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

    model_config = {"from_attributes": True}
