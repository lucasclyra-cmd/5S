from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.analysis import AnalysisResponse, FeedbackItem
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
        version = await ai_service.run_formatting(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Formatting failed: {str(e)}")

    return {
        "message": "Formatting complete",
        "version_id": version.id,
        "formatted_file_path_docx": version.formatted_file_path_docx,
        "formatted_file_path_pdf": version.formatted_file_path_pdf,
    }


@router.post("/changelog/{version_id}")
async def trigger_changelog(version_id: int, db: AsyncSession = Depends(get_db)):
    """Trigger changelog generation for a document version."""
    try:
        changelog = await ai_service.run_changelog(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Changelog generation failed: {str(e)}")

    return {
        "message": "Changelog generated",
        "changelog_id": changelog.id,
        "version_id": changelog.version_id,
        "previous_version_id": changelog.previous_version_id,
        "summary": changelog.summary,
        "diff_content": changelog.diff_content,
    }
