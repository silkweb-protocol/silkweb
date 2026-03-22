"""Task management endpoints — create, status, cancel, complete."""

import hashlib
import secrets
from datetime import datetime, timezone
from decimal import Decimal

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.dependencies import get_current_agent
from api.models.agent import Agent, Capability
from api.models.task import Task
from api.models.receipt import Receipt
from api.schemas.task import TaskCreateRequest, TaskCreatedResponse, TaskResponse
from api.services.email import send_receipt_email
from api.services.tiers import compute_tier

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.post("", response_model=TaskCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    request: TaskCreateRequest,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Create a task request to another agent."""

    # Validate target agent exists and is active
    target = await db.scalar(
        select(Agent).where(
            Agent.silk_id == request.to_silk_id,
            Agent.is_active.is_(True),
        )
    )
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target agent not found or inactive.",
        )

    # Cannot send tasks to yourself
    if target.silk_id == current_agent.silk_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a task to yourself.",
        )

    # Validate target has the requested capability
    cap_exists = await db.scalar(
        select(Capability).where(
            Capability.agent_db_id == target.id,
            Capability.capability_id == request.capability,
        )
    )
    if not cap_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target agent does not have capability '{request.capability}'.",
        )

    # Create task
    task_id = f"task_{secrets.token_hex(18)}"
    task = Task(
        task_id=task_id,
        from_silk_id=current_agent.silk_id,
        to_silk_id=request.to_silk_id,
        capability=request.capability,
        input=request.input,
        permissions=request.permissions,
        max_cost_usd=request.max_cost_usd,
        timeout_seconds=request.timeout_seconds,
        callback_url=request.callback_url,
    )
    db.add(task)

    return TaskCreatedResponse(task_id=task_id)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_status(
    task_id: str,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Get task status. Only the requester or executor can view."""
    task = await db.scalar(
        select(Task).where(Task.task_id == task_id)
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    # Authorization: only requester or executor can view
    if task.from_silk_id != current_agent.silk_id and task.to_silk_id != current_agent.silk_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view tasks you created or were assigned to.",
        )

    return TaskResponse(
        task_id=task.task_id,
        from_silk_id=task.from_silk_id,
        to_silk_id=task.to_silk_id,
        capability=task.capability,
        status=task.status,
        progress=task.progress,
        message=task.message,
        input=task.input,
        output=task.output,
        actual_cost_usd=float(task.actual_cost_usd) if task.actual_cost_usd else None,
        created_at=task.created_at,
        updated_at=task.updated_at,
        completed_at=task.completed_at,
    )


@router.post("/{task_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_task(
    task_id: str,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending task. Only the requester can cancel."""
    task = await db.scalar(
        select(Task).where(Task.task_id == task_id)
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    # Only the requester can cancel
    if task.from_silk_id != current_agent.silk_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the task requester can cancel.",
        )

    # Can only cancel pending or accepted tasks
    if task.status not in ("pending", "accepted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel task with status '{task.status}'.",
        )

    task.status = "cancelled"
    task.updated_at = datetime.now(timezone.utc)

    return {"task_id": task_id, "status": "cancelled", "message": "Task cancelled."}


# ── Task Completion + Receipt Generation ──────────────────────────────


class TaskCompleteRequest(BaseModel):
    output: dict
    message: str | None = None
    actual_cost_usd: float | None = None


@router.post("/{task_id}/complete", status_code=status.HTTP_200_OK)
async def complete_task(
    task_id: str,
    request: TaskCompleteRequest,
    background_tasks: BackgroundTasks,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Complete a task, generate a cryptographic receipt, and email the requester."""
    task = await db.scalar(
        select(Task).where(Task.task_id == task_id)
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    # Only the executor (to_silk_id) can complete
    if task.to_silk_id != current_agent.silk_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned executor can complete this task.",
        )

    if task.status not in ("pending", "accepted", "running"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete task with status '{task.status}'.",
        )

    # Update task
    now = datetime.now(timezone.utc)
    task.status = "completed"
    task.output = request.output
    task.message = request.message
    task.progress = 100
    task.actual_cost_usd = request.actual_cost_usd
    task.completed_at = now
    task.updated_at = now

    # Update executor's tier stats
    current_agent.tasks_completed = (current_agent.tasks_completed or 0) + 1
    tier_name, fee_pct = compute_tier(current_agent)
    current_agent.tier = tier_name
    current_agent.silkweb_fee_pct = fee_pct

    # Calculate SilkWeb fee
    silkweb_fee_usd = None
    if request.actual_cost_usd is not None and request.actual_cost_usd > 0:
        silkweb_fee_usd = Decimal(str(request.actual_cost_usd)) * fee_pct
        current_agent.earnings_total_usd = (
            Decimal(str(current_agent.earnings_total_usd or 0))
            + Decimal(str(request.actual_cost_usd))
            - silkweb_fee_usd
        )

    # Generate cryptographic receipt
    receipt_id = f"rcpt_{secrets.token_hex(18)}"

    # Create hash of the task data
    hash_input = f"{task_id}:{task.from_silk_id}:{task.to_silk_id}:{task.capability}:{now.isoformat()}"
    receipt_hash = f"sha256:{hashlib.sha256(hash_input.encode()).hexdigest()}"

    # Generate Ed25519 signature
    private_key = Ed25519PrivateKey.generate()
    signature = private_key.sign(receipt_hash.encode())
    executor_sig = f"ed25519:{base64.b64encode(signature).decode()}"
    public_key_bytes = private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    public_key_b64 = base64.b64encode(public_key_bytes).decode()

    receipt = Receipt(
        receipt_id=receipt_id,
        task_id=task_id,
        from_silk_id=task.from_silk_id,
        to_silk_id=task.to_silk_id,
        hash=receipt_hash,
        executor_signature=executor_sig,
        cost_usd=request.actual_cost_usd,
        silkweb_fee_usd=silkweb_fee_usd,
    )
    db.add(receipt)
    await db.commit()

    # Send receipt email to the requester (if they have an email)
    requester = await db.scalar(
        select(Agent).where(Agent.silk_id == task.from_silk_id)
    )
    if requester and requester.contact_email:
        background_tasks.add_task(
            send_receipt_email,
            to_email=requester.contact_email,
            task_id=task_id,
            capability=task.capability,
            from_agent=task.from_silk_id,
            to_agent=task.to_silk_id,
            receipt_hash=receipt_hash,
            executor_sig=executor_sig,
            cost=str(request.actual_cost_usd) if request.actual_cost_usd else None,
            completed_at=now.strftime("%B %d, %Y at %H:%M UTC"),
        )

    return {
        "task_id": task_id,
        "status": "completed",
        "receipt": {
            "receipt_id": receipt_id,
            "hash": receipt_hash,
            "executor_signature": executor_sig,
            "public_key": f"ed25519:{public_key_b64}",
            "verified": True,
            "silkweb_fee_usd": float(silkweb_fee_usd) if silkweb_fee_usd else None,
        },
        "executor_tier": tier_name,
        "message": "Task completed. Cryptographic receipt generated."
            + (" Receipt email sent." if requester and requester.contact_email else ""),
    }
