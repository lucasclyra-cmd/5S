"""Service for bulk-importing legacy approved documents from a folder."""

import logging
import os
import re
import shutil
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.document import Document
from app.models.version import DocumentVersion
from app.services import coding_service
from app.services.document_parser import extract_text
from app.services.master_list_service import add_to_master_list
from app.schemas.bulk_import import (
    ConflictItem,
    GroupedDocument,
    ImportedDocumentResult,
    ImportRequest,
    ImportResponse,
    ParsedFileItem,
    ParseErrorItem,
    ScanResponse,
)

logger = logging.getLogger(__name__)

IMPORT_FILENAME_PATTERN = re.compile(
    r"^(PQ|IT|RQ)-(\d{3})\.(\d{2})\s+(.+)\.(docx|odt|pdf)$",
    re.IGNORECASE,
)

IMPORT_DIR = os.path.join(settings.STORAGE_PATH, "import")


def _parse_filename(filename: str, file_size: int) -> ParsedFileItem | ParseErrorItem:
    """Parse a filename into a ParsedFileItem or return a ParseErrorItem."""
    match = IMPORT_FILENAME_PATTERN.match(filename)
    if not match:
        return ParseErrorItem(
            filename=filename,
            reason="Nome não segue o padrão esperado: AA-NNN.RR TÍTULO.ext (ex: PQ-001.03 Controle de Documentos.docx)",
        )

    doc_type = match.group(1).upper()
    seq = int(match.group(2))
    rev = int(match.group(3))
    title = match.group(4).strip()
    ext = match.group(5).lower()
    code = coding_service.generate_code(doc_type, seq, rev)

    return ParsedFileItem(
        filename=filename,
        document_type=doc_type,
        sequential_number=seq,
        revision_number=rev,
        title=title,
        code=code,
        extension=ext,
        file_size_bytes=file_size,
    )


def _scan_files() -> tuple[list[ParsedFileItem], list[ParseErrorItem]]:
    """Read the import folder and parse all filenames."""
    if not os.path.isdir(IMPORT_DIR):
        return [], []

    parsed: list[ParsedFileItem] = []
    errors: list[ParseErrorItem] = []

    for filename in sorted(os.listdir(IMPORT_DIR)):
        filepath = os.path.join(IMPORT_DIR, filename)
        if not os.path.isfile(filepath):
            continue
        # Skip hidden files and .gitkeep
        if filename.startswith("."):
            continue

        file_size = os.path.getsize(filepath)
        result = _parse_filename(filename, file_size)

        if isinstance(result, ParsedFileItem):
            parsed.append(result)
        else:
            errors.append(result)

    return parsed, errors


def _group_documents(
    parsed: list[ParsedFileItem],
    existing_codes: dict[str, tuple[int, str, str]],
) -> list[GroupedDocument]:
    """Group parsed files by (document_type, sequential_number) and detect conflicts."""
    groups: dict[tuple[str, int], list[ParsedFileItem]] = defaultdict(list)
    for item in parsed:
        groups[(item.document_type, item.sequential_number)].append(item)

    result: list[GroupedDocument] = []
    for (doc_type, seq_num), revisions in sorted(groups.items()):
        revisions.sort(key=lambda r: r.revision_number)
        latest = revisions[-1]

        # Check if any revision's code already exists in DB
        conflict = None
        will_import_as = "new"
        for rev in revisions:
            if rev.code in existing_codes:
                doc_id, doc_title, doc_status = existing_codes[rev.code]
                conflict = ConflictItem(
                    filename=rev.filename,
                    code=rev.code,
                    existing_document_id=doc_id,
                    existing_title=doc_title,
                    existing_status=doc_status,
                )
                will_import_as = "conflict"
                break

        result.append(GroupedDocument(
            document_type=doc_type,
            sequential_number=seq_num,
            title=latest.title,
            latest_revision=latest.revision_number,
            revisions=revisions,
            will_import_as=will_import_as,
            conflict=conflict,
        ))

    return result


async def _get_existing_codes(db: AsyncSession, codes: list[str]) -> dict[str, tuple[int, str, str]]:
    """Query DB for documents whose codes match any of the given codes.
    Also checks by (document_type, sequential_number) to catch different revisions of existing docs."""
    if not codes:
        return {}

    # Parse all codes to get (type, seq) pairs
    type_seq_pairs = set()
    for code in codes:
        parsed = coding_service.parse_code(code)
        if parsed:
            doc_type, seq, _ = parsed
            type_seq_pairs.add((doc_type, seq))

    if not type_seq_pairs:
        return {}

    # Query documents that share any (type, sequential_number)
    from sqlalchemy import or_, and_
    conditions = [
        and_(Document.document_type == dt, Document.sequential_number == sn)
        for dt, sn in type_seq_pairs
    ]
    stmt = select(
        Document.code, Document.id, Document.title, Document.status
    ).where(or_(*conditions))

    result = await db.execute(stmt)
    return {row.code: (row.id, row.title, row.status) for row in result.all()}


