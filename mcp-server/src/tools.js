// ─────────────────────────────────────────────
// SilkWeb MCP Server — Tool Definitions
// All 9 agents exposed as MCP tools with JSON Schema inputs
// ─────────────────────────────────────────────

const AGENTS = {
  aegis: {
    id: 'aegis-security',
    name: 'AEGIS',
    emoji: '\u{1F6E1}\uFE0F',
    tagline: 'Cybersecurity Threat Intelligence',
    description: 'URL security scanning, SSL certificate audit, domain DNS security, full security assessment',
    port: 3003,
    pathPrefix: '',
  },
  navigator: {
    id: 'navigator-logistics',
    name: 'NAVIGATOR',
    emoji: '\u{1F30D}',
    tagline: 'Global Logistics & Route Intelligence',
    description: 'Optimal shipping routes, customs documentation, carbon footprint estimation, multi-modal transport comparison',
    port: 3004,
    pathPrefix: '',
  },
  sentinel: {
    id: 'sentinel-ops',
    name: 'SENTINEL',
    emoji: '\u{1F4E1}',
    tagline: 'IT Infrastructure Monitoring',
    description: 'Website/API health checks, DNS propagation, SSL expiry tracking, log analysis, incident classification',
    port: 3005,
    pathPrefix: '',
  },
  oracle: {
    id: 'oracle-finance',
    name: 'ORACLE',
    emoji: '\u{1F4CA}',
    tagline: 'Financial Intelligence & Analysis',
    description: 'Company financial health (15+ ratios), partnership risk scoring, Benford\'s Law fraud detection, regulatory compliance',
    port: 3006,
    pathPrefix: '',
  },
  atlas: {
    id: 'atlas-geospatial',
    name: 'ATLAS',
    emoji: '\u{1F5FA}\uFE0F',
    tagline: 'Geospatial Intelligence',
    description: 'Haversine/Vincenty distance, bearing, geofencing, sunrise/sunset, multi-waypoint route analysis',
    port: 3007,
    pathPrefix: '',
  },
  design: {
    id: 'design-agent',
    name: 'DESIGN AGENT',
    emoji: '\u{1F3A8}',
    tagline: 'Image Generation Service',
    description: 'Social media cards, code snippet screenshots, hero/banner images, infographics, generative art',
    port: 3002,
    pathPrefix: '',
  },
  justice: {
    id: 'justice-legal',
    name: 'JUSTICE',
    emoji: '\u2696\uFE0F',
    tagline: 'Contract & General Law',
    description: 'Contract analysis for risks and key clauses, NDA review, statute research, clause drafting from templates',
    port: 3008,
    pathPrefix: '',
  },
  shield: {
    id: 'shield-injury',
    name: 'SHIELD',
    emoji: '\u{1F6E1}\uFE0F',
    tagline: 'Personal Injury Attorney',
    description: 'Case evaluation, economic/non-economic damage calculation, statute of limitations checking, insurance analysis',
    port: 3009,
    pathPrefix: '',
  },
  fortress: {
    id: 'fortress-defense',
    name: 'FORTRESS',
    emoji: '\u{1F3F0}',
    tagline: 'Criminal Defense Intelligence',
    description: 'Criminal charge analysis with elements and penalties, constitutional rights by situation, evidence suppression arguments',
    port: 3010,
    pathPrefix: '',
  },
};

// ─── Tool Definitions ───────────────────────

