"""
The line drawings of the homepage's Making section, from the author's Figma
frame "Making" (2026-11-05). Writes public/images/home/making-drawing.svg.

    python3 scripts/making-drawing.py public/images/home/Making.svg [out.svg]

The export is the whole frame: the photograph, the crevices, the words, the
figures and the eye. This keeps the figures and the eye only, as the frame's
own layers, each a <g id>, the figures' lines all in `INK`:

    the-creator   The Creator, the figure with the tulnic; it stands still
    fum           Fum, the smoke out of the tulnic
    siluet-1      Siluet1, the tall figure by the trunk
    siluet-2      Siluet2, the figure in the middle
    siluet-3      Siluet 3, the small figure at the trunk
    vector-89     a line of Group 56 outside any named figure (between
                  Siluet2 and Siluet 3)
    eye           the eye in the dark wood; it opens and shuts (`eye` below)

Figma's SVG export drops layer names and groups (unless "Include id
attribute" is ticked), so the layers are read by their order in the export,
which is the order of the layers panel: `GROUPS` below. The names and the
counts were read from the frame itself (node 4834:2) through Figma. A
re-export whose counts differ stops here: read the layers again and change
`GROUPS`.

Every line of Fum, the Siluets and Vector 89 is drawn on the page as if by
hand (components/making-drawing.tsx). The lines are Figma's outlined strokes,
filled shapes whose width swells and thins, so they cannot be drawn with
their own stroke. Each is revealed instead through a <mask> holding its
centre line(s), stroked white just wider than the line and drawn along by
`stroke-dashoffset` (pathLength="1", so 1 is the whole line). The centre
lines are the outline drawn at 4x with the non-zero rule (the heads are
rings), thinned (scripts/grain-lines/from-figma.py's `centre_lines`), lengthened
2 units at each end and turned to start from the end nearer the tulnic's
mouth (`MOUTH`), from which the click draws them all. Each mask path carries
`data-len` (its length, frame units) and `data-from` (its start's distance
from the mouth). The page drops a line's mask once it is drawn.

The coverage check prints the share of each line's ink its mask reaches; a
line under 99% would show a piece popping in as its mask is dropped.

Needs numpy, scipy, scikit-image and Pillow.
"""
import importlib.util
import math
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
spec = importlib.util.spec_from_file_location('ff', os.path.join(HERE, 'grain-lines', 'from-figma.py'))
ff = importlib.util.module_from_spec(spec); spec.loader.exec_module(ff)
S = ff.S

# The figures, in the export's order (the layers panel's), with their counts.
GROUPS = [('siluet-3', 'Siluet 3', 6), ('siluet-1', 'Siluet1', 5), ('vector-89', 'Vector 89', 1),
          ('siluet-2', 'Siluet2', 7), ('the-creator', 'The Creator', 7), ('fum', 'Fum', 9)]
DRAWN = {'fum', 'siluet-1', 'siluet-2', 'siluet-3', 'vector-89'}
# Where the smoke leaves the tulnic: the foot of The Creator's long stroke.
MOUTH = (632.0, 1203.0)
EXTEND = 2.0
# The figures' ink on the page (2026-11-05, the author's asking): every line
# of the drawing left of the trunk, The Creator's tulnic too. The eye keeps
# the export's own colours.
INK = '#7B7B7B'
# The ground: the figures may stand on the plank's top, the grey level
# surface the trunk and the vase stand on, but go no lower than its front
# edge, where the dark wood of the plank's face begins (making-sculpture.jpg's
# row 1735 of 2287, the same all the way across: grey 112-145 above, 33 below).
# The author's asking, 2026-11-05: Siluet 3's foot ran down into the dark
# wood. (It was first cut at the top of the plank, 1347.6, which hid the lines
# lying on its surface, so they seemed to go behind the wood.)
GROUND_Y = 1370.2
GROUNDED = {'siluet-1', 'siluet-2', 'siluet-3', 'vector-89', 'the-creator', 'fum'}


