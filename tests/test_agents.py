"""Tests for agent registration and retrieval."""

import pytest
import pytest_asyncio
from httpx import AsyncClient


VALID_AGENT = {
    "agent_id": "test-research-agent",
    "name": "Test Research Agent",
    "description": "A test agent for research and analysis tasks",
    "version": "1.0.0",
    "endpoint": "https://test-agent.example.com/silk",
    "capabilities": [
        {
            "id": "research",
            "name": "Research",
            "description": "Deep research on any topic",
            "tags": ["analysis", "web-search"],
        }
    ],
}


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint should always return 200."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_register_agent(client: AsyncClient):
    """Should register a new agent and return silk_id + api_key."""
    response = await client.post("/api/v1/agents", json=VALID_AGENT)
    assert response.status_code == 201
    data = response.json()
    assert data["silk_id"].startswith("sw_")
    assert data["api_key"].startswith("sw_live_")
    assert data["agent_id"] == "test-research-agent"


@pytest.mark.asyncio
async def test_register_duplicate_agent_id(client: AsyncClient):
    """Should reject duplicate agent_id."""
    await client.post("/api/v1/agents", json=VALID_AGENT)
    response = await client.post("/api/v1/agents", json=VALID_AGENT)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_agent_id(client: AsyncClient):
    """Should reject invalid agent_id format."""
    invalid = {**VALID_AGENT, "agent_id": "INVALID_ID!"}
    response = await client.post("/api/v1/agents", json=invalid)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_http_endpoint_rejected(client: AsyncClient):
    """Should reject non-HTTPS endpoints."""
    invalid = {**VALID_AGENT, "agent_id": "http-agent", "endpoint": "http://insecure.com/silk"}
    response = await client.post("/api/v1/agents", json=invalid)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_no_capabilities(client: AsyncClient):
    """Should reject agent with no capabilities."""
    invalid = {**VALID_AGENT, "agent_id": "no-caps", "capabilities": []}
    response = await client.post("/api/v1/agents", json=invalid)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_agent(client: AsyncClient):
    """Should retrieve a registered agent by silk_id."""
    reg = await client.post("/api/v1/agents", json=VALID_AGENT)
    silk_id = reg.json()["silk_id"]

    response = await client.get(f"/api/v1/agents/{silk_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["agent_id"] == "test-research-agent"
    assert data["name"] == "Test Research Agent"
    assert len(data["capabilities"]) == 1
    # API key hash should NEVER be in the response
    assert "api_key_hash" not in data
    assert "api_key" not in data


@pytest.mark.asyncio
async def test_get_nonexistent_agent(client: AsyncClient):
    """Should return 404 for unknown silk_id."""
    response = await client.get("/api/v1/agents/sw_doesnotexist")
    assert response.status_code == 404
