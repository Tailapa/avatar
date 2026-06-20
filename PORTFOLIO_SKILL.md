# Shashank Venkatesh — Portfolio Website Build Skill

## Overview

Build a single-page personal portfolio website for **Shashank Venkatesh (Tailapa)** — data scientist, policy researcher, and GenAI engineer based in Bengaluru. The site must feel significantly more impressive than the reference site (akashpersetti.com): darker, moodier, more cinematic, with richer animations and a stronger visual identity. It integrates the existing avatar chat system at `http://localhost:8000` as an embedded floating chat widget.

---

## Visual Design Direction

### Aesthetic: "Deep Field Observatory"

The design language is dark, technical, and precise — like a satellite ground control interface crossed with a high-end editorial portfolio. The green bokeh of Shashank's photo (cream shirt, arms crossed, outdoor setting) is the visual anchor. The palette pulls from that: deep forest greens through near-black, with amber and warm white as accent.

This is a deliberate departure from the reference site's blue-purple gradient. Shashank's background is geospatial ML, environmental policy, and defence — the visual language should reflect that gravity.

### Colour Tokens

```css
:root {
  /* Backgrounds */
  --bg-void:       #050a07;   /* near-black with green undertone — page base */
  --bg-deep:       #0a110c;   /* section backgrounds */
  --bg-surface:    #111a13;   /* card backgrounds */
  --bg-raised:     #18261a;   /* elevated cards, hover states */
  --bg-glass:      rgba(16, 24, 18, 0.72); /* glassmorphism overlay */

  /* Primary accent — amber/gold */
  --accent-amber:  #e8a020;   /* primary CTA, active nav, highlights */
  --accent-amber-dim: #a06a10; /* secondary amber, borders */
  --accent-amber-glow: rgba(232, 160, 32, 0.18); /* glow halos */

  /* Secondary accent — cool cyan (used sparingly) */
  --accent-cyan:   #2cc4a0;   /* skill tags, secondary badges */
  --accent-cyan-dim: rgba(44, 196, 160, 0.15);

  /* Text */
  --text-primary:  #f0ede6;   /* headings */
  --text-secondary: #a89e8e;  /* body, descriptions */
  --text-muted:    #5a5248;   /* timestamps, labels */
  --text-accent:   #e8a020;   /* linked names, highlighted text */

  /* Borders */
  --border-subtle: rgba(232, 160, 32, 0.12);
  --border-active: rgba(232, 160, 32, 0.45);

  /* Glow */
  --glow-amber:    0 0 40px rgba(232, 160, 32, 0.15), 0 0 80px rgba(232, 160, 32, 0.06);
  --glow-card:     0 8px 32px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(232, 160, 32, 0.08) inset;
}
```

### Typography

```
Display:  'Space Grotesk' (700, 800) — hero name, section headings
Body:     'Inter' (400, 500) — descriptions, card content
Mono:     'JetBrains Mono' (400, 500) — skill tags, dates, labels, code refs
```

Load from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Background Texture

Layered SVG grid on `--bg-void`:
- A very faint dot grid at 32px intervals, amber at 4% opacity
- A radial gradient glow behind the hero section: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,160,32,0.07) 0%, transparent 70%)`
- Subtle animated noise texture using a CSS filter or SVG feTurbulence (optional — only add if it doesn't reduce performance)

---

## Page Structure

### 1. Navigation Bar

Fixed top navbar, `backdrop-filter: blur(16px)`, `background: var(--bg-glass)`, bottom border `var(--border-subtle)`.

Left: monogram **SV** in Space Grotesk 700, amber.
Right: nav links — Experience · Projects · Skills · Education · Certifications · Contact

Active section highlights the link with `var(--accent-amber)` and a thin underline. Smooth scroll on click. On mobile: hamburger → slide-down drawer.

### 2. Hero Section

Full viewport height. Centred layout.

```
[Name — two lines, Space Grotesk 800, 72px desktop / 42px mobile]
Shashank
Venkatesh

[Subtitle — JetBrains Mono 16px, --text-accent]
Data Scientist · Policy Researcher · GenAI Engineer

