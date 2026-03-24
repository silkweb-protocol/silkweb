// ─────────────────────────────────────────────
// SilkWeb FORTRESS — Criminal Defense Agent
// Charge analysis, rights explanation, evidence analysis, sentencing, charge comparison
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3010;

app.use(express.json({ limit: '2mb' }));

const DISCLAIMER = 'This is AI-generated legal information, not legal advice. Consult a licensed attorney for advice specific to your situation.';

// ─── Load data ───────────────────────────────

const federalCharges = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'federal-charges.json'), 'utf8'));
const rightsBySituation = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rights-by-situation.json'), 'utf8'));
const defenses = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'defenses.json'), 'utf8'));

// Build lookup indexes
const chargesByName = {};
for (const c of federalCharges) {
  chargesByName[c.charge.toLowerCase()] = c;
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
    agent: 'fortress-defense', version: '1.0.0', status: 'operational',
    endpoints: [
      'POST /analyze/charge', 'POST /rights/explain', 'POST /analyze/evidence',
      'POST /sentencing/guide', 'POST /compare/charges'
    ],
    capabilities: ['charge-analysis', 'rights-explanation', 'evidence-suppression', 'sentencing-guidelines', 'charge-comparison']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/info', (req, res) => {
  res.json({
    id: 'fortress-defense', name: 'FORTRESS', version: '1.0.0',
    description: 'Criminal Defense Agent - charge analysis, constitutional rights, evidence suppression, sentencing guidelines, charge comparison',
    capabilities: ['charge-analysis', 'rights-explanation', 'evidence-suppression', 'sentencing-guidelines', 'charge-comparison'],
    endpoints: [
      { method: 'POST', path: '/analyze/charge', description: 'Analyze criminal charges, elements, penalties, and defenses' },
      { method: 'POST', path: '/rights/explain', description: 'Explain constitutional rights by situation type' },
      { method: 'POST', path: '/analyze/evidence', description: 'Analyze evidence for potential suppression arguments' },
      { method: 'POST', path: '/sentencing/guide', description: 'Sentencing guidelines and factors' },
      { method: 'POST', path: '/compare/charges', description: 'Compare penalties across multiple charges' }
    ],
    dataLoaded: { federalCharges: federalCharges.length, situations: Object.keys(rightsBySituation).length, defenses: defenses.length },
    disclaimer: DISCLAIMER
  });
});

// ─── Helper: find charge ─────────────────────

function findCharge(query) {
  if (!query) return null;
  const queryLower = query.toLowerCase().trim();

  // Exact match
  if (chargesByName[queryLower]) return chargesByName[queryLower];

  // Partial match
  for (const c of federalCharges) {
    if (c.charge.toLowerCase().includes(queryLower) || queryLower.includes(c.charge.toLowerCase())) return c;
    if (c.statute && queryLower.includes(c.statute.toLowerCase().replace(/\s+/g, ''))) return c;
  }

  // Keyword match
  const keywords = {
    'fraud': 'Wire Fraud', 'wire': 'Wire Fraud', 'mail fraud': 'Mail Fraud',
    'tax': 'Tax Evasion', 'evasion': 'Tax Evasion',
    'bank': 'Bank Fraud', 'identity': 'Identity Theft',
    'launder': 'Money Laundering', 'drug': 'Drug Trafficking / Distribution',
    'trafficking': 'Drug Trafficking / Distribution', 'possession': 'Drug Possession (Simple)',
    'conspir': 'Conspiracy', 'assault': 'Assault on Federal Officer',
    'felon in possession': 'Firearms Possession by Felon', 'gun': 'Firearms Possession by Felon',
    'firearm': 'Firearms Possession by Felon', 'false statement': 'Making False Statements',
    'lying': 'Making False Statements', 'obstruct': 'Obstruction of Justice',
    'hack': 'Computer Fraud (CFAA)', 'computer': 'Computer Fraud (CFAA)',
    'kidnap': 'Kidnapping', 'embezzle': 'Embezzlement',
    'brib': 'Bribery of Public Official', 'perjury': 'Perjury',
    'rico': 'RICO (Racketeering)', 'racket': 'RICO (Racketeering)',
    'carjack': 'Carjacking', 'arson': 'Arson',
    'extort': 'Extortion (Hobbs Act)', 'securities': 'Securities Fraud',
    'insider': 'Insider Trading', 'counterfeit': 'Counterfeiting',
    'dui': 'DUI on Federal Property', 'dwi': 'DUI on Federal Property',
    'stalk': 'Stalking', 'hate crime': 'Hate Crime',
    'healthcare fraud': 'Healthcare Fraud', 'contempt': 'Contempt of Court',
    'threat': 'Threatening a Federal Official', 'domestic': 'Domestic Violence (Federal)',
    'sex offender': 'Failure to Register as Sex Offender',
    'robbery': 'Robbery (Federal)', 'rob': 'Robbery (Federal)',
    'smuggl': 'Alien Smuggling', 'bankruptcy': 'Bankruptcy Fraud',
    'witness': 'Witness Tampering', 'tamper': 'Witness Tampering',
    'stolen': 'Transporting Stolen Property', 'environmental': 'Environmental Crime (Clean Water Act)',
    'antitrust': 'Antitrust Violation (Sherman Act)', 'escape': 'Escape from Federal Custody',
    'manslaughter': 'DUI Manslaughter (Federal)', 'false claim': 'False Claims Act Violation'
  };

  for (const [kw, chargeName] of Object.entries(keywords)) {
    if (queryLower.includes(kw)) {
      return chargesByName[chargeName.toLowerCase()] || null;
    }
  }

  return null;
}

