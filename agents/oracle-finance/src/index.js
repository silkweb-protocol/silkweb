// ─────────────────────────────────────────────
// SilkWeb ORACLE — Financial Intelligence & Analysis Agent
// Real financial ratio calculation, risk scoring, fraud detection (Benford's law), compliance
// ─────────────────────────────────────────────

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3006;

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
    agent: 'oracle-finance', version: '1.0.0', status: 'operational',
    endpoints: ['POST /analyze/company', 'POST /analyze/risk', 'POST /detect/fraud', 'POST /compliance/check'],
    capabilities: ['financial-ratio-analysis', 'company-health-scoring', 'partnership-risk', 'benfords-law', 'fraud-detection', 'regulatory-compliance']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/info', (req, res) => {
  res.json({
    id: 'oracle-finance', name: 'ORACLE', version: '1.0.0',
    description: 'Financial Intelligence Agent - company analysis, risk scoring, fraud detection, compliance checking',
    capabilities: ['financial-ratio-analysis', 'company-health-scoring', 'partnership-risk', 'benfords-law', 'fraud-detection', 'regulatory-compliance'],
    endpoints: [
      { method: 'POST', path: '/analyze/company', description: 'Calculate 15+ financial ratios, health score A-F' },
      { method: 'POST', path: '/analyze/risk', description: 'Partnership risk score between two companies' },
      { method: 'POST', path: '/detect/fraud', description: 'Benfords law, duplicate detection, anomaly flagging' },
      { method: 'POST', path: '/compliance/check', description: 'Applicable regulations per jurisdiction' }
    ],
    protocol: 'silkweb-agent/1.0'
  });
});

// ── Financial Ratio Calculations ─────────────

function calculateRatios(financials) {
  const f = financials;
  const ratios = {};

  // Liquidity Ratios
  if (f.currentAssets !== undefined && f.currentLiabilities) {
    ratios.currentRatio = round(f.currentAssets / f.currentLiabilities);
  }
  if (f.currentAssets !== undefined && f.inventory !== undefined && f.currentLiabilities) {
    ratios.quickRatio = round((f.currentAssets - (f.inventory || 0)) / f.currentLiabilities);
  }
  if (f.cash !== undefined && f.currentLiabilities) {
    ratios.cashRatio = round(f.cash / f.currentLiabilities);
  }

  // Profitability Ratios
  if (f.revenue && f.costOfGoodsSold !== undefined) {
    ratios.grossMargin = round(((f.revenue - f.costOfGoodsSold) / f.revenue) * 100);
  }
  if (f.netIncome !== undefined && f.revenue) {
    ratios.netProfitMargin = round((f.netIncome / f.revenue) * 100);
  }
  if (f.operatingIncome !== undefined && f.revenue) {
    ratios.operatingMargin = round((f.operatingIncome / f.revenue) * 100);
  }
  if (f.netIncome !== undefined && f.totalAssets) {
    ratios.returnOnAssets = round((f.netIncome / f.totalAssets) * 100);
  }
  if (f.netIncome !== undefined && f.shareholderEquity) {
    ratios.returnOnEquity = round((f.netIncome / f.shareholderEquity) * 100);
  }
  if (f.ebitda !== undefined && f.revenue) {
    ratios.ebitdaMargin = round((f.ebitda / f.revenue) * 100);
  }

  // Leverage Ratios
  if (f.totalDebt !== undefined && f.shareholderEquity) {
    ratios.debtToEquity = round(f.totalDebt / f.shareholderEquity);
  }
  if (f.totalDebt !== undefined && f.totalAssets) {
    ratios.debtToAssets = round(f.totalDebt / f.totalAssets);
  }
  if (f.ebitda && f.interestExpense) {
    ratios.interestCoverage = round(f.ebitda / f.interestExpense);
  }
  if (f.totalDebt !== undefined && f.ebitda) {
    ratios.debtToEBITDA = round(f.totalDebt / f.ebitda);
  }

  // Efficiency Ratios
  if (f.revenue && f.totalAssets) {
    ratios.assetTurnover = round(f.revenue / f.totalAssets);
  }
  if (f.costOfGoodsSold && f.inventory) {
    ratios.inventoryTurnover = round(f.costOfGoodsSold / f.inventory);
    ratios.daysInventory = round(365 / ratios.inventoryTurnover);
  }
  if (f.revenue && f.accountsReceivable) {
    ratios.receivablesTurnover = round(f.revenue / f.accountsReceivable);
    ratios.daysSalesOutstanding = round(365 / ratios.receivablesTurnover);
  }

  // Valuation Ratios
  if (f.marketCap && f.netIncome && f.netIncome > 0) {
    ratios.priceToEarnings = round(f.marketCap / f.netIncome);
  }
  if (f.marketCap && f.revenue) {
    ratios.priceToSales = round(f.marketCap / f.revenue);
  }
  if (f.marketCap && f.bookValue) {
    ratios.priceToBook = round(f.marketCap / f.bookValue);
  }

  // Cash Flow
  if (f.operatingCashFlow !== undefined && f.currentLiabilities) {
    ratios.operatingCashFlowRatio = round(f.operatingCashFlow / f.currentLiabilities);
  }
  if (f.freeCashFlow !== undefined && f.revenue) {
    ratios.freeCashFlowMargin = round((f.freeCashFlow / f.revenue) * 100);
  }

  return ratios;
}

