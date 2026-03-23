# ORACLE — Financial Intelligence & Analysis Agent

SilkWeb agent for financial analysis: calculates 15+ financial ratios with health grading, evaluates partnership risk, detects fraud using Benford's law and anomaly detection, and maps regulatory compliance across 7 jurisdictions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /analyze/company | Calculate 15+ financial ratios, health score A-F |
| POST | /analyze/risk | Partnership risk score between two companies |
| POST | /detect/fraud | Benford's law, duplicate detection, anomaly flagging |
| POST | /compliance/check | Applicable regulations per jurisdiction |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3006

# Company analysis
curl -X POST http://localhost:3006/analyze/company \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Acme Corp",
    "financials": {
      "revenue": 50000000, "netIncome": 7500000, "totalAssets": 80000000,
      "currentAssets": 25000000, "currentLiabilities": 15000000,
      "totalDebt": 20000000, "shareholderEquity": 40000000,
      "costOfGoodsSold": 30000000, "operatingIncome": 10000000,
      "ebitda": 12000000, "interestExpense": 2000000
    }
  }'

# Fraud detection
curl -X POST http://localhost:3006/detect/fraud \
  -H "Content-Type: application/json" \
  -d '{"numbers": [125, 234, 156, 389, 412, 178, 523, 267, 145, 311, 489, 176, 234, 567, 123]}'

# Compliance check
curl -X POST http://localhost:3006/compliance/check \
  -H "Content-Type: application/json" \
  -d '{"jurisdictions": ["US", "EU"], "industry": "financial services", "companyType": "public"}'
```

## Port: 3006
