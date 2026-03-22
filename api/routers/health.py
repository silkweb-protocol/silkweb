"""Health check, stats, and waitlist endpoints — no auth required."""

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.db.session import get_db
from api.models.agent import Agent, Capability
from api.models.task import Task
from api.models.receipt import Receipt
from api.models.waitlist import WaitlistSignup

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


# ── Waitlist ──────────────────────────────────────────────────────────

class WaitlistRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address")
        if len(v) > 320:
            raise ValueError("Email too long")
        return v


@router.post("/api/v1/waitlist")
async def join_waitlist(req: WaitlistRequest, db: AsyncSession = Depends(get_db)):
    """Add an email to the waitlist. Idempotent — duplicate emails return success."""
    # Check if already signed up
    existing = await db.scalar(
        select(WaitlistSignup).where(WaitlistSignup.email == req.email)
    )
    if existing:
        return {"status": "already_registered", "message": "You're already on the list."}

    signup = WaitlistSignup(email=req.email)
    db.add(signup)
    await db.commit()

    return {"status": "registered", "message": "You're on the silk web. We'll be in touch soon."}


@router.get("/api/v1/waitlist/count")
async def waitlist_count(db: AsyncSession = Depends(get_db)):
    """Public count of waitlist signups."""
    count = await db.scalar(
        select(func.count()).select_from(WaitlistSignup)
    )
    return {"count": count or 0}


# ── Receipt Verification (public) ────────────────────────────────────

@router.get("/api/v1/verify/{task_id}")
async def verify_receipt(task_id: str, db: AsyncSession = Depends(get_db)):
    """Public receipt verification — no auth required."""
    receipt = await db.scalar(
        select(Receipt).where(Receipt.task_id == task_id)
    )
    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="No receipt found for this task ID.",
        )

    task = await db.scalar(
        select(Task).where(Task.task_id == task_id)
    )

    return {
        "verified": True,
        "receipt_id": receipt.receipt_id,
        "task_id": receipt.task_id,
        "from_silk_id": receipt.from_silk_id,
        "to_silk_id": receipt.to_silk_id,
        "capability": task.capability if task else None,
        "hash": receipt.hash,
        "executor_signature": receipt.executor_signature,
        "cost_usd": float(receipt.cost_usd) if receipt.cost_usd else None,
        "completed_at": receipt.created_at.isoformat() if receipt.created_at else None,
    }
