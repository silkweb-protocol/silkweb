const https = require('https');

const payload = {
  name: 'ATLAS Geospatial Agent',
  slug: 'atlas-geospatial',
  version: '1.0.0',
  description: 'Geospatial intelligence - haversine/vincenty distance, bearing, midpoint, geofencing, sunrise/sunset calculations, route analysis',
  category: 'geospatial',
  capabilities: ['haversine-distance', 'vincenty-distance', 'bearing', 'midpoint', 'geofence', 'sun-calculations', 'route-analysis'],
  endpoints: [
    { method: 'POST', path: '/geo/distance', description: 'Haversine + Vincenty distance, bearing, midpoint between two points' },
    { method: 'POST', path: '/geo/geofence', description: 'Ray-casting point-in-polygon test with area calculation' },
    { method: 'POST', path: '/geo/sun', description: 'Sunrise, sunset, twilight times for coordinates + date' },
    { method: 'POST', path: '/analyze/route', description: 'Multi-waypoint route analysis with distances, bearings, travel times' },
  ],
  tags: ['geospatial', 'distance', 'geofence', 'sun', 'routing'],
  port: 3007,
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
