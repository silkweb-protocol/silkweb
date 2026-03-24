// ─────────────────────────────────────────────
// SilkWeb JUSTICE — General Legal & Contract Law Agent
// Contract analysis, NDA review, statute research, clause drafting, compliance checking
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json({ limit: '2mb' }));

const DISCLAIMER = 'This is AI-generated legal information, not legal advice. Consult a licensed attorney for advice specific to your situation.';

// ─── Load data ───────────────────────────────

const legalTerms = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'legal-terms.json'), 'utf8'));
const clauseTemplates = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'clause-templates.json'), 'utf8'));
const jurisdictions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'jurisdictions.json'), 'utf8'));

// Build lookup indexes
const termsByName = {};
for (const t of legalTerms) {
  termsByName[t.term.toLowerCase()] = t;
}
const statesByAbbr = {};
const statesByName = {};
for (const j of jurisdictions) {
  statesByAbbr[j.abbr.toUpperCase()] = j;
  statesByName[j.state.toLowerCase()] = j;
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

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'justice-legal', version: '1.0.0', status: 'operational',
    endpoints: [
      'POST /analyze/contract', 'POST /analyze/nda', 'POST /research/statute',
      'POST /draft/clause', 'POST /compliance/check'
    ],
    capabilities: [
      'contract-analysis', 'nda-review', 'statute-research',
      'clause-drafting', 'compliance-checking', 'risk-assessment'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/info', (req, res) => {
  res.json({
    id: 'justice-legal', name: 'JUSTICE', version: '1.0.0',
    description: 'General Legal & Contract Law Agent - contract analysis, NDA review, statute research, clause drafting, compliance',
    capabilities: ['contract-analysis', 'nda-review', 'statute-research', 'clause-drafting', 'compliance-checking'],
    endpoints: [
      { method: 'POST', path: '/analyze/contract', description: 'Analyze contract text for key clauses, risks, and issues' },
      { method: 'POST', path: '/analyze/nda', description: 'Specialized NDA analysis' },
      { method: 'POST', path: '/research/statute', description: 'Research statutes for a legal question in a jurisdiction' },
      { method: 'POST', path: '/draft/clause', description: 'Generate standard clause language from templates' },
      { method: 'POST', path: '/compliance/check', description: 'Check compliance requirements for a business' }
    ],
    dataLoaded: { legalTerms: legalTerms.length, clauseTemplates: Object.keys(clauseTemplates).length, jurisdictions: jurisdictions.length },
    disclaimer: DISCLAIMER
  });
});

// ─── Clause detection patterns ───────────────

const CLAUSE_PATTERNS = {
  termination: {
    patterns: [/terminat/i, /cancel/i, /end\s+(?:of\s+)?(?:this\s+)?agreement/i, /expire|expiration/i],
    label: 'Termination',
    category: 'exit'
  },
  liability: {
    patterns: [/liabilit/i, /liable/i, /limitation\s+of\s+liability/i, /cap\s+on\s+(?:damages|liability)/i],
    label: 'Liability',
    category: 'risk'
  },
  indemnification: {
    patterns: [/indemnif/i, /hold\s+harmless/i, /defend\s+and\s+indemnify/i],
    label: 'Indemnification',
    category: 'risk'
  },
  ip: {
    patterns: [/intellectual\s+property/i, /patent/i, /copyright/i, /trademark/i, /work\s+product/i, /work\s+for\s+hire/i, /ownership\s+of\s+(?:work|deliverable|invention)/i],
    label: 'Intellectual Property',
    category: 'ip'
  },
  nonCompete: {
    patterns: [/non[\s-]?compet/i, /restrictive\s+covenant/i, /covenant\s+not\s+to\s+compete/i],
    label: 'Non-Compete',
    category: 'restriction'
  },
  confidentiality: {
    patterns: [/confidential/i, /non[\s-]?disclosure/i, /proprietary\s+information/i, /trade\s+secret/i],
    label: 'Confidentiality',
    category: 'protection'
  },
  payment: {
    patterns: [/payment/i, /compensat/i, /fee[s]?\b/i, /invoice/i, /net\s+\d+/i, /remunerat/i],
    label: 'Payment Terms',
    category: 'financial'
  },
  governingLaw: {
    patterns: [/governing\s+law/i, /choice\s+of\s+law/i, /laws\s+of\s+the\s+state/i, /jurisdiction/i, /venue/i, /forum\s+selection/i],
    label: 'Governing Law',
    category: 'dispute'
  },
  forceMajeure: {
    patterns: [/force\s+majeure/i, /act\s+of\s+god/i, /unforeseeable\s+event/i],
    label: 'Force Majeure',
    category: 'risk'
  },
  warranty: {
    patterns: [/warrant/i, /represent\s+and\s+warrant/i, /as[\s-]is/i, /disclaim/i],
    label: 'Warranty',
    category: 'assurance'
  },
  arbitration: {
    patterns: [/arbitrat/i, /mediat/i, /dispute\s+resolution/i, /ADR/],
    label: 'Dispute Resolution',
    category: 'dispute'
  },
  assignment: {
    patterns: [/assign(?:ment|able)/i, /transfer\s+(?:of\s+)?(?:rights|obligations)/i],
    label: 'Assignment',
    category: 'transfer'
  },
  severability: {
    patterns: [/severab/i, /invalid\s+(?:provision|clause)/i],
    label: 'Severability',
    category: 'boilerplate'
  },
  entireAgreement: {
    patterns: [/entire\s+agreement/i, /integrat(?:ion|ed)/i, /supersede/i, /merge/i],
    label: 'Entire Agreement',
    category: 'boilerplate'
  },
  dataProtection: {
    patterns: [/data\s+protect/i, /personal\s+data/i, /GDPR/i, /CCPA/i, /privacy/i, /data\s+process/i],
    label: 'Data Protection',
    category: 'compliance'
  }
};

