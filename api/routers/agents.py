"""Agent registration, retrieval, update, and deletion.

Security:
- Registration is open but rate-limited
- All other operations require API key auth
- Agents can only modify/delete their own record
- Soft delete — agents are deactivated, not removed
"""

import asyncio
import logging
import re
import unicodedata
from datetime import datetime, timezone

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
    TextRegisterRequest,
    TextRegisteredResponse,
)
from api.services.auth import generate_api_key, generate_silk_id, hash_api_key
from api.services.tiers import compute_tier, next_tier_requirements

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


# ── Background crawl task ────────────────────────────────────────────────────

async def _background_crawl(silk_id: str, url: str, user_input: dict, db_session_factory):
    """Run website crawl in the background and update the agent record."""
    from api.services.crawler import crawl_business
    from api.services.ai_profile import generate_ai_profile
    from api.services.mailer import send_indexing_email, send_admin_notification

    try:
        logger.info(f"Starting background crawl for {silk_id}: {url}")

        # Crawl the website
        crawl_data = await crawl_business(url)

        # Generate AI profile
        ai_profile = generate_ai_profile(crawl_data, user_input)

        # Update the agent record in a new DB session
        async with db_session_factory() as db:
            agent = await db.scalar(
                select(Agent).where(Agent.silk_id == silk_id)
            )
            if not agent:
                logger.warning(f"Agent {silk_id} not found for crawl update")
                return

            agent.crawl_data = crawl_data
            agent.ai_profile = ai_profile
            agent.faq_entries = ai_profile.get("faq_entries", [])
            agent.keywords = ai_profile.get("keywords_ranked", [])[:30]
            agent.last_crawled = datetime.now(timezone.utc)

            # Enrich with crawl data
            location = crawl_data.get("location", {})
            contact = crawl_data.get("contact", {})

            if location.get("city") and not agent.city:
                agent.city = location["city"][:100]
            if location.get("state") and not agent.state:
                agent.state = location["state"][:2]
            if contact.get("phone") and not agent.phone:
                agent.phone = contact["phone"][:20]
            if crawl_data.get("url"):
                agent.website_url = crawl_data["url"][:500]
            if crawl_data.get("logo_url"):
                agent.logo_url = crawl_data["logo_url"][:500]

            # Update description if crawl found a better one
            if crawl_data.get("business_name") and agent.name.startswith(("My ", "The ")):
                agent.name = crawl_data["business_name"][:128]

            await db.commit()
            logger.info(f"Background crawl completed for {silk_id}: {crawl_data.get('pages_crawled', 0)} pages")

            # Send indexing email to the business contact
            contact_email = agent.contact_email
            business_name = agent.name or crawl_data.get("business_name") or "Your Business"
            user_name = user_input.get("name") or business_name
            city = crawl_data.get("location", {}).get("city") or ""
            state = crawl_data.get("location", {}).get("state") or ""

            if contact_email:
                try:
                    await send_indexing_email(
                        to_email=contact_email,
                        user_name=user_name,
                        business_name=business_name,
                        crawl_data=crawl_data,
                        ai_profile=ai_profile,
                    )
                except Exception as email_err:
                    logger.warning(f"Indexing email failed for {silk_id}: {email_err}")

            # Notify admin of new business registration
            try:
                services_str = ", ".join(crawl_data.get("services", [])[:10])
                keywords_str = ", ".join(ai_profile.get("keywords_ranked", [])[:10])
                await send_admin_notification(
                    subject=f"New Business: {business_name} in {city}, {state}".rstrip(", "),
                    body=(
                        f"Business: {business_name}\n"
                        f"Website: {url}\n"
                        f"Industry: {crawl_data.get('industry', 'Unknown')}\n"
                        f"Services: {services_str or 'None detected'}\n"
                        f"Keywords: {keywords_str or 'None'}\n"
                        f"Pages crawled: {crawl_data.get('pages_crawled', 0)}\n"
                        f"Contact: {contact_email or 'N/A'}"
                    ),
                )
            except Exception as admin_err:
                logger.warning(f"Admin notification failed for {silk_id}: {admin_err}")

    except Exception as e:
        logger.error(f"Background crawl failed for {silk_id}: {e}", exc_info=True)


