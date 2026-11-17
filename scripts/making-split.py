"""
The homepage's Making section from the author's Figma frame "Making" of
2026-11-17 (Making_Homepage.svg, 1893 x 1850): its photographs as files and
its sea and sun as numbers. Writes, from the export:

    python3 scripts/making-split.py "<Making_Homepage.svg>"

  public/images/home/making-trunk.webp   the burnt trunk and the white vase,
                                         cut out on transparency, with the
                                         plank they stand on across the frame
                                         (the export's first image, 4096 x 2951,
                                         at 2400 wide)
  public/images/home/making-wood.avif    the dark wood under the plank, where
                                         the eye is (the export's second image,
                                         4096 x 1031), turned as the author
                                         turned it (the export draws it flipped)
  public/images/home/making-plank-left.webp,
  public/images/home/making-plank-right.webp
                                         the plank's own ends, each laid next to
                                         its mirror image, to carry the plank on
                                         past the composition on a very wide
                                         screen (see `making-section.tsx`)
  lib/making-scene.json                  where those lie in the frame, the five
                                         lines of the sea (the author's "sea of
                                         drawings": each one's grey and the
                                         height it lies at on average) and the
                                         sun's place and size

The 2026-11-17 frame is two photographs where the old frames had one: the
author cut the trunk out of its white ground, so that the sun and the sea can
stand behind it, and laid a second photograph of dark wood under the plank,
flipped together with the eye that lies on it.

**The trunk is the old photograph, unmoved.** Measured on 2026-11-17: the
export's trunk is making-sculpture.jpg's source (4096 x 3858) shifted 557px to
the left and cut at row 2951, at the same pixel scale (mean difference 3 of
255 over 20,000 points of the trunk). The phone's composition, whose frame was
not re-exported, lays the new file where the old photograph's trunk stood
(`PHONE_TRUNK` in `making-section.tsx`), and the gold motes' crevices
(`scripts/grain-lines/from-figma.py`) are on the new file for both.

**The sun is Satori 4's.** The author copied Satori 4's sun into the frame,
scaled, in grey: its eight lines are the circle of lib/satori-sun-4.json plus
its rays at 1/8 … 8/8, at 0.432 of its size (fitted here: every line's circle
158.7 units, the rays' strengths 0.054 apart, the same turn), round 747, 1158.
So the page draws it with Satori 4's own animation (`components/making-sun.tsx`)
and only its place, its size and its grey are written here. The export's grey
is a gradient down the sun, #E3E3E3 at y 927 to #7D7D7D at nothing by y 1291:
the sun fades out above the sea.

Needs numpy and Pillow (with WebP and AVIF).
"""
import base64
import io
import json
import math
import os
import re
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, 'grain-lines'))
import importlib.util
spec = importlib.util.spec_from_file_location('ff', os.path.join(HERE, 'grain-lines', 'from-figma.py'))
ff = importlib.util.module_from_spec(spec); spec.loader.exec_module(ff)

OUT = os.path.join(ROOT, 'public', 'images', 'home')
LIB = os.path.join(ROOT, 'lib')

# The trunk's file width: making-sculpture.jpg's (2400), the density the
# photograph had on the page before (about 1.27px a frame unit).
TRUNK_W = 2400
WOOD_W = 2400
# Where the plank begins (the first opaque row across the trunk image) and
# where its dark face begins: rows of the export's 2951, read below.
SEA_STEP = 3.0
SEA_FROM, SEA_TO = -40.0, 1935.0


def num(s):
    return float(s)


def rect_box(attrs):
    """x, y, width, height of a <rect>, with a matrix(-1 0 0 1 e f) flip read as a box."""
    g = lambda k, d=0.0: float((re.search(r'\b' + k + r'="(-?[\d.]+)"', attrs) or [None, d])[1])
    x, y, w, h = g('x'), g('y'), g('width'), g('height')
    m = re.search(r'transform="matrix\(([^)]+)\)"', attrs)
    flip = False
    if m:
        a, b, c, d, e, f = map(float, m.group(1).replace(',', ' ').split())
        if a < 0:
            flip = True
            x, y = e - (x + w), f + y
        else:
            x, y = e + x, f + y
    return x, y, w, h, flip


def images(svg):
    out = {}
    for m in re.finditer(r'<image id="([^"]+)" width="(\d+)" height="(\d+)"[^>]*xlink:href="data:image/(\w+);base64,([^"]+)"', svg):
        out[m.group(1)] = Image.open(io.BytesIO(base64.b64decode(m.group(5))))
    return out


