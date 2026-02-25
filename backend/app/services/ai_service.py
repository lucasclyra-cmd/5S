import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from sqlalchemy import or_

from app.config import settings
from app.models.version import DocumentVersion
from app.models.document import Document
from app.models.analysis import AIAnalysis
from app.models.changelog import Changelog
from app.models.config import AdminConfig
from app.models.template import DocumentTemplate
from app.models.text_review import TextReview
from app.services.ai_agents import (
    analysis_agent,
    formatting_agent,
    changelog_agent,
    spelling_agent,
    crossref_agent,
)

logger = logging.getLogger(__name__)


def get_openai_client() -> Optional[AsyncOpenAI]:
    """Create an OpenAI client if the API key is configured."""
    if settings.OPENAI_API_KEY:
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return None


async def _call_with_fallback(ai_call, mock_call) -> dict:
    """Try calling an AI agent; fall back to mock if no client or on error."""
    client = get_openai_client()
    if client:
        try:
            return await ai_call(client)
        except Exception:
            return mock_call()
    return mock_call()


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


async def _get_sections_for_type(
    db: AsyncSession, document_type: Optional[str]
) -> Optional[list[str]]:
    """Get mandatory sections for a document type from admin config.

    Returns the configured sections list, or None to use agent defaults.
    """
    if not document_type:
        return None
    query = (
        select(AdminConfig)
        .where(
            AdminConfig.config_type == "analysis_rules",
            AdminConfig.document_type == document_type,
        )
        .limit(1)
    )
    result = await db.execute(query)
    config = result.scalar_one_or_none()
    if config and config.config_data:
        sections = config.config_data.get("sections")
        if sections and isinstance(sections, list):
            return sections
    return None


async def _get_previous_version(db: AsyncSession, version: DocumentVersion) -> Optional[DocumentVersion]:
    """Get the previous version of a document for comparison."""
    if version.version_number <= 1:
        return None
    result = await db.execute(
        select(DocumentVersion).where(
            DocumentVersion.document_id == version.document_id,
            DocumentVersion.version_number == version.version_number - 1,
        )
    )
    return result.scalar_one_or_none()


# ──────────────────────────────────────────────────────────────
# Content consistency validation (for revisions)
# ──────────────────────────────────────────────────────────────

CONSISTENCY_PROMPT = """Você é um especialista em documentos corporativos.
Compare o TEMA/ASSUNTO do documento original com o novo documento submetido como revisão.

Ambos devem tratar do MESMO ASSUNTO GERAL. Se o novo documento tratar de um assunto
completamente diferente, isso indica que o autor pode ter selecionado o código errado.

Responda em JSON:
{
    "is_consistent": true/false,
    "confidence": 0.0 a 1.0,
    "original_topic": "Resumo do assunto do documento original",
    "new_topic": "Resumo do assunto do novo documento",
    "warning_message": "Mensagem de alerta se inconsistente, null se consistente"
}

Apenas retorne o JSON, sem texto adicional."""


async def _validate_content_consistency(
    old_text: str, new_text: str
) -> dict:
    """Validate that a revision's content is consistent with the original document."""
    result = await _call_with_fallback(
        lambda client: _ai_consistency_check(client, old_text, new_text),
        lambda: _mock_consistency_check(old_text, new_text),
    )
    return result


async def _ai_consistency_check(client: AsyncOpenAI, old_text: str, new_text: str) -> dict:
    """Use AI to check content consistency between versions."""
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": CONSISTENCY_PROMPT},
            {"role": "user", "content": (
                f"DOCUMENTO ORIGINAL:\n\n{old_text[:3000]}\n\n"
                f"---\n\n"
                f"NOVA VERSÃO (REVISÃO):\n\n{new_text[:3000]}"
            )},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    return json.loads(content)


def _mock_consistency_check(old_text: str, new_text: str) -> dict:
    """Mock consistency check — assumes consistent."""
    return {
        "is_consistent": True,
        "confidence": 0.8,
        "original_topic": "Documento original",
        "new_topic": "Nova versão do documento",
        "warning_message": None,
    }


