// ─────────────────────────────────────────────
// SilkWeb SHIELD — Personal Injury / Accident Attorney Agent
// Case evaluation, damage calculation, statute checks, insurance analysis, action guides
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json({ limit: '2mb' }));

const DISCLAIMER = 'This is AI-generated legal information, not legal advice. Consult a licensed attorney for advice specific to your situation.';

// ─── Load data ───────────────────────────────

const injuryTypes = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'injury-types.json'), 'utf8'));
const statutesOfLimitations = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'statutes-of-limitations.json'), 'utf8'));
const damageMultipliers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'damage-multipliers.json'), 'utf8'));

// Build lookup indexes
const injuryByType = {};
for (const inj of injuryTypes) {
  injuryByType[inj.type.toLowerCase()] = inj;
}
const solByAbbr = {};
const solByName = {};
for (const s of statutesOfLimitations) {
  solByAbbr[s.abbr.toUpperCase()] = s;
  solByName[s.state.toLowerCase()] = s;
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
    agent: 'shield-injury', version: '1.0.0', status: 'operational',
    endpoints: [
      'POST /evaluate/case', 'POST /calculate/damages', 'POST /check/statute',
      'POST /analyze/insurance', 'POST /guide/steps'
    ],
    capabilities: ['case-evaluation', 'damage-calculation', 'statute-of-limitations', 'insurance-analysis', 'action-guide']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/info', (req, res) => {
  res.json({
    id: 'shield-injury', name: 'SHIELD', version: '1.0.0',
    description: 'Personal Injury / Accident Attorney Agent - case evaluation, damage calculation, statute checks, insurance analysis',
    capabilities: ['case-evaluation', 'damage-calculation', 'statute-of-limitations', 'insurance-analysis', 'action-guide'],
    endpoints: [
      { method: 'POST', path: '/evaluate/case', description: 'Evaluate personal injury case strength and potential damages' },
      { method: 'POST', path: '/calculate/damages', description: 'Calculate economic and non-economic damages' },
      { method: 'POST', path: '/check/statute', description: 'Check statute of limitations deadline' },
      { method: 'POST', path: '/analyze/insurance', description: 'Analyze insurance policy coverage' },
      { method: 'POST', path: '/guide/steps', description: 'Get immediate action checklist for accident type' }
    ],
    dataLoaded: { injuryTypes: injuryTypes.length, states: statutesOfLimitations.length },
    disclaimer: DISCLAIMER
  });
});

// ─── Helper: find injury type ────────────────

function findInjuryType(description) {
  if (!description) return null;
  const descLower = description.toLowerCase();

  // Exact match
  if (injuryByType[descLower]) return injuryByType[descLower];

  // Partial match
  for (const inj of injuryTypes) {
    const typeLower = inj.type.toLowerCase();
    if (descLower.includes(typeLower) || typeLower.includes(descLower)) return inj;
  }

  // Keyword match
  const keywords = {
    'whiplash': 'Whiplash',
    'herniat': 'Herniated Disc',
    'concussion': 'Concussion / Mild TBI',
    'tbi': 'Traumatic Brain Injury (Severe)',
    'brain': 'Traumatic Brain Injury (Severe)',
    'broken arm': 'Broken Arm / Wrist',
    'wrist': 'Broken Arm / Wrist',
    'broken leg': 'Broken Leg / Ankle',
    'ankle': 'Broken Leg / Ankle',
    'rib': 'Broken Ribs',
    'spinal cord': 'Spinal Cord Injury (Incomplete)',
    'paralysis': 'Spinal Cord Injury (Complete / Paralysis)',
    'paraplegia': 'Spinal Cord Injury (Complete / Paralysis)',
    'quadriplegia': 'Spinal Cord Injury (Complete / Paralysis)',
    'acl': 'Torn ACL / MCL / Meniscus',
    'mcl': 'Torn ACL / MCL / Meniscus',
    'meniscus': 'Torn ACL / MCL / Meniscus',
    'rotator': 'Torn Rotator Cuff',
    'shoulder': 'Shoulder Dislocation',
    'burn': 'Burns (Second Degree)',
    'soft tissue': 'Soft Tissue Injury (Sprains/Strains)',
    'sprain': 'Soft Tissue Injury (Sprains/Strains)',
    'strain': 'Soft Tissue Injury (Sprains/Strains)',
    'organ': 'Internal Organ Damage',
    'internal': 'Internal Organ Damage',
    'amputation': 'Amputation',
    'scar': 'Scarring / Disfigurement',
    'disfigure': 'Scarring / Disfigurement',
    'ptsd': 'PTSD / Emotional Distress',
    'emotional': 'PTSD / Emotional Distress',
    'death': 'Wrongful Death',
    'wrongful death': 'Wrongful Death',
    'dog bite': 'Dog Bite',
    'bite': 'Dog Bite',
    'neck': 'Neck Injury (Non-Disc)',
    'back': 'Back Injury (Non-Disc)',
    'lumbar': 'Back Injury (Non-Disc)',
    'facial': 'Facial Fracture',
    'jaw': 'Facial Fracture',
    'dental': 'Dental Injury',
    'tooth': 'Dental Injury',
    'teeth': 'Dental Injury',
    'eye': 'Eye Injury / Vision Loss',
    'vision': 'Eye Injury / Vision Loss',
    'blind': 'Eye Injury / Vision Loss',
    'hearing': 'Hearing Loss',
    'deaf': 'Hearing Loss',
    'crush': 'Crush Injury',
    'nerve': 'Nerve Damage / Neuropathy',
    'neuropathy': 'Nerve Damage / Neuropathy',
    'hip': 'Pelvis / Hip Fracture',
    'pelvis': 'Pelvis / Hip Fracture'
  };

  for (const [kw, typeName] of Object.entries(keywords)) {
    if (descLower.includes(kw)) {
      return injuryByType[typeName.toLowerCase()] || null;
    }
  }

  return null;
}

