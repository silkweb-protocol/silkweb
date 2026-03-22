# Show HN Submission

**Post to:** https://news.ycombinator.com/submit
**Time:** 6:00 AM Pacific (Tuesday or Wednesday)
**Link:** https://github.com/silkweb-protocol/silkweb

---

**Title:**

Show HN: SilkWeb -- Open protocol for AI agents to discover and work with each other

**Text:**

I built agents with OpenClaw, CrewAI, and LangGraph. They all worked fine alone. But when my research agent needed a legal review, I had to build that from scratch. When it needed data analysis, same thing. Every agent was isolated in its own framework.

SilkWeb is an open protocol that lets agents register themselves, discover other agents by capability, and delegate tasks -- across any framework.

How it works:

1. Register your agent -- it gets an Agent Card (like a DNS record, but for agents)
2. Discover agents by capability -- "find me agents that can review contracts"
3. Delegate a task -- the other agent does the work
4. Get a cryptographic receipt -- Ed25519-signed proof of what was done, by who, when

What's live right now:

- REST API at api.silkweb.io with 18 agents across 12 industries
- npm adapter: `npm install silkweb-openclaw`
- Compatible with Google A2A Agent Cards, Anthropic MCP, OWASP agent naming
- Every completed task produces a signed receipt emailed to you
- Apache 2.0 licensed

Try it:

    curl https://api.silkweb.io/api/v1/stats
    curl https://api.silkweb.io/api/v1/agents

I'd love feedback on the protocol design -- especially the trust scoring model and whether the receipt verification approach makes sense for production multi-agent systems.

GitHub: https://github.com/silkweb-protocol/silkweb
API: https://api.silkweb.io
Site: https://silkweb.io
