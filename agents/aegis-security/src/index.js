// ─────────────────────────────────────────────
// SilkWeb AEGIS — Cybersecurity Threat Intelligence Agent
// Real security scanning: headers, SSL, DNS, domain reputation
// ─────────────────────────────────────────────

const express = require('express');
const https = require('https');
const http = require('http');
const tls = require('tls');
const dns = require('dns');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json({ limit: '1mb' }));

// ─── Load data ───────────────────────────────

const securityHeaders = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'security-headers.json'), 'utf8')
);
const threatSignatures = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'threat-signatures.json'), 'utf8')
);

// ─── Rate limiter ────────────────────────────

const rateLimit = {};
function checkRate(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => t > now - windowMs);
  if (rateLimit[ip].length >= limit) return false;
  rateLimit[ip].push(now);
  return true;
}

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' });
  }
  next();
}

app.use(rateLimitMiddleware);

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'aegis-security',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /scan/url',
      'POST /scan/ssl',
      'POST /scan/domain',
      'POST /report',
    ],
    capabilities: [
      'http-header-analysis',
      'ssl-certificate-inspection',
      'dns-record-analysis',
      'domain-reputation',
      'vulnerability-detection',
      'comprehensive-security-report',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Utility: fetch URL with timeout ─────────

function fetchUrl(targetUrl, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(targetUrl, { timeout: timeoutMs, rejectUnauthorized: false }, (resp) => {
      let body = '';
      resp.on('data', chunk => { body += chunk; });
      resp.on('end', () => {
        resolve({
          statusCode: resp.statusCode,
          headers: resp.headers,
          body: body.substring(0, 50000), // limit body size
          url: targetUrl,
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// ─── POST /scan/url ──────────────────────────
// Fetches URL, analyzes HTTP headers for security issues

app.post('/scan/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    // Normalize URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const startTime = Date.now();
    const response = await fetchUrl(targetUrl);
    const responseTime = Date.now() - startTime;

    // Analyze security headers
    const headerFindings = analyzeHeaders(response.headers);

    // Check body for threat patterns
    const bodyFindings = analyzeBody(response.body);

    // Calculate overall score
    const headerScore = calculateHeaderScore(response.headers);
    const grade = scoreToGrade(headerScore);

    res.json({
      agent: 'aegis-security',
      scan: 'url',
      target: targetUrl,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      statusCode: response.statusCode,
      security: {
        grade,
        score: headerScore,
        maxScore: 100,
      },
      headers: {
        present: headerFindings.present,
        missing: headerFindings.missing,
        warnings: headerFindings.warnings,
      },
      bodyAnalysis: {
        threatPatterns: bodyFindings.length,
        findings: bodyFindings,
      },
      recommendations: generateRecommendations(headerFindings, bodyFindings),
    });
  } catch (err) {
    res.status(500).json({ error: err.message, scan: 'url' });
  }
});

function analyzeHeaders(headers) {
  const present = [];
  const missing = [];
  const warnings = [];

  // Check required headers
  for (const [headerKey, meta] of Object.entries(securityHeaders.required_headers)) {
    const value = headers[headerKey];
    if (!value) {
      missing.push({
        header: meta.name,
        severity: meta.severity,
        description: meta.description,
        recommendation: meta.recommendation,
      });
    } else {
      const entry = { header: meta.name, value, severity: 'ok' };

      // Validate HSTS max-age
      if (headerKey === 'strict-transport-security' && meta.validate) {
        const maxAgeMatch = value.match(/max-age=(\d+)/);
        if (maxAgeMatch && parseInt(maxAgeMatch[1]) < meta.validate.min_max_age) {
          entry.severity = 'warning';
          entry.warning = `max-age is ${maxAgeMatch[1]}, recommended minimum is ${meta.validate.min_max_age}`;
          warnings.push(entry);
        }
      }

      // Check CSP for dangerous values
      if (headerKey === 'content-security-policy' && meta.dangerous_values) {
        for (const dv of meta.dangerous_values) {
          if (value.includes(dv)) {
            entry.severity = 'warning';
            entry.warning = `CSP contains dangerous value: ${dv}`;
            warnings.push({ ...entry, dangerousValue: dv });
          }
        }
      }

      present.push(entry);
    }
  }

  // Check for information disclosure headers
  for (const [headerKey, meta] of Object.entries(securityHeaders.dangerous_headers)) {
    const value = headers[headerKey];
    if (value) {
      warnings.push({
        header: meta.name,
        value,
        severity: meta.severity,
        description: meta.description,
        recommendation: meta.recommendation,
      });
    }
  }

  return { present, missing, warnings };
}

function analyzeBody(body) {
  const findings = [];
  if (!body) return findings;

  for (const sig of threatSignatures.malicious_patterns) {
    try {
      const regex = new RegExp(sig.pattern, 'gi');
      const matches = body.match(regex);
      if (matches) {
        findings.push({
          pattern: sig.description,
          severity: sig.severity,
          category: sig.category,
          occurrences: matches.length,
        });
      }
    } catch (e) { /* skip invalid patterns */ }
  }

  return findings;
}

function calculateHeaderScore(headers) {
  let score = 100;
  const weights = securityHeaders.scoring.weights;

  for (const [headerKey, weight] of Object.entries(weights)) {
    if (headerKey === 'information-disclosure') {
      // Penalize for info disclosure headers
      for (const dhKey of Object.keys(securityHeaders.dangerous_headers)) {
        if (headers[dhKey]) score -= Math.floor(weight / Object.keys(securityHeaders.dangerous_headers).length);
      }
    } else if (!headers[headerKey]) {
      score -= weight;
    }
  }

  return Math.max(0, score);
}

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateRecommendations(headerFindings, bodyFindings) {
  const recs = [];

  // Priority: high severity missing headers first
  for (const m of headerFindings.missing) {
    if (m.severity === 'high') {
      recs.push({ priority: 'critical', action: m.recommendation });
    }
  }
  for (const m of headerFindings.missing) {
    if (m.severity === 'medium') {
      recs.push({ priority: 'high', action: m.recommendation });
    }
  }
  for (const m of headerFindings.missing) {
    if (m.severity === 'low') {
      recs.push({ priority: 'medium', action: m.recommendation });
    }
  }

  // Warnings
  for (const w of headerFindings.warnings) {
    if (w.recommendation) {
      recs.push({ priority: 'medium', action: w.recommendation });
    }
  }

  // Body threats
  if (bodyFindings.length > 0) {
    const highThreats = bodyFindings.filter(f => f.severity === 'high');
    if (highThreats.length > 0) {
      recs.push({
        priority: 'critical',
        action: `Found ${highThreats.length} high-severity patterns in page content. Review for XSS/injection vulnerabilities.`,
      });
    }
  }

  return recs;
}

// ─── POST /scan/ssl ──────────────────────────
// Connects to domain, checks SSL cert expiry, protocol, cipher

app.post('/scan/ssl', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain is required' });

    // Strip protocol if provided
    const hostname = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const port = 443;

    const sslResult = await inspectSSL(hostname, port);

    res.json({
      agent: 'aegis-security',
      scan: 'ssl',
      target: hostname,
      timestamp: new Date().toISOString(),
      certificate: {
        subject: sslResult.subject,
        issuer: sslResult.issuer,
        validFrom: sslResult.validFrom,
        validTo: sslResult.validTo,
        daysUntilExpiry: sslResult.daysUntilExpiry,
        serialNumber: sslResult.serialNumber,
        fingerprint: sslResult.fingerprint,
      },
      protocol: {
        version: sslResult.protocolVersion,
        cipher: sslResult.cipher,
        cipherBits: sslResult.cipherBits,
      },
      analysis: {
        grade: sslResult.grade,
        issues: sslResult.issues,
        strengths: sslResult.strengths,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, scan: 'ssl' });
  }
});

function inspectSSL(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, rejectUnauthorized: false, timeout: 10000 }, () => {
      const cert = socket.getPeerCertificate();
      const cipher = socket.getCipher();
      const protocol = socket.getProtocol();

      if (!cert || !cert.subject) {
        socket.destroy();
        return reject(new Error('No certificate returned'));
      }

      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

      const issues = [];
      const strengths = [];

      // Check expiry
      if (daysUntilExpiry < 0) {
        issues.push({ severity: 'critical', message: 'Certificate has expired' });
      } else if (daysUntilExpiry < 7) {
        issues.push({ severity: 'critical', message: `Certificate expires in ${daysUntilExpiry} days` });
      } else if (daysUntilExpiry < 30) {
        issues.push({ severity: 'high', message: `Certificate expires in ${daysUntilExpiry} days` });
      } else if (daysUntilExpiry < 90) {
        issues.push({ severity: 'medium', message: `Certificate expires in ${daysUntilExpiry} days` });
      } else {
        strengths.push(`Certificate valid for ${daysUntilExpiry} more days`);
      }

      // Check protocol
      if (protocol === 'TLSv1.3') {
        strengths.push('Using TLS 1.3 (latest)');
      } else if (protocol === 'TLSv1.2') {
        strengths.push('Using TLS 1.2 (acceptable)');
      } else if (protocol === 'TLSv1.1' || protocol === 'TLSv1') {
        issues.push({ severity: 'high', message: `Using deprecated protocol: ${protocol}` });
      } else if (protocol === 'SSLv3') {
        issues.push({ severity: 'critical', message: 'Using SSLv3 (vulnerable to POODLE)' });
      }

      // Check cipher strength
      const bits = cipher ? cipher.bits || 0 : 0;
      if (bits >= 256) {
        strengths.push(`Strong cipher: ${cipher.name} (${bits}-bit)`);
      } else if (bits >= 128) {
        strengths.push(`Adequate cipher: ${cipher.name} (${bits}-bit)`);
      } else if (bits > 0) {
        issues.push({ severity: 'high', message: `Weak cipher: ${cipher.name} (${bits}-bit)` });
      }

      // Check self-signed
      if (cert.issuer && cert.subject) {
        const issuerCN = cert.issuer.CN || '';
        const subjectCN = cert.subject.CN || '';
        if (issuerCN === subjectCN) {
          issues.push({ severity: 'medium', message: 'Certificate appears to be self-signed' });
        }
      }

      // Grade
      let grade;
      const criticalCount = issues.filter(i => i.severity === 'critical').length;
      const highCount = issues.filter(i => i.severity === 'high').length;
      if (criticalCount > 0) grade = 'F';
      else if (highCount > 0) grade = 'D';
      else if (issues.length > 0) grade = 'C';
      else if (protocol === 'TLSv1.3' && bits >= 256) grade = 'A';
      else grade = 'B';

      socket.destroy();
      resolve({
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        daysUntilExpiry,
        serialNumber: cert.serialNumber,
        fingerprint: cert.fingerprint256 || cert.fingerprint,
        protocolVersion: protocol,
        cipher: cipher ? cipher.name : 'unknown',
        cipherBits: bits,
        grade,
        issues,
        strengths,
      });
    });

    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
  });
}

// ─── POST /scan/domain ───────────────────────
// Checks DNS records (MX, SPF, DMARC, DNSSEC), domain reputation

app.post('/scan/domain', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain is required' });

    const hostname = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

    const [mxRecords, txtRecords, nsRecords, aRecords] = await Promise.allSettled([
      dnsResolve(hostname, 'MX'),
      dnsResolve(hostname, 'TXT'),
      dnsResolve(hostname, 'NS'),
      dnsResolve(hostname, 'A'),
    ]);

    const mx = mxRecords.status === 'fulfilled' ? mxRecords.value : [];
    const txt = txtRecords.status === 'fulfilled' ? txtRecords.value : [];
    const ns = nsRecords.status === 'fulfilled' ? nsRecords.value : [];
    const aRecs = aRecords.status === 'fulfilled' ? aRecords.value : [];

    // Parse TXT records for SPF and DMARC
    const spfRecord = txt.find(r => {
      const val = Array.isArray(r) ? r.join('') : r;
      return val.startsWith('v=spf1');
    });

    // Check DMARC (on _dmarc subdomain)
    let dmarcRecord = null;
    try {
      const dmarcTxt = await dnsResolve(`_dmarc.${hostname}`, 'TXT');
      dmarcRecord = dmarcTxt.find(r => {
        const val = Array.isArray(r) ? r.join('') : r;
        return val.startsWith('v=DMARC1');
      });
    } catch (e) { /* no DMARC record */ }

    // Check for suspicious TLD
    const tld = '.' + hostname.split('.').pop();
    const isSuspiciousTLD = threatSignatures.suspicious_tlds.includes(tld.toLowerCase());

    // Build findings
    const findings = [];
    const score = { total: 100, deductions: [] };

    // Email security
    if (mx.length === 0) {
      findings.push({ category: 'email', severity: 'info', message: 'No MX records found (domain may not handle email)' });
    } else {
      findings.push({ category: 'email', severity: 'ok', message: `${mx.length} MX record(s) found`, records: mx });
    }

    if (!spfRecord) {
      findings.push({ category: 'email-auth', severity: 'high', message: 'No SPF record found — domain vulnerable to email spoofing' });
      score.deductions.push({ reason: 'No SPF', points: -15 });
    } else {
      const spfVal = Array.isArray(spfRecord) ? spfRecord.join('') : spfRecord;
      findings.push({ category: 'email-auth', severity: 'ok', message: 'SPF record present', value: spfVal });
      if (spfVal.includes('+all')) {
        findings.push({ category: 'email-auth', severity: 'high', message: 'SPF uses +all (allows any server to send)' });
        score.deductions.push({ reason: 'SPF +all', points: -20 });
      }
    }

    if (!dmarcRecord) {
      findings.push({ category: 'email-auth', severity: 'high', message: 'No DMARC record found — email authentication incomplete' });
      score.deductions.push({ reason: 'No DMARC', points: -15 });
    } else {
      const dmarcVal = Array.isArray(dmarcRecord) ? dmarcRecord.join('') : dmarcRecord;
      findings.push({ category: 'email-auth', severity: 'ok', message: 'DMARC record present', value: dmarcVal });
      if (dmarcVal.includes('p=none')) {
        findings.push({ category: 'email-auth', severity: 'medium', message: 'DMARC policy is "none" (monitoring only, not enforcing)' });
        score.deductions.push({ reason: 'DMARC p=none', points: -5 });
      }
    }

    // Nameservers
    if (ns.length === 0) {
      findings.push({ category: 'dns', severity: 'high', message: 'No NS records found' });
      score.deductions.push({ reason: 'No NS records', points: -10 });
    } else if (ns.length === 1) {
      findings.push({ category: 'dns', severity: 'medium', message: 'Only 1 nameserver (no redundancy)' });
      score.deductions.push({ reason: 'Single NS', points: -5 });
    } else {
      findings.push({ category: 'dns', severity: 'ok', message: `${ns.length} nameservers found`, records: ns });
    }

    // Suspicious TLD
    if (isSuspiciousTLD) {
      findings.push({ category: 'reputation', severity: 'high', message: `Domain uses suspicious TLD: ${tld}` });
      score.deductions.push({ reason: 'Suspicious TLD', points: -20 });
    }

    // Check breach database
    const breach = threatSignatures.breach_database[hostname];
    if (breach) {
      findings.push({
        category: 'reputation',
        severity: 'critical',
        message: `Domain found in breach database: ${breach.records.toLocaleString()} records exposed on ${breach.date}`,
        dataTypes: breach.data_types,
      });
      score.deductions.push({ reason: 'Known breach', points: -25 });
    }

    const totalDeductions = score.deductions.reduce((sum, d) => sum + d.points, 0);
    const finalScore = Math.max(0, score.total + totalDeductions);

    res.json({
      agent: 'aegis-security',
      scan: 'domain',
      target: hostname,
      timestamp: new Date().toISOString(),
      dns: {
        a: aRecs,
        mx: mx,
        ns: ns,
        spf: spfRecord ? (Array.isArray(spfRecord) ? spfRecord.join('') : spfRecord) : null,
        dmarc: dmarcRecord ? (Array.isArray(dmarcRecord) ? dmarcRecord.join('') : dmarcRecord) : null,
      },
      reputation: {
        score: finalScore,
        grade: scoreToGrade(finalScore),
        suspiciousTLD: isSuspiciousTLD,
        knownBreach: breach || null,
      },
      findings,
      scoring: { score: finalScore, deductions: score.deductions },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, scan: 'domain' });
  }
});

