# 5S - Sistema de Automação de Documentos Corporativos com IA

## Project Overview
Corporate document automation system that uses AI to analyze, format, version and route normative documents (work instructions, procedures, requisitions).

## Stack
- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS) on port 3000
- **Backend**: Python FastAPI on port 8000
- **Database**: SQLite — async via SQLAlchemy
- **AI**: OpenAI GPT via API
- **Doc Processing**: python-docx, PyMuPDF, LibreOffice headless

## Pré-requisitos
- Python 3.12+
- Node.js 20+
- LibreOffice (necessário para conversão de documentos)
  - **Mac**: `brew install --cask libreoffice`
  - **Windows**: instalador oficial em https://www.libreoffice.org/download

## Running
```bash
# Backend
cd backend
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```
Banco de dados: SQLite automático (arquivo `fives.db` na pasta backend).

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
- AI agents pipeline: Analysis → Formatting → Changelog (+ Spelling, CrossRef, Safety agents)

## Commit Convention
- Conventional commits in Portuguese: `feat:`, `fix:`, `refactor:` with PT-BR descriptions
- All UI text and AI prompts are in Brazilian Portuguese

## Frontend Routes
- `/autor` - Document author views (submit, track documents)
- `/processos` - Process management views (review queue, master list)
- `/admin` - Admin views (rules, categories, approvers, templates, bulk import)

## Alembic Migrations
- Naming: `NNN_description.py` (e.g., `006_text_reviews.py`) — sequential numbering
- Rodar: `cd backend && alembic upgrade head`
