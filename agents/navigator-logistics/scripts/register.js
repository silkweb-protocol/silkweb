// ─────────────────────────────────────────────
// Register NAVIGATOR Logistics Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'NAVIGATOR Logistics Agent',
  slug: 'navigator-logistics',
  version: '1.0.0',
  description: 'Global logistics intelligence — route calculation, multi-modal optimization, customs compliance, carbon footprint estimation',
  category: 'logistics',
  capabilities: [
    'haversine-distance',
    'transit-time-estimation',
    'multi-modal-routing',
    'customs-compliance',
    'carbon-footprint',
    'cost-estimation',
  ],
  endpoints: [
    { method: 'POST', path: '/route/calculate', description: 'Calculate distance, transit time, cost for all transport modes' },
    { method: 'POST', path: '/route/multimodal', description: 'Optimize multi-leg routes combining transport modes' },
    { method: 'POST', path: '/compliance/customs', description: 'Get customs documentation requirements for trade corridors' },
    { method: 'POST', path: '/estimate/carbon', description: 'Calculate CO2 emissions per transport mode' },
  ],
  tags: ['logistics', 'shipping', 'customs', 'carbon', 'routing', 'trade'],
  port: 3004,
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
