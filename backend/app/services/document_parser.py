import os
from docx import Document as DocxDocument
import fitz  # PyMuPDF


def extract_text_from_docx(file_path: str) -> str:
    """Extract all paragraph text from a .docx file."""
    doc = DocxDocument(file_path)
    paragraphs = []
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if text:
            paragraphs.append(text)
    return "\n\n".join(paragraphs)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from all pages of a PDF file using PyMuPDF."""
    doc = fitz.open(file_path)
    pages_text = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text().strip()
        if text:
            pages_text.append(text)
    doc.close()
    return "\n\n".join(pages_text)


def extract_text(file_path: str) -> str:
    """Route to the right parser based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext == ".pdf":
        return extract_text_from_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Supported types: .docx, .pdf")
