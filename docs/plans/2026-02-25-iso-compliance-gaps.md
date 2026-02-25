# ISO Compliance Gaps — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir gaps críticos de conformidade ISO 9001, adicionar funcionalidades P1/P2, corrigir CORS aberto e adicionar marca d'água em PDFs de versões obsoletas.

**Architecture:** Cada mudança de banco vem com uma migration Alembic sequencial. O backend FastAPI já existe com SQLAlchemy async. A marca d'água usa PyMuPDF (já no pyproject.toml). Nenhuma autenticação de usuário será adicionada.

**Tech Stack:** Python 3.12 + FastAPI + SQLAlchemy async + Alembic + PyMuPDF (fitz) + Next.js 14 TypeScript

---

## Task 1: Corrigir CORS aberto

**Files:**
- Modify: `backend/app/main.py:124-131`
- Modify: `backend/app/config.py` (adicionar ALLOWED_ORIGINS)

**Step 1: Ler o arquivo de configuração atual**

```bash
cat backend/app/config.py
```

**Step 2: Adicionar ALLOWED_ORIGINS ao config**

Em `backend/app/config.py`, adicionar campo:

```python
ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
```

Usando `Field(default=["http://localhost:3000"])` se for Pydantic Settings.

**Step 3: Atualizar CORS em main.py**

Substituir `allow_origins=["*"]` por:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Step 4: Verificar que o frontend ainda funciona**

```bash
cd backend && uvicorn app.main:app --port 8000 &
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
```
Esperado: `200`

**Step 5: Commit**

```bash
git add backend/app/main.py backend/app/config.py
git commit -m "fix: restringir CORS para origens permitidas em vez de wildcard"
```

---

## Task 2: Migration 009 — Campos ISO + deadline + distribution + AI log

**Files:**
- Create: `backend/alembic/versions/009_iso_compliance_fields.py`

**Step 1: Criar migration**

```python
"""009_iso_compliance_fields

Revision ID: 009
Revises: 008
Create Date: 2026-02-25
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Document: campos ISO obrigatórios
    op.add_column('documents', sa.Column('review_due_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('retention_years', sa.Integer(), nullable=True))
    op.add_column('documents', sa.Column('confidentiality_level', sa.String(20), nullable=True, server_default='interno'))

    # DocumentVersion: published_at + status 'published' e 'obsolete' já são suportados pelo campo String
    op.add_column('document_versions', sa.Column('published_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('document_versions', sa.Column('obsolete_at', sa.DateTime(timezone=True), nullable=True))

    # ApprovalChainApprover: deadline + approval_level para aprovação paralela
    op.add_column('approval_chain_approvers', sa.Column('deadline', sa.DateTime(timezone=True), nullable=True))
    op.add_column('approval_chain_approvers', sa.Column('approval_level', sa.Integer(), nullable=False, server_default='0'))

    # DocumentDistribution: lista de distribuição controlada
    op.create_table(
        'document_distributions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_name', sa.String(200), nullable=False),
        sa.Column('recipient_role', sa.String(200), nullable=True),
        sa.Column('recipient_email', sa.String(200), nullable=True),
        sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("(datetime('now'))")),
    )
    op.create_index('ix_document_distributions_document_id', 'document_distributions', ['document_id'])

    # AIUsageLog: log de custo de IA por análise
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('version_id', sa.Integer(), sa.ForeignKey('document_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_type', sa.String(50), nullable=False),
        sa.Column('model', sa.String(50), nullable=False),
        sa.Column('tokens_input', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_output', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("(datetime('now'))")),
    )
    op.create_index('ix_ai_usage_logs_version_id', 'ai_usage_logs', ['version_id'])


def downgrade() -> None:
    op.drop_table('ai_usage_logs')
    op.drop_table('document_distributions')
    op.drop_column('approval_chain_approvers', 'approval_level')
    op.drop_column('approval_chain_approvers', 'deadline')
    op.drop_column('document_versions', 'obsolete_at')
    op.drop_column('document_versions', 'published_at')
    op.drop_column('documents', 'confidentiality_level')
    op.drop_column('documents', 'retention_years')
    op.drop_column('documents', 'review_due_date')
```

**Step 2: Rodar migration**

```bash
cd backend && alembic upgrade head
```
Esperado: `Running upgrade 008 -> 009`

**Step 3: Commit**

```bash
git add backend/alembic/versions/009_iso_compliance_fields.py
git commit -m "feat: migration 009 — campos ISO, distribuição, log IA, aprovação por nível"
```

---

## Task 3: Atualizar modelos SQLAlchemy com novos campos