def shift(d, dx, dy):
    """Absolute path data moved by -dx, -dy (Figma writes M L H V C Q Z)."""
    out = []; cmd = None; axis = 0
    for t in ff.tokens(d):
        if re.match(r'[A-Za-z]', t):
            cmd = t; axis = 0; out.append(t); continue
        v = float(t)
        if cmd == 'H': v -= dx
        elif cmd == 'V': v -= dy
        else:
            v -= dx if axis == 0 else dy
            axis ^= 1
        out.append(f'{v:.3f}')
    return ' '.join(out)


def ink(d):
    """The outline drawn at S x with the non-zero rule, cropped: mask, x0, y0."""
    polys = [p for p in ff.subpaths(d) if len(p) >= 3]
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    x0, y0 = math.floor(min(xs)) - 8, math.floor(min(ys)) - 8
    w, h = int((max(xs) - x0 + 8) * S), int((max(ys) - y0 + 8) * S)
    wind = np.zeros((h, w), np.int32)
    for p in polys:
        area = sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))
        im = Image.new('L', (w, h), 0)
        ImageDraw.Draw(im).polygon([((x - x0) * S, (y - y0) * S) for x, y in p], fill=1)
        wind += np.asarray(im, np.int32) * (1 if area > 0 else -1)
    return wind != 0, x0, y0


def extend(p, e):
    p = np.asarray(p, float)
    for i, j in ((0, min(3, len(p) - 1)), (-1, max(-4, -len(p)))):
        v = p[i] - p[j]; n = math.hypot(*v)
        if n: p[i] = p[i] + v / n * e
    return p


# --- the eye ------------------------------------------------------------------
#
# The eye opens and closes (2026-11-05, the author's asking: shut at first,
# opening as the reader scrolls down to it). Its upper lid (Vector 48, the gold
# crescent) comes down onto the lower lid (Vector 47), and the author's
# #202020 shape over the eyeball (Vector 49), whose foot is the upper lid's
# upper edge, comes down with it, so the ring, the iris and the pupil go under
# it. Both are written as polygons of the same points open and shut: each lid
# edge sampled at `EYE_N` points evenly across the lid, the n-th point of the
# upper lid going to the n-th of the lower. The page eases every point between
# the two (data-open, data-closed: x y pairs). The file draws it shut.
EYE_N = 120
# The shape's own top, as the author drew it: left, middle, right.
COVER_TOP = [(541.059, 1583.0), (812.84, 1571.0), (999.77, 1606.5)]


def lid_edges(d):
    """A lid crescent's two edges, each sampled at EYE_N points from tip to tip:
    x0, x1 (the tips), the upper edge's y and the lower edge's y."""
    p = np.asarray(ff.subpaths(d, seg=40)[0], float)
    i = int(np.argmax(p[:, 0]))
    a, b = p[:i + 1], p[i:][::-1]
    x0, x1 = p[:, 0].min(), p[:, 0].max()
    xs = np.linspace(x0, x1, EYE_N)

    def along(e):
        e = e[np.argsort(e[:, 0], kind='stable')]
        return np.interp(xs, e[:, 0], e[:, 1])
    ya, yb = along(a), along(b)
    top, bot = (ya, yb) if ya.mean() < yb.mean() else (yb, ya)
    return xs, top, bot


def cover_top(x):
    (ax, ay), (mx, my), (bx, by) = COVER_TOP
    return ay + (my - ay) * (x - ax) / (mx - ax) if x <= mx else my + (by - my) * (x - mx) / (bx - mx)


def flat(pts):
    return ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts)


def poly(pts):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'


# The eye follows the pointer (2026-11-05, the author's asking): the iris, the
# ring of rhombi, moves a little within the gold ring, and the pupil further,
# within the empty middle of the rhombi. The limits are measured here and
# written on the eye's <g>: data-iris (its centre), data-iris-max (how far the
# rhombi can go before they touch the gold ring, inside its 2-unit stroke)
# and data-pupil-max (how far the pupil can go from the rhombi's centre before
# it touches their inner tips).
RING_R = 85.0
EDGE = 1.5


def eye_limits(els):
    iris = next(e for e in els if 'paint1_radial' in e)
    pts = np.array([q for sp in ff.subpaths(re.search(r'\bd="([^"]+)"', iris).group(1)) for q in sp])
    c = (pts.min(0) + pts.max(0)) / 2
    r = np.hypot(*(pts - c).T)
    pupil_r = float(re.search(r'\br="([\d.]+)"', next(e for e in els if e.startswith('<circle'))).group(1))
    return c, RING_R - 1 - r.max() - EDGE, r.min() - pupil_r - EDGE


