"""
Generate avatar images from knowledge/pic.jpg.

Produces three files:
  avatar-human.png       — natural square crop (900x900)
  avatar-robot.png       — duotone twin with HUD corner brackets (900x900)
  avatar-robot-round.png — duotone twin with circular mask + inner ring (900x900)

Run from the repo root:
  python scripts/generate_avatars.py

Or with explicit paths:
  python scripts/generate_avatars.py --src knowledge/pic.jpg --out frontend/public
"""

import argparse
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# --- Duotone ramp (luminance 0..1 → RGB) ---
RAMP = [
    (0.00, (0x02, 0x0d, 0x1e)),
    (0.20, (0x05, 0x1d, 0x3a)),
    (0.40, (0x0a, 0x3d, 0x5c)),
    (0.55, (0x16, 0x68, 0x96)),
    (0.70, (0x2c, 0x96, 0xc4)),
    (0.85, (0x7d, 0xcd, 0xec)),
    (1.00, (0xe4, 0xf6, 0xff)),
]

CYAN = (0x2c, 0x96, 0xc4)
AMBER = (0xec, 0xad, 0x0a)
NEAR_BLACK = (0x02, 0x0d, 0x1e)
NEAR_WHITE = (0xe4, 0xf6, 0xff)

SIZE = 900
CROP_BOX = (600, 416, 2400, 2216)  # (left, top, right, bottom) on 3049×3049 source


def _lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def _build_lut():
    """Build 256-entry LUT mapping grayscale value → (R,G,B)."""
    lut = []
    for v in range(256):
        lum = v / 255.0
        for i in range(len(RAMP) - 1):
            l0, c0 = RAMP[i]
            l1, c1 = RAMP[i + 1]
            if lum <= l1:
                t = (lum - l0) / (l1 - l0) if l1 > l0 else 0
                lut.append(_lerp_color(c0, c1, t))
                break
        else:
            lut.append(RAMP[-1][1])
    return lut


LUT = _build_lut()


def apply_duotone(img: Image.Image) -> Image.Image:
    gray = img.convert("L")
    arr = np.array(gray, dtype=np.uint8)
    h, w = arr.shape
    r = np.array([LUT[v][0] for v in arr.flat], dtype=np.uint8).reshape(h, w)
    g = np.array([LUT[v][1] for v in arr.flat], dtype=np.uint8).reshape(h, w)
    b = np.array([LUT[v][2] for v in arr.flat], dtype=np.uint8).reshape(h, w)
    return Image.fromarray(np.stack([r, g, b], axis=-1), "RGB")


