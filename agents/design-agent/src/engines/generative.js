// ─────────────────────────────────────────────
// Generative Art Engine
// Creates algorithmic art patterns as SVG/PNG
// Inspired by p5.js patterns, rendered via SVG + sharp
// ─────────────────────────────────────────────

const sharp = require('sharp');
const { mergeBrand, hexToRgb, rgba } = require('../design-system');

// ─── Math utilities ──────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function map(v, inMin, inMax, outMin, outMax) {
  return ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
function noise2D(x, y) {
  // Simple value noise approximation
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ─── Pattern generators ─────────────────────

// Concentric rings with distortion
function concentricRings(width, height, brand, opts = {}) {
  const c = mergeBrand(brand).colors;
  const rings = opts.rings || 8;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.max(width, height) * 0.6;
  const elements = [];

  for (let i = 0; i < rings; i++) {
    const r = (i / rings) * maxRadius;
    const opacity = map(i, 0, rings, 0.15, 0.02);
    const color = i % 2 === 0 ? c.primary : c.secondary;
    const { r: cr, g: cg, b: cb } = hexToRgb(color);

    elements.push(`<circle cx="${centerX}" cy="${centerY}" r="${r}"
      fill="none" stroke="rgba(${cr},${cg},${cb},${opacity})"
      stroke-width="${map(i, 0, rings, 2, 0.5)}"/>`);
  }

  return elements;
}

// Flow field lines
function flowField(width, height, brand, opts = {}) {
  const c = mergeBrand(brand).colors;
  const cols = opts.cols || 20;
  const rows = opts.rows || 15;
  const elements = [];
  const cellW = width / cols;
  const cellH = height / rows;
  const seed = opts.seed || 42;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cellW + cellW / 2;
      const py = y * cellH + cellH / 2;
      const angle = noise2D(x * 0.1 + seed, y * 0.1 + seed) * Math.PI * 2;
      const length = cellW * 0.6;
      const ex = px + Math.cos(angle) * length;
      const ey = py + Math.sin(angle) * length;
      const opacity = noise2D(x * 0.3, y * 0.3) * 0.08 + 0.02;
      const color = noise2D(x, y) > 0.5 ? c.primary : c.secondary;
      const { r, g, b } = hexToRgb(color);

      elements.push(`<line x1="${px}" y1="${py}" x2="${ex}" y2="${ey}"
        stroke="rgba(${r},${g},${b},${opacity})" stroke-width="1"
        stroke-linecap="round"/>`);
    }
  }

  return elements;
}

// Particle constellation
function constellation(width, height, brand, opts = {}) {
  const c = mergeBrand(brand).colors;
  const numPoints = opts.points || 40;
  const connectionDist = opts.connectionDist || 150;
  const elements = [];
  const seed = opts.seed || 7;
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const x = noise2D(i * 0.7 + seed, 0) * width;
    const y = noise2D(0, i * 0.7 + seed) * height;
    const size = noise2D(i, i) * 3 + 1;
    points.push({ x, y, size });

    const color = i % 3 === 0 ? c.primary : i % 3 === 1 ? c.secondary : (c.accent || '#a78bfa');
    const { r, g, b } = hexToRgb(color);
    const opacity = noise2D(i * 2, i) * 0.4 + 0.1;

    elements.push(`<circle cx="${x}" cy="${y}" r="${size}"
      fill="rgba(${r},${g},${b},${opacity})"/>`);

    // Glow
    if (size > 2) {
      elements.push(`<circle cx="${x}" cy="${y}" r="${size * 4}"
        fill="rgba(${r},${g},${b},${opacity * 0.2})"/>`);
    }
  }

  // Connections
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = dist(points[i].x, points[i].y, points[j].x, points[j].y);
      if (d < connectionDist) {
        const opacity = map(d, 0, connectionDist, 0.08, 0.01);
        const { r, g, b } = hexToRgb(c.primary);
        elements.push(`<line x1="${points[i].x}" y1="${points[i].y}"
          x2="${points[j].x}" y2="${points[j].y}"
          stroke="rgba(${r},${g},${b},${opacity})" stroke-width="0.5"/>`);
      }
    }
  }

  return elements;
}

