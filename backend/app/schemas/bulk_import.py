"""Schemas for bulk document import."""

from typing import Optional

from pydantic import BaseModel


class ParsedFileItem(BaseModel):
    filename: str
    document_type: str
    sequential_number: int
    revision_number: int
    title: str
    code: str
    extension: str
    file_size_bytes: int


class ParseErrorItem(BaseModel):
    filename: str
    reason: str


class ConflictItem(BaseModel):
    filename: str
    code: str
    existing_document_id: int
    existing_title: str
    existing_status: str


class GroupedDocument(BaseModel):
    document_type: str
    sequential_number: int
    title: str
    latest_revision: int
    revisions: list[ParsedFileItem]
    will_import_as: str  # "new" or "conflict"
    conflict: Optional[ConflictItem] = None


class ScanResponse(BaseModel):
    total_files: int
    parsed_count: int
    error_count: int
    conflict_count: int
    grouped_documents: list[GroupedDocument]
    parse_errors: list[ParseErrorItem]


class ImportRequest(BaseModel):
    exclude_codes: list[str] = []


class ImportedDocumentResult(BaseModel):
    code: str
    title: str
    status: str  # "imported", "skipped", "error"
    master_list_code: Optional[str] = None
    error_message: Optional[str] = None


class ImportResponse(BaseModel):
    total_imported: int
    total_skipped: int
    total_errors: int
    results: list[ImportedDocumentResult]
