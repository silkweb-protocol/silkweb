// ─────────────────────────────────────────────
// SVG Generator Engine
// Programmatic SVG creation for icons, logos,
// scalable graphics
// ─────────────────────────────────────────────

const sharp = require('sharp');
const { mergeBrand, rgba, BRAND_DEFAULTS } = require('../design-system');

// SVG element builders
class SVG {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.defs = [];
    this.elements = [];
  }

  addDef(def) {
    this.defs.push(def);
    return this;
  }

  addElement(el) {
    this.elements.push(el);
    return this;
  }

  // Add a linear gradient definition
  linearGradient(id, stops, angle = 135) {
    const rad = (angle * Math.PI) / 180;
    const x1 = 50 - 50 * Math.cos(rad);
    const y1 = 50 - 50 * Math.sin(rad);
    const x2 = 50 + 50 * Math.cos(rad);
    const y2 = 50 + 50 * Math.sin(rad);

    const stopEls = stops.map(s =>
      `<stop offset="${s.offset}%" stop-color="${s.color}" stop-opacity="${s.opacity || 1}"/>`
    ).join('\n      ');

    this.addDef(`
    <linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      ${stopEls}
    </linearGradient>`);
    return this;
  }

  // Add a radial gradient definition
  radialGradient(id, stops, cx = 50, cy = 50, r = 50) {
    const stopEls = stops.map(s =>
      `<stop offset="${s.offset}%" stop-color="${s.color}" stop-opacity="${s.opacity || 1}"/>`
    ).join('\n      ');

    this.addDef(`
    <radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%">
      ${stopEls}
    </radialGradient>`);
    return this;
  }

  // Add a blur filter
  blurFilter(id, stdDev = 20) {
    this.addDef(`
    <filter id="${id}">
      <feGaussianBlur stdDeviation="${stdDev}" />
    </filter>`);
    return this;
  }

  // Draw a rectangle
  rect(x, y, w, h, opts = {}) {
    const attrs = [
      `x="${x}" y="${y}" width="${w}" height="${h}"`,
      opts.rx ? `rx="${opts.rx}"` : '',
      opts.fill ? `fill="${opts.fill}"` : '',
      opts.stroke ? `stroke="${opts.stroke}"` : '',
      opts.strokeWidth ? `stroke-width="${opts.strokeWidth}"` : '',
      opts.opacity ? `opacity="${opts.opacity}"` : '',
      opts.filter ? `filter="url(#${opts.filter})"` : '',
    ].filter(Boolean).join(' ');
    this.addElement(`<rect ${attrs}/>`);
    return this;
  }

  // Draw a circle
  circle(cx, cy, r, opts = {}) {
    const attrs = [
      `cx="${cx}" cy="${cy}" r="${r}"`,
      opts.fill ? `fill="${opts.fill}"` : '',
      opts.stroke ? `stroke="${opts.stroke}"` : '',
      opts.strokeWidth ? `stroke-width="${opts.strokeWidth}"` : '',
      opts.opacity ? `opacity="${opts.opacity}"` : '',
      opts.filter ? `filter="url(#${opts.filter})"` : '',
    ].filter(Boolean).join(' ');
    this.addElement(`<circle ${attrs}/>`);
    return this;
  }

  // Draw text
  text(x, y, content, opts = {}) {
    const attrs = [
      `x="${x}" y="${y}"`,
      opts.fill ? `fill="${opts.fill}"` : '',
      opts.fontSize ? `font-size="${opts.fontSize}"` : '',
      opts.fontWeight ? `font-weight="${opts.fontWeight}"` : '',
      opts.fontFamily ? `font-family="${opts.fontFamily}"` : '',
      opts.textAnchor ? `text-anchor="${opts.textAnchor}"` : '',
      opts.letterSpacing ? `letter-spacing="${opts.letterSpacing}"` : '',
      opts.opacity ? `opacity="${opts.opacity}"` : '',
    ].filter(Boolean).join(' ');
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    this.addElement(`<text ${attrs}>${escaped}</text>`);
    return this;
  }

  // Draw a path
  path(d, opts = {}) {
    const attrs = [
      `d="${d}"`,
      opts.fill ? `fill="${opts.fill}"` : 'fill="none"',
      opts.stroke ? `stroke="${opts.stroke}"` : '',
      opts.strokeWidth ? `stroke-width="${opts.strokeWidth}"` : '',
      opts.opacity ? `opacity="${opts.opacity}"` : '',
    ].filter(Boolean).join(' ');
    this.addElement(`<path ${attrs}/>`);
    return this;
  }

  // Group elements
  group(elements, opts = {}) {
    const attrs = [
      opts.transform ? `transform="${opts.transform}"` : '',
      opts.opacity ? `opacity="${opts.opacity}"` : '',
    ].filter(Boolean).join(' ');
    this.addElement(`<g ${attrs}>${elements.join('\n')}</g>`);
    return this;
  }

  // Render to SVG string
  toString() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <defs>${this.defs.join('\n')}</defs>
  ${this.elements.join('\n  ')}