# ──────────────────────────────────────────────────────────────
# Cross-reference validation (PQ documents only)
# ──────────────────────────────────────────────────────────────

async def _fetch_cited_documents(
    db: AsyncSession, references: list[dict]
) -> list[dict]:
    """Look up cited documents in the database and return their content."""
    results = []
    for ref in references:
        code_or_title = ref.get("code_or_title", "")
        if not code_or_title:
            continue

        search_pattern = f"%{code_or_title.strip()}%"
        stmt = (
            select(Document)
            .options(selectinload(Document.versions))
            .where(
                or_(
                    Document.code.ilike(search_pattern),
                    Document.title.ilike(search_pattern),
                )
            )
            .limit(1)
        )
        row = await db.execute(stmt)
        doc = row.scalar_one_or_none()

        if doc and doc.versions:
            latest_version = doc.versions[-1]
            results.append({
                "cited_document": code_or_title,
                "found_in_system": True,
                "extracted_text": latest_version.extracted_text or "",
            })
        else:
            results.append({
                "cited_document": code_or_title,
                "found_in_system": False,
                "extracted_text": None,
            })

    return results


async def _run_crossref_validation(
    db: AsyncSession, text: str
) -> list[dict]:
    """Run cross-reference validation for PQ documents. Returns feedback items."""
    # Step 1: Extract references from the PQ text
    references = await _call_with_fallback(
        lambda client: crossref_agent.extract_references(client, text),
        lambda: [],
    )

    if not references:
        return []

    # Step 2: Look up cited documents in the database
    refs_with_content = await _fetch_cited_documents(db, references)

    # Step 3: Validate with AI
    validation = await _call_with_fallback(
        lambda client: crossref_agent.validate_references(
            client, text, refs_with_content
        ),
        lambda: crossref_agent.get_mock_crossref(text),
    )

    # Convert to feedback items
    feedback_items = []
    cross_refs = validation.get("cross_references", [])
    for xref in cross_refs:
        issues = xref.get("issues")
        if not xref.get("found_in_system"):
            feedback_items.append({
                "item": f"Referência cruzada: {xref.get('cited_document', '?')}",
                "status": "rejected",
                "suggestion": issues or f"Documento '{xref.get('cited_document')}' não encontrado na plataforma.",
            })
        elif not xref.get("mentioned_in_text"):
            feedback_items.append({
                "item": f"Referência cruzada: {xref.get('cited_document', '?')}",
                "status": "rejected",
                "suggestion": issues or f"Documento citado no item 2 mas não referenciado no corpo do texto (item 3).",
            })
        elif xref.get("content_consistent") is False:
            feedback_items.append({
                "item": f"Referência cruzada: {xref.get('cited_document', '?')}",
                "status": "rejected",
                "suggestion": issues or "O conteúdo descrito sobre este documento difere do conteúdo real.",
            })
        else:
            feedback_items.append({
                "item": f"Referência cruzada: {xref.get('cited_document', '?')}",
                "status": "approved",
                "suggestion": None,
            })

    return feedback_items


# ──────────────────────────────────────────────────────────────
# Analysis (with consistency check + auto-changelog for revisions)
# ──────────────────────────────────────────────────────────────

