#!/usr/bin/env node
// ─────────────────────────────────────────────
// Register Design Agent on the SilkWeb Network
// Usage: node scripts/register.js
// ─────────────────────────────────────────────

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.SILKWEB_API || 'https://api.silkweb.io';
const API_KEY = process.env.SILKWEB_API_KEY || '';
const AGENT_PORT = process.env.PORT || 3002;
const AGENT_HOST = process.env.AGENT_HOST || `http://localhost:${AGENT_PORT}`;

// Calculate total size of templates + design system
function calculateMemory() {
  const dirs = [
    path.join(__dirname, '..', 'src', 'templates'),
  ];
  const files = [
    path.join(__dirname, '..', 'src', 'design-system.js'),
    path.join(__dirname, '..', 'src', 'presets.js'),
  ];

  let totalBytes = 0;

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const filePath = path.join(dir, entry);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          totalBytes += stat.size;
        }
      }
    }
  }

  for (const file of files) {
    if (fs.existsSync(file)) {
      totalBytes += fs.statSync(file).size;
    }
  }

  return totalBytes;
}

const memoryBytes = calculateMemory();
const memoryKB = (memoryBytes / 1024).toFixed(1);

const registration = {
  name: 'SilkWeb Design Agent',
  description: 'Production-ready image generation service. Creates social cards, GitHub preview images, app icons, hero banners, code screenshots, infographics, and branded receipts with premium glassmorphism aesthetics.',
  version: '1.0.0',
  protocol: 'a2a',
  endpoint: AGENT_HOST,
  capabilities: [
    'social-card-design',
    'github-preview',
    'icon-design',
    'hero-image',
    'code-screenshot',
    'infographic',
    'receipt-design',
    'custom-design',
  ],
  memory: {
    templates_and_design_system: `${memoryKB} KB`,
    bytes: memoryBytes,
  },
  tags: ['design', 'graphics', 'branding', 'ui', 'marketing', 'social-media'],
  endpoints: {
    health: `${AGENT_HOST}/health`,
    agent_card: `${AGENT_HOST}/.well-known/agent.json`,
    social_card: `${AGENT_HOST}/design/social-card`,
    github_social: `${AGENT_HOST}/design/github-social`,
    icon: `${AGENT_HOST}/design/icon`,
    hero: `${AGENT_HOST}/design/hero`,
    code_snippet: `${AGENT_HOST}/design/code-snippet`,
    infographic: `${AGENT_HOST}/design/infographic`,
    receipt: `${AGENT_HOST}/design/receipt`,
    custom: `${AGENT_HOST}/design/custom`,
  },
  rendering_engines: [
    'html-css-chrome-headless',
    'svg-programmatic',
    'sharp-canvas',
    'generative-algorithmic',
  ],
  presets: ['linear', 'vercel', 'stripe', 'github', 'silkweb'],
  generative_patterns: ['rings', 'flow', 'constellation', 'hexgrid', 'waves'],
};

async function register() {
  console.log('SilkWeb Design Agent Registration');
  console.log('=================================\n');
  console.log('Agent:', registration.name);
  console.log('Version:', registration.version);
  console.log('Endpoint:', registration.endpoint);
  console.log('Capabilities:', registration.capabilities.join(', '));
  console.log('Memory (templates + design system):', registration.memory.templates_and_design_system);
  console.log('Tags:', registration.tags.join(', '));
  console.log('');

  if (!API_KEY) {
    console.log('No SILKWEB_API_KEY set. Printing registration payload:\n');
    console.log(JSON.stringify(registration, null, 2));
    console.log('\nTo register, set SILKWEB_API_KEY and run again.');
    console.log('Or POST this JSON to: POST ' + API_BASE + '/v1/agents/register');
    return;
  }

  const data = JSON.stringify(registration);
  const url = new URL(`${API_BASE}/v1/agents/register`);
  const transport = url.protocol === 'https:' ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': `Bearer ${API_KEY}`,
      'User-Agent': 'silkweb-design-agent/1.0.0',
    },
  };

  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Registration successful!');
          try {
            const parsed = JSON.parse(body);
            console.log('Agent ID:', parsed.agentId || parsed.id || 'assigned');
            console.log('Response:', JSON.stringify(parsed, null, 2));
          } catch {
            console.log('Response:', body);
          }
          resolve();
        } else {
          console.error(`Registration failed (HTTP ${res.statusCode}):`, body);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('Connection error:', err.message);
      console.log('\nMake sure the SilkWeb API is running at:', API_BASE);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

register().catch(() => process.exit(1));
