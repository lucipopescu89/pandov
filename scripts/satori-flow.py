"""
Satori 3's inward circles, for /body/satori.

    python3 scripts/satori-flow.py public/images/body/satori

"The one who sits / expands inside" (2026-11-12, the author's brief: great
circles radiating inward, one after another, concentric, molding to the
pendant's outline as they close, never touching it). At rest none of the
author's drawing is shown; on a hover it is drawn by hand while these fade
(components/satori-core.tsx).

Every circle leaves at `START_R` from the ring's middle (the centre of the
drawing's great circles), well clear of the verse (its top at 143 on the
frame; the verse's foot is about 80 down on a computer, 140 on a phone), and
closes on the pendant until it stands `MARGIN` from the metal, its outline
drawn a hair out, into every hollow of it: under the bird's wings, at the
neck, round the tip (2026-11-12, the author's asking, the same morning: the
first circles bent only along rays from the ring's middle and bridged those
hollows, 9 units out). It stays a circle until it is within about 10 of the
metal (`BLEND`; the author's asking, the same morning: the molding began far
too soon, at about 260, then 55) and only then takes the pendant's shape; below the body, which
reaches further from the ring's middle than the ring does, a circle meets it
sooner, and is drawn round it there into a funnel while its top is still a
circle's.

The circles are the level lines of one field, so they are concentric and
never cross. Near the metal it is the distance to the metal itself (`dist`),
whose level lines are the outline drawn further and further out; far away it
is the distance from the ring's middle less the ring's radius, whose level
lines are circles; in between the one gives way to the other with the
distance (`BLEND`), and the field is smoothed more the further it is from
the metal (`SMOOTH_NEAR`, `SMOOTH_FAR`), so the level lines round off the
corners the outline's offsets would have where the ring meets the body,
while the last ones keep every detail. The metal is the photograph's alpha
(photo-3.avif, where the page lays it: `PHOTO_BOX` satori-3 in
components/satori-presentation.tsx), over `ALPHA_MIN`, at `RES` samples to
the frame unit.

`LEVELS` level lines are taken, closer together near the metal, each the
outer one (not the ring's hole), resampled to `POINTS` points by length from
its top on the axis, clockwise; the page draws between them. Written to
lib/satori-flow-3.json with their levels, `START_R` and the start level
(the circle there) and the fade (the drawing's gold and middle, reaching out to
`FADE_REACH` of the start, so the circles come out of the dark), the points
as 16-bit tenths of a unit in base64. Needs Pillow (with AVIF), NumPy, SciPy
and scikit-image. Run it again after satori-drawings.py or satori-photos.py.
"""
import base64
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure

FRAME_W, FRAME_H = 1275, 1380
AXIS_X = FRAME_W / 2
# PHOTO_BOX satori-3: top, width, height in frame units, centred on the axis.
PHOTO_TOP, PHOTO_W, PHOTO_H = 596.2, 212.8, 378.3
ALPHA_MIN = 40
RES = 3
# How far short of the metal the last circle stands, frame units.
MARGIN = 4
# Where the circles leave, from the ring's middle.
START_R = 560
# Near the metal the field is the distance to it; from BLEND[0] to BLEND[1] it gives way to the circles'.
# (15, 260) at first; the author asked the same morning for the molding to begin much nearer the
# pendant, (4, 55), and then to see it begin at 10.
BLEND = (MARGIN, 10)
# Its smoothing: none within 2 of the metal, SMOOTH_NEAR by BLEND[1] + 2, SMOOTH_FAR by BLEND[1] + 45 (sigma, frame units).
SMOOTH_NEAR = 6
SMOOTH_FAR = 20
LEVELS = 28
POINTS = 480
FADE_REACH = 1.25
# A circle of the drawing is a path wider than this.
CIRCLE_W = 600


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def resample(c, n, cx, cy):
    """A closed level line as `n` points by length, from its top on the axis, clockwise on the screen."""
    p = c[:, ::-1] / RES  # (row, col) to (x, y)
    if np.allclose(p[0], p[-1]):
        p = p[:-1]
    area = np.sum(p[:, 0] * np.roll(p[:, 1], -1) - np.roll(p[:, 0], -1) * p[:, 1])
    if area < 0:  # y down: positive is clockwise on the screen
        p = p[::-1]
    top = np.argmin(np.where(p[:, 1] < cy, np.abs(p[:, 0] - cx), np.inf))
    p = np.roll(p, -top, 0)
    q = np.vstack([p, p[:1]])
    s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(q, axis=0).T))])
    at = np.linspace(0, s[-1], n + 1)[:-1]
    return np.stack([np.interp(at, s, q[:, 0]), np.interp(at, s, q[:, 1])], 1)


