"""
The line drawings of the homepage's Making section, from the author's Figma
frame "Making" (2026-11-05; re-exported 2026-11-14 and 2026-11-17). Writes
public/images/home/making-drawing.svg.

    python3 scripts/making-drawing.py public/images/home/Making.svg [out.svg]
    python3 scripts/making-drawing.py --mobile "public/images/home/Making - Mobile.svg" [out.svg]

**Since 2026-11-17** the computer's frame is the author's Making_Homepage.svg
(1893 x 1850), copied over public/images/home/Making.svg. Its figures are
CREATOR1 by the trunk with its pen and the four lines it draws, SILUET right of
the trunk, CREATOR2 on the left, now with a trumpet instead of a pen, and the
three melodies out of the trumpet (`GROUPS`); the words lie among them in the
layers and are skipped; the sea of drawings, the two photographs, the crevices
and the sun are not figures (scripts/making-split.py reads those). The eye is
the author's, flipped and smaller, at 20% (`data-rest`). The file's viewBox is
the whole frame, and every figure is in one group, `mk-figures`, so the page
can fade them all out as the reader goes on down (the eye stays).

The second writes public/images/home/making-drawing-mobile.svg from the
author's frame "Making - Mobile" (974 x 2046, 2026-11-05), the phone's
composition: fewer lines (no Siluet2, no Vector 89, six of Fum's nine), each
figure at its own size, the eye moved. Its export has no shape over the
eyeball (Vector 49), so that one is taken from the computer's export (the
second file) and moved with the eye (`MOBILE_EYE_SHIFT`). It is written in the
phone frame's own units, with a viewBox that is the photograph's box there
(`VARIANTS`), so the page lays it over the photograph exactly as it lays the
computer's.

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
# Since 2026-11-14 the computer's frame is the author's new "Making" (node
# 5079:30), re-exported over the old: the eye comes first in it (`EYE_FIRST`),
# then Group 60:
#   creator-1  CREATOR1 (Group 56), the figure by the trunk, with its pen (a
#              Vector of its own after it) and the long line across the words
#   siluet-2   Siluet2, the figure in the middle (Vector 89 is inside it now)
#   creator-2  CREATOR2, the figure on the left, with its pen (a Vector of its
#              own after SILUET) and DESEN1, the line out of the pen to Siluet2
#   siluet-3   SILUET, the figure right of the trunk (the small Siluet 3 is gone)
# Each creator draws its line (the author's asking, the same day; see
# `PEN_PARTS`). Of a creator only its head, arm and pen stand fixed (`FIXED`,
# the author's choice, the same afternoon): CREATOR1's head outline (Vector 80)
# and hood (Vector 81), CREATOR2's head outline (Vector 49) and Vector 50 (the
# same afternoon). Its other lines are drawn as the Siluets' are.
# A gid named twice is one <g>. The old frame (node 4834:2) had Siluet 3 (6),
# Siluet1 (5), Vector 89 (1), Siluet2 (7), The Creator (7), Fum (9), the eye last.
# (The frame of 2026-11-14 had: creator-1 11, Siluet2 8, CREATOR2 7, SILUET 7,
# CREATOR2's pen 1, DESEN1 and its waves 4; FIXED {0, 1, 19, 21}.)
#
# The frame of 2026-11-17 (Making_Homepage.svg), after the eye:
#   creator-1  CREATOR1, as before: head (Vector 80), hood (Vector 81), two
#              lines, the arm, the four lines it draws, two lines, the pen
#   siluet-3   SILUET, right of the trunk, six lines (it had seven)
#   (words)    the heading and the two lines, outlined: set as text on the page
#   creator-2  CREATOR2, on the left: the head outline down to the ground, four
#              lines of the body, the hood, the two arms, and the trumpet
#   melody     the three melodies out of the trumpet's bell (the author's
#              brief: travelled by strokes as SILUET's lines are)
# Siluet2 and DESEN1 are gone. A gid of None is skipped.
# Since the author's asking the same evening CREATOR2 and the melodies are
# skipped too: they are no longer on the page (their gids were 'creator-2'
# and 'melody'; put them back to draw them again).
GROUPS = [('creator-1', 'CREATOR1', 11), ('siluet-3', 'SILUET', 6), (None, 'the words', 2),
          (None, 'CREATOR2', 9), (None, "the melodies out of CREATOR2's trumpet", 3)]
EYE_FIRST = True
EYE_COUNT = 7
DRAWN = {'fum', 'siluet-1', 'siluet-2', 'siluet-3', 'vector-89', 'creator-1', 'creator-2', 'melody'}
# Elements of drawn groups that stand fixed, counted through `GROUPS` (the
# computer's frame): CREATOR1's head and hood; CREATOR2's head outline, hood,
# both arms and the trumpet (19, 24, 25, 26, 27).
FIXED = {0, 1, 19, 24, 25, 26, 27}
# CREATOR2's trumpet, counted the same way: the melodies' strokes leave from
# its bell (`MOUTH` for the computer's frame is found from it in `main`).
TRUMPET = 27
# The hands that draw (2026-11-14, the author's asking): which of the figures'
# elements, counted through `GROUPS`, are a creator's arm (the one line from
# its shoulder to the pen), its pen and the line out of the pen's tip. The
# page turns the arm with the pen about the shoulder and the pen about the
# wrist, and draws the line out of the tip (components/making-drawing.tsx);
# for that the file gives, on each line's group `pen-line-<n>`:
#   data-shoulder  the arm's end away from the pen
#   data-wrist     where the arm crosses the pen
#   data-tip       the pen's point, where the line begins
#   data-len       the line's length (its mask's path, as every drawn line's)
#   data-lead      how much of the line's start is the "lead" (`LEAD`)
# and the arm and the pen as nested groups, `creator-<n>-arm` > `creator-<n>-pen`.
# The lead is the line's first stretch as two rows of points, one down each
# side of its outline from the tip (`data-a`, `data-b` on `pen-lead-<n>`: x y s,
# s the way along the line), which the page draws itself, bent a little so the
# line always leaves the pen's tip wherever the hand has moved it; the rest of
# the outline shows through its mask from `LEAD` on, as the other lines do.
PEN_PARTS = {3: ('arm', 1), 10: ('pen', 1)}
# (2026-11-14: also {25: ('arm', 2), 33: ('pen', 2), 37: ('line', 2)}, CREATOR2's
# pen and DESEN1; on 2026-11-17 the pen became a trumpet, so only CREATOR1 draws.)
# The upper creator draws as a pen on a plotter (2026-11-14, the author's
# re-export of the same afternoon: the long line across the words became four
# shorter ones): the four lines run from right to left, appearing at the pen's
# point, and the hand rises and falls to follow their waves. They are drawn
# from their left ends, one after another, the pen lifted between them; the
# drawing comes round again `PAPER_GAP` units after the last. See `paper`.
PAPER = {1: [4, 5, 6, 7]}
PAPER_GAP = 40.0
# The lower creator draws its one line as a plotter too (the same evening):
# the ink runs down the line away from the pen, the pen swinging across it in
# waves that fade as the ink goes, gone by the line's lowest point, so that
# what reaches Siluet2 is the line as drawn. See `wave`. WAVE = the creators
# drawn so; WAVE_AMP: the most the pen's point swings across (units, the
# page's `WAVE_AMP`, only for the check of how near the pen comes to anything).
WAVE = set()  # {2} until 2026-11-17, when CREATOR2's pen became a trumpet
# …and the author's three drawings of the waves on it (2026-11-14, the frame
# re-exported with DESEN1 redrawn and three more curves beside it): each leaves
# the pen's point and meets DESEN1 lower down, the same bends a little further
# along in each. The page passes from one to the next, so the bends run down
# the line and a new one is born at the pen. Written as how far each is from
# DESEN1 along it (`variants`); not drawn themselves.
WAVE_VARIANTS = {}  # {2: [34, 35, 36]} until 2026-11-17
WAVE_AMP = (-8.0, 12.0)
# Track points every this many units along the way the pen's point goes.
TRACK_STEP = 1.5
WAVE_STEP = 2.5
LEAD = 110.0
# The hands' swings as the page has them (`HANDS` in making-drawing.tsx:
# shoulder, wrist degrees, lag, flick, bias), only to print how far the pen's
# point and far end move and how near the pens come to any other line at twice
# the swing (the click's `CLICK_BOOST`). Keep the two the same.
HANDS_CHECK = {2: (1.7, 3.4, 1.15, 0.22, 0.5)}
# The plotter's hand (`PLOT_WRIST` in making-drawing.tsx): as the arm turns at
# the shoulder to follow the line, the pen turns at the wrist this share of it,
# so -0.5 keeps the pen's slant half as steady as the arm (keep the two the same).
PLOT_WRIST = -0.5
CHECK_BOOST = 2
# Where the click's drawing starts. On the phone and in the old frame the foot
# of The Creator's tulnic (632, 1203); in the computer's new frame the end of
# DESEN1, where the creator's line reaches Siluet2 (found in `main`).
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
# In the frame of 2026-11-17 the plank's dark face begins at y 1362.9
# (making-trunk.webp's row 2927 of 2951; scripts/making-split.py prints it).
GROUND_Y_2026_11_17 = 1362.9
GROUNDED = {'siluet-1', 'siluet-2', 'siluet-3', 'vector-89', 'the-creator', 'fum', 'creator-1', 'creator-2', 'melody'}


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
# The shape's own top, as the author drew it: left, middle, right. Read off the
# shape itself (`cover_top_of`): its top is two straight lines. These are the
# values of the frame of 2026-11-14, whose shape the phone's eye borrows.
COVER_TOP = [(541.059, 1583.0), (812.84, 1571.0), (999.77, 1606.5)]
# That shape, as it was in the computer's frame of 2026-11-14: the phone's
# export has none (`MOBILE_EYE_SHIFT`), and the computer's frame no longer has
# this one (its eye was flipped and made smaller on 2026-11-17).
COVER_2026_11_14 = 'M853.063 1627.53C809.99 1610.81 765.156 1598.96 719.203 1596.18C674.527 1593.47 630.932 1602.02 586.978 1609.41C572.002 1611.93 556.308 1615.16 541.059 1615.25C540.855 1615.25 541.262 1583 541.059 1583L812.84 1571L999.77 1606.5C999.77 1606.5 999.943 1661.76 999.77 1661.74C994.664 1661.15 915.543 1651.79 853.063 1627.53Z'


def cover_top_of(d):
    """The shape's top: the point its first straight line leaves from and the
    ends of its two straight lines, left to right."""
    m = re.search(r'([-\d.]+)[ ,]([-\d.]+)\s*L\s*([-\d.]+)[ ,]([-\d.]+)\s*L\s*([-\d.]+)[ ,]([-\d.]+)', d)
    if not m:
        sys.exit('the shape over the eyeball has no top of two straight lines: read the eye again')
    v = list(map(float, m.groups()))
    return sorted([(v[0], v[1]), (v[2], v[3]), (v[4], v[5])])


def lid_edges(d):
    """A lid crescent's two edges, each sampled at EYE_N points from tip to tip:
    x0, x1 (the tips), the upper edge's y and the lower edge's y."""
    p = np.asarray(ff.subpaths(d, seg=40)[0], float)
    # The outline runs round from wherever Figma began it (at the left tip
    # until 2026-11-14; the flipped eye of 2026-11-17 begins elsewhere): its
    # two edges are the two ways round from the left tip to the right one.
    lo, hi = int(np.argmin(p[:, 0])), int(np.argmax(p[:, 0]))
    q = np.roll(p, -lo, axis=0)
    i = (hi - lo) % len(p)
    a, b = q[:i + 1], np.vstack([q[i:], q[:1]])[::-1]
    x0, x1 = p[:, 0].min(), p[:, 0].max()
    xs = np.linspace(x0, x1, EYE_N)

    def along(e):
        e = e[np.argsort(e[:, 0], kind='stable')]
        return np.interp(xs, e[:, 0], e[:, 1])
    ya, yb = along(a), along(b)
    top, bot = (ya, yb) if ya.mean() < yb.mean() else (yb, ya)
    return xs, top, bot


# Where the eye stands against the computer's (0, 0 there; the phone's is
# MOBILE_EYE_SHIFT): COVER_TOP was read off the computer's frame.
EYE_AT = [0.0, 0.0]
# The computer's frame reads the top off its own shape; the phone's keeps the
# 2026-11-14 shape's, moved (`EYE_AT`).
COVER_FROM_SHAPE = [False]


def cover_top_pts():
    return [(x + EYE_AT[0], y + EYE_AT[1]) for x, y in COVER_TOP]


def cover_top(x):
    (ax, ay), (mx, my), (bx, by) = cover_top_pts()
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


def is_pupil(e):
    """The pupil: the eye's one circle (an <ellipse> since 2026-11-17) that is not the masked gold ring."""
    return (e.startswith('<circle') or e.startswith('<ellipse')) and 'mask=' not in e


