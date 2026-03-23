// ─────────────────────────────────────────────
// SilkWeb SENTINEL — IT Infrastructure Monitoring Agent
// Real HTTP checks, DNS resolution, SSL expiry, log analysis, incident classification
// ─────────────────────────────────────────────

const express = require('express');
const https = require('https');
const http = require('http');
const tls = require('tls');
const dns = require('dns');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json({ limit: '2mb' }));

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

// ── Health & Info ────────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'sentinel-ops', version: '1.0.0', status: 'operational',
    endpoints: ['POST /monitor/health', 'POST /monitor/dns', 'POST /monitor/ssl-expiry', 'POST /analyze/logs', 'POST /analyze/incident'],
    capabilities: ['http-health-check', 'dns-resolution', 'ssl-expiry-monitoring', 'log-analysis', 'incident-classification']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/info', (req, res) => {
  res.json({
    id: 'sentinel-ops', name: 'SENTINEL', version: '1.0.0',
    description: 'IT Infrastructure Monitoring Agent - health checks, DNS monitoring, SSL expiry tracking, log analysis, incident classification',
    capabilities: ['http-health-check', 'dns-resolution', 'ssl-expiry-monitoring', 'log-analysis', 'incident-classification'],
    endpoints: [
      { method: 'POST', path: '/monitor/health', description: 'HTTP health check with response time' },
      { method: 'POST', path: '/monitor/dns', description: 'DNS resolution across multiple resolvers' },
      { method: 'POST', path: '/monitor/ssl-expiry', description: 'SSL cert expiry check for domain list' },
      { method: 'POST', path: '/analyze/logs', description: 'Parse log lines, detect patterns, count severities' },
      { method: 'POST', path: '/analyze/incident', description: 'Classify incidents P1-P4, suggest root causes' }
    ],
    protocol: 'silkweb-agent/1.0'
  });
});

// ── Utility: HTTP check ──────────────────────

function httpCheck(targetUrl, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(targetUrl, { timeout: timeoutMs, rejectUnauthorized: false }, (resp) => {
        let body = '';
        resp.on('data', chunk => { body += chunk.toString().substring(0, 1000); });
        resp.on('end', () => {
          const elapsed = Date.now() - start;
          resolve({
            url: targetUrl, status: 'up', statusCode: resp.statusCode,
            responseTimeMs: elapsed, headers: {
              server: resp.headers['server'] || null,
              contentType: resp.headers['content-type'] || null,
              cacheControl: resp.headers['cache-control'] || null,
              xPoweredBy: resp.headers['x-powered-by'] || null,
            },
            bodyPreview: body.substring(0, 200),
            tlsProtocol: resp.socket && resp.socket.getProtocol ? resp.socket.getProtocol() : null
          });
        });
      });
      req.on('error', (err) => {
        resolve({ url: targetUrl, status: 'down', error: err.message, responseTimeMs: Date.now() - start });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ url: targetUrl, status: 'timeout', error: 'Request timed out', responseTimeMs: timeoutMs });
      });
    } catch (err) {
      resolve({ url: targetUrl, status: 'error', error: err.message, responseTimeMs: Date.now() - start });
    }
  });
}

// ── POST /monitor/health ─────────────────────

