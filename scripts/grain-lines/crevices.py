"""Crevice lines of the burnt trunk in making-sculpture.jpg (second method).

1. Groove score: Sato tubeness on dark thin lines, kept only where the pixel
   is darker than its surroundings and inside the dark wood (away from the
   silhouette, the vase, the grass and the shelf).
2. Each line is traced from its strongest point both ways along the grain,
   and at every step pulled sideways onto the groove's centre (the best score
   within a few px across). It stops where the groove fades, leaves the wood
   or meets a line already traced.
3. Every point of every line is checked again: dark, darker than around, in
   the wood. Lines are cut where they are not, and short ones dropped.

Writes crevices.json { w, h, step, paths:[[x,y,x,y,...]...] } (image px,
each path from its lower end to its upper end) and debug pictures.

usage: python3 crevices.py <photo.jpg> <out-dir>
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from skimage.filters import sato

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
W, H = im.size
G = np.asarray(im.convert("L"), dtype=np.float32) / 255.0
X0, Y0, X1, Y1 = 1700, 30, W, 1800
g = G[Y0:Y1, X0:X1]
h, w = g.shape

# --- the dark wood, away from its outline and from anything white
smooth = nd.gaussian_filter(g, 4)
wood = nd.binary_opening(smooth < 0.47, iterations=3)
wood = nd.binary_erosion(wood, iterations=12)
wood &= ~nd.binary_dilation(g > 0.72, iterations=12)
# keep well away from the vase and the page: large bright areas, widened
lab_b, nb_b = nd.label(g > 0.55)
sizes = nd.sum(np.ones_like(g), lab_b, range(1, nb_b + 1))
big = np.isin(lab_b, 1 + np.nonzero(sizes > 20000)[0])
wood &= ~nd.binary_dilation(big, iterations=24)
# the grass and its stem are warm (red over blue); the wood is cool
A = np.asarray(im, dtype=np.float32)[Y0:Y1, X0:X1] / 255.0
wood &= ~nd.binary_dilation((A[..., 0] - A[..., 2]) > 0.03, iterations=14)
# how lit the wood is around a point
LIT = nd.gaussian_filter(g, 10)
wood[int(H * 0.952) - Y0:, :] = False

# --- groove score
g1 = nd.gaussian_filter(g, 1.0)
rel = nd.gaussian_filter(g, 7) - g1
val = sato(g, sigmas=[1.5, 2.5, 3.5], black_ridges=True)
S = nd.gaussian_filter(val * (rel > 0.006) * wood, 1.0)
hi = np.percentile(S[wood], 88)
lo = np.percentile(S[wood], 62)

# --- grain direction (along the grain), smoothed as doubled angles
gs = nd.gaussian_filter(g, 1.6)
ix, iy = nd.sobel(gs, axis=1), nd.sobel(gs, axis=0)
jxx, jyy, jxy = (nd.gaussian_filter(a, 10) for a in (ix * ix, iy * iy, ix * iy))
th = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2
TX, TY = np.cos(th), np.sin(th)

def bil(a, x, y):
    return nd.map_coordinates(a, [[y], [x]], order=1, mode="constant")[0]

STEP = 2.0
occ = np.zeros_like(wood)
OCC_R = 5

def trace(x, y, dx, dy, maxlen=2200):
    pts, weak = [], 0
    for _ in range(int(maxlen / STEP)):
        xi, yi = int(round(x)), int(round(y))
        if not (0 <= xi < w and 0 <= yi < h) or not wood[yi, xi]:
            break
        if occ[yi, xi] and len(pts) > 2:
            break
        # direction: the grain here, turned to match where we were heading,
        # blended with that heading so a line keeps its own curve
        tx, ty = bil(TX, x, y), bil(TY, x, y)
        if tx * dx + ty * dy < 0:
            tx, ty = -tx, -ty
        dx, dy = 0.55 * dx + 0.45 * tx, 0.55 * dy + 0.45 * ty
        n = np.hypot(dx, dy) or 1; dx, dy = dx / n, dy / n
        x, y = x + dx * STEP, y + dy * STEP
        # pull sideways onto the groove's centre
        offs = np.linspace(-3, 3, 13)
        nx, ny = -dy, dx
        sc = nd.map_coordinates(S, [y + ny * offs, x + nx * offs], order=1, mode="constant")
        o = offs[int(np.argmax(sc))]
        o = max(-1.2, min(1.2, o))
        x, y = x + nx * o, y + ny * o
        s = bil(S, x, y)
        weak = weak + 1 if s < lo else 0
        if weak > 3:
            pts = pts[:-3]
            break
        pts.append((x, y))
    return pts

# seeds: strongest groove points first
cand = (S > hi) & (S == nd.maximum_filter(S, size=5))
ys, xs = np.nonzero(cand)
order = np.argsort(-S[ys, xs])
lines = []
for k in order:
    y, x = float(ys[k]), float(xs[k])
    if occ[ys[k], xs[k]]:
        continue
    tx, ty = TX[ys[k], xs[k]], TY[ys[k], xs[k]]
    a = trace(x, y, tx, ty)
    b = trace(x, y, -tx, -ty)
    p = b[::-1] + [(x, y)] + a
    if len(p) * STEP < 60:
        continue
    lines.append(np.array(p))
    # mark it, so no other line runs in the same groove
    m = np.zeros_like(occ)
    pi = np.array(p).round().astype(int)
    m[np.clip(pi[:, 1], 0, h - 1), np.clip(pi[:, 0], 0, w - 1)] = True
    occ |= nd.binary_dilation(m, iterations=OCC_R)

def resample(xy, step):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(xy, axis=0).T))]
    t = np.arange(0, d[-1], step)
    return np.c_[np.interp(t, d, xy[:, 0]), np.interp(t, d, xy[:, 1])]

OUT_STEP = 4
MIN_LEN = 100
G1MIN = nd.minimum_filter(g1, 3)
RELMAX = nd.maximum_filter(rel, 3)
paths = []
for p in lines:
    p = np.c_[nd.gaussian_filter1d(p[:, 0], 2, mode="nearest"), nd.gaussian_filter1d(p[:, 1], 2, mode="nearest")]
    p = resample(p, OUT_STEP)
    if len(p) < 3:
        continue
    xi = np.clip(p[:, 0].round().astype(int), 0, w - 1)
    yi = np.clip(p[:, 1].round().astype(int), 0, h - 1)
    # the check, point by point (a 3px window, so one odd pixel does not cut a line)
    tang = np.arctan2(np.gradient(p[:, 1]), np.gradient(p[:, 0]))
    along = np.abs(np.cos(tang - th[yi, xi]))
    ok = (wood[yi, xi]
          & (G1MIN[yi, xi] < 0.30)        # the groove itself is dark
          & (RELMAX[yi, xi] > 0.015)      # clearly darker than the ridges beside it
          & (LIT[yi, xi] < 0.31)          # not in a lit part of the wood
          & (along > 0.85))               # running with the grain, no hooks
    runs, cnt = nd.label(ok)
    for r in range(1, cnt + 1):
        idx = np.nonzero(runs == r)[0]
        seg = p[idx[0]: idx[-1] + 1]
        if len(seg) * OUT_STEP < MIN_LEN:
            continue
        if seg[0, 1] < seg[-1, 1]:
            seg = seg[::-1]
        paths.append(seg + [X0, Y0])

paths.sort(key=len, reverse=True)
print("lines traced", len(lines), "paths kept", len(paths),
      "total px", sum(len(p) for p in paths) * OUT_STEP,
      "longest", len(paths[0]) * OUT_STEP if paths else 0)

json.dump({"w": W, "h": H, "step": OUT_STEP,
           "paths": [np.round(p).astype(int).ravel().tolist() for p in paths]},
          open(os.path.join(out, "crevices.json"), "w"), separators=(",", ":"))

dbg = im.copy()
d = ImageDraw.Draw(dbg)
for p in paths:
    d.line([tuple(q) for q in p], fill=(255, 150, 30), width=2)
    d.ellipse([p[-1][0] - 3, p[-1][1] - 3, p[-1][0] + 3, p[-1][1] + 3], fill=(60, 255, 60))
dbg.crop((X0, Y0, X1, Y1)).save(os.path.join(out, "crev-debug.png"))
