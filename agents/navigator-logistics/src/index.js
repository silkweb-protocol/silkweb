// ─────────────────────────────────────────────
// SilkWeb NAVIGATOR — Global Logistics & Route Intelligence Agent
// Real haversine distance, transit estimation, customs compliance, carbon footprint
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json({ limit: '1mb' }));

// ─── Load data ───────────────────────────────

const ports = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'ports.json'), 'utf8'));
const airports = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'airports.json'), 'utf8'));
const customsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'customs-rules.json'), 'utf8'));

// Build lookup indexes
const portsByName = {};
const portsByCode = {};
for (const p of ports) {
  portsByName[p.name.toLowerCase()] = p;
  portsByCode[p.code] = p;
}
const airportsByCity = {};
const airportsByIata = {};
for (const a of airports) {
  airportsByCity[a.city.toLowerCase()] = a;
  airportsByIata[a.iata] = a;
}

// ─── Rate limiter ────────────────────────────

const rateLimit = {};
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => t > now - 60000);
  if (rateLimit[ip].length >= 60) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 60 requests per minute.' });
  }
  rateLimit[ip].push(now);
  next();
}
app.use(rateLimitMiddleware);

// ─── Math utilities ──────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

function haversine(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2 * DEG_TO_RAD);
  const x = Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// ─── Resolve location ────────────────────────
// Accepts {lat, lng} or city name string or port/airport code

function resolveLocation(input) {
  if (!input) return null;
  if (typeof input === 'object' && input.lat !== undefined && input.lng !== undefined) {
    return { lat: input.lat, lng: input.lng, name: input.name || 'Custom', type: 'coordinates' };
  }
  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    // Check airport IATA code
    const upper = input.toUpperCase().trim();
    if (airportsByIata[upper]) {
      const a = airportsByIata[upper];
      return { lat: a.lat, lng: a.lng, name: a.name, type: 'airport', iata: a.iata, country: a.country };
    }
    // Check port code
    if (portsByCode[upper]) {
      const p = portsByCode[upper];
      return { lat: p.lat, lng: p.lng, name: p.name, type: 'port', code: p.code, country: p.country };
    }
    // Check city names in airports
    if (airportsByCity[lower]) {
      const a = airportsByCity[lower];
      return { lat: a.lat, lng: a.lng, name: a.city, type: 'city', iata: a.iata, country: a.country };
    }
    // Check port names
    if (portsByName[lower]) {
      const p = portsByName[lower];
      return { lat: p.lat, lng: p.lng, name: p.name, type: 'port', code: p.code, country: p.country };
    }
    // Fuzzy match
    for (const a of airports) {
      if (a.city.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower)) {
        return { lat: a.lat, lng: a.lng, name: a.city, type: 'city', iata: a.iata, country: a.country };
      }
    }
    for (const p of ports) {
      if (p.name.toLowerCase().includes(lower)) {
        return { lat: p.lat, lng: p.lng, name: p.name, type: 'port', code: p.code, country: p.country };
      }
    }
  }
  return null;
}

// ─── Transport estimation ────────────────────

// CO2 emission factors: grams CO2 per ton-km
const EMISSION_FACTORS = { air: 500, sea: 15, rail: 30, truck: 60 };

// Speed (km/h), cost per ton-km (USD), sea route multiplier
const TRANSPORT_MODES = {
  air: { speed: 850, costPerTonKm: 4.50, routeMultiplier: 1.0 },
  sea: { speed: 25, costPerTonKm: 0.05, routeMultiplier: 1.4 },    // sea routes longer than direct
  rail: { speed: 80, costPerTonKm: 0.15, routeMultiplier: 1.3 },
  truck: { speed: 65, costPerTonKm: 0.25, routeMultiplier: 1.2 },
};

