const https = require('https');
const payload = {
  name: 'SIGNAL Communications & PR Agent', slug: 'signal-comms', version: '1.0.0',
  description: 'Communications intelligence — press releases, crisis management, press kits, talking points',
  category: 'communications',
  capabilities: ['press-release-generation', 'crisis-analysis', 'press-kit-creation', 'talking-points'],
  endpoints: [
    { method: 'POST', path: '/generate/pressrelease', description: 'Generate AP-style press release' },
    { method: 'POST', path: '/analyze/crisis', description: 'Crisis severity assessment and response plan' },
    { method: 'POST', path: '/generate/presskit', description: 'Generate press kit contents' },
    { method: 'POST', path: '/generate/talking-points', description: 'Generate key talking points' },
  ],
  tags: ['communications', 'pr', 'press', 'crisis', 'media'], port: 3021, protocol: 'a2a',
};
const API_KEY = process.env.SILKWEB_API_KEY;
if (!API_KEY) { console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n'); console.log(JSON.stringify(payload, null, 2)); process.exit(0); }
const data = JSON.stringify(payload);
const options = { hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, (res) => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); }); });
req.on('error', (err) => console.error('Registration failed:', err.message)); req.write(data); req.end();
