"""Pydantic schemas for trust scores."""

from datetime import datetime

from pydantic import BaseModel


class TrustScoreResponse(BaseModel):
    """Trust score breakdown for an agent."""

    silk_id: str
    overall_score: float
    identity_score: float
    success_rate: float
    response_time_score: float
    peer_review_score: float
    uptime_score: float
    maturity_score: float
    total_tasks: int
    successful_tasks: int
    updated_at: datetime

    model_config = {"from_attributes": True}
