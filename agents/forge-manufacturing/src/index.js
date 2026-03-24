// ─────────────────────────────────────────────
// SilkWeb FORGE — Manufacturing Intelligence Agent
// BOM analysis, supplier scoring, production optimization, quality analysis
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3022;
app.use(express.json({ limit: '2mb' }));

const materials = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'materials.json'), 'utf8'));
const qualityStandards = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quality-standards.json'), 'utf8'));

const rateLimit = {};
function checkRate(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => t > now - windowMs);
  if (rateLimit[ip].length >= limit) return false;
  rateLimit[ip].push(now);
  return true;
}
app.use((req, res, next) => {
  if (!checkRate(req.ip || req.connection.remoteAddress)) return res.status(429).json({ error: 'Rate limit exceeded.' });
  next();
});

app.get('/', (req, res) => {
  res.json({ agent: 'forge-manufacturing', version: '1.0.0', status: 'operational',
    endpoints: ['POST /analyze/bom', 'POST /score/supplier', 'POST /optimize/production', 'POST /analyze/quality'] });
});
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });
app.get('/info', (req, res) => {
  res.json({ agent: 'forge-manufacturing', name: 'FORGE Manufacturing Agent', version: '1.0.0',
    description: 'Manufacturing intelligence — BOM analysis, supplier scoring, production optimization, quality analysis',
    port: PORT, protocol: 'a2a' });
});

