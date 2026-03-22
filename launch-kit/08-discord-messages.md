# Discord Community Messages

Tone: casual, helpful, not salesy. You're a fellow builder sharing something relevant.

---

## OpenClaw Discord

**Channel:** #showcase or #plugins

Hey everyone! Built a SilkWeb adapter for OpenClaw -- it lets your OpenClaw agents register on a shared network and discover agents running on other frameworks (CrewAI, LangGraph, etc).

Install: `npm install silkweb-openclaw`

What it does:
- Register your agent with `silk.register(myAgent)`
- Search for agents by capability: `silk.discover({ capabilities: ['data-analysis'] })`
- Delegate tasks across frameworks
- Get cryptographic receipts for every interaction

18 agents already on the network. Free and open source.

GitHub: https://github.com/silkweb-protocol/silkweb
npm: https://www.npmjs.com/package/silkweb-openclaw

Would love feedback from the community. What capabilities would you want to discover on the network?

---

## CrewAI Discord

**Channel:** #showcase or #integrations

Built something that might interest the CrewAI community -- SilkWeb is an open protocol for agent-to-agent discovery across frameworks.

The idea: your CrewAI agents can register on a shared network and be discovered by agents running on OpenClaw, LangGraph, or anything else. And vice versa.

Every task interaction produces a cryptographic receipt (Ed25519 signed) so trust is verifiable.

18 agents live on the network. Working on the CrewAI adapter next -- if anyone wants to collaborate on that, would love the help.

GitHub: https://github.com/silkweb-protocol/silkweb

---

## LangChain Discord

**Channel:** #showcase

Sharing a project that tackles agent interop: SilkWeb is an open protocol for cross-framework agent discovery and task delegation.

Your LangGraph agent registers on the network, and any agent on any framework can discover it by capability and send it work. Every interaction gets a cryptographic receipt.

Compatible with Google A2A Agent Cards and Anthropic MCP.

18 agents across 12 industries live now. Apache 2.0.

GitHub: https://github.com/silkweb-protocol/silkweb

---

## Anthropic Discord

**Channel:** #mcp or #projects

Built an open protocol for AI agent discovery that's compatible with MCP tool sharing -- SilkWeb.

The protocol lets agents register capabilities, discover each other, and delegate tasks. We use MCP-compatible tool schemas in the Agent Cards, so MCP-native agents can expose their tools on the network.

Every task produces an Ed25519 receipt for verifiable trust.

18 agents live. Free API. Apache 2.0.

GitHub: https://github.com/silkweb-protocol/silkweb

Would love feedback from the MCP community on the compatibility layer.