[Bio — Inter 400, 18px, --text-secondary, max-width 560px, centred]
Bengaluru-based. Building at the intersection of machine learning,
geospatial analysis, and governance research.

[CTA buttons]
[View Projects]  [Download Resume]  [Chat with My Twin →]
```

Buttons: primary (amber filled), secondary (ghost with amber border), tertiary (ghost cyan).

Below the bio: a horizontal ticker/marquee of skill tags scrolling left — `Python · LangGraph · CrewAI · Google Earth Engine · FastAPI · PyTorch · MCP · QGIS · RAG · Docker · Policy Research · Supabase`.

### 3. Experience Section

Section heading: `Experience` — Space Grotesk 700, 36px, with a short amber underline accent (3px, 40px wide).

Layout: vertical timeline on the left (thin amber line with amber dot markers). Each entry is a **card** that starts collapsed and expands on click.

**Collapsed card state:**
```
┌─────────────────────────────────────────────────────┐
│ [Role Title]              [Organisation]    [▼]      │
│ [JetBrains Mono: Location · Date range]             │
└─────────────────────────────────────────────────────┘
```

**Expanded state (animated):**
```
┌─────────────────────────────────────────────────────┐
│ [Role Title]              [Organisation]    [▲]      │
│ [JetBrains Mono: Location · Date range]             │
│ ─────────────────────────────────────────────────── │
│ • Bullet point 1                                     │
│ • Bullet point 2                                     │
│ • Bullet point 3                                     │
└─────────────────────────────────────────────────────┘
```

Animation: `max-height` transition from 0 to auto over 380ms `cubic-bezier(0.4, 0, 0.2, 1)`. The chevron rotates 180° on expand.

**Experience entries (from resume):**

1. **Intern — Campaigns Infrastructure & Tech** | Varahe Analytics | Noida | Jun 2026 – Present
   - Electoral data and campaigns infrastructure technology role
   - Applies GenAI and agentic AI tooling to political data workflows

2. **Fellow** | Chanakya University Policy Programme | Bengaluru | 2025 – Present
   - Statistical analysis on large socio-economic datasets (PLFS: 1L and 4L observations, ~60 features)
   - M&E reports, analytical briefs, and interactive dashboards for academic and policy stakeholders
   - Version-controlled data pipelines with documented codebooks and SOPs

3. **Field Researcher** | GRAAM–Chanakya University Policy Bootcamp | Mysuru | May 2026
   - Five-day immersive field programme; 103 households surveyed in Hunsur Block using Kobo Toolbox
   - Produced Jupyter notebook, PPTX, and dark-themed Plotly HTML dashboard
   - Received Policy Bootcamp Certificate from GRAAM and Chanakya University

4. **Intern, Data & Spatial Analysis** | Karnataka Power Corporation Limited (KPCL) | Bengaluru | Nov 2019 – Feb 2020
   - District-level solar radiation estimation using NREL PVWatts; modelled 9.13 MW grid-connected PV system
   - Capacity estimation and performance forecasting for infrastructure planning

### 4. Projects Section

Section heading: `Projects` — same style as Experience.

Layout: responsive grid — 3 columns desktop, 2 tablet, 1 mobile. Each project is a **card**.

**Card default state:**
```
┌──────────────────────────────┐
│ [Project Name — bold]        │
│ [Tagline — cyan mono]        │
│                              │
│                              │
│                              │
│ [Date badge]   Tap to expand→│
└──────────────────────────────┘
```

**Card expanded state — flip animation:**
The card flips on the Y axis (CSS 3D transform `rotateY(180deg)`) to reveal the back face with:
- Full description
- Tech stack tags (pill badges, `--accent-cyan-dim` background, `--accent-cyan` text, JetBrains Mono)
- Link buttons: GitHub / Live Demo (where applicable)

Flip animation: `transform-style: preserve-3d`, `perspective: 1000px`, transition `600ms cubic-bezier(0.4, 0, 0.2, 1)`.

**Project entries:**

1. **Bengaluru Flood Risk Model** | Geospatial Climate ML
   - Geospatial ML pipeline (R² = 0.64) mapping urban flood vulnerability; interactive Streamlit dashboard
   - Tags: `Google Earth Engine` `Sentinel-1/2 SAR` `NASA GPM` `Python` `scikit-learn` `Streamlit`
   - Date: 2024

2. **Ramsar Sites Ecological Index** | Environmental Policy
   - 96 Indian wetland sites; Diversity Index + Threat Density scoring; 21 hotspot sites; 6-point policy brief
   - Tags: `Python` `Spatial Analysis` `Policy Research` `Data Viz`
   - Date: 2024

3. **AI Document Humanisation Pipeline** | Agentic AI
   - Full agentic pipeline to detect and rewrite AI writing patterns; deployed on Windows with Docker
   - Tags: `CrewAI` `Groq` `FastAPI` `MCP` `Docker`
   - Date: 2025

4. **LangChain RAG & NLP Portfolio** | LLM Engineering
   - RAG pipelines, ETL, NLP, LLM component building across Jupyter notebooks
   - Tags: `LangChain` `LangGraph` `RAG` `Python` `Jupyter`
   - Date: 2025

5. **Energy Transition HGBR Forecasting** | Policy ML
   - 176-country panel; HistGradientBoostingRegressor with scenario simulation and permutation importance
   - Tags: `Python` `scikit-learn` `Panel Data` `Policy`
   - Date: 2024

6. **GRAAM Field Survey Dashboard** | Data Engineering
   - 103-household primary survey; dark-themed Plotly HTML dashboard with welfare scheme analysis
   - Tags: `Python` `Plotly` `Kobo Toolbox` `HTML` `Field Research`
   - Date: May 2026

### 5. Skills Section

Section heading: `Skills`.

Layout: grouped by domain. Each group is a labelled block. Skills render as pill badges.

```
Data Science & ML
[Python] [R] [PyTorch] [scikit-learn] [HuggingFace] [STATA] [pandas] [numpy]

