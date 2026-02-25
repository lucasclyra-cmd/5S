from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    document_type: str
    template_file_path: str
    docx_file_path: Optional[str] = None
    is_active: bool
    section_mapping: Optional[dict] = None
    header_config: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    templates: list[TemplateResponse]
    total: int
