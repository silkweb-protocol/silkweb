# AEGIS — Cybersecurity Threat Intelligence Agent

SilkWeb security agent that performs real HTTP header analysis, SSL certificate inspection, DNS security checks, and domain reputation scoring.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /scan/url | Analyze HTTP headers for security issues (CSP, HSTS, X-Frame-Options, etc.) |
| POST | /scan/ssl | Inspect SSL certificate, protocol version, cipher strength (grades A-F) |
| POST | /scan/domain | Check DNS records, SPF, DMARC, domain reputation |
| POST | /report | Comprehensive security assessment combining all scans |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3003

curl -X POST http://localhost:3003/scan/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Port: 3003
