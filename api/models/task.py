"""Task ORM model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, DateTime, Index, Integer, Numeric, String, Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from api.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String(40), unique=True, nullable=False, index=True)
    from_silk_id = Column(String(40), nullable=False, index=True)
    to_silk_id = Column(String(40), nullable=False, index=True)
    capability = Column(String(64), nullable=False)

    # Data — input is validated, output is from the executor
    input = Column(JSONB, nullable=False)
    output = Column(JSONB, nullable=True)

    # Status tracking
    status = Column(
        String(20), nullable=False, default="pending", index=True
    )
    progress = Column(Integer, default=0)
    message = Column(Text, nullable=True)

    # Constraints
    permissions = Column(JSONB, default=dict)
    max_cost_usd = Column(Numeric(10, 4), nullable=True)
    actual_cost_usd = Column(Numeric(10, 4), nullable=True)
    timeout_seconds = Column(Integer, nullable=True)
    callback_url = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_tasks_status_created", "status", "created_at"),
    )
