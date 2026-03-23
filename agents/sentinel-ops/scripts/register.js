const https = require('https');

const payload = {
  name: 'SENTINEL Ops Agent',
  slug: 'sentinel-ops',
  version: '1.0.0',
  description: 'IT infrastructure monitoring - health checks, DNS resolution, SSL expiry tracking, log analysis, incident classification',
  category: 'devops',
  capabilities: ['http-health-check', 'dns-resolution', 'ssl-expiry-monitoring', 'log-analysis', 'incident-classification'],
  endpoints: [
    { method: 'POST', path: '/monitor/health', description: 'HTTP health check with response time measurement' },
    { method: 'POST', path: '/monitor/dns', description: 'Check DNS records across Google/Cloudflare resolvers' },
    { method: 'POST', path: '/monitor/ssl-expiry', description: 'SSL cert expiration check for domain list' },
    { method: 'POST', path: '/analyze/logs', description: 'Parse log lines, detect error patterns, count severities' },
    { method: 'POST', path: '/analyze/incident', description: 'Classify P1-P4, suggest root causes and mitigations' },
  ],
  tags: ['devops', 'sre', 'monitoring', 'infrastructure', 'incident-response'],
  port: 3005,
  protocol: 'a2a',
};

const API_KEY = process.env.SILKWEB_API_KEY;

if (!API_KEY) {
  console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nSet SILKWEB_API_KEY environment variable to register automatically.');
  process.exit(0);
}

const data = JSON.stringify(payload);
const options = {
  hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); });
});
req.on('error', (err) => console.error('Registration failed:', err.message));
req.write(data);
req.end();
