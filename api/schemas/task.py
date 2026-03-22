"""Pydantic schemas for task management."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


VALID_STATUSES = {"pending", "accepted", "in_progress", "completed", "failed", "cancelled"}


class TaskCreateRequest(BaseModel):
    """Request body for POST /api/v1/tasks."""

    to_silk_id: str = Field(..., min_length=3, max_length=40)
    capability: str = Field(..., min_length=1, max_length=64)
    input: dict = Field(...)
    permissions: dict = Field(default_factory=dict)
    max_cost_usd: float | None = Field(None, ge=0.0, le=10000.0)
    timeout_seconds: int | None = Field(None, ge=10, le=86400)
    callback_url: str | None = Field(None, max_length=2048)

    @field_validator("callback_url")
    @classmethod
    def validate_callback_url(cls, v: str | None) -> str | None:
        if v and not v.startswith("https://"):
            raise ValueError("callback_url must use HTTPS")
        return v

    @field_validator("input")
    @classmethod
    def validate_input_size(cls, v: dict) -> dict:
        import json
        if len(json.dumps(v)) > 1_000_000:
            raise ValueError("Task input must be under 1MB")
        return v


class TaskResponse(BaseModel):
    """Response for task endpoints."""

    task_id: str
    from_silk_id: str
    to_silk_id: str
    capability: str
    status: str
    progress: int
    message: str | None
    input: dict
    output: dict | None
    actual_cost_usd: float | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class TaskCreatedResponse(BaseModel):
    """Response after task creation."""

    task_id: str
    status: str = "pending"
    message: str = "Task created and sent to target agent."
