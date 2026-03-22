"""Agent and Capability ORM models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from api.db.base import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    silk_id = Column(String(40), unique=True, nullable=False, index=True)
    agent_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    version = Column(String(20), nullable=False)
    endpoint = Column(Text, nullable=False)
    api_key_hash = Column(String(256), nullable=False)

    # Protocol support
    protocols = Column(JSONB, default=list)
    authentication = Column(JSONB, default=dict)
    pricing = Column(JSONB, default=dict)

    # Trust
    trust_public_key = Column(Text, nullable=True)

    # Contact (optional — for receipt emails)
    contact_email = Column(String(320), nullable=True)

    # Tier system
    memory_bytes = Column(BigInteger, default=0, nullable=False, server_default="0")
    tasks_completed = Column(Integer, default=0, nullable=False, server_default="0")
    tier = Column(String(20), default="seed", nullable=False, server_default="seed")
    silkweb_fee_pct = Column(Numeric(5, 4), default=0, nullable=False, server_default="0")
    earnings_total_usd = Column(Numeric(12, 2), default=0, nullable=False, server_default="0")

    # Metadata
    metadata_ = Column("metadata", JSONB, default=dict)
    a2a_compat = Column(JSONB, default=dict)
    mcp_compat = Column(JSONB, default=dict)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
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

    # Relationships
    capabilities = relationship(
        "Capability", back_populates="agent", cascade="all, delete-orphan"
    )
    trust_score = relationship(
        "TrustScore", back_populates="agent", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_agents_is_active", "is_active"),
    )


class Capability(Base):
    __tablename__ = "capabilities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_db_id = Column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    capability_id = Column(String(64), nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    input_schema = Column(JSONB, nullable=True)
    output_schema = Column(JSONB, nullable=True)
    tags = Column(ARRAY(Text), default=list)

    # Relationships
    agent = relationship("Agent", back_populates="capabilities")

    __table_args__ = (
        Index("ix_capabilities_capability_id", "capability_id"),
        Index("ix_capabilities_tags", "tags", postgresql_using="gin"),
        Index("ix_capabilities_agent_db_id", "agent_db_id"),
    )
