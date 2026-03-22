"""Task management endpoints — create, status, cancel."""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.dependencies import get_current_agent
from api.models.agent import Agent, Capability
from api.models.task import Task
from api.schemas.task import TaskCreateRequest, TaskCreatedResponse, TaskResponse

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