def ring_r(els):
    """The gold ring's radius: its <ellipse>'s (the export of 2026-11-14 on), or `RING_R`."""
    ring = next((e for e in els if e.startswith('<ellipse') and 'mask=' in e), None)
    m = ring and re.search(r'\brx="([\d.]+)"', ring)
    return float(m.group(1)) if m else RING_R


def eye_limits(els):
    iris = next(e for e in els if 'paint1_radial' in e)
    pts = np.array([q for sp in ff.subpaths(re.search(r'\bd="([^"]+)"', iris).group(1)) for q in sp])
    c = (pts.min(0) + pts.max(0)) / 2
    r = np.hypot(*(pts - c).T)
    pupil = next(e for e in els if is_pupil(e))
    pupil_r = float(re.search(r'\br(?:x)?="([\d.]+)"', pupil).group(1))
    return c, ring_r(els) - 1 - r.max() - EDGE, r.min() - pupil_r - EDGE


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
    pupil = next(i for i, e in enumerate(els) if is_pupil(e))
    ring_mask = next(i for i, e in enumerate(els) if e.startswith('<mask'))
    ring = next(i for i, e in enumerate(els) if 'mask="url(#stroke' in e)
    d = lambda e: re.search(r'\bd="([^"]+)"', e).group(1)
    ux, utop, ubot = lid_edges(d(els[up]))
    lx, ltop, lbot = lid_edges(d(els[lo]))
    if COVER_FROM_SHAPE[0]:
        COVER_TOP[:] = cover_top_of(d(els[cov]))

    lid_open = list(zip(ux, utop)) + list(zip(ux[::-1], ubot[::-1]))[1:-1]
    lid_shut = list(zip(lx, ltop)) + list(zip(lx[::-1], lbot[::-1]))[1:-1]
    cov_open = [(ux[0], cover_top(ux[0])), cover_top_pts()[1], (ux[-1], cover_top(ux[-1]))] + list(zip(ux[::-1], utop[::-1]))
    cov_shut = [(lx[0], cover_top(lx[0])), cover_top_pts()[1], (lx[-1], cover_top(lx[-1]))] + list(zip(lx[::-1], ltop[::-1]))
    opening = list(zip(ux, utop)) + list(zip(lx[::-1], ltop[::-1]))

    def morph(e, eid, a, b):
        e = re.sub(r'\bd="[^"]+"', f'd="{poly(b)}"', e, count=1)
        return e.replace('<path ', f'<path id="{eid}" data-open="{flat(a)}" data-closed="{flat(b)}" ', 1)
    ball = [els[ring_mask], els[ring],
            els[iris].replace('<path ', '<path id="eye-iris" ', 1),
            re.sub(r'^<(circle|ellipse) ', r'<\1 id="eye-pupil" ', els[pupil], count=1)]
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


