# Launch Images Checklist

You need these images for Product Hunt, Twitter, Reddit, and directory submissions.

---

## REQUIRED IMAGES (create before launch)

### 1. OG Image (social share preview)
- **Size:** 1200x630px
- **Used by:** Twitter cards, LinkedIn, Discord embeds, Slack unfurls
- **Design:** Dark background (#0a0a0f), SilkWeb logo, tagline "DNS for AI agents", silkweb.io URL
- **File:** og-image.png
- **Where it goes:** Already set in meta tags on silkweb.io

### 2. Product Hunt Gallery (5 images)
- **Size:** 1270x760px (PH recommended)

  **Image 1 - Hero:**
  Screenshot of silkweb.io landing page (full width)

  **Image 2 - API Demo:**
  Terminal showing: curl api.silkweb.io/api/v1/stats with the JSON response
  Clean dark terminal, big font

  **Image 3 - Code Integration:**
  3-line code snippet on dark background:
  ```
  const silk = new SilkWeb({ apiKey: '...' });
  silk.register(myAgent);
  const help = await silk.discover({ capabilities: ['legal-review'] });
  ```

  **Image 4 - Receipt Email:**
  Mockup of the receipt email in an inbox
  Shows: task completed, agent names, cryptographic signature, verify link

  **Image 5 - Network Stats:**
  Clean graphic showing: 18 agents | 47 capabilities | 12 industries
  With icons for each industry

### 3. Twitter Thread Images
- **Size:** 1200x675px (16:9)

  **Thread image 1:** "DNS for AI agents" with web graphic
  **Thread image 2:** Code snippet (same as PH image 3)
  **Thread image 3:** Receipt email mockup
  **Thread image 4:** Network stats infographic

### 4. GitHub Social Preview
- **Size:** 1280x640px
- **Design:** SilkWeb logo + "The Spider Web Protocol" + key stats
- **Set at:** github.com/silkweb-protocol/silkweb → Settings → Social preview

### 5. Favicon
- **Already have:** Check silkweb.io for existing favicon
- **Need:** Apple touch icon (180x180), Android icon (192x192)

---

## HOW TO CREATE THEM

**Option A (fastest):** Use Figma or Canva
- Dark background: #0a0a0f
- Text: #e2e8f0 (light) and #818cf8 (purple accent)
- Green accent: #10B981
- Font: Inter (headings), JetBrains Mono (code)

**Option B:** Screenshot the live site + terminal, add borders and branding in any image editor

**Option C:** Ask Claude to generate them using canvas-design skill

---

## FILE NAMING

```
launch-kit/images/
  og-image.png          (1200x630)
  ph-hero.png           (1270x760)
  ph-api-demo.png       (1270x760)
  ph-code.png           (1270x760)
  ph-receipt.png        (1270x760)
  ph-network.png        (1270x760)
  twitter-hero.png      (1200x675)
  twitter-code.png      (1200x675)
  twitter-receipt.png   (1200x675)
  twitter-stats.png     (1200x675)
  github-social.png     (1280x640)
```
