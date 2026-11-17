#!/usr/bin/env python3
"""
The scan passage on /making (`components/making-scan.tsx`), from the author's
two pictures of 2026-11-17, made in Photoshop to the same size and place:

  "Scaning original.jpg"  the burnt trunk with the white figure in it, photographed
  "Scaning Edges.jpg"     the same, rendered from the 3D scan with its mesh drawn

    python3 scripts/making-scan.py "<Scaning original.jpg>" "<Scaning Edges.jpg>"

Both are treated exactly alike, so they stay one over the other:

- **Their grey ground goes white.** It is an even 236–240; the page is white
  there. Tones under `LO` are left as they are, `LO`..`HI` are stretched up to
  255, and everything over `HI` is white. The trunk's darks are untouched.
- **Cropped to the trunk**, `MARGIN` around it (the trunk runs off the
  pictures' foot, so it is cut there), and **its foot fades into white** over
  `FOOT` of the height, so it does not end on a hard line above the sketches.
- **AVIF, monochrome** (4:0:0: both are grey, their colour under 1/255 on
  average), at `WIDTHS`, written as
  public/images/making/scan-original-<w>.avif and scan-edges-<w>.avif.

Prints the crop's size: `SCAN_RATIO` in `making-scan.tsx` is its height / width.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

LO, HI = 150, 233
MARGIN = {"left": 150, "right": 150, "top": 230}
FOOT = 0.09
WIDTHS = (1100, 1600, 2000)
QUALITY = {"original": 62, "edges": 70}
OUT = Path(__file__).resolve().parent.parent / "public/images/making"


def whiten(g: np.ndarray) -> np.ndarray:
    g = g.astype(np.float32)
    up = LO + (g - LO) * (255 - LO) / (HI - LO)
    return np.where(g < LO, g, np.minimum(255, up))


def main(original: str, edges: str) -> None:
    a = np.asarray(Image.open(original).convert("L"))
    b = np.asarray(Image.open(edges).convert("L"))
    assert a.shape == b.shape, "the two pictures must be the same size"
    dark = (a < 225) | (b < 225)
    ys, xs = np.where(dark)
    x0 = max(0, xs.min() - MARGIN["left"])
    x1 = min(a.shape[1], xs.max() + 1 + MARGIN["right"])
    y0 = max(0, ys.min() - MARGIN["top"])
    y1 = a.shape[0]
    h = y1 - y0
    # the foot into white: a smooth step over its last FOOT of the height
    t = np.clip((np.arange(h) - (1 - FOOT) * h) / (FOOT * h), 0, 1)
    fade = (t * t * (3 - 2 * t))[:, None]
    for name, g in (("original", a), ("edges", b)):
        c = whiten(g[y0:y1, x0:x1])
        c = c + (255 - c) * fade
        im = Image.fromarray(np.clip(np.round(c), 0, 255).astype(np.uint8)).convert("RGB")
        for w in WIDTHS:
            hh = round(h * w / (x1 - x0))
            out = OUT / f"scan-{name}-{w}.avif"
            im.resize((w, hh), Image.LANCZOS).save(out, quality=QUALITY[name], subsampling="4:0:0", speed=4)
            print(f"{out.name}: {w} x {hh}, {out.stat().st_size // 1024} KB")
    print(f"crop x {x0}..{x1}, y {y0}..{y1}: {x1 - x0} x {h}, ratio {h / (x1 - x0):.4f}")
    # where the trunk is across the crop, for the layout
    print(f"trunk across: {(xs.min() - x0) / (x1 - x0):.3f} .. {(xs.max() - x0) / (x1 - x0):.3f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