async def run_analysis(db: AsyncSession, version_id: int) -> AIAnalysis:
    """Run the analysis agent on a document version.

    For revisions (version_number > 1):
    - Validates content consistency with the original document
    - Auto-generates changelog comparing with previous version
    """
    version = await _get_version(db, version_id)
    version.status = "analyzing"
    if version.document:
        version.document.status = "analyzing"
    await db.flush()

    try:
        text = version.extracted_text or ""
        doc = version.document
        category_id = doc.category_id if doc else None
        document_type = doc.document_type if doc else None

        # Get rules from admin config
        rules = await _get_admin_config(db, "analysis_rules", category_id)

        # Run standard analysis
        result = await _call_with_fallback(
            lambda client: analysis_agent.analyze(client, text, rules=rules, document_type=document_type),
            lambda: analysis_agent.get_mock_analysis(text),
        )

        # For revisions: validate content consistency + auto-generate changelog
        prev_version = await _get_previous_version(db, version)
        if prev_version and prev_version.extracted_text:
            old_text = prev_version.extracted_text

            # Content consistency validation
            consistency = await _validate_content_consistency(old_text, text)
            result["consistency_check"] = consistency

            if not consistency.get("is_consistent", True):
                # Add warning to feedback items (non-blocking)
                warning_msg = consistency.get("warning_message") or (
                    f"O conteúdo submetido parece diferir significativamente do documento "
                    f"{doc.code} original ({doc.title}). Verifique se selecionou o código correto."
                )
                result["feedback_items"].append({
                    "item": "Consistência código + conteúdo",
                    "status": "rejected",
                    "suggestion": warning_msg,
                })

            # Auto-generate changelog
            changelog_result = await _call_with_fallback(
                lambda client: changelog_agent.generate_changelog(client, text, old_text),
                lambda: changelog_agent.get_mock_changelog(text, old_text),
            )

            # Remove existing changelog for this version (prevents duplicates on re-analysis)
            existing_cls = await db.execute(
                select(Changelog).where(Changelog.version_id == version_id)
            )
            for old_cl in existing_cls.scalars().all():
                await db.delete(old_cl)

            # Save changelog record
            cl = Changelog(
                version_id=version_id,
                previous_version_id=prev_version.id,
                diff_content=changelog_result.get("diff_content"),
                summary=changelog_result.get("summary"),
            )
            db.add(cl)

            # Auto-fill change summary on the version
            version.change_summary = changelog_result.get("summary")

            # Include changelog in analysis result for frontend display
            result["auto_changelog"] = {
                "summary": changelog_result.get("summary"),
                "sections": changelog_result.get("diff_content", {}).get("sections", []),
            }
        elif version.version_number == 1:
            # First version — generate initial changelog
            changelog_result = await _call_with_fallback(
                lambda client: changelog_agent.generate_changelog(client, text, None),
                lambda: changelog_agent.get_mock_changelog(text, None),
            )

            # Remove existing changelog for this version (prevents duplicates on re-analysis)
            existing_cls = await db.execute(
                select(Changelog).where(Changelog.version_id == version_id)
            )
            for old_cl in existing_cls.scalars().all():
                await db.delete(old_cl)

            cl = Changelog(
                version_id=version_id,
                previous_version_id=None,
                diff_content=changelog_result.get("diff_content"),
                summary=changelog_result.get("summary"),
            )
            db.add(cl)

            # Auto-fill change summary for first version
            version.change_summary = "Versão inicial do documento"

        # Cross-reference validation (PQ documents only)
        if document_type == "PQ":
            crossref_items = await _run_crossref_validation(db, text)
            if crossref_items:
                result["feedback_items"].extend(crossref_items)

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

        # Spelling/clarity review
        spelling_result = await _call_with_fallback(
            lambda client: spelling_agent.review_spelling_clarity(client, text),
            lambda: spelling_agent.get_mock_review(text),
        )

        # Remove existing text reviews for this version (prevents duplicates on re-analysis)
        existing_trs = await db.execute(
            select(TextReview).where(TextReview.version_id == version_id)
        )
        for old_tr in existing_trs.scalars().all():
            await db.delete(old_tr)

        text_review = TextReview(
            version_id=version_id,
            iteration=1,
            original_text=text,
            ai_corrected_text=spelling_result.get("corrected_text"),
            spelling_errors=spelling_result.get("spelling_errors"),
            clarity_suggestions=spelling_result.get("clarity_suggestions"),
            has_spelling_errors=spelling_result.get("has_spelling_errors", False),
            has_clarity_suggestions=spelling_result.get("has_clarity_suggestions", False),
            status="reviewed" if spelling_result.get("has_spelling_errors", False) else "clean",
        )
        db.add(text_review)

        if spelling_result.get("has_spelling_errors", False):
            version.status = "spelling_review"
            if version.document:
                version.document.status = "spelling_review"
        else:
            version.status = "in_review"
            if version.document:
                version.document.status = "in_review"

        await db.flush()

        return analysis
    except Exception:
        version.status = "analysis_failed"
        if version.document:
            version.document.status = "analysis_failed"
        await db.flush()
        raise


