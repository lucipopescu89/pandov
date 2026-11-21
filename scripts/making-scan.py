#!/usr/bin/env python3
"""
The scan passage on /making (`components/making-scan.tsx`): the burnt log end
with the white figure in it, as two pictures made to the same size and place.

Since 2026-11-21 (the author's new pair, on the page's dark):

  "Saning Edges Original Black.jpg"  the photograph, on #202020
  "Scaning Edges _Black.jpg"         the scan, its mesh drawn light, on #202020

Both 3168 x 3772, already one over the other (the author's framing, kept whole).

    python3 scripts/making-scan.py "<Saning Edges Original Black.jpg>" "<Scaning Edges _Black.jpg>" [out dir]

Both are treated exactly alike, so they stay one over the other:

- **The ground is the page's dark** (#202020, 32): the JPEG's tones about it
  (`GROUND_NEAR`) are made exactly 32, so no faint edge shows against the page.
- **The foot fades into that dark** over `FOOT` of the height (the wood runs
  off the bottom of the pictures).
- **AVIF, monochrome** (4:0:0), at `WIDTHS`, as scan-original-<w>.avif and
  scan-edges-<w>.avif (bump `VERSION` in making-scan.tsx; `SCAN_RATIO` there
  is the ratio printed at the end).

Until that day the pictures were on white ("Scaning Edges_ alb.jpg" and
"Scaning original.jpg" cut 348px from its top, 3168 x 3352), their foot fading
into white: `scripts/making-scan.inainte-2026-11-21.py.txt`.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

GROUND = 32
GROUND_NEAR = 1
FOOT = 0.35
WIDTHS = (1100, 1600, 2000)
QUALITY = {"original": 62, "edges": 66}


def main(original: str, edges: str, out: str | None = None) -> None:
    dest = Path(out) if out else Path(__file__).resolve().parent.parent / "public/images/making"
    a = np.asarray(Image.open(original).convert("L")).astype(np.float32)
    b = np.asarray(Image.open(edges).convert("L")).astype(np.float32)
    assert a.shape == b.shape, f"the two pictures must meet: {a.shape} {b.shape}"
    h, w0 = b.shape
    t = np.clip((np.arange(h) - (1 - FOOT) * h) / (FOOT * h), 0, 1)
    fade = (t * t * (3 - 2 * t))[:, None]
    for name, g in (("original", a), ("edges", b)):
        c = np.where(np.abs(g - GROUND) <= GROUND_NEAR, GROUND, g)
        c = c + (GROUND - c) * fade
        im = Image.fromarray(np.clip(np.round(c), 0, 255).astype(np.uint8)).convert("RGB")
        for w in WIDTHS:
            hh = round(h * w / w0)
            p = dest / f"scan-{name}-{w}.avif"
            im.resize((w, hh), Image.LANCZOS).save(p, quality=QUALITY[name], subsampling="4:0:0", speed=4)
            print(f"{p.name}: {w} x {hh}, {p.stat().st_size // 1024} KB")
    print(f"{w0} x {h}, ratio {h / w0:.4f}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