# --- the hands that draw --------------------------------------------------------

def outline(e, seg=24):
    """An element's outline as points (frame units), every subpath."""
    return [np.asarray(sp, float) for sp in ff.subpaths(re.search(r'\bd="([^"]+)"', e).group(1), seg) if len(sp) >= 3]


def along(p, q):
    """How far along the polyline `p` the point `q` lies (its nearest point), and how far off it."""
    best = (1e18, 0.0); acc = 0.0
    for a, b in zip(p[:-1], p[1:]):
        v = b - a; L = float(np.hypot(*v))
        if L == 0: continue
        t = min(1.0, max(0.0, float(np.dot(q - a, v)) / (L * L)))
        dd = float(np.hypot(*(a + v * t - q)))
        if dd < best[0]: best = (dd, acc + t * L)
        acc += L
    return best[1], best[0]


def joints(n, arm, pen, tip):
    """A creator's shoulder (the arm's point furthest from the pen's point) and
    wrist (where the arm crosses the pen's axis), and the pen's far end."""
    top = max((pt for pt in pen), key=lambda pt: math.dist(pt, tip))
    shoulder = max((pt for pt in arm), key=lambda pt: math.dist(pt, tip))
    ax = (top - tip) / math.dist(top, tip)
    off = np.abs((arm - tip) @ np.array([-ax[1], ax[0]]))
    on = (arm - tip) @ ax
    near = on[(off < 1.5) & (on > 0) & (on < math.dist(top, tip))]
    if not len(near):
        sys.exit(f"the arm of creator {n} does not cross its pen: read the layers again")
    return shoulder, tip + ax * float(np.median(near)), top


def resample(p, step):
    """A polyline as points `step` apart along it, with the way along each: x y u rows."""
    p = np.asarray(p, float)
    seg = np.hypot(*np.diff(p, axis=0).T); u = np.concatenate([[0], np.cumsum(seg)])
    us = np.arange(0, u[-1], step); us = np.append(us, u[-1])
    return np.column_stack([np.interp(us, u, p[:, 0]), np.interp(us, u, p[:, 1]), us])


