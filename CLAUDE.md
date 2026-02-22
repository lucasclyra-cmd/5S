# 5S - Sistema de Automação de Documentos Corporativos com IA

## Project Overview
Corporate document automation system that uses AI to analyze, format, version and route normative documents (work instructions, procedures, requisitions).

## Stack
- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS) on port 3000
- **Backend**: Python FastAPI on port 8000
- **Database**: PostgreSQL on port 5432
- **AI**: OpenAI GPT via API
- **Doc Processing**: python-docx, PyMuPDF, LibreOffice headless

## Running
```bash
docker-compose up --build
```

## Project Structure
- `backend/` - FastAPI Python backend
- `frontend/` - Next.js TypeScript frontend
- `storage/` - Document files (originals, formatted, temp)

## Key Conventions
- Backend uses SQLAlchemy + Alembic for DB management
- Frontend uses App Router (not Pages Router)
- API base URL from frontend: `http://localhost:8000/api`
- No authentication in MVP - profile selector (Autor/Processos/Admin)
- All AI prompts are configurable via admin interface
- Documents go through 3 AI agents: Analysis → Formatting → Changelog