// ─── Helper: find applicable defenses ────────

function findDefenses(charge) {
  if (!charge) return [];
  const chargeLower = charge.charge.toLowerCase();
  const applicable = [];

  for (const def of defenses) {
    // Check applies_to
    let matches = false;
    for (const app of def.applies_to) {
      const appLower = app.toLowerCase();
      if (appLower === 'any crime' || chargeLower.includes(appLower) || appLower.includes(chargeLower.split(' ')[0])) {
        matches = true;
        break;
      }
    }

    // Constitutional defenses apply broadly
    if (def.category === 'constitutional' || def.category === 'procedural') {
      matches = true;
    }

    if (matches) {
      applicable.push({
        defense: def.defense,
        category: def.category,
        description: def.description,
        elements: def.elements,
        key_cases: def.key_cases
      });
    }
  }

  return applicable;
}

// ─── POST /analyze/charge ────────────────────

app.post('/analyze/charge', (req, res) => {
  try {
    const { charge, charges, jurisdiction } = req.body;
    const chargeList = charges || (charge ? [charge] : null);
    if (!chargeList || chargeList.length === 0) {
      return res.status(400).json({
        error: 'charge (string) or charges (array) is required',
        availableCharges: federalCharges.map(c => c.charge).slice(0, 20),
        note: `${federalCharges.length} federal charges in database`
      });
    }

    const analyses = [];

    for (const chargeName of chargeList) {
      const found = findCharge(chargeName);
      if (!found) {
        analyses.push({
          query: chargeName,
          found: false,
          note: 'Charge not found in federal database. Try a different search term or check state-level charges.',
          suggestions: federalCharges
            .filter(c => c.charge.toLowerCase().includes(chargeName.toLowerCase().split(' ')[0]))
            .map(c => c.charge)
            .slice(0, 5)
        });
        continue;
      }

      const applicableDefenses = findDefenses(found);

      analyses.push({
        charge: found.charge,
        statute: found.statute,
        classification: found.classification,
        elements: {
          prosecutionMustProve: found.elements,
          count: found.elements.length,
          note: 'Prosecution must prove EVERY element beyond a reasonable doubt'
        },
        penalties: {
          maxPrisonYears: found.max_prison_years,
          maxFine: found.max_fine,
          sentencingRangeMonths: found.sentencing_range_months,
          hasMandatoryMinimum: found.sentencing_range_months.low > 0,
          notes: found.notes
        },
        expungeable: found.expungeable,
        commonDefenses: applicableDefenses.slice(0, 8),
        classification_explanation: found.classification === 'felony'
          ? 'Felony: Serious offense punishable by more than one year in prison. Conviction results in loss of certain civil rights (voting, firearms possession in some jurisdictions).'
          : found.classification === 'misdemeanor'
          ? 'Misdemeanor: Less serious offense punishable by up to one year in jail.'
          : found.classification.includes('civil') ? 'May involve both civil and criminal penalties.'
          : `Classification: ${found.classification}`
      });
    }

    res.json({
      agent: 'fortress-defense',
      analysis: 'charge',
      timestamp: new Date().toISOString(),
      jurisdiction: jurisdiction || 'Federal',
      charges: analyses,
      generalAdvice: [
        'Do NOT discuss your case with anyone except your attorney',
        'Exercise your right to remain silent',
        'Request an attorney immediately if questioned by law enforcement',
        'Do not consent to searches',
        'Do not destroy any evidence or documents'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /rights/explain ────────────────────

app.post('/rights/explain', (req, res) => {
  try {
    const { situation } = req.body;
    if (!situation) {
      return res.status(400).json({
        error: 'situation is required',
        availableSituations: Object.keys(rightsBySituation).map(k => ({
          key: k,
          name: rightsBySituation[k].situation
        }))
      });
    }

    const sitLower = situation.toLowerCase().replace(/[\s_-]+/g, '_');

    // Find matching situation
    let matched = rightsBySituation[sitLower];
    if (!matched) {
      // Keyword search
      const keywords = {
        'traffic': 'traffic_stop', 'pulled over': 'traffic_stop', 'stop': 'traffic_stop',
        'arrest': 'arrest', 'handcuff': 'arrest', 'jail': 'arrest',
        'search': 'search', 'warrant': 'search',
        'interrogat': 'interrogation', 'question': 'interrogation', 'interview': 'interrogation',
        'protest': 'protest', 'demonstrat': 'protest', 'rally': 'protest', 'march': 'protest',
        'grand jury': 'grand_jury', 'subpoena': 'grand_jury'
      };

      for (const [kw, key] of Object.entries(keywords)) {
        if (sitLower.includes(kw.replace(/\s+/g, '_')) || situation.toLowerCase().includes(kw)) {
          matched = rightsBySituation[key];
          break;
        }
      }
    }

    if (!matched) {
      return res.status(400).json({
        error: `Situation "${situation}" not found`,
        availableSituations: Object.keys(rightsBySituation).map(k => ({
          key: k,
          name: rightsBySituation[k].situation
        }))
      });
    }

    res.json({
      agent: 'fortress-defense',
      analysis: 'rights',
      timestamp: new Date().toISOString(),
      situation: matched.situation,
      constitutionalBasis: matched.constitutional_basis,
      yourRights: matched.rights,
      whatToDo: matched.what_to_do,
      whatNotToDo: matched.what_not_to_do,
      whenToInvokeCounsel: matched.when_to_invoke_counsel,
      criticalPhrases: [
        '"I invoke my right to remain silent."',
        '"I want to speak with an attorney."',
        '"I do not consent to a search."',
        '"Am I free to go?"'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /analyze/evidence ──────────────────

app.post('/analyze/evidence', (req, res) => {
  try {
    const { evidenceType, howObtained, chainOfCustody, description } = req.body;
    if (!evidenceType && !description) {
      return res.status(400).json({ error: 'evidenceType or description is required' });
    }

    const type = (evidenceType || description || '').toLowerCase();
    const obtained = (howObtained || '').toLowerCase();
    const custody = (chainOfCustody || '').toLowerCase();

    const suppressionArguments = [];
    const strengthAssessment = [];

    // Fourth Amendment analysis
    if (obtained.includes('search') || obtained.includes('found') || obtained.includes('seized')) {
      if (!obtained.includes('warrant') && !obtained.includes('consent')) {
        suppressionArguments.push({
          basis: 'Fourth Amendment - Warrantless Search',
          argument: 'Evidence may have been obtained without a valid warrant or recognized exception to the warrant requirement.',
          strength: 'strong',
          keyCase: 'Mapp v. Ohio (1961) - exclusionary rule applies to states',
          exceptions: ['Search incident to arrest', 'Plain view doctrine', 'Exigent circumstances', 'Automobile exception', 'Consent', 'Inventory search', 'Terry stop (pat-down)']
        });
      }
      if (obtained.includes('consent')) {
        suppressionArguments.push({
          basis: 'Fourth Amendment - Validity of Consent',
          argument: 'Consent must be voluntary and not coerced. Challenge whether consent was freely given.',
          strength: 'moderate',
          keyCase: 'Schneckloth v. Bustamonte (1973) - totality of circumstances test',
          factors: ['Was person in custody?', 'Was person told they could refuse?', 'Were police weapons drawn?', 'Number of officers present', 'Age, education, intelligence of person']
        });
      }
      if (obtained.includes('warrant')) {
        suppressionArguments.push({
          basis: 'Fourth Amendment - Warrant Validity',
          argument: 'Challenge the probable cause supporting the warrant, the scope of the warrant, or the execution.',
          strength: 'moderate',
          keyCase: 'Franks v. Delaware (1978) - challenge false statements in warrant affidavit',
          issues: ['Was probable cause sufficient?', 'Was the warrant specific (particularity requirement)?', 'Did officers exceed the warrant scope?', 'Was the warrant stale?', 'Were there false statements in the affidavit?']
        });
      }
    }

    // Miranda analysis
    if (type.includes('statement') || type.includes('confession') || type.includes('admission') || type.includes('testimony')) {
      suppressionArguments.push({
        basis: 'Fifth Amendment - Miranda Violation',
        argument: 'Statements made during custodial interrogation without Miranda warnings are inadmissible.',
        strength: 'strong',
        keyCase: 'Miranda v. Arizona (1966)',
        requirements: ['Must be custodial (reasonable person would not feel free to leave)', 'Must be interrogation (questions or functional equivalent)', 'Warnings must be given before questioning', 'Waiver must be knowing, voluntary, and intelligent']
      });

      if (obtained.includes('coerce') || obtained.includes('threat') || obtained.includes('force') || obtained.includes('promise')) {
        suppressionArguments.push({
          basis: 'Fourteenth Amendment - Involuntary Confession',
          argument: 'Confessions obtained through coercion, threats, or promises of leniency are involuntary and inadmissible.',
          strength: 'strong',
          keyCase: 'Colorado v. Connelly (1986); Brown v. Mississippi (1936)',
          factors: ['Length of interrogation', 'Deprivation of food/sleep/bathroom', 'Threats or promises', 'Physical force or intimidation', 'Mental state of defendant', 'Age and vulnerability']
        });
      }
    }

    // Electronic evidence
    if (type.includes('phone') || type.includes('email') || type.includes('digital') || type.includes('computer') || type.includes('electronic') || type.includes('text') || type.includes('gps') || type.includes('location')) {
      suppressionArguments.push({
        basis: 'Fourth Amendment - Digital Privacy',
        argument: 'Cell phone searches generally require a warrant. GPS tracking and cell-site location data are protected.',
        strength: 'strong',
        keyCase: 'Riley v. California (2014) - warrant required for cell phone search; Carpenter v. United States (2018) - warrant required for CSLI',
        issues: ['Was a warrant obtained for the digital search?', 'Did the warrant specifically authorize the type of data seized?', 'Was third-party doctrine properly applied?', 'Were geofence or tower dump warrants overly broad?']
      });
    }

    // Wiretap / surveillance
    if (type.includes('wiretap') || type.includes('recording') || type.includes('surveil') || type.includes('listen')) {
      suppressionArguments.push({
        basis: 'Federal Wiretap Act (Title III) / Fourth Amendment',
        argument: 'Intercepted communications require a super-warrant under Title III with specific requirements.',
        strength: 'strong',
        keyCase: 'Katz v. United States (1967) - reasonable expectation of privacy',
        requirements: ['Title III order required for wire/oral/electronic intercept', 'Must show probable cause and necessity', 'Must minimize interception of non-relevant communications', 'Must specify persons, places, and offenses']
      });
    }

    // Chain of custody
    if (custody.includes('break') || custody.includes('gap') || custody.includes('unknown') || custody.includes('missing') || custody.includes('tamper')) {
      suppressionArguments.push({
        basis: 'Chain of Custody / Authentication',
        argument: 'Breaks in chain of custody may render evidence unreliable and subject to exclusion.',
        strength: 'moderate',
        keyCase: 'Melendez-Diaz v. Massachusetts (2009) - Confrontation Clause and forensic evidence',
        issues: ['Who had custody at all times?', 'Was evidence properly logged and stored?', 'Is there evidence of tampering or contamination?', 'Can each person in the chain testify?']
      });
    }

    // Fruit of the poisonous tree
    if (suppressionArguments.length > 0) {
      suppressionArguments.push({
        basis: 'Fruit of the Poisonous Tree Doctrine',
        argument: 'If the initial evidence was obtained illegally, ALL derivative evidence must also be suppressed.',
        strength: 'strong',
        keyCase: 'Wong Sun v. United States (1963)',
        exceptions: ['Independent source doctrine', 'Inevitable discovery doctrine', 'Attenuation doctrine (passage of time, intervening events)']
      });
    }

    // Overall assessment
    const strongArgs = suppressionArguments.filter(a => a.strength === 'strong').length;
    const modArgs = suppressionArguments.filter(a => a.strength === 'moderate').length;
    let overallAssessment;
    if (strongArgs >= 2) overallAssessment = 'Multiple strong suppression arguments available. High likelihood of successful challenge.';
    else if (strongArgs >= 1) overallAssessment = 'At least one strong suppression argument. Worth pursuing a suppression motion.';
    else if (modArgs >= 2) overallAssessment = 'Moderate suppression arguments available. Success depends on specific facts.';
    else if (suppressionArguments.length > 0) overallAssessment = 'Some suppression arguments may apply. Consult with an attorney for fact-specific analysis.';
    else overallAssessment = 'No clear suppression arguments identified based on the information provided. Provide more details about how the evidence was obtained.';

    res.json({
      agent: 'fortress-defense',
      analysis: 'evidence',
      timestamp: new Date().toISOString(),
      evidenceType: evidenceType || description,
      howObtained: howObtained || 'Not specified',
      suppressionArguments,
      overallAssessment,
      nextSteps: [
        'File a Motion to Suppress (pretrial) under the applicable rule',
        'Request a suppression hearing (Franks hearing if challenging warrant affidavit)',
        'Subpoena officers involved in evidence collection for testimony',
        'Obtain all police reports, body camera footage, and chain of custody records',
        'Consult with a criminal defense attorney experienced in search and seizure law'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /sentencing/guide ──────────────────

app.post('/sentencing/guide', (req, res) => {
  try {
    const { charge, criminalHistory, jurisdiction } = req.body;
    if (!charge) return res.status(400).json({ error: 'charge is required' });

    const found = findCharge(charge);
    if (!found) {
      return res.status(400).json({
        error: `Charge "${charge}" not found in database`,
        suggestions: federalCharges.map(c => c.charge).slice(0, 10)
      });
    }

    // Criminal history categories (simplified federal guidelines)
    const historyLevel = (criminalHistory || 'none').toLowerCase();
    let historyCategory = 1; // I through VI
    let historyDescription = 'No prior convictions';
    if (historyLevel.includes('minor') || historyLevel.includes('i') || historyLevel === '1') {
      historyCategory = 2;
      historyDescription = 'Minor criminal history (1-3 prior points)';
    } else if (historyLevel.includes('moderate') || historyLevel.includes('ii') || historyLevel === '2' || historyLevel === '3') {
      historyCategory = 3;
      historyDescription = 'Moderate criminal history (4-6 prior points)';
    } else if (historyLevel.includes('significant') || historyLevel.includes('iv') || historyLevel === '4') {
      historyCategory = 4;
      historyDescription = 'Significant criminal history (7-9 prior points)';
    } else if (historyLevel.includes('serious') || historyLevel.includes('v') || historyLevel === '5') {
      historyCategory = 5;
      historyDescription = 'Serious criminal history (10-12 prior points)';
    } else if (historyLevel.includes('extensive') || historyLevel.includes('vi') || historyLevel === '6') {
      historyCategory = 6;
      historyDescription = 'Extensive criminal history (13+ prior points)';
    }

    // Calculate adjusted sentencing range based on history
    const baseLow = found.sentencing_range_months.low;
    const baseHigh = found.sentencing_range_months.high;
    const historyMultiplier = 1 + (historyCategory - 1) * 0.15;
    const adjustedLow = Math.round(baseLow * historyMultiplier);
    const adjustedHigh = Math.min(Math.round(baseHigh * historyMultiplier), found.max_prison_years * 12);

    // Factors that increase sentence
    const aggravatingFactors = [
      'Leadership role in the offense',
      'Use of a weapon or threat of violence',
      'Vulnerable victim (elderly, minor, disabled)',
      'Obstruction of justice during investigation',
      'Large financial loss or many victims',
      'Abuse of position of trust',
      'Prior similar convictions',
      'Offense committed while on probation/parole'
    ];

    // Factors that decrease sentence
    const mitigatingFactors = [
      'Minor or minimal role in the offense',
      'Acceptance of responsibility (guilty plea)',
      'Cooperation with authorities (substantial assistance, USSG 5K1.1)',
      'No prior criminal history',
      'Mental health condition or diminished capacity',
      'Age (very young or elderly)',
      'Good character and community ties',
      'Aberrant behavior (one-time out-of-character act)',
      'Military service',
      'Family responsibilities (sole caretaker)'
    ];

    // Alternative sentencing options
    const alternatives = [];
    if (found.classification !== 'felony' || found.max_prison_years <= 5) {
      alternatives.push({ option: 'Probation', description: 'Supervised release in the community instead of incarceration', eligibility: 'Generally available for lower-level offenses' });
    }
    alternatives.push({ option: 'Home Confinement', description: 'Serving sentence at home with electronic monitoring', eligibility: 'Available for low-risk offenders, especially post-COVID expansion' });
    if (found.max_prison_years <= 10) {
      alternatives.push({ option: 'Community Service', description: 'Required hours of community service as part of or instead of sentence', eligibility: 'Often combined with probation' });
    }
    alternatives.push({ option: 'Drug/Mental Health Court', description: 'Specialized court program focusing on treatment rather than punishment', eligibility: 'Available for qualifying drug offenses and offenders with mental health issues' });
    alternatives.push({ option: 'Plea Bargain', description: 'Negotiated agreement for reduced charges or sentencing recommendation', eligibility: 'Available in most cases; approximately 97% of federal cases resolve through plea' });
    if (found.classification !== 'felony') {
      alternatives.push({ option: 'Diversion Program', description: 'Pre-trial program that may result in charges being dropped upon completion', eligibility: 'First-time offenders, non-violent offenses' });
    }
    if (found.expungeable) {
      alternatives.push({ option: 'Expungement', description: 'Record may be sealed or cleared after completion of sentence', eligibility: 'Available for qualifying offenses after waiting period' });
    }

    res.json({
      agent: 'fortress-defense',
      analysis: 'sentencing',
      timestamp: new Date().toISOString(),
      charge: found.charge,
      statute: found.statute,
      classification: found.classification,
      criminalHistory: {
        category: historyCategory,
        description: historyDescription
      },
      sentencingRange: {
        statutoryMaximum: {
          prisonYears: found.max_prison_years,
          fine: found.max_fine
        },
        guidelinesRange: {
          lowMonths: adjustedLow,
          highMonths: adjustedHigh,
          lowYears: Math.round(adjustedLow / 12 * 10) / 10,
          highYears: Math.round(adjustedHigh / 12 * 10) / 10,
          note: 'Federal sentencing guidelines are advisory post-Booker (2005). Judges may depart.'
        },
        mandatoryMinimum: baseLow > 0 ? {
          months: baseLow,
          note: 'Mandatory minimum sentence required by statute. Safety valve may apply (18 USC 3553(f)).'
        } : null
      },
      aggravatingFactors,
      mitigatingFactors,
      alternativeSentencing: alternatives,
      keyConsiderations: [
        'Federal sentencing guidelines are advisory, not mandatory (United States v. Booker, 2005)',
        'Judges consider 18 USC 3553(a) factors: nature of offense, history, deterrence, public protection, rehabilitation',
        'Acceptance of responsibility typically reduces offense level by 2-3 levels',
        'Substantial assistance to authorities (5K1.1 motion) can result in sentence below mandatory minimum',
        'Good time credit: inmates may earn up to 54 days per year off their sentence',
        'First Step Act (2018) expanded early release and rehabilitation programs'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /compare/charges ───────────────────

app.post('/compare/charges', (req, res) => {
  try {
    const { charges } = req.body;
    if (!charges || !Array.isArray(charges) || charges.length < 2) {
      return res.status(400).json({ error: 'charges array with at least 2 entries is required' });
    }

    const comparisons = [];
    const notFound = [];

    for (const chargeName of charges) {
      const found = findCharge(chargeName);
      if (found) {
        comparisons.push({
          charge: found.charge,
          statute: found.statute,
          classification: found.classification,
          maxPrisonYears: found.max_prison_years,
          maxFine: found.max_fine,
          mandatoryMinimumMonths: found.sentencing_range_months.low,
          maxSentenceMonths: found.sentencing_range_months.high,
          expungeable: found.expungeable,
          elementCount: found.elements.length,
          notes: found.notes
        });
      } else {
        notFound.push(chargeName);
      }
    }

    if (comparisons.length < 2) {
      return res.status(400).json({
        error: 'Need at least 2 valid charges to compare',
        notFound,
        suggestions: federalCharges.map(c => c.charge).slice(0, 15)
      });
    }

    // Sort by severity (max prison years)
    const sorted = [...comparisons].sort((a, b) => a.maxPrisonYears - b.maxPrisonYears);
    const leastSevere = sorted[0];
    const mostSevere = sorted[sorted.length - 1];

    // Identify negotiable charges (typically those with no mandatory minimum and lower penalties)
    const negotiable = comparisons.filter(c => c.mandatoryMinimumMonths === 0 && c.classification !== 'felony');
    const withMandatoryMin = comparisons.filter(c => c.mandatoryMinimumMonths > 0);

    // Plea bargain analysis
    const pleaAnalysis = [];
    if (comparisons.length >= 2) {
      pleaAnalysis.push({
        strategy: 'Charge Bargaining',
        description: `Negotiate to plead to ${leastSevere.charge} (max ${leastSevere.maxPrisonYears} years) instead of ${mostSevere.charge} (max ${mostSevere.maxPrisonYears} years)`,
        potentialBenefit: `Up to ${mostSevere.maxPrisonYears - leastSevere.maxPrisonYears} years reduction in maximum exposure`
      });
    }
    if (withMandatoryMin.length > 0 && comparisons.some(c => c.mandatoryMinimumMonths === 0)) {
      pleaAnalysis.push({
        strategy: 'Avoid Mandatory Minimum',
        description: `Negotiate to plead to a charge without mandatory minimum instead of ${withMandatoryMin[0].charge} (${withMandatoryMin[0].mandatoryMinimumMonths} month minimum)`,
        potentialBenefit: 'Gives judge full sentencing discretion, including probation'
      });
    }
    if (comparisons.some(c => c.expungeable) && comparisons.some(c => !c.expungeable)) {
      const expungeable = comparisons.find(c => c.expungeable);
      pleaAnalysis.push({
        strategy: 'Preserve Record',
        description: `Negotiate to plead to ${expungeable.charge} which is eligible for expungement`,
        potentialBenefit: 'Conviction may eventually be removed from criminal record'
      });
    }
    pleaAnalysis.push({
      strategy: 'Sentence Bargaining',
      description: 'Negotiate an agreed-upon sentence or sentencing recommendation with the prosecution',
      potentialBenefit: 'Predictability in sentencing outcome'
    });

    res.json({
      agent: 'fortress-defense',
      analysis: 'charge-comparison',
      timestamp: new Date().toISOString(),
      charges: comparisons,
      notFound: notFound.length > 0 ? notFound : null,
      comparison: {
        leastSevere: { charge: leastSevere.charge, maxPrisonYears: leastSevere.maxPrisonYears },
        mostSevere: { charge: mostSevere.charge, maxPrisonYears: mostSevere.maxPrisonYears },
        sentenceSpread: `${mostSevere.maxPrisonYears - leastSevere.maxPrisonYears} years difference in maximum penalty`,
        chargesWithMandatoryMinimum: withMandatoryMin.map(c => ({ charge: c.charge, minimumMonths: c.mandatoryMinimumMonths })),
        expungeableCharges: comparisons.filter(c => c.expungeable).map(c => c.charge)
      },
      pleaBargainAnalysis: pleaAnalysis,
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── A2A Protocol ────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'FORTRESS Defense Agent',
    description: 'Criminal defense intelligence - charge analysis, constitutional rights, evidence suppression, sentencing guidelines, charge comparison',
    version: '1.0.0',
    protocol: 'a2a',
    capabilities: ['charge-analysis', 'rights-explanation', 'evidence-suppression', 'sentencing-guidelines', 'charge-comparison'],
    endpoints: {
      base: `http://localhost:${PORT}`,
      health: '/health',
      legal: ['/analyze/charge', '/rights/explain', '/analyze/evidence', '/sentencing/guide', '/compare/charges']
    },
    tags: ['legal', 'criminal-defense', 'rights', 'sentencing', 'evidence', 'silkweb']
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
  ║   FORTRESS Defense Agent                ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /analyze/charge                  ║
  ║   POST /rights/explain                  ║
  ║   POST /analyze/evidence                ║
  ║   POST /sentencing/guide                ║
  ║   POST /compare/charges                 ║
  ║                                         ║
  ║   Data: ${federalCharges.length} charges, ${defenses.length} defenses         ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