def paper(n, h, trace, mask_of, masks):
    """The upper creator's plotter: fills `h` with 'limb', 'drawn', 'geo'."""
    pen = np.vstack(outline(h['pen'])); arm = np.vstack(outline(h['arm']))
    traced = []
    for e in h['paper']:
        d, m, x0, y0, found, width = trace(e)
        if len(found) != 1:
            sys.exit(f'a line of creator {n} has {len(found)} centre lines, not one: read it again')
        f = found[0] if found[0][0][0] <= found[0][-1][0] else found[0][::-1]
        traced.append((e, m, x0, y0, [f], width, f[0]))
    traced.sort(key=lambda t: t[6][0])            # left to right: the order they are drawn in
    # the pen's point: of the pen's two ends (its outline's two points furthest
    # apart), the one nearer the last line's right end
    last_end = traced[-1][4][0][-1]
    dd = np.hypot(pen[:, None, 0] - pen[None, :, 0], pen[:, None, 1] - pen[None, :, 1])
    i, j = np.unravel_index(int(np.argmax(dd)), dd.shape)
    tip = min((pen[i], pen[j]), key=lambda pt: math.dist(pt, last_end))
    shoulder, wrist, top = joints(n, arm, pen, tip)
    rows, items, u = [], [], 0.0
    first_start = None
    for i, (e, m, x0, y0, found, width, start) in enumerate(traced):
        mid = f'mk-paper-{n}-{i + 1}'
        mk, ps = mask_of(mid, m, x0, y0, found, width, start)
        masks.append(mk)
        p = ps[0]
        if first_start is None: first_start = p[0]
        if rows:                                   # the pen lifted, from the last line's end to this one's start
            a = rows[-1][-1][:2]
            gap = resample(np.array([a, p[0]]), TRACK_STEP)[1:]
            gap[:, 2] += u; u = float(gap[-1, 2]); rows.append(gap)
        r = resample(p, TRACK_STEP); L = float(r[-1, 2]); r[:, 2] += u
        items.append(e.replace('<path ', f'<path data-u0="{u:.1f}" data-len="{L:.1f}" mask="url(#{mid})" ', 1))
        u += L; rows.append(r)
    period = float(tip[0] - first_start[0] + PAPER_GAP)
    back = resample(np.array([rows[-1][-1][:2], first_start + (period, 0)]), TRACK_STEP)[1:]
    back[:, 2] += u; rows.append(back)
    track = np.vstack(rows); cycle = float(track[-1, 2])
    # where the drawing stands as the author drew it: the pen's point on the last line
    lastrow = rows[-2]
    rest_u = float(lastrow[np.argmin(np.hypot(lastrow[:, 0] - tip[0], lastrow[:, 1] - tip[1])), 2])
    f2 = lambda v: f'{v[0]:.2f} {v[1]:.2f}'
    h['limb'] = (f'<g id="creator-{n}-arm">\n{h["arm"]}\n<g id="creator-{n}-pen">\n{h["pen"]}\n</g>\n</g>')
    h['drawn'] = (f'<g id="paper-{n}" data-name="the lines creator {n} draws" data-shoulder="{f2(shoulder)}" data-wrist="{f2(wrist)}" '
                  f'data-tip="{f2(tip)}" data-period="{period:.1f}" data-cycle="{cycle:.1f}" data-rest-u="{rest_u:.1f}" '
                  f'data-track="{" ".join(f"{x:.1f} {y:.1f} {uu:.1f}" for x, y, uu in track)}">\n'
                  f'<g id="paper-{n}-a">\n' + '\n'.join(items) + '\n</g>\n</g>')
    h['end'] = tuple(traced[-1][4][0][-1])
    h['geo'] = (shoulder, wrist, tip, pen)
    h['track'] = track
    print(f'creator {n} (plotter): shoulder {f2(shoulder)}, wrist {f2(wrist)}, tip {f2(tip)}, {len(traced)} lines, '
          f'way round {cycle:.0f}, the drawing comes round every {period:.0f}, as drawn at {rest_u:.0f}; '
          f'the point rises {tip[1] - track[:, 1].min():.0f} and falls {track[:, 1].max() - tip[1]:.0f}')