function estimateTransport(distanceKm, mode, weightTons = 1) {
  const m = TRANSPORT_MODES[mode];
  if (!m) return null;
  const routeDistance = distanceKm * m.routeMultiplier;
  const transitHours = routeDistance / m.speed;
  const cost = routeDistance * m.costPerTonKm * weightTons;
  const co2Kg = (routeDistance * EMISSION_FACTORS[mode] * weightTons) / 1000;
  return {
    mode,
    routeDistanceKm: Math.round(routeDistance),
    transitHours: Math.round(transitHours * 10) / 10,
    transitDays: Math.round((transitHours / 24) * 10) / 10,
    costUSD: Math.round(cost * 100) / 100,
    co2Kg: Math.round(co2Kg * 10) / 10,
    weightTons,
  };
}

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'navigator-logistics',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /route/calculate',
      'POST /route/multimodal',
      'POST /compliance/customs',
      'POST /estimate/carbon',
    ],
    capabilities: [
      'haversine-distance',
      'transit-time-estimation',
      'multi-modal-routing',
      'customs-compliance',
      'carbon-footprint',
      'cost-estimation',
    ],
    dataPoints: {
      ports: ports.length,
      airports: airports.length,
      tradeCorridors: Object.keys(customsData.corridors).length,
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── POST /route/calculate ───────────────────
// Takes origin/destination, calculates distance, transit time and cost for all modes

app.post('/route/calculate', (req, res) => {
  try {
    const { origin, destination, weightTons = 1 } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    const from = resolveLocation(origin);
    const to = resolveLocation(destination);

    if (!from) return res.status(400).json({ error: `Could not resolve origin: ${JSON.stringify(origin)}` });
    if (!to) return res.status(400).json({ error: `Could not resolve destination: ${JSON.stringify(destination)}` });

    const directDistanceKm = haversine(from.lat, from.lng, to.lat, to.lng);
    const bearingDeg = bearing(from.lat, from.lng, to.lat, to.lng);

    const comparison = {};
    for (const mode of ['air', 'sea', 'rail', 'truck']) {
      comparison[mode] = estimateTransport(directDistanceKm, mode, weightTons);
    }

    // Find fastest and cheapest
    const modes = Object.values(comparison);
    const fastest = modes.reduce((a, b) => a.transitHours < b.transitHours ? a : b);
    const cheapest = modes.reduce((a, b) => a.costUSD < b.costUSD ? a : b);
    const greenest = modes.reduce((a, b) => a.co2Kg < b.co2Kg ? a : b);

    res.json({
      agent: 'navigator-logistics',
      route: 'calculate',
      origin: from,
      destination: to,
      directDistanceKm: Math.round(directDistanceKm),
      directDistanceMiles: Math.round(directDistanceKm * 0.621371),
      bearingDegrees: Math.round(bearingDeg * 10) / 10,
      cardinalDirection: bearingToCardinal(bearingDeg),
      weightTons,
      comparison,
      recommendations: {
        fastest: { mode: fastest.mode, transitDays: fastest.transitDays },
        cheapest: { mode: cheapest.mode, costUSD: cheapest.costUSD },
        greenest: { mode: greenest.mode, co2Kg: greenest.co2Kg },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function bearingToCardinal(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ─── POST /route/multimodal ──────────────────
// Optimizes multi-leg routes combining transport modes

app.post('/route/multimodal', (req, res) => {
  try {
    const { legs, weightTons = 1 } = req.body;
    if (!legs || !Array.isArray(legs) || legs.length < 1) {
      return res.status(400).json({ error: 'legs array is required with at least 1 leg. Each leg: { origin, destination, mode }' });
    }

    const results = [];
    let totalDistanceKm = 0;
    let totalTransitHours = 0;
    let totalCostUSD = 0;
    let totalCO2Kg = 0;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const from = resolveLocation(leg.origin);
      const to = resolveLocation(leg.destination);
      const mode = leg.mode || 'truck';

      if (!from || !to) {
        return res.status(400).json({ error: `Could not resolve locations for leg ${i + 1}` });
      }

      const dist = haversine(from.lat, from.lng, to.lat, to.lng);
      const estimate = estimateTransport(dist, mode, weightTons);

      if (!estimate) {
        return res.status(400).json({ error: `Invalid transport mode '${mode}' for leg ${i + 1}` });
      }

      totalDistanceKm += estimate.routeDistanceKm;
      totalTransitHours += estimate.transitHours;
      totalCostUSD += estimate.costUSD;
      totalCO2Kg += estimate.co2Kg;

      results.push({
        leg: i + 1,
        origin: from,
        destination: to,
        mode,
        ...estimate,
      });
    }

    // Add transfer time between legs (4 hours per transfer)
    const transferHours = Math.max(0, (legs.length - 1) * 4);
    totalTransitHours += transferHours;

    res.json({
      agent: 'navigator-logistics',
      route: 'multimodal',
      legs: results,
      totals: {
        totalDistanceKm: Math.round(totalDistanceKm),
        totalTransitHours: Math.round(totalTransitHours * 10) / 10,
        totalTransitDays: Math.round((totalTransitHours / 24) * 10) / 10,
        totalCostUSD: Math.round(totalCostUSD * 100) / 100,
        totalCO2Kg: Math.round(totalCO2Kg * 10) / 10,
        transferTime: `${transferHours} hours (${legs.length - 1} transfers)`,
        weightTons,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /compliance/customs ────────────────
// Returns required documentation, tariffs, restricted items

app.post('/compliance/customs', (req, res) => {
  try {
    const { origin, destination, goodsDescription } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination country codes are required (e.g., "US", "CN")' });
    }

    const originCode = origin.toUpperCase().trim();
    const destCode = destination.toUpperCase().trim();

    // Try both directions for corridor lookup
    const corridorKey = `${originCode}-${destCode}`;
    const corridor = customsData.corridors[corridorKey];

    if (!corridor) {
      // Return generic requirements
      const genericDocs = [
        'Commercial Invoice',
        'Packing List',
        'Bill of Lading / Airway Bill',
        'Certificate of Origin',
      ];
      return res.json({
        agent: 'navigator-logistics',
        compliance: 'customs',
        corridor: corridorKey,
        status: 'generic',
        message: `No specific corridor data for ${corridorKey}. Returning general requirements.`,
        documents: genericDocs,
        documentDescriptions: genericDocs.map(d => ({
          name: d,
          description: customsData.documentDescriptions[d] || 'Standard trade document',
        })),
      });
    }

    res.json({
      agent: 'navigator-logistics',
      compliance: 'customs',
      corridor: corridorKey,
      origin: corridor.origin,
      destination: corridor.destination,
      documents: corridor.documents,
      documentDescriptions: corridor.documents.map(d => ({
        name: d,
        description: customsData.documentDescriptions[d] || 'Required trade document for this corridor',
      })),
      tariffNotes: corridor.tariffNotes,
      restrictions: corridor.restrictions,
      avgClearanceDays: corridor.avgClearanceDays,
      goodsDescription: goodsDescription || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /estimate/carbon ───────────────────
// Calculates CO2 emissions per transport mode

app.post('/estimate/carbon', (req, res) => {
  try {
    const { origin, destination, weightTons = 1, mode } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    const from = resolveLocation(origin);
    const to = resolveLocation(destination);

    if (!from) return res.status(400).json({ error: `Could not resolve origin: ${JSON.stringify(origin)}` });
    if (!to) return res.status(400).json({ error: `Could not resolve destination: ${JSON.stringify(destination)}` });

    const directDistanceKm = haversine(from.lat, from.lng, to.lat, to.lng);

    if (mode) {
      // Single mode calculation
      const m = TRANSPORT_MODES[mode];
      if (!m) return res.status(400).json({ error: `Invalid mode. Use: air, sea, rail, truck` });
      const routeDistance = directDistanceKm * m.routeMultiplier;
      const co2Kg = (routeDistance * EMISSION_FACTORS[mode] * weightTons) / 1000;
      return res.json({
        agent: 'navigator-logistics',
        estimate: 'carbon',
        origin: from,
        destination: to,
        directDistanceKm: Math.round(directDistanceKm),
        mode,
        routeDistanceKm: Math.round(routeDistance),
        weightTons,
        co2Kg: Math.round(co2Kg * 10) / 10,
        co2Tons: Math.round((co2Kg / 1000) * 1000) / 1000,
        emissionFactor: `${EMISSION_FACTORS[mode]} g CO2/ton-km`,
      });
    }

    // All modes comparison
    const comparison = {};
    for (const [m, config] of Object.entries(TRANSPORT_MODES)) {
      const routeDistance = directDistanceKm * config.routeMultiplier;
      const co2Kg = (routeDistance * EMISSION_FACTORS[m] * weightTons) / 1000;
      comparison[m] = {
        routeDistanceKm: Math.round(routeDistance),
        co2Kg: Math.round(co2Kg * 10) / 10,
        co2Tons: Math.round((co2Kg / 1000) * 1000) / 1000,
        emissionFactor: `${EMISSION_FACTORS[m]} g CO2/ton-km`,
      };
    }

    // Tree equivalence (1 tree absorbs ~22kg CO2/year)
    const airCO2 = comparison.air.co2Kg;
    const treesNeeded = Math.ceil(airCO2 / 22);

    res.json({
      agent: 'navigator-logistics',
      estimate: 'carbon',
      origin: from,
      destination: to,
      directDistanceKm: Math.round(directDistanceKm),
      weightTons,
      comparison,
      insight: {
        airVsSea: `Air emits ${Math.round(comparison.air.co2Kg / comparison.sea.co2Kg)}x more CO2 than sea freight`,
        airVsRail: `Air emits ${Math.round(comparison.air.co2Kg / comparison.rail.co2Kg)}x more CO2 than rail`,
        treesToOffsetAir: treesNeeded,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── A2A Protocol ────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'NAVIGATOR Logistics Agent',
    description: 'Global logistics intelligence — route calculation, multi-modal optimization, customs compliance, carbon footprint estimation',
    version: '1.0.0',
    protocol: 'a2a',
    capabilities: [
      'haversine-distance',
      'transit-time-estimation',
      'multi-modal-routing',
      'customs-compliance',
      'carbon-footprint',
      'cost-estimation',
    ],
    endpoints: {
      base: `http://localhost:${PORT}`,
      health: '/health',
      routes: ['/route/calculate', '/route/multimodal', '/compliance/customs', '/estimate/carbon'],
    },
    tags: ['logistics', 'shipping', 'customs', 'carbon', 'routing', 'trade', 'silkweb'],
  });
});

// ─── Error handling ──────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   NAVIGATOR Logistics Agent             ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /route/calculate                 ║
  ║   POST /route/multimodal                ║
  ║   POST /compliance/customs              ║
  ║   POST /estimate/carbon                 ║
  ║                                         ║
  ║   Data: ${ports.length} ports, ${airports.length} airports, ${Object.keys(customsData.corridors).length} corridors   ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
