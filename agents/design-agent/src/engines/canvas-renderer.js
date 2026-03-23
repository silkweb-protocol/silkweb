// ─────────────────────────────────────────────
// Canvas Renderer Engine
// Uses sharp for pixel-level image manipulation
// Falls back to Python/Pillow for advanced ops
// ─────────────────────────────────────────────

const sharp = require('sharp');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { mergeBrand, hexToRgb, rgba } = require('../design-system');

// ─── Sharp-based rendering ──────────────────

// Create a solid color canvas
async function createCanvas(width, height, color = '#06060b') {
  const { r, g, b } = hexToRgb(color);
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  }).png().toBuffer();
}

// Composite multiple layers onto a base
async function compositeImages(baseBuffer, layers) {
  let image = sharp(baseBuffer);

  const compositeOps = layers.map(layer => ({
    input: layer.buffer,
    top: layer.top || 0,
    left: layer.left || 0,
    blend: layer.blend || 'over',
  }));

  return image.composite(compositeOps).png().toBuffer();
}

// Create a gradient image (horizontal or vertical)
async function createGradient(width, height, colorStart, colorEnd, direction = 'horizontal') {
  const svgGradient = direction === 'horizontal'
    ? `<svg width="${width}" height="${height}">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${colorStart}"/>
          <stop offset="100%" stop-color="${colorEnd}"/>
        </linearGradient></defs>
        <rect width="${width}" height="${height}" fill="url(#g)"/>
      </svg>`
    : `<svg width="${width}" height="${height}">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${colorStart}"/>
          <stop offset="100%" stop-color="${colorEnd}"/>
        </linearGradient></defs>
        <rect width="${width}" height="${height}" fill="url(#g)"/>
      </svg>`;

  return sharp(Buffer.from(svgGradient)).png().toBuffer();
}

// Apply rounded corners to an image
async function roundCorners(buffer, radius) {
  const metadata = await sharp(buffer).metadata();
  const w = metadata.width;
  const h = metadata.height;

  const roundedMask = Buffer.from(
    `<svg width="${w}" height="${h}">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  );

  return sharp(buffer)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

// Add a border/outline to an image
async function addBorder(buffer, borderWidth, borderColor) {
  const metadata = await sharp(buffer).metadata();
  const w = metadata.width + borderWidth * 2;
  const h = metadata.height + borderWidth * 2;
  const { r, g, b } = hexToRgb(borderColor);

  const border = await sharp({
    create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } },
  }).png().toBuffer();

  return sharp(border)
    .composite([{ input: buffer, top: borderWidth, left: borderWidth }])
    .png()
    .toBuffer();
}

// Resize with optional padding
async function resizeWithPadding(buffer, width, height, bgColor = '#06060b') {
  const { r, g, b } = hexToRgb(bgColor);
  return sharp(buffer)
    .resize(width, height, {
      fit: 'contain',
      background: { r, g, b, alpha: 1 },
    })
    .png()
    .toBuffer();
}

// Add text overlay via SVG (basic — for complex text use html-renderer)
async function addTextOverlay(buffer, text, opts = {}) {
  const metadata = await sharp(buffer).metadata();
  const x = opts.x || metadata.width / 2;
  const y = opts.y || metadata.height / 2;
  const fontSize = opts.fontSize || 32;
  const color = opts.color || '#ffffff';
  const fontWeight = opts.fontWeight || 700;
  const fontFamily = opts.fontFamily || 'Inter, sans-serif';
  const anchor = opts.textAnchor || 'middle';

  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svgText = Buffer.from(
    `<svg width="${metadata.width}" height="${metadata.height}">
      <text x="${x}" y="${y}" fill="${color}" font-size="${fontSize}"
        font-weight="${fontWeight}" font-family="${fontFamily}"
        text-anchor="${anchor}">${escaped}</text>
    </svg>`
  );

  return sharp(buffer)
    .composite([{ input: svgText, blend: 'over' }])
    .png()
    .toBuffer();
}

// ─── Python/Pillow subprocess ────────────────

// Execute a Python script for advanced image manipulation
async function runPillow(pythonCode, inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(os.tmpdir(), `silkweb-pillow-${uuidv4()}.py`);
    fs.writeFileSync(scriptPath, pythonCode);

    execFile('python3', [scriptPath, inputPath, outputPath], {
      timeout: 30000,
    }, (error, stdout, stderr) => {
      // Clean up temp script
      try { fs.unlinkSync(scriptPath); } catch (e) { /* ignore */ }

      if (error) {
        reject(new Error(`Pillow error: ${stderr || error.message}`));
      } else {
        resolve(outputPath);
      }
    });
  });
}

// Generate noise texture via Python/Pillow
async function generateNoiseTexture(width, height, opacity = 0.03) {
  const outputPath = path.join(os.tmpdir(), `noise-${uuidv4()}.png`);
  const code = `
import sys
from PIL import Image, ImageFilter
import numpy as np

w, h = ${width}, ${height}
noise = np.random.randint(0, 255, (h, w), dtype=np.uint8)
alpha = int(${opacity} * 255)
img = Image.fromarray(noise, 'L').convert('RGBA')
pixels = img.load()
for y in range(h):
    for x in range(w):
        v = pixels[x, y][0]
        pixels[x, y] = (v, v, v, alpha)
img.save(sys.argv[2])
`;

  try {
    await runPillow(code, '', outputPath);
    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);
    return buffer;
  } catch (err) {
    // Fallback: generate a simple SVG noise approximation
    console.warn('Python/Pillow not available, using SVG noise fallback');
    return createSVGNoise(width, height, opacity);
  }
}

// SVG noise fallback
async function createSVGNoise(width, height, opacity = 0.03) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" opacity="${opacity}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  createCanvas,
  compositeImages,
  createGradient,
  roundCorners,
  addBorder,
  resizeWithPadding,
  addTextOverlay,
  runPillow,
  generateNoiseTexture,
  createSVGNoise,
};
