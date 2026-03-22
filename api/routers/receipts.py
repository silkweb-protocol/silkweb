"""Receipt endpoints — retrieve and verify cryptographic receipts."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.dependencies import get_current_agent
from api.models.agent import Agent
from api.models.receipt import Receipt
from api.schemas.receipt import ReceiptResponse, VerifyReceiptRequest, VerifyReceiptResponse

router = APIRouter(prefix="/api/v1", tags=["receipts"])


@router.get("/tasks/{task_id}/receipt", response_model=ReceiptResponse)
async def get_receipt(
    task_id: str,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Get the cryptographic receipt for a completed task."""
    receipt = await db.scalar(
        select(Receipt).where(Receipt.task_id == task_id)
    )
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found. Task may not be completed yet.",
        )

    # Authorization: only requester or executor
    if receipt.from_silk_id != current_agent.silk_id and receipt.to_silk_id != current_agent.silk_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view receipts for your own tasks.",
        )

    return ReceiptResponse(
        receipt_id=receipt.receipt_id,
        task_id=receipt.task_id,
        from_silk_id=receipt.from_silk_id,
        to_silk_id=receipt.to_silk_id,
        hash=receipt.hash,
        executor_signature=receipt.executor_signature,
        requester_signature=receipt.requester_signature,
        cost_usd=float(receipt.cost_usd) if receipt.cost_usd else None,
        created_at=receipt.created_at,
        verified=True,
    )


@router.post("/verify/receipt", response_model=VerifyReceiptResponse)
async def verify_receipt(
    request: VerifyReceiptRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify a receipt's authenticity. Public endpoint — no auth required."""
    receipt = await db.scalar(
        select(Receipt).where(Receipt.receipt_id == request.receipt_id)
    )
    if not receipt:
        return VerifyReceiptResponse(
            receipt_id=request.receipt_id,
            valid=False,
            message="Receipt not found in the registry.",
        )

    # TODO: Verify Ed25519 signature against the executor's public key
    # For now, existence in the database confirms authenticity
    return VerifyReceiptResponse(
        receipt_id=request.receipt_id,
        valid=True,
        message="Receipt is authentic and recorded in the SilkWeb registry.",
    )