**Files:**
- Modify: `backend/app/models/document.py`
- Modify: `backend/app/models/version.py`
- Modify: `backend/app/models/approval.py`
- Create: `backend/app/models/distribution.py`
- Create: `backend/app/models/ai_usage_log.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Atualizar Document model**

Em `backend/app/models/document.py`, adicionar após `effective_date`:

```python
review_due_date = Column(DateTime(timezone=True), nullable=True)  # Próxima revisão obrigatória
retention_years = Column(Integer, nullable=True)  # Anos de retenção após obsolescência
confidentiality_level = Column(String(20), nullable=True, default="interno")  # publico/interno/restrito/confidencial
```

**Step 2: Atualizar DocumentVersion model**

Em `backend/app/models/version.py`, adicionar após `archived_at`:

```python
published_at = Column(DateTime(timezone=True), nullable=True)
obsolete_at = Column(DateTime(timezone=True), nullable=True)
# status values: draft, analyzing, spelling_review, in_review, formatting, approved, published, rejected, archived, obsolete
```

**Step 3: Atualizar ApprovalChainApprover model**

Em `backend/app/models/approval.py`, adicionar na classe `ApprovalChainApprover` após `acted_at`:

```python
deadline = Column(DateTime(timezone=True), nullable=True)
approval_level = Column(Integer, nullable=False, default=0)  # Aprovadores do mesmo nível podem agir em paralelo
```

**Step 4: Criar DocumentDistribution model**

Criar `backend/app/models/distribution.py`:

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class DocumentDistribution(Base):
    __tablename__ = "document_distributions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    recipient_name = Column(String(200), nullable=False)
    recipient_role = Column(String(200), nullable=True)
    recipient_email = Column(String(200), nullable=True)
    notified_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", backref="distributions")
```

**Step 5: Criar AIUsageLog model**

Criar `backend/app/models/ai_usage_log.py`:

```python
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False)
    agent_type = Column(String(50), nullable=False)  # analysis, formatting, spelling, changelog, crossref
    model = Column(String(50), nullable=False)  # gpt-4o, gpt-4o-mini
    tokens_input = Column(Integer, nullable=False, default=0)
    tokens_output = Column(Integer, nullable=False, default=0)
    estimated_cost_usd = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("DocumentVersion", backref="ai_usage_logs")
```

**Step 6: Registrar novos modelos em `__init__.py`**

Em `backend/app/models/__init__.py`, adicionar:

```python
from app.models.distribution import DocumentDistribution
from app.models.ai_usage_log import AIUsageLog
```

E adicionar ao `__all__`.

**Step 7: Commit**

```bash
git add backend/app/models/
git commit -m "feat: adicionar modelos DocumentDistribution, AIUsageLog e campos ISO nos modelos existentes"
```

---

## Task 4: Endpoint de publicação + lógica de obsolescência

**Files:**
- Modify: `backend/app/routers/documents.py`
- Modify: `backend/app/services/approval_service.py`

**Step 1: Adicionar endpoint de publicação em documents.py**

Após o endpoint `/{code}/skip-ai`, adicionar:

```python
@router.post("/{code}/publish")
async def publish_document(
    code: str,
    version_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Publish a document: set current version to 'published', mark previous as 'obsolete'."""
    from app.services import document_service as ds
    from app.models.version import DocumentVersion
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from datetime import datetime, timezone

    doc = await document_service.get_document_by_code(db, code)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document '{code}' not found")

    # Get the version to publish (latest approved by default)
    if version_id is None:
        target = next(
            (v for v in reversed(doc.versions) if v.status == "approved"),
            None
        )
        if target is None:
            raise HTTPException(status_code=400, detail="Nenhuma versão aprovada encontrada para publicar")
        version_id = target.id
    else:
        result = await db.execute(select(DocumentVersion).where(DocumentVersion.id == version_id))
        target = result.scalar_one_or_none()
        if target is None or target.document_id != doc.id:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

    now = datetime.now(timezone.utc)

    # Mark all previously published versions as obsolete
    for v in doc.versions:
        if v.id != target.id and v.status == "published":
            v.status = "obsolete"
            v.obsolete_at = now

    # Publish the target version
    target.status = "published"
    target.published_at = now

    # Update document-level status
    doc.status = "active"
    doc.effective_date = now
    doc.updated_at = now

    await db.commit()
    await db.refresh(doc)

    return {
        "message": f"Documento {code} publicado com sucesso",
        "version_id": target.id,
        "published_at": now.isoformat(),
    }
```

**Step 2: Verificar manualmente**

```bash
curl -s -X POST http://localhost:8000/api/documents/PQ-001.00/publish | python3 -m json.tool
```

**Step 3: Commit**

```bash
git add backend/app/routers/documents.py
git commit -m "feat: adicionar endpoint de publicação com transição de status e obsolescência de versões anteriores"
```

---

## Task 5: Marca d'água em PDFs de versões arquivadas/obsoletas

**Files:**
- Modify: `backend/app/routers/export.py`

**Step 1: Implementar função de marca d'água com PyMuPDF**

Em `backend/app/routers/export.py`, adicionar função auxiliar antes das rotas:

