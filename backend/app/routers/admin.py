from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.config import AdminConfig, Category, Tag
from app.schemas.config import (
    AdminConfigCreate,
    AdminConfigResponse,
    AdminConfigUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    TagCreate,
    TagResponse,
    TagUpdate,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ---- Categories ----


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all categories."""
    result = await db.execute(select(Category).order_by(Category.name))
    return [CategoryResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new category."""
    category = Category(
        name=body.name,
        description=body.description,
        parent_id=body.parent_id,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int, body: CategoryUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a category."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    if body.name is not None:
        category.name = body.name
    if body.description is not None:
        category.description = body.description
    if body.parent_id is not None:
        category.parent_id = body.parent_id

    await db.flush()
    await db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a category."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(category)
    await db.flush()
    return {"message": "Category deleted"}


# ---- Tags ----


@router.get("/tags", response_model=list[TagResponse])
async def list_tags(db: AsyncSession = Depends(get_db)):
    """List all tags."""
    result = await db.execute(select(Tag).order_by(Tag.name))
    return [TagResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/tags", response_model=TagResponse, status_code=201)
async def create_tag(body: TagCreate, db: AsyncSession = Depends(get_db)):
    """Create a new tag."""
    # Check if tag with same name exists
    existing = await db.execute(select(Tag).where(Tag.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tag with this name already exists")

    tag = Tag(name=body.name)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return TagResponse.model_validate(tag)


@router.put("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: int, body: TagUpdate, db: AsyncSession = Depends(get_db)):
    """Update a tag."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    tag.name = body.name
    await db.flush()
    await db.refresh(tag)
    return TagResponse.model_validate(tag)


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a tag."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    await db.flush()
    return {"message": "Tag deleted"}


# ---- Templates (AdminConfig with config_type='template') ----


async def _get_configs_by_type(db: AsyncSession, config_type: str) -> list[AdminConfig]:
    result = await db.execute(
        select(AdminConfig)
        .where(AdminConfig.config_type == config_type)
        .order_by(AdminConfig.id)
    )
    return list(result.scalars().all())


async def _get_config(db: AsyncSession, config_id: int, config_type: str) -> AdminConfig:
    result = await db.execute(
        select(AdminConfig).where(
            AdminConfig.id == config_id, AdminConfig.config_type == config_type
        )
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail=f"{config_type.title()} not found")
    return config


@router.get("/templates", response_model=list[AdminConfigResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all template configurations."""
    configs = await _get_configs_by_type(db, "template")
    return [AdminConfigResponse.model_validate(c) for c in configs]


@router.post("/templates", response_model=AdminConfigResponse, status_code=201)
async def create_template(body: AdminConfigCreate, db: AsyncSession = Depends(get_db)):
    """Create a new template configuration."""
    config = AdminConfig(
        config_type="template",
        category_id=body.category_id,
        document_type=body.document_type,
        config_data=body.config_data,
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return AdminConfigResponse.model_validate(config)


@router.put("/templates/{config_id}", response_model=AdminConfigResponse)
async def update_template(
    config_id: int, body: AdminConfigUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a template configuration."""
    config = await _get_config(db, config_id, "template")
    if body.category_id is not None:
        config.category_id = body.category_id
    if body.document_type is not None:
        config.document_type = body.document_type
    if body.config_data is not None:
        config.config_data = body.config_data

    await db.flush()
    await db.refresh(config)
    return AdminConfigResponse.model_validate(config)


@router.delete("/templates/{config_id}")
async def delete_template(config_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a template configuration."""
    config = await _get_config(db, config_id, "template")
    await db.delete(config)
    await db.flush()
    return {"message": "Template deleted"}


# ---- Rules (AdminConfig with config_type='analysis_rules') ----


@router.get("/rules", response_model=list[AdminConfigResponse])
async def list_rules(db: AsyncSession = Depends(get_db)):
    """List all analysis rule configurations."""
    configs = await _get_configs_by_type(db, "analysis_rules")
    return [AdminConfigResponse.model_validate(c) for c in configs]


@router.post("/rules", response_model=AdminConfigResponse, status_code=201)
async def create_rule(body: AdminConfigCreate, db: AsyncSession = Depends(get_db)):
    """Create a new analysis rule configuration."""
    config = AdminConfig(
        config_type="analysis_rules",
        category_id=body.category_id,
        document_type=body.document_type,
        config_data=body.config_data,
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return AdminConfigResponse.model_validate(config)


@router.put("/rules/{config_id}", response_model=AdminConfigResponse)
async def update_rule(
    config_id: int, body: AdminConfigUpdate, db: AsyncSession = Depends(get_db)
):
    """Update an analysis rule configuration."""
    config = await _get_config(db, config_id, "analysis_rules")
    if body.category_id is not None:
        config.category_id = body.category_id
    if body.document_type is not None:
        config.document_type = body.document_type
    if body.config_data is not None:
        config.config_data = body.config_data

    await db.flush()
    await db.refresh(config)
    return AdminConfigResponse.model_validate(config)


@router.delete("/rules/{config_id}")
async def delete_rule(config_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an analysis rule configuration."""
    config = await _get_config(db, config_id, "analysis_rules")
    await db.delete(config)
    await db.flush()
    return {"message": "Rule deleted"}


# ---- Prompts (AdminConfig with config_type='prompt') ----


@router.get("/prompts", response_model=list[AdminConfigResponse])
async def list_prompts(db: AsyncSession = Depends(get_db)):
    """List all prompt configurations."""
    configs = await _get_configs_by_type(db, "prompt")
    return [AdminConfigResponse.model_validate(c) for c in configs]


@router.post("/prompts", response_model=AdminConfigResponse, status_code=201)
async def create_prompt(body: AdminConfigCreate, db: AsyncSession = Depends(get_db)):
    """Create a new prompt configuration."""
    config = AdminConfig(
        config_type="prompt",
        category_id=body.category_id,
        document_type=body.document_type,
        config_data=body.config_data,
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return AdminConfigResponse.model_validate(config)


@router.put("/prompts/{config_id}", response_model=AdminConfigResponse)
async def update_prompt(
    config_id: int, body: AdminConfigUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a prompt configuration."""
    config = await _get_config(db, config_id, "prompt")
    if body.category_id is not None:
        config.category_id = body.category_id
    if body.document_type is not None:
        config.document_type = body.document_type
    if body.config_data is not None:
        config.config_data = body.config_data

    await db.flush()
    await db.refresh(config)
    return AdminConfigResponse.model_validate(config)


@router.delete("/prompts/{config_id}")
async def delete_prompt(config_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a prompt configuration."""
    config = await _get_config(db, config_id, "prompt")
    await db.delete(config)
    await db.flush()
    return {"message": "Prompt deleted"}