// Hexagonal grid pattern
function hexGrid(width, height, brand, opts = {}) {
  const c = mergeBrand(brand).colors;
  const hexSize = opts.hexSize || 40;
  const elements = [];
  const sqrt3 = Math.sqrt(3);
  const seed = opts.seed || 13;

  for (let row = -1; row < height / (hexSize * 1.5) + 1; row++) {
    for (let col = -1; col < width / (hexSize * sqrt3) + 1; col++) {
      const x = col * hexSize * sqrt3 + (row % 2 ? hexSize * sqrt3 / 2 : 0);
      const y = row * hexSize * 1.5;

      const n = noise2D(col * 0.2 + seed, row * 0.2 + seed);
      if (n < 0.3) continue;

      const opacity = n * 0.06;
      const color = n > 0.7 ? c.primary : n > 0.5 ? c.secondary : (c.accent || '#a78bfa');
      const { r, g, b } = hexToRgb(color);

      const points = [];
      for (let a = 0; a < 6; a++) {
        const angle = (Math.PI / 3) * a - Math.PI / 6;
        points.push(`${x + hexSize * 0.9 * Math.cos(angle)},${y + hexSize * 0.9 * Math.sin(angle)}`);
      }

      elements.push(`<polygon points="${points.join(' ')}"
        fill="none" stroke="rgba(${r},${g},${b},${opacity})" stroke-width="0.5"/>`);
    }
  }

  return elements;
}

// Wave lines
function waveLines(width, height, brand, opts = {}) {
  const c = mergeBrand(brand).colors;
  const numLines = opts.lines || 12;
  const elements = [];

  for (let i = 0; i < numLines; i++) {
    const y = (i / numLines) * height;
    const amplitude = map(i, 0, numLines, 5, 30);
    const frequency = map(noise2D(i, 0), 0, 1, 0.005, 0.02);
    const phase = i * 0.5;
    const points = [];

    for (let x = 0; x <= width; x += 4) {
      const py = y + Math.sin(x * frequency + phase) * amplitude;
      points.push(`${x},${py}`);
    }

    const color = i % 2 === 0 ? c.primary : c.secondary;
    const { r, g, b } = hexToRgb(color);
    const opacity = map(i, 0, numLines, 0.08, 0.02);

    elements.push(`<polyline points="${points.join(' ')}"
      fill="none" stroke="rgba(${r},${g},${b},${opacity})"
      stroke-width="1" stroke-linecap="round"/>`);
  }

  return elements;
}

// ─── Main generator ─────────────────────────

const PATTERNS = {
  rings: concentricRings,
  flow: flowField,
  constellation: constellation,
  hexgrid: hexGrid,
  waves: waveLines,
};

function generatePattern(pattern, width, height, brand, opts = {}) {
  const generator = PATTERNS[pattern] || PATTERNS.constellation;
  return generator(width, height, brand, opts);
}

// Generate full SVG art
function generateArtSVG(width, height, brand, opts = {}) {
  const b = mergeBrand(brand);
  const c = b.colors;
  const pattern = opts.pattern || 'constellation';
  const patternElements = generatePattern(pattern, width, height, brand, opts);

  // Background gradient
  const { r: bgR, g: bgG, b: bgB } = hexToRgb(c.bg);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="mesh1" cx="70%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${c.primary}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${c.primary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mesh2" cx="20%" cy="80%" r="50%">
      <stop offset="0%" stop-color="${c.secondary}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${c.secondary}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur1"><feGaussianBlur stdDeviation="80"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="60"/></filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${c.bg}"/>

  <!-- Mesh gradients -->
  <rect width="${width}" height="${height}" fill="url(#mesh1)" filter="url(#blur1)"/>
  <rect width="${width}" height="${height}" fill="url(#mesh2)" filter="url(#blur2)"/>

  <!-- Pattern -->
  ${patternElements.join('\n  ')}
</svg>`;

  return svg;
}

// Generate to PNG
async function generateArtPNG(width, height, brand, opts = {}) {
  const svg = generateArtSVG(width, height, brand, opts);
  return sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();
}

module.exports = {
  generatePattern,
  generateArtSVG,
  generateArtPNG,
  PATTERNS,
  // Expose individual generators
  concentricRings,
  flowField,
  constellation,
  hexGrid,
  waveLines,
};