def apply_posterize_bands(img: Image.Image, bands: int = 18) -> Image.Image:
    """Posterize luminance to N discrete bands (cel-shaded look)."""
    arr = np.array(img, dtype=np.float32)
    lum = (
        0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]
    ) / 255.0
    quantised = (np.floor(lum * bands) / bands).clip(0, 1)
    factor = np.where(lum > 0, quantised / np.maximum(lum, 1e-6), 1.0)
    result = (arr * factor[:, :, np.newaxis]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(result, "RGB")


def add_scanlines(img: Image.Image) -> Image.Image:
    arr = np.array(img, dtype=np.float32)
    for y in range(0, arr.shape[0], 3):
        arr[y] = arr[y] * (1 - 0.25)
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


def add_grid(img: Image.Image) -> Image.Image:
    arr = np.array(img, dtype=np.float32)
    cy, cx = CYAN[0] * 0.08, CYAN[1] * 0.08
    # horizontal lines
    for y in range(0, arr.shape[0], 60):
        arr[y, :, 0] = arr[y, :, 0] * (1 - 0.08) + CYAN[0] * 0.08
        arr[y, :, 1] = arr[y, :, 1] * (1 - 0.08) + CYAN[1] * 0.08
        arr[y, :, 2] = arr[y, :, 2] * (1 - 0.08) + CYAN[2] * 0.08
    # vertical lines
    for x in range(0, arr.shape[1], 60):
        arr[:, x, 0] = arr[:, x, 0] * (1 - 0.08) + CYAN[0] * 0.08
        arr[:, x, 1] = arr[:, x, 1] * (1 - 0.08) + CYAN[1] * 0.08
        arr[:, x, 2] = arr[:, x, 2] * (1 - 0.08) + CYAN[2] * 0.08
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


def add_diagonal_lines(img: Image.Image) -> Image.Image:
    overlay = Image.new("RGB", img.size, (0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = img.size
    for offset in [-100, 0, 100]:
        # upper-left diagonal
        draw.line(
            [(0, h // 3 + offset), (w // 3 + offset, 0)],
            fill=CYAN,
            width=2,
        )
        # lower-right diagonal
        draw.line(
            [(w, h * 2 // 3 + offset), (w * 2 // 3 + offset, h)],
            fill=CYAN,
            width=2,
        )
    arr_img = np.array(img, dtype=np.float32)
    arr_ov = np.array(overlay, dtype=np.float32)
    result = (arr_img * (1 - 0.06) + arr_ov * 0.06).clip(0, 255).astype(np.uint8)
    return Image.fromarray(result, "RGB")


def add_eye_glows(img: Image.Image) -> Image.Image:
    # Eyes in the cropped 900×900 frame (approximately)
    eyes = [(355, 340), (545, 340)]
    arr = np.array(img, dtype=np.float32)
    h, w = arr.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]

    for ex, ey in eyes:
        for radius, color, opacity in [
            (28, CYAN, 0.45),
            (12, NEAR_WHITE, 0.65),
            (4, (0xFF, 0xFF, 0xFF), 0.90),
        ]:
            dist = np.sqrt((xs - ex) ** 2 + (ys - ey) ** 2)
            mask = (dist <= radius).astype(np.float32) * opacity
            for c, col in enumerate(color):
                arr[:, :, c] = arr[:, :, c] * (1 - mask) + col * mask

    # Optional tilak amber accent glow (y≈290, x≈450)
    tx, ty = 450, 290
    dist = np.sqrt((xs - tx) ** 2 + (ys - ty) ** 2)
    mask = (dist <= 10).astype(np.float32) * 0.30
    for c, col in enumerate(AMBER):
        arr[:, :, c] = arr[:, :, c] * (1 - mask) + col * mask

    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


def add_hud_frame_square(img: Image.Image) -> Image.Image:
    """Cyan corner brackets + thin border line."""
    out = img.copy()
    draw = ImageDraw.Draw(out)
    w, h = out.size
    arm = 60
    stroke = 2
    inset = 8

    # Thin border inset
    border_color = (*CYAN, int(0.15 * 255))
    border_img = Image.new("RGBA", out.size, (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(border_img)
    bdraw.rectangle(
        [inset, inset, w - inset - 1, h - inset - 1],
        outline=(*CYAN, int(0.15 * 255)),
        width=1,
    )
    out = out.convert("RGBA")
    out = Image.alpha_composite(out, border_img)
    draw = ImageDraw.Draw(out)

    def bracket(cx, cy, dx, dy):
        # horizontal arm
        draw.line([(cx, cy), (cx + dx * arm, cy)], fill=(*CYAN, 255), width=stroke)
        # vertical arm
        draw.line([(cx, cy), (cx, cy + dy * arm)], fill=(*CYAN, 255), width=stroke)

    bracket(0, 0, 1, 1)
    bracket(w - 1, 0, -1, 1)
    bracket(0, h - 1, 1, -1)
    bracket(w - 1, h - 1, -1, -1)

    # Amber tick at top-right bracket
    draw.line([(w - 1 - arm, 0), (w - 1 - arm - 20, 0)], fill=(*AMBER, 255), width=2)

    return out.convert("RGB")


def add_hud_frame_round(img: Image.Image) -> Image.Image:
    """Circular alpha mask + inner cyan ring + radial vignette."""
    w, h = img.size
    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # Circular mask
    mask = Image.new("L", (w, h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.ellipse([0, 0, w - 1, h - 1], fill=255)
    result.paste(img.convert("RGBA"), (0, 0), mask)

    # Radial vignette (multiply blend)
    cx, cy = w / 2, h / 2
    arr = np.array(result, dtype=np.float32)
    ys, xs = np.mgrid[0:h, 0:w]
    dist = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / (w / 2)
    vignette = np.clip(dist * 0.55, 0, 0.55)[:, :, np.newaxis]
    # Darken towards edges (multiply with near-black)
    for c in range(3):
        arr[:, :, c] = arr[:, :, c] * (1 - vignette[:, :, 0]) + NEAR_BLACK[c] * vignette[:, :, 0]
    arr[:, :, 3] = np.array(result)[:, :, 3]
    result = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")

    # Inner cyan ring
    ring_draw = ImageDraw.Draw(result)
    ring_inset = 6
    ring_draw.ellipse(
        [ring_inset, ring_inset, w - ring_inset - 1, h - ring_inset - 1],
        outline=(*CYAN, 220),
        width=3,
    )

    return result


def generate_human(src: Image.Image) -> Image.Image:
    """Natural square crop, no colour treatment."""
    cropped = src.crop(CROP_BOX).resize((SIZE, SIZE), Image.LANCZOS)
    return cropped


def generate_robot(src: Image.Image) -> Image.Image:
    cropped = src.crop(CROP_BOX).resize((SIZE, SIZE), Image.LANCZOS)
    img = apply_duotone(cropped)
    img = img.filter(ImageFilter.BoxBlur(3))
    img = apply_posterize_bands(img, 18)
    img = add_scanlines(img)
    img = add_grid(img)
    img = add_diagonal_lines(img)
    img = add_eye_glows(img)
    img = add_hud_frame_square(img)
    return img


def generate_robot_round(src: Image.Image) -> Image.Image:
    cropped = src.crop(CROP_BOX).resize((SIZE, SIZE), Image.LANCZOS)
    img = apply_duotone(cropped)
    img = img.filter(ImageFilter.BoxBlur(3))
    img = apply_posterize_bands(img, 18)
    img = add_scanlines(img)
    img = add_grid(img)
    img = add_hud_frame_round(img)
    return img


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--src",
        default=os.path.join(os.path.dirname(__file__), "..", "knowledge", "pic.jpg"),
    )
    parser.add_argument(
        "--out",
        default=os.path.join(
            os.path.dirname(__file__), "..", "frontend", "public"
        ),
    )
    args = parser.parse_args()

    src_path = os.path.abspath(args.src)
    out_dir = os.path.abspath(args.out)

    print(f"Source: {src_path}")
    print(f"Output: {out_dir}")

    src = Image.open(src_path).convert("RGB")
    print(f"Source size: {src.size}")

    os.makedirs(out_dir, exist_ok=True)

    human = generate_human(src)
    human_path = os.path.join(out_dir, "avatar-human.png")
    human.save(human_path, "PNG")
    print(f"Saved {human_path}")

    robot = generate_robot(src)
    robot_path = os.path.join(out_dir, "avatar-robot.png")
    robot.save(robot_path, "PNG")
    print(f"Saved {robot_path}")

    robot_round = generate_robot_round(src)
    robot_round_path = os.path.join(out_dir, "avatar-robot-round.png")
    robot_round.save(robot_round_path, "PNG")
    print(f"Saved {robot_round_path}")

    print("Done.")


if __name__ == "__main__":
    main()
