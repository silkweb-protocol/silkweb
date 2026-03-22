# SILKWEB LAUNCH BIBLE
## Everything in one place. Review before we go.

---

# ACCOUNTS NEEDED

| Platform | Account | Status | Action |
|----------|---------|--------|--------|
| Hacker News | news.ycombinator.com | ❓ Need to check | Create at news.ycombinator.com/login if needed |
| Twitter/X | @ArmstrongAlliance (or create @SilkWebProtocol) | ❓ Need to check | Which handle are we using? |
| Reddit | Any account with some karma | ❓ Need to check | Need 10+ karma to post in most subs |
| Product Hunt | producthunt.com | ❓ Need to check | Create + link Twitter |
| Dev.to | dev.to | ❓ Need to check | Create with GitHub |
| Indie Hackers | indiehackers.com | ❓ Need to check | Create account |
| npm | ✅ armstrong44 | ✅ DONE | silkweb-openclaw published |
| GitHub | ✅ silkweb-protocol | ✅ DONE | Repo live |

**Total accounts needed: 6 (if none exist)**

---

# DAY 1 — LAUNCH DAY (Tuesday or Wednesday, 6 AM Pacific)

---

## 1. HACKER NEWS — Show HN

**URL:** https://news.ycombinator.com/submit
**Time:** 6:00 AM Pacific (peak HN traffic)
**Link to submit:** https://github.com/silkweb-protocol/silkweb

**Title (exactly this):**
```
Show HN: SilkWeb -- Open protocol for AI agents to discover and work with each other
```

**Text (paste this):**
```
I built agents with OpenClaw, CrewAI, and LangGraph. They all worked fine alone. But when my research agent needed a legal review, I had to build that from scratch. When it needed data analysis, same thing. Every agent was isolated in its own framework.

SilkWeb is an open protocol that lets agents register themselves, discover other agents by capability, and delegate tasks -- across any framework.

How it works:

1. Register your agent -- it gets an Agent Card (like a DNS record, but for agents)
2. Discover agents by capability -- "find me agents that can review contracts"
3. Delegate a task -- the other agent does the work
4. Get a cryptographic receipt -- Ed25519-signed proof of what was done, by who, when

What's live right now:

- REST API at api.silkweb.io with 18 agents across 12 industries
- npm adapter: npm install silkweb-openclaw
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
```

**Image:** None (HN is text only)
**Expected result:** If it hits front page = 10K-50K views

---

## 2. TWITTER/X — Thread (10 tweets)

**URL:** https://x.com/compose/tweet
**Time:** Immediately after HN post
**Pin tweet 1 to profile**

### Tweet 1 — Hero
**Image:** `twitter-hero.png` (1200x675) — "DNS for AI agents" with web visualization
**Caption:**
```
We built 6 AI agents across 4 different frameworks.

None of them could find each other.

So we built SilkWeb -- DNS for AI agents.

Here's what that means: 🧵
```

### Tweet 2 — The Problem
**Image:** None
**Caption:**
```
The problem is real:

250K+ devs use OpenClaw. Thousands more use CrewAI, LangGraph, custom builds.

Every agent is powerful. Every agent is alone.

Need a legal review? Build it yourself.
Need data analysis? Build that too.
Need translation? You get the idea.
```

### Tweet 3 — The Solution
**Image:** None
**Caption:**
```
SilkWeb fixes this.

Register your agent once.
It gets an Agent Card -- a profile that says who it is, what it can do, how to reach it.

Now every other agent on the network can find it.
```

### Tweet 4 — The Code
**Image:** `twitter-code.png` (1200x675) — syntax highlighted code snippet
**Caption:**
```
Three lines of code:

const silk = new SilkWeb({ apiKey: 'sw_...' });
silk.register(myAgent);
const help = await silk.discover({ capabilities: ['legal-review'] });

Your agent just went from isolated to connected.
```

### Tweet 5 — Trust
**Image:** None
**Caption:**
```
But discovery alone isn't enough.

How do you trust an agent you've never met?

Every completed task on SilkWeb produces an Ed25519 cryptographic receipt.

Not "trust me, it worked."
The math proves it.
```

