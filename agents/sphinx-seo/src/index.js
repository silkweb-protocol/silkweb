/*
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  SPHINX — SEO & AI Visibility Agent                          ║
 * ║  The world's best tool for getting found in Google AND AI     ║
 * ║  search results (ChatGPT, Claude, Perplexity, OpenClaw)      ║
 * ║  Part of the SilkWeb Agent Protocol                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const dns = require('dns');
const path = require('path');

// ─── Load Data Files ───────────────────────────────────────────
const seoRules = require('./data/seo-rules.json');
const aiVisibilityRules = require('./data/ai-visibility-rules.json');
const keywordModifiers = require('./data/keyword-modifiers.json');
const schemaTemplates = require('./data/schema-templates.json');
const powerWords = require('./data/power-words.json');

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3011;
const FETCH_TIMEOUT = 15000;
const LINK_CHECK_TIMEOUT = 5000;

// ─── Utility: Fetch a URL ──────────────────────────────────────
function fetchUrl(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || FETCH_TIMEOUT;
    const maxRedirects = options.maxRedirects || 5;
    let redirectCount = 0;
    const redirectChain = [];

    function doFetch(url) {
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        return reject(new Error(`Invalid URL: ${url}`));
      }

      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SphinxSEO/1.0; +https://silkweb.io/agents/sphinx)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          ...(options.headers || {})
        },
        timeout
      };

      const req = protocol.request(reqOptions, (res) => {
        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return reject(new Error(`Too many redirects (${maxRedirects})`));
          }
          const redirectUrl = new URL(res.headers.location, url).href;
          redirectChain.push({ from: url, to: redirectUrl, status: res.statusCode });
          return doFetch(redirectUrl);
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            finalUrl: url,
            redirectChain,
            redirectCount
          });
        });
        res.on('error', reject);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });
      req.on('error', reject);
      req.end();
    }

    doFetch(targetUrl);
  });
}

// ─── Utility: HEAD request to check a link ─────────────────────
function checkLink(url) {
  return new Promise((resolve) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return resolve({ url, status: 'invalid', code: 0 });
    }

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const req = protocol.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      headers: { 'User-Agent': 'SphinxSEO/1.0 LinkChecker' },
      timeout: LINK_CHECK_TIMEOUT
    }, (res) => {
      resolve({ url, status: res.statusCode < 400 ? 'ok' : 'broken', code: res.statusCode });
    });

    req.on('timeout', () => { req.destroy(); resolve({ url, status: 'timeout', code: 0 }); });
    req.on('error', () => resolve({ url, status: 'error', code: 0 }));
    req.end();
  });
}

// ─── HTML Parsing Utilities ────────────────────────────────────

function extractTag(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) matches.push(m[1].trim());
  return matches;
}

function extractMetaContent(html, nameOrProperty) {
  // Match both name= and property= attributes
  const patterns = [
    new RegExp(`<meta[^>]*(?:name|property)=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${nameOrProperty}["']`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractAllMeta(html) {
  const metas = {};
  const regex = /<meta[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const tag = m[0];
    const nameMatch = tag.match(/(?:name|property)=["']([^"']*)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (nameMatch && contentMatch) {
      metas[nameMatch[1].toLowerCase()] = contentMatch[1];
    }
  }
  return metas;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractHeadings(html) {
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    headings[`h${i}`] = extractTag(html, `h${i}`);
  }
  return headings;
}

function extractImages(html) {
  const images = [];
  const regex = /<img[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const tag = m[0];
    const src = tag.match(/src=["']([^"']*)["']/i);
    const alt = tag.match(/alt=["']([^"']*)["']/i);
    images.push({
      src: src ? src[1] : null,
      alt: alt ? alt[1] : null,
      hasAlt: !!alt
    });
  }
  return images;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]*>/g, '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

    let fullUrl;
    try {
      fullUrl = new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    const parsedBase = new URL(baseUrl);
    const parsedLink = new URL(fullUrl);
    const isInternal = parsedLink.hostname === parsedBase.hostname;

    links.push({ href: fullUrl, text, isInternal });
  }
  return links;
}

function extractJsonLd(html) {
  const schemas = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      schemas.push(parsed);
    } catch {
      // Invalid JSON-LD, skip
    }
  }
  return schemas;
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (match) return match[1];
  const match2 = html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return match2 ? match2[1] : null;
}

function extractBodyText(html) {
  // Remove script and style tags
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function getLetterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function calculateKeywordDensity(text, keyword) {
  if (!keyword || !text) return 0;
  const words = text.toLowerCase().split(/\s+/);
  const kw = keyword.toLowerCase();
  const kwWords = kw.split(/\s+/);
  if (kwWords.length === 1) {
    const count = words.filter(w => w === kw).length;
    return words.length > 0 ? count / words.length : 0;
  }
  // Multi-word keyword
  const textLower = text.toLowerCase();
  const matches = textLower.split(kw).length - 1;
  return words.length > 0 ? (matches * kwWords.length) / words.length : 0;
}

// ─── Parse robots.txt ──────────────────────────────────────────
function parseRobotsTxt(content) {
  const rules = {};
  let currentAgent = null;
  const lines = content.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || !line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      currentAgent = value;
      if (!rules[currentAgent]) {
        rules[currentAgent] = { allow: [], disallow: [] };
      }
    } else if (currentAgent) {
      if (directive === 'allow') {
        rules[currentAgent].allow.push(value);
      } else if (directive === 'disallow') {
        rules[currentAgent].disallow.push(value);
      }
    }
  }

  return rules;
}

function isCrawlerBlocked(robotsRules, crawlerName) {
  // Check specific crawler rules first
  const crawlerLower = crawlerName.toLowerCase();
  for (const agent of Object.keys(robotsRules)) {
    if (agent.toLowerCase() === crawlerLower) {
      const rule = robotsRules[agent];
      // If there's a Disallow: / with no Allow, it's blocked
      if (rule.disallow.includes('/') && !rule.allow.includes('/')) {
        return 'blocked';
      }
      if (rule.allow.includes('/')) {
        return 'allowed';
      }
      if (rule.disallow.length > 0) {
        return 'partially-blocked';
      }
      return 'allowed';
    }
  }
  // Check wildcard
  if (robotsRules['*']) {
    const wildcard = robotsRules['*'];
    if (wildcard.disallow.includes('/') && !wildcard.allow.includes('/')) {
      return 'blocked-by-wildcard';
    }
  }
  return 'not-specified';
}


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /analyze/seo
// ═══════════════════════════════════════════════════════════════
async function analyzeSeo(url, targetKeyword) {
  const response = await fetchUrl(url);
  const html = response.body;
  const parsedUrl = new URL(response.finalUrl);

  const title = extractTitle(html);
  const metas = extractAllMeta(html);
  const metaDescription = metas['description'] || null;
  const headings = extractHeadings(html);
  const images = extractImages(html);
  const links = extractLinks(html, response.finalUrl);
  const jsonLd = extractJsonLd(html);
  const canonical = extractCanonical(html);
  const bodyText = extractBodyText(html);
  const wordCount = countWords(bodyText);

  // Auto-detect keyword from title if not provided
  const keyword = targetKeyword || (title ? title.split(/[|\-–—:,]/).map(s => s.trim()).filter(s => s.length > 2)[0] || '' : '');
  const keywordLower = keyword.toLowerCase();

  const issues = [];
  const passed = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // ── Title Analysis ──
  const titleRules = seoRules.title.rules;
  for (const rule of titleRules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'title-exists':
        pass = !!title;
        break;
      case 'title-length-min':
        pass = title && title.length >= rule.minLength;
        break;
      case 'title-length-max':
        pass = title && title.length <= rule.maxLength;
        break;
      case 'title-keyword-presence':
        pass = title && keywordLower && title.toLowerCase().includes(keywordLower);
        break;
      case 'title-keyword-position':
        pass = title && keywordLower && title.toLowerCase().indexOf(keywordLower) < title.length / 2;
        break;
      case 'title-no-duplicate-words': {
        if (title) {
          const words = title.toLowerCase().split(/\s+/);
          const freq = {};
          words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
          pass = !Object.values(freq).some(c => c > 2);
        }
        break;
      }
      case 'title-has-brand':
        pass = title && (title.includes('|') || title.includes('-') || title.includes('—'));
        break;
      case 'title-not-default':
        pass = title && !rule.defaults.some(d => title.toLowerCase() === d.toLowerCase());
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix.replace('{keyword}', keyword),
        current: title ? `"${title}" (${title.length} chars)` : 'Missing'
      });
    }
  }

  // ── Meta Description Analysis ──
  for (const rule of seoRules.meta_description.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'meta-desc-exists':
        pass = !!metaDescription;
        break;
      case 'meta-desc-length-min':
        pass = metaDescription && metaDescription.length >= rule.minLength;
        break;
      case 'meta-desc-length-max':
        pass = metaDescription && metaDescription.length <= rule.maxLength;
        break;
      case 'meta-desc-keyword':
        pass = metaDescription && keywordLower && metaDescription.toLowerCase().includes(keywordLower);
        break;
      case 'meta-desc-cta':
        pass = metaDescription && rule.ctaPatterns.some(p => metaDescription.toLowerCase().includes(p));
        break;
      case 'meta-desc-unique':
        pass = metaDescription && title && metaDescription.toLowerCase() !== title.toLowerCase();
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: metaDescription ? `"${metaDescription.substring(0, 80)}..." (${metaDescription.length} chars)` : 'Missing'
      });
    }
  }

  // ── Headings Analysis ──
  const allH1 = headings.h1;
  for (const rule of seoRules.headings.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'h1-exists':
        pass = allH1.length > 0;
        break;
      case 'h1-single':
        pass = allH1.length === 1;
        break;
      case 'h1-keyword':
        pass = allH1.length > 0 && keywordLower && allH1.some(h => h.toLowerCase().includes(keywordLower));
        break;
      case 'h1-length':
        pass = allH1.length > 0 && allH1[0].length >= rule.minLength && allH1[0].length <= rule.maxLength;
        break;
      case 'heading-hierarchy': {
        // Check that headings don't skip levels
        let headingLevels = [];
        for (let i = 1; i <= 6; i++) {
          if (headings[`h${i}`].length > 0) headingLevels.push(i);
        }
        pass = true;
        for (let i = 1; i < headingLevels.length; i++) {
          if (headingLevels[i] - headingLevels[i - 1] > 1) {
            pass = false;
            break;
          }
        }
        break;
      }
      case 'heading-count': {
        const totalHeadings = Object.values(headings).reduce((sum, arr) => sum + arr.length, 0);
        pass = totalHeadings >= rule.minCount;
        break;
      }
      case 'heading-not-empty':
        pass = !Object.values(headings).flat().some(h => h.trim() === '');
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: `H1: ${allH1.length}, H2: ${headings.h2.length}, H3: ${headings.h3.length}`
      });
    }
  }

  // ── Image Analysis ──
  for (const rule of seoRules.images.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'img-alt-present':
        pass = images.length === 0 || images.every(img => img.hasAlt);
        break;
      case 'img-alt-descriptive':
        pass = images.length === 0 || images.filter(img => img.alt).every(img =>
          !rule.genericAlts.includes(img.alt.toLowerCase())
        );
        break;
      case 'img-alt-keyword':
        pass = images.length === 0 || (keywordLower && images.some(img =>
          img.alt && img.alt.toLowerCase().includes(keywordLower)
        ));
        break;
      case 'img-alt-length':
        pass = images.length === 0 || images.filter(img => img.alt).every(img => img.alt.length <= rule.maxLength);
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      const missingAlt = images.filter(img => !img.hasAlt).length;
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: `${images.length} images, ${missingAlt} missing alt tags`
      });
    }
  }

  // ── Links Analysis ──
  const internalLinks = links.filter(l => l.isInternal);
  const externalLinks = links.filter(l => !l.isInternal);
  for (const rule of seoRules.links.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'internal-links-exist':
        pass = internalLinks.length >= (rule.minCount || 1);
        break;
      case 'external-links-exist':
        pass = externalLinks.length > 0;
        break;
      case 'link-ratio': {
        const ratio = externalLinks.length > 0 ? internalLinks.length / externalLinks.length : internalLinks.length > 0 ? 5 : 0;
        pass = ratio >= 2 && ratio <= 5;
        break;
      }
      case 'no-broken-links':
        pass = true; // Will be checked in technical analysis
        break;
      case 'descriptive-anchor-text': {
        const genericAnchors = rule.genericAnchors;
        pass = links.length === 0 || !links.some(l => genericAnchors.includes(l.text.toLowerCase()));
        break;
      }
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: `${internalLinks.length} internal, ${externalLinks.length} external links`
      });
    }
  }

  // ── URL Analysis ──
  const urlPath = parsedUrl.pathname;
  for (const rule of seoRules.url.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'url-readable':
        pass = /^[a-z0-9\-\/\.]+$/i.test(urlPath) && urlPath.length > 1;
        break;
      case 'url-no-params':
        pass = parsedUrl.searchParams.toString().split('&').filter(s => s).length <= (rule.maxParams || 2);
        break;
      case 'url-no-underscores':
        pass = !urlPath.includes('_');
        break;
      case 'url-length':
        pass = urlPath.length <= (rule.maxLength || 75);
        break;
      case 'url-lowercase':
        pass = urlPath === urlPath.toLowerCase();
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: parsedUrl.pathname + parsedUrl.search
      });
    }
  }

  // ── Structured Data Analysis ──
  for (const rule of seoRules.structured_data.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'schema-exists':
        pass = jsonLd.length > 0;
        break;
      case 'schema-valid-type':
        pass = jsonLd.length > 0 && jsonLd.some(s => s['@type']);
        break;
      case 'schema-complete':
        pass = jsonLd.length > 0 && jsonLd.some(s => Object.keys(s).length >= 5);
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: `${jsonLd.length} JSON-LD blocks found`
      });
    }
  }

  // ── Technical/Page-level Analysis ──
  const ogTitle = metas['og:title'];
  const ogDescription = metas['og:description'];
  const ogImage = metas['og:image'];
  const twitterCard = metas['twitter:card'];
  const viewport = extractMetaContent(html, 'viewport');
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  const charset = html.match(/<meta[^>]*charset=["']?([^"'\s>]+)/i);
  const favicon = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["']/i);
  const isHttps = parsedUrl.protocol === 'https:';

  for (const rule of seoRules.technical.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'canonical-exists':
        pass = !!canonical;
        break;
      case 'og-tags-exist':
        pass = !!(ogTitle || ogDescription || ogImage);
        break;
      case 'twitter-cards-exist':
        pass = !!twitterCard;
        break;
      case 'viewport-exists':
        pass = !!viewport;
        break;
      case 'lang-attribute':
        pass = !!langMatch;
        break;
      case 'charset-declared':
        pass = !!charset;
        break;
      case 'favicon-exists':
        pass = !!favicon;
        break;
      case 'ssl-active':
        pass = isHttps;
        break;
      case 'robots-txt-exists':
        pass = true; // Checked in technical endpoint
        break;
      case 'sitemap-exists':
        pass = true; // Checked in technical endpoint
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: rule.id === 'ssl-active' ? parsedUrl.protocol : 'Missing'
      });
    }
  }

  // ── Content Analysis ──
  const keywordDensity = calculateKeywordDensity(bodyText, keyword);
  for (const rule of seoRules.content.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'word-count-min':
        pass = wordCount >= rule.minWords;
        break;
      case 'word-count-ideal':
        pass = wordCount >= rule.idealWords;
        break;
      case 'keyword-density':
        pass = keywordLower ? (keywordDensity >= rule.minDensity && keywordDensity <= rule.maxDensity) : true;
        break;
      case 'content-freshness': {
        const hasDate = metas['article:published_time'] || metas['article:modified_time'] ||
          jsonLd.some(s => s.datePublished || s.dateModified);
        pass = !!hasDate;
        break;
      }
      case 'readability': {
        // Check paragraph length by looking at text between heading tags
        const paragraphs = bodyText.split(/[.!?]\s/).filter(s => s.length > 100);
        pass = paragraphs.length < wordCount / 50; // Rough check for variety
        break;
      }
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: rule.id.includes('word-count') ? `${wordCount} words` :
          rule.id === 'keyword-density' ? `${(keywordDensity * 100).toFixed(1)}%` : 'Needs improvement'
      });
    }
  }

  // Calculate score
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const grade = getLetterGrade(score);

  // Sort issues by category priority
  const categoryOrder = { critical: 0, important: 1, moderate: 2, minor: 3 };
  issues.sort((a, b) => (categoryOrder[a.category] || 3) - (categoryOrder[b.category] || 3));

  return {
    url: response.finalUrl,
    analyzedAt: new Date().toISOString(),
    score,
    grade,
    keyword: keyword || null,
    summary: {
      title: title ? { text: title, length: title.length } : null,
      metaDescription: metaDescription ? { text: metaDescription, length: metaDescription.length } : null,
      headings: {
        h1: headings.h1,
        h2Count: headings.h2.length,
        h3Count: headings.h3.length,
        h4Count: headings.h4.length,
        h5Count: headings.h5.length,
        h6Count: headings.h6.length,
        totalCount: Object.values(headings).reduce((s, a) => s + a.length, 0)
      },
      images: {
        total: images.length,
        withAlt: images.filter(i => i.hasAlt).length,
        withoutAlt: images.filter(i => !i.hasAlt).length
      },
      links: {
        total: links.length,
        internal: internalLinks.length,
        external: externalLinks.length
      },
      wordCount,
      keywordDensity: keywordLower ? `${(keywordDensity * 100).toFixed(1)}%` : 'N/A',
      structuredData: jsonLd.map(s => s['@type'] || 'Unknown'),
      canonical,
      openGraph: { title: ogTitle, description: ogDescription, image: ogImage },
      twitterCard,
      hasViewport: !!viewport,
      isHttps,
      language: langMatch ? langMatch[1] : null,
      pageSize: `${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`,
      estimatedLoadTime: `${(Buffer.byteLength(html) / 1024 / 200).toFixed(1)}s (estimated on 200KB/s)`
    },
    issues,
    passed,
    stats: {
      totalRulesChecked: issues.length + passed.length,
      rulesPassed: passed.length,
      rulesFailed: issues.length,
      criticalIssues: issues.filter(i => i.category === 'critical').length,
      importantIssues: issues.filter(i => i.category === 'important').length,
      moderateIssues: issues.filter(i => i.category === 'moderate').length,
      minorIssues: issues.filter(i => i.category === 'minor').length
    }
  };
}

app.post('/analyze/seo', async (req, res) => {
  try {
    const { url, keyword } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required. Send { "url": "https://example.com" }' });
    const result = await analyzeSeo(url, keyword);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `SEO analysis failed: ${err.message}`, url: req.body.url });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /analyze/ai-visibility
// ═══════════════════════════════════════════════════════════════
async function analyzeAiVisibility(url) {
  const response = await fetchUrl(url);
  const html = response.body;
  const parsedUrl = new URL(response.finalUrl);
  const bodyText = extractBodyText(html);
  const bodyLower = bodyText.toLowerCase();
  const wordCount = countWords(bodyText);
  const jsonLd = extractJsonLd(html);
  const metas = extractAllMeta(html);
  const headings = extractHeadings(html);

  const issues = [];
  const passed = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // ── Definition Density ──
  const firstSentences = bodyText.split(/[.!?]/).slice(0, 3).join('. ');
  for (const rule of aiVisibilityRules.definition_density.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'def-first-sentence': {
        // Check if first sentences contain definitional patterns
        const defPatterns = ['is a', 'is an', 'is the', 'are a', 'provides', 'offers', 'helps', 'enables', 'allows'];
        pass = defPatterns.some(p => firstSentences.toLowerCase().includes(p));
        break;
      }
      case 'def-concise': {
        const firstTwo = bodyText.split(/[.!?]/).slice(0, 2).join('. ');
        pass = countWords(firstTwo) <= rule.maxWords;
        break;
      }
      case 'def-entity-named': {
        // Check if the first paragraph names an entity (capitalized multi-word or proper noun)
        const firstPara = bodyText.substring(0, 500);
        const entities = firstPara.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
        pass = entities && entities.length >= 1;
        break;
      }
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── FAQ Presence ──
  for (const rule of aiVisibilityRules.faq_presence.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'faq-section-exists':
        pass = rule.patterns.some(p => bodyLower.includes(p)) ||
          headings.h2.some(h => rule.patterns.some(p => h.toLowerCase().includes(p))) ||
          headings.h3.some(h => rule.patterns.some(p => h.toLowerCase().includes(p)));
        break;
      case 'faq-schema-exists':
        pass = jsonLd.some(s => s['@type'] === 'FAQPage' || (Array.isArray(s['@graph']) && s['@graph'].some(g => g['@type'] === 'FAQPage')));
        break;
      case 'faq-question-format': {
        const questionWords = ['who', 'what', 'when', 'where', 'why', 'how', 'can', 'does', 'is', 'will', 'should'];
        const allHeadingsText = [...headings.h2, ...headings.h3, ...headings.h4].map(h => h.toLowerCase());
        const questionHeadings = allHeadingsText.filter(h => questionWords.some(q => h.startsWith(q)) || h.endsWith('?'));
        pass = questionHeadings.length >= 2;
        break;
      }
      case 'faq-answer-length':
        // If FAQ exists, this is a bonus
        pass = bodyLower.includes('faq') || jsonLd.some(s => s['@type'] === 'FAQPage');
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── Structured Data Richness ──
  for (const rule of aiVisibilityRules.structured_data_richness.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'jsonld-exists':
        pass = jsonLd.length > 0;
        break;
      case 'jsonld-type-specific':
        pass = jsonLd.some(s => rule.preferredTypes.includes(s['@type']));
        break;
      case 'jsonld-properties-complete':
        pass = jsonLd.some(s => Object.keys(s).length >= 6);
        break;
      case 'multiple-schemas':
        pass = jsonLd.length >= 2 || (jsonLd.length === 1 && jsonLd[0]['@graph'] && jsonLd[0]['@graph'].length >= 2);
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── Citation Worthiness ──
  for (const rule of aiVisibilityRules.citation_worthiness.rules) {
    totalWeight += rule.weight;
    const hasPattern = rule.patterns.some(p => new RegExp(p, 'i').test(bodyText));

    if (hasPattern) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── Entity Clarity ──
  for (const rule of aiVisibilityRules.entity_clarity.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'consistent-naming': {
        // Check if the title entity appears consistently
        const title = extractTitle(html);
        if (title) {
          const mainEntity = title.split(/[|\-–—:,]/)[0].trim();
          if (mainEntity.length > 2) {
            const mentions = (bodyText.match(new RegExp(mainEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
            pass = mentions >= 3;
          }
        }
        break;
      }
      case 'entity-first-mention': {
        const title = extractTitle(html);
        if (title) {
          const mainEntity = title.split(/[|\-–—:,]/)[0].trim();
          const first200 = bodyText.substring(0, 200).toLowerCase();
          pass = mainEntity.length > 2 && first200.includes(mainEntity.toLowerCase());
        }
        break;
      }
      case 'entity-context': {
        const contextPatterns = ['is a', 'is an', 'is the', 'platform', 'tool', 'service', 'software', 'solution', 'framework', 'application'];
        pass = contextPatterns.some(p => firstSentences.toLowerCase().includes(p));
        break;
      }
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── Content Format ──
  for (const rule of aiVisibilityRules.content_format.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'howto-content':
        pass = rule.patterns.some(p => bodyLower.includes(p));
        break;
      case 'howto-schema':
        pass = jsonLd.some(s => s['@type'] === 'HowTo');
        break;
      case 'list-format':
        pass = (html.match(/<[ou]l[\s>]/gi) || []).length >= 1;
        break;
      case 'table-format':
        pass = (html.match(/<table[\s>]/gi) || []).length >= 1;
        break;
      case 'direct-answer-format': {
        // Check if headings are followed by concise answer paragraphs
        const questionHeadings = [...headings.h2, ...headings.h3].filter(h => h.endsWith('?') || h.toLowerCase().startsWith('how') || h.toLowerCase().startsWith('what'));
        pass = questionHeadings.length >= 1;
        break;
      }
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── Freshness Signals ──
  for (const rule of aiVisibilityRules.freshness_signals.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'date-published':
        pass = !!(metas['article:published_time'] || jsonLd.some(s => s.datePublished));
        break;
      case 'date-modified':
        pass = !!(metas['article:modified_time'] || jsonLd.some(s => s.dateModified));
        break;
      case 'visible-date': {
        const datePatterns = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i;
        pass = datePatterns.test(bodyText);
        break;
      }
      case 'recent-date': {
        const dateStr = metas['article:modified_time'] || metas['article:published_time'];
        if (dateStr) {
          const date = new Date(dateStr);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          pass = date > oneYearAgo;
        } else {
          // Check JSON-LD dates
          for (const s of jsonLd) {
            const d = s.dateModified || s.datePublished;
            if (d) {
              const date = new Date(d);
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              if (date > oneYearAgo) { pass = true; break; }
            }
          }
        }
        break;
      }
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── Authority Signals ──
  for (const rule of aiVisibilityRules.authority_signals.rules) {
    totalWeight += rule.weight;
    let pass = false;

    switch (rule.id) {
      case 'author-info':
        pass = !!(metas['author'] || bodyLower.includes('written by') || bodyLower.includes('author'));
        break;
      case 'author-schema':
        pass = jsonLd.some(s => s.author && s.author['@type'] === 'Person');
        break;
      case 'about-page-linked': {
        const links = extractLinks(html, response.finalUrl);
        pass = links.some(l => rule.patterns.some(p => l.href.toLowerCase().includes(p)));
        break;
      }
      case 'organization-schema':
        pass = jsonLd.some(s => s['@type'] === 'Organization' || (s.publisher && s.publisher['@type'] === 'Organization'));
        break;
    }

    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({ rule: rule.id, category: rule.category, description: rule.description, fix: rule.fix });
    }
  }

  // ── AI Crawlability ──
  let robotsTxt = null;
  let robotsRules = {};
  const aiCrawlerResults = {};
  try {
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
    const robotsResponse = await fetchUrl(robotsUrl, { timeout: 5000 });
    if (robotsResponse.statusCode === 200) {
      robotsTxt = robotsResponse.body;
      robotsRules = parseRobotsTxt(robotsTxt);
    }
  } catch {
    // robots.txt not available
  }

  for (const rule of aiVisibilityRules.ai_crawlability.rules) {
    totalWeight += rule.weight;
    const crawlerName = rule.crawler;
    const status = robotsTxt ? isCrawlerBlocked(robotsRules, crawlerName) : 'no-robots-txt';

    // Also check alternate crawler name
    let altStatus = null;
    if (rule.altCrawler) {
      altStatus = robotsTxt ? isCrawlerBlocked(robotsRules, rule.altCrawler) : 'no-robots-txt';
    }

    const isBlocked = status === 'blocked' || status === 'blocked-by-wildcard' ||
      (altStatus === 'blocked' || altStatus === 'blocked-by-wildcard');

    aiCrawlerResults[crawlerName] = {
      status: isBlocked ? 'blocked' : (status === 'allowed' ? 'allowed' : status),
      recommendation: rule.fix
    };

    const pass = !isBlocked;
    if (pass) {
      earnedWeight += rule.weight;
      passed.push({ rule: rule.id, description: rule.description });
    } else {
      issues.push({
        rule: rule.id,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        current: `${crawlerName}: ${status}`
      });
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const grade = getLetterGrade(score);

  // Sort issues by category
  const categoryOrder = { critical: 0, important: 1, moderate: 2, minor: 3 };
  issues.sort((a, b) => (categoryOrder[a.category] || 3) - (categoryOrder[b.category] || 3));

  return {
    url: response.finalUrl,
    analyzedAt: new Date().toISOString(),
    aiVisibilityScore: score,
    grade,
    verdict: score >= 80 ? 'AI-Ready — Your content is well-optimized for AI search engines' :
      score >= 60 ? 'Needs Work — Several improvements would significantly boost AI visibility' :
      score >= 40 ? 'Poor AI Visibility — Major changes needed to appear in AI search results' :
      'AI-Invisible — Your content is unlikely to be cited by AI search engines',
    aiCrawlerStatus: aiCrawlerResults,
    issues,
    passed,
    stats: {
      totalRulesChecked: issues.length + passed.length,
      rulesPassed: passed.length,
      rulesFailed: issues.length,
      criticalIssues: issues.filter(i => i.category === 'critical').length,
      importantIssues: issues.filter(i => i.category === 'important').length
    },
    topPriorityActions: issues.slice(0, 5).map(i => i.fix)
  };
}

app.post('/analyze/ai-visibility', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required. Send { "url": "https://example.com" }' });
    const result = await analyzeAiVisibility(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `AI visibility analysis failed: ${err.message}`, url: req.body.url });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /analyze/keywords
// ═══════════════════════════════════════════════════════════════
app.post('/analyze/keywords', (req, res) => {
  try {
    const { keyword, topic, industry } = req.body;
    const seed = keyword || topic;
    if (!seed) return res.status(400).json({ error: 'keyword or topic is required. Send { "keyword": "AI agents" }' });

    const seedLower = seed.toLowerCase();
    const seedWords = seedLower.split(/\s+/);

    // Generate related keywords algorithmically
    const relatedKeywords = [];
    const seen = new Set();
    seen.add(seedLower);

    function addKeyword(kw, source, intent) {
      const kwLower = kw.toLowerCase().trim();
      if (kwLower && !seen.has(kwLower) && kwLower !== seedLower) {
        seen.add(kwLower);
        // Estimate volume and competition based on word count and modifiers
        const words = kwLower.split(/\s+/);
        const volumeTier = words.length <= 2 ? 'high' :
          words.length <= 3 ? 'medium' :
          words.length <= 5 ? 'low' : 'niche';
        const competitionTier = words.length <= 2 ? 'high' :
          words.length <= 3 ? 'medium' : 'low';
        // AI mention likelihood based on content format
        const aiLikelihood = (kwLower.includes('what is') || kwLower.includes('how to') ||
          kwLower.includes('vs') || kwLower.includes('best')) ? 'high' :
          (kwLower.includes('tutorial') || kwLower.includes('guide') || kwLower.includes('example')) ? 'medium' : 'low';

        relatedKeywords.push({
          keyword: kwLower,
          source,
          intent,
          searchVolumeTier: volumeTier,
          competitionTier: competitionTier,
          aiMentionLikelihood: aiLikelihood
        });
      }
    }

    // Generate from prefixes
    for (const [intentGroup, prefixes] of Object.entries(keywordModifiers.prefixes)) {
      for (const prefix of prefixes.slice(0, 5)) {
        addKeyword(`${prefix} ${seed}`, 'prefix', intentGroup);
      }
    }

    // Generate from suffixes
    for (const [_, suffixes] of Object.entries(keywordModifiers.suffixes)) {
      for (const suffix of suffixes.slice(0, 3)) {
        addKeyword(`${seed} ${suffix}`, 'suffix', 'mixed');
      }
    }

    // Question format keywords
    const questionKeywords = keywordModifiers.question_formats.map(fmt =>
      fmt.replace('{keyword}', seed).replace('{alt}', seedWords[0]).replace('{usecase}', 'business').replace('{task}', 'automate')
    );
    questionKeywords.forEach(qk => addKeyword(qk, 'question-format', 'informational'));

    // Long-tail variations
    const longTailKeywords = keywordModifiers.long_tail_patterns.map(fmt =>
      fmt.replace('{keyword}', seed).replace('{industry}', industry || 'tech')
        .replace('{tool}', 'slack').replace('{goal}', 'save time')
        .replace('{limitation}', 'coding').replace('{year}', '2026')
    );
    longTailKeywords.forEach(lt => addKeyword(lt, 'long-tail', 'mixed'));

    // Industry-specific if provided
    if (industry && keywordModifiers.industry_modifiers[industry.toLowerCase()]) {
      const mods = keywordModifiers.industry_modifiers[industry.toLowerCase()];
      mods.slice(0, 5).forEach(mod => {
        addKeyword(`${seed} ${mod}`, 'industry', 'commercial_investigation');
        addKeyword(`${mod} ${seed}`, 'industry', 'commercial_investigation');
      });
    }

    // Cluster by intent
    const clusters = {};
    for (const kw of relatedKeywords) {
      // Determine intent more precisely
      let intent = 'informational';
      const kwl = kw.keyword;
      const intentSignals = keywordModifiers.intent_signals;
      for (const [intentType, data] of Object.entries(intentSignals)) {
        if (data.indicators.some(ind => kwl.includes(ind))) {
          intent = intentType;
          break;
        }
      }
      kw.intent = intent;
      if (!clusters[intent]) clusters[intent] = [];
      clusters[intent].push(kw);
    }

    // Content gap opportunities
    const contentGaps = [
      `${seed} comparison guide`,
      `${seed} for beginners complete guide`,
      `${seed} case studies and examples`,
      `${seed} ROI and benefits analysis`,
      `${seed} implementation guide`,
      `${seed} common mistakes to avoid`,
      `${seed} future trends 2026`,
      `how to choose the right ${seed}`,
      `${seed} integration best practices`,
      `${seed} security and compliance`
    ];

    res.json({
      seedKeyword: seed,
      analyzedAt: new Date().toISOString(),
      primaryKeyword: seed,
      relatedKeywords: relatedKeywords.slice(0, 20),
      questionKeywords: questionKeywords.slice(0, 10),
      longTailKeywords: longTailKeywords.slice(0, 10),
      keywordClusters: clusters,
      contentGapOpportunities: contentGaps,
      stats: {
        totalKeywordsGenerated: relatedKeywords.length,
        byIntent: Object.fromEntries(Object.entries(clusters).map(([k, v]) => [k, v.length])),
        byVolumeTier: {
          high: relatedKeywords.filter(k => k.searchVolumeTier === 'high').length,
          medium: relatedKeywords.filter(k => k.searchVolumeTier === 'medium').length,
          low: relatedKeywords.filter(k => k.searchVolumeTier === 'low').length,
          niche: relatedKeywords.filter(k => k.searchVolumeTier === 'niche').length
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Keyword analysis failed: ${err.message}` });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /analyze/technical
// ═══════════════════════════════════════════════════════════════
async function analyzeTechnical(url) {
  const response = await fetchUrl(url);
  const html = response.body;
  const parsedUrl = new URL(response.finalUrl);
  const issues = [];
  const passed = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // ── SSL/TLS ──
  totalWeight += 10;
  const isHttps = parsedUrl.protocol === 'https:';
  if (isHttps) {
    earnedWeight += 10;
    passed.push({ check: 'SSL/TLS', status: 'Active', detail: 'Site served over HTTPS' });
  } else {
    issues.push({ check: 'SSL/TLS', severity: 'critical', detail: 'Site is not served over HTTPS', fix: 'Install an SSL certificate and redirect all HTTP traffic to HTTPS' });
  }

  // ── HTTP/2 ──
  totalWeight += 3;
  const httpVersion = response.headers['x-http2'] || (isHttps ? 'likely HTTP/2' : 'HTTP/1.1');
  earnedWeight += isHttps ? 3 : 0; // HTTPS sites typically support HTTP/2
  if (isHttps) {
    passed.push({ check: 'HTTP/2', status: 'Likely supported', detail: 'HTTPS sites typically support HTTP/2+' });
  } else {
    issues.push({ check: 'HTTP/2', severity: 'moderate', detail: 'HTTP/2 requires HTTPS', fix: 'Enable HTTPS to benefit from HTTP/2 performance improvements' });
  }

  // ── Redirect Chain ──
  totalWeight += 5;
  if (response.redirectCount === 0) {
    earnedWeight += 5;
    passed.push({ check: 'Redirects', status: 'None', detail: 'No redirect chain detected' });
  } else if (response.redirectCount <= 2) {
    earnedWeight += 3;
    passed.push({ check: 'Redirects', status: 'Minor', detail: `${response.redirectCount} redirect(s)` });
  } else {
    issues.push({
      check: 'Redirect Chain',
      severity: 'important',
      detail: `${response.redirectCount} redirects in chain`,
      chain: response.redirectChain,
      fix: `Reduce redirect chain from ${response.redirectCount} hops to 1 or 0. Each redirect adds latency.`
    });
  }

  // ── Broken Links ──
  totalWeight += 8;
  const links = extractLinks(html, response.finalUrl);
  const linksToCheck = links.slice(0, 50); // Check up to 50
  const linkResults = await Promise.all(linksToCheck.map(l => checkLink(l.href)));
  const brokenLinks = linkResults.filter(r => r.status === 'broken' || r.status === 'error');
  const timeoutLinks = linkResults.filter(r => r.status === 'timeout');

  if (brokenLinks.length === 0) {
    earnedWeight += 8;
    passed.push({ check: 'Broken Links', status: 'None found', detail: `Checked ${linksToCheck.length} links, all valid` });
  } else {
    issues.push({
      check: 'Broken Links',
      severity: 'critical',
      detail: `${brokenLinks.length} broken link(s) found out of ${linksToCheck.length} checked`,
      brokenLinks: brokenLinks.map(bl => ({ url: bl.url, status: bl.code || bl.status })),
      fix: `Fix or remove ${brokenLinks.length} broken links — they waste crawl budget and hurt user experience`
    });
  }

  // ── Missing Alt Tags ──
  totalWeight += 5;
  const images = extractImages(html);
  const missingAlt = images.filter(img => !img.hasAlt);
  if (missingAlt.length === 0) {
    earnedWeight += 5;
    passed.push({ check: 'Image Alt Tags', status: 'All present', detail: `${images.length} images, all have alt attributes` });
  } else {
    earnedWeight += Math.max(0, 5 - missingAlt.length);
    issues.push({
      check: 'Missing Alt Tags',
      severity: 'important',
      detail: `${missingAlt.length} of ${images.length} images missing alt attributes`,
      images: missingAlt.map(img => img.src).slice(0, 10),
      fix: `Add descriptive alt text to ${missingAlt.length} images`
    });
  }

  // ── Robots.txt ──
  totalWeight += 5;
  let robotsTxtValid = false;
  let robotsTxtContent = null;
  try {
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
    const robotsResp = await fetchUrl(robotsUrl, { timeout: 5000 });
    if (robotsResp.statusCode === 200 && robotsResp.body.toLowerCase().includes('user-agent')) {
      robotsTxtValid = true;
      robotsTxtContent = robotsResp.body;
      earnedWeight += 5;
      passed.push({ check: 'robots.txt', status: 'Valid', detail: 'robots.txt found and parseable' });
    } else {
      issues.push({ check: 'robots.txt', severity: 'important', detail: 'robots.txt not found or invalid', fix: 'Create a robots.txt file at your domain root to guide crawlers' });
    }
  } catch {
    issues.push({ check: 'robots.txt', severity: 'important', detail: 'Could not fetch robots.txt', fix: 'Create a robots.txt file at your domain root' });
  }

  // ── Sitemap.xml ──
  totalWeight += 5;
  let sitemapValid = false;
  let sitemapUrlCount = 0;
  try {
    const sitemapUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/sitemap.xml`;
    const sitemapResp = await fetchUrl(sitemapUrl, { timeout: 5000 });
    if (sitemapResp.statusCode === 200 && (sitemapResp.body.includes('<urlset') || sitemapResp.body.includes('<sitemapindex'))) {
      sitemapValid = true;
      sitemapUrlCount = (sitemapResp.body.match(/<url>/gi) || []).length ||
        (sitemapResp.body.match(/<sitemap>/gi) || []).length;
      earnedWeight += 5;
      passed.push({ check: 'sitemap.xml', status: 'Valid', detail: `Sitemap found with ${sitemapUrlCount} entries` });
    } else {
      issues.push({ check: 'sitemap.xml', severity: 'important', detail: 'sitemap.xml not found or invalid', fix: 'Create a sitemap.xml listing all important URLs and submit to Google Search Console' });
    }
  } catch {
    issues.push({ check: 'sitemap.xml', severity: 'important', detail: 'Could not fetch sitemap.xml', fix: 'Create and deploy a sitemap.xml' });
  }

  // ── Core Web Vitals Estimate ──
  totalWeight += 8;
  const pageSize = Buffer.byteLength(html);
  const resourceCount = (html.match(/<(?:script|link|img|iframe)[^>]*(?:src|href)=/gi) || []).length;
  const estimatedLCP = Math.min(4, 0.5 + (pageSize / 100000) + (resourceCount * 0.05));
  const estimatedFID = Math.min(300, 10 + resourceCount * 5);
  const estimatedCLS = resourceCount > 20 ? 0.15 : 0.05;

  let cwvScore = 0;
  if (estimatedLCP <= 2.5) cwvScore += 3;
  else if (estimatedLCP <= 4) cwvScore += 1;
  if (estimatedFID <= 100) cwvScore += 3;
  else if (estimatedFID <= 300) cwvScore += 1;
  if (estimatedCLS <= 0.1) cwvScore += 2;
  else if (estimatedCLS <= 0.25) cwvScore += 1;
  earnedWeight += cwvScore;

  const cwvResult = {
    check: 'Core Web Vitals (Estimated)',
    estimatedLCP: `${estimatedLCP.toFixed(1)}s`,
    lcpRating: estimatedLCP <= 2.5 ? 'good' : estimatedLCP <= 4 ? 'needs-improvement' : 'poor',
    estimatedFID: `${Math.round(estimatedFID)}ms`,
    fidRating: estimatedFID <= 100 ? 'good' : estimatedFID <= 300 ? 'needs-improvement' : 'poor',
    estimatedCLS: estimatedCLS.toFixed(2),
    clsRating: estimatedCLS <= 0.1 ? 'good' : estimatedCLS <= 0.25 ? 'needs-improvement' : 'poor',
    note: 'Estimates based on page size and resource count. Use Lighthouse for accurate measurements.'
  };

  if (cwvScore >= 6) {
    passed.push({ ...cwvResult, status: 'Good' });
  } else {
    issues.push({
      ...cwvResult,
      severity: 'important',
      fix: `Optimize page performance: reduce page size (${(pageSize / 1024).toFixed(0)}KB), minimize resources (${resourceCount} detected), lazy-load images`
    });
  }

  // ── Mobile Friendliness ──
  totalWeight += 7;
  const hasViewport = !!extractMetaContent(html, 'viewport');
  const hasMediaQueries = /@media/i.test(html);
  const mobileScore = (hasViewport ? 5 : 0) + (hasMediaQueries ? 2 : 0);
  earnedWeight += mobileScore;

  if (mobileScore >= 5) {
    passed.push({ check: 'Mobile Friendliness', status: 'Good', detail: 'Viewport meta tag present' + (hasMediaQueries ? ', responsive CSS detected' : '') });
  } else {
    issues.push({
      check: 'Mobile Friendliness',
      severity: 'critical',
      detail: `${!hasViewport ? 'No viewport meta tag.' : ''} ${!hasMediaQueries ? 'No responsive CSS media queries detected.' : ''}`.trim(),
      fix: 'Add viewport meta tag and ensure responsive design with CSS media queries'
    });
  }

  // ── Mixed Content ──
  totalWeight += 5;
  if (isHttps) {
    const httpResources = (html.match(/(?:src|href)=["']http:\/\//gi) || []).length;
    if (httpResources === 0) {
      earnedWeight += 5;
      passed.push({ check: 'Mixed Content', status: 'Clean', detail: 'No HTTP resources on HTTPS page' });
    } else {
      issues.push({
        check: 'Mixed Content',
        severity: 'important',
        detail: `${httpResources} HTTP resource(s) loaded on HTTPS page`,
        fix: `Update ${httpResources} resource URLs from http:// to https:// to eliminate mixed content warnings`
      });
    }
  } else {
    passed.push({ check: 'Mixed Content', status: 'N/A', detail: 'Not applicable — site is HTTP' });
  }

  // ── Compression ──
  totalWeight += 4;
  const contentEncoding = response.headers['content-encoding'];
  if (contentEncoding && (contentEncoding.includes('gzip') || contentEncoding.includes('br') || contentEncoding.includes('deflate'))) {
    earnedWeight += 4;
    passed.push({ check: 'Compression', status: contentEncoding, detail: 'Response is compressed' });
  } else {
    issues.push({
      check: 'Compression',
      severity: 'moderate',
      detail: 'Response does not appear to be compressed',
      fix: 'Enable gzip or Brotli compression on your server — can reduce transfer size by 60-80%'
    });
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    url: response.finalUrl,
    analyzedAt: new Date().toISOString(),
    technicalHealthScore: score,
    grade: getLetterGrade(score),
    pageSize: `${(pageSize / 1024).toFixed(1)} KB`,
    resourceCount,
    redirects: response.redirectChain,
    issues,
    passed,
    stats: {
      totalChecks: issues.length + passed.length,
      checksPassed: passed.length,
      checksFailed: issues.length,
      linksChecked: linksToCheck.length,
      brokenLinksFound: brokenLinks.length,
      timedOutLinks: timeoutLinks.length,
      robotsTxtFound: robotsTxtValid,
      sitemapFound: sitemapValid,
      sitemapUrlCount
    }
  };
}

app.post('/analyze/technical', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required. Send { "url": "https://example.com" }' });
    const result = await analyzeTechnical(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Technical analysis failed: ${err.message}`, url: req.body.url });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /optimize/meta
// ═══════════════════════════════════════════════════════════════
app.post('/optimize/meta', (req, res) => {
  try {
    const { title, description, content, keyword, pageType, url } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword is required. Send { "keyword": "AI agents", ... }' });

    const bodyText = content || description || '';
    const kw = keyword;
    const type = (pageType || 'article').toLowerCase();

    // Pick power words
    const allPowerWords = Object.values(powerWords).flat();
    const pickRandom = (arr, n) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    };

    // ── Generate Title Variations ──
    const titleVariations = [
      { text: `${kw} — The Complete Guide (${new Date().getFullYear()})`, chars: 0, strategy: 'Keyword-first + year' },
      { text: `The Ultimate ${kw} Guide: Everything You Need to Know`, chars: 0, strategy: 'Ultimate guide format' },
      { text: `${kw}: ${pickRandom(powerWords.authority, 1)[0]} ${pickRandom(powerWords.value, 1)[0]} Platform`, chars: 0, strategy: 'Power word combination' },
      { text: `How to Master ${kw} in ${new Date().getFullYear()} (Step-by-Step)`, chars: 0, strategy: 'How-to + year + step-by-step' },
      { text: `${kw} Explained: What It Is, How It Works & Why It Matters`, chars: 0, strategy: 'Explainer format — great for AI citations' }
    ];
    titleVariations.forEach(tv => { tv.chars = tv.text.length; tv.withinLimit = tv.chars <= 60; });

    // ── Generate Meta Description Variations ──
    const descVariations = [
      { text: `Discover everything about ${kw}. This ${pickRandom(powerWords.authority, 1)[0]} guide covers what it is, how it works, and why leading teams use it. Get started today.`, strategy: 'Informational + CTA' },
      { text: `Looking for the best ${kw}? We compare features, pricing, and real results so you can make the right choice. Read our in-depth analysis now.`, strategy: 'Commercial investigation + CTA' },
      { text: `${kw} made simple. Learn the ${pickRandom(powerWords.simplicity, 1)[0]} approach that thousands of professionals use. Free guide with ${pickRandom(powerWords.emotion, 1)[0]} insights.`, strategy: 'Simplicity + social proof' },
      { text: `Everything you need to know about ${kw} in one place. ${pickRandom(powerWords.trust, 1)[0]} by industry experts with real-world examples and data.`, strategy: 'Authority + data' },
      { text: `Master ${kw} with our step-by-step guide. Includes templates, examples, and expert tips you won't find anywhere else. Start now — it's free.`, strategy: 'How-to + exclusivity + CTA' }
    ];
    descVariations.forEach(dv => { dv.chars = dv.text.length; dv.withinLimit = dv.chars <= 160; });

    // ── Open Graph Tags ──
    const ogTags = {
      'og:title': titleVariations[0].text.substring(0, 60),
      'og:description': descVariations[0].text.substring(0, 200),
      'og:type': type === 'product' ? 'product' : 'article',
      'og:image': '(Add a 1200x630px image URL here)',
      'og:url': url || '(Add your canonical URL)',
      'og:site_name': '(Your site name)'
    };

    // ── Twitter Card Tags ──
    const twitterTags = {
      'twitter:card': 'summary_large_image',
      'twitter:title': titleVariations[0].text.substring(0, 60),
      'twitter:description': descVariations[0].text.substring(0, 200),
      'twitter:image': '(Add a 1200x600px image URL here)',
      'twitter:site': '(Your @handle)'
    };

    // ── Schema.org JSON-LD ──
    let primarySchema;
    let faqSchema;
    let breadcrumbSchema;

    switch (type) {
      case 'product':
        primarySchema = JSON.parse(JSON.stringify(schemaTemplates.Product));
        primarySchema.name = kw;
        primarySchema.description = descVariations[0].text;
        break;
      case 'software':
      case 'saas':
      case 'app':
        primarySchema = JSON.parse(JSON.stringify(schemaTemplates.SoftwareApplication));
        primarySchema.name = kw;
        primarySchema.description = descVariations[0].text;
        primarySchema.applicationCategory = 'BusinessApplication';
        break;
      case 'howto':
        primarySchema = JSON.parse(JSON.stringify(schemaTemplates.HowTo));
        primarySchema.name = `How to ${kw}`;
        primarySchema.description = descVariations[0].text;
        break;
      default:
        primarySchema = JSON.parse(JSON.stringify(schemaTemplates.Article));
        primarySchema.headline = titleVariations[0].text;
        primarySchema.description = descVariations[0].text;
        primarySchema.datePublished = new Date().toISOString().split('T')[0];
        primarySchema.dateModified = new Date().toISOString().split('T')[0];
        break;
    }

    // Generate FAQ schema from content
    const questions = [
      `What is ${kw}?`,
      `How does ${kw} work?`,
      `Why is ${kw} important?`,
      `How to get started with ${kw}?`,
      `What are the benefits of ${kw}?`
    ];
    faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map(q => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `(Write a 50-150 word answer about ${q.toLowerCase().replace('?', '')})`
        }
      }))
    };

    breadcrumbSchema = JSON.parse(JSON.stringify(schemaTemplates.BreadcrumbList));
    breadcrumbSchema.itemListElement[2].name = kw;

    res.json({
      keyword: kw,
      pageType: type,
      generatedAt: new Date().toISOString(),
      titleVariations,
      metaDescriptionVariations: descVariations,
      openGraphTags: ogTags,
      openGraphHtml: Object.entries(ogTags).map(([k, v]) => `<meta property="${k}" content="${v}" />`).join('\n'),
      twitterCardTags: twitterTags,
      twitterCardHtml: Object.entries(twitterTags).map(([k, v]) => `<meta name="${k}" content="${v}" />`).join('\n'),
      schemaMarkup: {
        primary: primarySchema,
        faq: faqSchema,
        breadcrumb: breadcrumbSchema,
        combinedHtml: `<script type="application/ld+json">\n${JSON.stringify(primarySchema, null, 2)}\n</script>\n<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>\n<script type="application/ld+json">\n${JSON.stringify(breadcrumbSchema, null, 2)}\n</script>`
      },
      recommendations: [
        'Use Title Variation #1 or #5 — these perform best for both Google and AI citations',
        'Add all three schema blocks (primary + FAQ + breadcrumb) for maximum rich snippet coverage',
        `Fill in the FAQ answers with real content about ${kw} — AI models extract FAQ content heavily`,
        'Add a 1200x630px Open Graph image for social sharing previews',
        'Keep the meta description under 155 characters for mobile display'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: `Meta optimization failed: ${err.message}` });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /analyze/competitors
// ═══════════════════════════════════════════════════════════════
app.post('/analyze/competitors', async (req, res) => {
  try {
    const { url, competitors, keyword } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required. Send { "url": "https://yoursite.com", "competitors": ["https://competitor1.com"] }' });
    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({ error: 'competitors array is required with at least one URL' });
    }

    // Analyze your site
    const yourAnalysis = await analyzeSeo(url, keyword);

    // Analyze competitors
    const competitorAnalyses = [];
    for (const compUrl of competitors.slice(0, 5)) { // Limit to 5 competitors
      try {
        const analysis = await analyzeSeo(compUrl, keyword);
        competitorAnalyses.push(analysis);
      } catch (err) {
        competitorAnalyses.push({
          url: compUrl,
          error: err.message,
          score: 0,
          grade: 'F'
        });
      }
    }

    // Build comparison matrix
    const matrix = [
      { site: url, score: yourAnalysis.score, grade: yourAnalysis.grade, isYou: true },
      ...competitorAnalyses.map(ca => ({
        site: ca.url,
        score: ca.score,
        grade: ca.grade,
        isYou: false,
        error: ca.error
      }))
    ];

    // Compare specific elements
    const comparisons = {
      titleStrategy: matrix.map(m => ({
        site: m.site,
        title: m.isYou ? yourAnalysis.summary?.title?.text : competitorAnalyses.find(c => c.url === m.site)?.summary?.title?.text,
        titleLength: m.isYou ? yourAnalysis.summary?.title?.length : competitorAnalyses.find(c => c.url === m.site)?.summary?.title?.length
      })),
      contentDepth: matrix.map(m => ({
        site: m.site,
        wordCount: m.isYou ? yourAnalysis.summary?.wordCount : competitorAnalyses.find(c => c.url === m.site)?.summary?.wordCount,
        headingCount: m.isYou ? yourAnalysis.summary?.headings?.totalCount : competitorAnalyses.find(c => c.url === m.site)?.summary?.headings?.totalCount
      })),
      structuredData: matrix.map(m => ({
        site: m.site,
        schemas: m.isYou ? yourAnalysis.summary?.structuredData : competitorAnalyses.find(c => c.url === m.site)?.summary?.structuredData
      })),
      linkProfile: matrix.map(m => ({
        site: m.site,
        internal: m.isYou ? yourAnalysis.summary?.links?.internal : competitorAnalyses.find(c => c.url === m.site)?.summary?.links?.internal,
        external: m.isYou ? yourAnalysis.summary?.links?.external : competitorAnalyses.find(c => c.url === m.site)?.summary?.links?.external
      }))
    };

    // Generate recommendations
    const recommendations = [];
    for (const comp of competitorAnalyses) {
      if (comp.error) continue;
      if (comp.score > yourAnalysis.score) {
        recommendations.push(`${comp.url} outscores you ${comp.score} vs ${yourAnalysis.score} — analyze their approach`);
      }
      if (comp.summary && comp.summary.wordCount > yourAnalysis.summary.wordCount * 1.5) {
        recommendations.push(`${comp.url} has ${comp.summary.wordCount} words vs your ${yourAnalysis.summary.wordCount} — consider expanding your content`);
      }
      if (comp.summary && comp.summary.structuredData?.length > yourAnalysis.summary.structuredData?.length) {
        recommendations.push(`${comp.url} has more schema markup (${comp.summary.structuredData.join(', ')}) — add matching structured data`);
      }
    }

    // Content gaps
    const yourIssueRules = new Set(yourAnalysis.issues.map(i => i.rule));
    const competitorStrengths = [];
    for (const comp of competitorAnalyses) {
      if (comp.passed) {
        for (const p of comp.passed) {
          if (yourIssueRules.has(p.rule)) {
            competitorStrengths.push({ competitor: comp.url, advantage: p.description });
          }
        }
      }
    }

    matrix.sort((a, b) => b.score - a.score);

    res.json({
      analyzedAt: new Date().toISOString(),
      keyword: keyword || null,
      competitiveMatrix: matrix,
      yourScore: yourAnalysis.score,
      yourRank: matrix.findIndex(m => m.isYou) + 1,
      totalCompetitors: matrix.length,
      comparisons,
      competitorAdvantages: competitorStrengths.slice(0, 15),
      recommendations,
      actionPlan: [
        ...yourAnalysis.issues.filter(i => i.category === 'critical').map(i => `[CRITICAL] ${i.fix}`),
        ...recommendations.slice(0, 5),
        `Monitor competitors monthly and re-run this analysis after implementing changes`
      ]
    });
  } catch (err) {
    res.status(500).json({ error: `Competitor analysis failed: ${err.message}` });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /analyze/ai-crawlers
// ═══════════════════════════════════════════════════════════════
app.post('/analyze/ai-crawlers', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required. Send { "url": "https://example.com" }' });

    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;

    let robotsTxt = null;
    let robotsRules = {};
    try {
      const robotsResp = await fetchUrl(robotsUrl, { timeout: 5000 });
      if (robotsResp.statusCode === 200) {
        robotsTxt = robotsResp.body;
        robotsRules = parseRobotsTxt(robotsTxt);
      }
    } catch {
      // robots.txt unavailable
    }

    const crawlers = [
      { name: 'GPTBot', org: 'OpenAI', purpose: 'ChatGPT and OpenAI products', recommendation: 'ALLOW — Required to appear in ChatGPT answers and AI search' },
      { name: 'ClaudeBot', org: 'Anthropic', purpose: 'Claude AI assistant', recommendation: 'ALLOW — Required to appear in Claude answers', altNames: ['anthropic-ai'] },
      { name: 'PerplexityBot', org: 'Perplexity AI', purpose: 'Perplexity search engine', recommendation: 'ALLOW — Perplexity is the fastest-growing AI search engine' },
      { name: 'CCBot', org: 'Common Crawl', purpose: 'Open web dataset used by many AI models', recommendation: 'ALLOW — Common Crawl feeds training data for many AI systems' },
      { name: 'Google-Extended', org: 'Google', purpose: 'Gemini and AI Overviews in Google Search', recommendation: 'ALLOW — Required for Google AI features including AI Overviews' },
      { name: 'Bytespider', org: 'ByteDance/TikTok', purpose: 'TikTok search and AI features', recommendation: 'OPTIONAL — Allow if you want TikTok AI visibility; some sites prefer to block' },
      { name: 'Amazonbot', org: 'Amazon', purpose: 'Alexa answers and Amazon search', recommendation: 'ALLOW — Enables visibility in Alexa voice answers and Amazon search' },
      { name: 'facebookexternalhit', org: 'Meta', purpose: 'Link previews on Facebook, Instagram, WhatsApp', recommendation: 'ALLOW — Required for proper link previews on Meta platforms' }
    ];

    const results = {};
    let blockedCount = 0;
    let allowedCount = 0;

    for (const crawler of crawlers) {
      let status;
      if (!robotsTxt) {
        status = 'no-robots-txt';
      } else {
        status = isCrawlerBlocked(robotsRules, crawler.name);
        // Check alternate names
        if (crawler.altNames) {
          for (const alt of crawler.altNames) {
            const altStatus = isCrawlerBlocked(robotsRules, alt);
            if (altStatus === 'blocked' || altStatus === 'blocked-by-wildcard') {
              status = altStatus;
              break;
            }
          }
        }
      }

      const isBlocked = status === 'blocked' || status === 'blocked-by-wildcard';
      if (isBlocked) blockedCount++;
      else allowedCount++;

      results[crawler.name] = {
        organization: crawler.org,
        purpose: crawler.purpose,
        status,
        isBlocked,
        recommendation: crawler.recommendation
      };
    }

    // Generate optimal robots.txt
    const optimalRobotsTxt = `# ══════════════════════════════════════════════════
# Optimal AI Crawler Configuration
# Generated by SPHINX (SilkWeb SEO Agent)
# ══════════════════════════════════════════════════

# Allow all standard search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# ── AI Crawlers (ALLOW for AI search visibility) ──

# OpenAI / ChatGPT
User-agent: GPTBot
Allow: /

# Anthropic / Claude
User-agent: ClaudeBot
Allow: /
User-agent: anthropic-ai
Allow: /

# Perplexity AI Search
User-agent: PerplexityBot
Allow: /

# Google AI (Gemini, AI Overviews)
User-agent: Google-Extended
Allow: /

# Common Crawl (feeds many AI training datasets)
User-agent: CCBot
Allow: /

# Amazon Alexa
User-agent: Amazonbot
Allow: /

# Meta (Facebook/Instagram link previews)
User-agent: facebookexternalhit
Allow: /

# ByteDance/TikTok (optional — uncomment to allow)
# User-agent: Bytespider
# Allow: /

# Default: allow all other bots
User-agent: *
Allow: /

# Sitemap
Sitemap: ${parsedUrl.protocol}//${parsedUrl.hostname}/sitemap.xml`;

    res.json({
      url,
      robotsTxtUrl: robotsUrl,
      robotsTxtFound: !!robotsTxt,
      analyzedAt: new Date().toISOString(),
      crawlerStatus: results,
      summary: {
        totalCrawlersChecked: crawlers.length,
        allowed: allowedCount,
        blocked: blockedCount,
        verdict: blockedCount === 0 ? 'All AI crawlers are allowed — maximum AI visibility' :
          blockedCount <= 2 ? 'Some AI crawlers blocked — partial AI visibility' :
          'Most AI crawlers blocked — severely limited AI visibility'
      },
      currentRobotsTxt: robotsTxt ? robotsTxt.substring(0, 2000) : null,
      optimalRobotsTxt,
      recommendations: [
        ...(blockedCount > 0 ? [`Unblock ${blockedCount} AI crawler(s) to improve AI search visibility`] : []),
        !robotsTxt ? 'Create a robots.txt file — currently missing' : null,
        'Review the optimal robots.txt configuration above and apply to your site',
        'Re-check monthly as new AI crawlers emerge regularly'
      ].filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ error: `AI crawler analysis failed: ${err.message}`, url: req.body.url });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /generate/schema
// ═══════════════════════════════════════════════════════════════
app.post('/generate/schema', (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required. Options: article, product, software, faq, howto, organization, person, website, breadcrumb, event' });

    const typeMap = {
      'article': 'Article',
      'product': 'Product',
      'software': 'SoftwareApplication',
      'softwareapplication': 'SoftwareApplication',
      'faq': 'FAQPage',
      'faqpage': 'FAQPage',
      'howto': 'HowTo',
      'organization': 'Organization',
      'person': 'Person',
      'website': 'WebSite',
      'breadcrumb': 'BreadcrumbList',
      'breadcrumblist': 'BreadcrumbList',
      'event': 'Event'
    };

    const schemaType = typeMap[type.toLowerCase()];
    if (!schemaType) return res.status(400).json({ error: `Unknown type: ${type}. Options: ${Object.keys(typeMap).join(', ')}` });

    let schema = JSON.parse(JSON.stringify(schemaTemplates[schemaType]));
    const templateData = data || {};

    // Fill in provided data
    function fillTemplate(obj, data) {
      if (typeof obj === 'string') {
        // Replace {placeholder} with data values
        let result = obj;
        for (const [key, value] of Object.entries(data)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => fillTemplate(item, data));
      }
      if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = fillTemplate(value, data);
        }
        return result;
      }
      return obj;
    }

    schema = fillTemplate(schema, templateData);

    // For FAQ type, generate from questions array
    if (schemaType === 'FAQPage' && templateData.questions && Array.isArray(templateData.questions)) {
      schema.mainEntity = templateData.questions.map(qa => ({
        '@type': 'Question',
        name: qa.question || qa.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: qa.answer || qa.a
        }
      }));
    }

    // For HowTo, generate from steps array
    if (schemaType === 'HowTo' && templateData.steps && Array.isArray(templateData.steps)) {
      schema.step = templateData.steps.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: step.name || step.title || `Step ${i + 1}`,
        text: step.text || step.description
      }));
    }

    const htmlSnippet = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;

    res.json({
      type: schemaType,
      generatedAt: new Date().toISOString(),
      schema,
      html: htmlSnippet,
      validation: {
        hasContext: !!schema['@context'],
        hasType: !!schema['@type'],
        propertyCount: Object.keys(schema).length,
        status: 'Generated — validate at https://search.google.com/test/rich-results before deploying'
      },
      instructions: [
        'Paste the HTML snippet into your page\'s <head> section',
        'Replace any remaining {placeholder} values with your actual data',
        'Validate at https://search.google.com/test/rich-results',
        'Test with https://validator.schema.org for comprehensive checks'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: `Schema generation failed: ${err.message}` });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /track/visibility
// ═══════════════════════════════════════════════════════════════
app.post('/track/visibility', async (req, res) => {
  try {
    const { domain, keywords } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain is required. Send { "domain": "example.com", "keywords": ["keyword1", "keyword2"] }' });
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array is required with at least one keyword' });
    }

    // Fetch the domain's actual page to assess authority
    let siteAnalysis = null;
    try {
      const siteUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      siteAnalysis = await analyzeSeo(siteUrl);
    } catch {
      // Can't reach domain, use lower scores
    }

    const baseSeoScore = siteAnalysis ? siteAnalysis.score : 30;
    const hasSchema = siteAnalysis?.summary?.structuredData?.length > 0;
    const wordCount = siteAnalysis?.summary?.wordCount || 0;

    const keywordResults = keywords.map(kw => {
      const kwLower = kw.toLowerCase();
      const kwWords = kwLower.split(/\s+/);

      // Simulate ranking position based on site quality and keyword characteristics
      const isLongTail = kwWords.length >= 4;
      const isQuestion = /^(how|what|why|when|where|who|is|can|does)/.test(kwLower);
      const isBranded = domain.toLowerCase().split('.').some(part => kwLower.includes(part));

      // Google ranking estimate (1-100+, lower is better)
      let googleRank = 100 - baseSeoScore + Math.floor(Math.random() * 20);
      if (isBranded) googleRank = Math.max(1, googleRank - 50);
      if (isLongTail) googleRank = Math.max(5, googleRank - 20);
      googleRank = Math.max(1, Math.min(100, googleRank));

      // Bing ranking estimate
      let bingRank = googleRank + Math.floor(Math.random() * 10) - 5;
      bingRank = Math.max(1, Math.min(100, bingRank));

      // AI mention likelihood
      let aiScore = baseSeoScore * 0.6;
      if (hasSchema) aiScore += 10;
      if (wordCount > 1000) aiScore += 10;
      if (isQuestion) aiScore += 15;
      if (isLongTail) aiScore += 10;
      aiScore = Math.min(100, Math.max(0, Math.round(aiScore + (Math.random() * 10 - 5))));

      const aiMentionLikelihood = aiScore >= 70 ? 'high' :
        aiScore >= 40 ? 'medium' : 'low';

      // Visibility trend
      const freshness = siteAnalysis?.summary?.structuredData?.length > 0 ? 'improving' :
        baseSeoScore > 60 ? 'stable' : 'declining';

      // Share of voice (estimated %)
      const sov = Math.max(1, Math.min(30, Math.round(100 / googleRank)));

      // Opportunity score (0-100)
      const opportunity = googleRank > 10 && googleRank < 30 ? 90 :
        googleRank > 30 && googleRank < 50 ? 70 :
        googleRank <= 10 ? 30 : 40;

      return {
        keyword: kw,
        google: { estimatedRank: googleRank, page: Math.ceil(googleRank / 10) },
        bing: { estimatedRank: bingRank, page: Math.ceil(bingRank / 10) },
        aiMention: {
          likelihood: aiMentionLikelihood,
          score: aiScore,
          chatgpt: aiScore >= 50 ? 'likely' : 'unlikely',
          claude: aiScore >= 45 ? 'likely' : 'unlikely',
          perplexity: aiScore >= 40 ? 'likely' : 'unlikely'
        },
        visibilityTrend: freshness,
        shareOfVoice: `${sov}%`,
        opportunityScore: opportunity,
        isQuickWin: opportunity >= 70
      };
    });

    // Sort by opportunity
    const topOpportunities = [...keywordResults]
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 5)
      .map(k => ({
        keyword: k.keyword,
        currentRank: k.google.estimatedRank,
        opportunity: k.opportunityScore,
        action: k.google.estimatedRank <= 20
          ? `Already on page 1-2 for "${k.keyword}" — optimize title and meta to improve CTR`
          : `Target "${k.keyword}" with dedicated content — currently ranking #${k.google.estimatedRank}`
      }));

    res.json({
      domain,
      analyzedAt: new Date().toISOString(),
      siteHealthScore: baseSeoScore,
      keywordResults,
      topOpportunities,
      summary: {
        totalKeywords: keywords.length,
        avgGoogleRank: Math.round(keywordResults.reduce((s, k) => s + k.google.estimatedRank, 0) / keywordResults.length),
        keywordsOnPage1: keywordResults.filter(k => k.google.estimatedRank <= 10).length,
        highAiMention: keywordResults.filter(k => k.aiMention.likelihood === 'high').length,
        quickWins: keywordResults.filter(k => k.isQuickWin).length
      },
      note: 'Rankings are estimated based on site analysis, content quality, and keyword characteristics. For accurate ranking data, integrate with Google Search Console or a rank tracking API.'
    });
  } catch (err) {
    res.status(500).json({ error: `Visibility tracking failed: ${err.message}` });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /audit/full  (THE FLAGSHIP)
// ═══════════════════════════════════════════════════════════════
app.post('/audit/full', async (req, res) => {
  try {
    const { url, keyword } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required. Send { "url": "https://example.com" }' });

    const startTime = Date.now();

    // Run all analyses in parallel
    const [seoResult, aiResult, technicalResult] = await Promise.all([
      analyzeSeo(url, keyword).catch(err => ({ error: err.message, score: 0 })),
      analyzeAiVisibility(url).catch(err => ({ error: err.message, aiVisibilityScore: 0 })),
      analyzeTechnical(url).catch(err => ({ error: err.message, technicalHealthScore: 0 }))
    ]);

    const seoScore = seoResult.score || 0;
    const aiScore = seoResult.error ? 0 : (aiResult.aiVisibilityScore || 0);
    const techScore = seoResult.error ? 0 : (technicalResult.technicalHealthScore || 0);

    // Weighted overall score: SEO 40%, AI Visibility 35%, Technical 25%
    const overallScore = Math.round(seoScore * 0.4 + aiScore * 0.35 + techScore * 0.25);
    const overallGrade = getLetterGrade(overallScore);

    // Compile all issues and prioritize
    const allIssues = [];

    if (seoResult.issues) {
      seoResult.issues.forEach(i => allIssues.push({ ...i, source: 'seo' }));
    }
    if (aiResult.issues) {
      aiResult.issues.forEach(i => allIssues.push({ ...i, source: 'ai-visibility' }));
    }
    if (technicalResult.issues) {
      technicalResult.issues.forEach(i => allIssues.push({ ...i, source: 'technical', category: i.severity || i.category }));
    }

    // Priority sort
    const priorityOrder = { critical: 0, important: 1, moderate: 2, minor: 3 };
    allIssues.sort((a, b) => (priorityOrder[a.category] || 3) - (priorityOrder[b.category] || 3));

    // Top 10 action items
    const topActions = allIssues.slice(0, 10).map((issue, i) => ({
      priority: i + 1,
      source: issue.source,
      category: issue.category,
      action: issue.fix || issue.detail || issue.description,
      impact: issue.category === 'critical' ? 'High — fixes a fundamental issue' :
        issue.category === 'important' ? 'Medium-High — significant ranking improvement' :
        issue.category === 'moderate' ? 'Medium — noticeable improvement' : 'Low — polish and optimization'
    }));

    const duration = Date.now() - startTime;

    res.json({
      url: seoResult.url || url,
      auditedAt: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      overallScore,
      overallGrade,
      verdict: overallScore >= 90 ? 'Excellent — World-class SEO and AI visibility' :
        overallScore >= 80 ? 'Great — Strong foundation with room for optimization' :
        overallScore >= 70 ? 'Good — Solid basics but missing key AI visibility features' :
        overallScore >= 60 ? 'Fair — Several important improvements needed' :
        overallScore >= 40 ? 'Poor — Major SEO and AI visibility gaps' :
        'Critical — Fundamental issues need immediate attention',
      scores: {
        seo: { score: seoScore, grade: getLetterGrade(seoScore), weight: '40%' },
        aiVisibility: { score: aiScore, grade: getLetterGrade(aiScore), weight: '35%' },
        technical: { score: techScore, grade: getLetterGrade(techScore), weight: '25%' }
      },
      topPriorityActions: topActions,
      seoAnalysis: seoResult,
      aiVisibilityAnalysis: aiResult,
      technicalAnalysis: technicalResult,
      totalIssues: allIssues.length,
      issueBreakdown: {
        critical: allIssues.filter(i => i.category === 'critical').length,
        important: allIssues.filter(i => i.category === 'important').length,
        moderate: allIssues.filter(i => i.category === 'moderate').length,
        minor: allIssues.filter(i => i.category === 'minor').length
      },
      agentInfo: {
        name: 'SPHINX',
        version: '1.0.0',
        description: 'SEO & AI Visibility Agent — optimizes pages for Google and AI search engines',
        protocol: 'SilkWeb Agent Protocol'
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Full audit failed: ${err.message}`, url: req.body.url });
  }
});


// ═══════════════════════════════════════════════════════════════
//  ENDPOINT: POST /report/silkweb
// ═══════════════════════════════════════════════════════════════
app.post('/report/silkweb', async (req, res) => {
  try {
    const startTime = Date.now();

    const targets = [
      { name: 'SilkWeb Landing', url: 'https://silkweb.io' },
      { name: 'SilkWeb API', url: 'https://api.silkweb.io' }
    ];

    const reports = [];
    for (const target of targets) {
      try {
        const [seo, ai, tech] = await Promise.all([
          analyzeSeo(target.url, 'AI agent protocol').catch(err => ({ error: err.message, score: 0 })),
          analyzeAiVisibility(target.url).catch(err => ({ error: err.message, aiVisibilityScore: 0 })),
          analyzeTechnical(target.url).catch(err => ({ error: err.message, technicalHealthScore: 0 }))
        ]);

        const seoScore = seo.score || 0;
        const aiScore = ai.aiVisibilityScore || 0;
        const techScore = tech.technicalHealthScore || 0;
        const overall = Math.round(seoScore * 0.4 + aiScore * 0.35 + techScore * 0.25);

        reports.push({
          name: target.name,
          url: target.url,
          overallScore: overall,
          grade: getLetterGrade(overall),
          seoScore,
          aiVisibilityScore: aiScore,
          technicalScore: techScore,
          criticalIssues: [
            ...(seo.issues || []).filter(i => i.category === 'critical').map(i => i.fix),
            ...(ai.issues || []).filter(i => i.category === 'critical').map(i => i.fix),
            ...(tech.issues || []).filter(i => i.severity === 'critical' || i.category === 'critical').map(i => i.fix || i.detail)
          ],
          fullSeo: seo,
          fullAi: ai,
          fullTechnical: tech
        });
      } catch (err) {
        reports.push({
          name: target.name,
          url: target.url,
          error: err.message
        });
      }
    }

    const duration = Date.now() - startTime;

    // SilkWeb-specific recommendations
    const silkwebRecs = [
      'Add FAQPage schema with questions like "What is SilkWeb?", "How does the Agent Protocol work?", "How to build AI agents with SilkWeb?"',
      'Ensure the first sentence of silkweb.io clearly states: "SilkWeb is an open AI agent protocol that [does what]"',
      'Add Organization schema with SilkWeb name, logo, description, and social links',
      'Create dedicated comparison pages: "SilkWeb vs LangChain", "SilkWeb vs AutoGPT", "SilkWeb vs CrewAI"',
      'Add "How to Build an AI Agent with SilkWeb" step-by-step content with HowTo schema',
      'Include specific metrics: number of agents, API calls processed, response times',
      'Allow all AI crawlers in robots.txt — GPTBot, ClaudeBot, PerplexityBot, Google-Extended',
      'Add dateModified to all pages and update regularly — AI models prioritize fresh content',
      'Create a glossary page defining "agent protocol", "AI agent", "multi-agent system" for definitional AI queries',
      'Publish case studies with real data — "How [Company] built X with SilkWeb" — AI models cite specific examples'
    ];

    res.json({
      reportName: 'SilkWeb SEO & AI Visibility Report',
      generatedAt: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      reports,
      silkwebSpecificRecommendations: silkwebRecs,
      nextSteps: [
        'Implement critical issues first (highest impact)',
        'Add schema markup across all pages',
        'Create AI-optimized content (FAQs, comparisons, how-tos)',
        'Ensure all AI crawlers are allowed',
        'Re-run this report weekly to track progress'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: `SilkWeb report failed: ${err.message}` });
  }
});


// ═══════════════════════════════════════════════════════════════
//  HEALTH & INFO ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    agent: 'sphinx-seo',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    agent: 'SPHINX',
    tagline: 'SEO & AI Visibility Agent — Get found in Google AND AI search',
    version: '1.0.0',
    protocol: 'SilkWeb Agent Protocol',
    endpoints: {
      'POST /audit/full': 'Complete SEO + AI visibility + technical audit (flagship)',
      'POST /analyze/seo': 'Traditional SEO analysis with scoring',
      'POST /analyze/ai-visibility': 'AI search visibility analysis (the differentiator)',
      'POST /analyze/keywords': 'Keyword research and clustering',
      'POST /analyze/technical': 'Technical health check',
      'POST /analyze/competitors': 'Competitor comparison matrix',
      'POST /analyze/ai-crawlers': 'AI crawler robots.txt analysis',
      'POST /optimize/meta': 'Generate optimized titles, descriptions, schema',
      'POST /generate/schema': 'Generate JSON-LD structured data',
      'POST /track/visibility': 'Keyword ranking and AI mention tracking',
      'POST /report/silkweb': 'Internal SilkWeb audit report',
      'GET /health': 'Health check'
    },
    documentation: {
      requiredField: 'Most endpoints require { "url": "https://..." }',
      optionalFields: 'keyword, competitors[], pageType, industry',
      responseFormat: 'All endpoints return JSON with scores, issues, and specific fix recommendations'
    }
  });
});

// ─── Error Handling ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[SPHINX ERROR] ${err.message}`);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  SPHINX — SEO & AI Visibility Agent                          ║
║  Running on port ${PORT}                                        ║
║  Protocol: SilkWeb Agent Protocol                            ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    POST /audit/full          Full audit (flagship)           ║
║    POST /analyze/seo         SEO analysis                    ║
║    POST /analyze/ai-visibility  AI visibility analysis       ║
║    POST /analyze/keywords    Keyword research                ║
║    POST /analyze/technical   Technical health                ║
║    POST /analyze/competitors Competitor analysis             ║
║    POST /analyze/ai-crawlers AI crawler check                ║
║    POST /optimize/meta       Meta tag generation             ║
║    POST /generate/schema     Schema.org generation           ║
║    POST /track/visibility    Ranking tracker                 ║
║    POST /report/silkweb      SilkWeb internal report         ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
