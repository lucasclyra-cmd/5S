"""Service for standardized document coding (AA-999.XX format)."""

import re

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document

VALID_DOCUMENT_TYPES = ("PQ", "IT", "RQ")
CODE_PATTERN = re.compile(r"^(PQ|IT|RQ)-(\d{3})\.(\d{2})$")


async def get_next_sequential_number(db: AsyncSession, document_type: str) -> int:
    """Get the next available sequential number for a document type."""
    result = await db.execute(
        select(func.max(Document.sequential_number)).where(
            Document.document_type == document_type
        )
    )
    max_seq = result.scalar()
    return (max_seq or 0) + 1


def generate_code(document_type: str, sequential_number: int, revision_number: int) -> str:
    """Generate a standardized code in AA-999.XX format."""
    return f"{document_type}-{sequential_number:03d}.{revision_number:02d}"


def validate_code_format(code: str) -> bool:
    """Validate that a code matches the AA-999.XX pattern."""
    return CODE_PATTERN.match(code) is not None


def parse_code(code: str) -> tuple[str, int, int] | None:
    """Parse a code into (document_type, sequential_number, revision_number).
    Returns None if the code doesn't match the expected format."""
    match = CODE_PATTERN.match(code)
    if not match:
        return None
    return match.group(1), int(match.group(2)), int(match.group(3))


def validate_document_type(document_type: str) -> bool:
    """Check if a document type is valid."""
    return document_type in VALID_DOCUMENT_TYPES
