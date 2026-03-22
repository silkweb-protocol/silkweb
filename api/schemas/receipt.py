"""Pydantic schemas for cryptographic receipts."""

from datetime import datetime

from pydantic import BaseModel, Field


class ReceiptResponse(BaseModel):
    """Receipt returned after task completion."""

    receipt_id: str
    task_id: str
    from_silk_id: str
    to_silk_id: str
    hash: str
    executor_signature: str
    requester_signature: str | None
    cost_usd: float | None
    created_at: datetime
    verified: bool = True

    model_config = {"from_attributes": True}


class VerifyReceiptRequest(BaseModel):
    """Request to verify a receipt's authenticity."""

    receipt_id: str = Field(..., min_length=5, max_length=40)


class VerifyReceiptResponse(BaseModel):
    """Result of receipt verification."""

    receipt_id: str
    valid: bool
    message: str
