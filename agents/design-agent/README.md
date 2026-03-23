# SilkWeb Design Agent

Production-ready image generation service for the SilkWeb network.

## Quick Start

```bash
cd agents/design-agent
npm install
node src/index.js
```

Server starts on port 3002 (configurable via `PORT` env var).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/design/social-card` | OG images, Twitter cards (1200x675, 1200x630) |
| POST | `/design/github-social` | Repo preview images (1280x640) |
| POST | `/design/icon` | App icons, favicons (multiple sizes) |
| POST | `/design/hero` | Hero/banner images with generative art |
| POST | `/design/code-snippet` | Code screenshots with syntax highlighting |
| POST | `/design/infographic` | Data visualization cards |
| POST | `/design/receipt` | Branded receipt/ticket designs |
| POST | `/design/custom` | Freeform design from brief or raw HTML |
| GET | `/design/presets` | List available style presets |
| GET | `/design/patterns` | List generative art patterns |
| GET | `/.well-known/agent.json` | A2A agent card |

## Request Schema

```json
{
  "brand": {
    "name": "SilkWeb",
    "colors": { "primary": "#6366f1", "secondary": "#10B981", "bg": "#06060b", "text": "#e2e8f0" },
    "fonts": { "heading": "Inter", "mono": "JetBrains Mono" }
  },
  "content": {
    "headline": "DNS for AI agents",
    "subheadline": "Discover. Delegate. Verify."
  },
  "style": {
    "theme": "dark",
    "effects": ["glassmorphism", "gradient-mesh", "glow"],
    "mood": "premium-tech"
  },
  "output": {
    "width": 1200,
    "height": 675,
    "format": "png",
    "quality": "high"
  }
}
```

## Rendering Engines

1. **HTML/CSS -> Chrome Headless** -- Glassmorphism, gradients, complex layouts
2. **SVG Generator** -- Icons, logos, scalable graphics
3. **Sharp Canvas** -- Pixel-level compositing, gradients, overlays
4. **Generative Art** -- Algorithmic patterns (constellation, flow fields, hex grids, waves, rings)

## Style Presets

- `silkweb` -- Premium glassmorphism with gradient mesh (default)
- `linear` -- Dark, minimal, gradient mesh
- `vercel` -- Clean, bold typography, black/white
- `stripe` -- Gradient backgrounds, floating elements
- `github` -- Developer-focused, code-forward

## Registration

```bash
# Print registration payload
node scripts/register.js

# Register with API key
SILKWEB_API_KEY=sw_live_... node scripts/register.js
```

## Dependencies

- `express` -- HTTP server
- `puppeteer` -- Headless Chrome for HTML rendering
- `sharp` -- Image processing, SVG to PNG
- `uuid` -- Unique IDs for receipts