GenAI & Agentic AI
[LangChain] [LangGraph] [CrewAI] [OpenAI SDK] [RAG] [MCP] [FastAPI] [Docker] [Groq] [QLoRA]

Geospatial
[Google Earth Engine] [QGIS] [Sentinel-1/2 SAR] [NASA GPM] [MERIT Hydro] [Streamlit]

Policy & Research
[Policy Brief Writing] [Chicago Citations] [M&E Frameworks] [Kobo Toolbox] [Survey Design] [PLFS Analysis]

Visualisation
[Plotly] [matplotlib] [seaborn] [Power BI] [Tableau] [Canva]

DevOps & Cloud
[Git/GitHub] [Docker] [Google Colab] [AWS] [GCP] [Azure] [SQL] [MySQL]
```

Pill badge style: `background: var(--bg-raised)`, `border: 1px solid var(--border-subtle)`, `color: var(--text-secondary)`, `font-family: JetBrains Mono`, `border-radius: 6px`, `padding: 4px 10px`.

Hover: border transitions to `var(--border-active)`, text to `var(--text-primary)`, subtle amber glow.

Entrance animation: pills stagger-fade in from below using `IntersectionObserver` when section scrolls into view.

### 6. Education Section

Two cards side by side (stacked on mobile).

**Card 1:**
- PG Diploma in Social Sciences
- Chanakya University · Bengaluru · Oct 2025
- Coursework tags: `Research Methods` `Public Policy` `International Security` `Evaluation Frameworks`

**Card 2:**
- B.E. Electrical & Electronics Engineering — First Class with Distinction
- Sir MVIT · Bengaluru · Feb 2020
- Note: 1st Prize Final Year Project — 1 kWh IoT Vertical Axis Wind Turbine

Card style: `var(--bg-surface)`, amber left-border accent (3px), hover lifts with `box-shadow: var(--glow-card)`.

### 7. Certifications Section

Horizontal scrollable row on mobile, 3-column grid on desktop.

Each cert is a compact card:
```
┌──────────────────────────────┐
│ [Cert Name]                  │
│ [Issuer — muted]  [Date]     │
└──────────────────────────────┘
```

Completed certs:
- Policy Bootcamp Certificate | GRAAM / Chanakya University | May 2026
- Data Modeling and Prediction with R | Duke University / Coursera | Mar 2026
- Microsoft Power BI Desktop | AnalystBuilder | Mar 2026
- Introduction to Data Science in Python | U of Michigan / Coursera | Jan 2026
- Data Tidying and Importing with R | Duke University / Coursera | Jan 2026
- Data Visualization with R | Duke University / Coursera | Dec 2025
- MySQL for Data Analytics | AnalystBuilder | Feb 2026
- Rationality of War and Game Theory | IFPD | Dec 2025
- Programming DSA Python — Elite | NPTEL / IIT Madras | 2018
- IoT — Elite | NPTEL / IIT Kharagpur | 2018
- C++ — Elite | NPTEL / IIT Kharagpur | 2017

In Progress (distinct styling — dashed border, amber badge "In Progress"):
- AI Engineer Core Track | Udemy
- AI Engineer Agentic Track | Udemy
- AI Engineer Production Track | Udemy
- LangChain Agentic AI Engineering | Udemy
- PyTorch for Deep Learning | Udemy
- Machine Learning NLP V2 | Udemy
- Map Academy QGIS | Udemy

### 8. Contact Section

Minimal. Two items only — no social media.

```
[✉]  shashankv285@gmail.com
[📱]  +91 9060466628 (WhatsApp)
```

Below: the avatar chat CTA card (same style as Akash's "Chat with my AI Twin" card):
```
┌───────────────────────────────────────────────────┐
│ [🤖]  Chat with my Digital Twin                   │
│       Ask about my work, projects, or background  │
│       — click the chat button below               │
└───────────────────────────────────────────────────┘
```

Note at bottom: "Not on LinkedIn, Instagram, or Twitter. Email or WhatsApp only."

---

## Avatar Chat Widget

The existing avatar backend runs at `http://localhost:8000` (or the fly.io deployment URL in production). Embed it as a floating widget:

- **Trigger button:** fixed bottom-right, 56px circle, amber background, robot/chat icon
- **Chat panel:** slides up from bottom-right, 380px wide × 520px tall, `var(--bg-glass)` with `backdrop-filter: blur(20px)`, amber border
- **Implementation:** embed via `<iframe src="http://localhost:8000" />` inside the panel, or use the avatar's API directly if CORS is configured

The trigger button uses Shashank's photo (`pic.jpg`) as the avatar icon (circular crop, amber ring) — matching the avatar-human treatment.

---

## Animations & Interactions

### Scroll Reveal
Use `IntersectionObserver` with `threshold: 0.15`. Elements enter from `translateY(24px), opacity: 0` to `translateY(0), opacity: 1` over `500ms`. Stagger children by `80ms` each. Respect `prefers-reduced-motion`.

### Card Expand (Experience)
```css
.card-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 380ms cubic-bezier(0.4, 0, 0.2, 1);
}
.card.expanded .card-body {
  max-height: 600px;
}
```
Chevron: `transition: transform 300ms ease`. Rotates 180° on expand.

### Card Flip (Projects)
```css
.project-card-inner {
  transform-style: preserve-3d;
  transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
.project-card.flipped .project-card-inner {
  transform: rotateY(180deg);
}
.project-card-back {
  transform: rotateY(180deg);
  backface-visibility: hidden;
}
```

### Hover States
- Cards: `transform: translateY(-4px)`, `box-shadow: var(--glow-card)` on hover, `transition: 200ms ease`
- Skill pills: border and text colour transition `150ms ease`
- Nav links: amber underline slides in from left `200ms ease`

### Hero Name Entrance
Letters animate in with a stagger using `animation: slideUp 600ms ease forwards` per character, delayed by index × 40ms. Subtle amber glow pulses behind the name on load, fades after 2s.

---

## Technical Implementation

### Stack
- Pure HTML5 + CSS3 + Vanilla JS (no framework dependency)
- Single `index.html` file with embedded `<style>` and `<script>` tags, OR
- Separate `styles.css` and `main.js` with `index.html` — either is acceptable