# ──────────────────────────────────────────────────────────────
# Text Review (spelling/clarity loop)
# ──────────────────────────────────────────────────────────────

async def get_text_review(db: AsyncSession, version_id: int) -> Optional[TextReview]:
    """Get the latest text review for a version."""
    result = await db.execute(
        select(TextReview)
        .where(TextReview.version_id == version_id)
        .order_by(TextReview.iteration.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_text_review_history(db: AsyncSession, version_id: int) -> list[TextReview]:
    """Get all text review iterations for a version."""
    result = await db.execute(
        select(TextReview)
        .where(TextReview.version_id == version_id)
        .order_by(TextReview.iteration.asc())
    )
    return list(result.scalars().all())


async def submit_user_text(
    db: AsyncSession, version_id: int, user_text: str, skip_clarity: bool = False
) -> TextReview:
    """User submits their accepted/edited text. Triggers a spelling re-review."""
    version = await _get_version(db, version_id)

    current_review = await get_text_review(db, version_id)
    if current_review is None:
        raise ValueError(f"No text review found for version {version_id}")

    # Mark current review as resolved
    current_review.user_text = user_text
    current_review.user_skipped_clarity = skip_clarity
    current_review.status = (
        "user_accepted" if user_text == current_review.ai_corrected_text else "user_edited"
    )
    current_review.resolved_at = datetime.now(timezone.utc)

    # Run spelling-only re-review
    spelling_result = await _call_with_fallback(
        lambda client: spelling_agent.review_spelling_clarity(
            client, user_text, spelling_only=True
        ),
        lambda: spelling_agent.get_mock_review(user_text, spelling_only=True),
    )

    new_review = TextReview(
        version_id=version_id,
        iteration=current_review.iteration + 1,
        original_text=user_text,
        ai_corrected_text=spelling_result.get("corrected_text"),
        spelling_errors=spelling_result.get("spelling_errors"),
        clarity_suggestions=spelling_result.get("clarity_suggestions"),
        has_spelling_errors=spelling_result.get("has_spelling_errors", False),
        has_clarity_suggestions=spelling_result.get("has_clarity_suggestions", False),
        status="reviewed" if spelling_result.get("has_spelling_errors", False) else "clean",
    )
    db.add(new_review)

    if not spelling_result.get("has_spelling_errors", False):
        # Spelling is clean — update version text and advance
        version.extracted_text = user_text
        version.status = "in_review"
    else:
        version.status = "spelling_review"

    await db.flush()
    return new_review


async def accept_text_and_advance(db: AsyncSession, version_id: int) -> TextReview:
    """Accept the current clean text and advance past spelling review."""
    version = await _get_version(db, version_id)
    current_review = await get_text_review(db, version_id)
    if current_review is None:
        raise ValueError(f"No text review found for version {version_id}")

    if current_review.has_spelling_errors:
        raise ValueError("Cannot advance: there are still spelling errors")

    final_text = current_review.ai_corrected_text or current_review.original_text
    current_review.user_text = final_text
    current_review.status = "clean"
    current_review.resolved_at = datetime.now(timezone.utc)

    version.extracted_text = final_text
    version.status = "in_review"
    await db.flush()

    return current_review


# ──────────────────────────────────────────────────────────────
# Formatting (template-aware)
# ──────────────────────────────────────────────────────────────

async def _get_active_template(db: AsyncSession, document_type: str) -> Optional[DocumentTemplate]:
    """Get the active template for a document type."""
    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.document_type == document_type,
            DocumentTemplate.is_active == True,
        ).limit(1)
    )
    return result.scalars().first()


