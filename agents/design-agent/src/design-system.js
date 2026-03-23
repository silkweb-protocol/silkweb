// ─────────────────────────────────────────────
// SilkWeb Design System
// Typography, colors, spacing, effects
// ─────────────────────────────────────────────

const BRAND_DEFAULTS = {
  name: 'SilkWeb',
  tagline: 'DNS for AI agents',
  subtitle: 'Discover. Delegate. Verify.',
  url: 'silkweb.io',
  colors: {
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',
    secondary: '#10B981',
    secondaryLight: '#34d399',
    secondaryDark: '#059669',
    accent: '#a78bfa',
    bg: '#06060b',
    bgCard: 'rgba(15, 15, 25, 0.6)',
    bgEditor: 'rgba(15, 15, 25, 0.85)',
    text: '#e2e8f0',
    textMuted: 'rgba(255,255,255,0.4)',
    textDim: 'rgba(255,255,255,0.25)',
    textGhost: 'rgba(255,255,255,0.12)',
    borderSubtle: 'rgba(255,255,255,0.06)',
    borderAccent: 'rgba(99,102,241,0.2)',
    borderGreen: 'rgba(16,185,129,0.3)',
    white: '#ffffff',
    black: '#000000',
  },
  fonts: {
    heading: "'Inter', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontImport: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap",
};

// 8px grid spacing system
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 120,
};

// Typography scale
const TYPOGRAPHY = {
  display: { size: 64, weight: 900, letterSpacing: -3, lineHeight: 1.0 },
  h1: { size: 38, weight: 800, letterSpacing: -1.5, lineHeight: 1.1 },
  h2: { size: 28, weight: 700, letterSpacing: -1, lineHeight: 1.2 },
  h3: { size: 22, weight: 700, letterSpacing: -0.3, lineHeight: 1.3 },
  body: { size: 16, weight: 400, letterSpacing: 0, lineHeight: 1.6 },
  caption: { size: 13, weight: 500, letterSpacing: 1.5, lineHeight: 1.4 },
  label: { size: 11, weight: 500, letterSpacing: 1.5, lineHeight: 1.4 },
  code: { size: 14.5, weight: 400, letterSpacing: 0.5, lineHeight: 1.8 },
  mono: { size: 13, weight: 400, letterSpacing: 0.5, lineHeight: 1.4 },
};

// Border radii
const RADII = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

// Shadow presets
const SHADOWS = {
  card: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
  editor: '0 25px 80px rgba(0,0,0,0.6), 0 0 120px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
  glow: '0 8px 32px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.15)',
  subtle: '0 4px 16px rgba(0,0,0,0.2)',
};

// Syntax highlighting colors (One Dark inspired)
const SYNTAX = {
  keyword: '#c678dd',
  function: '#61afef',
  string: '#98c379',
  variable: '#e5c07b',
  text: '#abb2bf',
  number: '#d19a66',
  comment: 'rgba(255,255,255,0.2)',
  operator: '#56b6c2',
  type: '#e06c75',
};

// Color manipulation utilities
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function gradientText(colors, angle = 135) {
  const stops = colors.join(', ');
  return `background: linear-gradient(${angle}deg, ${stops}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`;
}

// Generate CSS for gradient mesh backgrounds
function meshGradientCSS(brand) {
  const p = brand.colors?.primary || BRAND_DEFAULTS.colors.primary;
  const s = brand.colors?.secondary || BRAND_DEFAULTS.colors.secondary;
  return `
    .mesh-1 {
      position: absolute; width: 700px; height: 700px; top: -300px; right: -100px;
      background: radial-gradient(circle, ${rgba(p, 0.15)} 0%, transparent 65%);
      filter: blur(100px);
    }
    .mesh-2 {
      position: absolute; width: 500px; height: 500px; bottom: -200px; left: -50px;
      background: radial-gradient(circle, ${rgba(s, 0.1)} 0%, transparent 65%);
      filter: blur(80px);
    }
    .mesh-3 {
      position: absolute; width: 400px; height: 400px; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, ${rgba(p, 0.08)} 0%, transparent 60%);
      filter: blur(60px);
    }
  `;
}

// Grid overlay CSS
function gridOverlayCSS(opacity = 0.015) {
  return `
    .grid-overlay {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,${opacity}) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,${opacity}) 1px, transparent 1px);
      background-size: 60px 60px;
    }
  `;
}

// Glassmorphism card CSS
function glassCardCSS(brand) {
  const p = brand.colors?.primary || BRAND_DEFAULTS.colors.primary;
  return `
    background: rgba(15, 15, 25, 0.6);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: ${RADII.lg}px;
    backdrop-filter: blur(20px);
    box-shadow: ${SHADOWS.card};
    position: relative;
    overflow: hidden;
  `;
}

// Top-line accent for cards
function cardTopAccent(color, width = '60%') {
  return `
    content: '';
    position: absolute;
    top: 0; left: 50%; transform: translateX(-50%);
    width: ${width}; height: 1px;
    background: linear-gradient(90deg, transparent, ${rgba(color, 0.5)}, transparent);
  `;
}

// Build full base CSS from brand config
function baseCSS(brand, width = 1200, height = 675) {
  const b = { ...BRAND_DEFAULTS, ...brand };
  const colors = { ...BRAND_DEFAULTS.colors, ...(brand.colors || {}) };
  const fonts = { ...BRAND_DEFAULTS.fonts, ...(brand.fonts || {}) };
  b.colors = colors;
  b.fonts = fonts;

  return `
    @import url('${b.fontImport || BRAND_DEFAULTS.fontImport}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${colors.bg};
      font-family: ${fonts.heading};
      position: relative;
      color: ${colors.text};
    }
    ${meshGradientCSS(b)}
    ${gridOverlayCSS()}
  `;
}

// Merge user brand with defaults
function mergeBrand(userBrand) {
  if (!userBrand) return { ...BRAND_DEFAULTS };
  return {
    ...BRAND_DEFAULTS,
    ...userBrand,
    colors: { ...BRAND_DEFAULTS.colors, ...(userBrand.colors || {}) },
    fonts: { ...BRAND_DEFAULTS.fonts, ...(userBrand.fonts || {}) },
  };
}

module.exports = {
  BRAND_DEFAULTS,
  SPACING,
  TYPOGRAPHY,
  RADII,
  SHADOWS,
  SYNTAX,
  hexToRgb,
  rgba,
  gradientText,
  meshGradientCSS,
  gridOverlayCSS,
  glassCardCSS,
  cardTopAccent,
  baseCSS,
  mergeBrand,
};