// ─── Helper: resolve state ───────────────────

function resolveState(stateInput) {
  if (!stateInput) return null;
  const input = stateInput.trim();
  return solByAbbr[input.toUpperCase()] || solByName[input.toLowerCase()] || null;
}

// ─── Helper: determine severity multiplier ───

function getSeverityMultiplier(severity) {
  const map = {
    'mild': damageMultipliers.multipliers.find(m => m.severity === 'mild'),
    'mild_to_moderate': damageMultipliers.multipliers.find(m => m.severity === 'mild'),
    'moderate': damageMultipliers.multipliers.find(m => m.severity === 'moderate'),
    'moderate_to_severe': damageMultipliers.multipliers.find(m => m.severity === 'severe'),
    'severe': damageMultipliers.multipliers.find(m => m.severity === 'severe'),
    'catastrophic': damageMultipliers.multipliers.find(m => m.severity === 'catastrophic')
  };
  return map[severity] || damageMultipliers.multipliers.find(m => m.severity === 'moderate');
}

// ─── POST /evaluate/case ─────────────────────

app.post('/evaluate/case', (req, res) => {
  try {
    const { accidentType, injuries, circumstances, date, state } = req.body;
    if (!accidentType) return res.status(400).json({ error: 'accidentType is required (e.g., "car accident", "slip and fall", "workplace injury")' });

    const accidentLower = accidentType.toLowerCase();

    // Identify liable parties based on accident type
    const liableParties = [];
    if (accidentLower.includes('car') || accidentLower.includes('auto') || accidentLower.includes('vehicle') || accidentLower.includes('truck') || accidentLower.includes('motorcycle')) {
      liableParties.push({ party: 'Other driver', basis: 'Negligence (failure to exercise reasonable care while driving)' });
      if (accidentLower.includes('truck') || accidentLower.includes('commercial')) {
        liableParties.push({ party: 'Trucking company', basis: 'Respondeat superior / negligent hiring / FMCSA violations' });
      }
      liableParties.push({ party: 'Vehicle manufacturer (if defect)', basis: 'Product liability / strict liability' });
      liableParties.push({ party: 'Government entity (if road defect)', basis: 'Dangerous road condition / failure to maintain' });
    } else if (accidentLower.includes('slip') || accidentLower.includes('fall') || accidentLower.includes('trip')) {
      liableParties.push({ party: 'Property owner', basis: 'Premises liability / failure to maintain safe conditions' });
      liableParties.push({ party: 'Property manager / tenant', basis: 'Negligent maintenance' });
      liableParties.push({ party: 'Cleaning/maintenance company', basis: 'Negligent performance of duties' });
    } else if (accidentLower.includes('work') || accidentLower.includes('construction') || accidentLower.includes('industrial')) {
      liableParties.push({ party: 'Employer (workers comp)', basis: 'Workers compensation (no-fault system)' });
      liableParties.push({ party: 'Third-party contractor', basis: 'Negligence (if third party caused injury)' });
      liableParties.push({ party: 'Equipment manufacturer', basis: 'Product liability / strict liability' });
      liableParties.push({ party: 'Property owner', basis: 'Premises liability' });
    } else if (accidentLower.includes('medical') || accidentLower.includes('malpractice')) {
      liableParties.push({ party: 'Treating physician', basis: 'Medical malpractice / deviation from standard of care' });
      liableParties.push({ party: 'Hospital / medical facility', basis: 'Respondeat superior / institutional negligence' });
      liableParties.push({ party: 'Medical device manufacturer', basis: 'Product liability' });
    } else if (accidentLower.includes('dog') || accidentLower.includes('animal')) {
      liableParties.push({ party: 'Animal owner', basis: 'Strict liability / negligence (varies by state)' });
      liableParties.push({ party: 'Property owner (if on their premises)', basis: 'Premises liability' });
    } else if (accidentLower.includes('product') || accidentLower.includes('defect')) {
      liableParties.push({ party: 'Manufacturer', basis: 'Strict product liability / design defect / manufacturing defect' });
      liableParties.push({ party: 'Distributor', basis: 'Product liability (chain of distribution)' });
      liableParties.push({ party: 'Retailer', basis: 'Product liability (chain of distribution)' });
    } else {
      liableParties.push({ party: 'Responsible party', basis: 'Negligence (duty, breach, causation, damages)' });
    }

    // Process injuries
    const injuryAnalysis = [];
    const injuryList = Array.isArray(injuries) ? injuries : (injuries ? [injuries] : []);
    let totalEstLow = 0;
    let totalEstHigh = 0;

    for (const injury of injuryList) {
      const matched = findInjuryType(typeof injury === 'string' ? injury : injury.type || injury.description);
      if (matched) {
        injuryAnalysis.push({
          injury: matched.type,
          category: matched.category,
          severity: matched.severity,
          typicalTreatment: matched.typical_treatment,
          typicalRecoveryWeeks: matched.typical_treatment_weeks,
          estimatedSettlementRange: {
            low: matched.average_settlement_low,
            high: matched.average_settlement_high
          }
        });
        totalEstLow += matched.average_settlement_low;
        totalEstHigh += matched.average_settlement_high;
      } else {
        injuryAnalysis.push({
          injury: typeof injury === 'string' ? injury : JSON.stringify(injury),
          matched: false,
          note: 'Could not match to known injury type. Settlement estimate not included.'
        });
      }
    }

    // Case strength assessment
    let strengthScore = 5; // Base
    const strengthFactors = [];
    const redFlags = [];

    // Circumstances assessment
    const circLower = (circumstances || '').toLowerCase();
    if (circLower.includes('rear-end') || circLower.includes('rear end')) {
      strengthScore += 2;
      strengthFactors.push('Rear-end collision creates strong presumption of liability against following driver');
    }
    if (circLower.includes('drunk') || circLower.includes('dui') || circLower.includes('intoxicat')) {
      strengthScore += 2;
      strengthFactors.push('Intoxicated defendant significantly strengthens case and may support punitive damages');
    }
    if (circLower.includes('witness') || circLower.includes('camera') || circLower.includes('dashcam')) {
      strengthScore += 1;
      strengthFactors.push('Independent evidence (witnesses/video) strengthens credibility');
    }
    if (circLower.includes('police report') || circLower.includes('citation')) {
      strengthScore += 1;
      strengthFactors.push('Police report with citation supports liability determination');
    }
    if (circLower.includes('my fault') || circLower.includes('i was') || circLower.includes('ran red') || circLower.includes('speeding')) {
      strengthScore -= 2;
      redFlags.push('Potential comparative/contributory negligence may reduce or bar recovery');
    }
    if (circLower.includes('no treatment') || circLower.includes('refused treatment') || circLower.includes('gap in treatment')) {
      strengthScore -= 2;
      redFlags.push('Gap in medical treatment weakens causation argument');
    }
    if (circLower.includes('pre-existing') || circLower.includes('prior injury')) {
      strengthScore -= 1;
      redFlags.push('Pre-existing condition may complicate causation (but aggravation is compensable)');
    }

    // Injury severity bonus
    const hasSevere = injuryAnalysis.some(ia => ia.severity && (ia.severity.includes('severe') || ia.severity === 'catastrophic'));
    if (hasSevere) {
      strengthScore += 1;
      strengthFactors.push('Severe injuries typically result in higher settlements');
    }

    strengthScore = Math.max(1, Math.min(10, strengthScore));

    // Check SOL
    let solInfo = null;
    const stateInfo = resolveState(state);
    if (stateInfo && date) {
      const accidentDate = new Date(date);
      if (!isNaN(accidentDate.getTime())) {
        const deadlineDate = new Date(accidentDate);
        deadlineDate.setFullYear(deadlineDate.getFullYear() + stateInfo.personal_injury_years);
        const daysRemaining = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
        solInfo = {
          state: stateInfo.state,
          years: stateInfo.personal_injury_years,
          deadline: deadlineDate.toISOString().split('T')[0],
          daysRemaining,
          urgent: daysRemaining < 90,
          expired: daysRemaining < 0
        };
        if (daysRemaining < 0) {
          redFlags.push(`CRITICAL: Statute of limitations appears to have EXPIRED ${Math.abs(daysRemaining)} days ago`);
          strengthScore = 1;
        } else if (daysRemaining < 90) {
          redFlags.push(`URGENT: Only ${daysRemaining} days remaining to file before statute of limitations expires`);
        }
      }
    }

    res.json({
      agent: 'shield-injury',
      evaluation: 'case',
      timestamp: new Date().toISOString(),
      accidentType,
      caseStrength: {
        score: strengthScore,
        level: strengthScore >= 8 ? 'Strong' : strengthScore >= 6 ? 'Moderate-Strong' : strengthScore >= 4 ? 'Moderate' : strengthScore >= 2 ? 'Weak' : 'Very Weak',
        factors: strengthFactors,
        redFlags: redFlags.length > 0 ? redFlags : null
      },
      liableParties,
      injuries: injuryAnalysis,
      estimatedDamagesRange: injuryAnalysis.length > 0 ? {
        low: totalEstLow,
        high: totalEstHigh,
        note: 'Based on average settlement data for matched injury types. Actual value depends on many factors.'
      } : null,
      statuteOfLimitations: solInfo,
      nextSteps: [
        'Document all injuries with photographs',
        'Seek immediate medical attention if not already done',
        'Obtain copies of all medical records and bills',
        'Do NOT give recorded statements to opposing insurance',
        'Consult with a personal injury attorney (most offer free consultations)'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /calculate/damages ─────────────────

app.post('/calculate/damages', (req, res) => {
  try {
    const { injuries, medicalCosts, lostWages, futureMedical, futureLostWages, painSuffering, severity } = req.body;
    if (!medicalCosts && !injuries) {
      return res.status(400).json({ error: 'medicalCosts (number) or injuries (array) required' });
    }

    // Calculate economic damages
    const medical = typeof medicalCosts === 'number' ? medicalCosts : 0;
    const wages = typeof lostWages === 'number' ? lostWages : 0;
    const futureMed = typeof futureMedical === 'number' ? futureMedical : 0;
    const futureWages = typeof futureLostWages === 'number' ? futureLostWages : 0;

    const totalEconomicDamages = medical + wages + futureMed + futureWages;

    // Determine multiplier
    let severityLevel = severity || 'moderate';
    if (injuries) {
      const injuryList = Array.isArray(injuries) ? injuries : [injuries];
      for (const inj of injuryList) {
        const matched = findInjuryType(typeof inj === 'string' ? inj : inj.type || inj.description);
        if (matched) {
          const sevOrder = ['mild', 'mild_to_moderate', 'moderate', 'moderate_to_severe', 'severe', 'catastrophic'];
          const currentIdx = sevOrder.indexOf(severityLevel);
          const matchedIdx = sevOrder.indexOf(matched.severity);
          if (matchedIdx > currentIdx) severityLevel = matched.severity;
        }
      }
    }

    const multiplierData = getSeverityMultiplier(severityLevel);
    const nonEconomicLow = Math.round(totalEconomicDamages * multiplierData.multiplier_low);
    const nonEconomicHigh = Math.round(totalEconomicDamages * multiplierData.multiplier_high);

    // Per diem method alternative
    const injuryList = Array.isArray(injuries) ? injuries : (injuries ? [injuries] : []);
    let recoveryDays = 90; // default
    for (const inj of injuryList) {
      const matched = findInjuryType(typeof inj === 'string' ? inj : inj.type || inj.description);
      if (matched && matched.typical_treatment_weeks * 7 > recoveryDays) {
        recoveryDays = matched.typical_treatment_weeks * 7;
      }
    }

    const perDiem = damageMultipliers.per_diem_method;
    const perDiemLow = recoveryDays * perDiem.typical_daily_rate_low;
    const perDiemHigh = recoveryDays * perDiem.typical_daily_rate_high;

    const totalLow = totalEconomicDamages + nonEconomicLow;
    const totalHigh = totalEconomicDamages + nonEconomicHigh;

    res.json({
      agent: 'shield-injury',
      calculation: 'damages',
      timestamp: new Date().toISOString(),
      economicDamages: {
        medicalCosts: medical,
        lostWages: wages,
        futureMedicalCosts: futureMed,
        futureLostWages: futureWages,
        totalEconomic: totalEconomicDamages
      },
      nonEconomicDamages: {
        method: 'multiplier',
        severity: severityLevel,
        multiplierRange: { low: multiplierData.multiplier_low, high: multiplierData.multiplier_high },
        estimatedRange: { low: nonEconomicLow, high: nonEconomicHigh },
        description: multiplierData.description
      },
      alternativeMethod: {
        method: 'per_diem',
        recoveryDays,
        dailyRateRange: { low: perDiem.typical_daily_rate_low, high: perDiem.typical_daily_rate_high },
        estimatedRange: { low: perDiemLow, high: perDiemHigh }
      },
      totalEstimatedDamages: {
        multiplierMethod: { low: totalLow, high: totalHigh },
        perDiemMethod: { low: totalEconomicDamages + perDiemLow, high: totalEconomicDamages + perDiemHigh }
      },
      notes: [
        'These are estimates based on general formulas. Actual case value depends on jurisdiction, jury, evidence, and many other factors.',
        'Insurance policy limits may cap actual recovery regardless of calculated damages.',
        'Comparative/contributory negligence may reduce recovery by your percentage of fault.',
        'Future damages should be discounted to present value for litigation purposes.'
      ],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /check/statute ─────────────────────

app.post('/check/statute', (req, res) => {
  try {
    const { accidentType, state, accidentDate } = req.body;
    if (!state) return res.status(400).json({ error: 'state (US state name or abbreviation) is required' });
    if (!accidentDate) return res.status(400).json({ error: 'accidentDate (ISO date string) is required' });

    const stateInfo = resolveState(state);
    if (!stateInfo) {
      return res.status(400).json({ error: `State "${state}" not found. Use full state name or two-letter abbreviation.` });
    }

    const date = new Date(accidentDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }

    // Determine applicable SOL based on accident type
    const typeLower = (accidentType || 'personal injury').toLowerCase();
    let solYears = stateInfo.personal_injury_years;
    let solType = 'Personal Injury';

    if (typeLower.includes('death') || typeLower.includes('fatal')) {
      solYears = stateInfo.wrongful_death_years;
      solType = 'Wrongful Death';
    } else if (typeLower.includes('medical') || typeLower.includes('malpractice')) {
      solYears = stateInfo.medical_malpractice_years;
      solType = 'Medical Malpractice';
    } else if (typeLower.includes('product') || typeLower.includes('defect')) {
      solYears = stateInfo.product_liability_years;
      solType = 'Product Liability';
    }

    const deadlineDate = new Date(date);
    // Handle fractional years (e.g., NY med mal is 2.5 years)
    const fullYears = Math.floor(solYears);
    const remainingMonths = Math.round((solYears - fullYears) * 12);
    deadlineDate.setFullYear(deadlineDate.getFullYear() + fullYears);
    deadlineDate.setMonth(deadlineDate.getMonth() + remainingMonths);

    const now = new Date();
    const daysRemaining = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((deadlineDate - date) / (1000 * 60 * 60 * 24));
    const elapsed = totalDays - daysRemaining;
    const percentElapsed = Math.round((elapsed / totalDays) * 100);

    let status;
    if (daysRemaining < 0) status = 'EXPIRED';
    else if (daysRemaining < 30) status = 'CRITICAL';
    else if (daysRemaining < 90) status = 'URGENT';
    else if (daysRemaining < 180) status = 'APPROACHING';
    else status = 'ACTIVE';

    res.json({
      agent: 'shield-injury',
      check: 'statute-of-limitations',
      timestamp: new Date().toISOString(),
      state: { name: stateInfo.state, abbreviation: stateInfo.abbr },
      accidentType: solType,
      accidentDate: date.toISOString().split('T')[0],
      statute: {
        years: solYears,
        deadline: deadlineDate.toISOString().split('T')[0],
        daysRemaining: Math.max(0, daysRemaining),
        status,
        percentElapsed: Math.min(100, percentElapsed)
      },
      filingRequirements: {
        discoveryRule: stateInfo.discovery_rule ? 'Yes - SOL may be tolled until injury is discovered or reasonably should have been discovered' : 'No',
        minorTolling: stateInfo.minor_tolling,
        notes: stateInfo.notes
      },
      allStatutesForState: {
        personalInjury: `${stateInfo.personal_injury_years} years`,
        wrongfulDeath: `${stateInfo.wrongful_death_years} years`,
        medicalMalpractice: `${stateInfo.medical_malpractice_years} years`,
        productLiability: `${stateInfo.product_liability_years} years`
      },
      urgentActions: status === 'EXPIRED'
        ? ['The statute of limitations appears to have expired. Consult an attorney IMMEDIATELY to explore exceptions (discovery rule, tolling, minority).']
        : status === 'CRITICAL' || status === 'URGENT'
        ? ['File a complaint or petition IMMEDIATELY', 'Contact a personal injury attorney TODAY', 'Gather and preserve all evidence', 'Document all damages and medical treatment']
        : ['Monitor the deadline and plan to file well in advance', 'Continue documenting all damages and treatment', 'Consult with a personal injury attorney to evaluate your case'],
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /analyze/insurance ─────────────────

app.post('/analyze/insurance', (req, res) => {
  try {
    const { policyType, coverageLimits, deductible, details } = req.body;
    if (!policyType) return res.status(400).json({ error: 'policyType is required (e.g., "auto", "homeowners", "umbrella", "health")' });

    const typeLower = policyType.toLowerCase();

    const analysis = {
      policyType: typeLower,
      coverageAssessment: [],
      gaps: [],
      strategies: []
    };

    // Parse coverage limits
    const limits = coverageLimits || {};
    const ded = deductible || 0;

    if (typeLower.includes('auto')) {
      // Analyze auto policy
      const bodilyInjury = limits.bodilyInjury || limits.bi || 0;
      const propertyDamage = limits.propertyDamage || limits.pd || 0;
      const um = limits.uninsuredMotorist || limits.um || 0;
      const uim = limits.underinsuredMotorist || limits.uim || 0;
      const medPay = limits.medPay || limits.pip || 0;

      if (bodilyInjury > 0) {
        analysis.coverageAssessment.push({
          coverage: 'Bodily Injury Liability',
          limit: bodilyInjury,
          assessment: bodilyInjury >= 100000 ? 'Adequate' : bodilyInjury >= 50000 ? 'Minimum acceptable' : 'Below recommended minimum',
          recommendation: bodilyInjury < 100000 ? 'Consider increasing to at least $100,000/$300,000' : null
        });
      } else {
        analysis.gaps.push({ gap: 'No bodily injury liability coverage identified', severity: 'critical', recommendation: 'Bodily injury liability is required in most states and protects your assets' });
      }

      if (propertyDamage > 0) {
        analysis.coverageAssessment.push({
          coverage: 'Property Damage Liability',
          limit: propertyDamage,
          assessment: propertyDamage >= 50000 ? 'Adequate' : 'Below recommended minimum',
          recommendation: propertyDamage < 50000 ? 'Consider increasing to at least $50,000' : null
        });
      }

      if (um > 0 || uim > 0) {
        analysis.coverageAssessment.push({
          coverage: 'Uninsured/Underinsured Motorist',
          limit: um || uim,
          assessment: 'Present',
          recommendation: (um || uim) < bodilyInjury ? 'Consider matching UM/UIM to your BI limits' : null
        });
      } else {
        analysis.gaps.push({ gap: 'No uninsured/underinsured motorist coverage', severity: 'high', recommendation: 'UM/UIM coverage protects you when the at-fault driver has insufficient insurance. Highly recommended.' });
      }

      if (medPay > 0) {
        analysis.coverageAssessment.push({ coverage: 'Medical Payments / PIP', limit: medPay, assessment: medPay >= 5000 ? 'Adequate' : 'Low' });
      } else {
        analysis.gaps.push({ gap: 'No medical payments or PIP coverage', severity: 'medium', recommendation: 'MedPay/PIP covers your medical bills regardless of fault and can supplement health insurance' });
      }

      analysis.strategies.push('If the at-fault driver\'s policy limits are low, pursue a claim against your own UIM coverage');
      analysis.strategies.push('File a MedPay/PIP claim immediately for medical expenses (no-fault coverage)');
      analysis.strategies.push('Do not accept the first settlement offer from the insurance company');
      analysis.strategies.push('Document all damages thoroughly before accepting any settlement');

    } else if (typeLower.includes('home') || typeLower.includes('renter')) {
      const liability = limits.liability || limits.personalLiability || 0;
      const medical = limits.medicalPayments || 0;

      if (liability > 0) {
        analysis.coverageAssessment.push({
          coverage: 'Personal Liability',
          limit: liability,
          assessment: liability >= 300000 ? 'Adequate' : liability >= 100000 ? 'Minimum' : 'Below recommended',
          recommendation: liability < 300000 ? 'Consider increasing liability to at least $300,000' : null
        });
      } else {
        analysis.gaps.push({ gap: 'No personal liability coverage identified', severity: 'critical' });
      }

      if (medical > 0) {
        analysis.coverageAssessment.push({ coverage: 'Medical Payments to Others', limit: medical, assessment: 'Present' });
      }

      analysis.strategies.push('Homeowner liability covers injuries on your property (slip and fall, dog bite, etc.)');
      analysis.strategies.push('Consider an umbrella policy for additional liability protection');

    } else if (typeLower.includes('umbrella')) {
      const umbrellaLimit = limits.umbrella || limits.limit || 0;
      if (umbrellaLimit > 0) {
        analysis.coverageAssessment.push({
          coverage: 'Umbrella / Excess Liability',
          limit: umbrellaLimit,
          assessment: umbrellaLimit >= 1000000 ? 'Good additional protection' : 'Consider higher limit',
          recommendation: 'Umbrella policies are cost-effective protection. Consider coverage equal to your net worth.'
        });
      }
      analysis.strategies.push('Umbrella coverage kicks in after underlying policy limits are exhausted');
      analysis.strategies.push('Verify that your underlying policies meet the umbrella carrier\'s minimum requirements');
    }

    // General strategies
    analysis.strategies.push('Request a complete copy of the at-fault party\'s insurance policy');
    analysis.strategies.push('Check if you have any other policies that might provide additional coverage');
    if (ded > 0) {
      analysis.coverageAssessment.push({ coverage: 'Deductible', amount: ded, note: 'This amount comes out of pocket before coverage applies. May be recoverable from at-fault party.' });
    }

    // Overall assessment
    const criticalGaps = analysis.gaps.filter(g => g.severity === 'critical').length;
    const highGaps = analysis.gaps.filter(g => g.severity === 'high').length;
    let overallRating;
    if (criticalGaps > 0) overallRating = 'Significant coverage gaps detected';
    else if (highGaps > 0) overallRating = 'Some important coverage gaps';
    else if (analysis.gaps.length > 0) overallRating = 'Minor coverage gaps';
    else overallRating = 'Coverage appears adequate';

    res.json({
      agent: 'shield-injury',
      analysis: 'insurance',
      timestamp: new Date().toISOString(),
      overallRating,
      coverage: analysis.coverageAssessment,
      coverageGaps: analysis.gaps,
      strategies: analysis.strategies,
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /guide/steps ───────────────────────

const ACTION_GUIDES = {
  'car accident': {
    immediate: [
      'Check for injuries and call 911 if anyone is hurt',
      'Move to a safe location if possible (shoulder, parking lot)',
      'Turn on hazard lights',
      'Call the police to file an accident report',
      'Exchange information: name, phone, insurance, license plate, driver\'s license',
      'Take photos of: vehicle damage, license plates, intersection/road, injuries, weather conditions',
      'Get contact information from witnesses',
      'Seek medical attention even if you feel fine (some injuries are delayed)',
      'Note the time, date, and exact location'
    ],
    doNot: [
      'Do NOT admit fault or apologize (this can be used against you)',
      'Do NOT give a recorded statement to the other driver\'s insurance',
      'Do NOT sign any documents from the insurance company without attorney review',
      'Do NOT post about the accident on social media',
      'Do NOT accept the first settlement offer',
      'Do NOT discuss the accident with anyone except your attorney and your insurance'
    ],
    within24Hours: [
      'See a doctor or visit urgent care for a medical evaluation',
      'Report the accident to YOUR insurance company',
      'Start a journal documenting your pain, symptoms, and limitations',
      'Save all receipts for expenses related to the accident'
    ],
    within1Week: [
      'Obtain a copy of the police report',
      'Follow up with your doctor and follow all treatment recommendations',
      'Research and consult with a personal injury attorney (free consultation)',
      'Begin keeping track of missed work and lost wages',
      'Contact your health insurance about coverage for treatment'
    ],
    deadlines: [
      'Statute of limitations varies by state (typically 1-6 years for personal injury)',
      'Property damage claims may have shorter deadlines',
      'Government entity claims often require notice within 30-180 days',
      'Insurance claim filing deadlines vary by policy (check your policy)'
    ]
  },
  'slip and fall': {
    immediate: [
      'Report the incident to the property owner, manager, or employee on duty',
      'Request that they create an incident report and get a copy',
      'Take photos of: the hazard that caused the fall, your injuries, the surrounding area, any warning signs (or lack thereof)',
      'Identify and get contact info from any witnesses',
      'Seek medical attention immediately',
      'Note the exact time, date, and location',
      'Preserve the shoes and clothing you were wearing'
    ],
    doNot: [
      'Do NOT say "I\'m fine" or minimize your injuries',
      'Do NOT give a recorded statement to the property owner\'s insurance',
      'Do NOT sign any incident report you disagree with',
      'Do NOT return to the location to investigate on your own',
      'Do NOT post about the fall on social media'
    ],
    within24Hours: [
      'Get a full medical evaluation documenting all injuries',
      'Write down everything you remember about the fall while it is fresh',
      'Note any maintenance issues, wet floors, uneven surfaces, poor lighting'
    ],
    within1Week: [
      'Consult with a premises liability attorney',
      'Request preservation of surveillance video (it may be overwritten)',
      'Obtain medical records from your visit',
      'Document ongoing symptoms and limitations'
    ],
    deadlines: [
      'Government property: Notice of claim often required within 30-180 days',
      'Surveillance video: Request preservation ASAP (often overwritten in 7-30 days)',
      'Statute of limitations: Varies by state (typically 2-6 years)'
    ]
  },
  'workplace injury': {
    immediate: [
      'Report the injury to your supervisor/employer IMMEDIATELY',
      'Seek medical attention (employer may direct you to specific provider)',
      'Document the injury: photos, witness names, description of what happened',
      'File a workers compensation claim with your employer',
      'Note the exact time, date, location, and what you were doing'
    ],
    doNot: [
      'Do NOT delay reporting the injury to your employer',
      'Do NOT assume the injury is minor (some conditions worsen)',
      'Do NOT let your employer discourage you from filing a workers comp claim',
      'Do NOT sign any settlement without attorney review',
      'Do NOT discuss fault or how the injury happened with coworkers on record'
    ],
    within24Hours: [
      'Get a complete medical evaluation',
      'Document all injuries and symptoms',
      'Keep copies of all forms you sign'
    ],
    within1Week: [
      'File the formal workers compensation claim (deadlines vary by state)',
      'Consult with a workers compensation attorney if the claim is denied or delayed',
      'Identify if a third party (not employer) may be liable (allows separate lawsuit)',
      'Check if OSHA violations contributed to the injury'
    ],
    deadlines: [
      'Workers comp reporting deadlines: 30-90 days in most states (varies)',
      'Workers comp filing deadline: 1-3 years in most states',
      'Third-party liability claims: Standard personal injury SOL applies',
      'OSHA complaint: 6 months from the incident'
    ]
  },
  'medical malpractice': {
    immediate: [
      'Document any symptoms, complications, or adverse outcomes',
      'Seek a second medical opinion from an independent provider',
      'Obtain copies of ALL medical records from the treating provider',
      'Take photos of any visible injuries or complications'
    ],
    doNot: [
      'Do NOT confront the treating physician about suspected malpractice',
      'Do NOT sign any releases or waivers from the healthcare provider',
      'Do NOT delay seeking corrective medical treatment',
      'Do NOT destroy any medical documents, prescriptions, or devices'
    ],
    within24Hours: [
      'Get evaluated by a different physician',
      'Start documenting a timeline of all treatments and outcomes',
      'Keep all medications, devices, or products related to your treatment'
    ],
    within1Week: [
      'Consult with a medical malpractice attorney (many work on contingency)',
      'Request a complete copy of your medical records',
      'Begin documenting how the injury affects your daily life'
    ],
    deadlines: [
      'Medical malpractice SOL: Typically 1-3 years (shorter than general PI in many states)',
      'Discovery rule: SOL may start when you knew or should have known about the malpractice',
      'Many states require a Certificate of Merit from a medical expert before filing',
      'Some states require pre-suit mediation or medical review panel'
    ]
  },
  'dog bite': {
    immediate: [
      'Move away from the animal to prevent further injury',
      'Call 911 if the injury is severe',
      'Wash the wound thoroughly with soap and warm water',
      'Identify the dog and its owner (name, address, phone)',
      'Take photos of the injury, the animal, and the location',
      'Get witness contact information',
      'Report the bite to animal control'
    ],
    doNot: [
      'Do NOT delay medical treatment (risk of infection and rabies)',
      'Do NOT accept a quick cash settlement from the dog owner',
      'Do NOT give a statement to the owner\'s homeowner\'s insurance without an attorney'
    ],
    within24Hours: [
      'Seek medical attention (antibiotics, tetanus shot, rabies evaluation)',
      'File an animal control report',
      'Document the injury with dated photographs'
    ],
    within1Week: [
      'Follow up on rabies vaccination status of the animal',
      'Consult with a personal injury attorney',
      'Research if your state has strict liability for dog bites',
      'Document any scarring, nerve damage, or emotional effects'
    ],
    deadlines: [
      'Rabies prophylaxis: Must begin within days if animal\'s status is unknown',
      'Animal control report: File as soon as possible',
      'Personal injury SOL: Standard for your state (1-6 years)'
    ]
  }
};

app.post('/guide/steps', (req, res) => {
  try {
    const { accidentType } = req.body;
    if (!accidentType) return res.status(400).json({
      error: 'accidentType is required',
      availableTypes: Object.keys(ACTION_GUIDES)
    });

    const typeLower = accidentType.toLowerCase();
    let guide = null;

    // Match accident type
    for (const [key, val] of Object.entries(ACTION_GUIDES)) {
      if (typeLower.includes(key) || key.includes(typeLower)) {
        guide = { type: key, ...val };
        break;
      }
    }

    // Keyword fallback
    if (!guide) {
      if (typeLower.includes('car') || typeLower.includes('auto') || typeLower.includes('vehicle') || typeLower.includes('truck') || typeLower.includes('motorcycle') || typeLower.includes('pedestrian')) {
        guide = { type: 'car accident', ...ACTION_GUIDES['car accident'] };
      } else if (typeLower.includes('slip') || typeLower.includes('fall') || typeLower.includes('trip')) {
        guide = { type: 'slip and fall', ...ACTION_GUIDES['slip and fall'] };
      } else if (typeLower.includes('work') || typeLower.includes('construction') || typeLower.includes('job')) {
        guide = { type: 'workplace injury', ...ACTION_GUIDES['workplace injury'] };
      } else if (typeLower.includes('medical') || typeLower.includes('doctor') || typeLower.includes('hospital') || typeLower.includes('surgery') || typeLower.includes('malpractice')) {
        guide = { type: 'medical malpractice', ...ACTION_GUIDES['medical malpractice'] };
      } else if (typeLower.includes('dog') || typeLower.includes('bite') || typeLower.includes('animal')) {
        guide = { type: 'dog bite', ...ACTION_GUIDES['dog bite'] };
      }
    }

    if (!guide) {
      // Provide general guide
      guide = {
        type: 'general accident',
        immediate: [
          'Ensure your safety and call 911 if there are injuries',
          'Document the scene with photos and video',
          'Get contact information from witnesses',
          'Report the incident to appropriate authorities',
          'Seek medical attention even for seemingly minor injuries'
        ],
        doNot: [
          'Do NOT admit fault',
          'Do NOT give recorded statements to opposing insurance companies',
          'Do NOT sign anything without attorney review',
          'Do NOT post about the incident on social media'
        ],
        within24Hours: [
          'Get a full medical evaluation',
          'Document all injuries and property damage',
          'Report to your insurance company'
        ],
        within1Week: [
          'Consult with a personal injury attorney',
          'Obtain copies of any reports filed',
          'Begin documenting ongoing symptoms and expenses'
        ],
        deadlines: [
          'Check your state statute of limitations for personal injury',
          'Government entity claims may require early notice (30-180 days)'
        ]
      };
    }

    res.json({
      agent: 'shield-injury',
      guide: 'action-steps',
      timestamp: new Date().toISOString(),
      accidentType: guide.type,
      immediateActions: guide.immediate,
      whatNotToDo: guide.doNot,
      within24Hours: guide.within24Hours,
      within1Week: guide.within1Week,
      criticalDeadlines: guide.deadlines,
      disclaimer: DISCLAIMER
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── A2A Protocol ────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'SHIELD Injury Agent',
    description: 'Personal injury & accident attorney intelligence - case evaluation, damage calculation, statute of limitations, insurance analysis',
    version: '1.0.0',
    protocol: 'a2a',
    capabilities: ['case-evaluation', 'damage-calculation', 'statute-of-limitations', 'insurance-analysis', 'action-guide'],
    endpoints: {
      base: `http://localhost:${PORT}`,
      health: '/health',
      legal: ['/evaluate/case', '/calculate/damages', '/check/statute', '/analyze/insurance', '/guide/steps']
    },
    tags: ['legal', 'personal-injury', 'accident', 'damages', 'insurance', 'silkweb']
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
  ║   SHIELD Injury Agent                   ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /evaluate/case                   ║
  ║   POST /calculate/damages               ║
  ║   POST /check/statute                   ║
  ║   POST /analyze/insurance               ║
  ║   POST /guide/steps                     ║
  ║                                         ║
  ║   Data: ${injuryTypes.length} injury types, ${statutesOfLimitations.length} states     ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
