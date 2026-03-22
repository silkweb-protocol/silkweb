"""Agent discovery endpoint — search by capability, tags, trust, price."""

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.dependencies import get_current_agent
from api.models.agent import Agent, Capability
from api.models.trust import TrustScore
from api.schemas.agent import AgentResponse, CapabilitySchema
from api.schemas.discovery import DiscoverRequest, DiscoverResponse

router = APIRouter(prefix="/api/v1", tags=["discovery"])


@router.post("/discover", response_model=DiscoverResponse)
async def discover_agents(
    request: DiscoverRequest,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Discover agents by capability, tags, trust score, or pricing."""

    # Base query: active agents only, exclude the requester
    query = select(Agent).where(
        Agent.is_active.is_(True),
        Agent.silk_id != current_agent.silk_id,
    )

    # Filter by capabilities
    if request.capabilities:
        cap_subquery = (
            select(Capability.agent_db_id)
            .where(Capability.capability_id.in_(request.capabilities))
            .distinct()
        )
        query = query.where(Agent.id.in_(cap_subquery))

    # Filter by tags
    if request.tags:
        tag_subquery = (
            select(Capability.agent_db_id)
            .where(Capability.tags.overlap(request.tags))
            .distinct()
        )
        query = query.where(Agent.id.in_(tag_subquery))

    # Filter by trust score
    if request.min_trust is not None:
        trust_subquery = (
            select(TrustScore.silk_id)
            .where(TrustScore.overall_score >= request.min_trust)
        )
        query = query.where(Agent.silk_id.in_(trust_subquery))

    # Filter by protocol
    if request.protocols:
        for protocol in request.protocols:
            query = query.where(Agent.protocols.contains([protocol]))

    # Filter by framework (in metadata)
    if request.framework:
        query = query.where(
            Agent.metadata_.op("->>")("framework") == request.framework
        )

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    # Apply pagination
    query = query.offset(request.offset).limit(request.limit)

    result = await db.execute(query)
    agents = result.scalars().all()

    # Build response with capabilities
    agent_responses = []
    for agent in agents:
        caps_result = await db.execute(
            select(Capability).where(Capability.agent_db_id == agent.id)
        )
        caps = caps_result.scalars().all()

        agent_responses.append(AgentResponse(
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
        ))

    return DiscoverResponse(
        agents=agent_responses,
        total=total,
        limit=request.limit,
        offset=request.offset,
    )