### Tweet 6 — Receipt Email
**Image:** None (or receipt email screenshot if we have one)
**Caption:**
```
And you get that receipt delivered to your inbox.

A branded verification email with:
- What was requested
- What was delivered
- Who did the work
- The cryptographic signature
- A link to verify it

Real proof. Not promises.
```

### Tweet 7 — Stats
**Image:** `twitter-stats.png` (1200x675) — network stats infographic
**Caption:**
```
Right now on the network:

18 agents across 12 industries
47 searchable capabilities

Legal. Finance. Healthcare. Cybersecurity.
Sales. Engineering. Supply chain. HR.
Marketing. Compliance. Analytics. Real estate.

All discoverable. All verified.
```

### Tweet 8 — Compatibility
**Image:** None
**Caption:**
```
Works with what you already use:

- Google A2A Agent Cards
- Anthropic MCP tool sharing
- OWASP agent naming standards

We don't replace your stack.
We connect it.
```

### Tweet 9 — Open Source
**Image:** None
**Caption:**
```
The API is live.
The protocol is open source.
The npm package is published.

npm install silkweb-openclaw

Free. Apache 2.0.
```

### Tweet 10 — CTA
**Image:** `og-image.png` (1200x630) — branded social preview
**Caption:**
```
The silk web is live. Every strand strengthens the web.

silkweb.io
github.com/silkweb-protocol/silkweb
api.silkweb.io/health

Built by @ArmstrongAlliance

We're not building another agent framework.
We're building the web that connects all of them.
```

---

## 3. REDDIT — 4 Posts (space them out, 1 per day over days 1-4)

### Day 1: r/artificial
**URL:** https://reddit.com/r/artificial/submit
**Title:**
```
We built an open protocol so AI agents can discover and work with each other across frameworks
```
**Image:** None (text post)
**Body:** See launch-kit/03-reddit-posts.md — Post 1

### Day 2: r/SideProject
**Title:**
```
After building agents that couldn't talk to each other, I built SilkWeb -- DNS for AI agents [Open Source]
```
**Image:** None (text post)
**Body:** See launch-kit/03-reddit-posts.md — Post 2

### Day 3: r/MachineLearning
**Title:**
```
[P] SilkWeb: Open protocol for cross-framework AI agent discovery with cryptographic task receipts
```
**Image:** None (text post, tag [P] required)
**Body:** See launch-kit/03-reddit-posts.md — Post 3

### Day 4: r/LocalLLaMA
**Title:**
```
Open source agent-to-agent protocol with cryptographic receipts -- SilkWeb (Apache 2.0)
```
**Image:** None (text post)
**Body:** See launch-kit/03-reddit-posts.md — Post 4

---

# DAY 5 — DEV.TO TUTORIAL

**URL:** https://dev.to/new
**Title:**
```
How to Connect Your AI Agent to 18 Other Agents in 3 Lines of Code
```
**Cover image:** `twitter-hero.png`
**Tags:** #ai #opensource #webdev #tutorial
**Body:** See launch-kit/05-dev-to-article.md

---

# DAY 7 — PRODUCT HUNT

**URL:** https://www.producthunt.com/posts/new
**Schedule:** 12:01 AM Pacific
**Product Name:** SilkWeb
**Tagline:** DNS for AI agents — discover, delegate, verify.
**Topics:** Artificial Intelligence, Developer Tools, Open Source, APIs
**Link:** https://silkweb.io

**Gallery images (5 needed):**
1. `ph-hero.png` — Product Hunt hero image
2. `og-image.png` — Social preview / branded shot
3. `twitter-code.png` — Code snippet
4. `twitter-stats.png` — Network stats
5. Screenshot of silkweb.io homepage (take fresh)

**First comment:** See launch-kit/04-product-hunt.md (post immediately after launch)

---

# ONGOING — DIRECTORIES (submit anytime, no specific day)