def main(out):
    out = Path(out)
    svg = (out / "drawing-3.svg").read_text()
    head = svg.split("<g stroke")[0]
    fade = re.search(r'cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', head)
    peak = re.search(r'<stop stop-color="#C69B5C" stop-opacity="([\d.]+)"', head)
    # The ring's middle: the centre of the drawing's great circles.
    rings = []
    for d in re.findall(r'<path d="([^"]+)"/>', svg):
        nums = [float(v) for v in re.findall(r"-?\d+\.?\d*", d)]
        xs, ys = nums[0::2], nums[1::2]
        if max(xs) - min(xs) > CIRCLE_W:
            rings.append(((max(xs) + min(xs)) / 2, min(ys) + (max(xs) - min(xs)) / 2))
    cx = sum(r[0] for r in rings) / len(rings)
    cy = sum(r[1] for r in rings) / len(rings)

    # The metal: the photograph's alpha, laid where the page lays it.
    im = Image.open(out / "photo-3.avif").convert("RGBA")
    W, H = round(PHOTO_W * RES), round(PHOTO_H * RES)
    alpha = np.asarray(im.resize((W, H), Image.Resampling.LANCZOS))[..., 3] > ALPHA_MIN
    metal = np.zeros((FRAME_H * RES, FRAME_W * RES), bool)
    x0, y0 = round((AXIS_X - PHOTO_W / 2) * RES), round(PHOTO_TOP * RES)
    metal[y0:y0 + H, x0:x0 + W] = alpha
    dist = ndimage.distance_transform_edt(~metal) / RES
    ring_r = cy - PHOTO_TOP  # the ring's outer radius: its top is the photograph's

    # The field: the distance to the metal near it, the circles' far from it.
    yy, xx = np.mgrid[0:FRAME_H * RES, 0:FRAME_W * RES] / RES
    circles = np.hypot(xx - cx, yy - cy) - ring_r
    w = smooth(*BLEND, dist)
    field = dist * (1 - w) + circles * w
    near = ndimage.gaussian_filter(field, SMOOTH_NEAR * RES)
    far = ndimage.gaussian_filter(field, SMOOTH_FAR * RES)
    a, b = smooth(2, BLEND[1] + 2, dist), smooth(BLEND[1] + 2, BLEND[1] + 45, dist)
    field = field * (1 - a) + near * (a - b) + far * b
    start = START_R - ring_r

    levels, lines = [], []
    for k in range(LEVELS):
        lv = MARGIN + (start - MARGIN) * (k / (LEVELS - 1)) ** 2
        cs = [c for c in measure.find_contours(field, lv) if len(c) > 20]
        c = max(cs, key=lambda c: np.ptp(c[:, 0]) * np.ptp(c[:, 1]))  # the outer one, not the ring's hole
        p = resample(c, POINTS, cx, cy)
        levels.append(round(float(lv), 2))
        lines.append(p)
        nearest = float(ndimage.map_coordinates(dist, [p[:, 1] * RES, p[:, 0] * RES], order=1).min())
        print(f"level {lv:6.1f}: {len(c)} steps, nearest the metal {nearest:.1f}")

    pts = np.round(np.array(lines) * 10).astype("<i2")
    data = {
        "cx": round(cx, 2), "cy": round(cy, 2), "r0": START_R, "start": round(float(start), 2),
        "fade": {"cx": float(fade.group(1)), "cy": float(fade.group(2)), "r": round(START_R * FADE_REACH, 2),
                 "peak": float(peak.group(1))},
        "points": POINTS,
        "levels": levels,
        "lines": base64.b64encode(pts.tobytes()).decode(),
    }
    lib = Path(__file__).resolve().parent.parent / "lib" / "satori-flow-3.json"
    lib.write_text(json.dumps(data, separators=(",", ":")))
    print(f"{LEVELS} level lines of {POINTS} points, {lib.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
