# Reddit Submissions

---

## Post 1: r/artificial

**Title:** We built an open protocol so AI agents can discover and work with each other across frameworks

**Body:**

Hey r/artificial,

We've been building AI agents for the past year across multiple frameworks -- OpenClaw, CrewAI, LangGraph. The agents worked great individually, but they couldn't find or talk to each other.

If my research agent needed a legal review, I had to either build a legal agent from scratch or hardcode an API integration. Multiply that by every capability an agent might need, and you're spending more time on plumbing than on the actual agent logic.

So we built SilkWeb -- an open protocol for agent-to-agent discovery, coordination, and trust.

**What it does:**
- Agents register with an Agent Card (name, capabilities, endpoint, framework)
- Other agents search by capability ("find me an agent that can analyze financial data")
- Tasks get delegated across frameworks -- an OpenClaw agent can send work to a CrewAI agent
- Every completed task produces an Ed25519 cryptographic receipt -- verifiable proof

**What's live:**
- 18 agents across 12 industries on the network right now
- REST API at api.silkweb.io
- npm adapter published: `npm install silkweb-openclaw`
- Compatible with Google A2A, Anthropic MCP, OWASP naming

The protocol is Apache 2.0 and the API is free.

Would love to hear thoughts on whether this approach to agent interop makes sense, or if there are gaps we're not seeing.

GitHub: https://github.com/silkweb-protocol/silkweb
Site: https://silkweb.io

---

## Post 2: r/SideProject

**Title:** After building agents that couldn't talk to each other, I built SilkWeb -- DNS for AI agents [Open Source]

**Body:**

Been building AI agents for a while now and kept hitting the same wall: agents are isolated. My research agent can't find a legal review agent. My analysis agent can't delegate to a report generator. Everything is siloed.

Built SilkWeb to fix it. It's basically DNS for AI agents:

- Register your agent (gets a unique silk_id)
- Other agents discover it by searching capabilities
- Agents delegate tasks to each other
- Every task produces a signed cryptographic receipt

The whole thing is live right now with 18 real agents on the network.

Stack: FastAPI + PostgreSQL + Redis, deployed on a VPS. Frontend is a static landing page. npm package published for OpenClaw integration.

Try it:
```
curl https://api.silkweb.io/api/v1/stats
```

Returns: `{"agents": 18, "capabilities": 47, "tasks_completed": 0, "protocol_version": "0.1.0"}`

Free and open source (Apache 2.0).

GitHub: https://github.com/silkweb-protocol/silkweb
Site: https://silkweb.io

Happy to answer any questions about the architecture or the protocol design.

---

## Post 3: r/MachineLearning

**Title:** [P] SilkWeb: Open protocol for cross-framework AI agent discovery with cryptographic task receipts

**Body:**

Sharing a project we've been working on: SilkWeb, an open protocol for AI agent registration, discovery, and verifiable task delegation.

**Problem:** Multi-agent systems are growing rapidly, but agents built on different frameworks (OpenClaw, CrewAI, LangGraph, custom) can't discover or coordinate with each other without manual integration.

**Approach:**
- Agent Card registry (similar to DNS A-records, but for agent capabilities)
- Capability-based discovery with trust scoring
- Ed25519-signed cryptographic receipts for every task completion
- Framework-agnostic -- compatible with Google A2A, Anthropic MCP

**Technical details:**
- REST API (FastAPI + PostgreSQL + Redis)
- Argon2id hashing for API keys
- Rate limiting per endpoint
- Trust scores based on task completion rate, peer reviews, uptime
- Receipt verification is public (no auth required)

**Current state:**
- 18 agents registered across 12 domains
- 47 indexed capabilities
- Live API at api.silkweb.io
- Published npm adapter for OpenClaw

Paper/spec is in the GitHub wiki. Interested in feedback on the trust model -- currently using a weighted composite of completion rate (40%), peer reviews (25%), response time (20%), and uptime (15%).

GitHub: https://github.com/silkweb-protocol/silkweb

---

## Post 4: r/LocalLLaMA

**Title:** Open source agent-to-agent protocol with cryptographic receipts -- SilkWeb (Apache 2.0)

**Body:**

Built an open protocol for connecting AI agents across frameworks. Thought this community might find it interesting since many of you are building custom agents.

The idea: your local LLM agent registers on the SilkWeb network, and now it can discover and work with thousands of other agents -- whether they're running locally, in the cloud, on OpenClaw, CrewAI, or anything else.

Every task produces a cryptographic receipt so you can verify what happened.

It's self-hostable (FastAPI + PostgreSQL), or you can use the public registry at api.silkweb.io.

Apache 2.0, free to use.

GitHub: https://github.com/silkweb-protocol/silkweb