def pattern_image(svg, pid):
    p = re.search(r'<pattern id="' + pid + r'"[\s\S]*?<use xlink:href="#([^"]+)"', svg)
    return p.group(1)


def ungrade(im, foot):
    """The white wash, taken off the trunk as `scripts/making-ungrade.py` takes
    it off the whole photograph (2026-10-31, the author's asking; see its
    header): the export carries it again, the burnt wood's deepest shadows
    reading 68 at the top and 31 at the plank (measured 2026-11-17, against
    28-31 all the way down in making-sculpture.jpg). Measured on the trunk's
    opaque pixels above the plank, un-mixed channel by channel; the plank and
    everything below `foot` are left as they are, and the cut-out's alpha is
    untouched."""
    A = np.asarray(im).astype(np.float64)
    H = A.shape[0]
    lum = A[:, :, :3].mean(axis=2)
    wood = (A[:, :, 3] == 255) & (lum < 170)
    band, ys, lv = 24, [], [[], [], []]
    for y in range(0, foot - band, band):
        m = wood[y:y + band]
        if m.sum() < 400:
            continue
        ys.append(y + band / 2)
        for c in range(3):
            lv[c].append(np.percentile(A[y:y + band, :, c][m], 1))
    ys = np.array(ys) / H
    yy = np.arange(H) / H
    for c in range(3):
        curve = np.polyval(np.polyfit(ys, lv[c], 2), yy)
        black = curve[foot - 1]
        a = np.clip((curve - black) / (255 - black), 0, 0.5)
        a[foot:] = 0
        A[:, :, c] = (A[:, :, c] - 255 * a[:, None]) / (1 - a[:, None])
        if c == 0:
            print(f'white wash taken off the trunk: {a[int(.04 * H)]:.3f} at the top, {a[H // 2]:.3f} midway, none from the plank down')
    out = Image.fromarray(np.clip(A, 0, 255).round().astype(np.uint8), 'RGBA')
    L = np.asarray(out.convert('L'), float)
    deep = [int(np.percentile(L[int(f * foot) - 12:int(f * foot) + 12][wood[int(f * foot) - 12:int(f * foot) + 12]], 1))
            for f in (.05, .3, .6, .9)]
    print('  darkest wood, top to foot:', deep)
    return out


