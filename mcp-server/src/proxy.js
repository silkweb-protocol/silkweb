// ─────────────────────────────────────────────
// SilkWeb MCP Server — Proxy Layer
// Routes MCP tool calls to the actual SilkWeb agent endpoints
// ─────────────────────────────────────────────

const http = require('http');
const https = require('https');
const { AGENTS } = require('./tools');

// ─── Configuration ──────────────────────────

// Set BASE_URL to switch between local development and production
// Local:      http://localhost  (each agent on its own port)
// Production: https://api.silkweb.io  (all agents behind the reverse proxy)
const BASE_URL = process.env.SILKWEB_BASE_URL || 'http://localhost';
const TIMEOUT_MS = parseInt(process.env.SILKWEB_TIMEOUT_MS || '30000', 10);

// In production mode, all agents are behind /agents/<name> on a single host
const IS_PRODUCTION = BASE_URL.includes('api.silkweb.io');

// Production path mapping: agent key -> URL path segment
const PRODUCTION_PATHS = {
  aegis: '/agents/aegis',
  navigator: '/agents/navigator',
  sentinel: '/agents/sentinel',
  oracle: '/agents/oracle',
  atlas: '/agents/atlas',
  design: '/agents/design',
  justice: '/agents/justice',
  shield: '/agents/shield',
  fortress: '/agents/fortress',
};

// ─── Build URL ──────────────────────────────

function buildUrl(agentKey, endpoint) {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);

  if (IS_PRODUCTION) {
    // Production: single host, path-based routing
    const prefix = PRODUCTION_PATHS[agentKey] || `/agents/${agentKey}`;
    return `${BASE_URL}${prefix}${endpoint}`;
  }

  // Local development: each agent on its own port
  return `${BASE_URL}:${agent.port}${agent.pathPrefix}${endpoint}`;
}

// ─── HTTP Request Helper ────────────────────

function makeRequest(url, method, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SilkWeb-MCP-Server/0.1.0',
      },
      timeout: TIMEOUT_MS,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Check content type to determine if response is JSON or binary
        const contentType = res.headers['content-type'] || '';

        if (contentType.includes('image/')) {
          // Binary image response (from design agent)
          // Convert to base64 for MCP transport
          resolve({
            statusCode: res.statusCode,
            contentType,
            isImage: true,
            data: Buffer.from(data, 'binary').toString('base64'),
          });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            contentType,
            isImage: false,
            data: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            contentType,
            isImage: false,
            data: { raw: data.substring(0, 2000) },
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Connection to ${url} failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after ${TIMEOUT_MS}ms`));
    });

    if (body && method !== 'GET') {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// ─── Transform Tool Input to Agent Payload ──

function buildPayload(toolName, args) {
  // Most tools pass arguments directly to the agent endpoint
  // Some need restructuring to match the agent's expected format

  // Design agent tools need content/output wrapping
  if (toolName === 'silkweb_design_social') {
    return {
      brand: args.brand || {},
      content: {
        headline: args.headline,
        subheadline: args.subheadline,
        url: args.url,
      },
      output: {
        width: args.width || 1200,
        height: args.height || 675,
      },
    };
  }

  if (toolName === 'silkweb_design_code') {
    return {
      brand: args.brand || {},
      content: {
        code: args.code,
        filename: args.filename || 'example.js',
        highlightLines: args.highlightLines || [],
      },
      output: {
        width: args.width || 1200,
        height: args.height || 675,
      },
    };
  }

  if (toolName === 'silkweb_design_hero') {
    return {
      brand: args.brand || {},
      content: {
        headline: args.headline,
        subtitle: args.subtitle,
        tagline: args.tagline,
        ctaText: args.ctaText,
      },
      output: {
        width: args.width || 1920,
        height: args.height || 1080,
      },
    };
  }

  // All other tools: pass arguments as-is to the agent
  return args;
}

// ─── Generate Agent Listing ─────────────────

function generateAgentListing() {
  const lines = [
    '=== SilkWeb Agent Network ===',
    'The Spider Web Protocol \u2014 9 specialized AI agents\n',
  ];

  const agentList = [
    { key: 'aegis', num: 1 },
    { key: 'navigator', num: 2 },
    { key: 'sentinel', num: 3 },
    { key: 'oracle', num: 4 },
    { key: 'atlas', num: 5 },
    { key: 'design', num: 6 },
    { key: 'justice', num: 7 },
    { key: 'shield', num: 8 },
    { key: 'fortress', num: 9 },
  ];

  for (const { key, num } of agentList) {
    const a = AGENTS[key];
    lines.push(`${num}. ${a.emoji} ${a.name} \u2014 ${a.tagline}`);
    lines.push(`   ${a.description}`);
    lines.push(`   Agent ID: ${a.id} | Port: ${a.port}`);
    lines.push('');
  }

  lines.push('Use any silkweb_<agent>_<action> tool to interact with an agent.');
  lines.push('Example: silkweb_aegis_scan_url, silkweb_atlas_distance, silkweb_oracle_fraud');

  return lines.join('\n');
}

// ─── Execute Tool Call ──────────────────────

async function executeToolCall(toolName, args, toolDef) {
  // Handle the listing meta-tool
  if (toolName === 'silkweb_list_agents') {
    return {
      content: [
        {
          type: 'text',
          text: generateAgentListing(),
        },
      ],
    };
  }

  // Validate tool has an agent and endpoint
  if (!toolDef.agent || !toolDef.endpoint) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Tool "${toolName}" is not properly configured.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const url = buildUrl(toolDef.agent, toolDef.endpoint);
    const payload = buildPayload(toolName, args || {});
    const response = await makeRequest(url, toolDef.method, payload);

    // Handle error status codes
    if (response.statusCode >= 400) {
      const errorMsg = response.data?.error || response.data?.message || `HTTP ${response.statusCode}`;
      return {
        content: [
          {
            type: 'text',
            text: `Agent error (${response.statusCode}): ${errorMsg}\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    // Handle image responses (design agent)
    if (response.isImage) {
      return {
        content: [
          {
            type: 'image',
            data: response.data,
            mimeType: response.contentType,
          },
        ],
      };
    }

    // Normal JSON response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error calling ${toolDef.agent} agent: ${err.message}\n\nMake sure the agent is running. Check: ${buildUrl(toolDef.agent, '/health')}`,
        },
      ],
      isError: true,
    };
  }
}

module.exports = { executeToolCall, buildUrl, makeRequest, generateAgentListing, IS_PRODUCTION, BASE_URL };
