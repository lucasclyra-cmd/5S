from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class TagResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class AdminConfigCreate(BaseModel):
    config_type: str  # template, analysis_rules, prompt
    category_id: Optional[int] = None
    document_type: Optional[str] = None
    config_data: dict[str, Any]


class AdminConfigUpdate(BaseModel):
    config_type: Optional[str] = None
    category_id: Optional[int] = None
    document_type: Optional[str] = None
    config_data: Optional[dict[str, Any]] = None


class AdminConfigResponse(BaseModel):
    id: int
    config_type: str
    category_id: Optional[int] = None
    document_type: Optional[str] = None
    config_data: dict[str, Any]
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
