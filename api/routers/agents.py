"""Agent registration, retrieval, update, and deletion.

Security:
- Registration is open but rate-limited
- All other operations require API key auth
- Agents can only modify/delete their own record
- Soft delete — agents are deactivated, not removed
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.dependencies import get_current_agent
from api.models.agent import Agent, Capability
from api.models.trust import TrustScore
from api.schemas.agent import (
    AgentRegisterRequest,
    AgentRegisteredResponse,
    AgentResponse,
    AgentTierResponse,
    CapabilitySchema,
)
from api.services.auth import generate_api_key, generate_silk_id, hash_api_key
from api.services.tiers import compute_tier, next_tier_requirements

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.post("", response_model=AgentRegisteredResponse, status_code=status.HTTP_201_CREATED)
async def register_agent(
    request: AgentRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new agent on the SilkWeb network.

    Returns the agent's silk_id and API key. The API key is shown ONCE.
    """
    # Check for duplicate agent_id
    existing = await db.scalar(
        select(Agent).where(Agent.agent_id == request.agent_id)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Agent ID '{request.agent_id}' is already registered.",
        )

    # Generate credentials
    silk_id = generate_silk_id()
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)

    # Create agent record
    agent = Agent(
        silk_id=silk_id,
        agent_id=request.agent_id,
        name=request.name,
        description=request.description,
        version=request.version,
        endpoint=request.endpoint,
        api_key_hash=api_key_hash,
        protocols=[p for p in request.protocols],
        authentication=request.authentication.model_dump(),
        pricing=request.pricing.model_dump(),
        trust_public_key=request.trust_public_key,
        contact_email=request.contact_email,
        memory_bytes=request.memory_bytes or 0,
        metadata_=request.metadata,
        a2a_compat=request.a2a_compat,
        mcp_compat=request.mcp_compat,
    )

    # Compute initial tier (fees disabled until 1,000 agents — all free)
    tier_name, _ = compute_tier(agent)
    agent.tier = tier_name
    agent.silkweb_fee_pct = 0  # FREE until 1,000 agents

    db.add(agent)
    await db.flush()  # Get the agent.id for FK references

    # Create capabilities
    for cap in request.capabilities:
        capability = Capability(
            agent_db_id=agent.id,
            capability_id=cap.id,
            name=cap.name,
            description=cap.description,
            input_schema=cap.input_schema,
            output_schema=cap.output_schema,
            tags=cap.tags,
        )
        db.add(capability)

    # Initialize trust score
    trust = TrustScore(
        silk_id=silk_id,
        agent_db_id=agent.id,
        overall_score=0.1,  # Starting score for unverified agents
        identity_score=0.1,
    )
    db.add(trust)

    logger.info(f"Agent registered: {request.agent_id} -> {silk_id}")

    return AgentRegisteredResponse(
        silk_id=silk_id,
        agent_id=request.agent_id,
        api_key=api_key,
    )


@router.get("/{silk_id}", response_model=AgentResponse)
async def get_agent(
    silk_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a registered agent by silk_id. Public endpoint."""
    agent = await db.scalar(
        select(Agent).where(Agent.silk_id == silk_id, Agent.is_active.is_(True))
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found.",
        )

    # Load capabilities
    caps_result = await db.execute(
        select(Capability).where(Capability.agent_db_id == agent.id)
    )
    caps = caps_result.scalars().all()

    return AgentResponse(
        silk_id=agent.silk_id,
        agent_id=agent.agent_id,
        name=agent.name,
        description=agent.description,
        version=agent.version,
        endpoint=agent.endpoint,
        capabilities=[
            CapabilitySchema(
                id=c.capability_id,
                name=c.name,
                description=c.description,
                input_schema=c.input_schema,
                output_schema=c.output_schema,
                tags=c.tags or [],
            )
            for c in caps
        ],
        protocols=agent.protocols or [],
        authentication=agent.authentication or {},
        pricing=agent.pricing or {},
        trust_public_key=agent.trust_public_key,
        metadata=agent.metadata_ or {},
        a2a_compat=agent.a2a_compat or {},
        mcp_compat=agent.mcp_compat or {},
        is_active=agent.is_active,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        tier=agent.tier or "seed",
        silkweb_fee_pct=float(agent.silkweb_fee_pct or 0),
        tasks_completed=agent.tasks_completed or 0,
    )


@router.put("/{silk_id}", response_model=AgentResponse)
async def update_agent(
    silk_id: str,
    request: AgentRegisterRequest,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Update an agent's card. Agents can only update their own record."""
    if current_agent.silk_id != silk_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own agent.",
        )

    # Update fields
    current_agent.name = request.name
    current_agent.description = request.description
    current_agent.version = request.version
    current_agent.endpoint = request.endpoint
    current_agent.protocols = [p for p in request.protocols]
    current_agent.authentication = request.authentication.model_dump()
    current_agent.pricing = request.pricing.model_dump()
    current_agent.trust_public_key = request.trust_public_key
    current_agent.metadata_ = request.metadata
    current_agent.a2a_compat = request.a2a_compat
    current_agent.mcp_compat = request.mcp_compat

    # Replace capabilities
    await db.execute(
        select(Capability).where(Capability.agent_db_id == current_agent.id)
    )
    # Delete old capabilities
    old_caps = (await db.execute(
        select(Capability).where(Capability.agent_db_id == current_agent.id)
    )).scalars().all()
    for cap in old_caps:
        await db.delete(cap)

    # Add new capabilities
    for cap in request.capabilities:
        capability = Capability(
            agent_db_id=current_agent.id,
            capability_id=cap.id,
            name=cap.name,
            description=cap.description,
            input_schema=cap.input_schema,
            output_schema=cap.output_schema,
            tags=cap.tags,
        )
        db.add(capability)

    logger.info(f"Agent updated: {current_agent.agent_id}")

    # Return updated agent
    return await get_agent(silk_id, db)


@router.delete("/{silk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deregister_agent(
    silk_id: str,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete an agent. Agents can only deregister themselves."""
    if current_agent.silk_id != silk_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only deregister your own agent.",
        )

    current_agent.is_active = False
    logger.info(f"Agent deregistered: {current_agent.agent_id} ({silk_id})")


@router.get("/{silk_id}/tier", response_model=AgentTierResponse, include_in_schema=False)
async def get_agent_tier(
    silk_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get an agent's current tier. Hidden from docs until monetization is enabled."""
    from datetime import datetime, timezone

    agent = await db.scalar(
        select(Agent).where(Agent.silk_id == silk_id, Agent.is_active.is_(True))
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found.",
        )

    tier_name, fee_pct = compute_tier(agent)
    next_tier = next_tier_requirements(agent)

    # Calculate age
    now = datetime.now(timezone.utc)
    created = agent.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_days = (now - created).days

    return AgentTierResponse(
        silk_id=agent.silk_id,
        tier=tier_name,
        silkweb_fee_pct=float(fee_pct) * 100,  # Return as percentage (e.g., 2.0 for 2%)
        memory_bytes=agent.memory_bytes or 0,
        tasks_completed=agent.tasks_completed or 0,
        age_days=age_days,
        earnings_total_usd=float(agent.earnings_total_usd or 0),
        next_tier=next_tier,
    )
