# SENTINEL — IT Infrastructure Monitoring Agent

SilkWeb agent for real-time infrastructure monitoring: HTTP health checks, DNS resolution verification, SSL certificate expiry tracking, log analysis with pattern detection, and incident classification with root cause suggestions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /monitor/health | HTTP health check with response time, supports multiple URLs |
| POST | /monitor/dns | DNS resolution across Google, Cloudflare, Quad9, OpenDNS resolvers |
| POST | /monitor/ssl-expiry | SSL certificate expiry check for a list of domains |
| POST | /analyze/logs | Parse log lines, detect error patterns, count severities, find bursts |
| POST | /analyze/incident | Classify incidents P1-P4, suggest root causes and mitigations |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3005

# Health check
curl -X POST http://localhost:3005/monitor/health \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://google.com", "https://github.com"]}'

# DNS check
curl -X POST http://localhost:3005/monitor/dns \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "types": ["A", "MX", "NS"]}'

# SSL expiry
curl -X POST http://localhost:3005/monitor/ssl-expiry \
  -H "Content-Type: application/json" \
  -d '{"domains": ["google.com", "github.com", "expired.badssl.com"]}'

# Log analysis
curl -X POST http://localhost:3005/analyze/logs \
  -H "Content-Type: application/json" \
  -d '{"logs": "2024-01-15T10:00:00 ERROR Connection refused\n2024-01-15T10:00:01 FATAL OutOfMemoryError\n2024-01-15T10:00:02 INFO Server restarting"}'

# Incident classification
curl -X POST http://localhost:3005/analyze/incident \
  -H "Content-Type: application/json" \
  -d '{"description": "Website is down and returning 503 errors", "affectedServices": ["web", "api"], "userImpact": "All users affected"}'
```

## Port: 3005
