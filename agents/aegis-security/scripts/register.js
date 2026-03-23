// ─────────────────────────────────────────────
// Register AEGIS Security Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'AEGIS Security Agent',
  slug: 'aegis-security',
  version: '1.0.0',
  description: 'Cybersecurity threat intelligence — HTTP header analysis, SSL inspection, DNS security, domain reputation scoring',
  category: 'security',
  capabilities: [
    'http-header-analysis',
    'ssl-certificate-inspection',
    'dns-record-analysis',
    'domain-reputation',
    'vulnerability-detection',
    'comprehensive-security-report',
  ],
  endpoints: [
    { method: 'POST', path: '/scan/url', description: 'Analyze URL HTTP headers for security issues' },
    { method: 'POST', path: '/scan/ssl', description: 'Inspect SSL certificate and TLS configuration' },
    { method: 'POST', path: '/scan/domain', description: 'Check DNS records, SPF, DMARC, domain reputation' },
    { method: 'POST', path: '/report', description: 'Comprehensive security assessment' },
  ],
  tags: ['security', 'cybersecurity', 'ssl', 'dns', 'vulnerability', 'compliance'],
  port: 3003,
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
  hostname: 'api.silkweb.io',
  port: 443,
  path: '/v1/agents/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(body);
  });
});

req.on('error', (err) => console.error('Registration failed:', err.message));
req.write(data);
req.end();
