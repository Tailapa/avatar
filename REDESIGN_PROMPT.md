# Portfolio Redesign — Cyberpunk Elegant

## What to fix

The current design has the right dark base and amber accent but looks dated and boxy. Specific problems:

1. **Cards have visible rectangular borders** — remove ALL card borders. Cards defined by background elevation and subtle glow only, no strokes
2. **Scrollbar is grey** — replace with custom amber scrollbar
3. **Lacks depth, glow, and cyberpunk cinematic quality** — needs neon glow effects, glassmorphism, animated gradients, futuristic UI patterns

---

## Design direction: Cyberpunk Elegant

Reference: Cyberpunk 2077 game UI — neon glow, deep dark backgrounds, scanline textures, sharp typography — but restrained and elegant. "High-end night city" not "cheap neon sign".

**Keep:** dark background, amber accent, checkbox/dot grid background texture (this was praised — do not remove it)
**Remove:** all visible card borders, grey scrollbar, flat boxy feel
**Add:** everything specified below

---

## Core visual upgrades

### 1. Custom amber scrollbar
```css
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #050a07;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #e8a020, #a06010);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #e8a020;
}
* {
  scrollbar-width: thin;
  scrollbar-color: #e8a020 #050a07;
}
```

### 2. Card redesign — no borders, glow elevation only

Remove ALL `border` properties from every card. Cards distinguished purely by:
- Background: `rgba(16, 26, 18, 0.7)`
- Backdrop blur: `backdrop-filter: blur(12px) saturate(180%)`
- Default shadow: `box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(232,160,32,0.06) inset, 0 1px 0 rgba(232,160,32,0.1) inset`
- Hover shadow: `box-shadow: 0 8px 48px rgba(0,0,0,0.6), 0 0 32px rgba(232,160,32,0.08), 0 0 0 0.5px rgba(232,160,32,0.2) inset`
- No `border` property anywhere — remove all instances

Education card left accent: replace solid border with gradient glow pseudo-element:
```css
.edu-card {
  position: relative;
}
.edu-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10%;
  height: 80%;
  width: 2px;
  background: linear-gradient(180deg, transparent, #e8a020, transparent);
  box-shadow: 0 0 12px #e8a020, 0 0 24px rgba(232,160,32,0.4);
  border-radius: 0 2px 2px 0;
}
```

Gradient border on card hover using pseudo-element:
```css
.card {
  position: relative;
}
.card:hover::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(232,160,32,0.4), rgba(200,208,32,0.2), transparent 60%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### 3. Hero name — pulsing neon glow
```css
.hero-name {
  text-shadow: 
    0 0 20px rgba(232, 160, 32, 0.6),
    0 0 40px rgba(232, 160, 32, 0.3),
    0 0 80px rgba(232, 160, 32, 0.15);
  animation: namePulse 4s ease-in-out infinite;
}

@keyframes namePulse {
  0%, 100% { 
    text-shadow: 0 0 20px rgba(232,160,32,0.6), 0 0 40px rgba(232,160,32,0.3); 
  }
  50% { 
    text-shadow: 0 0 30px rgba(232,160,32,0.9), 0 0 60px rgba(232,160,32,0.5), 0 0 100px rgba(232,160,32,0.2); 
  }
}
```

Section headings get a subtler version:
```css
.section-heading {
  text-shadow: 0 0 30px rgba(232,160,32,0.25);
}
```

### 4. Gradient color ramps — cyberpunk palette

Primary ramp: `linear-gradient(135deg, #e8a020 0%, #c8d020 100%)`
Secondary ramp: `linear-gradient(135deg, #20e8c8 0%, #20a0c8 100%)`

Apply primary ramp to:
- Section heading underline accent
- CTA button backgrounds
- Active nav indicator dot/underline

Apply secondary ramp to:
- Skill pill gradient border on hover
- In-progress cert badge text

### 5. Scanline overlay — cinematic texture
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```
Faint cinematic scanlines at 3% opacity. Barely visible, adds depth.

### 6. Hero animated background glow
```css
.hero-bg-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(232,160,32,0.08) 0%, rgba(200,208,32,0.04) 40%, transparent 70%);
  animation: heroGlow 8s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes heroGlow {
  0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.15); }
}
```

### 7. Navbar — glassmorphism
```css
nav {
  background: rgba(5, 10, 7, 0.6);
  backdrop-filter: blur(20px) saturate(200%);
  border-bottom: none;
  box-shadow: 0 1px 0 rgba(232,160,32,0.08), 0 4px 30px rgba(0,0,0,0.3);
}

nav a:hover {
  color: #e8a020;
  text-shadow: 0 0 12px rgba(232,160,32,0.5);
  background: rgba(232,160,32,0.06);
  border-radius: 4px;
}
```

### 8. Skill pills — glow on hover, no border
```css
.skill-pill {
  background: rgba(16, 26, 18, 0.8);
  border: none;
  box-shadow: 0 0 0 0.5px rgba(232,160,32,0.12);
  transition: all 200ms ease;
}

.skill-pill:hover {
  box-shadow: 0 0 0 0.5px rgba(232,160,32,0.6), 0 0 16px rgba(232,160,32,0.2);
  color: #e8a020;
  text-shadow: 0 0 8px rgba(232,160,32,0.4);
  transform: translateY(-2px);
}
```

### 9. Ticker/marquee — edge fade mask
```css
.ticker-wrapper {
  -webkit-mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
  mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
}

