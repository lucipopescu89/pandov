#!/usr/bin/env python3
"""
The scan passage on /making (`components/making-scan.tsx`): the burnt log end
with the white figure in it, as two pictures made to the same size and place.

Since 2026-11-19 (the author's crop that morning, "it was too long"):

  "Scaning Edges_ alb.jpg"  the scan, its mesh drawn light, already cropped by
                            the author (3168 x 3352) and fading into white at its foot
  "Scaning original.jpg"    the photograph, still at its old size (3168 x 4672):
                            cut here to the scan's frame, `ORIGINAL_TOP` from its
                            top (found by matching the two: the trunk's outline
                            agrees to 0.3% of the pixels there, 2% one row off)

    python3 scripts/making-scan.py "<Scaning original.jpg>" "<Scaning Edges_ alb.jpg>" [out dir]

Both are then treated exactly alike, so they stay one over the other:

- **The author's framing is kept**: no crop beyond the photograph's cut.
- **The ground is white** already (255 at the corners); tones over `HI` are
  made pure white, so no faint grey edge shows against the page.
- **The foot fades into white** over `FOOT` of the height (the scan already
  does, the photograph did not, so they end alike).
- **AVIF, monochrome** (4:0:0), at `WIDTHS`, as scan-original-<w>.avif and
  scan-edges-<w>.avif (bump `VERSION` in making-scan.tsx).

Until that morning the pictures were the 2026-11-17 pair (Scaning Edges.jpg,
the mesh dark), cropped here to the trunk with margins; `SCAN_RATIO` was 2.07.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ORIGINAL_TOP = 348
HI = 248
FOOT = 0.35
WIDTHS = (1100, 1600, 2000)
QUALITY = {"original": 62, "edges": 66}


def main(original: str, edges: str, out: str | None = None) -> None:
    dest = Path(out) if out else Path(__file__).resolve().parent.parent / "public/images/making"
    b = np.asarray(Image.open(edges).convert("L")).astype(np.float32)
    a = np.asarray(Image.open(original).convert("L")).astype(np.float32)
    if a.shape != b.shape:
        a = a[ORIGINAL_TOP : ORIGINAL_TOP + b.shape[0]]
    assert a.shape == b.shape, f"the two pictures must meet: {a.shape} {b.shape}"
    h, w0 = b.shape
    t = np.clip((np.arange(h) - (1 - FOOT) * h) / (FOOT * h), 0, 1)
    fade = (t * t * (3 - 2 * t))[:, None]
    for name, g in (("original", a), ("edges", b)):
        c = np.where(g > HI, 255, g)
        c = c + (255 - c) * fade
        im = Image.fromarray(np.clip(np.round(c), 0, 255).astype(np.uint8)).convert("RGB")
        for w in WIDTHS:
            hh = round(h * w / w0)
            p = dest / f"scan-{name}-{w}.avif"
            im.resize((w, hh), Image.LANCZOS).save(p, quality=QUALITY[name], subsampling="4:0:0", speed=4)
            print(f"{p.name}: {w} x {hh}, {p.stat().st_size // 1024} KB")
    print(f"{w0} x {h}, ratio {h / w0:.4f}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