async def run_formatting(db: AsyncSession, version_id: int) -> tuple[DocumentVersion, str, list[str]]:
    """Run the formatting agent on a document version.

    If an active template exists for the document type, uses template_service
    to inject content into the template. Otherwise falls back to the generic
    document generator.

    Returns (version, formatting_method, warnings).
    """
    version = await _get_version(db, version_id)
    version.status = "formatting"
    await db.flush()

    try:
        text = version.extracted_text or ""
        doc = version.document
        category_id = doc.category_id if doc else None
        document_type = doc.document_type if doc else None

        # Get template config from admin
        template_config = await _get_admin_config(db, "template", category_id)

        # Get mandatory sections from admin config (falls back to defaults in agent)
        sections = await _get_sections_for_type(db, document_type)

        # Run AI restructuring to organize content into sections
        result = await _call_with_fallback(
            lambda client: formatting_agent.restructure(
                client, text, template_config=template_config, document_type=document_type, sections=sections
            ),
            lambda: formatting_agent.get_mock_restructure(text, document_type=document_type, sections=sections),
        )

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

        # Generate formatted document
        formatted_dir = os.path.join(settings.STORAGE_PATH, "formatted")
        os.makedirs(formatted_dir, exist_ok=True)
        base_name = f"doc_{version.document_id}_v{version.version_number}"
        docx_path = os.path.join(formatted_dir, f"{base_name}.docx")
        pdf_path = os.path.join(formatted_dir, f"{base_name}.pdf")

        # Check for an active template
        template = None
        template_path_for_formatting = None
        formatting_method = "generic"
        formatting_warnings: list[str] = []

        if document_type:
            template = await _get_active_template(db, document_type)

        if template:
            # Prefer pre-converted .docx; fall back to original file
            if template.docx_file_path and os.path.exists(template.docx_file_path):
                template_path_for_formatting = template.docx_file_path
            elif os.path.exists(template.template_file_path):
                template_path_for_formatting = template.template_file_path

        if template_path_for_formatting:
            logger.info(f"Usando template '{template.name}' (id={template.id}) para {document_type}")
            from app.services.template_service import format_document_with_template

            # Build metadata
            revision_str = f".{doc.revision_number:02d}" if doc else ""
            metadata = {
                "title": doc.title if doc else "",
                "code": doc.code if doc else "",
                "revision": f"{doc.revision_number:02d}" if doc else "00",
                "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
                "sector": doc.sector or "",
            }

            # Get changelog entries for revision history table
            changelog_entries = []
            cl_result = await db.execute(
                select(Changelog).where(Changelog.version_id == version_id)
            )
            cl = cl_result.scalars().first()
            if cl and cl.diff_content:
                sections = cl.diff_content.get("sections", [])
                changes_text = "; ".join(
                    s.get("description", "") for s in sections if s.get("description")
                )
                changelog_entries.append({
                    "revision": f"{doc.revision_number:02d}" if doc else "00",
                    "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
                    "changes": changes_text or cl.summary or "Versão inicial",
                    "responsible": doc.created_by_profile if doc else "",
                })

            # Get approval data (if any)
            approval_data = []
            try:
                from app.models.approval import ApprovalChain, ApprovalChainApprover
                chain_result = await db.execute(
                    select(ApprovalChain)
                    .options(selectinload(ApprovalChain.approvers))
                    .where(ApprovalChain.version_id == version_id)
                )
                chain = chain_result.scalar_one_or_none()
                if chain:
                    for approver in chain.approvers:
                        if approver.action == "approve":
                            approval_data.append({
                                "type": chain.chain_type or "A",
                                "date": approver.acted_at.strftime("%d/%m/%Y") if approver.acted_at else "",
                                "name": approver.approver_name,
                                "sector": approver.approver_role,
                                "signature": "",
                            })
            except Exception:
                pass

            try:
                docx_out, pdf_out = await format_document_with_template(
                    template_path=template_path_for_formatting,
                    structured_content=result,
                    metadata=metadata,
                    source_docx_path=version.original_file_path,
                    changelog_entries=changelog_entries,
                    approval_data=approval_data,
                    output_docx_path=docx_path,
                    output_pdf_path=pdf_path,
                )
                version.formatted_file_path_docx = docx_out
                version.formatted_file_path_pdf = pdf_out
                formatting_method = "template"
            except Exception as e:
                # Template formatting failed — fall back to generic
                msg = f"Template '{template.name}' falhou: {e}. Gerador genérico utilizado."
                formatting_warnings.append(msg)
                logger.error(f"Formatação com template falhou: {e}. Usando gerador genérico.")
                try:
                    from app.services.document_generator import format_document
                    d_path, p_path = await format_document(version, result, template_config, settings.STORAGE_PATH)
                    version.formatted_file_path_docx = d_path
                    version.formatted_file_path_pdf = p_path
                except Exception:
                    pass
        else:
            # No template — use generic document generator (fallback)
            warning_msg = (
                f"Nenhum template ativo para '{document_type}' — usando gerador genérico. "
                f"Faça upload de um template pelo Admin ou verifique se os templates padrão foram carregados."
            )
            logger.warning(warning_msg)
            formatting_warnings.append(warning_msg)
            from app.services.document_generator import format_document
            try:
                d_path, p_path = await format_document(version, result, template_config, settings.STORAGE_PATH)
                version.formatted_file_path_docx = d_path
                version.formatted_file_path_pdf = p_path
            except Exception:
                pass

        version.status = "in_review"
        await db.flush()

        return version, formatting_method, formatting_warnings
    except Exception:
        version.status = "formatting_failed"
        await db.flush()
        raise