.ticker-tag {
  border: none;
  box-shadow: 0 0 0 0.5px rgba(232,160,32,0.2), 0 0 8px rgba(232,160,32,0.05);
}
```

### 10. CTA buttons — gradient with glow
```css
.btn-primary {
  background: linear-gradient(135deg, #e8a020, #c8d020);
  color: #050a07;
  font-weight: 700;
  border: none;
  box-shadow: 0 0 20px rgba(232,160,32,0.3), 0 0 40px rgba(232,160,32,0.1);
  transition: all 200ms ease;
}

.btn-primary:hover {
  box-shadow: 0 0 30px rgba(232,160,32,0.5), 0 0 60px rgba(232,160,32,0.2);
  transform: translateY(-2px);
}
```

### 11. Section heading underline — gradient glow
```css
.section-accent {
  height: 3px;
  width: 48px;
  background: linear-gradient(90deg, #e8a020, #c8d020);
  box-shadow: 0 0 8px rgba(232,160,32,0.6), 0 0 16px rgba(232,160,32,0.3);
  border-radius: 2px;
  margin-top: 8px;
}
```

### 12. Experience timeline dot — pulsing glow
```css
.timeline-dot {
  background: #e8a020;
  box-shadow: 0 0 0 3px rgba(232,160,32,0.15), 0 0 12px rgba(232,160,32,0.5);
  animation: dotPulse 3s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { 
    box-shadow: 0 0 0 3px rgba(232,160,32,0.15), 0 0 12px rgba(232,160,32,0.5); 
  }
  50% { 
    box-shadow: 0 0 0 6px rgba(232,160,32,0.08), 0 0 20px rgba(232,160,32,0.7), 0 0 40px rgba(232,160,32,0.2); 
  }
}
```

### 13. Chat widget trigger — pulsing glow ring
```css
.chat-trigger {
  box-shadow: 0 0 0 2px rgba(232,160,32,0.3), 0 0 20px rgba(232,160,32,0.3), 0 0 40px rgba(232,160,32,0.1);
  animation: chatPulse 3s ease-in-out infinite;
}

@keyframes chatPulse {
  0%, 100% { 
    box-shadow: 0 0 0 2px rgba(232,160,32,0.3), 0 0 20px rgba(232,160,32,0.3); 
  }
  50% { 
    box-shadow: 0 0 0 4px rgba(232,160,32,0.15), 0 0 30px rgba(232,160,32,0.5), 0 0 60px rgba(232,160,32,0.15); 
  }
}
```

### 14. Digital twin chat panel — cyberpunk restyle

The avatar chat panel itself must also match the cyberpunk theme:

- Panel background: `rgba(5, 10, 7, 0.92)` + `backdrop-filter: blur(24px)`
- No visible border on panel — use glow shadow only: `box-shadow: 0 0 0 0.5px rgba(232,160,32,0.2), 0 0 60px rgba(232,160,32,0.1), -8px 0 40px rgba(0,0,0,0.5)`
- Chat header text: gradient clip — `background: linear-gradient(135deg, #e8a020, #c8d020); -webkit-background-clip: text; -webkit-text-fill-color: transparent`
- User message bubbles: `background: rgba(232,160,32,0.1)`, amber box-shadow glow
- Avatar message bubbles: `background: rgba(16,26,18,0.8)`, no border
- Input field focus: `box-shadow: 0 0 0 1px rgba(232,160,32,0.5), 0 0 12px rgba(232,160,32,0.15)`
- Send button: gradient amber background, glows on hover
- Scrollbar inside chat panel: same amber custom scrollbar as main page

---

## Reduced motion

All pulse and glow animations must be disabled for users who prefer reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  .hero-name,
  .timeline-dot,
  .chat-trigger,
  .hero-bg-glow,
  * {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## What to preserve

- Checkbox/dot grid background texture — do not remove or modify
- All content sections, card expand animations, project flip animations
- Dark `#050a07` base background
- Amber `#e8a020` as primary accent colour
- All existing section content

---

## After changes — rebuild

```powershell
docker rm -f avatar-app
docker build -t avatar-app .
docker run -d --name avatar-app -p 8000:8000 --env-file .env -v "F:\Agentic AI\avatar\knowledge:/app/knowledge:ro" avatar-app
```

Wait 90 seconds then check http://localhost:8000.

---

## Success criteria

- [ ] No visible rectangular card borders anywhere — cards defined by glow/elevation only
- [ ] Custom amber scrollbar visible on main page — no grey scrollbar
- [ ] Custom amber scrollbar inside chat panel — no grey scrollbar there either
- [ ] Hero name has pulsing amber text glow animation
- [ ] Section heading underlines are gradient (amber to gold-green) with box-shadow glow
- [ ] Skill pills: no border, box-shadow only, glow + translateY on hover
- [ ] Experience timeline dots have pulsing amber glow animation
- [ ] Ticker/marquee has left and right edge fade using CSS mask
- [ ] Ticker tags: no border, subtle box-shadow glow
- [ ] Primary CTA buttons use gradient background with glow shadow
- [ ] Navbar uses glassmorphism (backdrop-filter blur, no border-bottom)
- [ ] Scanline overlay present and subtle (repeating-linear-gradient on body::after)
- [ ] Hero section has animated radial background glow
- [ ] Education card left accent is gradient glow pseudo-element, not a solid border
- [ ] Chat trigger button has pulsing glow ring animation
- [ ] Dot/checkbox grid background texture preserved and visible
- [ ] Digital twin chat panel: dark glass background, no border, glow shadow only
- [ ] Digital twin chat panel: gradient amber header text
- [ ] Digital twin chat panel: amber-tinted user message bubbles
- [ ] Digital twin chat panel: amber glow on input focus
- [ ] Digital twin chat panel: amber custom scrollbar
- [ ] prefers-reduced-motion disables all pulse and glow animations
- [ ] No console errors on load
- [ ] Page renders correctly at 375px, 768px, and 1280px widths
- [ ] No horizontal scroll at any breakpoint
