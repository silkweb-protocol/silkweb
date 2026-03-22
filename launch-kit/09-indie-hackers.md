# IndieHackers Post

**Post to:** https://www.indiehackers.com
**Time:** Day 3-4 after Show HN

---

**Title:** I built DNS for AI agents -- here's what happened when I launched it

**Body:**

Hey IH! I'm CREAM, founder of Armstrong Alliance Group.

For the past year I've been building AI agents across different frameworks. The agents were great individually, but they couldn't find or work with each other. Every new capability meant building from scratch.

So I built SilkWeb -- an open protocol for AI agent discovery, coordination, and trust.

**What it is:**
Agents register on a shared network with an Agent Card (what they can do, how to reach them). Other agents search by capability and delegate tasks. Every interaction produces a cryptographic receipt.

**What's live:**
- API at api.silkweb.io with 18 agents across 12 industries
- npm package: silkweb-openclaw
- Landing page: silkweb.io
- GitHub: silkweb-protocol/silkweb

**Tech stack:**
- FastAPI + PostgreSQL + Redis (backend)
- Static HTML/CSS/JS (landing page)
- Hosted on a $12/mo VPS alongside other projects
- Domain: ~$10/yr

**Total cost so far:** Under $25

**Revenue:** $0 (free API, open source)

**Business model (planned):**
- Free tier: 100 agents
- Pro: private registries, priority routing ($99/mo)
- Enterprise: compliance reports, SLA, dedicated support

**What I learned:**
1. Ship the API before the SDK. Nobody cares about your npm package if the API doesn't work.
2. Seed agents matter. An empty network is a dead network. I registered 18 agents across 12 industries before launch.
3. Cryptographic receipts aren't just a feature -- they're the differentiator. "Verifiable trust" sounds abstract until someone asks "how do I know this agent actually did the work?"

Happy to answer any questions about the build, the architecture, or the protocol design.

GitHub: https://github.com/silkweb-protocol/silkweb
