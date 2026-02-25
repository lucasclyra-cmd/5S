from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.changelog import Changelog
from app.schemas.analysis import AnalysisResponse, FeedbackItem
from app.schemas.text_review import TextReviewResponse, SubmitTextRequest
from app.schemas.versions import ChangelogResponse
from app.services import ai_service, versioning_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _analysis_to_response(analysis) -> AnalysisResponse:
    return AnalysisResponse(
        id=analysis.id,
        version_id=analysis.version_id,
        agent_type=analysis.agent_type,
        feedback_items=[
            FeedbackItem(**item) for item in (analysis.feedback_items or [])
        ],
        approved=analysis.approved,
        created_at=analysis.created_at,
    )


@router.post("/analyze/{version_id}", response_model=AnalysisResponse)
async def trigger_analysis(version_id: int, db: AsyncSession = Depends(get_db)):
    """Trigger AI analysis on a document version."""
    try:
        analysis = await ai_service.run_analysis(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return _analysis_to_response(analysis)


@router.get("/analysis/{version_id}", response_model=list[AnalysisResponse])
async def get_analysis_results(version_id: int, db: AsyncSession = Depends(get_db)):
    """Get all AI analysis results for a document version."""
    version = await versioning_service.get_version(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    return [_analysis_to_response(a) for a in version.analyses]


@router.post("/format/{version_id}")
async def trigger_formatting(version_id: int, db: AsyncSession = Depends(get_db)):
    """Trigger AI formatting on a document version."""
    try:
        version, formatting_method, warnings = await ai_service.run_formatting(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Formatting failed: {str(e)}")

    return {
        "message": "Formatting complete",
        "version_id": version.id,
        "formatted_file_path_docx": version.formatted_file_path_docx,
        "formatted_file_path_pdf": version.formatted_file_path_pdf,
        "formatting_method": formatting_method,
        "warnings": warnings,
    }


@router.get("/changelog/{version_id}", response_model=ChangelogResponse)
async def get_changelog(version_id: int, db: AsyncSession = Depends(get_db)):
    """Get existing changelog for a version without regenerating."""
    result = await db.execute(
        select(Changelog)
        .where(Changelog.version_id == version_id)
        .order_by(Changelog.created_at.desc())
    )
    changelog = result.scalars().first()
    if changelog is None:
        raise HTTPException(status_code=404, detail="No changelog found for this version")
    return changelog


@router.post("/changelog/{version_id}", response_model=ChangelogResponse)
async def trigger_changelog(version_id: int, db: AsyncSession = Depends(get_db)):
    """Trigger changelog generation for a document version."""
    try:
        changelog = await ai_service.run_changelog(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Changelog generation failed: {str(e)}")

    return changelog


# ──────────────────────────────────────────────────────────────
# Text Review (spelling/clarity loop)
# ──────────────────────────────────────────────────────────────

@router.get("/text-review/{version_id}", response_model=TextReviewResponse)
async def get_text_review(version_id: int, db: AsyncSession = Depends(get_db)):
    """Get the latest text review for a document version."""
    review = await ai_service.get_text_review(db, version_id)
    if review is None:
        raise HTTPException(
            status_code=404, detail="No text review found for this version"
        )
    return review


@router.get(
    "/text-review/{version_id}/history", response_model=list[TextReviewResponse]
)
async def get_text_review_history(
    version_id: int, db: AsyncSession = Depends(get_db)
):
    """Get all text review iterations for a document version."""
    return await ai_service.get_text_review_history(db, version_id)


@router.post("/text-review/{version_id}/submit", response_model=TextReviewResponse)
async def submit_text_review(
    version_id: int,
    body: SubmitTextRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit user-edited text for re-review. Triggers a new spelling check."""
    try:
        review = await ai_service.submit_user_text(
            db, version_id, body.user_text, skip_clarity=body.skip_clarity
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Text review failed: {str(e)}"
        )
    return review


@router.post("/text-review/{version_id}/accept", response_model=TextReviewResponse)
async def accept_text_review(
    version_id: int, db: AsyncSession = Depends(get_db)
):
    """Accept the current clean text and advance past spelling review."""
    try:
        review = await ai_service.accept_text_and_advance(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Accept failed: {str(e)}"
        )
    return review