# ──────────────────────────────────────────────────────────────
# Changelog (standalone — kept for backward compatibility)
# ──────────────────────────────────────────────────────────────

async def run_changelog(db: AsyncSession, version_id: int) -> Changelog:
    """Run the changelog agent on a document version.

    Note: Changelog is now auto-generated during run_analysis().
    This function exists for standalone/manual changelog generation.
    """
    version = await _get_version(db, version_id)

    # Check if changelog already exists (from auto-generation in analysis)
    existing = await db.execute(
        select(Changelog).where(Changelog.version_id == version_id)
    )
    existing_cl = existing.scalars().first()
    if existing_cl:
        return existing_cl

    text = version.extracted_text or ""

    # Find previous version
    old_text = None
    previous_version_id = None
    prev_version = await _get_previous_version(db, version)
    if prev_version:
        old_text = prev_version.extracted_text
        previous_version_id = prev_version.id

    result = await _call_with_fallback(
        lambda client: changelog_agent.generate_changelog(client, text, old_text),
        lambda: changelog_agent.get_mock_changelog(text, old_text),
    )

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


# ──────────────────────────────────────────────────────────────
# Background task wrapper for auto-analysis after upload
# ──────────────────────────────────────────────────────────────

async def run_analysis_background(version_id: int) -> None:
    """Run AI analysis as a background task with its own DB session.

    Called from BackgroundTasks after document upload/resubmit.
    Creates a fresh session because the request session is already closed.
    """
    from app.database import async_session_factory

    async with async_session_factory() as db:
        try:
            await run_analysis(db, version_id)
            await db.commit()
        except Exception as e:
            await db.rollback()
            # Persist "analysis_failed" status in a clean session
            try:
                async with async_session_factory() as fallback_db:
                    ver = await _get_version(fallback_db, version_id)
                    ver.status = "analysis_failed"
                    if ver.document:
                        ver.document.status = "analysis_failed"
                    await fallback_db.commit()
            except Exception:
                pass
            logger.error(f"Background analysis failed for version {version_id}: {e}")