// ─── POST /analyze/bom ──────────────────────
app.post('/analyze/bom', (req, res) => {
  try {
    const { parts } = req.body;
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'Provide "parts" array of {name, quantity, unitCost (optional), leadTimeDays (optional)}' });
    }

    let totalCost = 0;
    let maxLeadTime = 0;
    const analyzedParts = [];
    const costDrivers = [];

    parts.forEach(part => {
      const matched = materials.find(m => m.name.toLowerCase().includes((part.name || '').toLowerCase()) || (part.name || '').toLowerCase().includes(m.name.toLowerCase()));
      const unitCost = part.unitCost || (matched ? matched.unitCost : 1.00);
      const qty = part.quantity || 1;
      const leadTime = part.leadTimeDays || (matched ? matched.leadTimeDays : 7);
      const lineCost = unitCost * qty;

      totalCost += lineCost;
      if (leadTime > maxLeadTime) maxLeadTime = leadTime;

      const analyzed = {
        name: part.name,
        quantity: qty,
        unitCost: Math.round(unitCost * 100) / 100,
        totalCost: Math.round(lineCost * 100) / 100,
        leadTimeDays: leadTime,
        percentOfTotal: 0, // calculated later
        alternatives: matched ? matched.alternatives : [],
        category: matched ? matched.category : 'custom',
      };
      analyzedParts.push(analyzed);
    });

    // Calculate percentages and identify cost drivers
    analyzedParts.forEach(p => {
      p.percentOfTotal = Math.round((p.totalCost / totalCost) * 10000) / 100;
    });
    analyzedParts.sort((a, b) => b.totalCost - a.totalCost);

    // Identify cost drivers (top items making up 80% of cost)
    let cumulative = 0;
    analyzedParts.forEach(p => {
      cumulative += p.percentOfTotal;
      if (cumulative <= 80 || costDrivers.length === 0) {
        costDrivers.push({ name: p.name, cost: p.totalCost, percent: p.percentOfTotal });
      }
    });

    // Substitution suggestions
    const substitutions = analyzedParts
      .filter(p => p.alternatives.length > 0 && p.percentOfTotal > 5)
      .map(p => {
        const alt = materials.find(m => m.name === p.alternatives[0]);
        return {
          current: p.name,
          currentCost: p.unitCost,
          suggested: p.alternatives[0],
          suggestedCost: alt ? alt.unitCost : 'N/A',
          potentialSavings: alt ? Math.round((p.unitCost - alt.unitCost) * p.quantity * 100) / 100 : 'N/A',
        };
      })
      .filter(s => s.potentialSavings > 0);

    // Lead time analysis
    const criticalPath = analyzedParts
      .filter(p => p.leadTimeDays >= maxLeadTime * 0.8)
      .map(p => ({ name: p.name, leadTimeDays: p.leadTimeDays }));

    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      partCount: analyzedParts.length,
      maxLeadTimeDays: maxLeadTime,
      parts: analyzedParts,
      costDrivers,
      substitutionSuggestions: substitutions,
      criticalPathParts: criticalPath,
      analysis: {
        avgCostPerPart: Math.round((totalCost / analyzedParts.length) * 100) / 100,
        uniqueCategories: [...new Set(analyzedParts.map(p => p.category))],
        costConcentration: costDrivers.length <= 3 ? 'High — a few parts dominate cost' : 'Distributed — cost spread across parts',
      },
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /score/supplier ───────────────────
app.post('/score/supplier', (req, res) => {
  try {
    const { deliveryPerformance, qualityRate, pricing, financialStability, communication, leadTime, capacity } = req.body;

    if (deliveryPerformance === undefined && qualityRate === undefined) {
      return res.status(400).json({ error: 'Provide supplier metrics: deliveryPerformance (0-100), qualityRate (0-100), pricing (0-100), financialStability (0-100), communication (0-100), leadTime (0-100), capacity (0-100)' });
    }

    const metrics = {
      deliveryPerformance: { value: clamp(deliveryPerformance || 70), weight: 0.25, label: 'On-Time Delivery' },
      qualityRate: { value: clamp(qualityRate || 70), weight: 0.25, label: 'Quality/Defect Rate' },
      pricing: { value: clamp(pricing || 70), weight: 0.15, label: 'Pricing Competitiveness' },
      financialStability: { value: clamp(financialStability || 70), weight: 0.10, label: 'Financial Stability' },
      communication: { value: clamp(communication || 70), weight: 0.10, label: 'Communication & Responsiveness' },
      leadTime: { value: clamp(leadTime || 70), weight: 0.10, label: 'Lead Time Consistency' },
      capacity: { value: clamp(capacity || 70), weight: 0.05, label: 'Production Capacity' },
    };

    let overallScore = 0;
    const scoreBreakdown = [];
    Object.entries(metrics).forEach(([key, m]) => {
      const weighted = m.value * m.weight;
      overallScore += weighted;
      scoreBreakdown.push({
        metric: m.label,
        score: m.value,
        weight: `${m.weight * 100}%`,
        weightedScore: Math.round(weighted * 10) / 10,
      });
    });
    overallScore = Math.round(overallScore);

    let riskLevel, tier;
    if (overallScore >= 90) { riskLevel = 'low'; tier = 'Strategic Partner'; }
    else if (overallScore >= 80) { riskLevel = 'low'; tier = 'Preferred Supplier'; }
    else if (overallScore >= 70) { riskLevel = 'moderate'; tier = 'Approved Supplier'; }
    else if (overallScore >= 60) { riskLevel = 'moderate'; tier = 'Conditional Supplier'; }
    else if (overallScore >= 50) { riskLevel = 'high'; tier = 'Under Review'; }
    else { riskLevel = 'critical'; tier = 'Not Recommended'; }

    const improvements = scoreBreakdown
      .filter(s => s.score < 70)
      .sort((a, b) => a.score - b.score)
      .map(s => ({ area: s.metric, currentScore: s.score, target: 80, suggestion: `Improve ${s.metric.toLowerCase()} from ${s.score} to 80+` }));

    res.json({
      overallScore, riskLevel, tier,
      scoreBreakdown,
      improvements,
      recommendations: [
        overallScore < 60 ? 'Consider alternative suppliers' : null,
        metrics.qualityRate.value < 95 ? 'Implement incoming inspection' : null,
        metrics.deliveryPerformance.value < 90 ? 'Negotiate delivery penalties in contract' : null,
        metrics.financialStability.value < 60 ? 'Assess dual-sourcing strategy to mitigate risk' : null,
        'Conduct annual supplier audit',
        'Maintain scorecard and share with supplier quarterly',
      ].filter(Boolean),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

function clamp(v) { return Math.max(0, Math.min(100, v)); }

// ─── POST /optimize/production ──────────────
app.post('/optimize/production', (req, res) => {
  try {
    const { jobs } = req.body;
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'Provide "jobs" array of {name, duration (hours), dependencies (array of job names, optional), resource (optional), priority (1-10, optional)}' });
    }

    // Build dependency graph and validate
    const jobMap = {};
    jobs.forEach(j => { jobMap[j.name] = { ...j, duration: j.duration || 1, priority: j.priority || 5, dependencies: j.dependencies || [], resource: j.resource || 'default' }; });

    // Topological sort for scheduling
    const scheduled = [];
    const visited = new Set();
    const inProgress = new Set();

    function visit(name) {
      if (visited.has(name)) return;
      if (inProgress.has(name)) return; // cycle detected
      inProgress.add(name);
      const job = jobMap[name];
      if (job) {
        (job.dependencies || []).forEach(dep => visit(dep));
      }
      inProgress.delete(name);
      visited.add(name);
      scheduled.push(name);
    }

    Object.keys(jobMap).forEach(visit);

    // Calculate start/end times
    let currentTime = 0;
    const timeline = [];
    const endTimes = {};
    const resourceTimeline = {};

    scheduled.forEach(name => {
      const job = jobMap[name];
      if (!job) return;

      // Start after all dependencies complete
      let earliestStart = 0;
      (job.dependencies || []).forEach(dep => {
        if (endTimes[dep] > earliestStart) earliestStart = endTimes[dep];
      });

      // Start after resource is available
      const resKey = job.resource || 'default';
      if (resourceTimeline[resKey] && resourceTimeline[resKey] > earliestStart) {
        earliestStart = resourceTimeline[resKey];
      }

      const start = earliestStart;
      const end = start + job.duration;
      endTimes[name] = end;
      resourceTimeline[resKey] = end;

      timeline.push({
        job: name,
        start,
        end,
        duration: job.duration,
        resource: resKey,
        priority: job.priority,
        dependencies: job.dependencies,
      });
    });

    // Identify bottlenecks (jobs on critical path)
    const totalDuration = Math.max(...Object.values(endTimes));
    const criticalPath = timeline.filter(t => {
      // Job is on critical path if delaying it delays the whole project
      return t.end >= totalDuration * 0.9;
    });

    // Resource utilization
    const resources = {};
    timeline.forEach(t => {
      if (!resources[t.resource]) resources[t.resource] = { totalHours: 0, jobs: 0 };
      resources[t.resource].totalHours += t.duration;
      resources[t.resource].jobs++;
    });

    const utilization = Object.entries(resources).map(([name, data]) => ({
      resource: name,
      totalHours: data.totalHours,
      jobCount: data.jobs,
      utilizationRate: totalDuration > 0 ? Math.round((data.totalHours / totalDuration) * 100) : 0,
    }));

    res.json({
      totalJobs: jobs.length,
      totalDurationHours: totalDuration,
      totalDurationDays: Math.round(totalDuration / 8 * 10) / 10,
      schedule: timeline,
      criticalPath: criticalPath.map(c => c.job),
      bottlenecks: criticalPath.filter(c => c.duration >= totalDuration * 0.2).map(c => ({ job: c.job, duration: c.duration, impact: 'Delays this job will delay entire production' })),
      resourceUtilization: utilization,
      optimizationSuggestions: [
        utilization.some(u => u.utilizationRate > 90) ? 'Some resources are over-utilized — consider adding capacity' : null,
        utilization.some(u => u.utilizationRate < 50) ? 'Some resources are under-utilized — consider redistributing work' : null,
        criticalPath.length > 3 ? 'Long critical path — consider parallelizing more tasks' : null,
        'Review dependencies for opportunities to overlap tasks',
      ].filter(Boolean),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /analyze/quality ──────────────────
app.post('/analyze/quality', (req, res) => {
  try {
    const { defects, totalUnits, opportunitiesPerUnit } = req.body;
    if (!defects || !Array.isArray(defects)) {
      return res.status(400).json({ error: 'Provide "defects" as array of {type, count, date (optional)}. Optional: totalUnits, opportunitiesPerUnit' });
    }

    const units = totalUnits || 10000;
    const oppPerUnit = opportunitiesPerUnit || 1;

    // Aggregate defects by type
    const byType = {};
    let totalDefects = 0;
    defects.forEach(d => {
      const type = d.type || 'Unknown';
      if (!byType[type]) byType[type] = { count: 0, dates: [] };
      byType[type].count += (d.count || 1);
      if (d.date) byType[type].dates.push(d.date);
      totalDefects += (d.count || 1);
    });

    // Pareto analysis
    const pareto = Object.entries(byType)
      .map(([type, data]) => ({ type, count: data.count, percentage: Math.round((data.count / totalDefects) * 10000) / 100 }))
      .sort((a, b) => b.count - a.count);

    let cumulative = 0;
    const paretoAnalysis = pareto.map(p => {
      cumulative += p.percentage;
      return { ...p, cumulativePercent: Math.round(cumulative * 100) / 100, vitalFew: cumulative <= 80 };
    });

    // DPMO and Sigma Level
    const totalOpportunities = units * oppPerUnit;
    const dpmo = Math.round((totalDefects / totalOpportunities) * 1000000);
    let sigmaLevel = 1;
    for (const sl of qualityStandards.sigmaLevels) {
      if (dpmo <= sl.dpmo) sigmaLevel = sl.sigma;
    }
    const matchedSigma = qualityStandards.sigmaLevels.find(s => s.sigma === sigmaLevel) || qualityStandards.sigmaLevels[0];

    // Yield
    const yieldRate = Math.round(((units - totalDefects) / units) * 10000) / 100;

    // Trend analysis (if dates provided)
    const byMonth = {};
    defects.forEach(d => {
      if (d.date) {
        const month = d.date.substring(0, 7);
        byMonth[month] = (byMonth[month] || 0) + (d.count || 1);
      }
    });
    const trendData = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, defectCount: count }));
    let trend = 'insufficient data';
    if (trendData.length >= 3) {
      const recent = trendData.slice(-3).map(t => t.defectCount);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      trend = recent[2] > avg * 1.1 ? 'Worsening' : recent[2] < avg * 0.9 ? 'Improving' : 'Stable';
    }

    res.json({
      summary: {
        totalUnits: units,
        totalDefects,
        defectRate: `${Math.round((totalDefects / units) * 10000) / 100}%`,
        dpmo,
        sigmaLevel,
        sigmaDescription: matchedSigma.description,
        yieldRate: `${yieldRate}%`,
      },
      paretoAnalysis: {
        defectTypes: paretoAnalysis,
        vitalFew: paretoAnalysis.filter(p => p.vitalFew).map(p => p.type),
        insight: `${paretoAnalysis.filter(p => p.vitalFew).length} defect types account for ~80% of all defects`,
      },
      trend: {
        direction: trend,
        monthlyData: trendData.length > 0 ? trendData : null,
      },
      recommendations: [
        ...paretoAnalysis.filter(p => p.vitalFew).map(p => `Priority: Address "${p.type}" defects (${p.percentage}% of total)`),
        sigmaLevel < 4 ? 'Implement statistical process control (SPC)' : null,
        dpmo > 10000 ? 'Consider root cause analysis (5 Why, fishbone diagram) for top defects' : null,
        'Conduct regular quality audits per ISO 9001 requirements',
        'Train operators on defect identification and prevention',
      ].filter(Boolean),
      applicableStandards: Object.values(qualityStandards.isoStandards).slice(0, 3),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

app.listen(PORT, () => {
  console.log(`🔨 FORGE Manufacturing Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
