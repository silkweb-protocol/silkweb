// ─────────────────────────────────────────────
// SilkWeb ATLAS — Geospatial Intelligence Agent
// Real haversine/vincenty distance, geofencing, sun calculations, route analysis
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json({ limit: '2mb' }));

// ── Load data ────────────────────────────────

const cities = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'cities.json'), 'utf8'));

// Build lookup indexes
const citiesByName = {};
for (const c of cities) {
  citiesByName[c.name.toLowerCase()] = c;
}

// ── Rate limiter ─────────────────────────────

const rateLimit = {};
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => t > now - 60000);
  if (rateLimit[ip].length >= 60) return res.status(429).json({ error: 'Rate limit exceeded' });
  rateLimit[ip].push(now);
  next();
}
app.use(rateLimitMiddleware);

// ── Constants ────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0088;

// WGS-84 ellipsoid parameters for Vincenty
const WGS84_A = 6378137.0;        // semi-major axis (m)
const WGS84_B = 6356752.314245;   // semi-minor axis (m)
const WGS84_F = 1 / 298.257223563; // flattening

// ── Geo Math ─────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function vincenty(lat1, lng1, lat2, lng2) {
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const L = (lng2 - lng1) * DEG_TO_RAD;

  const U1 = Math.atan((1 - WGS84_F) * Math.tan(phi1));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(phi2));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let lambda = L, lambdaP, iterLimit = 100;
  let sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM, C;

  do {
    const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2
    );
    if (sinSigma === 0) return 0; // coincident points
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    cosSqAlpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha : 0;
    C = WGS84_F / 16 * cosSqAlpha * (4 + WGS84_F * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1 - C) * WGS84_F * sinAlpha * (
      sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2))
    );
  } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  if (iterLimit === 0) return haversine(lat1, lng1, lat2, lng2); // fallback

  const uSq = cosSqAlpha * (WGS84_A ** 2 - WGS84_B ** 2) / (WGS84_B ** 2);
  const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (
    cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
    B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)
  ));

  const distMeters = WGS84_B * A * (sigma - deltaSigma);
  return distMeters / 1000; // convert to km
}

function bearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2 * DEG_TO_RAD);
  const x = Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLng);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

function midpoint(lat1, lng1, lat2, lng2) {
  const phi1 = lat1 * DEG_TO_RAD, lam1 = lng1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD, lam2 = lng2 * DEG_TO_RAD;
  const Bx = Math.cos(phi2) * Math.cos(lam2 - lam1);
  const By = Math.cos(phi2) * Math.sin(lam2 - lam1);
  const phi3 = Math.atan2(
    Math.sin(phi1) + Math.sin(phi2),
    Math.sqrt((Math.cos(phi1) + Bx) ** 2 + By ** 2)
  );
  const lam3 = lam1 + Math.atan2(By, Math.cos(phi1) + Bx);
  return { lat: round6(phi3 * RAD_TO_DEG), lng: round6(lam3 * RAD_TO_DEG) };
}

function bearingToCardinal(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function round2(v) { return Math.round(v * 100) / 100; }
function round6(v) { return Math.round(v * 1000000) / 1000000; }

// ── Location Resolver ────────────────────────

function resolveLocation(input) {
  if (!input) return null;
  if (typeof input === 'object' && input.lat !== undefined && input.lng !== undefined) {
    return { lat: input.lat, lng: input.lng, name: input.name || 'Custom', resolved: 'coordinates' };
  }
  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    if (citiesByName[lower]) {
      const c = citiesByName[lower];
      return { lat: c.lat, lng: c.lng, name: c.name, country: c.country, population: c.population, elevation: c.elevation, resolved: 'city' };
    }
    // Fuzzy match
    for (const c of cities) {
      if (c.name.toLowerCase().includes(lower)) {
        return { lat: c.lat, lng: c.lng, name: c.name, country: c.country, population: c.population, elevation: c.elevation, resolved: 'fuzzy' };
      }
    }
  }
  return null;
}

// ── Point-in-Polygon (Ray Casting) ──────────

