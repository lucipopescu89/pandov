#!/usr/bin/env python3
"""
The Heavy Light passage on /making (`components/making-heavy.tsx`), from the
author's files in "5 MAKING" (2026-11-19):

    python3 scripts/making-heavy.py "<...\\5 MAKING>"

- **The photograph**, "Heavy Light WIP steps.png" (4326 x 2214): written whole
  as public/images/making/heavy/still-<w>.avif at `STILL_WIDTHS`. Every place
  in the passage is measured in its pixels (see the component).
- **The four turning models**, "Secvente WIP HeavyLight/<m>_Model0000..0027.png"
  (373/374 x 1084, RGBA, each turning a quarter round, front to side): kept
  transparent (they stand over the photograph's grey and their shadows fall on
  it), and **light rather than sharp**, the author's asking: a smooth movement
  matters more than a crisp frame. Two heights, `FRAME_HEIGHTS`, at a low AVIF
  quality: public/images/making/heavy/<h>/<m>-00..27.avif.
- **The shadows are feathered at the frame's sides**: the render cut them at
  its crop (alpha up to 47 in the edge column), which would show as a straight
  edge on the page.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

STILL_WIDTHS = {2400: 62, 1400: 60}  # width: AVIF quality
FRAME_HEIGHTS = {800: 50, 540: 48}  # height: AVIF quality
MODELS = "1234"
FRAMES = 28
FEATHER = 48  # px of the source frame, at each side, under the base
OUT = Path(__file__).resolve().parent.parent / "public/images/making/heavy"


def feather(im: Image.Image) -> Image.Image:
    a = np.asarray(im.getchannel("A")).astype(np.float32)
    h, w = a.shape
    ys = np.where((a > 200).any(1))[0]
    base = ys.max()
    x = np.arange(w, dtype=np.float32)
    ramp = np.clip(np.minimum(x, w - 1 - x) / FEATHER, 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    rows = np.arange(h)[:, None]
    # Only the shadow's rows (from a little above the base), so the figure itself is untouched.
    k = np.where(rows >= base - 70, ramp[None, :], 1.0)
    out = im.copy()
    out.putalpha(Image.fromarray(np.round(a * k).astype(np.uint8)))
    return out


def main(folder: str) -> None:
    src = Path(folder)
    OUT.mkdir(parents=True, exist_ok=True)
    still = Image.open(src / "Heavy Light WIP steps.png").convert("RGB")
    for w, q in STILL_WIDTHS.items():
        h = round(still.height * w / still.width)
        out = OUT / f"still-{w}.avif"
        still.resize((w, h), Image.LANCZOS).save(out, quality=q, speed=4)
        print(f"still {w} x {h}: {out.stat().st_size // 1024} KB")
    seq = src / "Secvente WIP HeavyLight"
    for fh, q in FRAME_HEIGHTS.items():
        d = OUT / str(fh)
        d.mkdir(parents=True, exist_ok=True)
        total = 0
        for m in MODELS:
            for i in range(FRAMES):
                im = feather(Image.open(seq / f"{m}_Model{i:04d}.png").convert("RGBA"))
                fw = round(im.width * fh / im.height)
                out = d / f"{m}-{i:02d}.avif"
                im.resize((fw, fh), Image.LANCZOS).save(out, quality=q, speed=4)
                total += out.stat().st_size
        print(f"frames {fh}: {len(MODELS) * FRAMES} files, {total // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