def main():
    src = sys.argv[1]
    svg = open(src, encoding='utf-8').read()
    m = re.search(r'<svg width="(\d+)" height="(\d+)"', svg)
    FW, FH = int(m.group(1)), int(m.group(2))
    ims = images(svg)
    rects = re.findall(r'<rect ([^>]*fill="url\(#(pattern[^)]+)\)"[^>]*)/>', svg)
    if len(rects) != 2:
        sys.exit(f'{len(rects)} image fills in the export, not two (the trunk, the wood): read it again')
    (trunk_attrs, trunk_pat), (wood_attrs, wood_pat) = rects
    tx, ty, tw, th, _ = rect_box(trunk_attrs)
    wx, wy, ww, wh, wflip = rect_box(wood_attrs)
    trunk = ims[pattern_image(svg, trunk_pat)].convert('RGBA')
    wood = ims[pattern_image(svg, wood_pat)].convert('RGB')
    print(f'trunk {trunk.size} in {tx:g},{ty:g} {tw:g}x{th:g}; wood {wood.size} in {wx:g},{wy:g} {ww:g}x{wh:g}{" flipped" if wflip else ""}')

    # --- the trunk -----------------------------------------------------------
    A = np.asarray(trunk)[:, :, 3]
    full = np.where((A == 255).all(axis=1))[0]
    plank_row = int(full[0])                       # the plank's top: every pixel across opaque
    lum = np.asarray(trunk.convert('L'), float)
    dark = np.where(lum[plank_row:, :200].mean(axis=1) < 60)[0]
    edge_row = plank_row + int(dark[0])            # its dark face
    k = th / trunk.height
    plank_y, edge_y = ty + plank_row * k, ty + edge_row * k
    print(f'plank from row {plank_row} (y {plank_y:.1f}), its dark face from row {edge_row} (y {edge_y:.1f})')
    trunk = ungrade(trunk, plank_row)
    th_px = round(trunk.height * TRUNK_W / trunk.width)
    t = trunk.resize((TRUNK_W, th_px), Image.LANCZOS)
    t.save(os.path.join(OUT, 'making-trunk.webp'), 'WEBP', quality=90, alpha_quality=100, method=6)
    print('making-trunk.webp', t.size, os.path.getsize(os.path.join(OUT, 'making-trunk.webp')), 'bytes')

    # the plank's two ends, each beside its mirror, to tile past the frame
    s = TRUNK_W / trunk.width
    strip = trunk.crop((0, plank_row - 4, trunk.width, trunk.height))
    opaque = (np.asarray(trunk)[:plank_row - 8, :, 3] > 0).any(axis=0)
    cols = np.where(opaque)[0]
    left_end, right_start = int(cols.min()) - 8, int(cols.max()) + 8   # clear of the trunk and the vase
    for name, part in (('left', strip.crop((0, 0, left_end, strip.height))),
                       ('right', strip.crop((right_start, 0, trunk.width, strip.height)))):
        # A tile is the end and its mirror, so tiles meet themselves mirrored
        # and the frame's own edge column is at the tile's end that meets the
        # frame: on the left side the tile's right end, on the right its left.
        w = part.width
        tile = Image.new('RGBA', (2 * w, part.height))
        flipped = part.transpose(Image.FLIP_LEFT_RIGHT)
        if name == 'left':     # columns 0 … w-1, w-1 … 0: its right end is the frame's column 0
            tile.paste(part, (0, 0)); tile.paste(flipped, (w, 0))
        else:                  # columns W-1 … R, R … W-1: its left end is the frame's last column
            tile.paste(flipped, (0, 0)); tile.paste(part, (w, 0))
        tile = tile.resize((max(1, round(tile.width * s)), max(1, round(tile.height * s))), Image.LANCZOS)
        fn = os.path.join(OUT, f'making-plank-{name}.webp')
        tile.save(fn, 'WEBP', quality=90, alpha_quality=100, method=6)
        print(os.path.basename(fn), tile.size, os.path.getsize(fn), 'bytes')
    plank_tile = {
        'left': round(2 * left_end * k, 2),            # frame units a tile spans
        'right': round(2 * (trunk.width - right_start) * k, 2),
        'y': round(ty + (plank_row - 4) * k, 2),
        'h': round((trunk.height - plank_row + 4) * k, 2),
    }

    # --- the wood ------------------------------------------------------------
    w_im = wood.transpose(Image.FLIP_LEFT_RIGHT) if wflip else wood
    wh_px = round(WOOD_W * wh / ww)
    w_im = w_im.resize((WOOD_W, wh_px), Image.LANCZOS)
    fn = os.path.join(OUT, 'making-wood.avif')
    # q88 and full colour: at q70 the grain went to blocks with a green cast (seen
    # brightened 6x); the corners stay exactly 32,32,32, Selected's #202020
    w_im.save(fn, 'AVIF', quality=88, speed=4, subsampling='4:4:4')
    back = Image.open(fn).convert('RGB')
    print('making-wood.avif', w_im.size, os.path.getsize(fn), 'bytes; corners', back.getpixel((0, 0)), back.getpixel((WOOD_W - 1, wh_px - 1)))

    # --- the sea -------------------------------------------------------------
    clip = re.search(r'<g clip-path="url\(#(clip\d+_[^)]+)\)">\s*((?:<path[^>]*stroke="#[0-9A-Fa-f]{6}"[^>]*/>\s*)+)</g>', svg)
    if not clip:
        sys.exit('the sea of drawings not found: the export should open with its five lines in a clipped group')
    sea = []
    xs = np.arange(SEA_FROM, SEA_TO + 1e-6, SEA_STEP)
    for p in re.findall(r'<path[^>]*/>', clip.group(2)):
        d = re.search(r'\bd="([^"]+)"', p).group(1)
        col = re.search(r'stroke="(#[0-9A-Fa-f]{6})"', p).group(1)
        pts = np.array(ff.subpaths(d, 8)[0])
        if pts[0, 0] > pts[-1, 0]: pts = pts[::-1]
        if (np.diff(pts[:, 0]) < 0).any():
            sys.exit('a line of the sea turns back on itself: it cannot be read as a height across')
        ys = np.interp(xs, pts[:, 0], pts[:, 1])
        # Flattened (2026-11-17, the author's asking): the lines' own bumps stood
        # always raised under the moving waves, "not natural for a sea"; the
        # page lays each line flat, in perspective, and moves it with its own
        # waves (components/making-sea.tsx). Only its grey and its mean height
        # are kept.
        sea.append({'colour': col, 'y': round(float(np.mean(ys)), 2)})
    # back to front: the lightest (the furthest) first, as the export draws them
    print('sea:', len(sea), 'lines', ', '.join(s_['colour'] for s_ in sea),
          f'mean heights {", ".join(f"{s_["y"]:.1f}" for s_ in sea)}')
    order = [s_['y'] for s_ in sea]
    if order != sorted(order):
        print('  (not from the top down: drawn in the export\'s order all the same)')

    # --- the sun ---------------------------------------------------------------
    body = svg[svg.index('>') + 1:svg.index('<defs>')]
    sun_el = max((e for e in re.findall(r'<path[^>]*stroke="url\(#paint\d+_linear[^"]*"[^>]*/>', body)), key=len)
    d = re.search(r'\bd="([^"]+)"', sun_el).group(1)
    gid = re.search(r'stroke="url\(#([^)]+)\)"', sun_el).group(1)
    grad = re.search(r'<linearGradient id="' + gid + r'" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"', svg)
    g_top, g_bottom = float(grad.group(2)), float(grad.group(4))
    stops = re.findall(r'<stop(?: offset="[\d.]+")? stop-color="(#[0-9A-Fa-f]{6})"(?: stop-opacity="([\d.]+)")?/>',
                       svg[grad.end():svg.index('</linearGradient>', grad.end())])
    colours = [c for c, _ in stops]
    if len(colours) != 2:
        sys.exit("the sun's gradient is not two stops: read it again")
    subs = [np.array(p) for p in ff.subpaths(d, 6)]
    SUN = json.load(open(os.path.join(LIB, 'satori-sun-4.json')))
    rise = np.array(SUN['rise']); N = len(rise)

    def profile(p, c):
        a = np.arctan2(p[:, 1] - c[1], p[:, 0] - c[0]) % (2 * np.pi); r = np.hypot(p[:, 0] - c[0], p[:, 1] - c[1])
        o = np.argsort(a); a, r = a[o], r[o]
        tt = 2 * np.pi * np.arange(N) / N
        return np.interp(tt, np.concatenate([a - 2 * np.pi, a, a + 2 * np.pi]), np.concatenate([r, r, r]))

    def fit(c):
        err, coefs = 0.0, []
        A_ = np.vstack([np.ones(N), rise]).T
        for p in subs:
            q = profile(p, c)
            co, *_ = np.linalg.lstsq(A_, q, rcond=None)
            err += float(np.abs(A_ @ co - q).mean()); coefs.append(co)
        return err / len(subs), coefs
    mid = np.mean([(p.min(0) + p.max(0)) / 2 for p in subs], axis=0)
    best = min(((fit((cx, cy))[0], cx, cy) for cx in np.arange(mid[0] - 3, mid[0] + 3, 0.25)
                for cy in np.arange(mid[1] - 4, mid[1] + 4, 0.25)))
    err, cx, cy = best
    _, coefs = fit((cx, cy))
    r0 = float(np.mean([co[0] for co in coefs]))
    strengths = sorted(float(co[1]) for co in coefs)
    scale = r0 / SUN['r0']
    print(f'sun: round {cx:.2f},{cy:.2f}, circle {r0:.2f} ({scale:.4f} of Satori 4\'s), '
          f'rays at {", ".join(f"{v / strengths[-1]:.3f}" for v in strengths)} of the outermost, '
          f'which is {strengths[-1]:.4f} (the scale: {scale:.4f}); off by {err:.2f} units on average')
    if abs(strengths[-1] - scale) > 0.01 or err > 1.5:
        sys.exit('the sun is not Satori 4\'s scaled: read it again')

    scene = {
        'frame': {'w': FW, 'h': FH},
        'trunk': {'x': tx, 'y': ty, 'w': tw, 'h': th, 'file': [TRUNK_W, th_px]},
        'plank': {'top': round(plank_y, 2), 'edge': round(edge_y, 2), 'tile': plank_tile},
        'wood': {'x': wx, 'y': wy, 'w': ww, 'h': wh},
        'sun': {'cx': round(cx, 2), 'cy': round(cy, 2), 'scale': round(scale, 5),
                'colour': colours, 'from': g_top, 'to': g_bottom},
        'sea': {'lines': sea},
    }
    fn = os.path.join(LIB, 'making-scene.json')
    open(fn, 'w').write(json.dumps(scene, separators=(',', ':')))
    print('wrote', fn, os.path.getsize(fn), 'bytes')


if __name__ == '__main__':
    main()