# ── Natural-language parsing helpers ──────────────────────────────────────────

# Industry tag keywords — maps trigger words to canonical tags
_INDUSTRY_TAGS: dict[str, list[str]] = {
    "legal": ["legal", "law", "attorney", "lawyer", "contract", "nda", "compliance", "litigation"],
    "medical": ["medical", "health", "doctor", "patient", "clinical", "diagnosis", "healthcare", "hipaa"],
    "finance": ["finance", "financial", "banking", "investment", "accounting", "tax", "invoice", "payment"],
    "real-estate": ["real estate", "property", "housing", "rental", "mortgage", "listing", "realty", "realtor"],
    "food": ["food", "restaurant", "bakery", "catering", "menu", "recipe", "chef", "kitchen", "dining"],
    "travel": ["travel", "hotel", "flight", "booking", "tourism", "vacation", "hospitality", "resort"],
    "education": ["education", "learning", "tutoring", "course", "curriculum", "student", "school", "university"],
    "ecommerce": ["ecommerce", "e-commerce", "shop", "store", "product", "inventory", "order", "cart", "woocommerce"],
    "marketing": ["marketing", "advertising", "seo", "social media", "campaign", "branding", "content"],
    "logistics": ["logistics", "shipping", "delivery", "warehouse", "supply chain", "freight", "courier"],
    "cybersecurity": ["cybersecurity", "security", "threat", "vulnerability", "firewall", "penetration", "malware"],
    "hr": ["hr", "human resources", "recruitment", "hiring", "payroll", "employee", "onboarding"],
    "insurance": ["insurance", "claims", "underwriting", "policy", "coverage", "premium"],
    "construction": ["construction", "building", "architecture", "contractor", "renovation", "blueprint"],
    "automotive": ["automotive", "car", "vehicle", "dealership", "auto", "fleet"],
    "manufacturing": ["manufacturing", "factory", "production", "assembly", "quality control", "bom"],
}

# Capability verb patterns — maps action verbs to capability names
_CAPABILITY_VERBS: dict[str, list[str]] = {
    "order-taking": ["takes orders", "take orders", "order taking", "accept orders", "process orders"],
    "menu-display": ["menu", "shows menu", "display menu", "menu questions"],
    "catering": ["catering", "cater"],
    "contract-review": ["review contracts", "contract review", "reviews contracts"],
    "nda-drafting": ["draft nda", "drafts nda", "nda drafting", "draft ndas", "drafts ndas"],
    "compliance-check": ["check compliance", "compliance check", "checks compliance", "compliance review"],
    "property-valuation": ["property valuation", "valuations", "appraisal", "appraising"],
    "market-analysis": ["market analysis", "market research", "analyze market", "analyzes market"],
    "roi-calculation": ["roi calculation", "roi calculations", "calculate roi", "calculates roi"],
    "booking": ["books", "booking", "reservations", "schedule", "appointment"],
    "search": ["finds", "searches", "looks up", "look up", "search"],
    "analysis": ["analyzes", "analyses", "analyze", "review", "reviews", "evaluate", "evaluates"],
    "content-creation": ["creates", "writes", "generates", "drafts", "composes"],
    "inquiry-handling": ["answers questions", "handles inquiries", "responds to", "customer support"],
    "product-search": ["product search", "find products", "browse products", "product catalog"],
    "order-tracking": ["track orders", "order tracking", "order status"],
    "inventory-check": ["inventory", "stock check", "availability"],
    "form-submission": ["form submission", "submit form", "contact form"],
    "event-booking": ["event booking", "book event", "register event"],
    "event-listing": ["event listing", "list events", "show events"],
}