function dnsResolve(hostname, type) {
  return new Promise((resolve, reject) => {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    switch (type) {
      case 'MX': resolver.resolveMx(hostname, (err, records) => err ? reject(err) : resolve(records)); break;
      case 'TXT': resolver.resolveTxt(hostname, (err, records) => err ? reject(err) : resolve(records)); break;
      case 'NS': resolver.resolveNs(hostname, (err, records) => err ? reject(err) : resolve(records)); break;
      case 'A': resolver.resolve4(hostname, (err, records) => err ? reject(err) : resolve(records)); break;
      case 'AAAA': resolver.resolve6(hostname, (err, records) => err ? reject(err) : resolve(records)); break;
      default: reject(new Error(`Unsupported DNS type: ${type}`));
    }
  });
}

// ─── POST /report ────────────────────────────
// Comprehensive security assessment — runs all scans

app.post('/report', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain is required' });

    const hostname = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const targetUrl = `https://${hostname}`;

    const startTime = Date.now();

    // Run all scans in parallel
    const [urlScan, sslScan, domainScan] = await Promise.allSettled([
      (async () => {
        const response = await fetchUrl(targetUrl);
        const headerFindings = analyzeHeaders(response.headers);
        const bodyFindings = analyzeBody(response.body);
        const headerScore = calculateHeaderScore(response.headers);
        return { statusCode: response.statusCode, headerFindings, bodyFindings, headerScore, grade: scoreToGrade(headerScore) };
      })(),
      inspectSSL(hostname),
      (async () => {
        const [mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
          dnsResolve(hostname, 'MX'),
          dnsResolve(hostname, 'TXT'),
          dnsResolve(hostname, 'NS'),
        ]);
        const txt = txtRecords.status === 'fulfilled' ? txtRecords.value : [];
        const spf = txt.find(r => (Array.isArray(r) ? r.join('') : r).startsWith('v=spf1'));
        let dmarc = null;
        try {
          const dt = await dnsResolve(`_dmarc.${hostname}`, 'TXT');
          dmarc = dt.find(r => (Array.isArray(r) ? r.join('') : r).startsWith('v=DMARC1'));
        } catch (e) {}
        return {
          mx: mxRecords.status === 'fulfilled' ? mxRecords.value : [],
          ns: nsRecords.status === 'fulfilled' ? nsRecords.value : [],
          spf: spf ? (Array.isArray(spf) ? spf.join('') : spf) : null,
          dmarc: dmarc ? (Array.isArray(dmarc) ? dmarc.join('') : dmarc) : null,
        };
      })(),
    ]);

    const totalTime = Date.now() - startTime;

    // Calculate overall grade
    const grades = [];
    if (urlScan.status === 'fulfilled') grades.push(urlScan.value.headerScore);
    if (sslScan.status === 'fulfilled') {
      const sslGradeMap = { A: 95, B: 80, C: 65, D: 50, F: 20 };
      grades.push(sslGradeMap[sslScan.value.grade] || 50);
    }
    const overallScore = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : 0;

    res.json({
      agent: 'aegis-security',
      scan: 'comprehensive-report',
      target: hostname,
      timestamp: new Date().toISOString(),
      scanDuration: `${totalTime}ms`,
      overall: {
        grade: scoreToGrade(overallScore),
        score: overallScore,
      },
      urlScan: urlScan.status === 'fulfilled' ? {
        status: 'completed',
        grade: urlScan.value.grade,
        score: urlScan.value.headerScore,
        missingHeaders: urlScan.value.headerFindings.missing.length,
        warnings: urlScan.value.headerFindings.warnings.length,
        threatPatterns: urlScan.value.bodyFindings.length,
      } : { status: 'failed', error: urlScan.reason?.message },
      sslScan: sslScan.status === 'fulfilled' ? {
        status: 'completed',
        grade: sslScan.value.grade,
        protocol: sslScan.value.protocolVersion,
        cipher: sslScan.value.cipher,
        daysUntilExpiry: sslScan.value.daysUntilExpiry,
        issues: sslScan.value.issues,
      } : { status: 'failed', error: sslScan.reason?.message },
      domainScan: domainScan.status === 'fulfilled' ? {
        status: 'completed',
        hasSPF: !!domainScan.value.spf,
        hasDMARC: !!domainScan.value.dmarc,
        mxCount: domainScan.value.mx.length,
        nsCount: domainScan.value.ns.length,
      } : { status: 'failed', error: domainScan.reason?.message },
      recommendations: urlScan.status === 'fulfilled'
        ? generateRecommendations(urlScan.value.headerFindings, urlScan.value.bodyFindings)
        : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message, scan: 'report' });
  }
});

