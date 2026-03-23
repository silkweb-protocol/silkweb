// ─────────────────────────────────────────────
// Design Presets — curated style configurations
// ─────────────────────────────────────────────

const presets = {
  // Linear app aesthetic — dark, minimal, gradient mesh
  linear: {
    style: {
      theme: 'dark',
      effects: ['gradient-mesh', 'glow', 'glassmorphism'],
      mood: 'minimal-dark',
    },
    overrides: {
      bg: '#0f0f1a',
      bgCard: 'rgba(18, 18, 35, 0.7)',
      meshOpacity: 0.12,
      gridOpacity: 0.01,
      borderRadius: 16,
      blur: 24,
      gradientAngle: 135,
      accentGlow: true,
      fontWeight: {
        heading: 700,
        body: 400,
      },
    },
  },

  // Vercel — clean, bold typography, black/white with accent
  vercel: {
    style: {
      theme: 'dark',
      effects: ['sharp-edges', 'bold-type'],
      mood: 'clean-bold',
    },
    overrides: {
      bg: '#000000',
      bgCard: 'rgba(20, 20, 20, 0.9)',
      meshOpacity: 0.05,
      gridOpacity: 0.02,
      borderRadius: 8,
      blur: 0,
      gradientAngle: 180,
      accentGlow: false,
      fontWeight: {
        heading: 900,
        body: 400,
      },
      colors: {
        primary: '#ffffff',
        secondary: '#888888',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.5)',
        borderSubtle: 'rgba(255,255,255,0.1)',
      },
    },
  },

  // Stripe — gradient backgrounds, floating UI elements
  stripe: {
    style: {
      theme: 'dark',
      effects: ['gradient-mesh', 'floating-elements', 'soft-shadows'],
      mood: 'premium-gradient',
    },
    overrides: {
      bg: '#0a2540',
      bgCard: 'rgba(15, 50, 80, 0.5)',
      meshOpacity: 0.2,
      gridOpacity: 0,
      borderRadius: 12,
      blur: 16,
      gradientAngle: 150,
      accentGlow: true,
      fontWeight: {
        heading: 700,
        body: 400,
      },
      colors: {
        primary: '#635bff',
        secondary: '#80e9ff',
        accent: '#00d4aa',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.6)',
        borderSubtle: 'rgba(255,255,255,0.08)',
      },
    },
  },

  // GitHub — developer-focused, code-forward
  github: {
    style: {
      theme: 'dark',
      effects: ['code-window', 'subtle-grid'],
      mood: 'developer',
    },
    overrides: {
      bg: '#0d1117',
      bgCard: 'rgba(22, 27, 34, 0.9)',
      meshOpacity: 0.06,
      gridOpacity: 0.015,
      borderRadius: 10,
      blur: 12,
      gradientAngle: 135,
      accentGlow: false,
      fontWeight: {
        heading: 700,
        body: 400,
      },
      colors: {
        primary: '#58a6ff',
        secondary: '#3fb950',
        accent: '#d2a8ff',
        text: '#c9d1d9',
        textMuted: '#8b949e',
        borderSubtle: 'rgba(48,54,61,0.8)',
      },
    },
  },

  // SilkWeb default — the premium brand style
  silkweb: {
    style: {
      theme: 'dark',
      effects: ['glassmorphism', 'gradient-mesh', 'glow', 'grid-overlay'],
      mood: 'premium-tech',
    },
    overrides: {
      bg: '#06060b',
      bgCard: 'rgba(15, 15, 25, 0.6)',
      meshOpacity: 0.15,
      gridOpacity: 0.015,
      borderRadius: 16,
      blur: 20,
      gradientAngle: 135,
      accentGlow: true,
      fontWeight: {
        heading: 800,
        body: 400,
      },
    },
  },
};

function getPreset(name) {
  return presets[name] || presets.silkweb;
}

function applyPreset(presetName, brand, style) {
  const preset = getPreset(presetName);
  const merged = {
    style: { ...preset.style, ...(style || {}) },
    overrides: { ...preset.overrides },
  };
  if (preset.overrides.colors && brand) {
    merged.brandColors = { ...(brand.colors || {}), ...preset.overrides.colors };
  }
  return merged;
}

module.exports = { presets, getPreset, applyPreset };