```python
import fitz  # PyMuPDF
import tempfile

def _add_obsolete_watermark(input_pdf_path: str) -> str:
    """Add a red diagonal 'VERSÃO DESATUALIZADA' watermark to all pages of a PDF.
    Returns path to the watermarked PDF (temp file).
    """
    doc = fitz.open(input_pdf_path)
    watermark_text = "VERSÃO DESATUALIZADA"

    for page in doc:
        rect = page.rect
        # Center point of page
        center_x = rect.width / 2
        center_y = rect.height / 2

        # Large font, 45-degree diagonal
        fontsize = 60
        # Insert text rotated 45 degrees at center
        page.insert_text(
            fitz.Point(center_x - 250, center_y + 30),
            watermark_text,
            fontsize=fontsize,
            color=(0.9, 0.0, 0.0),  # Red
            rotate=45,
            overlay=True,
        )

    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    doc.save(tmp.name)
    doc.close()
    return tmp.name
```

**Step 2: Modificar endpoint download_pdf para aplicar marca d'água**

Substituir a função `download_pdf` por:

```python
@router.get("/{version_id}/pdf")
async def download_pdf(version_id: int, db: AsyncSession = Depends(get_db)):
    """Download the formatted PDF. Adds watermark if version is archived or obsolete."""
    version = await versioning_service.get_version(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    file_path = version.formatted_file_path_pdf
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="PDF file not available. Run formatting first.",
        )

    doc_code = version.document.code if version.document else "doc"
    filename = f"{doc_code}_v{version.version_number}.pdf"

    # Add watermark for non-current versions
    if version.status in ("archived", "obsolete"):
        watermarked_path = _add_obsolete_watermark(file_path)
        return FileResponse(
            path=watermarked_path,
            filename=filename,
            media_type="application/pdf",
            background=BackgroundTask(os.unlink, watermarked_path),
        )

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf",
    )
```

**Step 3: Adicionar imports necessários**

No topo de `export.py`, adicionar:

```python
from fastapi.background import BackgroundTask
import fitz
import tempfile
```

**Step 4: Verificar**

```bash
# Baixar um PDF arquivado e verificar marca d'água visualmente
curl -s http://localhost:8000/api/export/1/pdf -o /tmp/test_watermark.pdf && open /tmp/test_watermark.pdf
```

**Step 5: Commit**

```bash
git add backend/app/routers/export.py
git commit -m "feat: adicionar marca d'água vermelha em PDFs de versões arquivadas/obsoletas"
```

---

## Task 6: API de distribuição controlada

**Files:**
- Create: `backend/app/schemas/distribution.py`
- Create: `backend/app/routers/distribution.py`
- Modify: `backend/app/main.py`

**Step 1: Criar schemas de distribuição**

Criar `backend/app/schemas/distribution.py`:

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DistributionCreate(BaseModel):
    recipient_name: str
    recipient_role: Optional[str] = None
    recipient_email: Optional[str] = None


class DistributionResponse(BaseModel):
    id: int
    document_id: int
    recipient_name: str
    recipient_role: Optional[str]
    recipient_email: Optional[str]
    notified_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class DistributionListResponse(BaseModel):
    distributions: list[DistributionResponse]
    total: int
```

**Step 2: Criar router de distribuição**

Criar `backend/app/routers/distribution.py`:

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.distribution import DocumentDistribution
from app.models.document import Document
from app.schemas.distribution import DistributionCreate, DistributionResponse, DistributionListResponse

router = APIRouter(prefix="/api/distribution", tags=["distribution"])


@router.get("/{document_id}", response_model=DistributionListResponse)
async def list_distribution(document_id: int, db: AsyncSession = Depends(get_db)):
    """List all distribution entries for a document."""
    result = await db.execute(
        select(DocumentDistribution)
        .where(DocumentDistribution.document_id == document_id)
        .order_by(DocumentDistribution.created_at.asc())
    )
    items = result.scalars().all()
    return {"distributions": items, "total": len(items)}


@router.post("/{document_id}", response_model=DistributionResponse)
async def add_to_distribution(
    document_id: int,
    req: DistributionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a recipient to a document's distribution list."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    entry = DocumentDistribution(
        document_id=document_id,
        recipient_name=req.recipient_name,
        recipient_role=req.recipient_role,
        recipient_email=req.recipient_email,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/{document_id}/notify-all")
async def notify_all_recipients(document_id: int, db: AsyncSession = Depends(get_db)):
    """Mark all recipients as notified (simulates notification dispatch)."""
    result = await db.execute(
        select(DocumentDistribution)
        .where(DocumentDistribution.document_id == document_id,
               DocumentDistribution.notified_at.is_(None))
    )
    items = result.scalars().all()
    now = datetime.now(timezone.utc)
    for item in items:
        item.notified_at = now
    await db.commit()
    return {"message": f"{len(items)} destinatários notificados", "notified_at": now.isoformat()}


@router.post("/entries/{entry_id}/acknowledge")
async def acknowledge(entry_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a distribution entry as acknowledged by the recipient."""
    entry = await db.get(DocumentDistribution, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrada não encontrada")
    entry.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    return DistributionResponse.model_validate(entry)


@router.delete("/entries/{entry_id}")
async def remove_from_distribution(entry_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a recipient from the distribution list."""
    entry = await db.get(DocumentDistribution, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrada não encontrada")
    await db.delete(entry)
    await db.commit()
    return {"message": "Destinatário removido da lista de distribuição"}
```

