# Avatar generation recipe

The Avatar's icon is the owner's real photo (`knowledge/pic.jpg`) rebuilt as a **synthetic digital
twin**. It is produced programmatically so the twin reads as clearly synthetic while remaining
recognisably the same person. Three files are produced into `assets/`:

- `avatar-human.png` — natural square crop of the real photo (the **human** icon).
- `avatar-robot.png` — the twin, square, with a HUD frame (hero / showcase use).
- `avatar-robot-round.png` — the twin tuned for circular chat avatars (inner ring, vignette,
  no corner brackets).

---

## Source image notes (`pic.jpg`)

- **Dimensions:** 3049×3049 px (already square — no aspect-ratio crop needed)
- **Subject:** man in cream linen shirt, arms crossed, slight smile, red tilak on forehead
- **Eyes:** approximately y ≈ 1100 px from top (≈ 36% from top), horizontally centred near x ≈ 1500 px
- **Background:** natural green bokeh (trees, leaves) — **do not remove**; the foliage shifts well
  through the duotone ramp and reinforces the environmental/geospatial identity
- **Lighting:** soft outdoor diffused light, face well-exposed with warm undertones

---

## Crop

The source is already square. Tight-crop to a face-and-shoulders frame:

- Side ≈ **1800 px**, centred at x ≈ 1500 px
- Top edge set so eyes land at **38% from top**: `top = eyeY − 0.38 × side` ≈ `top ≈ 416 px`
- Crop box: `(600, 416, 2400, 2216)` — adjust ±50 px to taste
- Resize output to **900×900 px**

This keeps the arms-crossed posture in frame, which reads well as the human icon.

---

## `avatar-human.png` — natural crop

Apply the crop above. No colour treatment. Save as PNG at 900×900.

Used for: human message bubbles and admin owner chip (rendered with yellow ring in `.avatar-human`).

---

## Twin treatment — "synthetic chrome on green"

The green bokeh background is **preserved and treated** rather than removed. It shifts to a
deep teal-navy through the duotone, which pairs cleanly with the cyan HUD elements and gives
the twin a distinctive field-operative aesthetic.

### Step 1 — Duotone ramp

Apply a luminance-mapped duotone through a cool navy→cyan ramp. Map the full tonal range:

| Luminance | Colour |
|---|---|
| 0 (black) | `#020d1e` |
| 20% | `#051d3a` |
| 40% | `#0a3d5c` |
| 55% | `#166896` |
| 70% | `#2c96c4` |
| 85% | `#7dcdec` |
| 100% (white) | `#e4f6ff` |

The green bokeh background maps to mid-range teal tones (`#0a3d5c`–`#2c96c4`). The cream
shirt maps to near-white cyan. Warm skin tones map to the mid-cyan band. The red tilak will
shift to a bright cyan highlight — leave it; it becomes a distinctive marker on the twin.

### Step 2 — Smooth and posterise

- Box-blur radius **r = 3** (slightly larger than the default due to the high source resolution)
  to kill JPEG compression artefacts before quantisation
- Posterise luminance to **~18 bands** for a panelled, cel-shaded look
- The bokeh background posterises to clean flat teal planes — intentional

### Step 3 — Background: no removal

Do **not** flood-fill or alpha-mask the background. The treated green-to-teal bokeh is part of
the aesthetic. Skip the background removal step entirely.

### Step 4 — Scanlines and panelling seams

- **Scanlines:** 1 px darken at 25% opacity every 3 px (horizontal)
- **Panelling seams:** faint cyan grid at 60 px intervals, 8% opacity, composited `source-atop`
- **Diagonal accent lines:** 2–3 diagonal lines at ±30°, 6% opacity, cyan, crossing the upper
  left and lower right quadrants

### Step 5 — Glowing eyes

Locate both eyes in the cropped 900×900 frame (approximately y ≈ 340 px, left eye x ≈ 355 px,
right eye x ≈ 545 px — verify against the crop).

Apply per eye:
- Outer radial glow: radius 28 px, `#2c96c4` at 45% opacity
- Inner radial glow: radius 12 px, `#7dcdec` at 65% opacity
- Core dot: radius 4 px, `#e4f6ff` at 90% opacity

The tilak position (y ≈ 290 px, x ≈ 450 px) can optionally receive a small accent glow in
amber `#ecad0a` at 30% opacity — this preserves the cultural marker as a distinctive detail
on the twin.

### Step 6 — Backdrop

No separate backdrop is needed since the background is preserved and treated in Step 1. If
a fill is required for any transparency at the edges, use `#020d1e`.

### Step 7 — HUD frame

**Square variant (`avatar-robot.png`):**
- Cyan corner brackets (`#2c96c4`, 2 px stroke, 60 px arm length) at all four corners
- One amber tick mark (`#ecad0a`, 2 px, 20 px length) at the top-right bracket — references
  the accent yellow from the site palette
- Thin cyan border line inset 8 px from edge, 15% opacity

**Round variant (`avatar-robot-round.png`):**
- Crop the 900×900 twin to a circle (circular alpha mask)
- Inner cyan ring: 3 px stroke, `#2c96c4`, inset 6 px from edge
- Radial vignette: `#020d1e` at 0% centre → 55% at edges, blended `multiply`
- No corner brackets

---

## Usage

| Context | File | CSS class | Ring colour |
|---|---|---|---|
| Human messages / admin owner chip | `avatar-human.png` | `.avatar-human` | Yellow `#ecad0a` |
| Avatar (twin) messages | `avatar-robot-round.png` | `.avatar-twin` | Cyan `#2c96c4` |
| Hero / identity showcase | `avatar-robot.png` | — (framed square) | — |

---

## Tuning notes

- If the cream shirt posterises too flat (loses texture), reduce posterise bands to 22 and
  increase blur to r = 4 before quantising
- The arms-crossed posture makes the lower third of the square crop feel heavy — if
  composing for a narrow display, crop tighter to `(700, 416, 2300, 2116)` and resize to 900×900
- The tilak accent glow in amber is optional but recommended: it makes the twin immediately
  distinguishable from any other synthetic portrait and keeps a culturally specific marker
- Keep the result **recognisably Shashank**, clearly **synthetic**, and **cool/blue-teal** to
  read as the digital twin
