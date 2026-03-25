#!/usr/bin/env node
// Generator script for all 21 agent files
const fs = require('fs');
const path = require('path');

const AGENTS = [
  { id:'guardian', name:'Guardian', domain:'Cybersecurity', color:'#3B82F6', dark:'#1E3A5F', rating:'4.8', reviews:142, memory:'500 MB', tier:'Expert', api:'aegis', pitch:0.8, rate:0.9, elevenVoice:'tMXujoAjiboschVOhAnk', greeting:'I am Guardian. I protect what matters most — your digital presence. What would you like me to scan?', tagline:'Your digital shield against threats.', personality:'Vigilant, authoritative, protective.', category:'security', disclaimer:'', endpoints:[{name:'Scan URL',path:'/scan/url',field:'url',placeholder:'https://example.com'},{name:'Scan SSL',path:'/scan/ssl',field:'domain',placeholder:'example.com'},{name:'Scan Domain',path:'/scan/domain',field:'domain',placeholder:'example.com'},{name:'Full Report',path:'/report',field:'domain',placeholder:'example.com'}], capabilities:['URL Security Scanning','SSL Certificate Audit','Domain Reputation Check','Full Security Report'] }
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Atlas here. From shipping lanes to flight paths, I know every route on Earth. Where are we going?', tagline:'Navigate the world with intelligence.', personality:'Adventurous, worldly, precise. Atlas approaches logistics with the confidence of someone who has mapped every trade lane and flight path on the planet.', category:'business', disclaimer:'', endpoints:[{name:'Calculate Route',path:'/route/calculate',field:'route',placeholder:'New York to London'},{name:'Customs Check',path:'/compliance/customs',field:'corridor',placeholder:'US to UK'},{name:'Carbon Estimate',path:'/estimate/carbon',field:'shipment',placeholder:'1 ton, NYC to Tokyo'}], capabilities:['Route Optimization','Customs Compliance','Carbon Footprint Estimation','Multi-Modal Planning'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Watchdog online. Systems nominal. What needs monitoring?', tagline:'Never sleeps. Always watching.', personality:'Alert, reliable, always-on. Speaks in short, precise bursts. Watchdog treats every millisecond of downtime as a personal failure.', category:'security', disclaimer:'', endpoints:[{name:'Health Check',path:'/monitor/health',field:'url',placeholder:'https://api.example.com'},{name:'DNS Check',path:'/monitor/dns',field:'domain',placeholder:'example.com'},{name:'Analyze Logs',path:'/analyze/logs',field:'logs',placeholder:'Paste log lines...'}], capabilities:['Endpoint Health Monitoring','DNS Record Tracking','SSL Expiry Alerts','Log Analysis'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'I am Sage. Numbers tell stories that others miss. What financial question weighs on your mind?', tagline:'Wisdom in every number.', personality:'Thoughtful, deliberate, wise. Sage treats every financial question with the gravity it deserves, seeing patterns in data that others overlook.', category:'finance', disclaimer:'', endpoints:[{name:'Detect Fraud',path:'/detect/fraud',field:'transactions',placeholder:'Transaction data or description...'},{name:'Compliance Check',path:'/compliance/check',field:'business',placeholder:'Business name and jurisdiction'}], capabilities:['Fraud Detection','Compliance Auditing','Risk Assessment','Financial Analysis'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Compass locked on. Give me coordinates, a city, or a question — I will find the answer on the map.', tagline:'The world at your coordinates.', personality:'Steady, precise, geographic. Compass sees the world in coordinates and data layers, finding meaning in the spatial relationships others miss.', category:'tech', disclaimer:'', endpoints:[{name:'Distance Calc',path:'/geo/distance',field:'locations',placeholder:'New York to Los Angeles'},{name:'Sun Position',path:'/geo/sun',field:'location',placeholder:'London, UK'}], capabilities:['Distance Calculation','Sun Position Tracking','Geofencing','Spatial Analysis'] },
  {  elevenVoice:"tMXujoAjiboschVOhAnk", greeting:'Counsel present. Every word in a contract matters. What document needs my attention?', tagline:'Every clause. Every risk. Found.', personality:'Precise, professional, thorough. Counsel reads between the lines of every contract, finding risks and opportunities hidden in legal language.', category:'legal', disclaimer:'AI-generated legal information is not a substitute for professional legal advice. Consult a licensed attorney for specific legal matters.', endpoints:[{name:'Analyze Contract',path:'/analyze/contract',field:'text',placeholder:'Paste contract text...'},{name:'Analyze NDA',path:'/analyze/nda',field:'text',placeholder:'Paste NDA text...'}], capabilities:['Contract Analysis','NDA Review','Clause Extraction','Risk Assessment'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'I am Advocate. If you have been hurt, I am here to help you understand your rights. Tell me what happened.', tagline:'Your case. Your rights. Protected.', personality:'Warm, empathetic, determined. Advocate combines compassion with legal precision, making complex injury law accessible and understandable.', category:'legal', disclaimer:'AI-generated legal information is not a substitute for professional legal advice. Consult a licensed attorney for specific legal matters.', endpoints:[{name:'Evaluate Case',path:'/evaluate/case',field:'details',placeholder:'Describe your situation...'},{name:'Calculate Damages',path:'/calculate/damages',field:'injuries',placeholder:'Describe injuries...'}], capabilities:['Case Evaluation','Damages Calculation','Rights Explanation','Statute Analysis'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Defender standing by. Everyone deserves to understand their rights. What situation are you facing?', tagline:'Know your rights. Know your options.', personality:'Deep, strong, principled. Defender speaks with the gravity of someone who understands what is at stake when freedom is on the line.', category:'legal', disclaimer:'AI-generated legal information is not a substitute for professional legal advice. Consult a licensed attorney for specific legal matters.', endpoints:[{name:'Analyze Charge',path:'/analyze/charge',field:'charge',placeholder:'Describe the charge...'},{name:'Explain Rights',path:'/rights/explain',field:'situation',placeholder:'Describe situation...'}], capabilities:['Charge Analysis','Rights Explanation','Evidence Review','Sentencing Guide'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'Hello, I am Healer. I can help you understand symptoms and check drug interactions. How can I help?', tagline:'Health intelligence at your fingertips.', personality:'Soft, caring, knowledgeable. Healer combines medical expertise with genuine empathy, making health information accessible without anxiety.', category:'health', disclaimer:'AI-generated health information is not a substitute for professional medical advice. Always consult a qualified healthcare provider.', endpoints:[{name:'Analyze Symptoms',path:'/analyze/symptoms',field:'symptoms',placeholder:'Describe your symptoms...'},{name:'Check Interactions',path:'/check/interactions',field:'medications',placeholder:'List medications...'}], capabilities:['Symptom Analysis','Drug Interaction Check','Vitals Assessment','Health Guidance'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Builder online. Paste your code and I will find the bugs you missed.', tagline:'Better code. Fewer bugs. Less debt.', personality:'Technical, clear, efficient. Builder speaks the language of code fluently, finding bugs and optimizations with surgical precision.', category:'tech', disclaimer:'', endpoints:[{name:'Review Code',path:'/review/code',field:'code',placeholder:'Paste your code...'},{name:'Score Tech Debt',path:'/score/techdebt',field:'stats',placeholder:'Repo stats or URL...'}], capabilities:['Code Review','Tech Debt Scoring','Architecture Analysis','Dependency Audit'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Scout reporting in. I see what the market is really doing. What property interests you?', tagline:'Find value others miss.', personality:'Energetic, confident, market-savvy. Scout sees opportunity in every listing and value where others see just buildings.', category:'finance', disclaimer:'', endpoints:[{name:'Analyze Property',path:'/analyze/property',field:'details',placeholder:'Property address or details...'},{name:'Calculate ROI',path:'/calculate/roi',field:'investment',placeholder:'Investment details...'}], capabilities:['Property Valuation','ROI Calculator','Market Analysis','Comparable Sales'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'Muse awakened. I craft words that convert and inspire. What shall we write?', tagline:'Words that move people.', personality:'Expressive, creative, inspired. Muse finds the perfect word for every moment, turning ideas into compelling narratives that resonate.', category:'creative', disclaimer:'', endpoints:[{name:'Generate Blog',path:'/generate/blog',field:'topic',placeholder:'Blog topic...'},{name:'Generate Social',path:'/generate/social',field:'message',placeholder:'Message and platform...'}], capabilities:['Blog Content','Social Media Posts','Email Campaigns','Product Copy'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Shadow here. I see what is hidden in plain sight. What should I investigate?', tagline:'What the internet knows about you.', personality:'Quiet, measured, perceptive. Shadow operates in the digital shadows, finding connections and information that others overlook.', category:'security', disclaimer:'', endpoints:[{name:'Investigate Domain',path:'/investigate/domain',field:'domain',placeholder:'example.com'},{name:'Investigate Email',path:'/investigate/email',field:'email',placeholder:'user@example.com'}], capabilities:['Domain Investigation','Email Intelligence','Digital Footprint','Header Tracing'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'Welcome to Harbor. I help build fair workplaces. Need a salary benchmark or policy check?', tagline:'Fair workplaces start here.', personality:'Welcoming, warm, balanced. Harbor creates a safe space for workplace questions, combining HR expertise with genuine care for people.', category:'business', disclaimer:'', endpoints:[{name:'Benchmark Salary',path:'/benchmark/salary',field:'role',placeholder:'Job title and location...'},{name:'Analyze Job',path:'/analyze/job',field:'text',placeholder:'Paste job description...'}], capabilities:['Salary Benchmarking','Job Description Analysis','Policy Review','Labor Law Compliance'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Bazaar open for business. I optimize listings and analyze pricing. What are you selling?', tagline:'Sell smarter. Price better. Grow faster.', personality:'Energetic, merchant-like, strategic. Bazaar treats every product as an opportunity and every listing as a chance to outperform the competition.', category:'business', disclaimer:'', endpoints:[{name:'Optimize Listing',path:'/optimize/listing',field:'product',placeholder:'Product name and description...'},{name:'Analyze Pricing',path:'/analyze/pricing',field:'data',placeholder:'Pricing data...'}], capabilities:['Listing Optimization','Pricing Strategy','Inventory Forecasting','Competitor Analysis'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'Hello! I am Mentor. I make learning feel effortless. What would you like to learn?', tagline:'Learn anything. Master everything.', personality:'Patient, encouraging, thoughtful. Mentor breaks down complexity into understanding, making every learner feel capable and motivated.', category:'business', disclaimer:'', endpoints:[{name:'Generate Quiz',path:'/generate/quiz',field:'topic',placeholder:'Quiz topic...'},{name:'Generate Flashcards',path:'/generate/flashcards',field:'topic',placeholder:'Flashcard topic...'}], capabilities:['Quiz Generation','Flashcard Creation','Curriculum Planning','Skill Assessment'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'Terra online. Every business has a carbon footprint. Let me help you measure and shrink yours.', tagline:'Measure impact. Drive change.', personality:'Earnest, forward-thinking, passionate. Terra sees sustainability not as a burden but as an opportunity to build a better future.', category:'business', disclaimer:'', endpoints:[{name:'Calculate Carbon',path:'/calculate/carbon',field:'activities',placeholder:'Describe activities...'},{name:'Score ESG',path:'/score/esg',field:'company',placeholder:'Company name...'}], capabilities:['Carbon Calculation','ESG Scoring','Energy Audit','Sustainability Planning'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Herald ready. I craft the message that lands. What is the story?', tagline:'Control the narrative.', personality:'Authoritative, clear, strategic. Herald understands that communication is power, and every message is an opportunity to shape perception.', category:'creative', disclaimer:'', endpoints:[{name:'Press Release',path:'/generate/pressrelease',field:'details',placeholder:'Event details...'},{name:'Crisis Analysis',path:'/analyze/crisis',field:'crisis',placeholder:'Describe the crisis...'}], capabilities:['Press Release Writing','Crisis Response','Media Kits','Talking Points'] },
  {  elevenVoice:"dtSEyYGNJqjrtBArPCVZ", greeting:'Anvil standing by. I analyze materials, score suppliers, and catch defects. What needs forging?', tagline:'Precision in every part.', personality:'Gruff, precise, reliable. Anvil speaks with the weight of industrial experience, treating every part and process with meticulous attention to quality.', category:'business', disclaimer:'', endpoints:[{name:'Score Supplier',path:'/score/supplier',field:'data',placeholder:'Supplier data...'},{name:'Analyze Quality',path:'/analyze/quality',field:'defects',placeholder:'Defect data...'}], capabilities:['Supplier Scoring','Quality Analysis','BOM Review','Production Optimization'] },
  {  elevenVoice:"XhNlP8uwiH6XZSFnH1yL", greeting:'Canvas ready. I design social cards, hero images, and brand assets. What visual do you need?', tagline:'Every pixel with purpose.', personality:'Artistic, light, visually inspired. Canvas sees design as a language that speaks directly to emotions, making every pixel count.', category:'creative', disclaimer:'', endpoints:[{name:'Design Social Card',path:'/design/social-card',field:'brief',placeholder:'Describe the design...'},{name:'Design Code Snippet',path:'/design/code-snippet',field:'code',placeholder:'Paste code to visualize...'}], capabilities:['Social Card Design','Code Screenshots','Hero Images','Brand Assets'] },
];

const CATEGORIES = {
  security: 'Security',
  legal: 'Legal',
  finance: 'Finance',
  health: 'Health',
  tech: 'Tech',
  business: 'Business',
  creative: 'Creative'
};

function starSVG() {
  return `<svg class="star star-filled" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
}

function starsHTML(rating) {
  const full = Math.floor(parseFloat(rating));
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += starSVG();
    else html += `<svg class="star star-empty" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
  }
  return html;
}

function generateAgentPage(a) {
  const tierClass = a.tier === 'Authority' ? 'tier-authority' : 'tier-expert';
  const endpointsJSON = JSON.stringify(a.endpoints);
  const actionCards = a.endpoints.map((ep, i) => `<div class="action-pill" onclick="quickAction(${i})">${ep.name}</div>`).join('\n    ');
  const disclaimerHTML = a.disclaimer ? `<p class="disclaimer">${a.disclaimer}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${a.name} — SilkWeb Agent</title>
<meta name="description" content="${a.name}: ${a.tagline} AI-powered ${a.domain} agent by SilkWeb.">
<meta name="theme-color" content="${a.color}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--agent:${a.color};--agent-dark:${a.dark};--bg:#000;--white:#fff;--gray-300:#cbd5e1;--gray-400:#94a3b8;--gray-500:#64748b;--gray-600:#475569;--gray-800:#1e293b;--border:rgba(255,255,255,0.06);--glass:rgba(255,255,255,0.03);--glass-hover:rgba(255,255,255,0.06)}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--white);overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0 48px;height:64px;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.8);backdrop-filter:blur(24px);border-bottom:1px solid var(--border)}
.nav-logo{font-size:20px;font-weight:700;color:var(--white);text-decoration:none;display:flex;align-items:center;gap:10px}
.nav-logo .logo-mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800}
.nav-links{display:flex;align-items:center;gap:28px}
.nav-links a{color:var(--gray-400);text-decoration:none;font-size:14px;font-weight:500;transition:color .3s}
.nav-links a:hover{color:var(--white)}

/* BRAIN SECTION */
.brain-section{position:relative;width:100%;height:60vh;min-height:500px;overflow:hidden}
#brainCanvas{position:absolute;top:0;left:0;width:100%;height:100%}
.brain-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;pointer-events:none;padding-top:64px}
.agent-orb{width:60px;height:60px;border-radius:50%;background:var(--agent);box-shadow:0 0 40px var(--agent),0 0 80px ${a.color}40;margin-bottom:16px;animation:orbPulse 3s ease-in-out infinite}
@keyframes orbPulse{0%,100%{box-shadow:0 0 40px var(--agent),0 0 80px ${a.color}40}50%{box-shadow:0 0 60px var(--agent),0 0 120px ${a.color}60}}
.agent-name{font-size:36px;font-weight:800;letter-spacing:-1px;margin-bottom:6px}
.agent-domain{font-size:16px;color:var(--gray-400);margin-bottom:12px}
.agent-rating{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.star{display:inline-block}.star-filled{color:#F59E0B}.star-empty{color:#374151}
.rating-num{font-size:15px;font-weight:700;color:var(--gray-300)}
.rating-count{font-size:13px;color:var(--gray-500)}
.agent-badges{display:flex;gap:10px;margin-bottom:20px}
.badge{padding:5px 14px;border-radius:100px;font-size:12px;font-weight:600}
.badge-mem{background:transparent;border:1px solid ${a.color}50;color:var(--agent)}
.badge-tier-expert{background:rgba(99,102,241,.15);color:#818cf8;border:1px solid rgba(99,102,241,.25)}
.badge-tier-authority{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.25)}
.greeting-text{font-size:16px;color:var(--gray-300);max-width:500px;text-align:center;line-height:1.6;min-height:52px}
.typing-cursor{display:inline-block;width:2px;height:18px;background:var(--agent);margin-left:2px;animation:blink .8s step-end infinite;vertical-align:text-bottom}
@keyframes blink{50%{opacity:0}}
.speaker-btn{pointer-events:auto;margin-top:12px;background:none;border:1px solid ${a.color}40;color:var(--agent);padding:6px 16px;border-radius:100px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .3s;display:flex;align-items:center;gap:6px}
.speaker-btn:hover{background:${a.color}20;border-color:var(--agent)}

/* CHAT */
.chat-section{max-width:800px;margin:0 auto;padding:40px 24px 24px}
.chat-container{border-radius:20px;background:rgba(255,255,255,.02);border:1px solid var(--border);overflow:hidden;backdrop-filter:blur(20px)}
.chat-header{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
.chat-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--agent-dark),var(--agent));display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff}
.chat-name{font-size:15px;font-weight:700}
.chat-status{font-size:11px;color:var(--agent);display:flex;align-items:center;gap:5px}
.chat-status::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--agent);display:inline-block;animation:statusPulse 2s ease-in-out infinite}
@keyframes statusPulse{0%,100%{opacity:1}50%{opacity:.4}}
.chat-messages{padding:24px;min-height:200px;max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
.msg{max-width:85%;padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.7;animation:msgIn .3s ease}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.msg-agent{background:rgba(255,255,255,.04);border-left:3px solid var(--agent);align-self:flex-start;border-radius:4px 14px 14px 14px}
.msg-user{background:${a.color}15;border:1px solid ${a.color}25;align-self:flex-end;border-radius:14px 14px 4px 14px}
.msg-result{align-self:flex-start;max-width:95%;width:100%}
.result-toggle{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.result-toggle summary{padding:10px 16px;font-size:13px;color:var(--gray-400);cursor:pointer;font-family:'SF Mono','Fira Code',monospace}
.result-toggle pre{padding:16px;font-family:'SF Mono','Fira Code',monospace;font-size:12px;line-height:1.6;color:var(--gray-300);overflow-x:auto;white-space:pre-wrap;word-break:break-word;border-top:1px solid var(--border);margin:0}
.chat-input-area{padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px}
.chat-input{flex:1;padding:12px 18px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--white);font-size:14px;font-family:inherit;outline:none;transition:border-color .3s}
.chat-input:focus{border-color:${a.color}50}
.chat-input::placeholder{color:var(--gray-600)}
.chat-send{padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,var(--agent-dark),var(--agent));color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:all .3s;font-family:inherit}
.chat-send:hover{box-shadow:0 4px 20px ${a.color}40}
.chat-send:disabled{opacity:.5;cursor:not-allowed}

/* QUICK ACTIONS */
.actions-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding:24px 24px 0}
.action-pill{padding:10px 20px;border-radius:100px;background:var(--glass);border:1px solid var(--border);color:var(--gray-300);font-size:13px;font-weight:500;cursor:pointer;transition:all .3s;font-family:inherit}
.action-pill:hover{background:${a.color}15;border-color:${a.color}40;color:var(--white)}

/* FOOTER */
footer{text-align:center;padding:48px 24px;border-top:1px solid var(--border);margin-top:40px}
.disclaimer{font-size:12px;color:var(--gray-500);margin-bottom:16px;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.6}
footer a{color:var(--gray-400);text-decoration:none;font-size:14px;transition:color .3s}
footer a:hover{color:var(--white)}
.footer-links{display:flex;justify-content:center;gap:28px;margin-bottom:14px}
.footer-cta{display:inline-block;padding:10px 28px;border-radius:12px;background:linear-gradient(135deg,var(--agent-dark),var(--agent));color:#fff;font-weight:600;font-size:13px;text-decoration:none;margin-top:16px;transition:all .3s}
.footer-cta:hover{box-shadow:0 4px 20px ${a.color}40}
.footer-badge{color:var(--gray-600);font-size:12px;margin-top:16px}

@media(max-width:768px){
  nav{padding:0 20px}
  .nav-links{display:none}
  .brain-section{height:55vh;min-height:420px}
  .agent-name{font-size:28px}
  .chat-section{padding:24px 16px}
}
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo"><span class="logo-mark">S</span> SilkWeb</a>
  <div class="nav-links"><a href="/">Home</a><a href="/agents/">Agents</a><a href="/register.html">Register</a></div>
</nav>

<div class="brain-section">
  <canvas id="brainCanvas"></canvas>
  <div class="brain-overlay">
    <div class="agent-orb"></div>
    <div class="agent-name">${a.name}</div>
    <div class="agent-domain">${a.domain}</div>
    <div class="agent-rating">${starsHTML(a.rating)}<span class="rating-num">${a.rating}</span><span class="rating-count">(${a.reviews} reviews)</span></div>
    <div class="agent-badges"><span class="badge badge-mem">${a.memory}</span><span class="badge badge-${tierClass}">${a.tier}</span></div>
    <div class="greeting-text" id="greetingText"><span class="typing-cursor"></span></div>
    <button class="speaker-btn" id="replayBtn" onclick="speak(AGENT.greeting)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08"/></svg> Replay</button>
  </div>
</div>

<div class="chat-section" id="chat">
  <div class="chat-container">
    <div class="chat-header">
      <div class="chat-avatar">${a.name[0]}</div>
      <div><div class="chat-name">${a.name}</div><div class="chat-status">Online</div></div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <input class="chat-input" id="chatInput" placeholder="Ask ${a.name} anything..." onkeydown="if(event.key==='Enter')sendMessage()">
      <button class="chat-send" id="chatSend" onclick="sendMessage()">Send</button>
    </div>
  </div>
  <div class="actions-row">
    ${actionCards}
  </div>
</div>

<footer>
  ${disclaimerHTML}
  <div class="footer-links"><a href="/agents/">Back to All Agents</a><a href="/">SilkWeb Home</a></div>
  <a href="/register.html" class="footer-cta">Register Your Business</a>
  <p class="footer-badge">Powered by SilkWeb Protocol &copy; 2026</p>
</footer>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const ACCENT = new THREE.Color('${a.color}');
const canvas = document.getElementById('brainCanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 1.5, 0.8, 0.2
);
composer.addPass(bloomPass);

// PARTICLES
const PARTICLE_COUNT = 2500;
const positions = new Float32Array(PARTICLE_COUNT * 3);
const basePositions = new Float32Array(PARTICLE_COUNT * 3);
const velocities = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 1.2 + (Math.random() - 0.5) * 0.5;
  // Add organic noise displacement
  const noise = 0.15 * (Math.sin(theta * 5) * Math.cos(phi * 3) + Math.sin(phi * 7) * 0.5);
  const rn = r + noise;
  const x = rn * Math.sin(phi) * Math.cos(theta);
  const y = rn * Math.sin(phi) * Math.sin(theta);
  const z = rn * Math.cos(phi);
  positions[i*3] = x;
  positions[i*3+1] = y;
  positions[i*3+2] = z;
  basePositions[i*3] = x;
  basePositions[i*3+1] = y;
  basePositions[i*3+2] = z;
  velocities[i*3] = (Math.random()-0.5)*0.002;
  velocities[i*3+1] = (Math.random()-0.5)*0.002;
  velocities[i*3+2] = (Math.random()-0.5)*0.002;
  sizes[i] = Math.random() * 3 + 1;
}

const particleGeom = new THREE.BufferGeometry();
particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMat = new THREE.PointsMaterial({
  color: ACCENT,
  size: 0.04,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeom, particleMat);
scene.add(particles);

// NEURAL CONNECTIONS
const linePositions = [];
const CONNECTION_DIST = 0.35;
const MAX_CONNECTIONS = 800;
let connCount = 0;
for (let i = 0; i < PARTICLE_COUNT && connCount < MAX_CONNECTIONS; i++) {
  for (let j = i + 1; j < PARTICLE_COUNT && connCount < MAX_CONNECTIONS; j++) {
    const dx = basePositions[i*3] - basePositions[j*3];
    const dy = basePositions[i*3+1] - basePositions[j*3+1];
    const dz = basePositions[i*3+2] - basePositions[j*3+2];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist < CONNECTION_DIST) {
      linePositions.push(basePositions[i*3], basePositions[i*3+1], basePositions[i*3+2]);
      linePositions.push(basePositions[j*3], basePositions[j*3+1], basePositions[j*3+2]);
      connCount++;
    }
  }
}

const lineGeom = new THREE.BufferGeometry();
lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
const lineMat = new THREE.LineBasicMaterial({
  color: ACCENT,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const lines = new THREE.LineSegments(lineGeom, lineMat);
scene.add(lines);

// MOUSE INTERACTION
const mouse = new THREE.Vector2(9999, 9999);
const mouseWorld = new THREE.Vector3();
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  mouseWorld.set(mouse.x * 3, mouse.y * 3, 0);
});
canvas.addEventListener('mouseleave', () => { mouse.set(9999, 9999); mouseWorld.set(9999, 9999, 0); });

// SPEAKING PULSE STATE
let speakPulse = 0;
window.triggerPulse = () => { speakPulse = 1; };

// ANIMATION
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const pos = particleGeom.attributes.position.array;

  // Breathing + pulse
  const breathe = 1 + Math.sin(t * 0.8) * 0.03;
  const pulse = 1 + speakPulse * Math.sin(t * 8) * 0.08;
  speakPulse *= 0.97;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const bx = basePositions[i*3];
    const by = basePositions[i*3+1];
    const bz = basePositions[i*3+2];
    let nx = bx * breathe * pulse;
    let ny = by * breathe * pulse;
    let nz = bz * breathe * pulse;

    // Orbit
    const angle = t * 0.15 + i * 0.001;
    const ca = Math.cos(angle * 0.1);
    const sa = Math.sin(angle * 0.1);
    const rx = nx * ca - nz * sa;
    const rz = nx * sa + nz * ca;
    nx = rx; nz = rz;

    // Mouse repulsion
    const dx = nx - mouseWorld.x;
    const dy = ny - mouseWorld.y;
    const dz = nz - mouseWorld.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist < 1.5) {
      const force = (1.5 - dist) * 0.3;
      nx += (dx / dist) * force;
      ny += (dy / dist) * force;
      nz += (dz / dist) * force;
    }

    pos[i*3] = nx;
    pos[i*3+1] = ny;
    pos[i*3+2] = nz;
  }
  particleGeom.attributes.position.needsUpdate = true;

  // Slow rotation
  particles.rotation.y = t * 0.05;
  lines.rotation.y = t * 0.05;

  composer.render();
}
animate();

// RESIZE
window.addEventListener('resize', () => {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
</script>

<script>
const AGENT = {
  name: ${JSON.stringify(a.name)},
  greeting: ${JSON.stringify(a.greeting)},
  color: '${a.color}',
  apiBase: '/agents/${a.api}',
  voicePitch: ${a.pitch},
  voiceRate: ${a.rate},
  elevenVoice: '${a.elevenVoice || ''}'
};
const ENDPOINTS = ${endpointsJSON};
let currentEndpoint = 0;

// VOICE (ElevenLabs with Web Speech API fallback)
const ELEVEN_API = 'https://api.silkweb.io/api/v1/tts/';
let audioQueue = [];
let isPlaying = false;

async function speak(text) {
  if (AGENT.elevenVoice) {
    try {
      const resp = await fetch(ELEVEN_API + AGENT.elevenVoice, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Voice-Id': AGENT.elevenVoice },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onplay = () => { if (window.triggerPulse) window.triggerPulse(); };
        audio.play();
        return;
      }
    } catch(e) { console.log('ElevenLabs fallback to Web Speech'); }
  }
  // Fallback to Web Speech API
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = AGENT.voicePitch;
  u.rate = AGENT.voiceRate;
  u.volume = 0.8;
  const voices = speechSynthesis.getVoices();
  if (voices.length) {
    const pref = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    u.voice = pref;
  }
  u.onstart = () => { if (window.triggerPulse) window.triggerPulse(); };
  speechSynthesis.speak(u);
}

// TYPE TEXT
function typeText(el, text, cb) {
  let i = 0;
  el.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  el.appendChild(cursor);
  function frame() {
    if (i < text.length) {
      el.textContent = text.substring(0, i + 1);
      el.appendChild(cursor);
      i++;
      setTimeout(frame, 30);
    } else {
      cursor.remove();
      if (cb) cb();
    }
  }
  frame();
}

// GREETING
window.addEventListener('load', () => {
  if (speechSynthesis.getVoices().length === 0) speechSynthesis.onvoiceschanged = () => {};
  setTimeout(() => {
    const el = document.getElementById('greetingText');
    typeText(el, AGENT.greeting, () => {
      // Try to speak; browser may block autoplay
      try { speak(AGENT.greeting); } catch(e) {}
    });
  }, 800);
});

// Interaction fallback for autoplay
let hasInteracted = false;
document.addEventListener('click', () => {
  if (!hasInteracted) {
    hasInteracted = true;
  }
}, { once: true });

// CHAT
const messagesEl = document.getElementById('chatMessages');
const inputEl = document.getElementById('chatInput');

function addMessage(text, type) {
  const m = document.createElement('div');
  m.className = 'msg msg-' + type;
  if (type === 'agent') {
    m.innerHTML = '<span class="typing-cursor"></span>';
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    typeText(m, text, () => {
      // Read first sentence
      const firstSentence = text.split(/[.!?]/)[0] + '.';
      speak(firstSentence);
      if (window.triggerPulse) window.triggerPulse();
    });
  } else {
    m.textContent = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  return m;
}

function addResult(data) {
  const m = document.createElement('div');
  m.className = 'msg msg-result';
  const details = document.createElement('details');
  details.className = 'result-toggle';
  const summary = document.createElement('summary');
  summary.textContent = 'View JSON Response';
  const pre = document.createElement('pre');
  pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  details.appendChild(summary);
  details.appendChild(pre);
  m.appendChild(details);
  messagesEl.appendChild(m);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  addMessage(text, 'user');
  if (window.triggerPulse) window.triggerPulse();
  const ep = ENDPOINTS[currentEndpoint];
  const url = 'https://api.silkweb.io' + AGENT.apiBase + ep.path;
  document.getElementById('chatSend').disabled = true;
  try {
    const body = {};
    body[ep.field] = text;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    addResult(d);
    const s = d.summary || d.message || d.result || 'Analysis complete.';
    addMessage(typeof s === 'string' ? s : 'Analysis complete. See results above.', 'agent');
  } catch(e) {
    addMessage('I received your request. The API endpoint is currently being provisioned. In production, I would process: "' + text + '" through ' + url, 'agent');
  }
  document.getElementById('chatSend').disabled = false;
}

function quickAction(i) {
  currentEndpoint = i;
  inputEl.placeholder = ENDPOINTS[i].placeholder;
  inputEl.focus();
  document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
}
</script>
</body>
</html>`;
}

// =====================
// INDEX PAGE
// =====================
function generateIndexPage() {
  const agentDataJS = JSON.stringify(AGENTS.map(a => ({
    id: a.id, name: a.name, domain: a.domain, color: a.color, dark: a.dark,
    gradient: `linear-gradient(135deg,${a.dark},${a.color})`,
    rating: parseFloat(a.rating), reviews: a.reviews, memory: a.memory, tier: a.tier,
    tagline: a.tagline, category: a.category,
    capabilities: a.capabilities
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Special Agents — SilkWeb AI Marketplace</title>
<meta name="description" content="20 AI specialist agents ready to work for your business. Cybersecurity, finance, legal, healthcare, and more.">
<meta property="og:title" content="Special Agents — SilkWeb AI Marketplace">
<meta property="og:description" content="20 AI specialist agents ready to work for your business.">
<meta property="og:url" content="https://silkweb.io/agents/">
<meta name="theme-color" content="#000000">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#000;--white:#fff;--gray-300:#cbd5e1;--gray-400:#94a3b8;--gray-500:#64748b;--gray-600:#475569;--border:rgba(255,255,255,0.06);--glass:rgba(255,255,255,0.03);--glass-hover:rgba(255,255,255,0.06)}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--white);overflow-x:hidden;-webkit-font-smoothing:antialiased}
nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0 48px;height:64px;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.8);backdrop-filter:blur(24px);border-bottom:1px solid var(--border)}
.nav-logo{font-size:20px;font-weight:700;color:var(--white);text-decoration:none;display:flex;align-items:center;gap:10px}
.nav-logo .logo-mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800}
.nav-links{display:flex;align-items:center;gap:28px}
.nav-links a{color:var(--gray-400);text-decoration:none;font-size:14px;font-weight:500;transition:color .3s}
.nav-links a:hover{color:var(--white)}
.nav-cta{padding:10px 24px;border-radius:12px;font-weight:600;font-size:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff!important;border:none;cursor:pointer;transition:transform .2s,box-shadow .3s}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 8px 30px rgba(79,70,229,0.3)}
.hero{padding:140px 48px 60px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:600px;background:radial-gradient(ellipse,rgba(79,70,229,0.12) 0%,transparent 70%);pointer-events:none}
.hero h1{font-size:clamp(40px,6vw,72px);font-weight:800;letter-spacing:-2px;line-height:1.1;background:linear-gradient(135deg,#fff 30%,#94a3b8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px}
.hero p{font-size:18px;color:var(--gray-400);max-width:550px;margin:0 auto 40px;line-height:1.6}
.filter-bar{display:flex;justify-content:center;gap:8px;margin-bottom:40px;flex-wrap:wrap;padding:0 48px}
.filter-btn{padding:9px 22px;border-radius:100px;background:var(--glass);border:1px solid var(--border);color:var(--gray-400);font-size:13px;font-weight:500;cursor:pointer;transition:all .3s;font-family:inherit}
.filter-btn:hover,.filter-btn.active{background:rgba(79,70,229,0.15);border-color:rgba(79,70,229,0.3);color:var(--white)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:0 48px 100px;max-width:1440px;margin:0 auto}
.agent-card{background:var(--glass);border:1px solid var(--border);border-radius:18px;padding:24px;cursor:pointer;transition:all .4s cubic-bezier(.16,1,.3,1);text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden}
.agent-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;opacity:0;transition:opacity .4s}
.agent-card:hover{transform:translateY(-6px);background:var(--glass-hover);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
.agent-card:hover::before{opacity:1}
.card-header{display:flex;align-items:center;gap:12px}
.card-avatar{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;flex-shrink:0}
.card-info{flex:1;min-width:0}
.card-name{font-size:17px;font-weight:700;color:var(--white)}
.card-domain{font-size:13px;color:var(--gray-400);margin-top:2px}
.card-tagline{font-size:12px;color:var(--gray-500);font-style:italic;line-height:1.5}
.card-rating{display:flex;align-items:center;gap:6px}
.stars{display:flex;gap:2px}
.star{width:13px;height:13px}
.star-filled{color:#F59E0B}
.star-empty{color:#374151}
.rating-text{font-size:13px;font-weight:600;color:var(--gray-300)}
.review-count{font-size:11px;color:var(--gray-500)}
.card-badges{display:flex;gap:7px;flex-wrap:wrap}
.badge{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
.badge-memory{background:transparent;border:1px solid}
.badge-tier-expert{background:rgba(99,102,241,.15);color:#818cf8;border:1px solid rgba(99,102,241,.25)}
.badge-tier-authority{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.25)}
.card-cta{padding:10px 0;border-radius:10px;font-size:13px;font-weight:600;color:#fff;text-align:center;transition:all .3s;margin-top:auto}
.card-cta:hover{filter:brightness(1.15)}
footer{text-align:center;padding:40px;border-top:1px solid var(--border);color:var(--gray-500);font-size:13px}
footer a{color:var(--gray-400);text-decoration:none}
footer a:hover{color:var(--white)}
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.agent-card{opacity:0;animation:fadeInUp .6s ease forwards}
@media(max-width:1200px){.grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr);padding:0 24px 80px}.hero{padding:120px 24px 48px}.filter-bar{padding:0 24px}nav{padding:0 24px}}
@media(max-width:540px){.grid{grid-template-columns:1fr}.hero h1{font-size:36px}.nav-links{display:none}}
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo"><span class="logo-mark">S</span> SilkWeb</a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="/agents/" style="color:#fff;">Agents</a>
    <a href="/register.html">Register</a>
    <a href="/register.html" class="nav-cta">Get Started</a>
  </div>
</nav>
<section class="hero">
  <h1>Special Agents</h1>
  <p>20 AI specialists ready to work for your business. Each one trained, tested, and ready to deploy.</p>
</section>
<div class="filter-bar" id="filterBar">
  <button class="filter-btn active" data-filter="all">All</button>
  <button class="filter-btn" data-filter="security">Security</button>
  <button class="filter-btn" data-filter="legal">Legal</button>
  <button class="filter-btn" data-filter="finance">Finance</button>
  <button class="filter-btn" data-filter="health">Health</button>
  <button class="filter-btn" data-filter="tech">Tech</button>
  <button class="filter-btn" data-filter="business">Business</button>
  <button class="filter-btn" data-filter="creative">Creative</button>
</div>
<div class="grid" id="agentGrid"></div>
<footer>
  <p>&copy; 2026 SilkWeb &mdash; <a href="/">Home</a> &middot; <a href="/register.html">Register Your Business</a></p>
</footer>
<script>
const AGENTS = ${agentDataJS};

function starsSVG(rating) {
  let html = '';
  const full = Math.floor(rating);
  for (let i = 0; i < 5; i++) {
    const filled = i < full || (i === full && rating % 1 >= 0.5);
    html += '<svg class="star ' + (filled ? 'star-filled' : 'star-empty') + '" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>';
  }
  return html;
}

function renderAgents(filter) {
  const grid = document.getElementById('agentGrid');
  grid.innerHTML = '';
  const filtered = filter === 'all' ? AGENTS : AGENTS.filter(a => a.category === filter);
  filtered.forEach((agent, i) => {
    const card = document.createElement('a');
    card.href = '/agents/' + agent.id + '.html';
    card.className = 'agent-card';
    card.style.animationDelay = (i * 0.05) + 's';
    const capTags = agent.capabilities.slice(0,3).map(c => '<span style="padding:3px 8px;border-radius:6px;font-size:10px;color:var(--gray-400);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">' + c + '</span>').join('');
    card.innerHTML = '<style>.agent-card:nth-child(' + (i+1) + ')::before{background:' + agent.gradient + '} .agent-card:nth-child(' + (i+1) + '):hover{border-color:' + agent.color + '30;box-shadow:0 20px 60px ' + agent.color + '15}</style>' +
      '<div class="card-header"><div class="card-avatar" style="background:' + agent.gradient + '">' + agent.name[0] + '</div><div class="card-info"><div class="card-name">' + agent.name + '</div><div class="card-domain">' + agent.domain + '</div></div></div>' +
      '<div class="card-tagline">' + agent.tagline + '</div>' +
      '<div class="card-rating"><div class="stars">' + starsSVG(agent.rating) + '</div><span class="rating-text">' + agent.rating + '</span><span class="review-count">' + agent.reviews + ' reviews</span></div>' +
      '<div class="card-badges"><span class="badge badge-memory" style="border-color:' + agent.color + '40;color:' + agent.color + '">' + agent.memory + '</span><span class="badge badge-tier-' + agent.tier.toLowerCase() + '">' + agent.tier + '</span></div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap">' + capTags + '</div>' +
      '<div class="card-cta" style="background:' + agent.gradient + '">Connect &rarr;</div>';
    grid.appendChild(card);
  });
}

document.getElementById('filterBar').addEventListener('click', e => {
  if (!e.target.classList.contains('filter-btn')) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  renderAgents(e.target.dataset.filter);
});

renderAgents('all');
</script>
</body>
</html>`;
}

// =====================
// WRITE ALL FILES
// =====================
const dir = path.join(__dirname);

// Write index
fs.writeFileSync(path.join(dir, 'index.html'), generateIndexPage());
console.log('Wrote index.html');

// Write each agent page
AGENTS.forEach(a => {
  const filename = a.id + '.html';
  fs.writeFileSync(path.join(dir, filename), generateAgentPage(a));
  console.log('Wrote ' + filename);
});

console.log('\\nDone! Generated 21 files.');
