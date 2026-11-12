# The phone's door frames (2026-11-12): the middle of the author's render,
# light enough for an iPhone 8.
#
#   python scripts/hero-doors-phone.py "D:/PANDOV/3_SPACE/FURNITURE HANDLE/secvente homepage 40frames" public/frames/doors-phone
#
# A portrait phone shows only the middle of a frame: under 3:5 it never sees
# more than the middle 900px of the 2667. It used to load and decode the whole
# frames, 38 of them AVIF, which an iPhone 8 decodes in software, and the page
# was busy for seconds (see PHONE_FRAME_URLS in components/hero-animation.tsx).
#
# Each frame is lightened onto 32 as in hero-doors.mjs, so the opening and the
# empty frame are the page's ground; then the middle 900 × 1500 is cut, scaled
# to 780 × 1300 (Lanczos), and written as JPEG: the first, the one that stands
# still, at 92 and 4:4:4; the rest at 78, 4:2:0. That is 1.6MB, against the
# whole frames' 2.7. Side by side with the AVIFs, cut the same, they cannot be
# told apart. JPEG and not WebP, which cannot hold 32; the script reads every
# file back and refuses one whose solid ground has moved off 32.
#
# Needs Pillow, NumPy and SciPy.
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import binary_erosion

FRAMES = 39
GROUND = 32
CROP_W = 900     # of 2667: the share 3:5 needs, PHONE_CROP_SHARE in the hero
OUT_H = 1300
QUALITY_FIRST = 92
QUALITY = 78
SOLID = 33       # a pixel this deep inside the ground must read back as ground

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
total = 0
for i in range(FRAMES):
    im = Image.open(os.path.join(src, f"homepage_handler{i:04d}.jpg")).convert("RGB")
    a = np.maximum(np.asarray(im), GROUND).astype(np.uint8)
    x0 = (a.shape[1] - CROP_W) // 2
    a = a[:, x0 : x0 + CROP_W]
    frame = Image.fromarray(a).resize((round(CROP_W * OUT_H / a.shape[0]), OUT_H), Image.LANCZOS)
    path = os.path.join(out, f"door-{i:02d}.jpg")
    if i == 0:
        frame.save(path, quality=QUALITY_FIRST, subsampling=0, optimize=True)
    else:
        frame.save(path, quality=QUALITY, subsampling=2, optimize=True)

    before = np.asarray(frame).astype(int)
    after = np.asarray(Image.open(path).convert("RGB")).astype(int)
    solid = binary_erosion((before == GROUND).all(2), np.ones((SOLID, SOLID)))
    off = np.abs(after - GROUND).max(2)[solid]
    worst = int(off.max()) if off.size else 0
    size = os.path.getsize(path)
    total += size
    print(f"{os.path.basename(path)}  {size // 1024} KB  ground: {int((off > 0).sum())} of {off.size} off, by at most {worst}")
    if worst > 1:
        sys.exit(f"{path}: the ground has moved off {GROUND}")
print(f"total {total / 1024 / 1024:.2f} MB")
