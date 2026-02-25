from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SpellingError(BaseModel):
    original: str
    corrected: str
    position: int | str = ""
    context: str = ""


class ClaritySuggestion(BaseModel):
    original: str
    suggested: str
    reason: str = ""
    position: int | str = ""


class TextReviewResponse(BaseModel):
    id: int
    version_id: int
    iteration: int
    original_text: str
    ai_corrected_text: Optional[str] = None
    user_text: Optional[str] = None
    spelling_errors: list[SpellingError] = []
    clarity_suggestions: list[ClaritySuggestion] = []
    has_spelling_errors: bool
    has_clarity_suggestions: bool
    status: str
    user_skipped_clarity: bool = False
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SubmitTextRequest(BaseModel):
    user_text: str
    skip_clarity: bool = False
