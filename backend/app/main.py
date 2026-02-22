from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import documents, ai_routes, workflow, admin, export

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables for development
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await engine.dispose()


app = FastAPI(
    title="5S - Corporate Document Automation System",
    description="Backend API for document management, AI analysis, formatting, and workflow.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/")
async def root():
    return {"message": "5S Document Automation System API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