// ─── POST /scan/email ────────────────────────
// Checks email domain for SPF/DKIM/DMARC, validates MX, checks breach databases

app.post('/scan/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const domain = email.split('@')[1].toLowerCase();
    let score = 100;
    const findings = [];
    const deductions = [];

    // Check MX records
    let mxRecords = [];
    try {
      mxRecords = await dnsResolve(domain, 'MX');
      findings.push({ check: 'MX Records', status: 'pass', detail: `${mxRecords.length} MX record(s) found`, records: mxRecords.slice(0, 5) });
    } catch (e) {
      findings.push({ check: 'MX Records', status: 'fail', detail: 'No MX records found - domain may not accept email' });
      score -= 20;
      deductions.push({ reason: 'No MX records', points: -20 });
    }

    // Check SPF
    let spfRecord = null;
    try {
      const txtRecords = await dnsResolve(domain, 'TXT');
      spfRecord = txtRecords.find(r => {
        const val = Array.isArray(r) ? r.join('') : r;
        return val.startsWith('v=spf1');
      });
      if (spfRecord) {
        const spfVal = Array.isArray(spfRecord) ? spfRecord.join('') : spfRecord;
        const spfIssues = [];
        if (spfVal.includes('+all')) spfIssues.push('Uses +all (allows any server to send - defeats purpose of SPF)');
        if (spfVal.includes('?all')) spfIssues.push('Uses ?all (neutral - provides no protection)');
        findings.push({ check: 'SPF Record', status: spfIssues.length > 0 ? 'warning' : 'pass', detail: spfIssues.length > 0 ? spfIssues.join('; ') : 'Valid SPF record found', value: spfVal });
        if (spfIssues.length > 0) { score -= 10; deductions.push({ reason: 'SPF configuration issue', points: -10 }); }
      } else {
        findings.push({ check: 'SPF Record', status: 'fail', detail: 'No SPF record found - domain is vulnerable to email spoofing' });
        score -= 15;
        deductions.push({ reason: 'No SPF record', points: -15 });
      }
    } catch (e) {
      findings.push({ check: 'SPF Record', status: 'fail', detail: 'Could not query TXT records' });
      score -= 15;
      deductions.push({ reason: 'No SPF record', points: -15 });
    }

    // Check DKIM (look for common selectors)
    const dkimSelectors = ['default', 'google', 'k1', 'selector1', 'selector2', 'mail', 'dkim', 's1', 's2'];
    let dkimFound = false;
    for (const selector of dkimSelectors) {
      try {
        const dkimRecords = await dnsResolve(`${selector}._domainkey.${domain}`, 'TXT');
        if (dkimRecords && dkimRecords.length > 0) {
          dkimFound = true;
          findings.push({ check: 'DKIM Record', status: 'pass', detail: `DKIM record found for selector "${selector}"`, selector });
          break;
        }
      } catch (e) { /* selector not found, try next */ }
    }
    if (!dkimFound) {
      findings.push({ check: 'DKIM Record', status: 'warning', detail: 'No DKIM records found for common selectors (may use non-standard selector)' });
      score -= 10;
      deductions.push({ reason: 'No DKIM found', points: -10 });
    }

    // Check DMARC
    let dmarcRecord = null;
    try {
      const dmarcTxt = await dnsResolve(`_dmarc.${domain}`, 'TXT');
      dmarcRecord = dmarcTxt.find(r => {
        const val = Array.isArray(r) ? r.join('') : r;
        return val.startsWith('v=DMARC1');
      });
      if (dmarcRecord) {
        const dmarcVal = Array.isArray(dmarcRecord) ? dmarcRecord.join('') : dmarcRecord;
        const dmarcIssues = [];
        if (dmarcVal.includes('p=none')) dmarcIssues.push('Policy is "none" (monitoring only, not enforcing)');
        findings.push({ check: 'DMARC Record', status: dmarcIssues.length > 0 ? 'warning' : 'pass', detail: dmarcIssues.length > 0 ? dmarcIssues.join('; ') : 'Valid DMARC record with enforcement', value: dmarcVal });
        if (dmarcIssues.length > 0) { score -= 5; deductions.push({ reason: 'DMARC not enforcing', points: -5 }); }
      } else {
        findings.push({ check: 'DMARC Record', status: 'fail', detail: 'No DMARC record found - email authentication is incomplete' });
        score -= 15;
        deductions.push({ reason: 'No DMARC record', points: -15 });
      }
    } catch (e) {
      findings.push({ check: 'DMARC Record', status: 'fail', detail: 'No DMARC record found' });
      score -= 15;
      deductions.push({ reason: 'No DMARC record', points: -15 });
    }

    // Simulated breach database check
    const knownBreaches = {
      'yahoo.com': { breached: true, date: '2013-2014', records: '3 billion', severity: 'critical' },
      'linkedin.com': { breached: true, date: '2012/2021', records: '700 million', severity: 'high' },
      'adobe.com': { breached: true, date: '2013', records: '153 million', severity: 'high' },
      'dropbox.com': { breached: true, date: '2012', records: '68 million', severity: 'high' },
      'myspace.com': { breached: true, date: '2016', records: '360 million', severity: 'critical' },
      'twitter.com': { breached: true, date: '2022', records: '200 million', severity: 'high' },
      'canva.com': { breached: true, date: '2019', records: '137 million', severity: 'high' }
    };

    const breach = knownBreaches[domain];
    if (breach) {
      findings.push({ check: 'Breach Database', status: 'fail', detail: `Domain found in breach database: ${breach.records} records exposed (${breach.date})`, severity: breach.severity });
      score -= 20;
      deductions.push({ reason: 'Known breach', points: -20 });
    } else {
      findings.push({ check: 'Breach Database', status: 'pass', detail: 'Domain not found in known breach databases (simulated check)' });
    }

    // Disposable email check
    const disposableDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'yopmail.com', 'sharklasers.com', 'grr.la', 'dispostable.com', 'trashmail.com', '10minutemail.com'];
    if (disposableDomains.includes(domain)) {
      findings.push({ check: 'Disposable Email', status: 'fail', detail: 'Domain is a known disposable/temporary email provider' });
      score -= 25;
      deductions.push({ reason: 'Disposable email domain', points: -25 });
    }

    score = Math.max(0, score);

    res.json({
      agent: 'aegis-security',
      scan: 'email',
      target: email,
      domain,
      timestamp: new Date().toISOString(),
      securityScore: {
        score,
        grade: scoreToGrade(score),
        deductions
      },
      findings,
      recommendations: findings.filter(f => f.status !== 'pass').map(f => ({
        issue: f.check,
        action: f.detail
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message, scan: 'email' });
  }
});

