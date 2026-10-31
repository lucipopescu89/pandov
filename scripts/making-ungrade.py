"""
Take the white wash off the Making photograph (2026-10-31, the author's asking).

The export of Homepage_making.jpg came out with a soft white gradient baked
into it: the burnt trunk's deepest shadows read 72 at the top of the picture
and 21 at its foot, as if a white veil thinned from top to bottom. Nothing on
the page drew it; it was in the file. This lifts it out.

How: over the trunk (pixels under 170, right half), the darkest level of each
24-row band is measured per channel and a smooth curve (quadratic in height)
is fitted through it. Read as "black, plus a share a of white", that share is

    a(y) = (curve(y) - black) / (255 - black)

with black taken as the curve's value at the very foot of the picture, where
the veil had thinned to nothing. Each pixel is then un-mixed, channel by
channel: out = (in - 255 a) / (1 - a). White stays 255 exactly, so the
photograph still meets the page with no edge; the wood gets back its black
evenly from top to bottom. The gold motes' lines are unaffected: the
geometry is untouched.

Usage:  python3 scripts/making-ungrade.py public/images/home/making-sculpture.jpg [out.jpg]
Writes JPEG q86 4:4:4, as the export, and checks the top-left pixel is 255.
Run it once on a fresh export; running it on its own output does nothing
useful (the curve is then flat).
"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else src

im = Image.open(src).convert("RGB")
A = np.asarray(im).astype(np.float64)
H, W, _ = A.shape
lum = A.mean(axis=2)
trunk = lum < 170
x0 = W * 13 // 24                       # the trunk stands in the right half

band, ys, lv = 24, [], [[], [], []]
for y in range(0, H - band, band):
    m = trunk[y:y + band, x0:]
    if m.sum() < 400:
        continue
    ys.append(y + band / 2)
    for c in range(3):
        lv[c].append(np.percentile(A[y:y + band, x0:, c][m], 1))
ys = np.array(ys) / H

out = A.copy()
yy = np.arange(H) / H
for c in range(3):
    curve = np.polyval(np.polyfit(ys, lv[c], 2), yy)
    black = curve[-1]
    a = np.clip((curve - black) / (255 - black), 0, 0.5)[:, None]
    out[:, :, c] = (A[:, :, c] - 255 * a) / (1 - a)
    print(f"channel {c}: white veil {a[int(.04 * H), 0]:.3f} at the top, "
          f"{a[H // 2, 0]:.3f} midway, black {black:.1f}")

res = Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8))
res.save(dst, quality=86, subsampling=0, optimize=True)
chk = Image.open(dst).convert("RGB")
tl = chk.getpixel((0, 0))
Y = np.asarray(chk).astype(float).mean(axis=2)
deep = [int(np.percentile(Y[int(f * H) - 4:int(f * H) + 4, x0:][trunk[int(f * H) - 4:int(f * H) + 4, x0:]], 1))
        for f in (.04, .2, .4, .6, .8, .94)]
print("darkest wood, top to foot:", deep, " top-left pixel:", tl)
if tl != (255, 255, 255):
    sys.exit("top-left pixel is not 255,255,255: the photograph would show an edge on the page")