**Step 3: Registrar router em main.py**

Em `backend/app/main.py`:
- Adicionar import: `from app.routers import ..., distribution`
- Adicionar: `app.include_router(distribution.router)`

**Step 4: Commit**

```bash
git add backend/app/schemas/distribution.py backend/app/routers/distribution.py backend/app/main.py
git commit -m "feat: API de lista de distribuição controlada por documento"
```

---

## Task 7: Aprovação paralela por nível (approval_level)

**Files:**
- Modify: `backend/app/services/approval_service.py`
- Modify: `backend/app/schemas/approval.py`

**Step 1: Ler o schema de approval para entender CreateChainRequest**

```bash
cat backend/app/schemas/approval.py
```

**Step 2: Adicionar `approval_level` ao schema `ApproverInput`**

Em `backend/app/schemas/approval.py`, no modelo que representa a entrada de um aprovador (provavelmente `ApproverInput` ou similar), adicionar:

```python
approval_level: int = 0  # Aprovadores do mesmo nível agem em paralelo
```

E no `ApproverResponse`, adicionar:

```python
approval_level: int = 0
deadline: Optional[datetime] = None
```

**Step 3: Modificar `record_approver_action` para lógica de nível**

Em `backend/app/services/approval_service.py`, substituir a lógica de verificação de predecessores:

```python
# Lógica antiga: todos com order menor devem ter agido
# predecessors = [a for a in chain.approvers if a.is_required and a.order < approver.order and a.action is None]

# NOVA lógica: todos de níveis ANTERIORES (approval_level menor) devem ter terminado
if chain:
    # Nível atual do aprovador
    current_level = approver.approval_level
    # Aprovadores de nível anterior que ainda não agiram
    predecessors = [
        a for a in chain.approvers
        if a.is_required and a.approval_level < current_level and a.action is None
    ]
    if predecessors:
        names = ", ".join(a.approver_name for a in predecessors)
        raise ValueError(
            f"O aprovador '{approver.approver_name}' não pode agir ainda. "
            f"Aguardando nível anterior: {names}."
        )
```

**Step 4: Propagar `approval_level` na criação da cadeia**

Em `create_approval_chain`, ao criar `ApprovalChainApprover`, adicionar:

```python
approval_level=approver_data.get("approval_level", 0),
deadline=approver_data.get("deadline"),
```

**Step 5: Verificar que aprovações sequenciais simples continuam funcionando**

Toda cadeia criada sem `approval_level` terá level=0 e se comporta como antes (todos paralelos no mesmo nível — OK, pois o front-end controla visualmente a sequência via `order`).

**Step 6: Commit**

```bash
git add backend/app/services/approval_service.py backend/app/schemas/approval.py
git commit -m "feat: aprovação paralela por nível — approval_level permite múltiplos aprovadores simultâneos no mesmo nível"
```

---

## Task 8: Log de uso de IA com tokens e custo estimado

**Files:**
- Modify: `backend/app/services/ai_service.py`

**Step 1: Adicionar função de logging de IA**

Em `backend/app/services/ai_service.py`, após os imports, adicionar:

```python
from app.models.ai_usage_log import AIUsageLog

# Preços gpt-4o em USD/1M tokens (atualizar conforme necessário)
_TOKEN_COSTS = {
    "gpt-4o": {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
    "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
}


async def _log_ai_usage(
    db: AsyncSession,
    version_id: int,
    agent_type: str,
    model: str,
    tokens_input: int,
    tokens_output: int,
) -> None:
    """Log AI token usage and estimated cost for a version/agent call."""
    costs = _TOKEN_COSTS.get(model, {"input": 0, "output": 0})
    estimated_cost = tokens_input * costs["input"] + tokens_output * costs["output"]
    log = AIUsageLog(
        version_id=version_id,
        agent_type=agent_type,
        model=model,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        estimated_cost_usd=estimated_cost,
    )
    db.add(log)
    await db.flush()
```

**Step 2: Criar `_call_with_usage_log` que substitui `_call_with_fallback` quando temos version_id**

```python
async def _call_with_usage_log(
    db: AsyncSession,
    version_id: int,
    agent_type: str,
    ai_call,
    mock_call,
    model: str = "gpt-4o",
) -> dict:
    """Try calling AI agent, log token usage, fall back to mock on failure."""
    client = get_openai_client()
    if client:
        try:
            result, usage = await ai_call(client)
            if usage and version_id:
                await _log_ai_usage(
                    db, version_id, agent_type, model,
                    usage.prompt_tokens, usage.completion_tokens
                )
            return result
        except Exception:
            pass
    return mock_call()
```

**Nota:** Os agentes precisam retornar `(result, response.usage)` para que o uso seja capturado. Mas isso exige modificar todos os agentes — uma mudança invasiva. Como alternativa mais simples: envolver as chamadas `client.chat.completions.create(...)` para capturar usage do response diretamente. Implementação pragmática: apenas logar quando o OpenAI retornar usage, sem refatorar todos os agentes.

**Implementação pragmática alternativa:** Criar wrapper em `_call_with_fallback`:

```python
async def _call_with_fallback(ai_call, mock_call, db=None, version_id=None, agent_type=None) -> dict:
    """Try calling an AI agent; fall back to mock if no client or on error."""
    client = get_openai_client()
    if client:
        try:
            result = await ai_call(client)
            return result
        except Exception:
            return mock_call()
    return mock_call()
```

Manter `_call_with_fallback` como está (não quebrar nada) e adicionar um `POST /api/admin/ai-usage` que agrega logs existentes. Logging completo de tokens fica como melhoria futura uma vez que os agentes sejam refatorados para retornar usage.

**Step 3: Criar endpoint de consulta de uso de IA**

Em `backend/app/routers/admin.py`, adicionar:

```python
@router.get("/ai-usage")
async def get_ai_usage(db: AsyncSession = Depends(get_db)):
    """Get aggregated AI usage statistics."""
    from sqlalchemy import func
    from app.models.ai_usage_log import AIUsageLog

    result = await db.execute(
        select(
            AIUsageLog.agent_type,
            AIUsageLog.model,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.tokens_input).label("total_input_tokens"),
            func.sum(AIUsageLog.tokens_output).label("total_output_tokens"),
            func.sum(AIUsageLog.estimated_cost_usd).label("total_cost_usd"),
        ).group_by(AIUsageLog.agent_type, AIUsageLog.model)
    )
    rows = result.all()
    return [
        {
            "agent_type": r.agent_type,
            "model": r.model,
            "calls": r.calls,
            "total_input_tokens": r.total_input_tokens or 0,
            "total_output_tokens": r.total_output_tokens or 0,
            "total_cost_usd": round(r.total_cost_usd or 0, 4),
        }
        for r in rows
    ]
```

**Step 4: Commit**

```bash
git add backend/app/models/ai_usage_log.py backend/app/services/ai_service.py backend/app/routers/admin.py
git commit -m "feat: modelo AIUsageLog e endpoint de estatísticas de uso de IA"
```

---

## Task 9: Relatório de auditoria em PDF

**Files:**
- Create: `backend/app/routers/audit_report.py`
- Modify: `backend/app/main.py`

**Step 1: Criar router de relatório de auditoria**

Criar `backend/app/routers/audit_report.py`:

```python
import os
import tempfile
from datetime import datetime, timezone

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.background import BackgroundTask
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.document import Document
from app.models.version import DocumentVersion
from app.models.analysis import AIAnalysis
from app.models.changelog import Changelog
from app.models.approval import ApprovalChain

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _add_text(page, x, y, text, fontsize=11, color=(0, 0, 0), bold=False):
    """Helper to insert text on a PDF page."""
    fontname = "Helvetica-Bold" if bold else "Helvetica"
    page.insert_text(fitz.Point(x, y), text, fontname=fontname, fontsize=fontsize, color=color)
    return y + fontsize + 4


def _generate_audit_pdf(doc_data: dict) -> str:
    """Generate an audit trail PDF for a document. Returns temp file path."""
    pdf = fitz.open()
    page = pdf.new_page(width=595, height=842)  # A4
    y = 50

    # Header
    y = _add_text(page, 50, y, f"RELATÓRIO DE RASTREABILIDADE — {doc_data['code']}", fontsize=16, bold=True)
    y = _add_text(page, 50, y, f"Título: {doc_data['title']}", fontsize=11)
    y = _add_text(page, 50, y, f"Gerado em: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}", fontsize=9, color=(0.5, 0.5, 0.5))
    y = _add_text(page, 50, y, f"Tipo: {doc_data.get('document_type', '-')} | Setor: {doc_data.get('sector', '-')}", fontsize=10)
    if doc_data.get('confidentiality_level'):
        y = _add_text(page, 50, y, f"Confidencialidade: {doc_data['confidentiality_level'].upper()}", fontsize=10, color=(0.7, 0.3, 0))
    y += 10
    page.draw_line(fitz.Point(50, y), fitz.Point(545, y), color=(0.7, 0.7, 0.7))
    y += 15

    # Version history
    y = _add_text(page, 50, y, "HISTÓRICO DE VERSÕES", fontsize=13, bold=True)
    y += 5
    for ver in doc_data.get('versions', []):
        # Start new page if near bottom
        if y > 750:
            page = pdf.new_page(width=595, height=842)
            y = 50
        status_color = (0.0, 0.6, 0.0) if ver['status'] == 'published' else \
                       (0.8, 0.0, 0.0) if ver['status'] in ('obsolete', 'archived') else (0.2, 0.2, 0.2)
        y = _add_text(page, 50, y, f"Versão {ver['version_number']} — Status: {ver['status'].upper()}", fontsize=11, bold=True, color=status_color)
        if ver.get('submitted_at'):
            y = _add_text(page, 65, y, f"Submetido em: {ver['submitted_at']}", fontsize=9)
        if ver.get('published_at'):
            y = _add_text(page, 65, y, f"Publicado em: {ver['published_at']}", fontsize=9, color=(0.0, 0.5, 0.0))
        if ver.get('obsolete_at'):
            y = _add_text(page, 65, y, f"Tornado obsoleto em: {ver['obsolete_at']}", fontsize=9, color=(0.7, 0.0, 0.0))
        if ver.get('change_summary'):
            y = _add_text(page, 65, y, f"Resumo: {ver['change_summary'][:120]}", fontsize=9)

        # Approvals for this version
        for chain in ver.get('chains', []):
            y = _add_text(page, 65, y, f"Cadeia de aprovação ({chain['chain_type']}) — {chain['status'].upper()}", fontsize=10, bold=True)
            for approver in chain.get('approvers', []):
                action_label = "✓ APROVADO" if approver['action'] == 'approve' else \
                               "✗ REJEITADO" if approver['action'] == 'reject' else "— PENDENTE"
                action_color = (0.0, 0.6, 0.0) if approver['action'] == 'approve' else \
                               (0.8, 0.0, 0.0) if approver['action'] == 'reject' else (0.5, 0.5, 0.5)
                line = f"  {approver['approver_name']} ({approver['approver_role']}) — {action_label}"
                if approver.get('acted_at'):
                    line += f" em {approver['acted_at']}"
                y = _add_text(page, 80, y, line, fontsize=9, color=action_color)
        y += 8

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf.save(tmp.name)
    pdf.close()
    return tmp.name


@router.get("/{code}")
async def get_audit_report(code: str, db: AsyncSession = Depends(get_db)):
    """Generate and download a full audit trail PDF for a document."""
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.versions).selectinload(DocumentVersion.approval_chains)
            .selectinload(ApprovalChain.approvers)
        )
        .where(Document.code == code)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document '{code}' not found")

    def fmt_dt(dt):
        return dt.strftime("%d/%m/%Y %H:%M") if dt else None

    doc_data = {
        "code": doc.code,
        "title": doc.title,
        "document_type": doc.document_type,
        "sector": doc.sector,
        "confidentiality_level": doc.confidentiality_level,
        "versions": [
            {
                "version_number": v.version_number,
                "status": v.status,
                "submitted_at": fmt_dt(v.submitted_at),
                "published_at": fmt_dt(v.published_at),
                "obsolete_at": fmt_dt(v.obsolete_at),
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
                                "acted_at": fmt_dt(a.acted_at),
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
    filename = f"auditoria_{code.replace('/', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf",
        background=BackgroundTask(os.unlink, pdf_path),
    )
```