// ─── Risk detection patterns ─────────────────

const RISK_PATTERNS = [
  { pattern: /sole\s+discretion/i, risk: 'One-sided discretion clause', severity: 'high', explanation: 'Gives one party unilateral decision-making power without objective standards.' },
  { pattern: /unlimited\s+liabilit/i, risk: 'Unlimited liability exposure', severity: 'high', explanation: 'No cap on potential damages could expose a party to catastrophic losses.' },
  { pattern: /irrevocab/i, risk: 'Irrevocable commitment', severity: 'medium', explanation: 'Party cannot withdraw or change position once committed.' },
  { pattern: /waive[s]?\s+(?:all|any|every)\s+(?:right|claim|defense)/i, risk: 'Broad rights waiver', severity: 'high', explanation: 'Waiving broad categories of rights may leave a party without legal recourse.' },
  { pattern: /perpetual|in\s+perpetuity|forever/i, risk: 'Perpetual obligation', severity: 'medium', explanation: 'Obligations without expiration can create indefinite commitments.' },
  { pattern: /automatic(?:ally)?\s+renew/i, risk: 'Auto-renewal clause', severity: 'low', explanation: 'Contract may renew without explicit consent. Watch for notification windows.' },
  { pattern: /(?:no|without)\s+(?:prior\s+)?(?:written\s+)?(?:notice|consent)/i, risk: 'No notice/consent required', severity: 'medium', explanation: 'Actions can be taken without the other party being informed or agreeing.' },
  { pattern: /as[\s-]is/i, risk: 'As-is / no warranty', severity: 'medium', explanation: 'Goods or services provided without any warranty of quality or fitness.' },
  { pattern: /non[\s-]?refundable/i, risk: 'Non-refundable payment', severity: 'medium', explanation: 'Payments cannot be recovered even if expectations are not met.' },
  { pattern: /liquidated\s+damages/i, risk: 'Liquidated damages provision', severity: 'medium', explanation: 'Predetermined damages amount may exceed actual damages or be punitive.' },
  { pattern: /prevailing\s+party/i, risk: 'Prevailing party attorneys fees', severity: 'low', explanation: 'Losing party must pay the winner\'s legal fees, increasing litigation risk.' },
  { pattern: /(?:shall|must|will)\s+not\s+(?:sue|bring\s+(?:any\s+)?(?:action|claim|proceeding))/i, risk: 'Covenant not to sue', severity: 'high', explanation: 'Restricts ability to seek legal remedies for grievances.' },
  { pattern: /(?:exclusive|sole)\s+(?:remedy|recourse)/i, risk: 'Exclusive remedy limitation', severity: 'medium', explanation: 'Limits available remedies to a single specified option.' },
  { pattern: /unilateral(?:ly)?\s+(?:amend|modify|change|alter)/i, risk: 'Unilateral modification right', severity: 'high', explanation: 'One party can change contract terms without the other\'s agreement.' },
  { pattern: /(?:forfeit|forfeiture)/i, risk: 'Forfeiture clause', severity: 'medium', explanation: 'May result in loss of payments, rights, or property under certain conditions.' },
  { pattern: /(?:worldwide|global)\s+(?:license|right|exclusiv)/i, risk: 'Worldwide scope', severity: 'medium', explanation: 'Extremely broad geographic scope may be over-reaching.' },
  { pattern: /(?:all|any)\s+(?:future|subsequent)\s+(?:work|invention|creation)/i, risk: 'Future work assignment', severity: 'high', explanation: 'Claims ownership of work not yet created, potentially including unrelated work.' }
];

const MISSING_PROTECTIONS = [
  { clause: 'termination', label: 'No termination clause', risk: 'Without a termination clause, exiting the contract may require mutual consent or breach.' },
  { clause: 'liability', label: 'No liability limitation', risk: 'Without a liability cap, parties face potentially unlimited exposure.' },
  { clause: 'confidentiality', label: 'No confidentiality provision', risk: 'Shared information is not protected and could be disclosed to competitors.' },
  { clause: 'governingLaw', label: 'No governing law specified', risk: 'Disputes may face conflicts-of-law issues and unpredictable outcomes.' },
  { clause: 'forceMajeure', label: 'No force majeure clause', risk: 'Parties may be held liable for non-performance caused by unforeseeable events.' },
  { clause: 'arbitration', label: 'No dispute resolution mechanism', risk: 'Disputes default to litigation which is typically more expensive and time-consuming.' },
  { clause: 'dataProtection', label: 'No data protection provisions', risk: 'May violate privacy regulations if personal data is processed.' }
];

// ─── POST /analyze/contract ──────────────────

