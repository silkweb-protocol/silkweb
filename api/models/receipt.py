"""Receipt ORM model — immutable cryptographic proofs."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.db.base import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id = Column(String(40), unique=True, nullable=False, index=True)
    task_id = Column(String(40), nullable=False, index=True)
    from_silk_id = Column(String(40), nullable=False)
    to_silk_id = Column(String(40), nullable=False)

    # Cryptographic proof
    hash = Column(String(128), nullable=False)
    executor_signature = Column(Text, nullable=False)
    requester_signature = Column(Text, nullable=True)

    cost_usd = Column(Numeric(10, 4), nullable=True)
    silkweb_fee_usd = Column(Numeric(10, 4), nullable=True)

    # Immutable — no updated_at, receipts are never modified
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
