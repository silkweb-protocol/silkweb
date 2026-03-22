"""Shared dependencies — auth, database, rate limiting.

All protected endpoints use get_current_agent to authenticate.
"""

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.models.agent import Agent
from api.services.auth import verify_api_key

# HTTPBearer extracts the token from "Authorization: Bearer <token>"
security_scheme = HTTPBearer(
    scheme_name="API Key",
    description="SilkWeb API key (sw_live_...)",
    auto_error=True,
)


async def get_current_agent(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    """Authenticate request via API key. Returns the agent or raises 401.

    Security:
    - Validates Bearer token format
    - Checks API key prefix
    - Verifies against Argon2 hash (constant-time)
    - Rejects inactive/deregistered agents
    """
    api_key = credentials.credentials

    # Validate prefix
    if not api_key.startswith("sw_live_") and not api_key.startswith("sw_test_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Find all active agents and check key against each hash
    # In production with many agents, this should use a key lookup table
    # For now, we query active agents and verify
    result = await db.execute(
        select(Agent).where(Agent.is_active.is_(True))
    )
    agents = result.scalars().all()

    for agent in agents:
        if verify_api_key(api_key, agent.api_key_hash):
            return agent

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired API key.",
        headers={"WWW-Authenticate": "Bearer"},
    )