async def scan_import_folder(db: AsyncSession) -> ScanResponse:
    """Scan the import folder, parse filenames, check for conflicts, return preview."""
    parsed, errors = _scan_files()

    all_codes = [item.code for item in parsed]
    existing = await _get_existing_codes(db, all_codes)

    grouped = _group_documents(parsed, existing)
    conflict_count = sum(1 for g in grouped if g.will_import_as == "conflict")

    return ScanResponse(
        total_files=len(parsed) + len(errors),
        parsed_count=len(parsed),
        error_count=len(errors),
        conflict_count=conflict_count,
        grouped_documents=grouped,
        parse_errors=errors,
    )


def _copy_file_to_storage(src_filename: str) -> str:
    """Copy a file from the import folder to storage/originals/ with a UUID name.
    Returns the destination path."""
    originals_dir = os.path.join(settings.STORAGE_PATH, "originals")
    os.makedirs(originals_dir, exist_ok=True)

    src_path = os.path.join(IMPORT_DIR, src_filename)
    ext = os.path.splitext(src_filename)[1]
    dest_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(originals_dir, dest_filename)

    shutil.copy2(src_path, dest_path)
    return dest_path


def _extract_text_safe(file_path: str) -> str:
    """Extract text from a file, returning empty string on failure."""
    try:
        return extract_text(file_path)
    except Exception as e:
        logger.warning(f"Não foi possível extrair texto de {file_path}: {e}")
        return ""


async def execute_import(db: AsyncSession, request: ImportRequest) -> ImportResponse:
    """Execute the bulk import: create documents, versions, and master list entries."""
    # Re-scan to get fresh state
    parsed, _ = _scan_files()
    all_codes = [item.code for item in parsed]
    existing = await _get_existing_codes(db, all_codes)
    grouped = _group_documents(parsed, existing)

    exclude_set = set(c.upper() for c in request.exclude_codes)

    results: list[ImportedDocumentResult] = []
    total_imported = 0
    total_skipped = 0
    total_errors = 0

    for group in grouped:
        latest = group.revisions[-1]

        # Skip conflicts
        if group.will_import_as == "conflict":
            results.append(ImportedDocumentResult(
                code=latest.code,
                title=group.title,
                status="skipped",
                error_message=f"Código já existe no sistema: {group.conflict.code}" if group.conflict else "Conflito",
            ))
            total_skipped += 1
            continue

        # Skip if user excluded
        if latest.code.upper() in exclude_set:
            results.append(ImportedDocumentResult(
                code=latest.code,
                title=group.title,
                status="skipped",
                error_message="Excluído pelo usuário",
            ))
            total_skipped += 1
            continue

        try:
            # Create the Document
            now = datetime.now(timezone.utc)
            document = Document(
                code=latest.code,
                title=group.title,
                category_id=None,
                current_version=len(group.revisions),
                status="active",
                created_by_profile="admin",
                document_type=group.document_type,
                sequential_number=group.sequential_number,
                revision_number=group.latest_revision,
                sector=None,
                effective_date=now,
            )
            db.add(document)
            await db.flush()

            # Create DocumentVersions for each revision
            for idx, rev in enumerate(group.revisions):
                file_path = _copy_file_to_storage(rev.filename)
                extracted_text = _extract_text_safe(file_path)

                is_latest = (idx == len(group.revisions) - 1)
                version = DocumentVersion(
                    document_id=document.id,
                    version_number=idx + 1,
                    original_file_path=file_path,
                    extracted_text=extracted_text,
                    status="approved" if is_latest else "archived",
                    submitted_at=now,
                    archived_at=None if is_latest else now,
                )
                db.add(version)

            await db.flush()

            # Add to master list
            ml_entry = await add_to_master_list(db, document.id)

            results.append(ImportedDocumentResult(
                code=latest.code,
                title=group.title,
                status="imported",
                master_list_code=ml_entry.master_list_code,
            ))
            total_imported += 1

        except Exception as e:
            logger.error(f"Erro ao importar {latest.code}: {e}")
            results.append(ImportedDocumentResult(
                code=latest.code,
                title=group.title,
                status="error",
                error_message=str(e),
            ))
            total_errors += 1

    return ImportResponse(
        total_imported=total_imported,
        total_skipped=total_skipped,
        total_errors=total_errors,
        results=results,
    )
