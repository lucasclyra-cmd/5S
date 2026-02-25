import logging
import os
import shutil
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import engine, async_session_factory, Base
from app.config import settings
from app.models.template import DocumentTemplate
from app.routers import documents, ai_routes, workflow, admin, export, master_list, approval, templates, bulk_import

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401

logger = logging.getLogger(__name__)

# Default template files shipped with the project (relative to project root)
_DEFAULT_TEMPLATES = [
    {
        "name": "Template Padrão PQ",
        "document_type": "PQ",
        "source_filename": "PQ-000.00 (FORMATAÇÃO ATUALIZADA) - FAZER A CÓPIA DESSE MODELO.docx",
    },
    {
        "name": "Template Padrão IT",
        "document_type": "IT",
        "source_filename": "IT-000.00 (FORMATAÇÃO ATUALIZADA) - FAZER A CÓPIA DESSE MODELO.odt",
    },
]


async def _seed_default_templates():
    """Pre-load default PQ/IT templates if none exist for each document type."""
    from app.services.template_service import find_placeholders, convert_odt_to_docx

    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    templates_dir = os.path.join(settings.STORAGE_PATH, "templates")
    os.makedirs(templates_dir, exist_ok=True)

    async with async_session_factory() as db:
        for tmpl in _DEFAULT_TEMPLATES:
            doc_type = tmpl["document_type"]

            # Skip if an active template already exists for this type
            result = await db.execute(
                select(DocumentTemplate).where(
                    DocumentTemplate.document_type == doc_type,
                    DocumentTemplate.is_active == True,
                )
            )
            if result.scalar_one_or_none():
                logger.info(f"Template ativo para {doc_type} já existe, pulando seed")
                continue

            source_path = os.path.join(project_root, tmpl["source_filename"])
            if not os.path.exists(source_path):
                logger.warning(f"Arquivo de template não encontrado: {source_path}")
                continue

            # Copy to storage/templates/
            ext = os.path.splitext(source_path)[1]
            dest_filename = f"{doc_type}_padrao{ext}"
            dest_path = os.path.join(templates_dir, dest_filename)
            shutil.copy2(source_path, dest_path)

            # Convert .odt → .docx eagerly so formatting always has a native .docx
            docx_path = dest_path
            section_mapping = None
            try:
                if ext.lower() == ".odt":
                    temp_dir = os.path.join(settings.STORAGE_PATH, "temp")
                    os.makedirs(temp_dir, exist_ok=True)
                    converted = convert_odt_to_docx(dest_path, temp_dir)
                    docx_name = f"{doc_type}_padrao.docx"
                    docx_path = os.path.join(templates_dir, docx_name)
                    shutil.move(converted, docx_path)
                placeholders = find_placeholders(docx_path)
                section_mapping = {"placeholders": placeholders}
                logger.info(f"Template {doc_type}: {len(placeholders)} placeholders encontrados")
            except Exception as e:
                logger.warning(f"Erro ao processar template {doc_type}: {e}")
                section_mapping = {"placeholders": []}

            template = DocumentTemplate(
                name=tmpl["name"],
                description=f"Template padrão para documentos {doc_type} (carregado automaticamente)",
                document_type=doc_type,
                template_file_path=dest_path,
                docx_file_path=docx_path,
                is_active=True,
                section_mapping=section_mapping,
            )
            db.add(template)
            logger.info(f"Template padrão {doc_type} carregado: {dest_filename}")

        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables for development
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed default templates
    try:
        await _seed_default_templates()
    except Exception as e:
        logger.error(f"Erro ao carregar templates padrão: {e}")
    yield
    # Shutdown: dispose engine
    await engine.dispose()


app = FastAPI(
    title="5S - Corporate Document Automation System",
    description="Backend API for document management, AI analysis, formatting, and workflow.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - restrict to allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router)
app.include_router(ai_routes.router)
app.include_router(workflow.router)
app.include_router(admin.router)
app.include_router(export.router)
app.include_router(master_list.router)
app.include_router(approval.router)
app.include_router(templates.router)
app.include_router(bulk_import.router)


@app.get("/")
async def root():
    return {"message": "5S Document Automation System API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
