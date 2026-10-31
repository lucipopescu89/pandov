"""
The gold motes' crevices, from the author's own lines drawn in Figma
(2026-10-31). Writes public/pandov-grain.js.

    python3 scripts/grain-lines/from-figma.py "<export.svg>" [out.js]

The export is the Figma frame with the Making photograph and the author's
lines over it, exported as SVG with the photograph in it. The photograph's
own place in the export (the <pattern> matrix on the frame's image fill) is
what puts the lines on making-sculpture.jpg, so the frame need not be the
photograph's size, and the photograph need not sit at 0,0: Figma's frame was
1903 x 1413 with the photograph overhanging it by 6.7 px on the left. The
photograph in the export must be the same picture as making-sculpture.jpg
(any size): only its place is read, never its pixels.

The lines may come in two ways, and both are read:
  - as strokes (<path stroke=...>): each sub-path is a line;
  - outlined (one filled <path> of many contours: Figma's "Outline stroke",
    or a flattened group): the outlines are drawn at 4x into a mask, thinned
    to their centre (skeletonize), and the skeleton is walked into lines. A
    skeleton branches where two lines touch; at each junction the ends that
    continue one another (within 40 degrees) are joined, the rest end there.
    Spurs under 16 px and lines under 10 px are dropped.
The export of 2026-10-31 had them outlined: 574 contours, 109 lines.
Colours and stroke widths in Figma mean nothing here; every line is a
crevice like the others.

Each line is smoothed (a 9-point moving average), simplified (Douglas-Peucker,
0.8 px), placed on the photograph, and turned to run from its lower end to
its upper end, so the motes always rise. The result goes into
pandov-grain.template.js in place of __LINES__.

Check the result on the photograph before committing: draw the lines over
making-sculpture.jpg, or measure the mean brightness of the photograph under
them (the 109 lines read 56.8 where they lie, and no shift within +-10 px
did better than 56.3).

Needs numpy, scipy, scikit-image and Pillow.
"""
import json
import math
import os
import re
import sys
from collections import defaultdict

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PHOTO_W, PHOTO_H = 2400, 1769          # making-sculpture.jpg as served
S = 4                                    # mask resolution, x the export's px


# --- the export --------------------------------------------------------------

def tokens(d):
    return re.findall(r'[MmLlHhVvCcSsQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?', d)


