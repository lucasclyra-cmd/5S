import json
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.version import DocumentVersion
from app.models.analysis import AIAnalysis
from app.models.changelog import Changelog
from app.models.config import AdminConfig
from app.services.ai_agents import analysis_agent, formatting_agent, changelog_agent


def get_openai_client() -> Optional[AsyncOpenAI]:
    """Create an OpenAI client if the API key is configured."""
    if settings.OPENAI_API_KEY:
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return None


async def _get_version(db: AsyncSession, version_id: int) -> DocumentVersion:
    """Fetch a document version by ID."""
    result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.document))
        .where(DocumentVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise ValueError(f"Version with id {version_id} not found")
    return version


async def _get_admin_config(
    db: AsyncSession, config_type: str, category_id: Optional[int] = None
) -> Optional[dict]:
    """Get admin configuration for a given type and optional category."""
    query = select(AdminConfig).where(AdminConfig.config_type == config_type)
    if category_id is not None:
        query = query.where(
            (AdminConfig.category_id == category_id) | (AdminConfig.category_id.is_(None))
        ).order_by(AdminConfig.category_id.desc())
    else:
        query = query.where(AdminConfig.category_id.is_(None))
    query = query.limit(1)

    result = await db.execute(query)
    config = result.scalar_one_or_none()
    return config.config_data if config else None


async def run_analysis(db: AsyncSession, version_id: int) -> AIAnalysis:
    """Run the analysis agent on a document version."""
    version = await _get_version(db, version_id)
    version.status = "analyzing"
    await db.flush()

    text = version.extracted_text or ""
    category_id = version.document.category_id if version.document else None

    # Get rules from admin config
    rules = await _get_admin_config(db, "analysis_rules", category_id)

    client = get_openai_client()
    if client:
        try:
            result = await analysis_agent.analyze(
                client, text, rules=rules, document_type=None
            )
        except Exception as e:
            result = analysis_agent.get_mock_analysis(text)
            result["error"] = str(e)
    else:
        result = analysis_agent.get_mock_analysis(text)

    # Save analysis
    analysis = AIAnalysis(
        version_id=version_id,
        agent_type="analysis",
        prompt_used="analysis_agent.analyze",
        response=json.dumps(result),
        feedback_items=result.get("feedback_items", []),
        approved=result.get("approved"),
    )
    db.add(analysis)

    # Update version
    version.ai_approved = result.get("approved")
    version.status = "in_review"
    await db.flush()

    return analysis


async def run_formatting(db: AsyncSession, version_id: int) -> DocumentVersion:
    """Run the formatting agent on a document version."""
    version = await _get_version(db, version_id)
    version.status = "formatting"
    await db.flush()

    text = version.extracted_text or ""
    category_id = version.document.category_id if version.document else None

    # Get template config
    template_config = await _get_admin_config(db, "template", category_id)

    client = get_openai_client()
    if client:
        try:
            result = await formatting_agent.restructure(
                client, text, template_config=template_config, document_type=None
            )
        except Exception:
            result = formatting_agent.get_mock_restructure(text)
    else:
        result = formatting_agent.get_mock_restructure(text)

    # Save formatting analysis record
    format_analysis = AIAnalysis(
        version_id=version_id,
        agent_type="formatting",
        prompt_used="formatting_agent.restructure",
        response=json.dumps(result),
        feedback_items=None,
        approved=True,
    )
    db.add(format_analysis)
    await db.flush()

    # Generate the formatted document
    from app.services.document_generator import format_document

    try:
        docx_path, pdf_path = await format_document(version, result, template_config, settings.STORAGE_PATH)
        version.formatted_file_path_docx = docx_path
        version.formatted_file_path_pdf = pdf_path
    except Exception:
        # If formatting fails, keep going without formatted files
        pass

    version.status = "in_review"
    await db.flush()

    return version


async def run_changelog(db: AsyncSession, version_id: int) -> Changelog:
    """Run the changelog agent on a document version."""
    version = await _get_version(db, version_id)

    text = version.extracted_text or ""

    # Find previous version
    old_text = None
    previous_version_id = None
    if version.version_number > 1:
        result = await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == version.document_id,
                DocumentVersion.version_number == version.version_number - 1,
            )
        )
        prev_version = result.scalar_one_or_none()
        if prev_version:
            old_text = prev_version.extracted_text
            previous_version_id = prev_version.id

    client = get_openai_client()
    if client:
        try:
            result = await changelog_agent.generate_changelog(client, text, old_text)
        except Exception:
            result = changelog_agent.get_mock_changelog(text, old_text)
    else:
        result = changelog_agent.get_mock_changelog(text, old_text)

    # Save changelog
    cl = Changelog(
        version_id=version_id,
        previous_version_id=previous_version_id,
        diff_content=result.get("diff_content"),
        summary=result.get("summary"),
    )
    db.add(cl)

    # Save analysis record
    cl_analysis = AIAnalysis(
        version_id=version_id,
        agent_type="changelog",
        prompt_used="changelog_agent.generate_changelog",
        response=json.dumps(result),
        feedback_items=None,
        approved=True,
    )
    db.add(cl_analysis)
    await db.flush()

    return cl