def wave(n, h, trace, mask_of, masks):
    """The lower creator's line as a plotter draws it: fills `h` with 'limb',
    'drawn', 'geo', 'end' and 'wave'. The file gives the line's centre from the
    pen's point to its end, every `WAVE_STEP` units, as x y nx ny w rows (the
    normal pointing to the line's right as it goes, and half the line's width
    there), and the way along to its lowest point (`data-bottom`), where the
    waves are gone."""
    pen = np.vstack(outline(h['pen'])); arm = np.vstack(outline(h['arm']))
    d, m, x0, y0, found, width = trace(h['line'])
    if len(found) != 1:
        sys.exit(f'the line of creator {n} has {len(found)} centre lines, not one: read it again')
    ends = [found[0][0], found[0][-1]]
    tip = min((pt for pt in pen), key=lambda pt: min(math.dist(pt, e) for e in ends))
    shoulder, wrist, top = joints(n, arm, pen, tip)
    p = found[0] if math.dist(found[0][0], tip) < math.dist(found[0][-1], tip) else found[0][::-1]
    p = np.vstack([tip, p])
    r = resample(p, WAVE_STEP)
    dist = ndi.distance_transform_edt(m) / S
    hw = np.array([dist[min(m.shape[0] - 1, max(0, int(round((y - y0) * S)))), min(m.shape[1] - 1, max(0, int(round((x - x0) * S))))]
                   for x, y, _ in r])
    hw = np.maximum(ndi.uniform_filter1d(hw, 5), 0.3)
    xy = r[:, :2]
    tg = np.gradient(ndi.gaussian_filter1d(xy, 2, axis=0), axis=0)
    tg /= np.hypot(*tg.T)[:, None]
    nrm = np.column_stack([-tg[:, 1], tg[:, 0]])
    bottom = float(r[int(np.argmax(r[:, 1])), 2])
    L = float(r[-1, 2])
    # the author's waves: each as how far it is from the line, at the line's points
    keys, joins = [], []
    for e in h.get('variants', []):
        _, _, _, _, vf, _ = trace(e)
        # its centre, in one piece from the pen: pieces joined end to nearest end
        pieces = [np.asarray(q, float) for q in vf]
        v = np.asarray(tip, float)[None, :]
        while pieces:
            j = min(range(len(pieces)), key=lambda i: min(math.dist(pieces[i][0], v[-1]), math.dist(pieces[i][-1], v[-1])))
            q = pieces.pop(j)
            if math.dist(q[-1], v[-1]) < math.dist(q[0], v[-1]): q = q[::-1]
            if math.dist(q[0], v[-1]) > 25:
                sys.exit(f'a wave of creator {n} breaks {math.dist(q[0], v[-1]):.0f} units apart: read it again')
            v = np.vstack([v, q])
        # where it meets the line: the line's nearest point to the wave's end
        k_end = int(np.argmin(np.hypot(*(xy - v[-1]).T)))
        sv = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(v, axis=0).T))])
        frac = np.linspace(0, 1, k_end + 1)
        vx = np.interp(frac * sv[-1], sv, v[:, 0]); vy = np.interp(frac * sv[-1], sv, v[:, 1])
        dxy = np.column_stack([vx, vy]) - xy[:k_end + 1]
        dxy[0] = 0; dxy[-1] = 0
        # so the wave meets the line without a step: the last stretch eased in
        m_ = min(len(dxy) - 1, 12)
        dxy[-m_:] *= (0.5 * (1 + np.cos(np.linspace(0, np.pi, m_))))[:, None]
        keys.append(dxy); joins.append(k_end)
    if keys:
        span = max(joins) + 1
        keys = [np.vstack([k, np.zeros((span - len(k), 2))]) for k in keys]
        # in the order whose bends run down the line most: how far each one's
        # bends lie past the one before's (across the line), summed round the cycle
        nr = nrm[:span]
        prof = [(k * nr).sum(1) for k in keys]
        def shift(a, b):
            m_ = len(a)
            return max(range(-60, 61), key=lambda sh: float(np.dot(a[max(0, -sh):m_ - max(0, sh)], b[max(0, sh):m_ - max(0, -sh)])))
        import itertools
        order = max((list((0,) + q) for q in itertools.permutations(range(1, len(keys)))),
                    key=lambda o: sum(shift(prof[o[i]], prof[o[(i + 1) % len(o)]]) for i in range(len(o))))
        keys = [keys[i] for i in order]
        print(f'creator {n}: {len(keys)} waves, meeting the line by {r[span - 1, 2]:.0f} along it, '
              f'furthest out {max(float(np.hypot(*k.T).max()) for k in keys):.0f}')
    f2 = lambda v: f'{v[0]:.2f} {v[1]:.2f}'
    h['limb'] = (f'<g id="creator-{n}-arm">\n{h["arm"]}\n<g id="creator-{n}-pen">\n{h["pen"]}\n</g>\n</g>')
    rows = ' '.join(f'{x:.1f} {y:.1f} {a:.3f} {b:.3f} {w:.2f}' for (x, y), (a, b), w in zip(xy, nrm, hw))
    h['drawn'] = (f'<g id="wave-{n}" data-name="the line creator {n} draws" data-shoulder="{f2(shoulder)}" data-wrist="{f2(wrist)}" '
                  f'data-tip="{f2(tip)}" data-len="{L:.1f}" data-step="{WAVE_STEP:g}" data-bottom="{bottom:.1f}" data-track="{rows}"'
                  + (f' data-keys="{len(keys)} {len(keys[0]) if keys else 0} ' + ' '.join(f'{a:.2f} {b:.2f}' for k in keys for a, b in k) + '"' if keys else '')
                  + '>\n'
                  + h['line'].replace('<path ', f'<path id="wave-{n}-line" visibility="hidden" ', 1) + '\n'
                  + f'<path id="wave-{n}-ink" d="" fill="{INK}"/>\n</g>')
    h['end'] = (float(xy[-1][0]), float(xy[-1][1]))
    h['geo'] = (shoulder, wrist, tip, pen)
    h['wave'] = nrm[0]
    print(f'creator {n} (waves): shoulder {f2(shoulder)}, wrist {f2(wrist)}, tip {f2(tip)}, line {L:.0f} long, '
          f'lowest at {bottom:.0f}, {len(r)} points, the pen swings across {f2(nrm[0])}')


def hand(n, h, trace, mask_of, masks):
    """One creator's arm, pen and line: fills `h` with 'limb' (the arm and pen as
    nested groups), 'drawn' (the line's group) and 'end' (where the line ends)."""
    pen = np.vstack(outline(h['pen'])); arm = np.vstack(outline(h['arm']))
    d, m, x0, y0, found, width = trace(h['line'])
    if len(found) != 1:
        sys.exit(f'the line of creator {n} has {len(found)} centre lines, not one: read it again')
    # the pen's point: its outline's point nearest either end of the line
    ends = [found[0][0], found[0][-1]]
    tip = min((pt for pt in pen), key=lambda pt: min(math.dist(pt, e) for e in ends))
    top = max((pt for pt in pen), key=lambda pt: math.dist(pt, tip))
    mid = f'mk-pen-{n}'
    mk, ps = mask_of(mid, m, x0, y0, found, width, tip, reach=True)
    masks.append(mk)
    p = ps[0]
    L = float(np.sum(np.hypot(*np.diff(p, axis=0).T)))
    # the shoulder: the arm's point furthest from the pen's point; the wrist:
    # where the arm crosses the pen's axis, as a place on that axis
    shoulder, wrist, top = joints(n, arm, pen, tip)
    # the lead: the outline's two sides from the point at the pen out to LEAD
    o = max(outline(h['line']), key=len)
    sv = np.array([along(p, q)[0] for q in o])
    apex = int(np.argmin([math.dist(q, tip) for q in o]))
    def side(step):
        row = [(o[apex][0], o[apex][1], float(sv[apex]))]; i = apex
        for _ in range(len(o)):
            j = (i + step) % len(o)
            s = max(float(sv[j]), row[-1][2])
            if s >= LEAD:
                # cut between the outline's own two points here (the row skips some)
                a_ = o[i]; sa = min(max(float(sv[i]), row[-1][2]), LEAD); t = (LEAD - sa) / (s - sa) if s > sa else 0
                q = a_ + (o[j] - a_) * t
                row.append((q[0], q[1], LEAD)); break
            if math.dist(o[j], row[-1][:2]) >= 1.0:
                row.append((o[j][0], o[j][1], s))
            i = j
        return row
    A, B = side(+1), side(-1)
    flat = lambda row: ' '.join(f'{x:.2f} {y:.2f} {s:.1f}' for x, y, s in row)
    f2 = lambda v: f'{v[0]:.2f} {v[1]:.2f}'
    h['limb'] = (f'<g id="creator-{n}-arm">\n{h["arm"]}\n<g id="creator-{n}-pen">\n{h["pen"]}\n</g>\n</g>')
    h['drawn'] = (f'<g id="pen-line-{n}" data-name="the line creator {n} draws" data-shoulder="{f2(shoulder)}" data-wrist="{f2(wrist)}" '
                  f'data-tip="{f2(tip)}" data-len="{L:.1f}" data-lead="{LEAD:g}" data-mask="{mid}">\n'
                  + h['line'].replace('<path ', f'<path mask="url(#{mid})" ', 1) + '\n'
                  + f'<path id="pen-lead-{n}" data-a="{flat(A)}" data-b="{flat(B)}" d="" fill="{INK}"/>\n</g>')
    h['end'] = (float(p[-1][0]), float(p[-1][1]))
    h['geo'] = (shoulder, wrist, tip, pen)
    print(f'creator {n}: shoulder {f2(shoulder)}, wrist {f2(wrist)}, tip {f2(tip)}, pen {math.dist(top, tip):.0f} long, '
          f'line {L:.0f} long, lead {len(A)} + {len(B)} points (s from {A[0][2]:.1f})')


