"""Pydantic schemas for agent discovery."""

from pydantic import BaseModel, Field, field_validator

from api.schemas.agent import AgentResponse


class DiscoverRequest(BaseModel):
    """Request body for POST /api/v1/discover."""

    capabilities: list[str] | None = Field(None, max_length=10)
    tags: list[str] | None = Field(None, max_length=20)
    min_trust: float | None = Field(None, ge=0.0, le=1.0)
    max_price: float | None = Field(None, ge=0.0)
    protocols: list[str] | None = None
    framework: str | None = Field(None, max_length=64)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

    @field_validator("capabilities")
    @classmethod
    def validate_capabilities(cls, v: list[str] | None) -> list[str] | None:
        if v:
            for cap in v:
                if len(cap) > 64:
                    raise ValueError("Capability ID must be under 64 chars")
        return v


class DiscoverResponse(BaseModel):
    """Response for discovery endpoint."""

    agents: list[AgentResponse]
    total: int
    limit: int
    offset: int