def _slugify(text: str) -> str:
    """Convert text to a valid agent_id slug."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    # Ensure 3-64 chars
    if len(text) < 3:
        text = text + "-agent"
    return text[:64].rstrip("-")


def _parse_agent_text(text: str) -> dict:
    """Parse a natural-language description into structured agent fields.

    Returns a dict with keys: name, description, capabilities, endpoint, tags, agent_id
    """
    result: dict = {
        "name": None,
        "description": None,
        "capabilities": [],
        "endpoint": None,
        "tags": [],
        "agent_id": None,
    }

    # ── Extract agent name ────────────────────────────────────────────────
    name = None

    # Pattern: "called X", "named X" — capture until period, comma, or end
    m = re.search(r"(?:called|named)\s+[\"']?([A-Z][A-Za-z0-9 ']+?)(?:[\"']?[\.,]|\s+(?:It|it|My|my|The|the|that|which|and)\b|[\"']?\s*$)", text)
    if m:
        name = m.group(1).strip().rstrip(".")

    # Pattern: "Name: X"
    if not name:
        m = re.search(r"[Nn]ame:\s*[\"']?([A-Za-z0-9][A-Za-z0-9 ']+?)(?:[\"']?[\.,;]|[\"']?\s*$|\s+(?:It|it|My|my|The|the|that|which|and|endpoint|url|api)\b)", text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(".")

    # Pattern: quoted agent name near start
    if not name:
        m = re.search(r"[\"']([A-Z][A-Za-z0-9 ']+?)[\"']", text)
        if m:
            name = m.group(1).strip()

    if name:
        result["name"] = name
        result["agent_id"] = _slugify(name)

    # ── Extract endpoint URL ──────────────────────────────────────────────
    url_match = re.search(r"https?://[^\s,;\"'<>]+", text)
    if url_match:
        endpoint = url_match.group(0).rstrip(".")
        # Normalise: add https:// if it only has http
        result["endpoint"] = endpoint

    # Also check for bare domains like "api.example.com/v1"
    if not result["endpoint"]:
        bare = re.search(r"(?:endpoint|url|api)[:\s]+([a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:/[^\s,;\"']*)?)", text, re.IGNORECASE)
        if bare:
            result["endpoint"] = "https://" + bare.group(1).rstrip(".")

    # ── Extract capabilities ──────────────────────────────────────────────
    text_lower = text.lower()
    found_caps: list[str] = []
    for cap_id, phrases in _CAPABILITY_VERBS.items():
        for phrase in phrases:
            if phrase in text_lower:
                if cap_id not in found_caps:
                    found_caps.append(cap_id)
                break

    # If no specific capabilities found, extract verb phrases
    if not found_caps:
        # Look for "It can X, Y, and Z" or "It X, Y, and Z"
        verbs_match = re.search(r"(?:it |agent |tool |bot )?(?:can |will |does )?([a-z][\w\s,]+(?:and [\w\s]+)?)", text_lower)
        if verbs_match:
            raw = verbs_match.group(1)
            parts = re.split(r",\s*(?:and\s+)?|\s+and\s+", raw)
            for part in parts:
                part = part.strip()
                if len(part) > 2 and len(part) < 60:
                    slug = _slugify(part)
                    if slug and len(slug) >= 3:
                        found_caps.append(slug)

    if not found_caps:
        found_caps = ["general-purpose"]

    result["capabilities"] = found_caps[:20]  # Cap at 20

    # ── Extract tags ──────────────────────────────────────────────────────
    found_tags: list[str] = []
    for tag, keywords in _INDUSTRY_TAGS.items():
        for kw in keywords:
            if kw in text_lower:
                if tag not in found_tags:
                    found_tags.append(tag)
                break

    result["tags"] = found_tags[:10]

    # ── Build description ─────────────────────────────────────────────────
    # Use the full text, cleaned up, as the description (capped at 500 chars)
    desc = text.strip()
    # Remove the URL to keep description cleaner
    if result["endpoint"]:
        desc = desc.replace(result["endpoint"], "").strip()
    # Remove obvious prefixes
    desc = re.sub(r"^(?:register|add|create)\s+(?:my |an? |the )?(?:agent|tool|bot)\s*", "", desc, flags=re.IGNORECASE).strip()
    desc = re.sub(r"^(?:called|named)\s+\S+\s*[.,]?\s*", "", desc, flags=re.IGNORECASE).strip()
    if not desc or len(desc) < 10:
        desc = text.strip()
    result["description"] = desc[:500]

    # ── Fallback name from description ────────────────────────────────────
    if not result["name"]:
        # Use first few words
        words = desc.split()[:4]
        result["name"] = " ".join(words).title()
        result["agent_id"] = _slugify(result["name"])

    return result


@router.post(
    "/register-text",
    response_model=TextRegisteredResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register an agent using plain English",
)
async def register_agent_text(
    request: TextRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new agent by describing it in natural language.

    No JSON schemas, no forms — just describe your agent and we parse the rest.
    Returns silk_id, api_key, and a summary of what was registered.
    """
    parsed = _parse_agent_text(request.text)

    agent_id = parsed["agent_id"]
    if not agent_id or len(agent_id) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not determine an agent name from your description. "
                   "Try including something like: 'My agent is called [Name]'.",
        )

    # De-dup: append a short suffix if the agent_id already exists
    base_id = agent_id
    suffix = 0
    while True:
        existing = await db.scalar(select(Agent).where(Agent.agent_id == agent_id))
        if not existing:
            break
        suffix += 1
        agent_id = f"{base_id}-{suffix}"
        if suffix > 99:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Too many agents with ID '{base_id}'. Choose a different name.",
            )

    # Ensure endpoint uses https if provided
    endpoint = parsed["endpoint"]
    if endpoint and not endpoint.startswith("https://"):
        endpoint = endpoint.replace("http://", "https://", 1)
    if not endpoint:
        endpoint = "https://pending-setup.silkweb.io"

    # Generate credentials
    silk_id = generate_silk_id()
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)

    # Create agent record
    agent = Agent(
        silk_id=silk_id,
        agent_id=agent_id,
        name=parsed["name"],
        description=parsed["description"],
        version="1.0.0",
        endpoint=endpoint,
        api_key_hash=api_key_hash,
        protocols=["silkweb"],
        authentication={"type": "api_key"},
        pricing={"model": "free", "currency": "USD"},
        contact_email=request.contact_email,
        memory_bytes=0,
        metadata_={"registered_via": "text", "tags": parsed["tags"]},
    )

    # Compute initial tier
    tier_name, _ = compute_tier(agent)
    agent.tier = tier_name
    agent.silkweb_fee_pct = 0  # FREE until 1,000 agents

    db.add(agent)
    await db.flush()

    # Create capabilities from parsed verbs
    cap_names: list[str] = []
    for cap_id in parsed["capabilities"]:
        cap_name = cap_id.replace("-", " ").title()
        cap_names.append(cap_name)
        capability = Capability(
            agent_db_id=agent.id,
            capability_id=cap_id,
            name=cap_name,
            description=f"Auto-detected: {cap_name}",
            tags=parsed["tags"][:5],
        )
        db.add(capability)

    # Initialize trust score
    trust = TrustScore(
        silk_id=silk_id,
        agent_db_id=agent.id,
        overall_score=0.1,
        identity_score=0.1,
    )
    db.add(trust)

    logger.info(f"Agent registered via text: {agent_id} -> {silk_id}")

    # Store website URL on agent if parsed
    if parsed["endpoint"] and not parsed["endpoint"].startswith("https://pending"):
        agent.website_url = parsed["endpoint"][:500]

    # Trigger background crawl if URL was found in the registration text
    url_in_text = re.search(r"https?://[^\s,;\"'<>]+", request.text)
    if url_in_text:
        crawl_url = url_in_text.group(0).rstrip(".")
        user_input = {
            "name": parsed["name"],
            "description": parsed["description"],
            "services": [],
            "tags": parsed["tags"],
        }
        # Get the session factory from the db session's bind
        from api.db.session import async_session_factory
        asyncio.create_task(
            _background_crawl(silk_id, crawl_url, user_input, async_session_factory)
        )

    return TextRegisteredResponse(
        silk_id=silk_id,
        agent_id=agent_id,
        api_key=api_key,
        name=parsed["name"],
        description=parsed["description"],
        endpoint=endpoint,
        capabilities=cap_names,
        tags=parsed["tags"],
    )


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
