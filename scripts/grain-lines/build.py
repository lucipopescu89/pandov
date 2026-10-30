"""Put the crevices together for the effect.

- the author's six long crevices (majors.json), trimmed off the outline;
- the other crevices (crevices.json), less what runs beside a long one, and
  with pieces of one crevice joined where a short dark link connects them;
- each line's size: its length and how deep (dark) its groove is.

Writes lines.json { w, h, lines: [{p:[x,y,...], L, size, major}] }, each
line from its lower end to its upper end, a point every 4 px.

usage: python3 build.py <photo.jpg> <majors.json> <crevices.json> <out.json>
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from scipy.spatial import cKDTree
from skimage.filters import sato
from skimage.graph import route_through_array

src, majf, crevf, out = sys.argv[1:5]
im = Image.open(src).convert("RGB")
G = np.asarray(im.convert("L"), dtype=np.float32) / 255.0
H, W = G.shape
g1 = nd.gaussian_filter(G, 1.0)
rel = nd.gaussian_filter(G, 7) - g1
white = nd.binary_dilation(G > 0.6, iterations=5)
far_white = nd.binary_dilation(G > 0.6, iterations=11)

# groove score and cost, over the trunk only
X0 = 1700
sub = G[:, X0:]
val = np.zeros_like(G)
val[:, X0:] = sato(sub, sigmas=[1.5, 2.5, 3.5], black_ridges=True)
S = nd.gaussian_filter(val * np.clip(rel, 0, None) ** 0.5, 0.8)
S /= np.percentile(S[:, X0:][~white[:, X0:]], 99)
cost = 1.0 / (np.clip(S, 0, 1) + 0.03) + 40 * np.clip(g1 - 0.25, 0, None)
cost[far_white] += 60
cost[white] = 1e5

STEP = 4.0

def resample(xy, step=STEP):
    xy = np.asarray(xy, float)
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(xy, axis=0).T))]
    if d[-1] < step:
        return xy[[0, -1]]
    t = np.arange(0, d[-1] + 1e-6, step)
    return np.c_[np.interp(t, d, xy[:, 0]), np.interp(t, d, xy[:, 1])]

def length(p):
    return float(np.hypot(*np.diff(p, axis=0).T).sum())

def at(a, p):
    xi = np.clip(p[:, 0].round().astype(int), 0, W - 1)
    yi = np.clip(p[:, 1].round().astype(int), 0, H - 1)
    return a[yi, xi]

# --- the long ones: resample, trim ends that touch the outline or lit wood
majors = []
for P in json.load(open(majf)):
    p = resample(P)
    good = ~at(far_white, p) & (at(g1, p) < 0.33)
    idx = np.nonzero(good)[0]
    p = p[idx[0]: idx[-1] + 1]
    if p[0, 1] < p[-1, 1]:
        p = p[::-1]
    majors.append(p)

# --- the others: drop what runs beside a long one
mtree = cKDTree(np.vstack(majors))
others = []
for flat in json.load(open(crevf))["paths"]:
    p = np.array(flat, float).reshape(-1, 2)
    d, _ = mtree.query(p)
    keep = d > 12
    lab, n = nd.label(keep)
    for r in range(1, n + 1):
        idx = np.nonzero(lab == r)[0]
        q = p[idx[0]: idx[-1] + 1]
        if len(q) * STEP >= 80:
            others.append(q)

# --- join pieces of one crevice: a piece's upper end to another's lower end,
# close, heading the same way, with a dark groove all along the link
def heading(p, end):
    q = p[-4:] if end else p[:4]
    v = q[-1] - q[0]
    return v / (np.hypot(*v) or 1)

def link(a, b):
    """The groove between a's upper end and b's lower end, or None."""
    pa, pb = a[-1], b[0]
    gap = np.hypot(*(pb - pa))
    if gap > 45 or gap < 1:
        return None
    v = (pb - pa) / gap
    ha, hb = heading(a, True), heading(b, False)
    if ha @ v < 0.8 or hb @ v < 0.8 or ha @ hb < 0.8:
        return None
    x0, y0 = (np.minimum(pa, pb) - 15).astype(int)
    x1, y1 = (np.maximum(pa, pb) + 15).astype(int)
    c = cost[y0:y1, x0:x1]
    s0 = (int(pa[1]) - y0, int(pa[0]) - x0)
    s1 = (int(pb[1]) - y0, int(pb[0]) - x0)
    path, _ = route_through_array(c, s0, s1, fully_connected=True, geometric=True)
    r = np.array(path, float)[:, ::-1] + [x0, y0]
    # every point of the link: in a groove, dark, not by the outline
    if (at(cost, r) > 18).mean() > 0.15 or at(g1, r).max() > 0.34 or at(far_white, r).any():
        return None
    return r

joined = True
while joined:
    joined = False
    best = None
    for i, a in enumerate(others):
        for j, b in enumerate(others):
            if i == j:
                continue
            r = link(a, b)
            if r is not None:
                gap = np.hypot(*(b[0] - a[-1]))
                if best is None or gap < best[0]:
                    best = (gap, i, j, r)
    if best:
        _, i, j, r = best
        a, b = others[i], others[j]
        merged = resample(np.vstack([a, r, b]))
        merged = np.c_[nd.gaussian_filter1d(merged[:, 0], 1.5, mode="nearest"),
                       nd.gaussian_filter1d(merged[:, 1], 1.5, mode="nearest")]
        others = [p for k, p in enumerate(others) if k not in (i, j)] + [merged]
        joined = True

# --- size: length, and how deep the groove is (dark, and darker than around)
def depth(p):
    return float(np.median(1 - at(g1, p)) * np.median(np.clip(at(rel, p), 0, 0.1) / 0.1) ** 0.3)

lines = []
for p in majors:
    lines.append({"p": p, "major": True})
for p in others:
    lines.append({"p": p, "major": False})
for l in lines:
    l["L"] = length(l["p"])
    l["depth"] = depth(l["p"])
dmax = max(l["depth"] for l in lines)
for l in lines:
    # 0..1: long and deep crevices high; the author's six at the top
    s = 0.7 * min(1, (l["L"] - 80) / 520) + 0.3 * (l["depth"] / dmax)
    l["size"] = 1.0 if l["major"] else round(min(0.85, max(0.0, s)), 3)

lines.sort(key=lambda l: -l["L"])
print("lines", len(lines), "majors", sum(l["major"] for l in lines))
for l in lines:
    print(("MAJOR " if l["major"] else "      ") + f"L={l['L']:.0f} depth={l['depth']:.2f} size={l['size']}")
json.dump({"w": W, "h": H, "lines": [
    {"p": np.round(l["p"]).astype(int).ravel().tolist(), "size": l["size"], "major": l["major"]} for l in lines
]}, open(out, "w"), separators=(",", ":"))