// ─── POST /scan/password ────────────────────
// Checks password strength (DO NOT log or store the password)

app.post('/scan/password', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password is required' });

    // NOTE: In production, password should be hashed client-side. We analyze and discard immediately.
    let score = 0;
    const findings = [];
    const recommendations = [];
    const length = password.length;

    // Length scoring
    if (length >= 16) { score += 30; findings.push({ check: 'Length', status: 'excellent', detail: `${length} characters (16+ is excellent)` }); }
    else if (length >= 12) { score += 25; findings.push({ check: 'Length', status: 'good', detail: `${length} characters (12+ is good)` }); }
    else if (length >= 8) { score += 15; findings.push({ check: 'Length', status: 'adequate', detail: `${length} characters (minimum acceptable)` }); recommendations.push('Increase password length to at least 12 characters'); }
    else { score += 5; findings.push({ check: 'Length', status: 'weak', detail: `${length} characters (too short)` }); recommendations.push('Password must be at least 8 characters, 12+ recommended'); }

    // Character class analysis
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
    const classCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

    if (classCount >= 4) { score += 25; findings.push({ check: 'Complexity', status: 'excellent', detail: 'Uses all 4 character classes (lower, upper, digits, special)' }); }
    else if (classCount >= 3) { score += 20; findings.push({ check: 'Complexity', status: 'good', detail: `Uses ${classCount} of 4 character classes` }); }
    else if (classCount >= 2) { score += 10; findings.push({ check: 'Complexity', status: 'adequate', detail: `Uses ${classCount} of 4 character classes` }); recommendations.push('Add more character types (uppercase, digits, special characters)'); }
    else { score += 5; findings.push({ check: 'Complexity', status: 'weak', detail: 'Uses only 1 character class' }); recommendations.push('Mix uppercase, lowercase, digits, and special characters'); }

    // Common password patterns
    const commonPatterns = [
      { pattern: /^(password|passwd|pass)/i, name: 'Contains "password"' },
      { pattern: /^(123456|12345678|1234567890)/i, name: 'Sequential numbers' },
      { pattern: /^(qwerty|asdfgh|zxcvbn)/i, name: 'Keyboard pattern' },
      { pattern: /^(admin|root|user|login|master)/i, name: 'Common admin term' },
      { pattern: /^(letmein|welcome|monkey|dragon|football|baseball|soccer|hockey|batman|superman)/i, name: 'Common word' },
      { pattern: /^(abc123|iloveyou|trustno1|sunshine|princess)/i, name: 'Common password' },
      { pattern: /(.)\1{3,}/i, name: 'Repeated characters (4+)' },
      { pattern: /^(0123|1234|2345|3456|4567|5678|6789|7890)/i, name: 'Sequential digits' },
      { pattern: /^(abcd|bcde|cdef|defg|efgh)/i, name: 'Sequential letters' }
    ];

    const patternMatches = [];
    for (const cp of commonPatterns) {
      if (cp.pattern.test(password)) {
        patternMatches.push(cp.name);
        score -= 10;
      }
    }

    if (patternMatches.length > 0) {
      findings.push({ check: 'Common Patterns', status: 'fail', detail: `Detected: ${patternMatches.join(', ')}` });
      recommendations.push('Avoid common words, keyboard patterns, and sequential characters');
    } else {
      score += 15;
      findings.push({ check: 'Common Patterns', status: 'pass', detail: 'No common patterns detected' });
    }

    // Dictionary word check (simple)
    const dictWords = ['password', 'hello', 'welcome', 'letmein', 'monkey', 'dragon', 'master', 'admin', 'login', 'sunshine', 'princess', 'football', 'baseball', 'shadow', 'michael', 'jennifer', 'summer', 'winter', 'spring', 'autumn', 'computer', 'internet', 'access', 'batman', 'superman', 'charlie', 'thomas', 'jessica', 'purple', 'orange', 'banana'];
    const passwordLower = password.toLowerCase();
    const dictMatches = dictWords.filter(w => passwordLower.includes(w) && w.length >= 4);
    if (dictMatches.length > 0) {
      score -= 10;
      findings.push({ check: 'Dictionary Words', status: 'warning', detail: `Contains common dictionary word(s)` });
      recommendations.push('Avoid using common dictionary words in your password');
    } else {
      score += 10;
      findings.push({ check: 'Dictionary Words', status: 'pass', detail: 'No common dictionary words detected' });
    }

    // Entropy estimation
    let charsetSize = 0;
    if (hasLower) charsetSize += 26;
    if (hasUpper) charsetSize += 26;
    if (hasDigit) charsetSize += 10;
    if (hasSpecial) charsetSize += 32;
    const entropy = Math.round(length * Math.log2(charsetSize || 1) * 10) / 10;

    if (entropy >= 60) { score += 20; findings.push({ check: 'Entropy', status: 'excellent', detail: `${entropy} bits (very strong)` }); }
    else if (entropy >= 40) { score += 15; findings.push({ check: 'Entropy', status: 'good', detail: `${entropy} bits (strong)` }); }
    else if (entropy >= 28) { score += 10; findings.push({ check: 'Entropy', status: 'adequate', detail: `${entropy} bits (moderate)` }); }
    else { score += 0; findings.push({ check: 'Entropy', status: 'weak', detail: `${entropy} bits (weak)` }); recommendations.push('Increase password length and complexity for higher entropy'); }

    // Crack time estimation (simplified)
    const guessesPerSecond = 1e10; // 10 billion guesses/sec (modern GPU)
    const possibleCombinations = Math.pow(charsetSize || 1, length);
    const secondsToCrack = possibleCombinations / guessesPerSecond / 2; // average case

    let crackTime;
    if (secondsToCrack > 3.154e+15) crackTime = 'Centuries+';
    else if (secondsToCrack > 3.154e+7) crackTime = `${Math.round(secondsToCrack / 3.154e+7)} years`;
    else if (secondsToCrack > 2.592e+6) crackTime = `${Math.round(secondsToCrack / 2.592e+6)} months`;
    else if (secondsToCrack > 86400) crackTime = `${Math.round(secondsToCrack / 86400)} days`;
    else if (secondsToCrack > 3600) crackTime = `${Math.round(secondsToCrack / 3600)} hours`;
    else if (secondsToCrack > 60) crackTime = `${Math.round(secondsToCrack / 60)} minutes`;
    else crackTime = 'Less than a minute';

    score = Math.max(0, Math.min(100, score));

    let strength;
    if (score >= 80) strength = 'Strong';
    else if (score >= 60) strength = 'Moderate';
    else if (score >= 40) strength = 'Weak';
    else strength = 'Very Weak';

    // Clear password from memory (best effort)
    // Note: in production, use secure memory handling

    res.json({
      agent: 'aegis-security',
      scan: 'password',
      timestamp: new Date().toISOString(),
      score,
      strength,
      grade: scoreToGrade(score),
      analysis: {
        length,
        characterClasses: { lowercase: hasLower, uppercase: hasUpper, digits: hasDigit, special: hasSpecial, total: classCount },
        entropy: `${entropy} bits`,
        estimatedCrackTime: crackTime,
        commonPatternsDetected: patternMatches.length > 0 ? patternMatches : 'None'
      },
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['Password meets security requirements'],
      note: 'Password was analyzed in memory and was NOT logged or stored.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, scan: 'password' });
  }
});

// ─── A2A Protocol ────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'AEGIS Security Agent',
    description: 'Cybersecurity threat intelligence — HTTP header analysis, SSL inspection, DNS security, domain reputation scoring, email security, password strength',
    version: '1.0.0',
    protocol: 'a2a',
    capabilities: [
      'http-header-analysis',
      'ssl-certificate-inspection',
      'dns-record-analysis',
      'domain-reputation',
      'vulnerability-detection',
      'comprehensive-security-report',
      'email-security-scan',
      'password-strength-analysis',
    ],
    endpoints: {
      base: `http://localhost:${PORT}`,
      health: '/health',
      scans: ['/scan/url', '/scan/ssl', '/scan/domain', '/scan/email', '/scan/password', '/report'],
    },
    tags: ['security', 'cybersecurity', 'ssl', 'dns', 'vulnerability', 'compliance', 'silkweb'],
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
  ║   AEGIS Security Agent                  ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /scan/url                        ║
  ║   POST /scan/ssl                        ║
  ║   POST /scan/domain                     ║
  ║   POST /scan/email                      ║
  ║   POST /scan/password                   ║
  ║   POST /report                          ║
  ║                                         ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
