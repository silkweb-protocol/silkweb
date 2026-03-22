"""Trust score and peer review ORM models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.db.base import Base


class TrustScore(Base):
    __tablename__ = "trust_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    silk_id = Column(String(40), unique=True, nullable=False, index=True)

    # Composite score
    overall_score = Column(Numeric(3, 2), default=0.0, nullable=False)

    # Component scores (0.00 - 1.00)
    identity_score = Column(Numeric(3, 2), default=0.0)
    success_rate = Column(Numeric(3, 2), default=0.0)
    response_time_score = Column(Numeric(3, 2), default=0.0)
    peer_review_score = Column(Numeric(3, 2), default=0.0)
    uptime_score = Column(Numeric(3, 2), default=0.0)
    maturity_score = Column(Numeric(3, 2), default=0.0)

    # Counters
    total_tasks = Column(Integer, default=0, nullable=False)
    successful_tasks = Column(Integer, default=0, nullable=False)

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    from sqlalchemy.orm import relationship
    from sqlalchemy import ForeignKey
    agent_db_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=True,
    )
    agent = relationship("Agent", back_populates="trust_score")


class PeerReview(Base):
    __tablename__ = "peer_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reviewer_silk_id = Column(String(40), nullable=False, index=True)
    reviewed_silk_id = Column(String(40), nullable=False, index=True)
    task_id = Column(String(40), nullable=False)

    rating = Column(Numeric(2, 1), nullable=False)  # 1.0 - 5.0
    comment = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
