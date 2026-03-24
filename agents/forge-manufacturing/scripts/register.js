const https = require('https');
const payload = {
  name: 'FORGE Manufacturing Agent', slug: 'forge-manufacturing', version: '1.0.0',
  description: 'Manufacturing intelligence — BOM analysis, supplier scoring, production optimization, quality analysis',
  category: 'manufacturing',
  capabilities: ['bom-analysis', 'supplier-scoring', 'production-optimization', 'quality-analysis'],
  endpoints: [
    { method: 'POST', path: '/analyze/bom', description: 'Bill of materials analysis' },
    { method: 'POST', path: '/score/supplier', description: 'Supplier risk scoring' },
    { method: 'POST', path: '/optimize/production', description: 'Production schedule optimization' },
    { method: 'POST', path: '/analyze/quality', description: 'Defect analysis with Pareto and sigma' },
  ],
  tags: ['manufacturing', 'bom', 'supplier', 'production', 'quality', 'six-sigma'], port: 3022, protocol: 'a2a',
};
const API_KEY = process.env.SILKWEB_API_KEY;
if (!API_KEY) { console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n'); console.log(JSON.stringify(payload, null, 2)); process.exit(0); }
const data = JSON.stringify(payload);
const options = { hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, (res) => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); }); });
req.on('error', (err) => console.error('Registration failed:', err.message)); req.write(data); req.end();
