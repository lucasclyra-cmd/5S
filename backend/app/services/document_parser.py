import os
from docx import Document as DocxDocument
import fitz  # PyMuPDF


def extract_text_from_docx(file_path: str) -> str:
    """Extract all paragraph text from a .docx file."""
    doc = DocxDocument(file_path)
    return "\n\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from all pages of a PDF file using PyMuPDF."""
    doc = fitz.open(file_path)
    texts = [page.get_text().strip() for page in doc if page.get_text().strip()]
    doc.close()
    return "\n\n".join(texts)


_PARSERS = {
    ".docx": extract_text_from_docx,
    ".pdf": extract_text_from_pdf,
}


def extract_text(file_path: str) -> str:
    """Route to the right parser based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    parser = _PARSERS.get(ext)
    if parser is None:
        raise ValueError(f"Unsupported file type: {ext}. Supported types: .docx, .pdf")
    return parser(file_path)
