from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.schemas.versions import VersionResponse


class DocumentCreate(BaseModel):
    code: str
    title: str
    category_id: Optional[int] = None
    tags: Optional[list[str]] = None
    created_by_profile: str


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None


class DocumentResponse(BaseModel):
    id: int
    code: str
    title: str
    category_id: Optional[int] = None
    current_version: int
    status: str
    created_by_profile: str
    created_at: datetime
    updated_at: datetime
    tags: list[str] = []

    model_config = {"from_attributes": True}


class DocumentDetailResponse(DocumentResponse):
    versions: list[VersionResponse] = []

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class DocumentUploadResponse(BaseModel):
    document: DocumentResponse
    version: VersionResponse