function pointInPolygon(lat, lng, polygon) {
  // polygon is array of {lat, lng} or [lat, lng]
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lat !== undefined ? polygon[i].lat : polygon[i][0];
    const yi = polygon[i].lng !== undefined ? polygon[i].lng : polygon[i][1];
    const xj = polygon[j].lat !== undefined ? polygon[j].lat : polygon[j][0];
    const yj = polygon[j].lng !== undefined ? polygon[j].lng : polygon[j][1];

    if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// ── Sun Calculations (NOAA algorithm) ────────

function julianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let A = Math.floor((14 - m) / 12);
  let Y = y + 4800 - A;
  let M = m + 12 * A - 3;

  let JD = d + Math.floor((153 * M + 2) / 5) + 365 * Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045;
  JD += (h - 12) / 24;
  return JD;
}

function sunPosition(lat, lng, date) {
  const JD = julianDay(date);
  const n = JD - 2451545.0; // days since J2000.0
  const L = (280.460 + 0.9856474 * n) % 360; // mean longitude
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG_TO_RAD; // mean anomaly

  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG_TO_RAD;

  // Obliquity of ecliptic
  const epsilon = (23.439 - 0.0000004 * n) * DEG_TO_RAD;

  // Declination
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  // Right ascension
  const rightAscension = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));

  // Equation of time (approximate, in minutes)
  const B = ((360 / 365) * (n - 81)) * DEG_TO_RAD;
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  return { declination, rightAscension, equationOfTime: EoT };
}

function calculateSunTimes(lat, lng, date) {
  const { declination, equationOfTime } = sunPosition(lat, lng, date);

  const latRad = lat * DEG_TO_RAD;

  // Hour angle calculations
  function hourAngle(elevation) {
    const cosH = (Math.sin(elevation * DEG_TO_RAD) - Math.sin(latRad) * Math.sin(declination)) /
      (Math.cos(latRad) * Math.cos(declination));
    if (cosH > 1) return null; // never rises (polar night)
    if (cosH < -1) return null; // never sets (midnight sun)
    return Math.acos(cosH) * RAD_TO_DEG;
  }

  const solarNoonMinutes = 720 - 4 * lng - equationOfTime;

  function timeFromAngle(angle, isSetting) {
    if (angle === null) return null;
    const minutes = solarNoonMinutes + (isSetting ? 1 : -1) * 4 * angle;
    return minutesToTimeString(minutes, date);
  }

  // Sun angles for different events
  // Sunrise/sunset: center of sun at -0.833 degrees (accounting for refraction + disk)
  const sunriseAngle = hourAngle(-0.833);
  // Civil twilight: -6 degrees
  const civilAngle = hourAngle(-6);
  // Nautical twilight: -12 degrees
  const nauticalAngle = hourAngle(-12);
  // Astronomical twilight: -18 degrees
  const astroAngle = hourAngle(-18);

  // Day length
  let dayLength = null;
  if (sunriseAngle !== null) {
    dayLength = round2(sunriseAngle * 8 / 60); // hours
  }

  // Solar noon altitude
  const solarNoonAltitude = round2((90 - Math.abs(lat - declination * RAD_TO_DEG)));

  return {
    solarNoon: minutesToTimeString(solarNoonMinutes, date),
    solarNoonAltitude: `${solarNoonAltitude} degrees`,
    sunrise: timeFromAngle(sunriseAngle, false),
    sunset: timeFromAngle(sunriseAngle, true),
    civilTwilightBegin: timeFromAngle(civilAngle, false),
    civilTwilightEnd: timeFromAngle(civilAngle, true),
    nauticalTwilightBegin: timeFromAngle(nauticalAngle, false),
    nauticalTwilightEnd: timeFromAngle(nauticalAngle, true),
    astronomicalTwilightBegin: timeFromAngle(astroAngle, false),
    astronomicalTwilightEnd: timeFromAngle(astroAngle, true),
    dayLengthHours: dayLength,
    polarCondition: sunriseAngle === null ? (lat > 0 ? (declination > 0 ? 'midnight_sun' : 'polar_night') : (declination < 0 ? 'midnight_sun' : 'polar_night')) : 'normal'
  };
}

