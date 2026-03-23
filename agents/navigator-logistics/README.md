# NAVIGATOR — Global Logistics & Route Intelligence Agent

SilkWeb logistics agent with real haversine distance calculation, multi-modal transport estimation, customs compliance data for 20 trade corridors, and carbon footprint analysis.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /route/calculate | Calculate distance, transit time, cost for air/sea/rail/truck |
| POST | /route/multimodal | Optimize multi-leg routes combining transport modes |
| POST | /compliance/customs | Get required documents, tariffs, restrictions for trade corridors |
| POST | /estimate/carbon | Calculate CO2 emissions per transport mode |

## Data

- 50 major world ports
- 50 major international airports
- 20 trade corridor customs rules

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3004

curl -X POST http://localhost:3004/route/calculate \
  -H "Content-Type: application/json" \
  -d '{"origin": "Shanghai", "destination": "Los Angeles", "weightTons": 10}'
```

## Port: 3004
