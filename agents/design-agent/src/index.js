// ─────────────────────────────────────────────
// SilkWeb Design Agent
// Production-ready image generation service
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { renderHTML, renderRawHTML, renderTemplate, buildTemplateVars, loadTemplate, closeBrowser } = require('./engines/html-renderer');
const { generateIcon, generateIcons, SVG, svgToPNG } = require('./engines/svg-generator');
const { createCanvas, compositeImages, createGradient, roundCorners, addBorder, resizeWithPadding, addTextOverlay, generateNoiseTexture } = require('./engines/canvas-renderer');
const { generateArtSVG, generateArtPNG, PATTERNS } = require('./engines/generative');
const { mergeBrand, BRAND_DEFAULTS, SYNTAX, TYPOGRAPHY, SPACING } = require('./design-system');
const { getPreset, applyPreset, presets } = require('./presets');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json({ limit: '10mb' }));

// ─── Health & Info ──────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'silkweb-design-agent',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /design/social-card',
      'POST /design/github-social',
      'POST /design/icon',
      'POST /design/hero',
      'POST /design/code-snippet',
      'POST /design/infographic',
      'POST /design/receipt',
      'POST /design/custom',
      'GET  /design/presets',
      'GET  /design/patterns',
    ],
    capabilities: [
      'social-card-design',
      'github-preview',
      'icon-design',
      'hero-image',
      'code-screenshot',
      'infographic',
      'receipt-design',
      'custom-design',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Presets & Patterns info ────────────────

app.get('/design/presets', (req, res) => {
  res.json({
    presets: Object.keys(presets),
    details: Object.fromEntries(
      Object.entries(presets).map(([k, v]) => [k, { mood: v.style.mood, effects: v.style.effects }])
    ),
  });
});

app.get('/design/patterns', (req, res) => {
  res.json({
    patterns: Object.keys(PATTERNS),
    description: {
      rings: 'Concentric rings with subtle distortion',
      flow: 'Flow field directional lines',
      constellation: 'Connected particle dots',
      hexgrid: 'Hexagonal grid overlay',
      waves: 'Undulating wave lines',
    },
  });
});

// ─── POST /design/social-card ───────────────

app.post('/design/social-card', async (req, res) => {
  try {
    const { brand, content, style, output, preset } = req.body;
    const width = output?.width || 1200;
    const height = output?.height || 675;

    const mergedBrand = mergeBrand(brand);
    const templateContent = {
      headline: content?.headline || mergedBrand.tagline,
      subheadline: content?.subheadline || mergedBrand.subtitle,
      url: content?.url || mergedBrand.url,
      floatBadge: content?.badge || '',
      badges: content?.badges || [
        { text: 'Open Source', class: 'primary' },
        { text: 'Free API', class: 'secondary' },
      ],
    };

    const buffer = await renderHTML('social-card', {
      brand: mergedBrand,
      content: templateContent,
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('Social card error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /design/github-social ─────────────

app.post('/design/github-social', async (req, res) => {
  try {
    const { brand, content, style, output } = req.body;
    const width = output?.width || 1280;
    const height = output?.height || 640;

    const mergedBrand = mergeBrand(brand);
    const templateContent = {
      tagline: content?.tagline || mergedBrand.subtitle,
      url: content?.url || `github.com/${(mergedBrand.name || 'silkweb').toLowerCase()}`,
      stats: content?.stats || [
        { value: '18', label: 'Agents', color: '' },
        { value: '47', label: 'Capabilities', color: 'green' },
        { value: '12', label: 'Industries', color: '' },
      ],
      badges: content?.badges || [
        { text: 'Open Source', class: 'primary' },
        { text: 'Apache 2.0', class: '' },
        { text: 'Free API', class: 'secondary' },
      ],
    };

    const buffer = await renderHTML('github-social', {
      brand: mergedBrand,
      content: templateContent,
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('GitHub social error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /design/icon ──────────────────────

app.post('/design/icon', async (req, res) => {
  try {
    const { brand, output } = req.body;
    const size = output?.width || output?.size || 512;
    const allSizes = output?.allSizes || false;

    if (allSizes) {
      const icons = await generateIcons(brand);
      // Return as JSON with base64 encoded images
      const result = {};
      for (const [s, buf] of Object.entries(icons)) {
        result[s] = buf.toString('base64');
      }
      res.json({ icons: result, sizes: Object.keys(result).map(Number) });
    } else {
      const buffer = await generateIcon(brand, size);
      res.set('Content-Type', 'image/png');
      res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
      res.send(buffer);
    }
  } catch (err) {
    console.error('Icon error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /design/hero ─────────────────────

app.post('/design/hero', async (req, res) => {
  try {
    const { brand, content, style, output } = req.body;
    const width = output?.width || 1920;
    const height = output?.height || 1080;

    const mergedBrand = mergeBrand(brand);
    const templateContent = {
      headline: content?.headline || mergedBrand.name,
      subtitle: content?.subtitle || mergedBrand.subtitle,
      tagline: content?.tagline || mergedBrand.tagline,
      ctaText: content?.ctaText || '',
      logoLetter: content?.logoLetter || (mergedBrand.name || 'S')[0],
    };

    const buffer = await renderHTML('hero', {
      brand: mergedBrand,
      content: templateContent,
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('Hero error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /design/code-snippet ──────────────

app.post('/design/code-snippet', async (req, res) => {
  try {
    const { brand, content, style, output } = req.body;
    const width = output?.width || 1200;
    const height = output?.height || 675;

    const code = content?.code || '';
    const filename = content?.filename || 'example.js';
    const highlightLines = content?.highlightLines || [];

    // Parse code into highlighted HTML lines
    const codeLines = buildCodeLines(code, highlightLines);

    const templateContent = {
      filename,
      codeLines,
      floatBadge: content?.badge || '',
      ctaMain: content?.ctaMain || '',
      ctaSub: content?.ctaSub || '',
    };

    const buffer = await renderHTML('code-snippet', {
      brand: mergeBrand(brand),
      content: templateContent,
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('Code snippet error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simple syntax highlighter
function buildCodeLines(code, highlightLines = []) {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    const lineNum = i + 1;
    const isHighlighted = highlightLines.includes(lineNum);
    const cls = isHighlighted ? 'line hl' : 'line';
    const highlighted = highlightSyntax(line);
    return `<div class="${cls}"><span class="ln">${lineNum}</span>${highlighted}</div>`;
  }).join('\n');
}

function highlightSyntax(line) {
  if (!line.trim()) return '';

  // Comment lines
  if (line.trim().startsWith('//')) {
    return `<span class="cm">${escapeHtml(line)}</span>`;
  }

  let result = escapeHtml(line);

  // Keywords
  const keywords = ['const', 'let', 'var', 'function', 'return', 'await', 'async', 'new', 'import', 'export', 'from', 'if', 'else', 'class', 'extends', 'try', 'catch', 'throw'];
  keywords.forEach(kw => {
    result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `</span><span class="kw">$1</span><span class="txt">`);
  });

  // Strings (single and double quotes)
  result = result.replace(/(&#39;[^&#]*(?:&#39;)?|&quot;[^&]*(?:&quot;)?)/g, '<span class="str">$1</span>');
  // Template literals
  result = result.replace(/(`[^`]*`)/g, '<span class="str">$1</span>');

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');

  // Function calls
  result = result.replace(/(\w+)\(/g, '<span class="fn">$1</span>(');

  return `<span class="txt">${result}</span>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── POST /design/infographic ───────────────

app.post('/design/infographic', async (req, res) => {
  try {
    const { brand, content, style, output } = req.body;
    const width = output?.width || 1200;
    const height = output?.height || 675;

    const mergedBrand = mergeBrand(brand);
    const templateContent = {
      headline: content?.headline || mergedBrand.name,
      subheadline: content?.subheadline || mergedBrand.subtitle,
      stats: content?.stats || [
        { value: '18', label: 'Agents', color: '' },
        { value: '47', label: 'Capabilities', color: 'green' },
        { value: '12', label: 'Industries', color: '' },
      ],
      tags: content?.tags || [],
      footerItems: content?.footerItems || [],
    };

    const buffer = await renderHTML('infographic', {
      brand: mergedBrand,
      content: templateContent,
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('Infographic error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /design/receipt ───────────────────

app.post('/design/receipt', async (req, res) => {
  try {
    const { brand, content, style, output } = req.body;
    const width = output?.width || 800;
    const height = output?.height || 600;

    const mergedBrand = mergeBrand(brand);
    const templateContent = {
      receiptSubtitle: content?.subtitle || 'Task Receipt',
      status: content?.status || 'VERIFIED',
      items: content?.items || [
        { name: 'Task Completed', detail: 'agent-001', value: '1.00', color: '' },
      ],
      totals: content?.totals || [
        { label: 'Total', value: '1.00', class: 'main' },
      ],
      footerText: content?.footerText || `Verified on ${mergedBrand.name}`,
      receiptId: content?.receiptId || `RX-${uuidv4().split('-')[0].toUpperCase()}`,
    };

    const buffer = await renderHTML('receipt', {
      brand: mergedBrand,
      content: templateContent,
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('Receipt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /design/custom ───────────────────

app.post('/design/custom', async (req, res) => {
  try {
    const { brand, content, style, output, template } = req.body;
    const width = output?.width || 1200;
    const height = output?.height || 675;

    // Option 1: raw HTML provided
    if (template?.html) {
      const buffer = await renderRawHTML(template.html, {
        width,
        height,
        format: output?.format || 'png',
        quality: output?.quality || 1,
      });
      res.set('Content-Type', 'image/png');
      res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
      return res.send(buffer);
    }

    // Option 2: generative art
    if (style?.type === 'generative' || content?.pattern) {
      const pattern = content?.pattern || 'constellation';
      const buffer = await generateArtPNG(width, height, brand, {
        pattern,
        seed: content?.seed || Math.floor(Math.random() * 1000),
        ...(content?.patternOpts || {}),
      });
      res.set('Content-Type', 'image/png');
      res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
      return res.send(buffer);
    }

    // Option 3: use a named template with custom content
    const templateName = template?.name || 'social-card';
    const buffer = await renderHTML(templateName, {
      brand: mergeBrand(brand),
      content: content || {},
      style,
      output: { ...output, width, height },
    });

    res.set('Content-Type', 'image/png');
    res.set('X-Design-Agent', 'silkweb-design-agent/1.0.0');
    res.send(buffer);
  } catch (err) {
    console.error('Custom design error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── A2A Protocol endpoints ─────────────────

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'SilkWeb Design Agent',
    description: 'Production-ready image generation service for social cards, icons, code screenshots, infographics, and generative art',
    version: '1.0.0',
    protocol: 'a2a',
    capabilities: [
      'social-card-design',
      'github-preview',
      'icon-design',
      'hero-image',
      'code-screenshot',
      'infographic',
      'receipt-design',
      'custom-design',
    ],
    endpoints: {
      base: `http://localhost:${PORT}`,
      health: '/health',
      designs: '/design',
    },
    tags: ['design', 'graphics', 'branding', 'ui', 'marketing', 'social-media'],
  });
});

// ─── Error handling ─────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start server ───────────────────────────

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   SilkWeb Design Agent                  ║
  ║   Running on port ${PORT}                  ║
  ╠══════════════════════════════════════════╣
  ║   Endpoints:                            ║
  ║   POST /design/social-card              ║
  ║   POST /design/github-social            ║
  ║   POST /design/icon                     ║
  ║   POST /design/hero                     ║
  ║   POST /design/code-snippet             ║
  ║   POST /design/infographic              ║
  ║   POST /design/receipt                  ║
  ║   POST /design/custom                   ║
  ║                                         ║
  ║   GET  /design/presets                   ║
  ║   GET  /design/patterns                  ║
  ║   GET  /.well-known/agent.json           ║
  ╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down design agent...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down design agent...');
  await closeBrowser();
  process.exit(0);
});

module.exports = app;