# The whole eyeball moves too, within the lids, as a real eye does (the
# author's asking, the same day): the gold ring, the rhombi and the pupil go
# together, up to `BALL_MAX` (x, y: more across than up and down, as an eye
# turns), and the lids cut it, so what goes under a lid is hidden. The
# opening is the space between the upper lid's upper edge, open, and the lower
# lid's upper edge (the shape over the eyeball covers the rest when it shuts).
BALL_MAX = (45.0, 14.0)


def eye(els):
    """The eye's elements, re-ordered as the eyeball, the lids and the cover:
    the eyeball (ring, rhombi, pupil) in a group cut to the opening between the
    lids, which moves; the lower lid over it; the upper lid and the cover made
    to open and shut, the cover last, so a shut eye hides the pupil too."""
    find = lambda key: next(i for i, e in enumerate(els) if key in e)
    up, lo, cov = find('paint2_linear'), find('paint0_linear'), find('fill="#202020"')
    iris = find('paint1_radial')
    pupil = next(i for i, e in enumerate(els) if e.startswith('<circle'))
    ring_mask = next(i for i, e in enumerate(els) if e.startswith('<mask'))
    ring = next(i for i, e in enumerate(els) if 'mask="url(#stroke' in e)
    d = lambda e: re.search(r'\bd="([^"]+)"', e).group(1)
    ux, utop, ubot = lid_edges(d(els[up]))
    lx, ltop, lbot = lid_edges(d(els[lo]))

    lid_open = list(zip(ux, utop)) + list(zip(ux[::-1], ubot[::-1]))[1:-1]
    lid_shut = list(zip(lx, ltop)) + list(zip(lx[::-1], lbot[::-1]))[1:-1]
    cov_open = [(ux[0], cover_top(ux[0])), COVER_TOP[1], (ux[-1], cover_top(ux[-1]))] + list(zip(ux[::-1], utop[::-1]))
    cov_shut = [(lx[0], cover_top(lx[0])), COVER_TOP[1], (lx[-1], cover_top(lx[-1]))] + list(zip(lx[::-1], ltop[::-1]))
    opening = list(zip(ux, utop)) + list(zip(lx[::-1], ltop[::-1]))

    def morph(e, eid, a, b):
        e = re.sub(r'\bd="[^"]+"', f'd="{poly(b)}"', e, count=1)
        return e.replace('<path ', f'<path id="{eid}" data-open="{flat(a)}" data-closed="{flat(b)}" ', 1)
    ball = [els[ring_mask], els[ring],
            els[iris].replace('<path ', '<path id="eye-iris" ', 1),
            els[pupil].replace('<circle ', '<circle id="eye-pupil" ', 1)]
    out = [f'<clipPath id="mk-eye-open" clipPathUnits="userSpaceOnUse"><path d="{poly(opening)}"/></clipPath>',
           '<g clip-path="url(#mk-eye-open)"><g id="eye-ball">', *ball, '</g></g>',
           els[lo],
           morph(els[up], 'eye-lid', lid_open, lid_shut),
           morph(els[cov], 'eye-cover', cov_open, cov_shut)]
    used = {up, lo, cov, iris, pupil, ring_mask, ring}
    left = [e for i, e in enumerate(els) if i not in used]
    if left:
        sys.exit(f'{len(left)} element(s) of the eye not placed: read its layers again')
    return out


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'public', 'images', 'home', 'making-drawing.svg')
    svg = open(src, encoding='utf-8').read()
    body = svg[svg.index('>') + 1:svg.index('<defs>')]
    els = re.findall(r'<mask[\s\S]*?</mask>|<(?:path|rect|circle)[^>]*/>', body)
    els = [e for e in els if 'url(#pattern' not in e and 'fill="#FDA76A"' not in e and 'fill="#888888"' not in e]
    need = sum(n for _, _, n in GROUPS)
    if len(els) < need:
        sys.exit(f'{len(els)} elements in the export, the figures alone are {need}: read the layers again')
    defs = svg[svg.index('<defs>'):svg.index('</defs>') + 7]
    defs = re.sub(r'<pattern[\s\S]*?</pattern>\s*', '', defs)
    defs = re.sub(r'<image[^>]*/>\s*', '', defs)

    parts, masks, k = [], [], 0
    for gid, name, n in GROUPS:
        items = []
        for j in range(n):
            e = re.sub(r'fill="(?:black|#202020)"', f'fill="{INK}"', els[k], count=1); k += 1
            if gid not in DRAWN:
                items.append(e); continue
            d = re.search(r'\bd="([^"]+)"', e).group(1)
            m, x0, y0 = ink(d)
            lines = ff.centre_lines(None, 0, 0, mask=m)
            dist = ndi.distance_transform_edt(m)
            width = max(5.0, 2 * dist.max() / S + 3)
            mid = f'mk-{gid}-{j + 1}'
            mp = []
            cover = Image.new('L', (m.shape[1], m.shape[0]), 0); cd = ImageDraw.Draw(cover)
            for l in lines:
                p = ff.rdp(ff.smooth(np.asarray(l, float)), 0.4) + (x0, y0)
                if math.dist(p[0], MOUTH) > math.dist(p[-1], MOUTH): p = p[::-1]
                p = extend(p, EXTEND)
                L = float(np.sum(np.hypot(*np.diff(p, axis=0).T)))
                pts = ' L'.join(f'{x:.1f} {y:.1f}' for x, y in p)
                mp.append(f'<path d="M{pts}" pathLength="1" data-len="{L:.0f}" data-from="{math.dist(p[0], MOUTH):.0f}"/>')
                cd.line([((x - x0) * S, (y - y0) * S) for x, y in p], fill=255, width=int(width * S), joint='curve')
            got = (np.asarray(cover) > 0) & m
            print(f'{mid}: {len(lines)} line(s), mask {width:.1f} wide, covers {100 * got.sum() / m.sum():.2f}% of its ink')
            masks.append(f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1893" height="1806">'
                         f'<g fill="none" stroke="#fff" stroke-width="{width:.1f}" stroke-dasharray="1 2" stroke-dashoffset="1">'
                         + ''.join(mp) + '</g></mask>')
            items.append(e.replace('<path ', f'<path data-line="{mid}" mask="url(#{mid})" ', 1))
        clip = ' clip-path="url(#mk-ground)"' if gid in GROUNDED else ''
        parts.append(f'<g id="{gid}" data-name="{name}"{clip}>\n' + '\n'.join(items) + '\n</g>')
    c, iris_max, pupil_max = eye_limits(els[k:])
    print(f'eye: rhombi round {c[0]:.1f},{c[1]:.1f}, free to move {iris_max:.1f}; pupil free to move {pupil_max:.1f}')
    parts.append(f'<g id="eye" data-name="the eye (Group 59, Vector 49, Ellipse 8)" data-iris="{c[0]:.2f} {c[1]:.2f}" '
                 f'data-iris-max="{iris_max:.1f}" data-pupil-max="{pupil_max:.1f}" data-ball-max="{BALL_MAX[0]:g} {BALL_MAX[1]:g}">\n'
                 + '\n'.join(eye(els[k:])) + '\n</g>')
    masks.append(f'<clipPath id="mk-ground" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="1893" height="{GROUND_Y}"/></clipPath>')
    defs = defs.replace('<defs>', '<defs>\n' + '\n'.join(masks), 1)

    out = ('<svg xmlns="http://www.w3.org/2000/svg" width="1893" height="1804" viewBox="0 2 1893 1804" fill="none">\n'
           '<!-- Written by scripts/making-drawing.py from the Figma frame "Making": the figures and the eye,\n'
           '     without the photograph, the words or the crevices. The lines of Fum and the Siluets are\n'
           '     masked shut until components/making-drawing.tsx draws them. -->\n'
           + '\n'.join(parts) + '\n' + defs + '\n</svg>\n')
    open(dst, 'w', encoding='utf-8').write(out)
    print('wrote', dst, len(out), 'bytes')


if __name__ == '__main__':
    main()