app.post('/analyze/contract', (req, res) => {
  try {
    const { text, partyName } = req.body;
    if (!text) return res.status(400).json({ error: 'text (contract text) is required' });

    const lines = text.split('\n');
    const wordCount = text.split(/\s+/).length;

    // Detect clauses
    const foundClauses = {};
    const clauseDetails = [];

    for (const [key, config] of Object.entries(CLAUSE_PATTERNS)) {
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        for (const pat of config.patterns) {
          if (pat.test(lines[i])) {
            matches.push({ lineNumber: i + 1, excerpt: lines[i].trim().substring(0, 200) });
            break;
          }
        }
      }
      if (matches.length > 0) {
        foundClauses[key] = true;
        clauseDetails.push({
          clause: config.label,
          category: config.category,
          found: true,
          occurrences: matches.length,
          locations: matches.slice(0, 5)
        });
      }
    }

    // Detect risks
    const risks = [];
    for (const rp of RISK_PATTERNS) {
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (rp.pattern.test(lines[i])) {
          matches.push({ lineNumber: i + 1, excerpt: lines[i].trim().substring(0, 200) });
        }
      }
      if (matches.length > 0) {
        risks.push({
          risk: rp.risk,
          severity: rp.severity,
          explanation: rp.explanation,
          occurrences: matches.length,
          locations: matches.slice(0, 3)
        });
      }
    }

    // Missing protections
    const missingProtections = [];
    for (const mp of MISSING_PROTECTIONS) {
      if (!foundClauses[mp.clause]) {
        missingProtections.push({ issue: mp.label, risk: mp.risk });
      }
    }

    // Calculate overall risk score (1-10)
    let riskScore = 1;
    const highRisks = risks.filter(r => r.severity === 'high').length;
    const medRisks = risks.filter(r => r.severity === 'medium').length;
    const lowRisks = risks.filter(r => r.severity === 'low').length;
    riskScore += highRisks * 2;
    riskScore += medRisks * 1;
    riskScore += lowRisks * 0.3;
    riskScore += missingProtections.length * 0.5;
    riskScore = Math.min(10, Math.round(riskScore * 10) / 10);

    let riskLevel;
    if (riskScore <= 3) riskLevel = 'Low';
    else if (riskScore <= 5) riskLevel = 'Moderate';
    else if (riskScore <= 7) riskLevel = 'Elevated';
    else riskLevel = 'High';

    // Plain-English summary
    const summaryParts = [];
    summaryParts.push(`This contract contains approximately ${wordCount} words.`);
    summaryParts.push(`${clauseDetails.length} of ${Object.keys(CLAUSE_PATTERNS).length} standard clause categories were identified.`);
    if (risks.length > 0) summaryParts.push(`${risks.length} potential risk(s) flagged, including ${highRisks} high-severity.`);
    if (missingProtections.length > 0) summaryParts.push(`${missingProtections.length} common protection(s) appear to be missing.`);
    summaryParts.push(`Overall risk score: ${riskScore}/10 (${riskLevel}).`);

    res.json({
      agent: 'justice-legal',
      analysis: 'contract',
      timestamp: new Date().toISOString(),
      document: { wordCount, lineCount: lines.length },
      clausesIdentified: clauseDetails,
      risks: {
        score: riskScore,
        level: riskLevel,
        items: risks,
        highCount: highRisks,
        mediumCount: medRisks,
        lowCount: lowRisks
      },
      missingProtections,
      summary: summaryParts.join(' '),
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /analyze/nda ───────────────────────

app.post('/analyze/nda', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text (NDA text) is required' });

    const textLower = text.toLowerCase();
    const lines = text.split('\n');

    // Determine mutual vs one-way
    const mutualIndicators = [/mutual/i, /each\s+party/i, /both\s+parties/i, /reciprocal/i, /bilateral/i];
    const oneWayIndicators = [/receiving\s+party/i, /disclosing\s+party/i, /recipient/i];
    let mutualScore = 0;
    let oneWayScore = 0;
    for (const pat of mutualIndicators) { if (pat.test(text)) mutualScore++; }
    for (const pat of oneWayIndicators) { if (pat.test(text)) oneWayScore++; }
    const ndaType = mutualScore > oneWayScore ? 'mutual' : oneWayScore > 0 ? 'one-way' : 'unclear';

    // Scope of confidential information
    const scopePatterns = [
      { pattern: /all\s+(?:information|data|materials)/i, scope: 'broad', note: 'Covers all information shared between parties' },
      { pattern: /(?:written|marked|designated)\s+(?:as\s+)?confidential/i, scope: 'narrow', note: 'Only information explicitly marked as confidential is covered' },
      { pattern: /oral(?:ly)?\s+(?:disclosed|communicated)/i, scope: 'includes_oral', note: 'Includes oral disclosures (harder to prove)' },
      { pattern: /trade\s+secret/i, scope: 'includes_trade_secrets', note: 'Covers trade secrets' },
      { pattern: /technical\s+(?:data|information)/i, scope: 'technical', note: 'Covers technical/engineering information' },
      { pattern: /financial\s+(?:data|information)/i, scope: 'financial', note: 'Covers financial information' },
      { pattern: /customer\s+(?:data|list|information)/i, scope: 'customer_data', note: 'Covers customer information' },
      { pattern: /source\s+code|software/i, scope: 'software', note: 'Covers software/source code' }
    ];
    const scope = [];
    for (const sp of scopePatterns) {
      if (sp.pattern.test(text)) scope.push({ type: sp.scope, note: sp.note });
    }

    // Duration
    let duration = null;
    const durationMatch = text.match(/(\d+)\s*(?:\(\w+\)\s*)?year[s]?\s*(?:from|after|following|of)/i);
    if (durationMatch) {
      duration = { years: parseInt(durationMatch[1]), raw: durationMatch[0] };
    } else {
      const monthMatch = text.match(/(\d+)\s*(?:\(\w+\)\s*)?month[s]?\s*(?:from|after|following)/i);
      if (monthMatch) duration = { months: parseInt(monthMatch[1]), raw: monthMatch[0] };
    }
    const perpetualMatch = /perpetual|indefinite|no\s+expir/i.test(text);
    if (perpetualMatch && !duration) duration = { perpetual: true, note: 'NDA appears to have no expiration' };

    // Standard exclusions
    const exclusionPatterns = [
      { pattern: /public(?:ly)?\s+(?:available|known|domain)/i, label: 'Publicly available information' },
      { pattern: /independently\s+developed/i, label: 'Independently developed information' },
      { pattern: /(?:known|possessed)\s+(?:prior|before)/i, label: 'Previously known information' },
      { pattern: /(?:rightfully|lawfully)\s+(?:obtained|received)\s+(?:from|by)\s+(?:a\s+)?third\s+party/i, label: 'Information from third parties' },
      { pattern: /required\s+by\s+(?:law|court|government|regulator)/i, label: 'Legally compelled disclosure' },
      { pattern: /(?:written\s+)?(?:consent|approval)\s+(?:of|from)\s+(?:the\s+)?disclos/i, label: 'Disclosure with consent' }
    ];
    const exclusions = [];
    for (const ep of exclusionPatterns) {
      if (ep.pattern.test(text)) exclusions.push(ep.label);
    }

    // Remedies
    const remedyPatterns = [
      { pattern: /injunctive\s+relief/i, label: 'Injunctive relief', note: 'Court can order party to stop breaching' },
      { pattern: /specific\s+performance/i, label: 'Specific performance', note: 'Court can order party to comply with NDA terms' },
      { pattern: /(?:liquidated|stipulated)\s+damages/i, label: 'Liquidated damages', note: 'Pre-determined penalty amount for breach' },
      { pattern: /(?:monetary|actual)\s+damages/i, label: 'Monetary damages', note: 'Recovery of actual financial losses' },
      { pattern: /attorney(?:s)?[\s']?\s*fees/i, label: 'Attorneys fees', note: 'Breaching party pays legal costs' },
      { pattern: /irreparable\s+harm/i, label: 'Irreparable harm acknowledged', note: 'Parties agree breach causes irreparable harm, supporting injunctive relief' }
    ];
    const remedies = [];
    for (const rp of remedyPatterns) {
      if (rp.pattern.test(text)) remedies.push({ remedy: rp.label, note: rp.note });
    }

    // Concerns
    const concerns = [];
    if (ndaType === 'one-way' && !text.match(/disclosing\s+party/i)) {
      concerns.push({ severity: 'medium', issue: 'One-way NDA may not adequately protect your information if you also share confidential data' });
    }
    if (scope.some(s => s.type === 'broad')) {
      concerns.push({ severity: 'low', issue: 'Broad scope covers all information, which may be over-inclusive' });
    }
    if (!scope.some(s => s.type === 'narrow') && !scope.some(s => s.type === 'includes_oral')) {
      concerns.push({ severity: 'medium', issue: 'Unclear what triggers confidentiality obligations (no marking/designation requirement found)' });
    }
    if (duration && duration.perpetual) {
      concerns.push({ severity: 'medium', issue: 'Perpetual NDA has no expiration, creating indefinite obligations' });
    }
    if (duration && duration.years && duration.years > 5) {
      concerns.push({ severity: 'low', issue: `Duration of ${duration.years} years is longer than typical (2-5 years)` });
    }
    if (exclusions.length < 3) {
      concerns.push({ severity: 'high', issue: `Only ${exclusions.length} standard exclusions found. Typical NDAs include 4-5 exclusions.` });
    }
    if (remedies.length === 0) {
      concerns.push({ severity: 'medium', issue: 'No specific remedies for breach are defined' });
    }
    if (/non[\s-]?compete/i.test(text)) {
      concerns.push({ severity: 'high', issue: 'NDA appears to contain a non-compete clause, which may not be enforceable in all jurisdictions' });
    }
    if (/non[\s-]?solicitation/i.test(text)) {
      concerns.push({ severity: 'medium', issue: 'NDA includes non-solicitation provisions beyond standard confidentiality' });
    }

    res.json({
      agent: 'justice-legal',
      analysis: 'nda',
      timestamp: new Date().toISOString(),
      ndaType: {
        classification: ndaType,
        explanation: ndaType === 'mutual' ? 'Both parties are bound by confidentiality obligations'
          : ndaType === 'one-way' ? 'Only one party (receiving party) has confidentiality obligations'
          : 'NDA type could not be clearly determined from the text'
      },
      scope: {
        findings: scope,
        assessment: scope.some(s => s.type === 'broad') ? 'Broad scope' : scope.length > 0 ? 'Defined scope' : 'Scope unclear'
      },
      duration: duration || { status: 'not_found', note: 'No explicit duration found in the NDA text' },
      exclusions: {
        found: exclusions,
        count: exclusions.length,
        standard: exclusions.length >= 4 ? 'Adequate' : exclusions.length >= 2 ? 'Partial' : 'Insufficient',
        missing: ['Publicly available information', 'Independently developed information', 'Previously known information', 'Information from third parties', 'Legally compelled disclosure']
          .filter(e => !exclusions.includes(e))
      },
      remedies: {
        found: remedies,
        assessment: remedies.length >= 2 ? 'Well-defined' : remedies.length === 1 ? 'Basic' : 'No specific remedies found'
      },
      concerns,
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /research/statute ──────────────────

const STATUTE_KNOWLEDGE = {
  'breach of contract': {
    topic: 'Breach of Contract',
    federalLaw: 'Contract law is primarily governed by state law. The UCC (Uniform Commercial Code) governs sales of goods.',
    keyConcepts: [
      'A breach occurs when a party fails to perform a contractual obligation without lawful excuse.',
      'Material breach allows the non-breaching party to terminate and seek damages.',
      'Minor breach allows the non-breaching party to seek damages but must continue performing.',
      'Anticipatory breach occurs when a party indicates they will not perform before the performance is due.',
      'The non-breaching party has a duty to mitigate damages.'
    ],
    remedies: ['Compensatory damages (expectation damages)', 'Consequential damages (foreseeable indirect losses)', 'Reliance damages (expenses incurred in reliance on the contract)', 'Restitution (value of benefit conferred)', 'Specific performance (equity, for unique goods/property)', 'Liquidated damages (if specified in contract)'],
    keyCase: 'Hadley v. Baxendale (1854) - established foreseeability rule for consequential damages'
  },
  'employment law': {
    topic: 'Employment Law',
    federalLaw: 'Title VII (discrimination), FLSA (wages/hours), ADA (disability), ADEA (age), FMLA (family leave), OSHA (safety)',
    keyConcepts: [
      'Most employment is at-will (can be terminated by either party for any lawful reason).',
      'Federal and state anti-discrimination laws protect employees in protected classes.',
      'Non-compete agreements are governed by state law and vary significantly in enforceability.',
      'Wage and hour laws set minimum wage, overtime requirements, and recordkeeping obligations.',
      'Workers compensation provides no-fault coverage for workplace injuries.'
    ],
    remedies: ['Back pay and front pay', 'Compensatory damages for emotional distress', 'Punitive damages (in discrimination cases)', 'Reinstatement', 'Injunctive relief', 'Attorneys fees'],
    keyCase: 'McDonnell Douglas Corp. v. Green (1973) - framework for employment discrimination claims'
  },
  'intellectual property': {
    topic: 'Intellectual Property',
    federalLaw: 'Patent Act (35 USC), Copyright Act (17 USC), Lanham Act (trademarks, 15 USC 1051+), DTSA (trade secrets)',
    keyConcepts: [
      'Patents protect inventions and processes for 20 years from filing.',
      'Copyrights protect original works of authorship for life of author + 70 years.',
      'Trademarks protect words, symbols, and devices identifying goods/services (renewable indefinitely).',
      'Trade secrets are protected as long as they remain secret and have economic value.',
      'Work-for-hire doctrine: employer owns IP created by employee within scope of employment.'
    ],
    remedies: ['Injunctive relief (cease infringement)', 'Actual damages and lost profits', 'Statutory damages (copyright)', 'Treble damages (willful patent infringement)', 'Attorneys fees', 'Destruction of infringing materials'],
    keyCase: 'Alice Corp. v. CLS Bank (2014) - framework for patent eligibility of software/abstract ideas'
  },
  'negligence': {
    topic: 'Negligence / Tort Law',
    federalLaw: 'Primarily state law. Federal Tort Claims Act governs claims against the federal government.',
    keyConcepts: [
      'Four elements: duty, breach, causation (actual + proximate), damages.',
      'Standard of care: what a reasonable person would do under similar circumstances.',
      'Comparative negligence: damages reduced by plaintiff percentage of fault (varies by state).',
      'Contributory negligence: in some states, any fault by plaintiff bars recovery entirely.',
      'Respondeat superior: employer liable for employee actions within scope of employment.'
    ],
    remedies: ['Compensatory damages (economic: medical bills, lost wages; non-economic: pain/suffering)', 'Punitive damages (gross negligence/willful misconduct)', 'Injunctive relief'],
    keyCase: 'Palsgraf v. Long Island Railroad (1928) - established proximate cause / foreseeability doctrine'
  },
  'business formation': {
    topic: 'Business Formation / Entity Law',
    federalLaw: 'State law governs entity formation. Federal tax law (IRC) determines tax treatment.',
    keyConcepts: [
      'Sole proprietorship: simplest form, no liability protection.',
      'Partnership: general (shared liability) or limited (passive investors with limited liability).',
      'LLC: limited liability with pass-through taxation (most popular for small businesses).',
      'Corporation: C-Corp (double taxation) or S-Corp (pass-through, restrictions on shareholders).',
      'Delaware and Wyoming are popular formation states due to business-friendly laws.'
    ],
    remedies: ['Piercing the corporate veil (personal liability when entity formalities ignored)', 'Derivative actions (shareholders suing on behalf of corporation)', 'Dissolution proceedings'],
    keyCase: 'Salomon v. A Salomon & Co Ltd (1897) - established separate legal personality of corporations'
  },
  'consumer protection': {
    topic: 'Consumer Protection',
    federalLaw: 'FTC Act (Section 5), TILA (lending), FCRA (credit reporting), FDCPA (debt collection), CAN-SPAM, TCPA',
    keyConcepts: [
      'Unfair or deceptive acts and practices (UDAP) are prohibited by both federal and state law.',
      'State consumer protection statutes often provide stronger remedies than federal law.',
      'Class actions are common in consumer protection (Rule 23, FRCP).',
      'Many states have lemon laws for defective vehicles.',
      'Online businesses must comply with privacy policies and terms of service requirements.'
    ],
    remedies: ['Actual damages', 'Statutory damages (often treble damages)', 'Attorneys fees and costs', 'Injunctive relief', 'Civil penalties (government enforcement)', 'Class action recovery'],
    keyCase: 'FTC v. Wyndham Worldwide (2015) - FTC authority over cybersecurity/data practices'
  },
  'real estate': {
    topic: 'Real Estate / Property Law',
    federalLaw: 'Fair Housing Act, RESPA (Real Estate Settlement), Interstate Land Sales, environmental regulations (CERCLA)',
    keyConcepts: [
      'Statute of Frauds requires real estate contracts to be in writing.',
      'Title insurance protects against defects in property title.',
      'Easements grant rights to use another person property for a specific purpose.',
      'Recording statutes determine priority of interests (race, notice, race-notice).',
      'Zoning laws regulate land use at the local level.'
    ],
    remedies: ['Specific performance (most common for real estate)', 'Damages for breach', 'Rescission', 'Quiet title action', 'Partition (co-owners)'],
    keyCase: 'Kelo v. City of New London (2005) - eminent domain for economic development'
  },
  'data privacy': {
    topic: 'Data Privacy and Cybersecurity',
    federalLaw: 'No comprehensive federal privacy law. Sector-specific: HIPAA (health), GLBA (financial), COPPA (children), FERPA (education). State: CCPA/CPRA, various breach notification laws.',
    keyConcepts: [
      'All 50 states have data breach notification laws with varying requirements.',
      'CCPA/CPRA gives California residents rights to know, delete, and opt-out of data sales.',
      'HIPAA protects health information with strict security and privacy requirements.',
      'GDPR applies to US companies processing EU residents data.',
      'Reasonable security measures are required even absent specific regulation.'
    ],
    remedies: ['Regulatory fines and penalties', 'Private right of action (varies by statute)', 'Injunctive relief', 'Data breach class actions', 'FTC enforcement actions'],
    keyCase: 'Carpenter v. United States (2018) - Fourth Amendment protects cell phone location data'
  }
};

app.post('/research/statute', (req, res) => {
  try {
    const { question, jurisdiction } = req.body;
    if (!question) return res.status(400).json({ error: 'question (legal question) is required' });

    const questionLower = question.toLowerCase();

    // Find matching topic
    let bestMatch = null;
    let bestScore = 0;
    for (const [key, data] of Object.entries(STATUTE_KNOWLEDGE)) {
      let score = 0;
      const keywords = key.split(/\s+/);
      for (const kw of keywords) {
        if (questionLower.includes(kw)) score += 2;
      }
      // Also check topic name and concepts
      if (data.topic && questionLower.includes(data.topic.toLowerCase())) score += 5;
      for (const concept of data.keyConcepts) {
        const conceptWords = concept.toLowerCase().split(/\s+/);
        for (const cw of conceptWords) {
          if (cw.length > 4 && questionLower.includes(cw)) score += 0.5;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = data;
      }
    }

    if (!bestMatch || bestScore < 2) {
      return res.json({
        agent: 'justice-legal',
        analysis: 'statute-research',
        timestamp: new Date().toISOString(),
        question,
        result: {
          status: 'no_match',
          message: 'Could not find a closely matching legal topic. Available topics: ' + Object.values(STATUTE_KNOWLEDGE).map(v => v.topic).join(', '),
          suggestion: 'Try rephrasing your question or specifying the area of law (e.g., breach of contract, employment law, intellectual property).'
        },
        disclaimer: DISCLAIMER
      });
    }

    // Resolve jurisdiction
    let stateInfo = null;
    if (jurisdiction) {
      const jurLower = jurisdiction.toLowerCase().trim();
      stateInfo = statesByAbbr[jurLower.toUpperCase()] || statesByName[jurLower] || null;
    }

    res.json({
      agent: 'justice-legal',
      analysis: 'statute-research',
      timestamp: new Date().toISOString(),
      question,
      topic: bestMatch.topic,
      confidence: Math.min(100, Math.round(bestScore * 10)),
      federalLaw: bestMatch.federalLaw,
      keyConcepts: bestMatch.keyConcepts,
      availableRemedies: bestMatch.remedies,
      keyCase: bestMatch.keyCase,
      jurisdiction: stateInfo ? {
        state: stateInfo.state,
        abbreviation: stateInfo.abbr,
        statuteOfLimitations: {
          writtenContracts: `${stateInfo.sol_contracts_written} years`,
          oralContracts: `${stateInfo.sol_contracts_oral} years`
        },
        courts: stateInfo.governing_courts,
        notes: stateInfo.notes
      } : jurisdiction ? { status: 'not_found', message: `Jurisdiction "${jurisdiction}" not found in database` } : { status: 'not_specified', message: 'No jurisdiction specified. Provide a US state for state-specific information.' },
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /draft/clause ──────────────────────

app.post('/draft/clause', (req, res) => {
  try {
    const { type, parameters } = req.body;
    if (!type) return res.status(400).json({
      error: 'type is required',
      availableTypes: Object.keys(clauseTemplates),
      usage: 'Provide type (e.g., "indemnification") and optional parameters object to customize the clause.'
    });

    const typeLower = type.toLowerCase().replace(/[\s-]/g, '_');
    const template = clauseTemplates[typeLower];

    if (!template) {
      return res.status(400).json({
        error: `Unknown clause type: "${type}"`,
        availableTypes: Object.keys(clauseTemplates).map(k => ({
          type: k,
          name: clauseTemplates[k].name,
          description: clauseTemplates[k].description
        }))
      });
    }

    // Fill in template parameters
    let filledTemplate = template.template;
    const usedParams = {};
    const missingParams = [];

    for (const param of template.parameters) {
      const placeholder = `{{${param}}}`;
      if (parameters && parameters[param] !== undefined) {
        filledTemplate = filledTemplate.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), parameters[param]);
        usedParams[param] = parameters[param];
      } else {
        missingParams.push(param);
        filledTemplate = filledTemplate.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), `[${param.toUpperCase()}]`);
      }
    }

    res.json({
      agent: 'justice-legal',
      draft: 'clause',
      timestamp: new Date().toISOString(),
      clauseType: template.name,
      description: template.description,
      generatedClause: filledTemplate,
      parametersUsed: usedParams,
      parametersMissing: missingParams.length > 0 ? missingParams : null,
      keyConsiderations: template.key_considerations,
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /compliance/check ──────────────────

const COMPLIANCE_FRAMEWORKS = {
  technology: [
    { regulation: 'CCPA/CPRA', scope: 'California consumer data privacy', applicability: 'Companies with CA customers (revenue >$25M or 100K+ consumers)', requirements: ['Privacy policy disclosure', 'Right to know/delete/opt-out', 'Data security measures', 'Vendor contract requirements'] },
    { regulation: 'COPPA', scope: 'Childrens online privacy', applicability: 'Websites/apps directed at children under 13', requirements: ['Parental consent before data collection', 'Clear privacy policy', 'Data retention limits', 'Secure data handling'] },
    { regulation: 'CAN-SPAM Act', scope: 'Commercial email', applicability: 'Any entity sending commercial emails', requirements: ['Opt-out mechanism', 'Accurate header information', 'Clear identification as advertisement', 'Physical postal address'] },
    { regulation: 'DMCA', scope: 'Digital copyright', applicability: 'Online platforms hosting user content', requirements: ['DMCA agent registration', 'Notice-and-takedown procedures', 'Counter-notice process', 'Repeat infringer policy'] },
    { regulation: 'Section 230', scope: 'Platform liability', applicability: 'Interactive computer services', requirements: ['Good faith content moderation', 'Terms of service', 'Understanding of immunity scope'] },
    { regulation: 'ADA (Web Accessibility)', scope: 'Website accessibility', applicability: 'Businesses open to the public (places of public accommodation)', requirements: ['WCAG 2.1 AA compliance', 'Screen reader compatibility', 'Keyboard navigation', 'Alt text for images'] }
  ],
  healthcare: [
    { regulation: 'HIPAA', scope: 'Health information privacy and security', applicability: 'Covered entities and business associates', requirements: ['Privacy Rule compliance', 'Security Rule (administrative/physical/technical safeguards)', 'Breach notification', 'Business associate agreements', 'Risk assessments'] },
    { regulation: 'HITECH Act', scope: 'Health IT and breach notification', applicability: 'Entities subject to HIPAA', requirements: ['Enhanced breach notification', 'Increased penalties', 'Meaningful use requirements', 'Audit trail capabilities'] },
    { regulation: 'FDA Regulations', scope: 'Medical devices and drugs', applicability: 'Manufacturers and distributors of medical products', requirements: ['Pre-market approval/clearance', 'Good Manufacturing Practices (GMP)', 'Adverse event reporting', 'Labeling requirements'] },
    { regulation: 'Stark Law / Anti-Kickback', scope: 'Physician self-referral and kickbacks', applicability: 'Healthcare providers and suppliers', requirements: ['Prohibition on self-referrals', 'Fair market value requirements', 'Written agreements', 'Compliance programs'] }
  ],
  financial: [
    { regulation: 'SOX (Sarbanes-Oxley)', scope: 'Financial reporting and corporate governance', applicability: 'Public companies', requirements: ['Internal control reporting (Section 404)', 'CEO/CFO certification', 'Audit committee independence', 'Whistleblower protections'] },
    { regulation: 'BSA/AML', scope: 'Anti-money laundering', applicability: 'Financial institutions, MSBs', requirements: ['Customer identification (KYC)', 'Suspicious activity reporting (SARs)', 'Currency transaction reports', 'AML compliance program'] },
    { regulation: 'Dodd-Frank', scope: 'Financial regulation', applicability: 'Financial institutions', requirements: ['Stress testing', 'Volcker Rule compliance', 'Consumer protection', 'Derivatives regulation'] },
    { regulation: 'PCI DSS', scope: 'Payment card security', applicability: 'Any entity processing payment cards', requirements: ['Secure network and systems', 'Protect cardholder data', 'Vulnerability management', 'Access controls', 'Regular monitoring and testing'] }
  ],
  retail: [
    { regulation: 'FTC Act (Section 5)', scope: 'Unfair/deceptive practices', applicability: 'All businesses', requirements: ['Truthful advertising', 'Clear disclosures', 'Substantiated claims', 'Consumer protection'] },
    { regulation: 'State Consumer Protection', scope: 'State UDAP statutes', applicability: 'All businesses with state customers', requirements: ['Fair business practices', 'Accurate product descriptions', 'Return/refund policies', 'Price accuracy'] },
    { regulation: 'Product Liability Laws', scope: 'Product safety', applicability: 'Manufacturers, distributors, retailers', requirements: ['Product safety testing', 'Warning labels', 'Recall procedures', 'Record keeping'] },
    { regulation: 'CPSIA', scope: 'Consumer product safety', applicability: 'Manufacturers/importers of consumer products', requirements: ['Third-party testing (children products)', 'General Certificate of Conformity', 'Tracking labels', 'Lead and phthalate limits'] }
  ],
  manufacturing: [
    { regulation: 'OSHA', scope: 'Workplace safety', applicability: 'Employers with employees', requirements: ['Hazard communication', 'PPE requirements', 'Injury/illness recording', 'Safety training', 'Workplace inspections'] },
    { regulation: 'EPA Regulations', scope: 'Environmental compliance', applicability: 'Manufacturing facilities', requirements: ['Air/water discharge permits', 'Hazardous waste management', 'Chemical reporting (TRI)', 'Spill prevention'] },
    { regulation: 'TSCA', scope: 'Chemical substances', applicability: 'Chemical manufacturers and processors', requirements: ['Chemical inventory reporting', 'Pre-manufacture notification', 'Risk evaluation', 'Record keeping'] }
  ],
  general: [
    { regulation: 'ADA', scope: 'Disability accommodation', applicability: 'Employers with 15+ employees, places of public accommodation', requirements: ['Reasonable accommodations', 'Non-discrimination', 'Accessible facilities', 'Modified policies'] },
    { regulation: 'Title VII', scope: 'Employment discrimination', applicability: 'Employers with 15+ employees', requirements: ['Non-discrimination in hiring/firing/terms', 'Anti-harassment policies', 'Reasonable accommodation (religion)', 'EEOC charge response'] },
    { regulation: 'FLSA', scope: 'Wages and hours', applicability: 'Most employers', requirements: ['Minimum wage compliance', 'Overtime pay (1.5x over 40 hrs/week)', 'Recordkeeping', 'Child labor restrictions'] },
    { regulation: 'FMLA', scope: 'Family/medical leave', applicability: 'Employers with 50+ employees', requirements: ['12 weeks unpaid leave', 'Job protection', 'Benefits continuation', 'Anti-retaliation'] }
  ]
};

app.post('/compliance/check', (req, res) => {
  try {
    const { businessDescription, jurisdiction, industry } = req.body;
    if (!businessDescription) return res.status(400).json({ error: 'businessDescription is required' });

    const descLower = businessDescription.toLowerCase();
    const industryLower = (industry || '').toLowerCase();

    // Determine applicable industries
    const applicableIndustries = ['general'];
    const industryKeywords = {
      technology: ['software', 'tech', 'app', 'website', 'saas', 'platform', 'data', 'cloud', 'ai', 'digital', 'internet', 'online'],
      healthcare: ['health', 'medical', 'hospital', 'clinic', 'patient', 'pharma', 'biotech', 'telemedicine', 'hipaa'],
      financial: ['bank', 'financ', 'invest', 'insurance', 'payment', 'lending', 'fintech', 'trading', 'credit', 'loan'],
      retail: ['retail', 'store', 'ecommerce', 'e-commerce', 'shop', 'consumer', 'product', 'sell', 'marketplace'],
      manufacturing: ['manufactur', 'factory', 'production', 'industrial', 'assembly', 'fabricat', 'chemical']
    };

    for (const [ind, keywords] of Object.entries(industryKeywords)) {
      for (const kw of keywords) {
        if (descLower.includes(kw) || industryLower.includes(kw)) {
          if (!applicableIndustries.includes(ind)) applicableIndustries.push(ind);
          break;
        }
      }
    }

    // Gather applicable regulations
    const regulations = [];
    for (const ind of applicableIndustries) {
      const regs = COMPLIANCE_FRAMEWORKS[ind] || [];
      for (const reg of regs) {
        regulations.push({ ...reg, industry: ind });
      }
    }

    // Size-based considerations
    const sizeConcerns = [];
    if (/\b(?:startup|small|solo|freelanc)\b/i.test(descLower)) {
      sizeConcerns.push('Small businesses may be exempt from certain regulations (e.g., FMLA requires 50+ employees, Title VII requires 15+)');
      sizeConcerns.push('Consider simplified compliance frameworks available for small businesses');
    }
    if (/\b(?:public|publicly\s+traded|IPO|SEC)\b/i.test(descLower)) {
      sizeConcerns.push('Public companies face additional SEC reporting and SOX compliance requirements');
    }

    // Jurisdiction-specific
    let stateInfo = null;
    if (jurisdiction) {
      const jurLower = jurisdiction.toLowerCase().trim();
      stateInfo = statesByAbbr[jurLower.toUpperCase()] || statesByName[jurLower] || null;
    }

    const stateSpecific = [];
    if (stateInfo) {
      if (stateInfo.abbr === 'CA') {
        stateSpecific.push({ regulation: 'CCPA/CPRA', note: 'California has the strictest state privacy law in the US' });
        stateSpecific.push({ regulation: 'Cal. Bus. & Prof. Code 16600', note: 'Non-compete agreements are generally unenforceable in California' });
        stateSpecific.push({ regulation: 'PAGA', note: 'Private Attorneys General Act allows employees to sue for Labor Code violations' });
      }
      if (stateInfo.abbr === 'NY') {
        stateSpecific.push({ regulation: 'NY SHIELD Act', note: 'Data security and breach notification requirements' });
        stateSpecific.push({ regulation: 'NYC Local Law 144', note: 'AI bias audit requirements for automated employment decisions' });
      }
      if (stateInfo.abbr === 'TX') {
        stateSpecific.push({ regulation: 'TDPSA', note: 'Texas Data Privacy and Security Act (effective 2024)' });
        stateSpecific.push({ regulation: 'Texas Deceptive Trade Practices Act', note: 'Strong consumer protection with treble damages' });
      }
      if (stateInfo.abbr === 'IL') {
        stateSpecific.push({ regulation: 'BIPA', note: 'Biometric Information Privacy Act - strict biometric data requirements with private right of action' });
      }
      if (stateInfo.abbr === 'FL') {
        stateSpecific.push({ regulation: 'FDBR', note: 'Florida Digital Bill of Rights (effective 2024)' });
      }
    }

    // International considerations
    const intlConcerns = [];
    if (/\b(?:international|global|eu|europe|uk|gdpr|cross[\s-]?border|export|import)\b/i.test(descLower)) {
      intlConcerns.push({ regulation: 'GDPR', note: 'Applies if processing EU residents data, regardless of company location' });
      intlConcerns.push({ regulation: 'FCPA', note: 'Foreign Corrupt Practices Act applies to US companies operating internationally' });
      intlConcerns.push({ regulation: 'Export Controls (EAR/ITAR)', note: 'May apply to technology and software exports' });
      intlConcerns.push({ regulation: 'OFAC Sanctions', note: 'Prohibits transactions with sanctioned countries/entities' });
    }

    res.json({
      agent: 'justice-legal',
      analysis: 'compliance',
      timestamp: new Date().toISOString(),
      businessDescription,
      applicableIndustries,
      regulations: regulations.map(r => ({
        regulation: r.regulation,
        scope: r.scope,
        applicability: r.applicability,
        requirements: r.requirements,
        industry: r.industry
      })),
      totalRegulations: regulations.length,
      jurisdiction: stateInfo ? {
        state: stateInfo.state,
        abbreviation: stateInfo.abbr,
        stateSpecificRegulations: stateSpecific
      } : jurisdiction ? { status: 'not_found', provided: jurisdiction } : null,
      sizeConcerns: sizeConcerns.length > 0 ? sizeConcerns : null,
      internationalConsiderations: intlConcerns.length > 0 ? intlConcerns : null,
      nextSteps: [
        'Consult with a licensed attorney for jurisdiction-specific compliance guidance',
        'Conduct a detailed compliance gap analysis for each applicable regulation',
        'Develop written compliance policies and procedures',
        'Implement employee training programs',
        'Establish a compliance monitoring and audit schedule'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── A2A Protocol ────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'JUSTICE Legal Agent',
    description: 'General legal & contract law intelligence - contract analysis, NDA review, statute research, clause drafting, compliance checking',
    version: '1.0.0',
    protocol: 'a2a',
    capabilities: ['contract-analysis', 'nda-review', 'statute-research', 'clause-drafting', 'compliance-checking'],
    endpoints: {
      base: `http://localhost:${PORT}`,
      health: '/health',
      legal: ['/analyze/contract', '/analyze/nda', '/research/statute', '/draft/clause', '/compliance/check']
    },
    tags: ['legal', 'contract', 'nda', 'compliance', 'statute', 'silkweb']
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
  ║   JUSTICE Legal Agent                   ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /analyze/contract                ║
  ║   POST /analyze/nda                     ║
  ║   POST /research/statute                ║
  ║   POST /draft/clause                    ║
  ║   POST /compliance/check                ║
  ║                                         ║
  ║   Data: ${legalTerms.length} terms, ${Object.keys(clauseTemplates).length} templates     ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