function round(val) {
  if (!isFinite(val)) return null;
  return Math.round(val * 100) / 100;
}

function scoreCompanyHealth(ratios) {
  let score = 50; // Start neutral
  const flags = [];
  const strengths = [];

  // Liquidity
  if (ratios.currentRatio !== undefined) {
    if (ratios.currentRatio >= 2) { score += 8; strengths.push('Strong current ratio'); }
    else if (ratios.currentRatio >= 1.5) { score += 5; }
    else if (ratios.currentRatio >= 1) { score += 2; }
    else { score -= 10; flags.push('Current ratio below 1 - liquidity risk'); }
  }
  if (ratios.quickRatio !== undefined) {
    if (ratios.quickRatio >= 1) score += 5;
    else if (ratios.quickRatio < 0.5) { score -= 5; flags.push('Low quick ratio'); }
  }

  // Profitability
  if (ratios.netProfitMargin !== undefined) {
    if (ratios.netProfitMargin >= 20) { score += 10; strengths.push('Excellent profit margins'); }
    else if (ratios.netProfitMargin >= 10) score += 7;
    else if (ratios.netProfitMargin >= 5) score += 3;
    else if (ratios.netProfitMargin >= 0) score += 0;
    else { score -= 10; flags.push('Negative profit margin'); }
  }
  if (ratios.returnOnEquity !== undefined) {
    if (ratios.returnOnEquity >= 20) { score += 8; strengths.push('High return on equity'); }
    else if (ratios.returnOnEquity >= 10) score += 5;
    else if (ratios.returnOnEquity < 0) { score -= 5; flags.push('Negative ROE'); }
  }
  if (ratios.grossMargin !== undefined) {
    if (ratios.grossMargin >= 50) score += 5;
    else if (ratios.grossMargin >= 30) score += 3;
    else if (ratios.grossMargin < 15) { score -= 3; flags.push('Low gross margin'); }
  }

  // Leverage
  if (ratios.debtToEquity !== undefined) {
    if (ratios.debtToEquity <= 0.5) { score += 8; strengths.push('Conservative debt levels'); }
    else if (ratios.debtToEquity <= 1) score += 4;
    else if (ratios.debtToEquity <= 2) score -= 2;
    else { score -= 10; flags.push('High debt-to-equity ratio'); }
  }
  if (ratios.interestCoverage !== undefined) {
    if (ratios.interestCoverage >= 5) score += 5;
    else if (ratios.interestCoverage >= 2) score += 2;
    else if (ratios.interestCoverage < 1.5) { score -= 8; flags.push('Weak interest coverage - debt servicing risk'); }
  }
  if (ratios.debtToEBITDA !== undefined) {
    if (ratios.debtToEBITDA <= 2) score += 3;
    else if (ratios.debtToEBITDA > 4) { score -= 5; flags.push('High debt relative to EBITDA'); }
  }

  // Efficiency
  if (ratios.assetTurnover !== undefined) {
    if (ratios.assetTurnover >= 1) score += 3;
    else if (ratios.assetTurnover < 0.3) { score -= 2; flags.push('Low asset utilization'); }
  }

  // Cash Flow
  if (ratios.freeCashFlowMargin !== undefined) {
    if (ratios.freeCashFlowMargin >= 15) { score += 5; strengths.push('Strong free cash flow'); }
    else if (ratios.freeCashFlowMargin < 0) { score -= 5; flags.push('Negative free cash flow'); }
  }

  score = Math.max(0, Math.min(100, score));

  let grade;
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return { score, grade, flags, strengths };
}

