const https = require('https');

const payload = {
  name: 'ORACLE Finance Agent',
  slug: 'oracle-finance',
  version: '1.0.0',
  description: 'Financial intelligence - company analysis with 15+ ratios, partnership risk scoring, fraud detection via Benfords law, regulatory compliance checking',
  category: 'finance',
  capabilities: ['financial-ratio-analysis', 'company-health-scoring', 'partnership-risk', 'benfords-law', 'fraud-detection', 'regulatory-compliance'],
  endpoints: [
    { method: 'POST', path: '/analyze/company', description: 'Calculate 15+ financial ratios and health score A-F' },
    { method: 'POST', path: '/analyze/risk', description: 'Partnership risk score between two companies' },
    { method: 'POST', path: '/detect/fraud', description: 'Benfords law analysis, duplicate detection, anomaly flagging' },
    { method: 'POST', path: '/compliance/check', description: 'Applicable regulations per jurisdiction' },
  ],
  tags: ['finance', 'risk', 'compliance', 'fraud-detection', 'market-intelligence'],
  port: 3006,
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