def clearance(hands, others):
    """How far each pen's point and far end move (from the middle of their way),
    and how near the pen above the hand comes to any other line at `CHECK_BOOST`."""
    rest = np.vstack([q for e in others if ' d="' in e for q in outline(e, 8)])
    ph = np.linspace(0, 2 * math.pi, 120, endpoint=False)
    def rot(q, c, a):
        a = math.radians(a); R = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
        return c + (q - c) @ R.T
    for n, h in sorted(hands.items()):
        shoulder, wrist, tip, pen = h['geo']
        if 'wave' in h:
            # the pen's point swung across the line at its start, the arm turned to put it there
            nv = h['wave']
            upper = pen[np.hypot(*(pen - tip).T) > 45][::2]
            top = max(pen, key=lambda q: math.dist(q, tip))
            near = rest[np.hypot(*(rest - top).T) < 300]
            angs = np.linspace(-30, 30, 1201)
            across = np.array([float((rot(rot(tip[None, :], wrist, PLOT_WRIST * a), shoulder, a)[0] - tip) @ nv) for a in angs])
            if not np.all(np.diff(across) > 0) and not np.all(np.diff(across) < 0):
                sys.exit(f'creator {n}: the pen\'s point does not swing across one way with the arm: change PLOT_WRIST')
            order = np.argsort(across)
            a_of = lambda v: float(np.interp(v, across[order], angs[order]))
            lo, hi = a_of(WAVE_AMP[0]), a_of(WAVE_AMP[1])
            least = min(float(np.sqrt(((rot(rot(upper, wrist, PLOT_WRIST * a), shoulder, a)[:, None, :] - near[None, :, :]) ** 2).sum(2)).min())
                        for a in np.linspace(min(lo, hi), max(lo, hi), 25))
            print(f'creator {n}: swinging {WAVE_AMP[0]:g} to {WAVE_AMP[1]:g} across, the arm turns {lo:.1f} to {hi:.1f} degrees; '
                  f'its pen stays {least:.1f} from every other line')
            continue
        if 'track' in h:
            # the plotter: the arm turned so the pen's point is at the track's height, at every point of it
            upper = pen[np.hypot(*(pen - tip).T) > 45][::2]
            top = max(pen, key=lambda q: math.dist(q, tip))
            near = rest[np.hypot(*(rest - top).T) < 300]
            angs = np.linspace(-40, 40, 1601)
            ys = np.array([rot(rot(tip[None, :], wrist, PLOT_WRIST * a), shoulder, a)[0, 1] for a in angs])
            if not np.all(np.diff(ys) > 0) and not np.all(np.diff(ys) < 0):
                sys.exit(f'creator {n}: the height of the pen\'s point does not follow the arm one way: change PLOT_WRIST')
            order = np.argsort(ys)
            a_of = lambda y: float(np.interp(y, ys[order], angs[order]))
            need = [a_of(y) for y in h['track'][::10, 1]]
            least = min(float(np.sqrt(((rot(rot(upper, wrist, PLOT_WRIST * a), shoulder, a)[:, None, :] - near[None, :, :]) ** 2).sum(2)).min())
                        for a in np.linspace(min(need), max(need), 25))
            print(f'creator {n}: the arm turns {min(need):.1f} to {max(need):.1f} degrees, '
                  f'the pen {PLOT_WRIST * min(need):.1f} to {PLOT_WRIST * max(need):.1f} more; its pen stays {least:.1f} from every other line')
            continue
        A1, A2, lag, flick, bias = HANDS_CHECK[n]
        top = max(pen, key=lambda q: math.dist(q, tip))
        upper = pen[np.hypot(*(pen - tip).T) > 45][::2]
        near = rest[np.hypot(*(rest - top).T) < 250]
        def at(k, f, pts):
            a1 = k * A1 * (math.sin(f) + bias)
            a2 = k * A2 * (math.sin(f - lag) + flick * math.sin(2 * f + 0.6) + bias)
            return rot(rot(pts, wrist, a2), shoulder, a1)
        way = np.array([at(1, f, np.vstack([tip, top])) for f in ph])
        moves = [float(np.hypot(*(way[:, i] - way[:, i].mean(0)).T).max()) for i in (0, 1)]
        least = min(float(np.sqrt(((at(CHECK_BOOST, f, upper)[:, None, :] - near[None, :, :]) ** 2).sum(2)).min()) for f in ph)
        print(f'creator {n}: the pen\'s point moves {moves[0]:.1f}, its far end {moves[1]:.1f}; '
              f'at {CHECK_BOOST}x its pen stays {least:.1f} from every other line')



# The two compositions. In each, the box the drawing is laid over is the
# photograph's (making-sculpture.jpg's): on the computer it is the frame
# itself, y 2 to 1806; on the phone the photograph stands 728 units to the
# left of the frame and 242 down (read from the export's image fill), so the
# phone's viewBox is that box in the phone frame's units.
VARIANTS = {
    # Since 2026-11-17 the drawing is laid over the whole frame (it was laid over
    # the photograph's box, y 2 to 1806, when the photograph was the frame).
    'desktop': dict(groups=GROUPS, mouth=MOUTH, ground=GROUND_Y_2026_11_17, viewbox=(0, 0, 1893, 1850), eye_first=EYE_FIRST, pens=PEN_PARTS, paper=PAPER, wave=WAVE, variants=WAVE_VARIANTS,
                    out='making-drawing.svg', frame='"Making" (2026-11-17)', drop_grey=False, wrap=True),
    'mobile': dict(groups=[('siluet-3', 'Siluet 3', 6), ('siluet-1', 'Siluet1', 5),
                           ('the-creator', 'The Creator', 7), ('fum', 'Fum', 6)],
                   # the foot of The Creator's long stroke, in the phone frame
                   mouth=(369.0, 1524.0),
                   # the plank's front edge: the computer's 1370.2, moved down with the photograph
                   ground=GROUND_Y + 240,
                   viewbox=(-728, 242, 1893, 1804), eye_first=False,
                   out='making-drawing-mobile.svg', frame='"Making - Mobile"', drop_grey=True, wrap=False),
}
# The phone's eye stands this far from the computer's (its Group 59 at 245, 1804
# against 517, 1582), and the shape over its eyeball is the computer's, moved.
MOBILE_EYE_SHIFT = (-272.0, 222.0)


