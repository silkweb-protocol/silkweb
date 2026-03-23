# ATLAS — Geospatial Intelligence Agent

SilkWeb agent for geospatial calculations: haversine and Vincenty distance, bearing, midpoint, ray-casting geofence tests, NOAA-based sunrise/sunset/twilight calculations, and multi-waypoint route analysis. Includes a database of 200 major cities with coordinates, elevation, and population.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /geo/distance | Haversine + Vincenty distance, bearing, midpoint |
| POST | /geo/geofence | Ray-casting point-in-polygon test |
| POST | /geo/sun | Sunrise/sunset/twilight for coordinates + datetime |
| POST | /analyze/route | Multi-waypoint route analysis |

## Data

- 200 major world cities with lat/lng/elevation/population

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3007

# Distance calculation
curl -X POST http://localhost:3007/geo/distance \
  -H "Content-Type: application/json" \
  -d '{"from": "Tokyo", "to": "New York"}'

# Geofence check
curl -X POST http://localhost:3007/geo/geofence \
  -H "Content-Type: application/json" \
  -d '{
    "point": {"lat": 40.7128, "lng": -74.006},
    "polygon": [
      {"lat": 40.9, "lng": -74.3},
      {"lat": 40.9, "lng": -73.7},
      {"lat": 40.5, "lng": -73.7},
      {"lat": 40.5, "lng": -74.3}
    ],
    "name": "NYC Metro"
  }'

# Sun position
curl -X POST http://localhost:3007/geo/sun \
  -H "Content-Type: application/json" \
  -d '{"location": "Tokyo", "date": "2026-06-21"}'

# Route analysis
curl -X POST http://localhost:3007/analyze/route \
  -H "Content-Type: application/json" \
  -d '{"waypoints": ["London", "Paris", "Berlin", "Warsaw", "Moscow"], "speed": 120}'
```

## Port: 3007