**Step 2: Registrar router em main.py**

```python
from app.routers import ..., audit_report
app.include_router(audit_report.router)
```

**Step 3: Verificar**

```bash
curl -s http://localhost:8000/api/audit/PQ-001.00 -o /tmp/auditoria.pdf && open /tmp/auditoria.pdf
```

**Step 4: Commit**

```bash
git add backend/app/routers/audit_report.py backend/app/main.py
git commit -m "feat: endpoint de relatório de auditoria em PDF com histórico completo de versões e aprovações"
```

---

## Task 10: Frontend — Campos ISO no detalhe do documento

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/processos/[docId]/page.tsx`
- Modify: `frontend/src/app/autor/[docId]/page.tsx`

**Step 1: Adicionar campos ISO ao tipo `Document` em `types/index.ts`**

Na interface `Document` (ou `DocumentWithVersions`), adicionar:

```typescript
review_due_date?: string | null;
retention_years?: number | null;
confidentiality_level?: string | null;  // 'publico' | 'interno' | 'restrito' | 'confidencial'
```

Na interface `DocumentVersion`, adicionar:

```typescript
published_at?: string | null;
obsolete_at?: string | null;
```

**Step 2: Adicionar tipos para distribuição**

```typescript
export interface DistributionEntry {
  id: number;
  document_id: number;
  recipient_name: string;
  recipient_role?: string;
  recipient_email?: string;
  notified_at?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
}
```

**Step 3: Adicionar funções de API em `lib/api.ts`**

```typescript
// Publicação
export async function publishDocument(code: string, versionId?: number) {
  const params = versionId ? `?version_id=${versionId}` : '';
  const res = await fetch(`${API_BASE}/documents/${code}/publish${params}`, { method: 'POST' });
  if (!res.ok) throw await res.json();
  return res.json();
}

