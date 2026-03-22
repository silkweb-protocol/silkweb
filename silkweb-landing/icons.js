/**
 * SilkWeb Icon System
 *
 * Minimalist, single-color stroke-based SVG icons.
 * 24x24 viewBox, using currentColor for inheritance.
 * Designed for dark theme (#0a0a0f bg, #6366f1/#818cf8 purple, #10B981 green, #c0c8e0 muted).
 *
 * Usage:
 *   element.innerHTML = SilkIcons.search;
 *   // or inline: `${SilkIcons.search}`
 *
 * All icons are stroke-based (stroke-width="1.5" or "2"), no fills,
 * stroke-linecap="round" stroke-linejoin="round" for consistency.
 */

const SilkIcons = {

  // ═══════════════════════════════════════════
  // PROBLEM SECTION
  // ═══════════════════════════════════════════

  // No Discovery (magnifying glass with question mark)
  // Replaces: &#x1F50D; on problem card
  noDiscovery: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10.5" cy="10.5" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
    <path d="M10.5 7.5v0m0 3v3"/>
    <circle cx="10.5" cy="7.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>`,

  // No Trust (unlocked padlock)
  // Replaces: &#x1F512; on problem card
  noTrust: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 017.83-1"/>
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
  </svg>`,

  // No Interop (broken chain link)
  // Replaces: &#x1F517; on problem card
  noInterop: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    <path d="M18 6l2-2M4 20l2-2"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // FEATURE SECTION
  // ═══════════════════════════════════════════

  // Agent Registry (web/network node)
  // Replaces: &#x1F578; (spider web)
  registry: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="2"/>
    <circle cx="4" cy="6" r="1.5"/>
    <circle cx="20" cy="6" r="1.5"/>
    <circle cx="4" cy="18" r="1.5"/>
    <circle cx="20" cy="18" r="1.5"/>
    <path d="M5.5 7l4.5 3.5M14 8.5l4.5-1.5M5.5 17l4.5-3.5M14 15.5l4.5 1.5"/>
  </svg>`,

  // Smart Discovery (search with sparkle)
  // Replaces: &#x1F50D;
  discovery: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
    <path d="M10 7v6M7 10h6"/>
  </svg>`,

  // Trust Scores (shield with checkmark)
  // Replaces: &#x1F6E1;
  trustScore: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>`,

  // Cryptographic Receipts (document with signature/pen)
  // Replaces: &#x1F58B;
  receipt: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 15l2 2 4-4"/>
  </svg>`,

  // Platform Adapters (plug/connector)
  // Replaces: &#x1F50C;
  adapter: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22v-5"/>
    <path d="M9 8V2M15 8V2"/>
    <path d="M18 8H6a2 2 0 00-2 2v2a6 6 0 006 6h4a6 6 0 006-6v-2a2 2 0 00-2-2z"/>
  </svg>`,

  // Developer-First (lightning bolt)
  // Replaces: &#x26A1;
  bolt: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // PROTOCOL COMPATIBILITY SECTION
  // ═══════════════════════════════════════════

  // Google A2A (diamond/rhombus shape)
  // Replaces: 🔷
  a2a: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5.5" y="5.5" width="13" height="13" rx="2" transform="rotate(45 12 12)"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>`,

  // Anthropic MCP (circle with inner connections)
  // Replaces: 🟣
  mcp: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="8" r="1.5"/>
    <circle cx="8.5" cy="15" r="1.5"/>
    <circle cx="15.5" cy="15" r="1.5"/>
    <path d="M12 9.5v1.5l-2.5 2.5M12 11l2.5 2.5"/>
  </svg>`,

  // OWASP AgentNaming (shield with lines)
  // Replaces: 🛡️
  shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/>
    <path d="M8 12h8M8 15h5"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // INTEGRATION SECTION
  // ═══════════════════════════════════════════

  // OpenClaw (tentacle/claw shape)
  // Replaces: 🦑
  openclaw: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="5"/>
    <path d="M7 12c-1 3-2 6 0 8"/>
    <path d="M10 13c0 3-.5 6 1 7"/>
    <path d="M14 13c0 3 .5 6-1 7"/>
    <path d="M17 12c1 3 2 6 0 8"/>
  </svg>`,

  // CrewAI (rocket)
  // Replaces: 🚀
  rocket: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>
    <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11.95A22 22 0 0112 15z"/>
    <path d="M9 12H4s.55-3.03 2-4.5M12 15v5s3.03-.55 4.5-2"/>
  </svg>`,

  // LangGraph (graph nodes connected)
  // Replaces: 🔗
  graph: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="6" r="3"/>
    <circle cx="18" cy="12" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M8.7 7.5L15.3 11M8.7 16.5l6.6-3.5"/>
  </svg>`,

  // Autogen (robot head)
  // Replaces: 🤖
  robot: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="8" width="16" height="12" rx="2"/>
    <path d="M12 8V4"/>
    <circle cx="12" cy="3" r="1"/>
    <circle cx="9" cy="14" r="1.5"/>
    <circle cx="15" cy="14" r="1.5"/>
    <path d="M2 13v2M22 13v2"/>
  </svg>`,

  // REST API (lightning bolt - reuses bolt concept but with terminal style)
  // Replaces: ⚡ in integrations
  api: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"/>
    <line x1="12" y1="19" x2="20" y2="19"/>
  </svg>`,

  // Python SDK (snake-inspired curvy path)
  // Replaces: 🐍
  python: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2C6.5 2 6 4.5 6 6v3h6v1H5c-2 0-4 1.5-4 5s1.5 5 3.5 5H7v-3.5C7 14 8.5 12 11 12h5c2 0 3-1.5 3-3V6c0-2-1.5-4-7-4z"/>
    <circle cx="9" cy="5.5" r="0.75" fill="currentColor" stroke="none"/>
    <path d="M12 22c5.5 0 6-2.5 6-4v-3h-6v-1h7c2 0 4-1.5 4-5s-1.5-5-3.5-5H17v3.5c0 2.5-1.5 4.5-4 4.5h-5c-2 0-3 1.5-3 3v3c0 2 1.5 4 7 4z"/>
    <circle cx="15" cy="18.5" r="0.75" fill="currentColor" stroke="none"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // PACKAGE / DOWNLOAD STATS
  // ═══════════════════════════════════════════

  // Package/download (box with arrow)
  // Replaces: 📦
  package: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`,

  // Star
  // Replaces: ⭐
  star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>`,

  // Copy/clipboard
  // Replaces: 📋
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>`,

  // Checkmark (for copy success state)
  // Replaces: copied state
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // EDUCATION / ANALOGY SECTION
  // ═══════════════════════════════════════════

  // Email/receipt ticket
  // Replaces: 📧
  email: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="22 4 12 13 2 4"/>
  </svg>`,

  // Lightbulb (DNS analogy)
  // Replaces: 💡
  lightbulb: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18h6M10 22h4"/>
    <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // FOOTER / NAV
  // ═══════════════════════════════════════════

  // GitHub (already exists in page but included for completeness)
  github: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>`,

  // Arrow right (hero CTA button - already inline but included)
  arrowRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>`,

  // External link
  externalLink: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,

  // Document/spec
  document: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>`,

  // Security/lock
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>`,

  // Schema/code brackets
  schema: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // ARCHITECTURE SECTION
  // ═══════════════════════════════════════════

  // Down arrow (arch layers)
  arrowDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>`,


  // ═══════════════════════════════════════════
  // HOW IT WORKS SECTION (supplementary)
  // ═══════════════════════════════════════════

  // Register (user plus)
  register: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>`,

  // Discover (compass)
  compass: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>`,

  // Execute tasks (play/run)
  execute: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
  </svg>`,

  // Build trust (trending up)
  trending: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>`,
};


// ═══════════════════════════════════════════
// REPLACEMENT MAP
// Maps each emoji location to its icon key
// ═══════════════════════════════════════════

/**
 * Quick reference for replacing emojis in index.html:
 *
 * PROBLEM CARDS (.problem-icon):
 *   &#x1F50D;  (magnifier)    -> SilkIcons.noDiscovery
 *   &#x1F512;  (lock)         -> SilkIcons.noTrust
 *   &#x1F517;  (chain)        -> SilkIcons.noInterop
 *
 * COMPAT CARDS (.compat-logo):
 *   🔷  (blue diamond)        -> SilkIcons.a2a
 *   🟣  (purple circle)       -> SilkIcons.mcp
 *   🛡️  (shield)              -> SilkIcons.shield
 *
 * FEATURE CARDS (.feature-icon):
 *   &#x1F578;  (spider web)   -> SilkIcons.registry
 *   &#x1F50D;  (magnifier)    -> SilkIcons.discovery
 *   &#x1F6E1;  (shield)       -> SilkIcons.trustScore
 *   &#x1F58B;  (pen)          -> SilkIcons.receipt
 *   &#x1F50C;  (plug)         -> SilkIcons.adapter
 *   &#x26A1;   (lightning)    -> SilkIcons.bolt
 *
 * INTEGRATION CARDS (.integration-logo):
 *   🦑  (squid)               -> SilkIcons.openclaw
 *   🚀  (rocket)              -> SilkIcons.rocket
 *   🔗  (link)                -> SilkIcons.graph
 *   🤖  (robot)               -> SilkIcons.robot
 *   ⚡  (lightning)            -> SilkIcons.api
 *   🐍  (snake)               -> SilkIcons.python
 *
 * COPY BUTTONS (.copy-btn):
 *   📋  (clipboard)           -> SilkIcons.copy  (default state)
 *                              -> SilkIcons.check (copied state)
 *
 * PACKAGE STATS (.package-stat):
 *   📦  (package)             -> SilkIcons.package
 *   ⭐  (star)                -> SilkIcons.star
 *
 * EDUCATION ANALOGY:
 *   📧  (email)               -> SilkIcons.email
 *   💡  (lightbulb)           -> SilkIcons.lightbulb
 *
 * ARCHITECTURE ARROWS:
 *   ↓   (text arrow)          -> SilkIcons.arrowDown
 *
 * FOOTER LINKS (optional enhancement):
 *   GitHub                    -> SilkIcons.github
 *   Protocol Spec             -> SilkIcons.document
 *   API Docs                  -> SilkIcons.document
 *   Agent Card Schema         -> SilkIcons.schema
 *   Security                  -> SilkIcons.lock
 */


// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SilkIcons;
}