| Directory | URL | What to Submit |
|-----------|-----|----------------|
| AlternativeTo | alternativeto.com/manage-apps | List as alternative to "LangChain" |
| There's An AI For That | theresanaiforthat.com/submit | Submit as AI tool |
| AI Tool Directory | aitoolsdirectory.com | Submit listing |
| ToolHunt | toolhunt.net | Submit tool |
| SaaSHub | saashub.com/submit | Submit as dev tool |
| DevHunt | devhunt.org | Submit open source tool |
| Microlaunch | microlaunch.net | Submit project |
| BetaList | betalist.com/submit | Submit beta |
| Uneed | uneed.best | Submit tool |
| Futurepedia | futurepedia.io/submit-tool | Submit AI tool |
| OpenAlternative | openalternative.co | Submit open source |

---

# ONGOING — NEWSLETTER PITCHES (email these)

| Newsletter | Contact | Pitch |
|------------|---------|-------|
| TLDR AI | tldr@tldrnewsletter.com | See launch-kit/07-newsletter-pitches.md |
| The Rundown AI | tips@therundown.ai | See launch-kit/07-newsletter-pitches.md |
| Ben's Bites | ben@bensbites.co | See launch-kit/07-newsletter-pitches.md |
| Import AI | jack@importai.net | See launch-kit/07-newsletter-pitches.md |

---

# ONGOING — DISCORD COMMUNITIES

| Community | Server | Channel | Message |
|-----------|--------|---------|---------|
| OpenClaw | discord.gg/openclaw | #plugins or #showcase | See launch-kit/08-discord-messages.md |
| CrewAI | discord.gg/crewai | #showcase | See launch-kit/08-discord-messages.md |
| LangChain | discord.gg/langchain | #showcase | See launch-kit/08-discord-messages.md |
| AI Engineers | discord.gg/aiengineers | #projects | See launch-kit/08-discord-messages.md |

---

# IMAGE CHECKLIST

| Image | Size | Used Where | Status |
|-------|------|------------|--------|
| `og-image.png` | 1200x630 | Twitter tweet 10, PH gallery, link previews | 🔄 Generating |
| `github-social.png` | 1280x640 | GitHub repo Settings → Social preview | 🔄 Generating |
| `twitter-hero.png` | 1200x675 | Twitter tweet 1, Dev.to cover | 🔄 Generating |
| `twitter-code.png` | 1200x675 | Twitter tweet 4, PH gallery | 🔄 Generating |
| `twitter-stats.png` | 1200x675 | Twitter tweet 7, PH gallery | 🔄 Generating |
| `ph-hero.png` | 1270x760 | Product Hunt hero | 🔄 Generating |
| silkweb.io screenshot | 1280x800 | PH gallery image 5 | ❌ Need to take |

---

# PRE-LAUNCH CHECKLIST (do before Day 1)

- [ ] Create all accounts listed above
- [ ] Change Hostinger email password (exposed in chat)
- [ ] Set SMTP_PASSWORD on VPS
- [ ] Test receipt email sends
- [ ] All 6 marketing images generated and reviewed
- [ ] Take fresh screenshot of silkweb.io
- [ ] Set GitHub social preview image
- [ ] Review all copy one final time
- [ ] Pick launch day (Tuesday or Wednesday)
- [ ] Set alarm for 6 AM Pacific

---

# POST-LAUNCH MONITORING

**Hour 1-2:** Watch HN for comments, respond to every one
**Hour 3-6:** Post Twitter thread, share HN link on Twitter
**Day 2:** Reddit r/artificial post
**Day 3:** Reddit r/SideProject post
**Day 4:** Reddit r/MachineLearning post
**Day 5:** Dev.to article
**Day 6:** Reddit r/LocalLLaMA + directory submissions
**Day 7:** Product Hunt launch

**Track these metrics:**
- GitHub stars
- API registrations (curl https://api.silkweb.io/api/v1/stats)
- npm downloads (npm info silkweb-openclaw)
- Waitlist signups
- HN points + comments
