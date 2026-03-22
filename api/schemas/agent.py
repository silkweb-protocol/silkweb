"""Pydantic schemas for agent registration and retrieval.

Strict validation — reject anything that doesn't match exactly.
"""

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

# Strict patterns from the protocol spec
AGENT_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$")
SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
VALID_PROTOCOLS = {"silkweb", "a2a", "mcp"}
VALID_AUTH_TYPES = {"api_key", "oauth2", "mtls", "none"}
VALID_PRICING_MODELS = {"free", "per_task", "per_minute", "subscription", "negotiable"}


class CapabilitySchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = Field(None, max_length=500)
    input_schema: dict | None = None
    output_schema: dict | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("id")
    @classmethod
    def validate_capability_id(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", v):
            raise ValueError("Capability ID must be lowercase alphanumeric with hyphens")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        for tag in v:
            if len(tag) > 50 or not re.match(r"^[a-z0-9-]+$", tag):
                raise ValueError(f"Invalid tag: '{tag}'. Tags must be lowercase alphanumeric with hyphens, max 50 chars.")
        return v


class AuthenticationSchema(BaseModel):
    type: str = "none"
    credentials_url: str | None = None

    @field_validator("type")
    @classmethod
    def validate_auth_type(cls, v: str) -> str:
        if v not in VALID_AUTH_TYPES:
            raise ValueError(f"Invalid auth type. Must be one of: {VALID_AUTH_TYPES}")
        return v


class PricingSchema(BaseModel):
    model: str = "free"
    currency: str = "USD"
    amount: float | None = None

    @field_validator("model")
    @classmethod
    def validate_pricing_model(cls, v: str) -> str:
        if v not in VALID_PRICING_MODELS:
            raise ValueError(f"Invalid pricing model. Must be one of: {VALID_PRICING_MODELS}")
        return v


class AgentRegisterRequest(BaseModel):
    """Request body for POST /api/v1/agents — strict validation."""

    agent_id: str = Field(..., min_length=3, max_length=64)
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(..., min_length=10, max_length=500)
    version: str = Field(..., max_length=20)
    endpoint: str = Field(..., min_length=8, max_length=2048)
    capabilities: list[CapabilitySchema] = Field(..., min_length=1, max_length=50)

    # Optional fields
    protocols: list[str] = Field(default_factory=lambda: ["silkweb"])
    authentication: AuthenticationSchema = Field(default_factory=AuthenticationSchema)
    pricing: PricingSchema = Field(default_factory=PricingSchema)
    trust_public_key: str | None = Field(None, max_length=256)
    metadata: dict = Field(default_factory=dict)
    a2a_compat: dict = Field(default_factory=dict)
    mcp_compat: dict = Field(default_factory=dict)

    @field_validator("agent_id")
    @classmethod
    def validate_agent_id(cls, v: str) -> str:
        if not AGENT_ID_PATTERN.match(v):
            raise ValueError(
                "agent_id must be 3-64 chars, lowercase alphanumeric with hyphens, "
                "cannot start or end with a hyphen."
            )
        return v

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        if not SEMVER_PATTERN.match(v):
            raise ValueError("version must be semver format (e.g., 1.0.0)")
        return v

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("endpoint must use HTTPS")
        return v

    @field_validator("protocols")
    @classmethod
    def validate_protocols(cls, v: list[str]) -> list[str]:
        for p in v:
            if p not in VALID_PROTOCOLS:
                raise ValueError(f"Invalid protocol '{p}'. Must be one of: {VALID_PROTOCOLS}")
        return v

    @model_validator(mode="after")
    def validate_metadata_size(self):
        """Prevent metadata from being used as arbitrary data storage."""
        import json
        meta_size = len(json.dumps(self.metadata))
        if meta_size > 10_000:
            raise ValueError("metadata must be under 10KB")
        return self


class AgentResponse(BaseModel):
    """Response body for agent endpoints — never exposes internal fields."""

    silk_id: str
    agent_id: str
    name: str
    description: str
    version: str
    endpoint: str
    capabilities: list[CapabilitySchema]
    protocols: list[str]
    authentication: dict
    pricing: dict
    trust_public_key: str | None
    metadata: dict
    a2a_compat: dict
    mcp_compat: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentRegisteredResponse(BaseModel):
    """Response after successful registration — includes the API key (shown once)."""

    silk_id: str
    agent_id: str
    api_key: str = Field(description="Your API key. Store it securely — it cannot be retrieved again.")
    message: str = "Agent registered successfully. Store your API key — it will not be shown again."