function minutesToTimeString(totalMinutes, date) {
  if (totalMinutes === null) return null;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.floor((totalMinutes % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} UTC`;
}

// ── Health & Info ────────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'atlas-geospatial', version: '1.0.0', status: 'operational',
    endpoints: ['POST /geo/distance', 'POST /geo/geofence', 'POST /geo/elevation', 'POST /geo/sun', 'POST /analyze/route'],
    capabilities: ['haversine-distance', 'vincenty-distance', 'bearing-calculation', 'midpoint', 'ray-casting-geofence', 'elevation-lookup', 'sun-position', 'route-analysis'],
    dataPoints: { cities: cities.length }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/info', (req, res) => {
  res.json({
    id: 'atlas-geospatial', name: 'ATLAS', version: '1.0.0',
    description: 'Geospatial Intelligence Agent - distance calculations, geofencing, sun position, route analysis',
    capabilities: ['haversine-distance', 'vincenty-distance', 'bearing', 'midpoint', 'geofence', 'sun-calculations', 'route-analysis'],
    endpoints: [
      { method: 'POST', path: '/geo/distance', description: 'Haversine + Vincenty distance, bearing, midpoint' },
      { method: 'POST', path: '/geo/geofence', description: 'Ray-casting point-in-polygon test' },
      { method: 'POST', path: '/geo/sun', description: 'Sunrise/sunset/twilight for coordinates + datetime' },
      { method: 'POST', path: '/analyze/route', description: 'Waypoint analysis with distances, bearings, travel times' }
    ],
    protocol: 'silkweb-agent/1.0'
  });
});

// ── POST /geo/distance ───────────────────────

app.post('/geo/distance', (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required (city name or {lat, lng})' });

    const origin = resolveLocation(from);
    const destination = resolveLocation(to);
    if (!origin) return res.status(400).json({ error: `Could not resolve origin: ${JSON.stringify(from)}` });
    if (!destination) return res.status(400).json({ error: `Could not resolve destination: ${JSON.stringify(to)}` });

    const haversineDist = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
    const vincentyDist = vincenty(origin.lat, origin.lng, destination.lat, destination.lng);
    const bearingDeg = bearing(origin.lat, origin.lng, destination.lat, destination.lng);
    const reverseBearing = bearing(destination.lat, destination.lng, origin.lat, origin.lng);
    const mid = midpoint(origin.lat, origin.lng, destination.lat, destination.lng);

    res.json({
      agent: 'atlas-geospatial', calculation: 'distance', timestamp: new Date().toISOString(),
      origin, destination,
      distance: {
        haversineKm: round2(haversineDist),
        haversineMiles: round2(haversineDist * 0.621371),
        vincentyKm: round2(vincentyDist),
        vincentyMiles: round2(vincentyDist * 0.621371),
        vincentyMeters: Math.round(vincentyDist * 1000),
        nauticalMiles: round2(haversineDist * 0.539957),
        differencePct: round2(Math.abs(haversineDist - vincentyDist) / haversineDist * 100)
      },
      bearing: {
        initial: round2(bearingDeg),
        reverse: round2(reverseBearing),
        cardinal: bearingToCardinal(bearingDeg)
      },
      midpoint: mid
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /geo/geofence ───────────────────────

app.post('/geo/geofence', (req, res) => {
  try {
    const { point, polygon, name } = req.body;
    if (!point || !polygon) return res.status(400).json({ error: 'point ({lat, lng}) and polygon (array of {lat, lng}) are required' });

    let resolvedPoint = point;
    if (typeof point === 'string') {
      const loc = resolveLocation(point);
      if (!loc) return res.status(400).json({ error: `Could not resolve point: ${point}` });
      resolvedPoint = { lat: loc.lat, lng: loc.lng, name: loc.name };
    }

    const inside = pointInPolygon(resolvedPoint.lat, resolvedPoint.lng, polygon);

    // Calculate distance to nearest edge
    let minDistToEdge = Infinity;
    let nearestEdge = null;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const pi = polygon[i], pj = polygon[j];
      const piLat = pi.lat !== undefined ? pi.lat : pi[0];
      const piLng = pi.lng !== undefined ? pi.lng : pi[1];
      const pjLat = pj.lat !== undefined ? pj.lat : pj[0];
      const pjLng = pj.lng !== undefined ? pj.lng : pj[1];

      // Distance from point to line segment (approximate using midpoint of segment)
      const midLat = (piLat + pjLat) / 2;
      const midLng = (piLng + pjLng) / 2;
      const d = haversine(resolvedPoint.lat, resolvedPoint.lng, midLat, midLng);
      if (d < minDistToEdge) {
        minDistToEdge = d;
        nearestEdge = { from: { lat: piLat, lng: piLng }, to: { lat: pjLat, lng: pjLng }, segmentIndex: i };
      }
    }

    // Calculate polygon area (spherical excess, approximate)
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const pi = polygon[i], pj = polygon[j];
      const lat1 = (pi.lat !== undefined ? pi.lat : pi[0]);
      const lng1 = (pi.lng !== undefined ? pi.lng : pi[1]);
      const lat2 = (pj.lat !== undefined ? pj.lat : pj[0]);
      const lng2 = (pj.lng !== undefined ? pj.lng : pj[1]);
      area += (lng2 - lng1) * DEG_TO_RAD * (2 + Math.sin(lat1 * DEG_TO_RAD) + Math.sin(lat2 * DEG_TO_RAD));
    }
    area = Math.abs(area * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2);

    res.json({
      agent: 'atlas-geospatial', calculation: 'geofence', timestamp: new Date().toISOString(),
      point: resolvedPoint,
      polygon: { vertices: polygon.length, name: name || 'unnamed', areaKm2: round2(area) },
      result: {
        inside,
        distanceToNearestEdgeKm: round2(minDistToEdge),
        nearestEdge
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /geo/elevation ─────────────────────

app.post('/geo/elevation', (req, res) => {
  try {
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: 'location required (city name or {lat, lng})' });

    const loc = resolveLocation(location);
    if (!loc) return res.status(400).json({ error: `Could not resolve location: ${JSON.stringify(location)}` });

    // If we have elevation from city data, use it directly
    if (loc.elevation !== undefined && loc.elevation !== null) {
      const nearby = cities
        .filter(c => c.name !== loc.name)
        .map(c => ({
          name: c.name, country: c.country,
          distanceKm: Math.round(haversine(loc.lat, loc.lng, c.lat, c.lng) * 10) / 10,
          elevation: c.elevation,
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5);

      return res.json({
        agent: 'atlas-geospatial', calculation: 'elevation', timestamp: new Date().toISOString(),
        location: loc,
        elevation: {
          meters: loc.elevation,
          feet: Math.round(loc.elevation * 3.28084),
          source: 'city-database',
          confidence: 'high',
        },
        nearbyCities: nearby,
      });
    }

    // Estimate via inverse distance weighting from nearest known cities
    const nearestCities = cities
      .map(c => ({
        name: c.name, elevation: c.elevation,
        distance: haversine(loc.lat, loc.lng, c.lat, c.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    let weightedSum = 0, weightSum = 0;
    for (const c of nearestCities) {
      const w = c.distance > 0 ? 1 / (c.distance ** 2) : 1000;
      weightedSum += c.elevation * w;
      weightSum += w;
    }
    const estimated = Math.round(weightedSum / weightSum);

    res.json({
      agent: 'atlas-geospatial', calculation: 'elevation', timestamp: new Date().toISOString(),
      location: { lat: loc.lat, lng: loc.lng, name: loc.name || 'Custom' },
      elevation: {
        meters: estimated,
        feet: Math.round(estimated * 3.28084),
        source: 'interpolated-from-nearby-cities',
        confidence: 'low',
      },
      basedOn: nearestCities.map(c => ({
        city: c.name, elevation: c.elevation,
        distanceKm: Math.round(c.distance * 10) / 10,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /geo/sun ────────────────────────────

app.post('/geo/sun', (req, res) => {
  try {
    const { location, date: dateStr } = req.body;
    if (!location) return res.status(400).json({ error: 'location required (city name or {lat, lng})' });

    const loc = resolveLocation(location);
    if (!loc) return res.status(400).json({ error: `Could not resolve location: ${JSON.stringify(location)}` });

    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date format' });

    const sunTimes = calculateSunTimes(loc.lat, loc.lng, date);

    res.json({
      agent: 'atlas-geospatial', calculation: 'sun', timestamp: new Date().toISOString(),
      location: loc,
      date: date.toISOString().split('T')[0],
      sun: sunTimes
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /analyze/route ──────────────────────

app.post('/analyze/route', (req, res) => {
  try {
    const { waypoints, speed } = req.body;
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: 'waypoints array required (min 2 points). Each: city name or {lat, lng}' });
    }

    const resolvedPoints = [];
    for (let i = 0; i < waypoints.length; i++) {
      const loc = resolveLocation(waypoints[i]);
      if (!loc) return res.status(400).json({ error: `Could not resolve waypoint ${i}: ${JSON.stringify(waypoints[i])}` });
      resolvedPoints.push(loc);
    }

    const speedKmh = speed || 100; // default 100 km/h
    const legs = [];
    let totalDistanceKm = 0;
    let totalTimeHours = 0;

    for (let i = 0; i < resolvedPoints.length - 1; i++) {
      const from = resolvedPoints[i];
      const to = resolvedPoints[i + 1];
      const dist = vincenty(from.lat, from.lng, to.lat, to.lng);
      const bearingDeg = bearing(from.lat, from.lng, to.lat, to.lng);
      const mid = midpoint(from.lat, from.lng, to.lat, to.lng);
      const timeHours = dist / speedKmh;

      totalDistanceKm += dist;
      totalTimeHours += timeHours;

      legs.push({
        leg: i + 1,
        from: { name: from.name, lat: from.lat, lng: from.lng },
        to: { name: to.name, lat: to.lat, lng: to.lng },
        distanceKm: round2(dist),
        distanceMiles: round2(dist * 0.621371),
        bearing: round2(bearingDeg),
        cardinalDirection: bearingToCardinal(bearingDeg),
        midpoint: mid,
        travelTimeHours: round2(timeHours),
        travelTimeFormatted: formatDuration(timeHours)
      });
    }

    // Elevation profile (if available)
    const elevationProfile = resolvedPoints
      .filter(p => p.elevation !== undefined)
      .map(p => ({ name: p.name, elevation: p.elevation }));

    const maxElevation = elevationProfile.length > 0 ? Math.max(...elevationProfile.map(e => e.elevation)) : null;
    const minElevation = elevationProfile.length > 0 ? Math.min(...elevationProfile.map(e => e.elevation)) : null;

    // Straight-line distance (first to last)
    const straightLineKm = vincenty(resolvedPoints[0].lat, resolvedPoints[0].lng,
      resolvedPoints[resolvedPoints.length - 1].lat, resolvedPoints[resolvedPoints.length - 1].lng);
    const detourRatio = straightLineKm > 0 ? round2(totalDistanceKm / straightLineKm) : 1;

    res.json({
      agent: 'atlas-geospatial', analysis: 'route', timestamp: new Date().toISOString(),
      waypoints: resolvedPoints.map(p => ({ name: p.name, lat: p.lat, lng: p.lng, country: p.country })),
      legs,
      summary: {
        totalWaypoints: resolvedPoints.length,
        totalLegs: legs.length,
        totalDistanceKm: round2(totalDistanceKm),
        totalDistanceMiles: round2(totalDistanceKm * 0.621371),
        straightLineKm: round2(straightLineKm),
        detourRatio,
        speedKmh: speedKmh,
        totalTravelTimeHours: round2(totalTimeHours),
        totalTravelTimeFormatted: formatDuration(totalTimeHours),
        elevationRange: maxElevation !== null ? { min: minElevation, max: maxElevation, gain: maxElevation - minElevation } : null
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h ${m}m`;
  }
  return `${h}h ${m}m`;
}

// ── A2A Protocol ─────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'ATLAS Geospatial Agent', description: 'Geospatial intelligence - distance calculations, geofencing, sun position, route analysis',
    version: '1.0.0', protocol: 'a2a',
    capabilities: ['haversine-distance', 'vincenty-distance', 'bearing', 'midpoint', 'geofence', 'elevation-lookup', 'sun-calculations', 'route-analysis'],
    endpoints: { base: `http://localhost:${PORT}`, health: '/health', geo: ['/geo/distance', '/geo/geofence', '/geo/elevation', '/geo/sun', '/analyze/route'] },
    tags: ['geospatial', 'distance', 'geofence', 'sun', 'routing', 'silkweb']
  });
});

// ── Error handling ───────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start server ─────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   ATLAS Geospatial Agent                ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /geo/distance                    ║
  ║   POST /geo/geofence                    ║
  ║   POST /geo/sun                         ║
  ║   POST /analyze/route                   ║
  ║                                         ║
  ║   Data: ${cities.length} cities                       ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
