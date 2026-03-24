// ─────────────────────────────────────────────
// SilkWeb CLIMATE — Energy & Sustainability Agent
// Carbon calculation, energy audit, ESG scoring, renewable analysis
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3020;
app.use(express.json({ limit: '1mb' }));

const emissionFactors = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'emission-factors.json'), 'utf8'));
const solarData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'solar-data.json'), 'utf8'));

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
  res.json({ agent: 'climate-energy', version: '1.0.0', status: 'operational',
    endpoints: ['POST /calculate/carbon', 'POST /audit/energy', 'POST /score/esg', 'POST /analyze/renewable'] });
});
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });
app.get('/info', (req, res) => {
  res.json({ agent: 'climate-energy', name: 'CLIMATE Energy & Sustainability Agent', version: '1.0.0',
    description: 'Sustainability intelligence — carbon footprint calculation, energy audits, ESG scoring, renewable feasibility',
    port: PORT, protocol: 'a2a' });
});

// ─── POST /calculate/carbon ─────────────────
app.post('/calculate/carbon', (req, res) => {
  try {
    const { electricityKwh, gasThems, milesDriven, flights, region, vehicleType, wastetons, waterGallons } = req.body;

    if (!electricityKwh && !gasThems && !milesDriven && !flights) {
      return res.status(400).json({ error: 'Provide at least one: electricityKwh, gasThems, milesDriven, flights (array of {miles, class})' });
    }

    const breakdown = [];
    let totalCO2e = 0;

    // Electricity
    if (electricityKwh) {
      const reg = (region || 'us_average').toLowerCase().replace(/\s/g, '_');
      const factor = emissionFactors.electricity.byRegion[reg] || emissionFactors.electricity.factor;
      const co2 = electricityKwh * factor;
      totalCO2e += co2;
      breakdown.push({ source: 'Electricity', amount: electricityKwh, unit: 'kWh', factor, co2eKg: Math.round(co2), scope: 'Scope 2' });
    }

    // Natural gas
    if (gasThems) {
      const co2 = gasThems * emissionFactors.natural_gas.factor;
      totalCO2e += co2;
      breakdown.push({ source: 'Natural Gas', amount: gasThems, unit: 'therms', factor: emissionFactors.natural_gas.factor, co2eKg: Math.round(co2), scope: 'Scope 1' });
    }

    // Vehicle miles
    if (milesDriven) {
      const vType = (vehicleType || 'car_medium').toLowerCase().replace(/\s/g, '_');
      const factor = emissionFactors.vehicle_miles.byType[vType] || emissionFactors.vehicle_miles.factor;
      const co2 = milesDriven * factor;
      totalCO2e += co2;
      breakdown.push({ source: `Vehicle (${vType})`, amount: milesDriven, unit: 'miles', factor, co2eKg: Math.round(co2), scope: 'Scope 1' });
    }

    // Flights
    if (flights && Array.isArray(flights)) {
      flights.forEach((flight, i) => {
        const miles = flight.miles || 0;
        const flightClass = (flight.class || 'economy').toLowerCase();
        let haulFactor;
        if (miles < 500) haulFactor = emissionFactors.flights.short_haul;
        else if (miles < 2000) haulFactor = emissionFactors.flights.medium_haul;
        else haulFactor = emissionFactors.flights.long_haul;
        const classMultiplier = emissionFactors.flights.classMultipliers[flightClass] || 1.0;
        const co2 = miles * haulFactor * classMultiplier;
        totalCO2e += co2;
        breakdown.push({ source: `Flight ${i + 1} (${miles}mi, ${flightClass})`, amount: miles, unit: 'miles', factor: haulFactor * classMultiplier, co2eKg: Math.round(co2), scope: 'Scope 3' });
      });
    }

    // Waste
    if (wastetons) {
      const co2 = wastetons * emissionFactors.waste.landfill.factor;
      totalCO2e += co2;
      breakdown.push({ source: 'Waste (landfill)', amount: wastetons, unit: 'short tons', factor: emissionFactors.waste.landfill.factor, co2eKg: Math.round(co2), scope: 'Scope 3' });
    }

    // Water
    if (waterGallons) {
      const co2 = waterGallons * emissionFactors.water.factor;
      totalCO2e += co2;
      breakdown.push({ source: 'Water', amount: waterGallons, unit: 'gallons', factor: emissionFactors.water.factor, co2eKg: Math.round(co2), scope: 'Scope 3' });
    }

    const totalMetricTons = Math.round(totalCO2e / 1000 * 100) / 100;
    const treesNeeded = Math.ceil(totalMetricTons / 0.022); // ~22kg CO2 per tree per year

    // Equivalencies
    const equivalencies = {
      milesInCar: Math.round(totalCO2e / 0.404),
      gallonsOfGas: Math.round(totalCO2e / 8.887),
      smartphonesCharged: Math.round(totalCO2e / 0.008),
      treeSeedlingsGrown10Years: treesNeeded,
      homeElectricityDays: Math.round(totalCO2e / (emissionFactors.electricity.factor * 30)),
    };

    res.json({
      totalCO2eKg: Math.round(totalCO2e),
      totalCO2eMetricTons: totalMetricTons,
      breakdown,
      equivalencies,
      offsetCost: {
        lowEstimate: `$${Math.round(totalMetricTons * 10)}`,
        highEstimate: `$${Math.round(totalMetricTons * 50)}`,
        note: 'Carbon offset prices range from $10-$50 per metric ton',
      },
      reductionTips: [
        'Switch to renewable energy sources for electricity',
        'Improve building insulation to reduce heating/cooling needs',
        'Transition fleet vehicles to electric or hybrid',
        'Reduce air travel with video conferencing',
        'Implement waste reduction and recycling programs',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /audit/energy ─────────────────────
app.post('/audit/energy', (req, res) => {
  try {
    const { sqft, buildingType, hvacAge, insulation, windowType, lightingType, annualElectricity, annualGas } = req.body;
    if (!sqft) return res.status(400).json({ error: 'Provide "sqft". Optional: buildingType, hvacAge, insulation, windowType, lightingType, annualElectricity, annualGas' });

    const bType = (buildingType || 'office').toLowerCase();
    const benchmarks = {
      office: { kwhPerSqft: 17, thermsPerSqft: 0.15 },
      retail: { kwhPerSqft: 18, thermsPerSqft: 0.12 },
      warehouse: { kwhPerSqft: 7, thermsPerSqft: 0.08 },
      hospital: { kwhPerSqft: 30, thermsPerSqft: 0.25 },
      restaurant: { kwhPerSqft: 38, thermsPerSqft: 0.30 },
      school: { kwhPerSqft: 12, thermsPerSqft: 0.15 },
      residential: { kwhPerSqft: 8, thermsPerSqft: 0.20 },
    };

    const benchmark = benchmarks[bType] || benchmarks.office;
    const actualKwhPerSqft = annualElectricity ? annualElectricity / sqft : benchmark.kwhPerSqft * 1.2;
    const actualThermsPerSqft = annualGas ? annualGas / sqft : benchmark.thermsPerSqft * 1.2;

    let efficiencyScore = 100;
    const findings = [];
    const upgrades = [];

    // HVAC analysis
    const age = hvacAge || 15;
    if (age > 15) {
      efficiencyScore -= 20;
      findings.push({ system: 'HVAC', issue: `System is ${age} years old (expected life: 15-20 years)`, severity: 'high' });
      upgrades.push({ upgrade: 'Replace HVAC with high-efficiency system', estimatedSavings: `${Math.round(sqft * 0.003 * 100) / 100}/year`, estimatedCost: `$${Math.round(sqft * 5)}`, paybackYears: Math.round(sqft * 5 / (sqft * 3)) });
    } else if (age > 10) {
      efficiencyScore -= 10;
      findings.push({ system: 'HVAC', issue: 'System nearing end of optimal efficiency', severity: 'moderate' });
      upgrades.push({ upgrade: 'HVAC tune-up and maintenance', estimatedSavings: '5-10% on heating/cooling', estimatedCost: '$500-$1500', paybackYears: 1 });
    }

    // Insulation
    const insulationLevel = (insulation || 'average').toLowerCase();
    if (insulationLevel === 'poor' || insulationLevel === 'none') {
      efficiencyScore -= 20;
      findings.push({ system: 'Insulation', issue: 'Poor or no insulation detected', severity: 'high' });
      upgrades.push({ upgrade: 'Add/upgrade wall and attic insulation', estimatedSavings: '15-25% on heating/cooling', estimatedCost: `$${Math.round(sqft * 2)}`, paybackYears: 3 });
    } else if (insulationLevel === 'average') {
      efficiencyScore -= 8;
      upgrades.push({ upgrade: 'Upgrade to modern insulation standards', estimatedSavings: '8-12% on heating/cooling', estimatedCost: `$${Math.round(sqft * 1.5)}`, paybackYears: 4 });
    }

    // Windows
    const windows = (windowType || 'double').toLowerCase();
    if (windows === 'single') {
      efficiencyScore -= 15;
      findings.push({ system: 'Windows', issue: 'Single-pane windows cause significant heat loss', severity: 'high' });
      upgrades.push({ upgrade: 'Upgrade to double or triple-pane windows', estimatedSavings: '10-20% on heating/cooling', estimatedCost: `$${Math.round(sqft * 3)}`, paybackYears: 5 });
    }

    // Lighting
    const lighting = (lightingType || 'mixed').toLowerCase();
    if (lighting === 'fluorescent' || lighting === 'incandescent') {
      efficiencyScore -= 10;
      findings.push({ system: 'Lighting', issue: `${lighting} lighting is energy-inefficient`, severity: 'moderate' });
      upgrades.push({ upgrade: 'Switch to LED lighting throughout', estimatedSavings: '40-60% on lighting costs', estimatedCost: `$${Math.round(sqft * 0.5)}`, paybackYears: 2 });
    }

    // Energy usage comparison
    const kwhEfficiency = benchmark.kwhPerSqft > 0 ? Math.round((actualKwhPerSqft / benchmark.kwhPerSqft) * 100) : 100;

    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));
    let grade;
    if (efficiencyScore >= 90) grade = 'A';
    else if (efficiencyScore >= 80) grade = 'B';
    else if (efficiencyScore >= 70) grade = 'C';
    else if (efficiencyScore >= 60) grade = 'D';
    else grade = 'F';

    res.json({
      buildingProfile: { sqft, type: bType, hvacAge: age, insulation: insulationLevel, windows, lighting },
      efficiencyScore, grade,
      energyUsage: {
        kwhPerSqft: Math.round(actualKwhPerSqft * 100) / 100,
        benchmarkKwhPerSqft: benchmark.kwhPerSqft,
        comparedToBenchmark: `${kwhEfficiency}% of average`,
      },
      findings, upgrades,
      totalEstimatedAnnualSavings: upgrades.length > 0 ? `$${Math.round(sqft * 0.5)}-$${Math.round(sqft * 2)} per year` : 'Building is already efficient',
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /score/esg ────────────────────────
app.post('/score/esg', (req, res) => {
  try {
    const { environmental, social, governance } = req.body;
    if (!environmental && !social && !governance) {
      return res.status(400).json({ error: 'Provide at least one: environmental {}, social {}, governance {} with metric scores (0-100)' });
    }

    const env = environmental || {};
    const soc = social || {};
    const gov = governance || {};

    // Environmental scoring
    const envMetrics = {
      carbonEmissions: env.carbonEmissions || env.carbon || 50,
      energyEfficiency: env.energyEfficiency || env.energy || 50,
      wasteManagement: env.wasteManagement || env.waste || 50,
      waterUsage: env.waterUsage || env.water || 50,
      renewableEnergy: env.renewableEnergy || env.renewable || 50,
    };
    const envScore = Math.round(Object.values(envMetrics).reduce((a, b) => a + b, 0) / Object.keys(envMetrics).length);

    // Social scoring
    const socMetrics = {
      employeeSatisfaction: soc.employeeSatisfaction || soc.satisfaction || 50,
      diversityInclusion: soc.diversityInclusion || soc.diversity || 50,
      communityEngagement: soc.communityEngagement || soc.community || 50,
      healthSafety: soc.healthSafety || soc.safety || 50,
      laborPractices: soc.laborPractices || soc.labor || 50,
    };
    const socScore = Math.round(Object.values(socMetrics).reduce((a, b) => a + b, 0) / Object.keys(socMetrics).length);

    // Governance scoring
    const govMetrics = {
      boardDiversity: gov.boardDiversity || gov.board || 50,
      executiveCompensation: gov.executiveCompensation || gov.compensation || 50,
      transparency: gov.transparency || 50,
      ethicsCompliance: gov.ethicsCompliance || gov.ethics || 50,
      riskManagement: gov.riskManagement || gov.risk || 50,
    };
    const govScore = Math.round(Object.values(govMetrics).reduce((a, b) => a + b, 0) / Object.keys(govMetrics).length);

    const overallESG = Math.round((envScore * 0.35 + socScore * 0.35 + govScore * 0.30));

    let rating;
    if (overallESG >= 80) rating = 'AAA — Industry Leader';
    else if (overallESG >= 70) rating = 'AA — Above Average';
    else if (overallESG >= 60) rating = 'A — Average';
    else if (overallESG >= 50) rating = 'BBB — Below Average';
    else if (overallESG >= 40) rating = 'BB — Laggard';
    else rating = 'B — Significant Concerns';

    const improvements = [];
    if (envScore < 60) improvements.push({ area: 'Environmental', priority: 'high', suggestions: ['Set carbon reduction targets', 'Increase renewable energy usage', 'Implement waste reduction program'] });
    if (socScore < 60) improvements.push({ area: 'Social', priority: 'high', suggestions: ['Improve diversity and inclusion programs', 'Enhance employee benefits', 'Increase community engagement'] });
    if (govScore < 60) improvements.push({ area: 'Governance', priority: 'high', suggestions: ['Increase board diversity', 'Enhance transparency in reporting', 'Strengthen ethics and compliance programs'] });

    res.json({
      overallESGScore: overallESG, rating,
      scores: {
        environmental: { score: envScore, weight: '35%', metrics: envMetrics },
        social: { score: socScore, weight: '35%', metrics: socMetrics },
        governance: { score: govScore, weight: '30%', metrics: govMetrics },
      },
      improvements,
      reportingFrameworks: [
        { framework: 'GRI', description: 'Global Reporting Initiative — comprehensive sustainability reporting' },
        { framework: 'SASB', description: 'Sustainability Accounting Standards Board — industry-specific metrics' },
        { framework: 'TCFD', description: 'Task Force on Climate-related Financial Disclosures' },
        { framework: 'CDP', description: 'Carbon Disclosure Project — environmental disclosure platform' },
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /analyze/renewable ────────────────
app.post('/analyze/renewable', (req, res) => {
  try {
    const { location, annualElectricityKwh, roofSqft, budget } = req.body;
    if (!location) return res.status(400).json({ error: 'Provide "location" (city). Optional: annualElectricityKwh, roofSqft, budget' });

    const loc = location.toLowerCase().trim();
    const siteData = solarData.find(s => s.city.toLowerCase() === loc || s.city.toLowerCase().includes(loc) || loc.includes(s.city.toLowerCase()));

    if (!siteData) {
      return res.json({ location, found: false, message: 'Location not in database. Using US average.', note: 'Available cities: ' + solarData.slice(0, 10).map(s => s.city).join(', ') + '...' });
    }

    const annualKwh = annualElectricityKwh || 10000;
    const roof = roofSqft || 1000;

    // Solar analysis
    const wattsPerSqft = 15; // modern panels ~15W/sqft
    const maxCapacityKw = (roof * wattsPerSqft) / 1000;
    const neededCapacityKw = annualKwh / siteData.annualKwhPerKw;
    const recommendedKw = Math.min(maxCapacityKw, neededCapacityKw);
    const costPerWatt = 2.75; // national average installed cost
    const systemCost = Math.round(recommendedKw * 1000 * costPerWatt);
    const federalITC = Math.round(systemCost * 0.30);
    const netCost = systemCost - federalITC;

    const annualProduction = Math.round(recommendedKw * siteData.annualKwhPerKw);
    const annualSavings = Math.round(annualProduction * siteData.electricityRate);
    const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 999;
    const roi25Year = annualSavings > 0 ? Math.round(((annualSavings * 25 - netCost) / netCost) * 100) : 0;

    // Wind analysis (simplified)
    const windViable = siteData.state === 'TX' || siteData.state === 'OK' || siteData.state === 'KS' || siteData.state === 'IA' || siteData.state === 'MN';

    res.json({
      location: { city: siteData.city, state: siteData.state },
      solarAnalysis: {
        solarIrradiance: siteData.solarIrradiance,
        avgDailySunHours: siteData.avgSunHours,
        feasibility: siteData.avgSunHours >= 4.5 ? 'Excellent' : siteData.avgSunHours >= 3.5 ? 'Good' : 'Moderate',
        recommendedSystemSize: `${Math.round(recommendedKw * 10) / 10} kW`,
        maxRoofCapacity: `${Math.round(maxCapacityKw * 10) / 10} kW`,
        annualProduction: `${annualProduction.toLocaleString()} kWh`,
        coverageOfNeeds: `${Math.min(100, Math.round((annualProduction / annualKwh) * 100))}%`,
      },
      financials: {
        systemCost: `$${systemCost.toLocaleString()}`,
        federalTaxCredit: `$${federalITC.toLocaleString()} (30% ITC)`,
        netCost: `$${netCost.toLocaleString()}`,
        annualSavings: `$${annualSavings.toLocaleString()}`,
        paybackPeriod: `${paybackYears} years`,
        roi25Year: `${roi25Year}%`,
        localElectricityRate: `$${siteData.electricityRate}/kWh`,
      },
      incentives: siteData.incentives,
      windAnalysis: {
        viable: windViable,
        note: windViable ? 'Location has good wind resources. Small wind turbines may supplement solar.' : 'Wind resources are limited at this location. Solar is recommended.',
      },
      recommendation: paybackYears <= 7 ? 'Strongly Recommended — excellent ROI' : paybackYears <= 12 ? 'Recommended — good long-term investment' : 'Marginal — consider if electricity rates are expected to increase',
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

app.listen(PORT, () => {
  console.log(`🌍 CLIMATE Energy & Sustainability Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