def elements(path, drop_grey=True):
    """The export's figures and eye, in order. Left out: the photographs, the
    crevices (#FDA76A), the frame's white and its outline, the sea of drawings
    (a clipped group of plain strokes, since 2026-11-17) and the sun (the one
    path stroked with a linear gradient, since 2026-11-17); with `drop_grey`
    the words, the #888888 outlines (the frames of 2026-11-05 and 2026-11-14,
    where nothing else was #888888; in the frame of 2026-11-17 CREATOR2 is
    #888888 too, and the words are skipped through `GROUPS` instead)."""
    svg = open(path, encoding='utf-8').read()
    body = svg[svg.index('>') + 1:svg.index('<defs>')]
    body = re.sub(r'<g clip-path="url\(#[^)]+\)">\s*(?:<path [^>]*stroke="#[0-9A-Fa-f]{6}"[^>]*/>\s*)+</g>', '', body)
    # the eye's gold ring is an <ellipse> since the export of 2026-11-14 (a <path> before)
    els = re.findall(r'<mask[\s\S]*?</mask>|<(?:path|rect|circle|ellipse)[^>]*/>', body)
    els = [e for e in els if 'url(#pattern' not in e and 'fill="#FDA76A"' not in e
           and not (drop_grey and 'fill="#888888"' in e) and not e.startswith('<rect')
           and not ('stroke="url(#paint' in e and '_linear' in e)]
    return svg, els


def eye_opacity(path):
    """The opacity the author gave the eye's group in Figma (1 if none)."""
    svg = open(path, encoding='utf-8').read()
    m = re.search(r'<g opacity="([\d.]+)">\s*<mask', svg)
    return float(m.group(1)) if m else 1.0