def subpaths(d, seg=6):
    """Absolute M/L/H/V/C/Q/Z path data (what Figma writes) -> point lists."""
    t = tokens(d); i = 0; cmd = None; cur = (0.0, 0.0); start = cur; out = []; poly = []

    def num():
        nonlocal i
        v = float(t[i]); i += 1; return v
    while i < len(t):
        if re.match(r'[A-Za-z]', t[i]):
            cmd = t[i]; i += 1
        if cmd in 'Zz':
            if poly: out.append(poly); poly = []
            cur = start; continue
        if cmd == 'M':
            if poly: out.append(poly)
            cur = (num(), num()); start = cur; poly = [cur]; cmd = 'L'
        elif cmd == 'L': cur = (num(), num()); poly.append(cur)
        elif cmd == 'H': cur = (num(), cur[1]); poly.append(cur)
        elif cmd == 'V': cur = (cur[0], num()); poly.append(cur)
        elif cmd == 'C':
            p0 = cur; p1 = (num(), num()); p2 = (num(), num()); p3 = (num(), num())
            for k in range(1, seg + 1):
                u = k / seg; v = 1 - u
                poly.append((v**3*p0[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u**3*p3[0],
                             v**3*p0[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u**3*p3[1]))
            cur = p3
        elif cmd == 'Q':
            p0 = cur; p1 = (num(), num()); p2 = (num(), num())
            for k in range(1, seg + 1):
                u = k / seg; v = 1 - u
                poly.append((v*v*p0[0] + 2*v*u*p1[0] + u*u*p2[0], v*v*p0[1] + 2*v*u*p1[1] + u*u*p2[1]))
            cur = p2
        else:
            raise SystemExit(f'path command {cmd} not handled: re-export from Figma')
    if poly: out.append(poly)
    return out


def photo_place(svg):
    """Where the photograph lies in the export: x0, y0, width, height."""
    m = re.search(r'<use[^>]*transform="matrix\(([^)]+)\)"', svg)
    im = re.search(r'<image[^>]*width="([\d.]+)" height="([\d.]+)"', svg)
    rect = re.search(r'<path d="M0 0H([\d.]+)V([\d.]+)H0V0Z" fill="url\(#pattern', svg)
    if not (m and im and rect):
        raise SystemExit('photograph not found in the export: export the frame with its image fill')
    a, b, c, d, e, f = map(float, m.group(1).replace(',', ' ').split())
    iw, ih = map(float, im.groups())
    fw, fh = map(float, rect.groups())          # the fill's box: the frame
    return e * fw, f * fh, a * iw * fw, d * ih * fh


# --- outlined strokes -> centre lines ----------------------------------------

def centre_lines(outline_d, W, H):
    mask = Image.new('L', (int(W * S), int(H * S)), 0)
    dr = ImageDraw.Draw(mask)
    for p in subpaths(outline_d):
        if len(p) >= 3:
            dr.polygon([(x * S, y * S) for x, y in p], fill=255)
    sk = skeletonize(np.asarray(mask) > 0)
    K = np.ones((3, 3), int); K[1, 1] = 0
    deg = ndi.convolve(sk.astype(int), K, mode='constant') * sk
    h, w = sk.shape
    nb = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]

    def neigh(y, x):
        for dy, dx in nb:
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and sk[yy, xx]:
                yield (yy, xx)
    node = lambda p: deg[p] != 2

    def walk(a, b):
        path = [a, b]; prev, cur = a, b
        while not node(cur):
            nx = [q for q in neigh(*cur) if q != prev and q not in path[-3:]]
            if not nx: break
            nx.sort(key=lambda q: abs(q[0] - cur[0]) + abs(q[1] - cur[1]))
            prev, cur = cur, nx[0]; path.append(cur)
        return path
    seen = set(); branches = []
    for p in zip(*np.nonzero(sk)):
        if not node(p): continue
        for q in neigh(*p):
            if (min(p, q), max(p, q)) in seen: continue
            path = walk(p, q)
            for i in range(len(path) - 1):
                seen.add((min(path[i], path[i + 1]), max(path[i], path[i + 1])))
            branches.append(path)

    # junctions: clusters of branch points; strip them, then rejoin
    lab, _ = ndi.label(ndi.binary_dilation(deg >= 3, np.ones((5, 5))) & sk, structure=np.ones((3, 3)))
    items = []
    for b in branches:
        ca = int(lab[b[0]]) or None; cb = int(lab[b[-1]]) or None
        core = [p for p in b if not lab[p]]
        if ca is not None and ca == cb and len(core) < 40: continue     # a small loop
        if len(core) < 16 and (ca is None or cb is None): continue      # a spur
        if len(core) < 4: continue
        items.append({'p': core or b, 'a': ca, 'b': cb})

    def out_dir(pts, end):
        n = min(len(pts) - 1, 24)
        p, q = (pts[0], pts[n]) if end == 'a' else (pts[-1], pts[-1 - n])
        dy, dx = p[0] - q[0], p[1] - q[1]; m = math.hypot(dx, dy) or 1
        return dy / m, dx / m
    inc = defaultdict(list)
    for i, it in enumerate(items):
        if it['a'] is not None: inc[it['a']].append((i, 'a'))
        if it['b'] is not None: inc[it['b']].append((i, 'b'))
    link = {}
    for ends in inc.values():
        cand = []
        for x in range(len(ends)):
            for y in range(x + 1, len(ends)):
                (i, e), (j, f) = ends[x], ends[y]
                if i == j: continue
                u, v = out_dir(items[i]['p'], e), out_dir(items[j]['p'], f)
                cand.append((-(u[0] * v[0] + u[1] * v[1]), ends[x], ends[y]))
        cand.sort(reverse=True); used = set()
        for dot, x, y in cand:
            if dot < math.cos(math.radians(40)): break
            if x in used or y in used: continue
            used |= {x, y}; link[x] = y; link[y] = x
    done = set(); lines = []
    for i in range(len(items)):
        if i in done: continue
        cur, end, g = i, 'a', 0
        while (cur, end) in link and g < 500:
            j, f = link[(cur, end)]; cur, end = j, ('b' if f == 'a' else 'a'); g += 1
            if cur == i: break
        chain = []; k, e, g = cur, end, 0
        while g < 500:
            g += 1; done.add(k)
            pts = items[k]['p'] if e == 'a' else items[k]['p'][::-1]
            chain += pts
            o = 'b' if e == 'a' else 'a'
            if (k, o) not in link: break
            j, f = link[(k, o)]
            if j in done: break
            k, e = j, f
        if len(chain) >= 10 * S:
            lines.append([(x / S, y / S) for y, x in chain])
    return lines


# --- placing and simplifying -------------------------------------------------

def smooth(p, w=9):
    p = np.asarray(p, float)
    if len(p) < w: return p
    k = np.ones(w) / w; out = p.copy()
    for c in (0, 1):
        pad = np.concatenate([np.full(w // 2, p[0, c]), p[:, c], np.full(w // 2, p[-1, c])])
        out[:, c] = np.convolve(pad, k, 'valid')
    out[0] = p[0]; out[-1] = p[-1]
    return out


def rdp(p, eps):
    if len(p) < 3: return p
    a, b = p[0], p[-1]; d = b - a; L = math.hypot(*d) or 1
    dist = np.abs(d[1] * (p[:, 0] - a[0]) - d[0] * (p[:, 1] - a[1])) / L
    i = int(np.argmax(dist))
    if dist[i] > eps:
        return np.vstack([rdp(p[:i + 1], eps)[:-1], rdp(p[i:], eps)])
    return np.array([a, b])


def main():
    svg = open(sys.argv[1], encoding='utf-8').read()
    out_js = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'public', 'pandov-grain.js')
    W, H = map(float, re.search(r'<svg[^>]*width="([\d.]+)" height="([\d.]+)"', svg).groups())
    x0, y0, pw, ph = photo_place(svg)
    kx, ky = PHOTO_W / pw, PHOTO_H / ph
    print(f'photograph in the export at {x0:.2f},{y0:.2f}, {pw:.2f} x {ph:.2f}')

    raw = []
    for m in re.finditer(r'<path ([^>]*)/?>', svg):
        attrs = m.group(1)
        d = re.search(r'\bd="([^"]+)"', attrs)
        if not d or 'url(#pattern' in attrs or d.group(1).startswith('M0 0H'):
            continue
        if 'stroke=' in attrs:                               # strokes: each sub-path is a line
            raw += [p for p in subpaths(d.group(1)) if len(p) >= 2]
        else:                                                # outlined: trace the centres
            raw += centre_lines(d.group(1), W, H)

    lines = []
    for l in raw:
        p = np.asarray(l, float)
        p[:, 0] = (p[:, 0] - x0) * kx; p[:, 1] = (p[:, 1] - y0) * ky
        q = rdp(smooth(p), 0.8)
        if q[0][1] < q[-1][1]: q = q[::-1]
        if np.sum(np.hypot(*np.diff(q, axis=0).T)) < 20: continue
        lines.append([int(round(v)) for v in q.flatten()])
    print(f'{len(lines)} lines, {sum(len(l) for l in lines) // 2} points')

    body = '[\n' + '\n'.join('    ' + json.dumps(l, separators=(',', ':')) + ',' for l in lines) + '\n  ]'
    tpl = open(os.path.join(HERE, 'pandov-grain.template.js'), encoding='utf-8').read()
    open(out_js, 'w', encoding='utf-8').write(tpl.replace('__LINES__', body))
    print('wrote', out_js)


if __name__ == '__main__':
    main()
