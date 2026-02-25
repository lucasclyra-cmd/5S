import os
import tempfile
from datetime import datetime, timezone

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException
from fastapi.background import BackgroundTask
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.approval import ApprovalChain, ApprovalChainApprover
from app.models.document import Document
from app.models.version import DocumentVersion

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _fmt(dt) -> str:
    return dt.strftime("%d/%m/%Y %H:%M") if dt else "—"


def _add_text(page, x: float, y: float, text: str, fontsize: int = 11,
              color: tuple = (0, 0, 0), bold: bool = False) -> float:
    fontname = "Helvetica-Bold" if bold else "Helvetica"
    page.insert_text(fitz.Point(x, y), text, fontname=fontname,
                     fontsize=fontsize, color=color)
    return y + fontsize + 5


def _new_page_if_needed(pdf, page, y: float, threshold: float = 760) -> tuple:
    if y > threshold:
        page = pdf.new_page(width=595, height=842)
        y = 50.0
    return page, y


def _generate_audit_pdf(doc_data: dict) -> str:
    """Generate a full audit trail PDF for a document. Returns temp file path."""
    pdf = fitz.open()
    page = pdf.new_page(width=595, height=842)  # A4
    y = 50.0

    # ── Header ──────────────────────────────────────────────
    y = _add_text(page, 50, y,
                  f"RELATÓRIO DE RASTREABILIDADE — {doc_data['code']}",
                  fontsize=16, bold=True)
    y = _add_text(page, 50, y, f"Título: {doc_data['title']}", fontsize=11)
    y = _add_text(page, 50, y,
                  f"Gerado em: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
                  fontsize=9, color=(0.5, 0.5, 0.5))
    info_parts = []
    if doc_data.get("document_type"):
        info_parts.append(f"Tipo: {doc_data['document_type']}")
    if doc_data.get("sector"):
        info_parts.append(f"Setor: {doc_data['sector']}")
    if info_parts:
        y = _add_text(page, 50, y, " | ".join(info_parts), fontsize=10)
    if doc_data.get("confidentiality_level"):
        y = _add_text(page, 50, y,
                      f"Confidencialidade: {doc_data['confidentiality_level'].upper()}",
                      fontsize=10, color=(0.7, 0.3, 0.0))
    y += 8
    page.draw_line(fitz.Point(50, y), fitz.Point(545, y), color=(0.7, 0.7, 0.7))
    y += 12

    # ── Version history ──────────────────────────────────────
    page, y = _new_page_if_needed(pdf, page, y)
    y = _add_text(page, 50, y, "HISTÓRICO DE VERSÕES", fontsize=13, bold=True)
    y += 4

    for ver in doc_data.get("versions", []):
        page, y = _new_page_if_needed(pdf, page, y)

        status_color = (0.0, 0.55, 0.0) if ver["status"] == "published" else \
                       (0.75, 0.0, 0.0) if ver["status"] in ("obsolete", "archived") else \
                       (0.2, 0.2, 0.2)

        y = _add_text(page, 50, y,
                      f"Versão {ver['version_number']} — {ver['status'].upper()}",
                      fontsize=11, bold=True, color=status_color)

        if ver.get("submitted_at"):
            y = _add_text(page, 65, y, f"Submetido: {ver['submitted_at']}", fontsize=9)
        if ver.get("published_at"):
            y = _add_text(page, 65, y, f"Publicado: {ver['published_at']}",
                          fontsize=9, color=(0.0, 0.5, 0.0))
        if ver.get("obsolete_at"):
            y = _add_text(page, 65, y, f"Obsoleto em: {ver['obsolete_at']}",
                          fontsize=9, color=(0.7, 0.0, 0.0))
        if ver.get("change_summary"):
            summary = ver["change_summary"][:130]
            y = _add_text(page, 65, y, f"Resumo: {summary}", fontsize=9)

        # Approval chains
        for chain in ver.get("chains", []):
            page, y = _new_page_if_needed(pdf, page, y)
            y = _add_text(page, 65, y,
                          f"Cadeia {chain['chain_type']} — {chain['status'].upper()}",
                          fontsize=10, bold=True)
            for approver in chain.get("approvers", []):
                page, y = _new_page_if_needed(pdf, page, y)
                if approver["action"] == "approve":
                    symbol, acolor = "✓ APROVADO", (0.0, 0.55, 0.0)
                elif approver["action"] == "reject":
                    symbol, acolor = "✗ REJEITADO", (0.75, 0.0, 0.0)
                else:
                    symbol, acolor = "— PENDENTE", (0.5, 0.5, 0.5)

                line = f"  {approver['approver_name']} ({approver['approver_role']}) — {symbol}"
                if approver.get("acted_at"):
                    line += f" em {approver['acted_at']}"
                y = _add_text(page, 80, y, line, fontsize=9, color=acolor)
                if approver.get("comments"):
                    y = _add_text(page, 95, y,
                                  f"Comentário: {approver['comments'][:100]}",
                                  fontsize=8, color=(0.4, 0.4, 0.4))
        y += 10

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_path = tmp.name
    tmp.close()
    pdf.save(tmp_path)
    pdf.close()
    return tmp_path


@router.get("/{code}")
async def get_audit_report(code: str, db: AsyncSession = Depends(get_db)):
    """Generate and download a full audit trail PDF for a document."""
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.versions).selectinload(
                DocumentVersion.approval_chains
            ).selectinload(ApprovalChain.approvers)
        )
        .where(Document.code == code)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Documento '{code}' não encontrado")

    doc_data = {
        "code": doc.code,
        "title": doc.title,
        "document_type": doc.document_type,
        "sector": doc.sector,
        "confidentiality_level": getattr(doc, "confidentiality_level", None),
        "versions": [
            {
                "version_number": v.version_number,
                "status": v.status,
                "submitted_at": _fmt(v.submitted_at),
                "published_at": _fmt(getattr(v, "published_at", None)),
                "obsolete_at": _fmt(getattr(v, "obsolete_at", None)),
                "change_summary": v.change_summary,
                "chains": [
                    {
                        "chain_type": c.chain_type,
                        "status": c.status,
                        "approvers": [
                            {
                                "approver_name": a.approver_name,
                                "approver_role": a.approver_role,
                                "action": a.action,
                                "acted_at": _fmt(a.acted_at),
                                "comments": a.comments,
                            }
                            for a in c.approvers
                        ],
                    }
                    for c in v.approval_chains
                ],
            }
            for v in doc.versions
        ],
    }

    pdf_path = _generate_audit_pdf(doc_data)
    safe_code = code.replace("/", "_").replace(".", "-")
    filename = f"auditoria_{safe_code}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf",
        background=BackgroundTask(os.unlink, pdf_path),
    )