def main():
    args = sys.argv[1:]
    variant = 'desktop'
    if args and args[0] == '--mobile':
        variant = 'mobile'; args = args[1:]
    V = VARIANTS[variant]
    GROUPS_, MOUTH_, GROUND_ = V['groups'], V['mouth'], V['ground']
    vx, vy, vw, vh = V['viewbox']
    src = args[0]
    dst_default = os.path.join(ROOT, 'public', 'images', 'home', V['out'])
    svg, els = elements(src, V['drop_grey'])
    if variant == 'mobile':
        dst = args[1] if len(args) > 1 and args[1].endswith('.svg') and 'Making' not in os.path.basename(args[1]) else dst_default
        # the computer's shape over the eyeball (as it was in the frame of
        # 2026-11-14), moved to the phone's eye
        d = COVER_2026_11_14
        els.insert(len(els) - 1, f'<path d="{shift(d, -MOBILE_EYE_SHIFT[0], -MOBILE_EYE_SHIFT[1])}" fill="#202020"/>')
        EYE_AT[:] = MOBILE_EYE_SHIFT
    else:
        dst = args[1] if len(args) > 1 else dst_default
        COVER_FROM_SHAPE[0] = True
    need = sum(n for _, _, n in GROUPS_)
    eye_els = None
    if V.get('eye_first'):
        eye_els, els = els[:EYE_COUNT], els[EYE_COUNT:]
        if len(els) != need:
            sys.exit(f'{len(els)} elements after the eye, the figures are {need}: read the layers again')
    if len(els) < need:
        sys.exit(f'{len(els)} elements in the export, the figures alone are {need}: read the layers again')
    defs = svg[svg.index('<defs>'):svg.index('</defs>') + 7]
    defs = re.sub(r'<pattern[\s\S]*?</pattern>\s*', '', defs)
    defs = re.sub(r'<image[^>]*/>\s*', '', defs)

    def trace(e):
        """An outlined line's ink at S x, its centre lines (frame units, as found) and its mask's width."""
        d = re.search(r'\bd="([^"]+)"', e).group(1)
        m, x0, y0 = ink(d)
        found = [ff.rdp(ff.smooth(np.asarray(l, float)), 0.4) + (x0, y0) for l in ff.centre_lines(None, 0, 0, mask=m)]
        dist = ndi.distance_transform_edt(m)
        return d, m, x0, y0, found, max(5.0, 2 * dist.max() / S + 3)

    def mask_of(mid, m, x0, y0, found, width, start, reach=False):
        """The mask that draws a line: its centre lines, each from its end nearer `start`
        (and from `start` itself with `reach`: a line that thins to a hair at its
        start has no centre found there, and a pen's line must begin at the pen)."""
        mp = []
        cover = Image.new('L', (m.shape[1], m.shape[0]), 0); cd = ImageDraw.Draw(cover)
        ps = []
        for p in found:
            if math.dist(p[0], start) > math.dist(p[-1], start): p = p[::-1]
            if reach and math.dist(p[0], start) > EXTEND:
                p = np.vstack([np.asarray(start, float), p])
            p = extend(p, EXTEND); ps.append(p)
            L = float(np.sum(np.hypot(*np.diff(p, axis=0).T)))
            pts = ' L'.join(f'{x:.1f} {y:.1f}' for x, y in p)
            mp.append(f'<path d="M{pts}" pathLength="1" data-len="{L:.0f}" data-from="{math.dist(p[0], MOUTH_):.0f}"/>')
            cd.line([((x - x0) * S, (y - y0) * S) for x, y in p], fill=255, width=int(width * S), joint='curve')
        got = (np.asarray(cover) > 0) & m
        print(f'{mid}: {len(found)} line(s), mask {width:.1f} wide, covers {100 * got.sum() / m.sum():.2f}% of its ink')
        return (f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="-3000" y="-3000" width="8000" height="8000">'
                f'<g fill="none" stroke="#fff" stroke-width="{width:.1f}" stroke-dasharray="1 2" stroke-dashoffset="1">'
                + ''.join(mp) + '</g></mask>'), ps

    recolour = lambda e: re.sub(r'fill="(?:black|#202020)"', f'fill="{INK}"', e, count=1)
    pen_parts = V.get('pens') or {}
    paper_parts = V.get('paper') or {}
    wave_variants = V.get('variants') or {}
    hands = {}  # n -> its arm, pen and line (or paper), as elements
    for k_, (role, n) in pen_parts.items():
        hands.setdefault(n, {})[role] = recolour(els[k_])
    for n, idx in paper_parts.items():
        hands.setdefault(n, {})['paper'] = [recolour(els[i]) for i in idx]
    for n, idx in wave_variants.items():
        hands.setdefault(n, {})['variants'] = [recolour(els[i]) for i in idx]
    waves = V.get('wave') or set()
    for n in sorted(hands):
        hands[n]['masks'] = []
        (paper if 'paper' in hands[n] else wave if n in waves else hand)(n, hands[n], trace, mask_of, hands[n]['masks'])
    if 2 in hands and 'end' in hands[2]:
        MOUTH_ = hands[2]['end']
        print(f'the click draws from {MOUTH_[0]:.0f}, {MOUTH_[1]:.0f}, where the line of creator 2 ends')
    if variant == 'desktop':
        # the trumpet's bell: the lowest fifth of its outline, where the melodies leave it
        q = np.vstack(outline(els[TRUMPET]))
        bell = q[q[:, 1] >= q[:, 1].max() - 0.2 * (q[:, 1].max() - q[:, 1].min())]
        MOUTH_ = (float(bell[:, 0].mean()), float(bell[:, 1].mean()))
        print(f"the strokes leave from {MOUTH_[0]:.0f}, {MOUTH_[1]:.0f}, the trumpet's bell")

    parts, masks, k = [], [], 0
    merged = {}  # gid -> (names, items), in the order first met
    for gid, name, n in GROUPS_:
        if gid is None:                       # not a figure (the words): skipped
            k += n
            continue
        names, items = merged.setdefault(gid, ([], []))
        names.append(name)
        for j in range(n):
            e = recolour(els[k]); k += 1
            if k - 1 in pen_parts or any(k - 1 in v for v in paper_parts.values()) or any(k - 1 in v for v in wave_variants.values()):
                continue
            if gid not in DRAWN or (V.get('pens') and k - 1 in FIXED):
                items.append(e); continue
            mid = f'mk-{gid}-{j + 1}'
            d, m, x0, y0, found, width = trace(e)
            mk, _ = mask_of(mid, m, x0, y0, found, width, MOUTH_)
            masks.append(mk)
            items.append(e.replace('<path ', f'<path data-line="{mid}" mask="url(#{mid})" ', 1))
    for gid, (names, items) in merged.items():
        clip = ' clip-path="url(#mk-ground)"' if gid in GROUNDED else ''
        n = int(gid[-1]) if gid.startswith('creator-') and int(gid[-1]) in hands else 0
        if n:
            items = items + [hands[n]['limb']]
        parts.append(f'<g id="{gid}" data-name="{", ".join(names)}"{clip}>\n' + '\n'.join(items) + '\n</g>')
    for n in sorted(hands):
        parts.append(hands[n]['drawn']); masks += hands[n]['masks']
    if hands:
        skip = set(pen_parts) | {i for v in paper_parts.values() for i in v} | {i for v in wave_variants.values() for i in v}
        words = set()
        at = 0
        for gid, _, n in GROUPS_:
            if gid is None: words |= set(range(at, at + n))
            at += n
        clearance(hands, [recolour(els[i]) for i in range(need) if i not in skip and i not in words])
    if V.get('wrap'):
        # every figure in one group, which the page fades out as the reader goes on down
        parts = ['<g id="mk-figures">'] + parts + ['</g>']
    eye_src = eye_els if eye_els is not None else els[k:]
    c, iris_max, pupil_max = eye_limits(eye_src)
    print(f'eye: rhombi round {c[0]:.1f},{c[1]:.1f}, free to move {iris_max:.1f}; pupil free to move {pupil_max:.1f}')
    # The eye's own size against the frame of 2026-11-05's (its gold ring was
    # 85 there; 59.2 since 2026-11-17, the author made it smaller): how far the
    # eyeball may roam and the click's disc go with it.
    k_eye = ring_r(eye_src) / RING_R
    ball = (BALL_MAX[0] * k_eye, BALL_MAX[1] * k_eye)
    rest = eye_opacity(src) if variant == 'desktop' else 1.0
    print(f'eye: ring {ring_r(eye_src):.1f} ({k_eye:.3f} of the first), the eyeball roams {ball[0]:.1f} by {ball[1]:.1f}, at {rest:g} of its strength')
    parts.append(f'<g id="eye" data-name="the eye (Group 59, Vector 49, Ellipse 8)" data-iris="{c[0]:.2f} {c[1]:.2f}" '
                 f'data-iris-max="{iris_max:.1f}" data-pupil-max="{pupil_max:.1f}" data-ball-max="{ball[0]:.1f} {ball[1]:.1f}" '
                 f'data-hit-r="{90 * k_eye:.0f}"' + (f' data-rest="{rest:g}"' if rest < 1 else '') + '>\n'
                 + '\n'.join(eye(eye_src)) + '\n</g>')
    masks.append(f'<clipPath id="mk-ground" clipPathUnits="userSpaceOnUse"><rect x="-3000" y="-3000" width="8000" height="{GROUND_ + 3000}"/></clipPath>')
    defs = defs.replace('<defs>', '<defs>\n' + '\n'.join(masks), 1)

    out = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{vw}" height="{vh}" viewBox="{vx} {vy} {vw} {vh}" fill="none">\n'
           f'<!-- Written by scripts/making-drawing.py from the Figma frame {V["frame"]}: the figures and the eye,\n'
           '     without the photographs, the words, the crevices, the sea or the sun. The drawn lines are\n'
           '     masked shut until components/making-drawing.tsx draws them. -->\n'
           + '\n'.join(parts) + '\n' + defs + '\n</svg>\n')
    open(dst, 'w', encoding='utf-8').write(out)
    print('wrote', dst, len(out), 'bytes')


if __name__ == '__main__':
    main()