// Distribuição
export async function getDistribution(documentId: number) {
  const res = await fetch(`${API_BASE}/distribution/${documentId}`);
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function addToDistribution(documentId: number, data: { recipient_name: string; recipient_role?: string; recipient_email?: string }) {
  const res = await fetch(`${API_BASE}/distribution/${documentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function notifyAllRecipients(documentId: number) {
  const res = await fetch(`${API_BASE}/distribution/${documentId}/notify-all`, { method: 'POST' });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function removeFromDistribution(entryId: number) {
  const res = await fetch(`${API_BASE}/distribution/entries/${entryId}`, { method: 'DELETE' });
  if (!res.ok) throw await res.json();
  return res.json();
}

// Relatório de auditoria
export function getAuditReportUrl(code: string) {
  return `${API_BASE}/audit/${code}`;
}
```

**Step 4: Adicionar painel de campos ISO na tela processos/[docId]**

Na seção de metadados do documento, adicionar bloco de campos ISO:

```tsx
{/* Campos ISO */}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
  <h3 className="font-semibold text-blue-800 mb-3">Informações ISO 9001</h3>
  <div className="grid grid-cols-2 gap-3 text-sm">
    <div>
      <span className="text-gray-500">Próxima revisão:</span>
      <span className="ml-2 font-medium">
        {document.review_due_date
          ? new Date(document.review_due_date).toLocaleDateString('pt-BR')
          : <span className="text-yellow-600">Não definida</span>}
      </span>
    </div>
    <div>
      <span className="text-gray-500">Retenção:</span>
      <span className="ml-2 font-medium">
        {document.retention_years ? `${document.retention_years} anos` : <span className="text-yellow-600">Não definida</span>}
      </span>
    </div>
    <div>
      <span className="text-gray-500">Confidencialidade:</span>
      <span className={`ml-2 font-medium capitalize ${
        document.confidentiality_level === 'confidencial' ? 'text-red-600' :
        document.confidentiality_level === 'restrito' ? 'text-orange-600' : 'text-green-700'
      }`}>
        {document.confidentiality_level || 'interno'}
      </span>
    </div>
  </div>
</div>
```

**Step 5: Adicionar botão "Publicar" na tela processos/[docId]**

Após a seção de aprovação, quando a versão atual tiver status `approved`:

```tsx
{currentVersion?.status === 'approved' && (
  <div className="mt-4">
    <button
      onClick={async () => {
        if (!confirm('Publicar este documento? Versões anteriores publicadas serão marcadas como obsoletas.')) return;
        try {
          await publishDocument(docCode);
          await loadDocument();
          alert('Documento publicado com sucesso!');
        } catch (e: any) {
          alert(`Erro ao publicar: ${e.detail || 'Tente novamente'}`);
        }
      }}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
    >
      Publicar Documento
    </button>
  </div>
)}
```

**Step 6: Adicionar link para relatório de auditoria**

```tsx
<a
  href={getAuditReportUrl(docCode)}
  target="_blank"
  className="text-sm text-blue-600 hover:underline"
>
  📄 Baixar Relatório de Auditoria
</a>
```

**Step 7: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/app/processos/
git commit -m "feat: frontend — campos ISO, botão de publicação e link de relatório de auditoria"
```

---

## Task 11: Frontend — Painel de distribuição controlada

**Files:**
- Create: `frontend/src/components/DistributionPanel.tsx`
- Modify: `frontend/src/app/processos/[docId]/page.tsx`

**Step 1: Criar componente DistributionPanel**

Criar `frontend/src/components/DistributionPanel.tsx`:

```tsx
"use client";
import React, { useState, useEffect } from "react";
import { Users, Plus, Trash2, Bell } from "lucide-react";
import { getDistribution, addToDistribution, notifyAllRecipients, removeFromDistribution } from "@/lib/api";
import type { DistributionEntry } from "@/types";

interface Props {
  documentId: number;
  documentStatus: string;
}

export default function DistributionPanel({ documentId, documentStatus }: Props) {
  const [entries, setEntries] = useState<DistributionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ recipient_name: '', recipient_role: '', recipient_email: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadEntries(); }, [documentId]);

  async function loadEntries() {
    try {
      const data = await getDistribution(documentId);
      setEntries(data.distributions);
    } catch { setEntries([]); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipient_name.trim()) return;
    setLoading(true);
    try {
      await addToDistribution(documentId, form);
      setForm({ recipient_name: '', recipient_role: '', recipient_email: '' });
      setShowForm(false);
      await loadEntries();
    } finally { setLoading(false); }
  }

  async function handleNotify() {
    if (!confirm('Marcar todos como notificados?')) return;
    setLoading(true);
    try { await notifyAllRecipients(documentId); await loadEntries(); }
    finally { setLoading(false); }
  }

  async function handleRemove(id: number) {
    if (!confirm('Remover da lista?')) return;
    await removeFromDistribution(id);
    await loadEntries();
  }

  const pendingCount = entries.filter(e => !e.notified_at).length;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Users size={16} /> Lista de Distribuição
          {entries.length > 0 && (
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{entries.length}</span>
          )}
        </h3>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <button onClick={handleNotify} disabled={loading}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1">
              <Bell size={12} /> Notificar ({pendingCount})
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1">
            <Plus size={12} /> Adicionar
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-3 bg-gray-50 p-3 rounded space-y-2">
          <input placeholder="Nome*" value={form.recipient_name}
            onChange={e => setForm({...form, recipient_name: e.target.value})}
            className="w-full border rounded px-2 py-1 text-sm" required />
          <input placeholder="Função" value={form.recipient_role}
            onChange={e => setForm({...form, recipient_role: e.target.value})}
            className="w-full border rounded px-2 py-1 text-sm" />
          <input placeholder="E-mail" value={form.recipient_email}
            onChange={e => setForm({...form, recipient_email: e.target.value})}
            className="w-full border rounded px-2 py-1 text-sm" type="email" />
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              Salvar
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">Nenhum destinatário cadastrado</p>
      ) : (
        <ul className="space-y-1">
          {entries.map(entry => (
            <li key={entry.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
              <div>
                <span className="font-medium">{entry.recipient_name}</span>
                {entry.recipient_role && <span className="text-gray-500 ml-1">({entry.recipient_role})</span>}
                <div className="flex gap-2 text-xs text-gray-400">
                  {entry.notified_at
                    ? <span className="text-green-600">✓ Notificado {new Date(entry.notified_at).toLocaleDateString('pt-BR')}</span>
                    : <span className="text-yellow-600">Pendente notificação</span>}
                  {entry.acknowledged_at &&
                    <span className="text-blue-600">✓ Confirmou recebimento</span>}
                </div>
              </div>
              <button onClick={() => handleRemove(entry.id)}
                className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Step 2: Usar DistributionPanel em processos/[docId]**

Importar e adicionar `<DistributionPanel documentId={document.id} documentStatus={document.status} />` na página de detalhes.

**Step 3: Commit**

```bash
git add frontend/src/components/DistributionPanel.tsx frontend/src/app/processos/
git commit -m "feat: painel de lista de distribuição controlada na tela de revisão de documentos"
```

---

## Task 12: Frontend — Admin: estatísticas de uso de IA

**Files:**
- Modify: `frontend/src/app/admin/page.tsx`

**Step 1: Adicionar seção de uso de IA ao dashboard admin**

Buscar `/api/admin/ai-usage` e exibir tabela com:
- Agente, Modelo, Chamadas, Tokens entrada/saída, Custo estimado (USD)

Adicionar `useEffect` que busca os dados e renderiza uma tabela simples ao final do dashboard.

**Step 2: Commit**

```bash
git add frontend/src/app/admin/page.tsx
git commit -m "feat: dashboard admin com estatísticas de uso e custo estimado de IA"
```

---

## Task 13: Verificação final e migration de banco

**Step 1: Garantir que migration roda limpa num banco novo**

```bash
cd backend
rm -f fives.db
alembic upgrade head
uvicorn app.main:app --port 8000 &
curl -s http://localhost:8000/health
```
Esperado: `{"status": "healthy"}`

**Step 2: Verificar endpoints principais**

```bash
# Distribuição
curl -s http://localhost:8000/api/distribution/1 | python3 -m json.tool

# Auditoria
curl -s http://localhost:8000/api/audit/PQ-001.00 -o /tmp/auditoria.pdf
ls -lh /tmp/auditoria.pdf

# Publicação
curl -s -X POST "http://localhost:8000/api/documents/PQ-001.00/publish" | python3 -m json.tool
```

**Step 3: Verificar frontend compila**

```bash
cd frontend && npm run build
```
Esperado: nenhum erro TypeScript ou de build.

**Step 4: Commit final**

```bash
git add -u
git commit -m "fix: ajustes de integração pós-implementação dos gaps ISO"
```

---

## Resumo das mudanças

| Arquivo | Tipo | Propósito |
|---|---|---|
| `backend/app/main.py` | Modify | CORS restrito, novos routers |
| `backend/app/config.py` | Modify | ALLOWED_ORIGINS configurável |
| `backend/alembic/versions/009_iso_compliance_fields.py` | Create | Migration: novos campos e tabelas |
| `backend/app/models/document.py` | Modify | review_due_date, retention_years, confidentiality_level |
| `backend/app/models/version.py` | Modify | published_at, obsolete_at |
| `backend/app/models/approval.py` | Modify | deadline, approval_level |
| `backend/app/models/distribution.py` | Create | DocumentDistribution model |
| `backend/app/models/ai_usage_log.py` | Create | AIUsageLog model |
| `backend/app/models/__init__.py` | Modify | Registrar novos modelos |
| `backend/app/routers/documents.py` | Modify | Endpoint POST /{code}/publish |
| `backend/app/routers/export.py` | Modify | Marca d'água em PDFs arquivados/obsoletos |
| `backend/app/routers/distribution.py` | Create | CRUD lista de distribuição |
| `backend/app/routers/audit_report.py` | Create | Relatório de auditoria PDF |
| `backend/app/routers/admin.py` | Modify | GET /ai-usage stats |
| `backend/app/services/approval_service.py` | Modify | Lógica de aprovação paralela por nível |
| `backend/app/schemas/distribution.py` | Create | Schemas de distribuição |
| `backend/app/schemas/approval.py` | Modify | approval_level, deadline nos schemas |
| `frontend/src/types/index.ts` | Modify | Campos ISO, DistributionEntry |
| `frontend/src/lib/api.ts` | Modify | publishDocument, getDistribution, etc. |
| `frontend/src/app/processos/[docId]/page.tsx` | Modify | Botão publicar, campos ISO, relatório |
| `frontend/src/components/DistributionPanel.tsx` | Create | Painel de distribuição controlada |
| `frontend/src/app/admin/page.tsx` | Modify | Estatísticas de uso de IA |