### File Structure
```
portfolio/
├── index.html
├── styles.css          (or embedded in index.html)
├── main.js             (or embedded in index.html)
├── assets/
│   ├── pic.jpg         (copy of knowledge/pic.jpg)
│   └── resume.pdf      (Shashank_Venkatesh_resume.pdf)
└── README.md
```

### Responsive Breakpoints
```css
/* Mobile first */
/* Tablet */
@media (min-width: 768px) { ... }
/* Desktop */
@media (min-width: 1024px) { ... }
/* Wide */
@media (min-width: 1280px) { ... }
```

### Performance
- All Google Fonts loaded with `display=swap`
- Images: use `loading="lazy"` where applicable
- Animations use `transform` and `opacity` only (GPU-composited, no layout thrashing)
- `will-change: transform` on animated cards only during interaction, removed after

---

## Content: Do Not Fabricate

All content must come from the provided source files:
- `knowledge/knowledge.md` — primary source
- `knowledge/faq.jsonl` — supplementary
- `knowledge/style.md` — voice and contact rules
- Resume PDF (Shashank_Venkatesh.pdf) — experience and education details

**Contact rules (from style.md — strictly enforced):**
- Email: shashankv285@gmail.com
- WhatsApp: +91 9060466628
- NO LinkedIn link
- NO Instagram, Facebook, Twitter, or any social media
- Any mention of social media must say explicitly: "Not on social media"

---

## Success Criteria

### Visual
- [ ] Background is near-black with green undertone (`#050a07` or close), NOT white or light grey
- [ ] Primary accent is amber/gold (`#e8a020` or close), NOT blue or purple
- [ ] All section headings use Space Grotesk 700+
- [ ] Body text uses Inter, monospace labels use JetBrains Mono
- [ ] No white backgrounds anywhere on the page
- [ ] Colour scheme is visually distinct from the reference site (no blue-purple gradients)
- [ ] Hero section has a radial amber glow behind the name
- [ ] Background has a subtle dot or grid texture visible against the near-black base

### Navigation
- [ ] Fixed navbar visible at all scroll positions
- [ ] All 6 nav links (Experience, Projects, Skills, Education, Certifications, Contact) present
- [ ] Clicking a nav link smooth-scrolls to the correct section
- [ ] Active section highlights the correct nav link
- [ ] Mobile hamburger menu works and all links navigate correctly

### Experience Cards
- [ ] All 4 experience entries present with correct dates and organisations
- [ ] Cards start collapsed, showing only role + org + date
- [ ] Clicking a card expands it with bullet points
- [ ] Expand animation is smooth (no jump)
- [ ] Chevron icon rotates on expand/collapse
- [ ] Clicking again collapses the card

### Project Cards
- [ ] All 6 projects present with correct names and descriptions
- [ ] Cards show front face by default (name + tagline + date)
- [ ] Clicking flips the card to show description + tech tags + links
- [ ] Flip animation is smooth 3D rotation (not a fade or slide)
- [ ] Clicking again flips back
- [ ] Tech stack tags render as pill badges in cyan

### Skills
- [ ] All 6 domain groups present with correct labels
- [ ] All skill pills render correctly
- [ ] Hover state changes border and text colour
- [ ] Stagger entrance animation triggers on scroll into view

### Education
- [ ] Both education entries present (PG Diploma + B.E.)
- [ ] Correct institutions, dates, and coursework tags

### Certifications
- [ ] All 11 completed certs present
- [ ] All 7 in-progress certs present with distinct styling (dashed border / badge)

### Contact
- [ ] Email link present and correct (shashankv285@gmail.com)
- [ ] WhatsApp number present (+91 9060466628)
- [ ] NO LinkedIn, Instagram, Twitter, or Facebook links anywhere on the page
- [ ] "Not on social media" note present

### Chat Widget
- [ ] Floating trigger button visible in bottom-right corner
- [ ] Clicking opens the chat panel
- [ ] Chat panel displays correctly without overflow
- [ ] Clicking trigger again closes the panel

### Responsive
- [ ] Page renders correctly at 375px (iPhone SE)
- [ ] Page renders correctly at 768px (tablet)
- [ ] Page renders correctly at 1280px (desktop)
- [ ] No horizontal scroll at any breakpoint
- [ ] Nav collapses to hamburger at mobile width