</svg>`;
  }

  // Render to PNG buffer via sharp
  async toPNG(scale = 2) {
    const svgString = this.toString();
    const buffer = Buffer.from(svgString);
    return sharp(buffer, { density: 72 * scale })
      .png()
      .toBuffer();
  }
}

// ─── Icon Generator ──────────────────────────

function generateAppIcon(size, brand) {
  const b = mergeBrand(brand);
  const c = b.colors;
  const svg = new SVG(size, size);
  const padding = size * 0.15;
  const cornerRadius = size * 0.22;
  const letterSize = size * 0.45;

  // Background gradient
  svg.linearGradient('bg-grad', [
    { offset: 0, color: c.primary },
    { offset: 50, color: c.primaryLight || '#818cf8' },
    { offset: 100, color: c.accent || '#a78bfa' },
  ], 135);

  // Glow filter
  svg.blurFilter('glow', size * 0.03);

  // Background
  svg.rect(0, 0, size, size, { rx: cornerRadius, fill: 'url(#bg-grad)' });

  // Inner glow
  svg.circle(size * 0.5, size * 0.35, size * 0.3, {
    fill: 'white', opacity: 0.1, filter: 'glow',
  });

  // Letter
  svg.text(size / 2, size / 2 + letterSize * 0.35, (b.name || 'S')[0], {
    fill: 'white',
    fontSize: letterSize,
    fontWeight: 900,
    fontFamily: "'Inter', sans-serif",
    textAnchor: 'middle',
  });

  return svg;
}

function generateFavicon(size, brand) {
  const b = mergeBrand(brand);
  const svg = new SVG(size, size);

  svg.linearGradient('fav-bg', [
    { offset: 0, color: b.colors.primary },
    { offset: 100, color: b.colors.primaryLight || '#818cf8' },
  ], 135);

  svg.rect(0, 0, size, size, { rx: size * 0.2, fill: 'url(#fav-bg)' });
  svg.text(size / 2, size / 2 + size * 0.18, (b.name || 'S')[0], {
    fill: 'white',
    fontSize: size * 0.55,
    fontWeight: 900,
    fontFamily: "'Inter', sans-serif",
    textAnchor: 'middle',
  });

  return svg;
}

// ─── Generate multiple icon sizes ────────────

async function generateIcons(brand, sizes = [16, 32, 48, 64, 128, 256, 512, 1024]) {
  const results = {};

  for (const size of sizes) {
    const svg = size <= 64 ? generateFavicon(size, brand) : generateAppIcon(size, brand);
    const pngBuffer = await svg.toPNG(size <= 64 ? 1 : 2);
    // Resize to exact dimensions
    const resized = await sharp(pngBuffer)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toBuffer();
    results[size] = resized;
  }

  return results;
}

// ─── Generate a single icon at a specific size ──

async function generateIcon(brand, size = 512) {
  const svg = size <= 64 ? generateFavicon(size, brand) : generateAppIcon(size, brand);
  const pngBuffer = await svg.toPNG(2);
  return sharp(pngBuffer)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toBuffer();
}

// ─── Generic SVG → PNG ──────────────────────

async function svgToPNG(svgString, width, height) {
  const buffer = Buffer.from(svgString);
  return sharp(buffer, { density: 144 })
    .resize(width, height, { fit: 'contain' })
    .png()
    .toBuffer();
}

module.exports = {
  SVG,
  generateAppIcon,
  generateFavicon,
  generateIcons,
  generateIcon,
  svgToPNG,
};