const tools = [
  // ───────────────────────────────────────────
  // META: List Agents
  // ───────────────────────────────────────────
  {
    name: 'silkweb_list_agents',
    description: 'List all 9 SilkWeb agents with descriptions and available tools. Start here to discover what SilkWeb can do.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    agent: null,
    endpoint: null,
    method: 'LIST',
  },

  // ───────────────────────────────────────────
  // AEGIS — Cybersecurity
  // ───────────────────────────────────────────
  {
    name: 'silkweb_aegis_scan_url',
    description: 'Scan a URL for security vulnerabilities, header misconfigurations, and threat indicators. Returns security headers analysis, threat signatures detected, and a risk score.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to scan (e.g., "https://example.com")',
        },
      },
      required: ['url'],
    },
    agent: 'aegis',
    endpoint: '/scan/url',
    method: 'POST',
  },
  {
    name: 'silkweb_aegis_scan_ssl',
    description: 'Check SSL/TLS certificate validity, configuration, protocol version, cipher suites, and certificate chain for a domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to check SSL certificate (e.g., "example.com")',
        },
      },
      required: ['domain'],
    },
    agent: 'aegis',
    endpoint: '/scan/ssl',
    method: 'POST',
  },
  {
    name: 'silkweb_aegis_scan_domain',
    description: 'Check domain DNS security records including SPF, DMARC, and DKIM configuration. Identifies email spoofing vulnerabilities.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to check DNS security (e.g., "example.com")',
        },
      },
      required: ['domain'],
    },
    agent: 'aegis',
    endpoint: '/scan/domain',
    method: 'POST',
  },
  {
    name: 'silkweb_aegis_report',
    description: 'Generate a comprehensive security assessment report for a target. Combines URL scanning, SSL audit, and domain reputation into a single report with risk score.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Target URL or domain for full security assessment',
        },
      },
      required: ['target'],
    },
    agent: 'aegis',
    endpoint: '/report',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // NAVIGATOR — Logistics
  // ───────────────────────────────────────────
  {
    name: 'silkweb_navigator_route',
    description: 'Calculate optimal shipping route between two locations. Returns haversine distance, transit time, cost estimates, and CO2 for all transport modes (air, sea, rail, truck). Accepts city names, airport/port codes, or {lat, lng} coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Origin location: city name, airport IATA code (e.g., "LAX"), port code, or coordinates',
        },
        destination: {
          type: 'string',
          description: 'Destination location: city name, airport IATA code, port code, or coordinates',
        },
        weightTons: {
          type: 'number',
          description: 'Cargo weight in metric tons (default: 1)',
        },
      },
      required: ['origin', 'destination'],
    },
    agent: 'navigator',
    endpoint: '/route/calculate',
    method: 'POST',
  },
  {
    name: 'silkweb_navigator_customs',
    description: 'Get customs documentation requirements, tariff notes, restrictions, and average clearance times for a trade corridor between two countries.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Origin country code (e.g., "US")',
        },
        destination: {
          type: 'string',
          description: 'Destination country code (e.g., "CN")',
        },
        goodsDescription: {
          type: 'string',
          description: 'Optional description of goods being shipped',
        },
      },
      required: ['origin', 'destination'],
    },
    agent: 'navigator',
    endpoint: '/compliance/customs',
    method: 'POST',
  },
  {
    name: 'silkweb_navigator_carbon',
    description: 'Calculate carbon footprint (CO2 emissions) for shipping between two locations. Compares all transport modes or calculates for a specific mode. Includes tree-offset equivalence.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Origin location: city name, airport/port code, or coordinates',
        },
        destination: {
          type: 'string',
          description: 'Destination location',
        },
        weightTons: {
          type: 'number',
          description: 'Cargo weight in metric tons (default: 1)',
        },
        mode: {
          type: 'string',
          enum: ['air', 'sea', 'rail', 'truck'],
          description: 'Specific transport mode (omit to compare all)',
        },
      },
      required: ['origin', 'destination'],
    },
    agent: 'navigator',
    endpoint: '/estimate/carbon',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // SENTINEL — IT Ops
  // ───────────────────────────────────────────
  {
    name: 'silkweb_sentinel_health',
    description: 'Check if a website or API is up and measure response time. Supports checking multiple URLs at once. Returns status (up/down/timeout), response time, headers, and performance grade.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to check (e.g., "https://example.com")',
        },
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of URLs to check (alternative to single url)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 10000)',
        },
      },
      required: [],
    },
    agent: 'sentinel',
    endpoint: '/monitor/health',
    method: 'POST',
  },
  {
    name: 'silkweb_sentinel_dns',
    description: 'Check DNS propagation for a domain across multiple resolvers (Google, Cloudflare, Quad9, OpenDNS). Returns records by type, consistency check, and propagation percentage.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to check DNS records for',
        },
        types: {
          type: 'array',
          items: { type: 'string', enum: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'] },
          description: 'DNS record types to query (default: ["A", "AAAA", "MX", "NS"])',
        },
      },
      required: ['domain'],
    },
    agent: 'sentinel',
    endpoint: '/monitor/dns',
    method: 'POST',
  },
  {
    name: 'silkweb_sentinel_ssl_expiry',
    description: 'Check SSL certificate expiration dates for one or more domains. Returns days until expiry, severity level, issuer, and protocol version.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to check SSL expiry',
        },
        domains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of domains to check (alternative to single domain)',
        },
      },
      required: [],
    },
    agent: 'sentinel',
    endpoint: '/monitor/ssl-expiry',
    method: 'POST',
  },
  {
    name: 'silkweb_sentinel_logs',
    description: 'Analyze application logs for error patterns, severity distribution, error bursts, and actionable recommendations. Accepts log text or array of log lines.',
    inputSchema: {
      type: 'object',
      properties: {
        logs: {
          type: 'string',
          description: 'Log text to analyze (newline-separated lines, or pass as array)',
        },
      },
      required: ['logs'],
    },
    agent: 'sentinel',
    endpoint: '/analyze/logs',
    method: 'POST',
  },
  {
    name: 'silkweb_sentinel_incident',
    description: 'Classify an incident by description and suggest root causes, mitigation steps, estimated time to resolve, and escalation recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the incident (e.g., "API returning 503 errors, users cannot log in")',
        },
        affectedServices: {
          type: 'string',
          description: 'Services affected by the incident',
        },
        userImpact: {
          type: 'string',
          description: 'How users are impacted (e.g., "all users", "10% of users")',
        },
        startTime: {
          type: 'string',
          description: 'When the incident started (ISO 8601)',
        },
      },
      required: ['description'],
    },
    agent: 'sentinel',
    endpoint: '/analyze/incident',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // ORACLE — Finance
  // ───────────────────────────────────────────
  {
    name: 'silkweb_oracle_company',
    description: 'Analyze company financial health from financial data. Calculates 15+ ratios (liquidity, profitability, efficiency, solvency) and assigns an A-F health grade.',
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'Company name',
        },
        financials: {
          type: 'object',
          description: 'Financial data: { revenue, costOfGoods, grossProfit, operatingExpenses, netIncome, totalAssets, totalLiabilities, currentAssets, currentLiabilities, equity, cash, inventory, accountsReceivable, accountsPayable }. All values in dollars.',
          properties: {
            revenue: { type: 'number' },
            costOfGoods: { type: 'number' },
            grossProfit: { type: 'number' },
            operatingExpenses: { type: 'number' },
            netIncome: { type: 'number' },
            totalAssets: { type: 'number' },
            totalLiabilities: { type: 'number' },
            currentAssets: { type: 'number' },
            currentLiabilities: { type: 'number' },
            equity: { type: 'number' },
            cash: { type: 'number' },
            inventory: { type: 'number' },
            accountsReceivable: { type: 'number' },
            accountsPayable: { type: 'number' },
          },
        },
        industry: {
          type: 'string',
          description: 'Industry sector for benchmark comparison',
        },
      },
      required: ['company', 'financials'],
    },
    agent: 'oracle',
    endpoint: '/analyze/company',
    method: 'POST',
  },
  {
    name: 'silkweb_oracle_risk',
    description: 'Assess partnership risk between two companies. Analyzes financial health, industry compatibility, size match, and produces a risk score with recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        company1: {
          type: 'object',
          description: 'First company: { name, financials: {...}, industry }',
        },
        company2: {
          type: 'object',
          description: 'Second company: { name, financials: {...}, industry }',
        },
      },
      required: ['company1', 'company2'],
    },
    agent: 'oracle',
    endpoint: '/analyze/risk',
    method: 'POST',
  },
  {
    name: 'silkweb_oracle_fraud',
    description: 'Detect fraud patterns in a list of financial transactions using Benford\'s Law analysis, duplicate detection, and statistical anomaly flagging.',
    inputSchema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              date: { type: 'string' },
              description: { type: 'string' },
              vendor: { type: 'string' },
            },
          },
          description: 'Array of transaction objects with at least amount field',
        },
      },
      required: ['transactions'],
    },
    agent: 'oracle',
    endpoint: '/detect/fraud',
    method: 'POST',
  },
  {
    name: 'silkweb_oracle_compliance',
    description: 'Check which regulations apply to a business based on industry, jurisdiction, revenue, and employee count. Returns applicable frameworks (SOX, GDPR, HIPAA, PCI-DSS, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        industry: {
          type: 'string',
          description: 'Industry sector (e.g., "healthcare", "fintech", "retail")',
        },
        jurisdiction: {
          type: 'string',
          description: 'Primary jurisdiction (e.g., "US", "EU", "UK", "CA")',
        },
        annualRevenue: {
          type: 'number',
          description: 'Annual revenue in dollars',
        },
        employeeCount: {
          type: 'number',
          description: 'Number of employees',
        },
        dataTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Types of data handled (e.g., ["PII", "PHI", "financial", "payment-cards"])',
        },
      },
      required: ['industry', 'jurisdiction'],
    },
    agent: 'oracle',
    endpoint: '/compliance/check',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // ATLAS — Geospatial
  // ───────────────────────────────────────────
  {
    name: 'silkweb_atlas_distance',
    description: 'Calculate distance (Haversine + Vincenty) and bearing between two points. Accepts city names or {lat, lng} coordinates. Returns km, miles, nautical miles, bearing, and midpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Origin: city name or coordinates (e.g., "New York" or "40.7128,-74.0060")',
        },
        to: {
          type: 'string',
          description: 'Destination: city name or coordinates',
        },
      },
      required: ['from', 'to'],
    },
    agent: 'atlas',
    endpoint: '/geo/distance',
    method: 'POST',
  },
  {
    name: 'silkweb_atlas_geofence',
    description: 'Test if a point is inside a polygon geofence using ray-casting algorithm. Returns inside/outside status, distance to nearest edge, and polygon area.',
    inputSchema: {
      type: 'object',
      properties: {
        point: {
          type: 'object',
          description: 'Point to test: { lat, lng } or a city name string',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
        polygon: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          description: 'Array of {lat, lng} vertices defining the polygon',
        },
        name: {
          type: 'string',
          description: 'Optional name for the geofence zone',
        },
      },
      required: ['point', 'polygon'],
    },
    agent: 'atlas',
    endpoint: '/geo/geofence',
    method: 'POST',
  },
  {
    name: 'silkweb_atlas_sun',
    description: 'Calculate sunrise, sunset, twilight times (civil, nautical, astronomical), solar noon, and day length for a location and date. Uses NOAA algorithm.',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or {lat, lng} coordinates',
        },
        date: {
          type: 'string',
          description: 'Date in ISO format (e.g., "2026-03-24"). Defaults to today.',
        },
      },
      required: ['location'],
    },
    agent: 'atlas',
    endpoint: '/geo/sun',
    method: 'POST',
  },
  {
    name: 'silkweb_atlas_route',
    description: 'Analyze a multi-waypoint route with distances, bearings, travel times, and elevation profile. Calculates detour ratio vs straight-line distance.',
    inputSchema: {
      type: 'object',
      properties: {
        waypoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of waypoint locations (city names or coordinates), minimum 2',
        },
        speed: {
          type: 'number',
          description: 'Travel speed in km/h (default: 100)',
        },
      },
      required: ['waypoints'],
    },
    agent: 'atlas',
    endpoint: '/analyze/route',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // DESIGN AGENT — Image Generation
  // ───────────────────────────────────────────
  {
    name: 'silkweb_design_social',
    description: 'Generate a social media card image (1200x675 PNG). Customize headline, subheadline, badges, brand colors, and style. Returns raw PNG image data.',
    inputSchema: {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          description: 'Main headline text',
        },
        subheadline: {
          type: 'string',
          description: 'Secondary text below the headline',
        },
        url: {
          type: 'string',
          description: 'URL to display on the card',
        },
        brand: {
          type: 'object',
          description: 'Brand customization: { name, primaryColor, accentColor }',
        },
        width: {
          type: 'number',
          description: 'Image width in pixels (default: 1200)',
        },
        height: {
          type: 'number',
          description: 'Image height in pixels (default: 675)',
        },
      },
      required: ['headline'],
    },
    agent: 'design',
    endpoint: '/design/social-card',
    method: 'POST',
  },
  {
    name: 'silkweb_design_code',
    description: 'Generate a code snippet screenshot image with syntax highlighting (1200x675 PNG). Supports line highlighting and customizable themes.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to render',
        },
        filename: {
          type: 'string',
          description: 'Filename to display in the title bar (e.g., "index.js")',
        },
        highlightLines: {
          type: 'array',
          items: { type: 'number' },
          description: 'Line numbers to highlight',
        },
        brand: {
          type: 'object',
          description: 'Brand customization: { name, primaryColor }',
        },
      },
      required: ['code'],
    },
    agent: 'design',
    endpoint: '/design/code-snippet',
    method: 'POST',
  },
  {
    name: 'silkweb_design_hero',
    description: 'Generate a hero/banner image (1920x1080 PNG). Customize headline, subtitle, tagline, CTA text, and brand colors.',
    inputSchema: {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          description: 'Main headline',
        },
        subtitle: {
          type: 'string',
          description: 'Subtitle text',
        },
        tagline: {
          type: 'string',
          description: 'Tagline text',
        },
        ctaText: {
          type: 'string',
          description: 'Call-to-action button text',
        },
        brand: {
          type: 'object',
          description: 'Brand customization: { name, primaryColor, accentColor }',
        },
        width: {
          type: 'number',
          description: 'Image width (default: 1920)',
        },
        height: {
          type: 'number',
          description: 'Image height (default: 1080)',
        },
      },
      required: ['headline'],
    },
    agent: 'design',
    endpoint: '/design/hero',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // JUSTICE — Contract Law
  // ───────────────────────────────────────────
  {
    name: 'silkweb_justice_contract',
    description: 'Analyze a contract for risks, key clauses, missing provisions, and potential issues. Identifies liability caps, termination conditions, IP assignments, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Full contract text to analyze',
        },
        contractType: {
          type: 'string',
          description: 'Type of contract (e.g., "employment", "SaaS", "consulting", "lease")',
        },
        party: {
          type: 'string',
          description: 'Which party you represent (e.g., "vendor", "buyer", "employee")',
        },
      },
      required: ['text'],
    },
    agent: 'justice',
    endpoint: '/analyze/contract',
    method: 'POST',
  },
  {
    name: 'silkweb_justice_nda',
    description: 'Analyze a Non-Disclosure Agreement for scope, duration, carve-outs, enforcement provisions, and potential risks.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Full NDA text to analyze',
        },
        party: {
          type: 'string',
          description: 'Which party you represent (e.g., "disclosing", "receiving")',
        },
      },
      required: ['text'],
    },
    agent: 'justice',
    endpoint: '/analyze/nda',
    method: 'POST',
  },
  {
    name: 'silkweb_justice_clause',
    description: 'Draft a standard contract clause from templates. Available types include: indemnification, limitation-of-liability, termination, confidentiality, ip-assignment, non-compete, force-majeure, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        clauseType: {
          type: 'string',
          description: 'Type of clause to draft (e.g., "indemnification", "termination", "force-majeure", "confidentiality", "ip-assignment", "non-compete", "limitation-of-liability")',
        },
        parameters: {
          type: 'object',
          description: 'Clause parameters (varies by type). Common: { partyA, partyB, jurisdiction, term }',
        },
      },
      required: ['clauseType'],
    },
    agent: 'justice',
    endpoint: '/draft/clause',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // SHIELD — Personal Injury
  // ───────────────────────────────────────────
  {
    name: 'silkweb_shield_evaluate',
    description: 'Evaluate a personal injury case. Analyze injury type, circumstances, liability factors, and produce a strength assessment with estimated case value range.',
    inputSchema: {
      type: 'object',
      properties: {
        injuryType: {
          type: 'string',
          description: 'Type of injury (e.g., "whiplash", "broken bone", "concussion", "spinal cord", "burn")',
        },
        circumstances: {
          type: 'string',
          description: 'How the injury occurred (e.g., "rear-end car accident at a red light")',
        },
        severity: {
          type: 'string',
          enum: ['minor', 'moderate', 'severe', 'catastrophic'],
          description: 'Injury severity level',
        },
        state: {
          type: 'string',
          description: 'State where the injury occurred (abbreviation e.g., "CA", "TX", "NY")',
        },
      },
      required: ['injuryType', 'circumstances'],
    },
    agent: 'shield',
    endpoint: '/evaluate/case',
    method: 'POST',
  },
  {
    name: 'silkweb_shield_damages',
    description: 'Calculate potential damages for a personal injury case including economic damages (medical, lost wages), non-economic damages (pain and suffering), and total estimated range.',
    inputSchema: {
      type: 'object',
      properties: {
        medicalExpenses: {
          type: 'number',
          description: 'Total medical expenses in dollars',
        },
        futureMedical: {
          type: 'number',
          description: 'Estimated future medical costs',
        },
        lostWages: {
          type: 'number',
          description: 'Lost wages to date',
        },
        futureLostEarnings: {
          type: 'number',
          description: 'Estimated future lost earnings',
        },
        injuryType: {
          type: 'string',
          description: 'Type of injury for pain/suffering multiplier',
        },
        severity: {
          type: 'string',
          enum: ['minor', 'moderate', 'severe', 'catastrophic'],
          description: 'Injury severity',
        },
      },
      required: ['medicalExpenses', 'injuryType'],
    },
    agent: 'shield',
    endpoint: '/calculate/damages',
    method: 'POST',
  },
  {
    name: 'silkweb_shield_statute',
    description: 'Check the statute of limitations deadline for a personal injury claim in a specific state. Returns filing deadline, time remaining, and special rules (discovery rule, minor tolling, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          description: 'State abbreviation (e.g., "CA", "TX", "NY", "FL")',
        },
        injuryDate: {
          type: 'string',
          description: 'Date of injury in ISO format (e.g., "2025-06-15")',
        },
        claimType: {
          type: 'string',
          description: 'Type of claim (e.g., "personal-injury", "medical-malpractice", "product-liability")',
        },
      },
      required: ['state', 'injuryDate'],
    },
    agent: 'shield',
    endpoint: '/check/statute',
    method: 'POST',
  },

  // ───────────────────────────────────────────
  // FORTRESS — Criminal Defense
  // ───────────────────────────────────────────
  {
    name: 'silkweb_fortress_charge',
    description: 'Analyze criminal charges. Returns elements the prosecution must prove, maximum penalties, sentencing range, applicable defenses, and classification explanation. Covers 40+ federal charges.',
    inputSchema: {
      type: 'object',
      properties: {
        charge: {
          type: 'string',
          description: 'Criminal charge to analyze (e.g., "wire fraud", "drug trafficking", "assault", "identity theft")',
        },
        charges: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of charges to analyze (alternative to single charge)',
        },
        jurisdiction: {
          type: 'string',
          description: 'Jurisdiction (default: "Federal")',
        },
      },
      required: [],
    },
    agent: 'fortress',
    endpoint: '/analyze/charge',
    method: 'POST',
  },
  {
    name: 'silkweb_fortress_rights',
    description: 'Explain constitutional rights for a specific situation. Returns rights, what to do, what not to do, when to invoke counsel, and critical phrases to use. Situations: traffic_stop, arrest, search, interrogation, protest, grand_jury.',
    inputSchema: {
      type: 'object',
      properties: {
        situation: {
          type: 'string',
          description: 'Situation type (e.g., "traffic stop", "arrest", "search", "interrogation", "protest", "grand jury")',
        },
      },
      required: ['situation'],
    },
    agent: 'fortress',
    endpoint: '/rights/explain',
    method: 'POST',
  },
  {
    name: 'silkweb_fortress_evidence',
    description: 'Analyze evidence for potential suppression arguments. Evaluates Fourth Amendment issues (searches, warrants), Miranda violations, digital privacy, chain of custody, and fruit of the poisonous tree doctrine.',
    inputSchema: {
      type: 'object',
      properties: {
        evidenceType: {
          type: 'string',
          description: 'Type of evidence (e.g., "phone records", "confession", "physical evidence", "digital data", "wiretap")',
        },
        howObtained: {
          type: 'string',
          description: 'How the evidence was obtained (e.g., "warrantless search", "consent search", "seized during traffic stop")',
        },
        chainOfCustody: {
          type: 'string',
          description: 'Chain of custody details (e.g., "gap in documentation", "unknown handling")',
        },
        description: {
          type: 'string',
          description: 'General description of the evidence situation',
        },
      },
      required: [],
    },
    agent: 'fortress',
    endpoint: '/analyze/evidence',
    method: 'POST',
  },
];

module.exports = { tools, AGENTS };
