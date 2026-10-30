"""The author's long crevices, traced in full.

The author marked six long crevices on a screenshot (red strokes, only
suggestive of where each starts and ends, not of its route). The strokes were
registered onto the photograph (marks-photo.json, photo px, bottom to top).
Here each crevice is traced as the darkest continuous groove between its two
ends: a least-cost path through a cost that is low in the groove's dark
centre, kept within a corridor round the stroke.

usage: python3 majors.py <photo.jpg> <marks-photo.json> <out.json>
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage.filters import sato
from skimage.graph import route_through_array

src, marks, out = sys.argv[1:4]
im = Image.open(src).convert("RGB")
G = np.asarray(im.convert("L"), dtype=np.float32) / 255.0
X0, Y0, X1, Y1 = 1700, 0, 2400, 1800
g = G[Y0:Y1, X0:X1]
g1 = nd.gaussian_filter(g, 1.0)
rel = nd.gaussian_filter(g, 7) - g1
val = sato(g, sigmas=[1.5, 2.5, 3.5], black_ridges=True)
white = nd.binary_dilation(g > 0.6, iterations=5)
far_white = nd.binary_dilation(g > 0.6, iterations=11)   # the outline's dark rim reads as a groove: keep off it
S = nd.gaussian_filter(val * np.clip(rel, 0, None) ** 0.5, 0.8)
S /= np.percentile(S[~white], 99)
# cheap in a dark groove's centre, dear on ridges, lit wood and near anything white
cost = 1.0 / (np.clip(S, 0, 1) + 0.03) + 40 * np.clip(g1 - 0.25, 0, None)
cost[far_white] += 60
cost[white] = 1e5

CORR = 18          # px either side of the author's stroke
res = []
for P in json.load(open(marks)):
    P = np.array(P) - [X0, Y0]
    # corridor round the stroke
    m = np.zeros(g.shape, bool)
    pi = P.round().astype(int)
    m[np.clip(pi[:, 1], 0, g.shape[0] - 1), np.clip(pi[:, 0], 0, g.shape[1] - 1)] = True
    # densify the stroke so the corridor has no holes
    for (xa, ya), (xb, yb) in zip(P[:-1], P[1:]):
        for u in np.linspace(0, 1, 6):
            m[int(round(ya + (yb - ya) * u)), int(round(xa + (xb - xa) * u))] = True
    dist = nd.distance_transform_edt(~m)
    corr = dist <= CORR
    # a gentle pull toward the author's stroke, so a neighbouring groove does not win
    c = np.where(corr, cost + 25 * (dist / CORR) ** 2, 1e5)
    # each end: the strongest groove point near the stroke's end
    def snap(p):
        x, y = p.round().astype(int)
        r = 12
        win = S[y - r:y + r + 1, x - r:x + r + 1] * corr[y - r:y + r + 1, x - r:x + r + 1]
        j, i = np.unravel_index(np.argmax(win), win.shape)
        return (y - r + j, x - r + i)
    a, b = snap(P[0]), snap(P[-1])
    path, total = route_through_array(c, a, b, fully_connected=True, geometric=True)
    xy = np.array(path, float)[:, ::-1]
    xy = np.c_[nd.gaussian_filter1d(xy[:, 0], 3, mode="nearest"), nd.gaussian_filter1d(xy[:, 1], 3, mode="nearest")]
    # check along it
    xi, yi = xy[:, 0].round().astype(int), xy[:, 1].round().astype(int)
    print("stroke len", round(float(np.hypot(*np.diff(P, axis=0).T).sum())),
          "path len", round(float(np.hypot(*np.diff(xy, axis=0).T).sum())),
          "mean cost", round(total / len(path), 2),
          "groove dark (median g)", round(float(np.median(g1[yi, xi])), 3),
          "darker than around (share)", round(float((rel[yi, xi] > 0.004).mean()), 2))
    res.append((xy + [X0, Y0]).round(1).tolist())
json.dump(res, open(out, "w"))