### Performance & Accessibility
- [ ] All images have `alt` attributes
- [ ] All interactive elements are keyboard-focusable
- [ ] Focus rings visible on keyboard navigation
- [ ] `prefers-reduced-motion` media query reduces/removes animations
- [ ] Page loads in under 3 seconds on a standard connection
- [ ] No console errors on load

---

## Tests to Run

### 1. Build verification
```bash
# Open index.html in browser — should load with no console errors
open portfolio/index.html
# Or serve locally:
python3 -m http.server 3000 --directory portfolio/
# Then visit http://localhost:3000
```

### 2. Link validation
```bash
# Check all internal anchor links resolve correctly
grep -o 'href="#[^"]*"' portfolio/index.html
# Each href="#section-id" must have a matching id="section-id" in the HTML
```

### 3. Content completeness check
```bash
# Verify all experience entries present
grep -c "Varahe Analytics\|Chanakya University\|GRAAM\|KPCL\|Karnataka Power" portfolio/index.html
# Should return 5 (each org appears at least once)

# Verify all 6 projects present
grep -c "Flood Risk\|Ramsar\|Humanis\|LangChain\|Energy Transition\|GRAAM Field Survey" portfolio/index.html
# Should return 6

# Verify no social media links
grep -i "linkedin\|instagram\|twitter\|facebook" portfolio/index.html
# Should return nothing (or only the "not on social media" note — no href links)

# Verify correct contact details
grep "shashankv285@gmail.com" portfolio/index.html   # must return 1+
grep "9060466628" portfolio/index.html               # must return 1+
```

### 4. Colour theme check
```bash
# Verify dark background colours are used
grep -c "#050a07\|#0a110c\|#111a13" portfolio/styles.css
# Should return 3+

# Verify no white backgrounds
grep "background.*#fff\|background.*white\|background-color.*#fff" portfolio/styles.css
# Should return nothing
```

### 5. Animation check
```bash
# Verify key animation properties present
grep "cubic-bezier\|transition\|transform\|IntersectionObserver" portfolio/main.js
# Should return multiple matches

# Verify prefers-reduced-motion is handled
grep "prefers-reduced-motion" portfolio/styles.css
# Should return 1+
```

### 6. Responsive check
```bash
# Verify breakpoints present
grep "@media" portfolio/styles.css
# Should return 3+ (768px, 1024px, 1280px)
```

### 7. Avatar widget check
```bash
# Verify chat widget trigger button present
grep -i "chat\|avatar\|twin\|localhost:8000\|fly.dev" portfolio/index.html
# Should return 1+
```

### 8. Visual regression (manual)
Open `http://localhost:3000` and verify:
- [ ] Background is dark green-black, NOT white or light
- [ ] Name renders large in Space Grotesk
- [ ] Amber glow visible behind hero name
- [ ] Clicking an experience card expands smoothly
- [ ] Clicking a project card flips in 3D
- [ ] Chat button visible bottom-right
- [ ] No content overflows any card
- [ ] Mobile view (DevTools → 375px) has no horizontal scroll

---

## Claude Code Prompt to Use

Open Claude Code in the project directory and run with `--dangerously-skip-permissions`:

```
Build a single-page portfolio website for Shashank Venkatesh (Tailapa) following 
the spec in PORTFOLIO_SKILL.md exactly.

Key requirements:
- Dark near-black background (#050a07) with amber accent (#e8a020) — NOT blue/purple
- Space Grotesk + Inter + JetBrains Mono typography
- Experience cards: click to expand vertically with chevron rotation
- Project cards: click to flip in 3D (CSS rotateY transform)
- Skill pills with stagger entrance on scroll
- Floating chat widget bottom-right linking to the avatar at localhost:8000
- All content from knowledge/knowledge.md and the resume — do not fabricate
- NO LinkedIn, Instagram, Twitter, or Facebook anywhere
- Contact: shashankv285@gmail.com and +91 9060466628 (WhatsApp) only

After building, run all tests from the Tests section of PORTFOLIO_SKILL.md and 
report results. Fix any failures before considering the task complete.
```
