// ─────────────────────────────────────────────
// HTML/CSS → Headless Chrome → PNG
// Uses Puppeteer to render HTML templates
// ─────────────────────────────────────────────

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { mergeBrand, rgba, BRAND_DEFAULTS } = require('../design-system');

let browserInstance = null;

// Reuse a single browser instance for performance
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
  }
  return browserInstance;
}

// Simple mustache-like template engine
// Supports: {{var}}, {{#if var}}...{{/if}}, {{#each arr}}...{{/each}}, {{#unless cond}}...{{/unless}}
function renderTemplate(template, data) {
  let result = template;

  // Process {{#each array}}...{{/each}}
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, inner) => {
    const arr = data[key];
    if (!Array.isArray(arr)) return '';
    return arr.map((item, index) => {
      let rendered = inner;
      // Replace {{this.prop}}
      if (typeof item === 'object') {
        Object.keys(item).forEach(k => {
          rendered = rendered.replace(new RegExp(`\\{\\{this\\.${k}\\}\\}`, 'g'), escapeHtml(String(item[k])));
        });
      } else {
        rendered = rendered.replace(/\{\{this\}\}/g, escapeHtml(String(item)));
      }
      // Handle {{@first}}
      rendered = rendered.replace(/\{\{#unless @first\}\}([\s\S]*?)\{\{\/unless\}\}/g,
        index === 0 ? '' : '$1');
      rendered = rendered.replace(/\{\{@index\}\}/g, String(index));
      return rendered;
    }).join('');
  });

  // Process {{#if var}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, inner) => {
    return data[key] ? inner : '';
  });

  // Process {{#unless var}}...{{/unless}}
  result = result.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, key, inner) => {
    return data[key] ? '' : inner;
  });

  // Replace {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] !== undefined) {
      // Don't escape HTML for codeLines (pre-rendered HTML)
      if (key === 'codeLines') return data[key];
      return escapeHtml(String(data[key]));
    }
    return '';
  });

  return result;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build template variables from brand config
function buildTemplateVars(brand, content, style, output) {
  const b = mergeBrand(brand);
  const c = b.colors;
  const f = b.fonts;

  return {
    // Dimensions
    width: output?.width || 1200,
    height: output?.height || 675,

    // Fonts
    fontImport: b.fontImport || BRAND_DEFAULTS.fontImport,
    fontHeading: f.heading,
    fontMono: f.mono,

    // Brand
    brandName: b.name || 'SilkWeb',
    logoLetter: (b.name || 'S')[0],

    // Colors
    bg: c.bg,
    primary: c.primary,
    primaryLight: c.primaryLight || '#818cf8',
    primaryDark: c.primaryDark || '#4f46e5',
    secondary: c.secondary,
    secondaryLight: c.secondaryLight || '#34d399',
    accent: c.accent || '#a78bfa',
    text: c.text,

    // Alpha variants for primary
    primaryAlpha06: rgba(c.primary, 0.06),
    primaryAlpha08: rgba(c.primary, 0.08),
    primaryAlpha10: rgba(c.primary, 0.10),
    primaryAlpha12: rgba(c.primary, 0.12),
    primaryAlpha15: rgba(c.primary, 0.15),
    primaryAlpha18: rgba(c.primary, 0.18),
    primaryAlpha20: rgba(c.primary, 0.2),
    primaryAlpha30: rgba(c.primary, 0.3),
    primaryAlpha40: rgba(c.primary, 0.4),
    primaryAlpha50: rgba(c.primary, 0.5),
    primaryAlpha60: rgba(c.primary, 0.6),
    primaryAlpha80: rgba(c.primary, 0.8),

    // Alpha variants for secondary
    secondaryAlpha08: rgba(c.secondary, 0.08),
    secondaryAlpha10: rgba(c.secondary, 0.1),
    secondaryAlpha20: rgba(c.secondary, 0.2),
    secondaryAlpha30: rgba(c.secondary, 0.3),
    secondaryAlpha50: rgba(c.secondary, 0.5),
    secondaryAlpha60: rgba(c.secondary, 0.6),
    secondaryAlpha80: rgba(c.secondary, 0.8),

    // Alpha variants for accent
    accentAlpha06: rgba(c.accent || '#a78bfa', 0.06),
    accentAlpha08: rgba(c.accent || '#a78bfa', 0.08),
    accentAlpha10: rgba(c.accent || '#a78bfa', 0.10),
    accentAlpha20: rgba(c.accent || '#a78bfa', 0.20),
    accentAlpha50: rgba(c.accent || '#a78bfa', 0.50),

    // Content (spread in)
    ...(content || {}),
  };
}

// Load a template file
function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

// Main render function: template → PNG buffer
async function renderHTML(templateName, { brand, content, style, output }) {
  const width = output?.width || 1200;
  const height = output?.height || 675;
  const format = output?.format || 'png';
  const quality = output?.quality === 'high' ? 2 : 1;

  // Load and render template
  const template = loadTemplate(templateName);
  const vars = buildTemplateVars(brand, content, style, output);
  const html = renderTemplate(template, vars);

  // Screenshot via Puppeteer
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: quality,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Small delay for gradient rendering
    await new Promise(resolve => setTimeout(resolve, 200));

    const screenshotOptions = {
      type: format === 'jpeg' || format === 'jpg' ? 'jpeg' : 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
    };

    if (screenshotOptions.type === 'jpeg') {
      screenshotOptions.quality = output?.jpegQuality || 95;
    }

    const buffer = await page.screenshot(screenshotOptions);
    return buffer;
  } finally {
    await page.close();
  }
}

// Render raw HTML string (for custom templates)
async function renderRawHTML(html, { width = 1200, height = 675, format = 'png', quality = 1 } = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height, deviceScaleFactor: quality === 'high' ? 2 : 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 200));

    const buffer = await page.screenshot({
      type: format === 'jpeg' || format === 'jpg' ? 'jpeg' : 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
    });
    return buffer;
  } finally {
    await page.close();
  }
}

// Cleanup
async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);

module.exports = {
  renderHTML,
  renderRawHTML,
  renderTemplate,
  buildTemplateVars,
  loadTemplate,
  closeBrowser,
};
