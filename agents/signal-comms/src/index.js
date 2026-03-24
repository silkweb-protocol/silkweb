// ─────────────────────────────────────────────
// SilkWeb SIGNAL — Communications & PR Agent
// Press releases, crisis analysis, press kits, talking points
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3021;
app.use(express.json({ limit: '2mb' }));

const pressTemplates = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'press-templates.json'), 'utf8'));
const crisisTypes = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'crisis-types.json'), 'utf8'));

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
  res.json({ agent: 'signal-comms', version: '1.0.0', status: 'operational',
    endpoints: ['POST /generate/pressrelease', 'POST /analyze/crisis', 'POST /generate/presskit', 'POST /generate/talking-points'] });
});
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });
app.get('/info', (req, res) => {
  res.json({ agent: 'signal-comms', name: 'SIGNAL Communications & PR Agent', version: '1.0.0',
    description: 'Communications intelligence — press releases, crisis management, press kits, talking points',
    port: PORT, protocol: 'a2a' });
});

// ─── POST /generate/pressrelease ────────────
app.post('/generate/pressrelease', (req, res) => {
  try {
    const { company, city, state, type, details, executiveName, executiveTitle, contactEmail, contactPhone } = req.body;
    if (!company || !details) return res.status(400).json({ error: 'Provide "company" and "details". Optional: city, state, type (product_launch/partnership/funding/event/milestone)' });

    const releaseType = (type || 'product_launch').toLowerCase().replace(/\s/g, '_');
    const template = pressTemplates.releaseTypes[releaseType] || pressTemplates.releaseTypes.product_launch;
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const cityStr = city || 'NEW YORK';
    const stateStr = state || 'N.Y.';
    const exec = executiveName || '[Executive Name]';
    const execTitle = executiveTitle || 'CEO';

    const headline = generateHeadline(company, details, releaseType);
    const subheadline = `${company} ${releaseType === 'product_launch' ? 'introduces innovative solution' : releaseType === 'funding' ? 'secures growth capital' : releaseType === 'partnership' ? 'joins forces with strategic partner' : 'reaches significant milestone'} for ${details.split(' ').slice(0, 5).join(' ')}`;

    const pressRelease = {
      headline: headline.toUpperCase(),
      subheadline,
      dateline: `${cityStr.toUpperCase()}, ${stateStr} (${dateStr})`,
      leadParagraph: `${company} today announced ${details.charAt(0).toLowerCase() + details.slice(1)}. The ${releaseType.replace(/_/g, ' ')} represents a significant step forward in the company's mission to deliver value to its stakeholders.`,
      bodyParagraphs: [
        `"${details.split('.')[0]}," said ${exec}, ${execTitle} of ${company}. "This ${releaseType.replace(/_/g, ' ')} demonstrates our commitment to innovation and excellence in serving our customers."`,
        `The ${releaseType.replace(/_/g, ' ')} builds on ${company}'s track record of growth and positions the company for continued success in the evolving market landscape.`,
        `For more information about ${company} and this announcement, visit [company website].`,
      ],
      boilerplate: `About ${company}\n${company} is a [industry description] company dedicated to [mission statement]. Founded in [year], the company serves [customer description] with [product/service description]. For more information, visit [website].`,
      contact: {
        name: contactEmail ? exec : '[Contact Name]',
        title: 'Media Relations',
        email: contactEmail || '[email]',
        phone: contactPhone || '[phone]',
      },
      endMark: '###',
    };

    res.json({
      releaseType,
      structure: template.structure,
      tone: template.tone,
      pressRelease,
      apStyleReminders: pressTemplates.apStyleRules,
      distributionChannels: [
        'PR Newswire / Business Wire',
        'Company newsroom/blog',
        'Direct media outreach to beat reporters',
        'Social media (LinkedIn, Twitter)',
        'Email to subscribers and stakeholders',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

function generateHeadline(company, details, type) {
  switch (type) {
    case 'product_launch': return `${company} Launches ${details.split(' ').slice(0, 5).join(' ')}`;
    case 'partnership': return `${company} Partners With ${details.split(' ').slice(0, 4).join(' ')}`;
    case 'funding': return `${company} Raises ${details.match(/\$[\d.]+[MBK]?/)?.[0] || 'Capital'} to Accelerate Growth`;
    case 'milestone': return `${company} Achieves ${details.split(' ').slice(0, 5).join(' ')}`;
    case 'event': return `${company} Announces ${details.split(' ').slice(0, 5).join(' ')}`;
    default: return `${company} Announces ${details.split(' ').slice(0, 6).join(' ')}`;
  }
}

// ─── POST /analyze/crisis ───────────────────
app.post('/analyze/crisis', (req, res) => {
  try {
    const { description, crisisType, companySize, isPublic } = req.body;
    if (!description) return res.status(400).json({ error: 'Provide "description" of crisis. Optional: crisisType, companySize, isPublic' });

    // Match crisis type
    const descLower = description.toLowerCase();
    let matched = null;
    if (crisisType) {
      matched = crisisTypes.find(c => c.type.toLowerCase().includes(crisisType.toLowerCase()));
    }
    if (!matched) {
      matched = crisisTypes.find(c => descLower.includes(c.type.toLowerCase().split(' ')[0].toLowerCase()));
    }
    if (!matched) matched = crisisTypes[4]; // Default to social media crisis

    const severityScores = { critical: 95, high: 75, moderate: 50, low: 25 };
    const severityScore = severityScores[matched.severity] || 50;

    // Response timeline
    const timeline = [
      { timeframe: 'First 30 minutes', actions: ['Assemble crisis team', 'Verify facts', 'Begin drafting holding statement'] },
      { timeframe: '1-2 hours', actions: ['Issue holding statement', 'Brief key stakeholders', 'Monitor media and social channels'] },
      { timeframe: '2-4 hours', actions: ['Issue full statement/press release', 'Respond to media inquiries', 'Update website/social media'] },
      { timeframe: '24 hours', actions: ['Conduct press conference if needed', 'Provide updates to stakeholders', 'Review and adjust strategy'] },
      { timeframe: '48-72 hours', actions: ['Assess ongoing coverage', 'Plan recovery communications', 'Begin internal review'] },
      { timeframe: '1-2 weeks', actions: ['Implement corrective actions', 'Publish investigation findings', 'Rebuild stakeholder trust'] },
    ];

    // Key messages framework
    const keyMessages = [
      `We take this matter extremely seriously and are committed to full transparency.`,
      `The safety/security of our ${matched.stakeholders[0]} is our top priority.`,
      `We have assembled a team to investigate and address this situation.`,
      `We will provide regular updates as we learn more.`,
      `We are cooperating fully with ${matched.stakeholders.includes('regulators') ? 'regulatory authorities' : 'all relevant parties'}.`,
    ];

    // Stakeholder communication plan
    const stakeholderPlan = matched.stakeholders.map(s => ({
      stakeholder: s,
      channel: s === 'media' ? 'Press conference/release' : s === 'employees' ? 'All-hands meeting + email' : s === 'customers' ? 'Email + website notice' : s === 'investors' ? '8-K filing + investor call' : s === 'regulators' ? 'Formal notification' : 'Direct communication',
      timing: s === 'employees' ? 'Within 1 hour' : s === 'regulators' ? `Within ${matched.responseWindow}` : 'Within 2-4 hours',
      keyPoints: [`Factual summary of ${matched.type}`, 'Actions being taken', 'How it affects them', 'Next steps and timeline'],
    }));

    res.json({
      crisisType: matched.type,
      severity: { level: matched.severity, score: severityScore },
      responseWindow: matched.responseWindow,
      legalObligations: matched.legalObligations,
      responseTimeline: timeline,
      keyMessages,
      stakeholderCommunicationPlan: stakeholderPlan,
      doNot: [
        'Do NOT speculate or share unverified information',
        'Do NOT assign blame before investigation is complete',
        'Do NOT use "no comment" — use a holding statement instead',
        'Do NOT communicate on personal social media accounts',
        'Do NOT delete or alter social media posts related to the crisis',
        'Do NOT make promises you cannot keep',
      ],
      holdingStatement: `${new Date().toLocaleDateString()}: We are aware of ${matched.type.toLowerCase()} and are actively investigating the situation. The ${matched.stakeholders[0] === 'employees' ? 'safety of our team' : 'trust of our stakeholders'} is our highest priority. We are working diligently to address this matter and will provide updates as more information becomes available. We appreciate your patience during this time.`,
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /generate/presskit ────────────────
app.post('/generate/presskit', (req, res) => {
  try {
    const { company, industry, founded, headquarters, employees, website, mission, products } = req.body;
    if (!company) return res.status(400).json({ error: 'Provide "company". Optional: industry, founded, headquarters, employees, website, mission, products' });

    res.json({
      pressKit: {
        companyOverview: {
          name: company,
          industry: industry || '[Industry]',
          founded: founded || '[Year]',
          headquarters: headquarters || '[City, State]',
          employees: employees || '[Number]',
          website: website || '[URL]',
          oneLiner: `${company} is a ${industry || 'technology'} company that ${mission || 'delivers innovative solutions to its customers'}.`,
          boilerplate: `${company} is a leading ${industry || 'technology'} company headquartered in ${headquarters || '[City]'}. Founded in ${founded || '[Year]'}, the company ${mission || 'is dedicated to delivering value through innovation'}. ${company} serves customers across ${industry || 'multiple industries'} with ${products || 'a suite of products and services'}. For more information, visit ${website || '[website]'}.`,
        },
        leadershipBios: {
          format: 'AP-style bio format',
          template: `[Name] is the [Title] of ${company}, where [he/she/they] [key responsibility]. With [X years] of experience in [industry], [Name] has [notable achievements]. Prior to ${company}, [Name] served as [previous role] at [previous company]. [Name] holds a [degree] from [university].`,
          tipsForBios: [
            'Keep under 150 words',
            'Lead with current role, then experience',
            'Include 1-2 notable achievements',
            'Mention education last',
            'Use third person throughout',
          ],
        },
        factSheet: {
          sections: [
            { section: 'Company at a Glance', fields: ['Name', 'Founded', 'Headquarters', 'Employees', 'Revenue/Funding', 'Website'] },
            { section: 'Products/Services', fields: ['Product lines', 'Key features', 'Target market', 'Pricing model'] },
            { section: 'Key Metrics', fields: ['Customers/Users', 'Growth rate', 'Market share', 'Notable clients'] },
            { section: 'Milestones', fields: ['Founding', 'Key product launches', 'Funding rounds', 'Awards and recognition'] },
          ],
        },
        mediaContactTemplate: {
          format: `MEDIA CONTACT\n[Name]\n[Title], ${company}\n[Email]\n[Phone]\n[City, State]`,
          guidelines: 'Designate one primary media contact. Ensure they are trained in media relations.',
        },
        downloadableAssets: [
          'Company logo (PNG, SVG, EPS) — light and dark versions',
          'Executive headshots (high-resolution)',
          'Product screenshots/photos',
          'Brand guidelines document',
          'Recent press releases',
          'Company fact sheet (PDF)',
        ],
      },
      distributionTips: [
        'Host press kit on a dedicated /press or /media page',
        'Make all assets downloadable without login',
        'Keep materials updated quarterly',
        'Include both low-res (web) and high-res (print) images',
        'Add an embargo policy for pre-release materials',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /generate/talking-points ──────────
app.post('/generate/talking-points', (req, res) => {
  try {
    const { topic, audience, context, company } = req.body;
    if (!topic) return res.status(400).json({ error: 'Provide "topic". Optional: audience, context, company' });

    const aud = audience || 'general audience';
    const comp = company || 'our organization';

    const talkingPoints = [
      { point: `${topic} represents a significant opportunity for ${aud}`, supportingData: '[Insert relevant statistic or data point]', bridge: `At ${comp}, we believe...` },
      { point: `The current landscape of ${topic} is evolving rapidly`, supportingData: '[Insert market trend or research finding]', bridge: `This is why ${comp} has invested in...` },
      { point: `Key stakeholders are increasingly focused on ${topic}`, supportingData: '[Insert stakeholder survey or feedback]', bridge: `${comp}'s approach addresses this by...` },
      { point: `There are common misconceptions about ${topic} that need to be addressed`, supportingData: '[Insert clarifying fact or research]', bridge: `The reality is that ${comp}...` },
      { point: `The measurable impact of ${topic} is substantial`, supportingData: '[Insert ROI, outcome metrics, or case study]', bridge: `For example, ${comp} has seen...` },
      { point: `Industry experts agree that ${topic} is critical for the future`, supportingData: '[Insert expert quote or industry report]', bridge: `${comp} is positioned to lead because...` },
      { point: `Addressing ${topic} requires collaboration across stakeholders`, supportingData: '[Insert example of partnership or collaboration]', bridge: `${comp} is committed to working with...` },
      { point: `The timeline for ${topic} impact is shorter than most realize`, supportingData: '[Insert timeline data or milestone]', bridge: `${comp}'s roadmap includes...` },
      { point: `Investment in ${topic} delivers returns beyond the obvious`, supportingData: '[Insert secondary benefit data]', bridge: `Beyond the primary benefits, ${comp} has found...` },
      { point: `The path forward on ${topic} is clear, and action is needed now`, supportingData: '[Insert call-to-action data point]', bridge: `${comp} invites ${aud} to join us in...` },
    ];

    const anticipatedQuestions = [
      { question: `What makes ${comp}'s approach to ${topic} different?`, suggestedAnswer: `Focus on three key differentiators: [1], [2], [3]` },
      { question: `What are the risks or challenges with ${topic}?`, suggestedAnswer: `Acknowledge challenges honestly, then pivot to how ${comp} addresses them` },
      { question: `What's the timeline for results?`, suggestedAnswer: `Provide specific, realistic milestones` },
      { question: `How does this compare to competitors?`, suggestedAnswer: `Focus on your unique value, avoid directly attacking competitors` },
      { question: `What evidence supports your claims about ${topic}?`, suggestedAnswer: `Reference specific data points, case studies, or third-party validation` },
    ];

    const bridgeStatements = [
      `That's an important question. What I'd really like to focus on is...`,
      `I appreciate you raising that. The key point here is...`,
      `Let me put that in context...`,
      `That's actually a great segue to...`,
      `While that's one perspective, the data shows...`,
      `I understand the concern. Here's what we're doing about it...`,
    ];

    res.json({
      topic, audience: aud,
      talkingPoints,
      anticipatedQuestions,
      bridgeStatements,
      deliveryTips: [
        'Lead with your strongest point',
        'Use the "Rule of Three" — group ideas in threes',
        'Bridge from difficult questions back to key messages',
        'Use concrete examples and data, not abstract claims',
        'Practice the 30-second version of each talking point',
        'End every answer by reinforcing a key message',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

app.listen(PORT, () => {
  console.log(`📡 SIGNAL Communications & PR Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
