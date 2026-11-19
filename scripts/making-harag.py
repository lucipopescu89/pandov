#!/usr/bin/env python3
"""
The turning sequence on /making (`components/making-harag.tsx`), from the
author's render "Secvente Harag" (2026-11-18): 41 PNGs, 1500 x 1995, RGBA,
the piece on its branch turning once round, the last frame the first again.

    python3 scripts/making-harag.py "<...\\5 MAKING\\Secvente Harag>"

- **Laid on the page's ground**, #202020, so each frame is opaque and its
  ground is the page's exactly (AVIF holds 32,32,32; lossy WebP does not:
  see CLAUDE.md). Checked on the way out: the corner must read 32,32,32.
- **Cropped to the piece**: the frames are transparent outside 298..1203 of
  1500 in every frame; `CROP` keeps 270..1230, which is symmetric about the
  turning axis (750), and the whole height (the branch runs off top and foot).
- **Two heights**, `HEIGHTS`: 1200 for a computer (a desktop window is ~900-1300
  CSS px tall; at 41 decoded frames that is ~115MB of bitmaps, which a desktop
  holds easily and draws at once) and 800 for a phone (~50MB, kept small for
  an iPhone's memory). Written as public/images/making/harag/<h>/00..40.avif.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

GROUND = (32, 32, 32)
CROP = (270, 0, 1230, 1995)
HEIGHTS = {1200: 72, 800: 70}  # height: AVIF quality
OUT = Path(__file__).resolve().parent.parent / "public/images/making/harag"


def main(folder: str) -> None:
    files = sorted(Path(folder).glob("*.png"))
    assert len(files) == 41, f"expected 41 frames, found {len(files)}"
    for h, q in HEIGHTS.items():
        d = OUT / str(h)
        d.mkdir(parents=True, exist_ok=True)
        total = 0
        for i, f in enumerate(files):
            im = Image.open(f).convert("RGBA").crop(CROP)
            bg = Image.new("RGBA", im.size, GROUND + (255,))
            bg.alpha_composite(im)
            w = round(im.width * h / im.height / 2) * 2
            frame = bg.convert("RGB").resize((w, h), Image.LANCZOS)
            out = d / f"{i:02d}.avif"
            frame.save(out, quality=q, speed=4)
            total += out.stat().st_size
            back = Image.open(out).convert("RGB")
            assert back.getpixel((0, 0)) == GROUND and back.getpixel((w - 1, h - 1)) == GROUND, (out, back.getpixel((0, 0)))
        print(f"{h}: {w} x {h}, {len(files)} frames, {total // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
