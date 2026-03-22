"""Health check and stats endpoints — no auth required."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.db.session import get_db
from api.models.agent import Agent, Capability
from api.models.task import Task

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check. Returns 200 if the API is running."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/api/v1/stats")
async def mesh_stats(db: AsyncSession = Depends(get_db)):
    """Public mesh statistics — no auth required."""
    agents_count = await db.scalar(
        select(func.count()).select_from(Agent).where(Agent.is_active.is_(True))
    )
    capabilities_count = await db.scalar(
        select(func.count()).select_from(Capability)
    )
    tasks_count = await db.scalar(
        select(func.count()).select_from(Task)
    )

    return {
        "agents": agents_count or 0,
        "capabilities": capabilities_count or 0,
        "tasks_completed": tasks_count or 0,
        "protocol_version": "0.1.0",
    }
