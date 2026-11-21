#!/usr/bin/env python3
"""
The Heavy Light passage on /making (`components/making-heavy.tsx`), from the
author's files in "5 MAKING":

    python3 scripts/making-heavy.py "<...\\5 MAKING>" [out dir]

Since 2026-11-21 the passage stands on the page's dark (#202020):

- **The photograph**, "Heav Light _Black.jpg" (5030 x 2466, the piece on a
  dark marble table, on #202020): the same photograph as the old white one
  ("Heavy Light WIP steps.png", 4326 x 2214) at the same scale, moved by
  `SHIFT` (found by matching the two). It is written in the old one's frame,
  4326 x 2214, so every place in the passage, measured in that frame's pixels
  (see the component), still holds: what the new one lacks on the left is the
  page's dark, and its own left edge fades into that dark over `LEFT_FADE`.
  public/images/making/heavy/still-<w>.avif at `STILL_WIDTHS`.
- **The four turning models**, "Secvente WIP HeavyLight/<m>_Model0000..0027.png"
  (373/374 x 1084, RGBA, each turning a quarter round, front to side): kept
  transparent and **light rather than sharp**, the author's asking: a smooth
  movement matters more than a crisp frame. Two heights, `FRAME_HEIGHTS`, at a
  low AVIF quality: public/images/making/heavy/<h>/<m>-00..27.avif.
- **Their floor becomes a shadow**: the render's floor round each base is a
  light grey (about 190, the old photograph's table); on the dark it would
  stand as a light oval. Its pixels (under 255 opacity, from a little above
  the base down) are made a near black at `SHADOW` of their opacity, so each
  model stands on a soft dark shadow instead.
- **The shadows are feathered at the frame's sides**: the render cut them at
  its crop, which would show as a straight edge on the page.
- **4_Model's wood toned to the photograph's** (2026-11-21, the author's
  asking: the render's wood was washed out, whiter than the photograph's):
  its colours are moved, channel by channel, to the mean and spread of the
  photographed piece's wood (`wood_stats`), then darkened by `WOOD_DARKEN`.
  Only the model itself, not its floor. **Shaded as the photographed piece
  is** (the author's asking: it looked pasted on, then, drawn towards #202020,
  washed out at its foot, its geometry too plain at the lower right): its
  colours are drawn towards a very dark brown (`SHADE_TONE`, the photograph's
  shadowed wood): from its base up over `FOOT_SHADE[0]` of its height,
  `FOOT_SHADE[1]` of the way at the base; and towards its right side, as the
  light falls from the left in the photograph (from `SIDE_SHADE[0]` of each
  row's width, `SIDE_SHADE[1]` of the way at the right edge, more so lower down).

Until 2026-11-21: the white photograph whole, the floors left light
(`scripts/making-heavy.inainte-2026-11-21.py.txt`).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

STILL_WIDTHS = {2400: 62, 1400: 60}  # width: AVIF quality
FRAME_HEIGHTS = {800: 50, 540: 48}  # height: AVIF quality
FRAME = (4326, 2214)  # the old photograph's frame, in which the component measures
SHIFT = (353, -253)  # where the new photograph's (0, 0) falls in that frame
LEFT_FADE = 450  # px of the new photograph's left edge fading into the dark
GROUND = 32
SHADOW = 0.55
SHADOW_TONE = 8
MODELS = "1234"
WOOD_TONED = "4"
WOOD_DARKEN = 0.75
FOOT_SHADE = (0.5, 0.85)  # share of the model's height, strength at the base
SIDE_SHADE = (0.4, 0.75)  # from this share of each row's width, strength at the right edge
SHADE_TONE = np.array([38, 29, 21], np.float32)  # the photograph's shadowed wood
WOOD_REGION = (300, 1750, 850, 1300)  # the piece's body in the new photograph: rows, columns
FRAMES = 28
FEATHER = 48  # px of the source frame, at each side, under the base


def still_in_frame(src: Path) -> Image.Image:
    n = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    W, H = FRAME
    dx, dy = SHIFT
    c = np.full((H, W, 3), GROUND, np.float32)
    part = n[-dy : -dy + H, : W - dx]
    if part.shape[0] < H:
        part = np.concatenate([part, np.repeat(part[-1:], H - part.shape[0], 0)], 0)
    t = np.clip(np.arange(part.shape[1]) / LEFT_FADE, 0, 1)
    t = (t * t * (3 - 2 * t))[None, :, None]
    c[:, dx:] = GROUND + (part - GROUND) * t
    return Image.fromarray(np.round(c).clip(0, 255).astype(np.uint8))


def wood_stats(photo: Path, seq: Path):
    """The photographed piece's wood and 4_Model's, as RGB means and spreads."""
    import cv2

    y0, y1, x0, x1 = WOOD_REGION
    reg = np.asarray(Image.open(photo).convert("RGB"))[y0:y1, x0:x1]
    lab = cv2.cvtColor(reg, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, b = lab[..., 0], lab[..., 2] - 128
    m = (L > 40) & (b > 3) & ~((b > 20) & (L > 120))  # the wood: not the dark ground, not the gold sphere
    p = reg[m].astype(np.float32)
    q = np.concatenate([
        (lambda a: a[..., :3][a[..., 3] == 255])(np.asarray(Image.open(seq / f"{WOOD_TONED}_Model{i:04d}.png").convert("RGBA")))
        for i in range(0, FRAMES, 3)
    ]).astype(np.float32)
    return p.mean(0), p.std(0), q.mean(0), q.std(0)


def model_frame(im: Image.Image, wood=None) -> Image.Image:
    a = np.asarray(im).astype(np.float32).copy()
    al = a[..., 3]
    h, w = al.shape
    ys = np.where((al > 200).any(1))[0]
    base = ys.max()
    rows = np.arange(h)[:, None]
    under = rows >= base - 70
    if wood is not None:
        pm, ps, mm, ms = wood
        body = (~under | (al == 255)) & (al > 0)
        a[..., :3][body] = (((a[..., :3][body] - mm) / ms * ps + pm) * WOOD_DARKEN).clip(0, 255)
        solid = al == 255
        filled = np.where(solid.any(1))[0]
        top, foot = filled.min(), filled.max()
        reach = FOOT_SHADE[0] * (foot - top)
        v = np.clip((rows - (foot - reach)) / reach, 0, 1)
        v = v * v * (3 - 2 * v)
        left = np.where(solid.any(1), solid.argmax(1), 0).astype(np.float32)[:, None]
        right = np.where(solid.any(1), w - 1 - solid[:, ::-1].argmax(1), 0).astype(np.float32)[:, None]
        span = np.maximum(right - left, 1)
        xs = np.arange(w, dtype=np.float32)[None, :]
        side = np.clip((xs - (left + SIDE_SHADE[0] * span)) / ((1 - SIDE_SHADE[0]) * span), 0, 1)
        side = side * side * (3 - 2 * side)
        kv = v * FOOT_SHADE[1]
        ks = side * SIDE_SHADE[1] * (0.55 + 0.45 * v)
        k = (1 - (1 - kv) * (1 - ks)) * body
        a[..., :3] += (SHADE_TONE - a[..., :3]) * k[..., None]
    # The floor: a dark shadow, not a light oval.
    floor = under & (al < 255)
    a[..., :3][floor] = SHADOW_TONE
    al = np.where(floor, al * SHADOW, al)
    # Feathered at the sides, under the base.
    x = np.arange(w, dtype=np.float32)
    ramp = np.clip(np.minimum(x, w - 1 - x) / FEATHER, 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    al = np.where(under, al * ramp[None, :], al)
    a[..., 3] = al
    return Image.fromarray(np.round(a).clip(0, 255).astype(np.uint8), "RGBA")


def main(folder: str, out: str | None = None) -> None:
    src = Path(folder)
    dest = Path(out) if out else Path(__file__).resolve().parent.parent / "public/images/making/heavy"
    dest.mkdir(parents=True, exist_ok=True)
    still = still_in_frame(src / "Heav Light _Black.jpg")
    for w, q in STILL_WIDTHS.items():
        h = round(still.height * w / still.width)
        p = dest / f"still-{w}.avif"
        still.resize((w, h), Image.LANCZOS).save(p, quality=q, speed=4)
        print(f"still {w} x {h}: {p.stat().st_size // 1024} KB")
    seq = src / "Secvente WIP HeavyLight"
    wood = wood_stats(src / "Heav Light _Black.jpg", seq)
    for fh, q in FRAME_HEIGHTS.items():
        d = dest / str(fh)
        d.mkdir(parents=True, exist_ok=True)
        total = 0
        for m in MODELS:
            for i in range(FRAMES):
                im = model_frame(Image.open(seq / f"{m}_Model{i:04d}.png").convert("RGBA"), wood if m in WOOD_TONED else None)
                fw = round(im.width * fh / im.height)
                p = d / f"{m}-{i:02d}.avif"
                im.resize((fw, fh), Image.LANCZOS).save(p, quality=q, speed=4)
                total += p.stat().st_size
        print(f"frames {fh}: {len(MODELS) * FRAMES} files, {total // 1024} KB")


if __name__ == "__main__":
    main(*sys.argv[1:3])