// ── POST /analyze/company ────────────────────

app.post('/analyze/company', (req, res) => {
  try {
    const { company, financials } = req.body;
    if (!financials) return res.status(400).json({ error: 'financials object required with fields like revenue, netIncome, totalAssets, etc.' });

    const ratios = calculateRatios(financials);
    const health = scoreCompanyHealth(ratios);

    // Industry benchmarks (generic)
    const benchmarks = {
      currentRatio: { good: '>= 1.5', excellent: '>= 2.0', poor: '< 1.0' },
      netProfitMargin: { good: '>= 10%', excellent: '>= 20%', poor: '< 0%' },
      debtToEquity: { good: '<= 1.0', excellent: '<= 0.5', poor: '> 2.0' },
      returnOnEquity: { good: '>= 15%', excellent: '>= 20%', poor: '< 5%' },
      interestCoverage: { good: '>= 3x', excellent: '>= 5x', poor: '< 1.5x' }
    };

    res.json({
      agent: 'oracle-finance', analysis: 'company', timestamp: new Date().toISOString(),
      company: company || 'Unknown',
      financials: {
        inputData: financials,
        ratios: {
          liquidity: { currentRatio: ratios.currentRatio, quickRatio: ratios.quickRatio, cashRatio: ratios.cashRatio },
          profitability: { grossMargin: pct(ratios.grossMargin), netProfitMargin: pct(ratios.netProfitMargin), operatingMargin: pct(ratios.operatingMargin), returnOnAssets: pct(ratios.returnOnAssets), returnOnEquity: pct(ratios.returnOnEquity), ebitdaMargin: pct(ratios.ebitdaMargin) },
          leverage: { debtToEquity: ratios.debtToEquity, debtToAssets: ratios.debtToAssets, interestCoverage: ratios.interestCoverage ? `${ratios.interestCoverage}x` : null, debtToEBITDA: ratios.debtToEBITDA ? `${ratios.debtToEBITDA}x` : null },
          efficiency: { assetTurnover: ratios.assetTurnover, inventoryTurnover: ratios.inventoryTurnover, daysInventory: ratios.daysInventory, receivablesTurnover: ratios.receivablesTurnover, daysSalesOutstanding: ratios.daysSalesOutstanding },
          valuation: { priceToEarnings: ratios.priceToEarnings, priceToSales: ratios.priceToSales, priceToBook: ratios.priceToBook },
          cashFlow: { operatingCashFlowRatio: ratios.operatingCashFlowRatio, freeCashFlowMargin: pct(ratios.freeCashFlowMargin) }
        },
        ratioCount: Object.values(ratios).filter(v => v !== null && v !== undefined).length
      },
      healthAssessment: health,
      benchmarks
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function pct(val) {
  if (val === null || val === undefined) return null;
  return `${val}%`;
}

// ── POST /analyze/risk ───────────────────────

app.post('/analyze/risk', (req, res) => {
  try {
    const { companyA, companyB } = req.body;
    if (!companyA || !companyB) return res.status(400).json({ error: 'companyA and companyB required, each with name and financials' });

    const ratiosA = calculateRatios(companyA.financials || {});
    const ratiosB = calculateRatios(companyB.financials || {});
    const healthA = scoreCompanyHealth(ratiosA);
    const healthB = scoreCompanyHealth(ratiosB);

    // Risk dimensions
    const risks = [];
    let riskScore = 0;

    // Financial health disparity
    const healthGap = Math.abs(healthA.score - healthB.score);
    if (healthGap > 30) { risks.push({ factor: 'Financial Health Disparity', severity: 'high', detail: `${healthGap} point gap in health scores`, score: 20 }); riskScore += 20; }
    else if (healthGap > 15) { risks.push({ factor: 'Financial Health Disparity', severity: 'medium', detail: `${healthGap} point gap`, score: 10 }); riskScore += 10; }

    // Leverage risk
    const maxDebt = Math.max(ratiosA.debtToEquity || 0, ratiosB.debtToEquity || 0);
    if (maxDebt > 3) { risks.push({ factor: 'High Leverage Exposure', severity: 'high', detail: `One party has D/E of ${maxDebt}`, score: 15 }); riskScore += 15; }
    else if (maxDebt > 2) { risks.push({ factor: 'Moderate Leverage', severity: 'medium', detail: `Max D/E of ${maxDebt}`, score: 8 }); riskScore += 8; }

    // Profitability risk
    const minMargin = Math.min(ratiosA.netProfitMargin || 0, ratiosB.netProfitMargin || 0);
    if (minMargin < 0) { risks.push({ factor: 'Unprofitable Partner', severity: 'high', detail: `Negative margin: ${minMargin}%`, score: 20 }); riskScore += 20; }
    else if (minMargin < 5) { risks.push({ factor: 'Thin Margins', severity: 'medium', detail: `Minimum margin: ${minMargin}%`, score: 8 }); riskScore += 8; }

    // Liquidity risk
    const minCurrent = Math.min(ratiosA.currentRatio || 999, ratiosB.currentRatio || 999);
    if (minCurrent < 1) { risks.push({ factor: 'Liquidity Risk', severity: 'high', detail: `Current ratio below 1`, score: 15 }); riskScore += 15; }
    else if (minCurrent < 1.5) { risks.push({ factor: 'Moderate Liquidity Concern', severity: 'medium', detail: `Min current ratio: ${minCurrent}`, score: 5 }); riskScore += 5; }

    // Size mismatch (revenue)
    if (companyA.financials?.revenue && companyB.financials?.revenue) {
      const ratio = Math.max(companyA.financials.revenue, companyB.financials.revenue) / Math.min(companyA.financials.revenue, companyB.financials.revenue);
      if (ratio > 100) { risks.push({ factor: 'Extreme Size Mismatch', severity: 'medium', detail: `Revenue ratio: ${Math.round(ratio)}x`, score: 10 }); riskScore += 10; }
      else if (ratio > 10) { risks.push({ factor: 'Size Mismatch', severity: 'low', detail: `Revenue ratio: ${Math.round(ratio)}x`, score: 5 }); riskScore += 5; }
    }

    // Concentration risk
    if (healthA.flags.length > 3 || healthB.flags.length > 3) {
      risks.push({ factor: 'Multiple Red Flags', severity: 'high', detail: `Combined flags: ${healthA.flags.length + healthB.flags.length}`, score: 10 });
      riskScore += 10;
    }

    riskScore = Math.min(100, riskScore);
    let riskGrade;
    if (riskScore <= 10) riskGrade = 'Low Risk';
    else if (riskScore <= 25) riskGrade = 'Moderate Risk';
    else if (riskScore <= 50) riskGrade = 'Elevated Risk';
    else if (riskScore <= 75) riskGrade = 'High Risk';
    else riskGrade = 'Critical Risk';

    res.json({
      agent: 'oracle-finance', analysis: 'partnership-risk', timestamp: new Date().toISOString(),
      companyA: { name: companyA.name || 'Company A', healthGrade: healthA.grade, healthScore: healthA.score },
      companyB: { name: companyB.name || 'Company B', healthGrade: healthB.grade, healthScore: healthB.score },
      partnershipRisk: {
        score: riskScore, grade: riskGrade,
        riskFactors: risks.sort((a, b) => b.score - a.score),
        recommendation: riskScore <= 25 ? 'Partnership appears financially viable' :
          riskScore <= 50 ? 'Proceed with caution - address identified risk factors' :
          'Significant risk - recommend additional due diligence and risk mitigation measures'
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /detect/fraud ───────────────────────

function benfordsLaw(numbers) {
  // Expected distribution of leading digits (Benford's Law)
  const expected = { 1: 30.1, 2: 17.6, 3: 12.5, 4: 9.7, 5: 7.9, 6: 6.7, 7: 5.8, 8: 5.1, 9: 4.6 };

  // Count leading digits
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let total = 0;

  for (const num of numbers) {
    const abs = Math.abs(num);
    if (abs < 1) continue; // Skip zeros and tiny fractions
    const leading = parseInt(String(abs).replace(/^0+\.?0*/, '')[0]);
    if (leading >= 1 && leading <= 9) {
      counts[leading]++;
      total++;
    }
  }

  if (total < 10) return { valid: false, reason: 'Insufficient data (need at least 10 non-zero numbers)' };

  // Calculate observed distribution
  const observed = {};
  for (let d = 1; d <= 9; d++) {
    observed[d] = round((counts[d] / total) * 100);
  }

  // Chi-squared test
  let chiSquared = 0;
  const digitAnalysis = [];
  for (let d = 1; d <= 9; d++) {
    const exp = (expected[d] / 100) * total;
    const obs = counts[d];
    const chi = ((obs - exp) ** 2) / exp;
    chiSquared += chi;
    const deviation = round(observed[d] - expected[d]);
    digitAnalysis.push({
      digit: d, observed: observed[d], expected: expected[d],
      deviation, count: obs,
      status: Math.abs(deviation) > 5 ? 'anomalous' : 'normal'
    });
  }
  chiSquared = round(chiSquared);

  // Critical value for 8 degrees of freedom at 0.05 significance: 15.507
  const suspicious = chiSquared > 15.507;
  const veryAnomalous = chiSquared > 20.09; // p < 0.01

  return {
    valid: true, totalNumbers: total,
    distribution: { observed, expected },
    digitAnalysis,
    chiSquaredStatistic: chiSquared,
    degreesOfFreedom: 8,
    criticalValue: 15.507,
    pValueThreshold: 0.05,
    result: veryAnomalous ? 'highly_suspicious' : suspicious ? 'suspicious' : 'normal',
    interpretation: veryAnomalous
      ? 'Data significantly deviates from Benfords Law (p < 0.01) - strong indicator of fabricated or manipulated numbers'
      : suspicious
      ? 'Data deviates from Benfords Law (p < 0.05) - warrants further investigation'
      : 'Data follows Benfords Law distribution - consistent with naturally occurring numbers'
  };
}

function detectDuplicates(transactions) {
  const seen = {};
  const duplicates = [];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    // Create a fingerprint from amount + description (if available)
    const key = `${t.amount || ''}_${(t.description || '').toLowerCase().trim()}_${t.date || ''}`;
    if (seen[key] !== undefined) {
      duplicates.push({
        indices: [seen[key], i],
        amount: t.amount,
        description: t.description || null,
        date: t.date || null,
        type: 'exact_duplicate'
      });
    }
    seen[key] = i;

    // Check near-duplicates (same amount, close dates)
    for (let j = i + 1; j < Math.min(i + 10, transactions.length); j++) {
      const other = transactions[j];
      if (t.amount === other.amount && t.amount > 0 && t.description !== other.description) {
        duplicates.push({
          indices: [i, j],
          amount: t.amount,
          descriptions: [t.description, other.description],
          type: 'same_amount_different_description'
        });
      }
    }
  }

  return duplicates;
}

function detectAnomalies(transactions) {
  const amounts = transactions.map(t => t.amount).filter(a => typeof a === 'number');
  if (amounts.length < 3) return [];

  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length);

  const anomalies = [];
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (typeof t.amount !== 'number') continue;
    const zScore = stdDev > 0 ? (t.amount - mean) / stdDev : 0;

    if (Math.abs(zScore) > 3) {
      anomalies.push({ index: i, amount: t.amount, zScore: round(zScore), type: 'statistical_outlier', severity: 'high', description: t.description || null });
    } else if (Math.abs(zScore) > 2) {
      anomalies.push({ index: i, amount: t.amount, zScore: round(zScore), type: 'statistical_outlier', severity: 'medium', description: t.description || null });
    }

    // Round number bias (fraud often uses round numbers)
    if (t.amount > 100 && t.amount % 100 === 0) {
      anomalies.push({ index: i, amount: t.amount, type: 'round_number', severity: 'low', description: t.description || null });
    }

    // Just below threshold (common in fraud to avoid approval limits)
    const thresholds = [1000, 5000, 10000, 25000, 50000];
    for (const threshold of thresholds) {
      if (t.amount >= threshold * 0.95 && t.amount < threshold) {
        anomalies.push({ index: i, amount: t.amount, type: 'just_below_threshold', threshold, severity: 'medium', description: t.description || null });
      }
    }
  }

  return anomalies;
}

app.post('/detect/fraud', (req, res) => {
  try {
    const { numbers, transactions } = req.body;
    if (!numbers && !transactions) {
      return res.status(400).json({ error: 'Provide numbers (array) for Benfords law analysis, or transactions (array of {amount, description, date}) for duplicate/anomaly detection' });
    }

    const result = { agent: 'oracle-finance', analysis: 'fraud-detection', timestamp: new Date().toISOString() };
    let overallRisk = 0;
    const flags = [];

    // Benford's Law
    if (numbers || transactions) {
      const nums = numbers || transactions.map(t => t.amount).filter(a => typeof a === 'number');
      const benford = benfordsLaw(nums);
      result.benfordsLaw = benford;
      if (benford.valid) {
        if (benford.result === 'highly_suspicious') { overallRisk += 40; flags.push('Benfords Law: highly suspicious distribution'); }
        else if (benford.result === 'suspicious') { overallRisk += 20; flags.push('Benfords Law: suspicious distribution'); }
      }
    }

    // Duplicate and anomaly detection
    if (transactions && Array.isArray(transactions)) {
      const duplicates = detectDuplicates(transactions);
      result.duplicateDetection = {
        duplicatesFound: duplicates.length,
        duplicates: duplicates.slice(0, 20)
      };
      if (duplicates.length > 0) {
        overallRisk += Math.min(30, duplicates.length * 5);
        flags.push(`${duplicates.length} potential duplicate transaction(s)`);
      }

      const anomalies = detectAnomalies(transactions);
      result.anomalyDetection = {
        anomaliesFound: anomalies.length,
        anomalies: anomalies.slice(0, 20),
        statistics: {
          mean: round(transactions.reduce((s, t) => s + (t.amount || 0), 0) / transactions.length),
          count: transactions.length
        }
      };
      const highAnomalies = anomalies.filter(a => a.severity === 'high').length;
      if (highAnomalies > 0) {
        overallRisk += Math.min(20, highAnomalies * 10);
        flags.push(`${highAnomalies} high-severity anomaly(ies)`);
      }
      const thresholdGaming = anomalies.filter(a => a.type === 'just_below_threshold').length;
      if (thresholdGaming > 0) {
        overallRisk += thresholdGaming * 5;
        flags.push(`${thresholdGaming} transaction(s) just below approval thresholds`);
      }
    }

    overallRisk = Math.min(100, overallRisk);
    result.overallAssessment = {
      riskScore: overallRisk,
      riskLevel: overallRisk <= 10 ? 'Low' : overallRisk <= 30 ? 'Moderate' : overallRisk <= 60 ? 'Elevated' : 'High',
      flags,
      recommendation: overallRisk <= 10 ? 'No significant fraud indicators detected'
        : overallRisk <= 30 ? 'Minor anomalies detected - routine review recommended'
        : overallRisk <= 60 ? 'Multiple fraud indicators - detailed forensic review recommended'
        : 'Significant fraud risk - immediate investigation and audit recommended'
    };

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /compliance/check ───────────────────

const REGULATIONS = {
  US: [
    { name: 'SOX (Sarbanes-Oxley)', applicability: 'Public companies listed on US exchanges', scope: 'Financial reporting, internal controls, auditor independence', penalty: 'Up to $5M fine and 20 years imprisonment for executives' },
    { name: 'Dodd-Frank Act', applicability: 'Financial institutions, public companies', scope: 'Systemic risk oversight, consumer protection, derivatives regulation', penalty: 'Varies by violation type' },
    { name: 'BSA/AML (Bank Secrecy Act)', applicability: 'Financial institutions, MSBs', scope: 'Anti-money laundering, suspicious activity reporting, KYC', penalty: 'Up to $1M per violation per day' },
    { name: 'FCPA (Foreign Corrupt Practices Act)', applicability: 'US companies and foreign issuers', scope: 'Anti-bribery, accurate books and records', penalty: 'Up to $250K fine and 5 years imprisonment per violation' },
    { name: 'SEC Regulations', applicability: 'Public companies, broker-dealers, investment advisers', scope: 'Securities registration, disclosure, insider trading', penalty: 'Varies; disgorgement, civil penalties, criminal charges' },
    { name: 'OFAC Sanctions', applicability: 'All US persons and entities', scope: 'Prohibited transactions with sanctioned parties/countries', penalty: 'Up to $20M fine and 30 years imprisonment' },
    { name: 'CCPA/CPRA', applicability: 'Companies handling California residents data (revenue > $25M)', scope: 'Data privacy, consumer rights, opt-out requirements', penalty: 'Up to $7,500 per intentional violation' }
  ],
  EU: [
    { name: 'GDPR', applicability: 'Any entity processing EU residents data', scope: 'Data protection, privacy, consent, breach notification', penalty: 'Up to 4% of global annual revenue or 20M EUR' },
    { name: 'MiFID II', applicability: 'Investment firms, trading venues', scope: 'Market transparency, investor protection, best execution', penalty: 'Up to 5M EUR or 10% of annual turnover' },
    { name: 'AMLD6 (6th Anti-Money Laundering Directive)', applicability: 'Financial institutions, professional services', scope: 'AML compliance, beneficial ownership, suspicious reporting', penalty: 'At least 1M EUR for legal persons' },
    { name: 'PSD2 (Payment Services Directive 2)', applicability: 'Payment service providers', scope: 'Strong customer authentication, open banking, third-party access', penalty: 'Determined by member state regulators' },
    { name: 'DORA (Digital Operational Resilience Act)', applicability: 'Financial entities in the EU', scope: 'ICT risk management, incident reporting, digital resilience testing', penalty: 'Up to 1% of average daily worldwide turnover' },
    { name: 'CSRD (Corporate Sustainability Reporting Directive)', applicability: 'Large companies and listed SMEs', scope: 'ESG reporting, sustainability due diligence', penalty: 'Determined by member state transposition' }
  ],
  UK: [
    { name: 'UK GDPR + Data Protection Act 2018', applicability: 'Entities processing UK residents data', scope: 'Data protection mirroring EU GDPR', penalty: 'Up to 4% of global turnover or 17.5M GBP' },
    { name: 'FCA Regulations', applicability: 'Authorized firms in UK financial services', scope: 'Conduct rules, prudential requirements, consumer duty', penalty: 'Unlimited fines; firm authorization revocation' },
    { name: 'UK Bribery Act', applicability: 'All UK-connected entities', scope: 'Anti-bribery (broader than FCPA)', penalty: 'Unlimited fines, 10 years imprisonment' },
    { name: 'Money Laundering Regulations 2017', applicability: 'Regulated sector (finance, legal, real estate)', scope: 'Customer due diligence, suspicious activity reporting', penalty: 'Unlimited fines, 14 years imprisonment' }
  ],
  SG: [
    { name: 'MAS Regulations', applicability: 'Financial institutions in Singapore', scope: 'Licensing, conduct, capital adequacy, AML/CFT', penalty: 'Varies; up to S$1M and criminal charges' },
    { name: 'PDPA (Personal Data Protection Act)', applicability: 'Organizations collecting personal data in Singapore', scope: 'Data protection, consent, breach notification', penalty: 'Up to S$1M or 10% of annual turnover' },
    { name: 'PSA (Payment Services Act)', applicability: 'Payment service providers in Singapore', scope: 'Licensing of payment services, DPT regulation', penalty: 'Up to S$250K fine and 3 years imprisonment' }
  ],
  JP: [
    { name: 'FIEA (Financial Instruments and Exchange Act)', applicability: 'Securities firms, listed companies', scope: 'Disclosure, insider trading, market manipulation', penalty: 'Up to 500M JPY for corporations' },
    { name: 'APPI (Act on Protection of Personal Information)', applicability: 'Business operators handling personal info', scope: 'Data protection, consent, cross-border transfer', penalty: 'Up to 100M JPY for corporations' },
    { name: 'AMLCFT Act', applicability: 'Financial institutions in Japan', scope: 'Customer identification, suspicious transaction reporting', penalty: 'Administrative sanctions, criminal penalties' }
  ],
  AE: [
    { name: 'DFSA/FSRA Regulations', applicability: 'Financial services in DIFC/ADGM', scope: 'Licensing, conduct, prudential standards', penalty: 'Varies by free zone authority' },
    { name: 'UAE Federal AML Law', applicability: 'All entities in UAE', scope: 'Anti-money laundering, counter-terrorism financing', penalty: 'Up to AED 5M fine and imprisonment' },
    { name: 'UAE Data Protection Law', applicability: 'Data processors/controllers in UAE', scope: 'Personal data handling, consent, cross-border transfers', penalty: 'Up to AED 5M' }
  ],
  CN: [
    { name: 'PIPL (Personal Information Protection Law)', applicability: 'Entities processing Chinese citizens data', scope: 'Consent-based data processing, cross-border transfer restrictions', penalty: 'Up to 50M CNY or 5% of annual revenue' },
    { name: 'China Securities Law', applicability: 'Listed companies, securities firms', scope: 'Securities issuance, trading, disclosure, insider trading', penalty: 'Up to 10x illegal proceeds' },
    { name: 'AML Law of PRC', applicability: 'Financial institutions in China', scope: 'Customer identification, record-keeping, reporting', penalty: 'Up to 5M CNY for institutions' }
  ]
};

app.post('/compliance/check', (req, res) => {
  try {
    const { jurisdiction, jurisdictions, industry, companyType } = req.body;
    if (!jurisdiction && !jurisdictions) return res.status(400).json({ error: 'jurisdiction (country code like US, EU, UK) or jurisdictions array required' });

    const codes = jurisdictions || [jurisdiction];
    const results = {};
    let totalRegulations = 0;

    for (const code of codes) {
      const upper = code.toUpperCase().trim();
      const regs = REGULATIONS[upper];
      if (regs) {
        results[upper] = regs.map(r => ({
          ...r,
          relevant: isRelevant(r, industry, companyType)
        }));
        totalRegulations += regs.length;
      } else {
        results[upper] = { status: 'no_data', message: `No regulatory data available for ${upper}. Available: ${Object.keys(REGULATIONS).join(', ')}` };
      }
    }

    // Cross-border considerations
    const crossBorder = [];
    if (codes.length > 1) {
      crossBorder.push({ issue: 'Data Transfer', detail: 'Cross-border data flows may require adequacy decisions, SCCs, or BCRs' });
      crossBorder.push({ issue: 'Conflict of Laws', detail: 'Ensure compliance with the stricter jurisdiction for overlapping requirements' });
      crossBorder.push({ issue: 'Tax Implications', detail: 'Transfer pricing and PE rules may apply across jurisdictions' });
      if (codes.some(c => ['US'].includes(c.toUpperCase())) && codes.some(c => ['EU', 'UK'].includes(c.toUpperCase()))) {
        crossBorder.push({ issue: 'US-EU Data Framework', detail: 'Check EU-US Data Privacy Framework status for personal data transfers' });
      }
    }

    res.json({
      agent: 'oracle-finance', analysis: 'compliance', timestamp: new Date().toISOString(),
      jurisdictions: codes.map(c => c.toUpperCase()),
      industry: industry || 'general',
      companyType: companyType || 'not specified',
      regulations: results,
      totalRegulations,
      crossBorderConsiderations: crossBorder.length > 0 ? crossBorder : null,
      disclaimer: 'This is an automated assessment for informational purposes only. Consult qualified legal counsel for compliance decisions.'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function isRelevant(regulation, industry, companyType) {
  if (!industry && !companyType) return 'likely';
  const text = (regulation.applicability + ' ' + regulation.scope).toLowerCase();
  const ind = (industry || '').toLowerCase();
  const ct = (companyType || '').toLowerCase();

  if (text.includes('all') || text.includes('any entity')) return 'yes';
  if (ind && (text.includes(ind) || text.includes('financial') && ind.includes('financ'))) return 'yes';
  if (ct === 'public' && (text.includes('public') || text.includes('listed'))) return 'yes';
  if (ct === 'private' && text.includes('public')) return 'unlikely';
  return 'possibly';
}

// ── A2A Protocol ─────────────────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'ORACLE Finance Agent', description: 'Financial intelligence - company analysis, risk scoring, fraud detection, compliance checking',
    version: '1.0.0', protocol: 'a2a',
    capabilities: ['financial-ratio-analysis', 'company-health-scoring', 'partnership-risk', 'benfords-law', 'fraud-detection', 'regulatory-compliance'],
    endpoints: { base: `http://localhost:${PORT}`, health: '/health', analyses: ['/analyze/company', '/analyze/risk', '/detect/fraud', '/compliance/check'] },
    tags: ['finance', 'risk', 'compliance', 'fraud-detection', 'silkweb']
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
  ║   ORACLE Finance Agent                  ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /analyze/company                 ║
  ║   POST /analyze/risk                    ║
  ║   POST /detect/fraud                    ║
  ║   POST /compliance/check                ║
  ║                                         ║
  ║   GET  /.well-known/agent.json          ║
  ╚══════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