app.post('/monitor/health', async (req, res) => {
  try {
    const { url, urls, timeout = 10000 } = req.body;
    if (!url && !urls) return res.status(400).json({ error: 'url or urls array required' });

    const targets = urls || [url];
    const normalizedTargets = targets.map(u => u.startsWith('http') ? u : 'https://' + u);

    const results = await Promise.all(normalizedTargets.map(u => httpCheck(u, timeout)));

    const summary = {
      total: results.length,
      up: results.filter(r => r.status === 'up').length,
      down: results.filter(r => r.status === 'down').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      avgResponseTimeMs: Math.round(results.filter(r => r.status === 'up').reduce((s, r) => s + r.responseTimeMs, 0) / (results.filter(r => r.status === 'up').length || 1))
    };

    // Performance grading
    const avgMs = summary.avgResponseTimeMs;
    let performanceGrade;
    if (avgMs < 200) performanceGrade = 'excellent';
    else if (avgMs < 500) performanceGrade = 'good';
    else if (avgMs < 1000) performanceGrade = 'acceptable';
    else if (avgMs < 3000) performanceGrade = 'slow';
    else performanceGrade = 'critical';

    res.json({
      agent: 'sentinel-ops', check: 'health', timestamp: new Date().toISOString(),
      summary: { ...summary, performanceGrade },
      results
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /monitor/dns ────────────────────────

function dnsResolveWithResolver(hostname, type, serverIp) {
  return new Promise((resolve) => {
    const resolver = new dns.Resolver();
    resolver.setServers([serverIp]);
    const start = Date.now();
    const callback = (err, records) => {
      const elapsed = Date.now() - start;
      if (err) resolve({ server: serverIp, type, error: err.code || err.message, responseTimeMs: elapsed, records: [] });
      else resolve({ server: serverIp, type, records, responseTimeMs: elapsed });
    };
    switch (type) {
      case 'A': resolver.resolve4(hostname, callback); break;
      case 'AAAA': resolver.resolve6(hostname, callback); break;
      case 'MX': resolver.resolveMx(hostname, callback); break;
      case 'NS': resolver.resolveNs(hostname, callback); break;
      case 'TXT': resolver.resolveTxt(hostname, callback); break;
      case 'CNAME': resolver.resolveCname(hostname, callback); break;
      case 'SOA': resolver.resolveSoa(hostname, callback); break;
      default: resolve({ server: serverIp, type, error: 'Unsupported type', records: [] });
    }
  });
}

const DNS_RESOLVERS = {
  'Google Primary': '8.8.8.8',
  'Google Secondary': '8.8.4.4',
  'Cloudflare Primary': '1.1.1.1',
  'Cloudflare Secondary': '1.0.0.1',
  'Quad9': '9.9.9.9',
  'OpenDNS': '208.67.222.222'
};

app.post('/monitor/dns', async (req, res) => {
  try {
    const { domain, types = ['A', 'AAAA', 'MX', 'NS'], resolvers } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain is required' });

    const hostname = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const resolverMap = resolvers || DNS_RESOLVERS;
    const resolverEntries = typeof resolverMap === 'object' && !Array.isArray(resolverMap)
      ? Object.entries(resolverMap)
      : Object.entries(DNS_RESOLVERS);

    const allResults = {};
    for (const type of types) {
      const typeResults = await Promise.all(
        resolverEntries.map(async ([name, ip]) => {
          const result = await dnsResolveWithResolver(hostname, type, ip);
          return { resolverName: name, ...result };
        })
      );
      allResults[type] = typeResults;
    }

    // Consistency check - do all resolvers agree on A records?
    const aResults = allResults['A'] || [];
    const aRecordSets = aResults.filter(r => !r.error).map(r => JSON.stringify(r.records.sort()));
    const consistent = new Set(aRecordSets).size <= 1;

    // Propagation check
    const resolversWithRecords = aResults.filter(r => !r.error && r.records.length > 0).length;
    const propagation = resolverEntries.length > 0
      ? Math.round((resolversWithRecords / resolverEntries.length) * 100)
      : 0;

    res.json({
      agent: 'sentinel-ops', check: 'dns', target: hostname, timestamp: new Date().toISOString(),
      resolvers: resolverEntries.map(([name, ip]) => ({ name, ip })),
      results: allResults,
      analysis: {
        consistent,
        propagationPercent: propagation,
        avgResponseTimeMs: Math.round(
          aResults.reduce((s, r) => s + r.responseTimeMs, 0) / (aResults.length || 1)
        ),
        status: consistent && propagation === 100 ? 'healthy' :
          propagation >= 50 ? 'partial' : 'degraded'
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /monitor/ssl-expiry ─────────────────

function checkSSLExpiry(hostname, port = 443) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = tls.connect({ host: hostname, port, rejectUnauthorized: false, timeout: 10000 }, () => {
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      socket.destroy();

      if (!cert || !cert.valid_to) {
        return resolve({ hostname, status: 'error', error: 'No certificate returned', responseTimeMs: Date.now() - start });
      }

      const validTo = new Date(cert.valid_to);
      const validFrom = new Date(cert.valid_from);
      const now = new Date();
      const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

      let status, severity;
      if (daysUntilExpiry < 0) { status = 'expired'; severity = 'critical'; }
      else if (daysUntilExpiry <= 7) { status = 'critical'; severity = 'critical'; }
      else if (daysUntilExpiry <= 14) { status = 'warning'; severity = 'high'; }
      else if (daysUntilExpiry <= 30) { status = 'attention'; severity = 'medium'; }
      else if (daysUntilExpiry <= 90) { status = 'monitor'; severity = 'low'; }
      else { status = 'healthy'; severity = 'info'; }

      resolve({
        hostname, status, severity, daysUntilExpiry,
        validFrom: validFrom.toISOString(), validTo: validTo.toISOString(),
        issuer: cert.issuer ? (cert.issuer.O || cert.issuer.CN || 'Unknown') : 'Unknown',
        subject: cert.subject ? (cert.subject.CN || 'Unknown') : 'Unknown',
        protocol, responseTimeMs: Date.now() - start
      });
    });
    socket.on('error', (err) => {
      resolve({ hostname, status: 'error', error: err.message, responseTimeMs: Date.now() - start });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ hostname, status: 'timeout', error: 'Connection timed out', responseTimeMs: Date.now() - start });
    });
  });
}

app.post('/monitor/ssl-expiry', async (req, res) => {
  try {
    const { domain, domains } = req.body;
    if (!domain && !domains) return res.status(400).json({ error: 'domain or domains array required' });

    const targets = domains || [domain];
    const hostnames = targets.map(d => d.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]);

    const results = await Promise.all(hostnames.map(h => checkSSLExpiry(h)));

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      expiringSoon: results.filter(r => ['attention', 'warning', 'critical'].includes(r.status)).length,
      expired: results.filter(r => r.status === 'expired').length,
      errors: results.filter(r => r.status === 'error' || r.status === 'timeout').length,
      nextExpiry: results.filter(r => r.daysUntilExpiry !== undefined)
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)[0] || null
    };

    res.json({
      agent: 'sentinel-ops', check: 'ssl-expiry', timestamp: new Date().toISOString(),
      summary, results
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /analyze/logs ───────────────────────

const LOG_PATTERNS = [
  { pattern: /\b(FATAL|CRITICAL)\b/i, severity: 'critical', category: 'fatal' },
  { pattern: /\bERROR\b/i, severity: 'error', category: 'error' },
  { pattern: /\b(WARN|WARNING)\b/i, severity: 'warning', category: 'warning' },
  { pattern: /\bINFO\b/i, severity: 'info', category: 'info' },
  { pattern: /\bDEBUG\b/i, severity: 'debug', category: 'debug' },
  { pattern: /\bTRACE\b/i, severity: 'trace', category: 'trace' },
  { pattern: /OutOfMemory|OOM|heap\s*space/i, severity: 'critical', category: 'memory' },
  { pattern: /StackOverflow/i, severity: 'critical', category: 'stack-overflow' },
  { pattern: /connection\s*(refused|reset|timed?\s*out)/i, severity: 'error', category: 'connection' },
  { pattern: /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND/i, severity: 'error', category: 'network' },
  { pattern: /SIGKILL|SIGTERM|SIGSEGV/i, severity: 'critical', category: 'signal' },
  { pattern: /permission\s*denied|access\s*denied|unauthorized|403\s*forbidden/i, severity: 'warning', category: 'auth' },
  { pattern: /disk\s*(full|space)|no\s*space\s*left/i, severity: 'critical', category: 'disk' },
  { pattern: /deadlock|lock\s*timeout/i, severity: 'error', category: 'concurrency' },
  { pattern: /\b5\d{2}\b.*\b(error|fail)/i, severity: 'error', category: 'http-5xx' },
  { pattern: /\b4\d{2}\b.*\b(error|not\s*found)/i, severity: 'warning', category: 'http-4xx' },
  { pattern: /timeout|timed?\s*out/i, severity: 'warning', category: 'timeout' },
  { pattern: /exception|traceback|panic/i, severity: 'error', category: 'exception' },
  { pattern: /retry|retrying|attempt\s*\d+/i, severity: 'warning', category: 'retry' },
  { pattern: /deprecated/i, severity: 'info', category: 'deprecation' },
  { pattern: /certificate\s*(expir|invalid|untrusted)/i, severity: 'warning', category: 'certificate' },
  { pattern: /CPU\s*(usage|load)\s*(over|above|exceed|>\s*)\s*\d{2}/i, severity: 'warning', category: 'cpu' },
  { pattern: /memory\s*(usage|utilization)\s*(over|above|exceed|>\s*)\s*\d{2}/i, severity: 'warning', category: 'memory-usage' },
];

// Parse timestamp from common log formats
function parseTimestamp(line) {
  // ISO 8601
  const iso = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  if (iso) return iso[0];
  // Common log format date
  const clf = line.match(/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}/);
  if (clf) return clf[0];
  // Syslog-style
  const syslog = line.match(/\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/);
  if (syslog) return syslog[0];
  return null;
}

app.post('/analyze/logs', (req, res) => {
  try {
    const { logs, format } = req.body;
    if (!logs) return res.status(400).json({ error: 'logs is required (string or array of strings)' });

    const lines = Array.isArray(logs) ? logs : logs.split('\n').filter(l => l.trim());
    const totalLines = lines.length;

    const severityCounts = { critical: 0, error: 0, warning: 0, info: 0, debug: 0, trace: 0, unknown: 0 };
    const categoryCounts = {};
    const findings = [];
    const errorLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let matched = false;
      const lineFindings = [];

      for (const pat of LOG_PATTERNS) {
        if (pat.pattern.test(line)) {
          matched = true;
          if (severityCounts[pat.severity] !== undefined) severityCounts[pat.severity]++;
          categoryCounts[pat.category] = (categoryCounts[pat.category] || 0) + 1;
          lineFindings.push({ severity: pat.severity, category: pat.category });

          if (['critical', 'error'].includes(pat.severity)) {
            errorLines.push({ lineNumber: i + 1, text: line.substring(0, 300), severity: pat.severity, category: pat.category, timestamp: parseTimestamp(line) });
          }
        }
      }

      if (!matched) severityCounts.unknown++;
    }

    // Detect error bursts (3+ errors within 5 consecutive lines)
    const bursts = [];
    let burstStart = null;
    let burstCount = 0;
    for (let i = 0; i < errorLines.length - 1; i++) {
      if (errorLines[i + 1].lineNumber - errorLines[i].lineNumber <= 5) {
        if (burstStart === null) { burstStart = errorLines[i].lineNumber; burstCount = 1; }
        burstCount++;
      } else {
        if (burstCount >= 3) bursts.push({ startLine: burstStart, errorCount: burstCount });
        burstStart = null; burstCount = 0;
      }
    }
    if (burstCount >= 3) bursts.push({ startLine: burstStart, errorCount: burstCount });

    // Top error categories
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    // Error rate
    const errorTotal = severityCounts.critical + severityCounts.error;
    const errorRate = totalLines > 0 ? Math.round((errorTotal / totalLines) * 10000) / 100 : 0;

    let healthStatus;
    if (severityCounts.critical > 0 || errorRate > 10) healthStatus = 'critical';
    else if (errorRate > 5) healthStatus = 'degraded';
    else if (errorRate > 1) healthStatus = 'warning';
    else healthStatus = 'healthy';

    res.json({
      agent: 'sentinel-ops', analysis: 'logs', timestamp: new Date().toISOString(),
      summary: {
        totalLines, healthStatus, errorRate: `${errorRate}%`,
        severityCounts, topCategories,
        errorBursts: bursts.length > 0 ? bursts : 'none detected'
      },
      criticalErrors: errorLines.filter(e => e.severity === 'critical').slice(0, 20),
      errors: errorLines.filter(e => e.severity === 'error').slice(0, 20),
      recommendations: generateLogRecommendations(severityCounts, categoryCounts, bursts, errorRate)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function generateLogRecommendations(severities, categories, bursts, errorRate) {
  const recs = [];
  if (severities.critical > 0) recs.push({ priority: 'P1', action: `${severities.critical} critical errors detected - immediate investigation required` });
  if (categories.memory || categories['memory-usage']) recs.push({ priority: 'P1', action: 'Memory issues detected - check for leaks, increase heap size, or scale horizontally' });
  if (categories.disk) recs.push({ priority: 'P1', action: 'Disk space issues detected - free space or expand volumes' });
  if (categories.connection || categories.network) recs.push({ priority: 'P2', action: 'Network connectivity issues - check upstream services, firewall rules, DNS resolution' });
  if (categories.concurrency) recs.push({ priority: 'P2', action: 'Deadlock/concurrency issues - review transaction isolation levels and lock ordering' });
  if (categories.timeout) recs.push({ priority: 'P2', action: 'Timeout patterns detected - check slow queries, increase timeouts, or optimize bottlenecks' });
  if (categories.auth) recs.push({ priority: 'P3', action: 'Authentication/authorization failures - review access policies and credential rotation' });
  if (categories.retry) recs.push({ priority: 'P3', action: 'Retry patterns detected - investigate root cause of transient failures' });
  if (bursts.length > 0) recs.push({ priority: 'P2', action: `${bursts.length} error burst(s) detected - indicates cascading failure pattern` });
  if (errorRate > 5) recs.push({ priority: 'P2', action: `Error rate ${errorRate}% is above threshold - investigate systemic issues` });
  if (categories.deprecation) recs.push({ priority: 'P4', action: 'Deprecation warnings found - plan migration to updated APIs/libraries' });
  if (categories.certificate) recs.push({ priority: 'P3', action: 'Certificate issues detected - verify and renew certificates' });
  return recs;
}

// ── POST /analyze/incident ───────────────────

const INCIDENT_PATTERNS = {
  'Service Down / Outage': {
    keywords: ['down', 'outage', 'unreachable', 'offline', 'not responding', 'connection refused', '503', '502', 'no response'],
    defaultPriority: 'P1',
    rootCauses: ['Server crash or OOM kill', 'Load balancer misconfiguration', 'DNS resolution failure', 'Network partition', 'Deployment failure', 'Dependency outage'],
    mitigations: ['Check server status and restart if needed', 'Verify load balancer health checks', 'Check DNS records', 'Review recent deployments for rollback', 'Check dependency status pages']
  },
  'Performance Degradation': {
    keywords: ['slow', 'latency', 'timeout', 'high response time', 'degraded', 'performance', 'lag', 'bottleneck'],
    defaultPriority: 'P2',
    rootCauses: ['Database query slowdown', 'Memory pressure / GC pauses', 'CPU saturation', 'Network congestion', 'Cache miss storm', 'Connection pool exhaustion'],
    mitigations: ['Check database slow query log', 'Monitor CPU and memory utilization', 'Review application thread dumps', 'Check cache hit rates', 'Scale horizontally if needed']
  },
  'Data Loss / Corruption': {
    keywords: ['data loss', 'corruption', 'missing data', 'inconsistent', 'truncated', 'integrity'],
    defaultPriority: 'P1',
    rootCauses: ['Disk failure', 'Replication lag', 'Race condition in writes', 'Backup restoration error', 'Schema migration failure'],
    mitigations: ['Stop writes to prevent further damage', 'Check replication status', 'Restore from latest known good backup', 'Audit recent schema changes', 'Enable write-ahead logging']
  },
  'Security Incident': {
    keywords: ['breach', 'unauthorized', 'attack', 'exploit', 'injection', 'phishing', 'malware', 'compromised', 'suspicious'],
    defaultPriority: 'P1',
    rootCauses: ['Credential compromise', 'Unpatched vulnerability', 'SQL/command injection', 'Social engineering', 'Insider threat', 'Misconfigured access controls'],
    mitigations: ['Isolate affected systems', 'Rotate all credentials', 'Enable enhanced logging', 'Notify security team', 'Preserve forensic evidence', 'Review access logs']
  },
  'Deployment Failure': {
    keywords: ['deploy', 'release', 'rollback', 'build failed', 'pipeline', 'CI/CD', 'migration failed'],
    defaultPriority: 'P2',
    rootCauses: ['Failed health check post-deploy', 'Database migration error', 'Configuration mismatch', 'Incompatible dependency version', 'Insufficient resources for new version'],
    mitigations: ['Initiate rollback to last known good version', 'Check deployment logs', 'Verify environment configuration', 'Run database migration status check', 'Review resource quotas']
  },
  'Resource Exhaustion': {
    keywords: ['disk full', 'out of memory', 'OOM', 'quota exceeded', 'limit reached', 'capacity', 'exhausted', 'no space'],
    defaultPriority: 'P2',
    rootCauses: ['Log file growth', 'Memory leak', 'Connection leak', 'Uncontrolled data growth', 'Missing cleanup cron jobs'],
    mitigations: ['Free disk space (compress/delete old logs)', 'Restart service to reclaim memory', 'Increase resource limits', 'Enable log rotation', 'Add monitoring alerts for thresholds']
  },
  'Network Issue': {
    keywords: ['network', 'DNS', 'firewall', 'routing', 'packet loss', 'connectivity', 'VPN', 'load balancer'],
    defaultPriority: 'P2',
    rootCauses: ['DNS propagation delay', 'Firewall rule change', 'BGP route leak', 'Load balancer health check failure', 'ISP outage', 'MTU mismatch'],
    mitigations: ['Test DNS resolution from multiple locations', 'Review recent firewall changes', 'Check ISP status page', 'Verify load balancer configuration', 'Run traceroute to identify hop failures']
  },
  'Configuration Error': {
    keywords: ['config', 'misconfigured', 'wrong setting', 'environment variable', 'feature flag', 'invalid config'],
    defaultPriority: 'P3',
    rootCauses: ['Manual configuration change', 'Environment variable mismatch', 'Feature flag misconfiguration', 'Certificate/secret rotation failure', 'Config file syntax error'],
    mitigations: ['Diff current config against last known good', 'Check environment variables', 'Review recent config management changes', 'Validate configuration syntax', 'Restore from config version control']
  }
};

app.post('/analyze/incident', (req, res) => {
  try {
    const { description, affectedServices, userImpact, startTime, metrics } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const descLower = description.toLowerCase();

    // Score each incident type
    const scores = [];
    for (const [type, config] of Object.entries(INCIDENT_PATTERNS)) {
      let score = 0;
      const matchedKeywords = [];
      for (const kw of config.keywords) {
        if (descLower.includes(kw)) {
          score += 1;
          matchedKeywords.push(kw);
        }
      }
      if (score > 0) scores.push({ type, score, matchedKeywords, ...config });
    }

    scores.sort((a, b) => b.score - a.score);
    const primaryClassification = scores[0] || {
      type: 'Unclassified',
      defaultPriority: 'P3',
      rootCauses: ['Insufficient information - please provide more details'],
      mitigations: ['Gather more information about the incident'],
      matchedKeywords: []
    };

    // Adjust priority based on impact
    let priority = primaryClassification.defaultPriority;
    if (userImpact) {
      const impactLower = userImpact.toLowerCase();
      if (impactLower.includes('all users') || impactLower.includes('100%') || impactLower.includes('complete')) {
        priority = 'P1';
      } else if (impactLower.includes('majority') || impactLower.includes('significant') || impactLower.includes('>50%')) {
        if (priority === 'P3' || priority === 'P4') priority = 'P2';
      }
    }

    // Calculate estimated TTR (time to resolve) in hours
    const ttrEstimates = { P1: { min: 0.5, max: 4 }, P2: { min: 1, max: 8 }, P3: { min: 4, max: 24 }, P4: { min: 8, max: 72 } };
    const ttr = ttrEstimates[priority] || ttrEstimates.P3;

    // Elapsed time if start time provided
    let elapsedMinutes = null;
    if (startTime) {
      const start = new Date(startTime);
      if (!isNaN(start.getTime())) {
        elapsedMinutes = Math.round((Date.now() - start.getTime()) / 60000);
      }
    }

    res.json({
      agent: 'sentinel-ops', analysis: 'incident', timestamp: new Date().toISOString(),
      classification: {
        type: primaryClassification.type,
        priority,
        confidence: scores.length > 0 ? Math.min(100, Math.round((primaryClassification.score / primaryClassification.keywords.length) * 100)) : 0,
        matchedKeywords: primaryClassification.matchedKeywords,
        alternativeClassifications: scores.slice(1, 3).map(s => ({ type: s.type, confidence: Math.round((s.score / s.keywords.length) * 100) }))
      },
      impact: {
        affectedServices: affectedServices || 'Not specified',
        userImpact: userImpact || 'Not specified',
        elapsedMinutes,
        severity: priority === 'P1' ? 'critical' : priority === 'P2' ? 'major' : priority === 'P3' ? 'minor' : 'low'
      },
      rootCauseAnalysis: {
        probableCauses: primaryClassification.rootCauses,
        suggestedInvestigation: [
          'Check monitoring dashboards for anomalies around incident start time',
          'Review recent changes (deployments, config updates, infrastructure changes)',
          'Check dependent service health',
          'Review application and system logs'
        ]
      },
      mitigationSteps: primaryClassification.mitigations,
      estimatedTimeToResolve: { minHours: ttr.min, maxHours: ttr.max },
      escalation: {
        shouldEscalate: priority === 'P1' || (elapsedMinutes && elapsedMinutes > 30 && priority === 'P2'),
        reason: priority === 'P1' ? 'P1 incidents require immediate escalation' :
          (elapsedMinutes && elapsedMinutes > 30) ? 'Incident open for >30 minutes without resolution' : null
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── A2A Protocol ─────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'SENTINEL Ops Agent', description: 'IT infrastructure monitoring - health checks, DNS, SSL expiry, log analysis, incident classification',
    version: '1.0.0', protocol: 'a2a',
    capabilities: ['http-health-check', 'dns-resolution', 'ssl-expiry-monitoring', 'log-analysis', 'incident-classification'],
    endpoints: { base: `http://localhost:${PORT}`, health: '/health', monitors: ['/monitor/health', '/monitor/dns', '/monitor/ssl-expiry', '/analyze/logs', '/analyze/incident'] },
    tags: ['devops', 'sre', 'monitoring', 'infrastructure', 'incident-response', 'silkweb']
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
  ║   SENTINEL Ops Agent                    ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /monitor/health                  ║
  ║   POST /monitor/dns                     ║
  ║   POST /monitor/ssl-expiry              ║
  ║   POST /analyze/logs                    ║
  ║   POST /analyze/incident                ║
  ║                                         ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
