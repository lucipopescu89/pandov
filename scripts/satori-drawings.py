"""
The four Satori drawings for /body/satori, from the author's 3ds Max export.

    python3 scripts/satori-drawings.py "D:/PANDOV/2_BODY/2_SATORI/Export OBJ/SATORI AI TOATE IN FISIER.ai" public/images/body/satori

Writes drawing-1.svg … drawing-4.svg there, each the size of the author's
Figma frame "Satori <n>" (1020 × 1125) with the drawing where the frame has
it. The verses are not in them: the page sets them as text.

Why the .ai and nothing else (2026-11-11). 3ds Max's SVG export draws every
curve as hundreds of short straight lines (the author saw the facets once
the drawings were laid out in Figma), and its DXF and DWG are the same
polylines. Its Illustrator export keeps the splines' own Bézier points. But
it writes each spline in its object's own space, without the object's
position, rotation or scale, so the author first baked them in (Reset XForm,
Convert to Editable Spline, Attach) and exported again: every shape is then
true to scale (the pink squares are 595.28 pt, 210 mm) and in place inside
its square. All four squares come out on the same centre, one over the
other; a drawing is told by the square that comes before it in the file
(`PANELS`, in the order Max wrote them). The four were checked against the
same drawing exported to SVG and straightened by hand: every shape lies on
it within 0.1–0.2 mm (the SVG's own facets).

All four are drawn at one scale, as they stand in Max (2026-11-11, the
author's asking, with a picture of the four squares side by side): the
210 mm square is the frame's width, and each drawing stands where it stands
in its square. The square is not drawn; its foot is the frame's foot, which
leaves the frame's top 105 units for the verse. So Satori 4's sun nearly
fills its frame and Satori 1's ring is under half of it, true to each other.
The square was the Figma frames' width, 1020, and then, the same evening,
150% of it (`ENLARGE`): 1530 units, 7.286 to the millimetre; since 2026-11-12
125% of it, 1275 units, 6.071 to the millimetre (the author's asking). (For an hour
that day each drawing was instead scaled to the box its vector had in the
author's Figma frames, which drew all four about the same size.)

The stroke is the house gold, #C69B5C, 1 unit, fading out from the middle
(a radial gradient over the drawing's box), as the artwork on Second Wind
is drawn. The Figma frames' own gradients could not be read (the Figma
connection was over its plan's limit that day); the author can say.
"""
import math, sys
from pathlib import Path

GOLD = "#C69B5C"
# 125% of the Figma frames' 1020 (the author's asking, 2026-11-12; it was 150%
# from the evening of 2026-11-11): the 210 mm square is 1275 units, and the
# frame keeps the 105 over it for the verse.
ENLARGE = 1.25
W = round(1020 * ENLARGE)
H = W + 105
SQUARE_PT = 595.28  # the drawings' squares, 210 mm
SCALE = W / SQUARE_PT  # frame units per point: the square is the frame's width
CX, CY = W / 2, H - W / 2  # the square's centre: its foot on the frame's foot
# Each drawing's own axis on the frame's middle, x 765, where the page puts the
# photographs' (2026-11-11, measured to a hundredth of a unit by mirroring
# each shape): Satori 1–3 stand on their squares' centres exactly; Satori 4's
# bird and rings are 0.16 right of its square's (and its stars a further 0.6
# left of them, as drawn), so it moves 0.16 left.
AXIS_DX = {4: -0.16}
# The drawings in the .ai, by the index of their square: Max wrote Satori 2 first.
PANELS = {2: 0, 1: 1, 3: 2, 4: 3}
# Where the fade has gone to nothing, as a share of the drawing's box (0.5 would be its edge).
FADE_R = 0.75
# How strong the gold is at the fade's middle (2026-11-12, the author's asking:
# the lines were too strong). At 1 the lines were twice as bright as Second
# Wind's, measured rasterised at their size on the page (alpha of the drawn
# pixels: median 69 and 90th percentile 127 against 30 and 74); at 0.55 they
# are about the same (38 and 70). The width was already Second Wind's main
# lines', one screen pixel. The sun's and the core's JSON carry it as
# `fade.peak` for the page's own drawing of them.
INTENSITY = 0.55


def parse(path):
    shapes, cur = [], None
    for line in open(path, encoding="latin-1"):
        t = line.split()
        if not t:
            continue
        op = t[-1]
        if op == "m":
            cur = {"start": (float(t[0]), float(t[1])), "segs": []}
        elif op == "C" and cur:
            cur["segs"].append(("C", [float(v) for v in t[:6]]))
        elif op == "L" and cur:
            cur["segs"].append(("L", [float(v) for v in t[:2]]))
        elif op in "sSfFbBnN" and len(t) == 1 and cur:
            cur["closed"] = op in "sfbn"
            shapes.append(cur)
            cur = None
    return shapes


def is_square(s):
    xs = [s["start"][0]] + [v[-2] for _, v in s["segs"]]
    return len(s["segs"]) == 4 and abs(max(xs) - min(xs) - 595.28) < 0.1


def bez(p0, p1, p2, p3, n=24):
    for k in range(n + 1):
        u = k / n
        a, b, c, d = (1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3
        yield (a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1])


def extent(shapes):
    xs, ys = [], []
    for s in shapes:
        pos = s["start"]
        xs.append(pos[0]); ys.append(pos[1])
        for k, v in s["segs"]:
            if k == "C":
                for x, y in bez(pos, v[0:2], v[2:4], v[4:6]):
                    xs.append(x); ys.append(y)
                pos = (v[4], v[5])
            else:
                pos = (v[0], v[1])
                xs.append(pos[0]); ys.append(pos[1])
    return min(xs), min(ys), max(xs), max(ys)


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def path_d(s, tf):
    x, y = tf(*s["start"])
    d = [f"M{fmt(x)} {fmt(y)}"]
    for k, v in s["segs"]:
        if k == "C":
            pts = [tf(v[0], v[1]), tf(v[2], v[3]), tf(v[4], v[5])]
            d.append("C" + " ".join(f"{fmt(a)} {fmt(b)}" for a, b in pts))
        else:
            a, b = tf(v[0], v[1])
            d.append(f"L{fmt(a)} {fmt(b)}")
    if s.get("closed"):
        d.append("Z")
    return "".join(d)


def points(s, tf, k=24):
    """A shape's points on the frame, its curves cut into `k` straight steps."""
    pos = s["start"]
    o = [tf(*pos)]
    for kind, v in s["segs"]:
        if kind == "C":
            o += [tf(x, y) for x, y in list(bez(pos, v[0:2], v[2:4], v[4:6], k))[1:]]
            pos = (v[4], v[5])
        else:
            pos = (v[0], v[1])
            o.append(tf(*pos))
    return o


def hand_lines(shapes, tf):
    """
    Lines for the page to draw by hand on a hover (components/satori-core.tsx):
    each path's d, its length in frame units, its two ends and the point
    halfway along it, so it can be drawn from wherever is nearest the pendant.
    """
    lines = []
    for s in shapes:
        p = points(s, tf, 48)
        seg = [math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) for i in range(len(p) - 1)]
        total, run, mid = sum(seg), 0.0, p[-1]
        for i, q in enumerate(seg):
            if run + q >= total / 2:
                f = (total / 2 - run) / q if q else 0
                mid = (p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f)
                break
            run += q
        (sx, sy), (ex, ey) = tf(*s["start"]), tf(*s["segs"][-1][1][-2:])
        lines.append({"d": path_d(s, tf), "len": round(total, 1), "start": [round(sx, 2), round(sy, 2)],
                      "mid": [round(mid[0], 2), round(mid[1], 2)], "end": [round(ex, 2), round(ey, 2)]})
    return lines


SUN_SAMPLES = 720


def is_star(s):
    return len(s["segs"]) == 384


def write_sun(drawing, tf, gx, gy, gr, out, svg):
    """
    Satori 4's nine star lines, for the page's animation (components/satori-sun.tsx).

    They are one profile of rays at nine strengths (2026-11-11, measured: the
    author drew a line, moved its points up with a Noise modifier and bent it
    through 360°): the first is a plain circle, and each of the others is that
    circle plus the same ray profile at 1/8, 2/8 … 8/8 of its height (their
    shapes correlate at 0.995 and better). So the animation needs only the
    circle (centre, radius) and the full profile, the rise of the outermost
    line over the circle at each angle, `SUN_SAMPLES` angles from 0 (pointing
    right, turning clockwise on the screen). Written to lib/satori-sun-4.json,
    and the drawing without the stars to drawing-4-core.svg, which the page
    shows under the animation.
    """
    import json
    stars = [s for s in drawing if is_star(s)]
    rest = [s for s in drawing if not is_star(s)]
    lines = [points(s, tf) for s in stars]
    def radius(line, c):
        th = [math.atan2(y - c[1], x - c[0]) % (2 * math.pi) for x, y in line]
        rr = [math.hypot(x - c[0], y - c[1]) for x, y in line]
        o = sorted(zip(th, rr))
        th = [t for t, _ in o]; rr = [q for _, q in o]
        import bisect
        res = []
        for k in range(SUN_SAMPLES):
            t = 2 * math.pi * k / SUN_SAMPLES
            i = bisect.bisect_left(th, t) % len(th)
            j = (i - 1) % len(th)
            t0, t1 = th[j], th[i]
            if t1 < t0: t1 += 2 * math.pi
            tt = t if t >= t0 else t + 2 * math.pi
            f = 0 if t1 == t0 else (tt - t0) / (t1 - t0)
            res.append(rr[j] + (rr[i] - rr[j]) * f)
        return res
    # the circle: the line with the least spread of radius about its own middle
    def mid(line):
        xs = [x for x, _ in line]; ys = [y for _, y in line]
        return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    circle = min(lines, key=lambda l: (lambda c: max(math.hypot(x - c[0], y - c[1]) for x, y in l) - min(math.hypot(x - c[0], y - c[1]) for x, y in l))(mid(l)))
    c = mid(circle)
    r0 = sum(math.hypot(x - c[0], y - c[1]) for x, y in circle) / len(circle)
    outer = max(lines, key=lambda l: max(math.hypot(x - c[0], y - c[1]) for x, y in l))
    rise = [max(0.0, q - r0) for q in radius(outer, c)]
    data = {"cx": round(c[0], 2), "cy": round(c[1], 2), "r0": round(r0, 2), "lines": len(lines),
            "fade": {"cx": round(gx, 2), "cy": round(gy, 2), "r": round(gr, 2), "peak": INTENSITY},
            "rise": [round(q, 2) for q in rise]}
    lib = Path(__file__).resolve().parent.parent / "lib" / "satori-sun-4.json"
    lib.write_text(json.dumps(data))
    core = svg.split("<g stroke")[0] + '<g stroke="url(#g)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">\n' + \
        "\n".join(f'<path d="{path_d(s, tf)}"/>' for s in rest) + "\n</g>\n</svg>\n"
    core = core.replace("Satori 4: written", "Satori 4 without its stars (the page animates them): written")
    (out / "drawing-4-core.svg").write_text(core)
    # The same lines for the page to draw by hand on a hover (2026-11-12, the
    # author's asking; components/satori-core.tsx), with the drawings' fade.
    (lib.parent / "satori-core-4.json").write_text(json.dumps(
        {"fade": {"cx": round(gx, 2), "cy": round(gy, 2), "r": round(gr, 2), "peak": INTENSITY}, "lines": hand_lines(rest, tf)}))
    print(f"sun: centre {c[0]:.2f},{c[1]:.2f}, circle {r0:.2f}, rays up to {max(rise):.1f}, {len(lines)} lines")


# Satori 2's pulse line is drawn this much larger about its middle (2026-11-12, the author's asking: 120%).
PULSE_SCALE = 1.2


def write_pulse(drawing, tf, svg, out, gx, gy, gr):
    """
    Satori 2, "a pulse of sparks / at the edge of mind" (2026-11-12, the
    author's brief): the line of pulses round the circles, the one that reads
    like a heart's trace, is no longer drawn; a light runs along it instead
    (components/satori-pulse.tsx), a little larger than drawn (`PULSE_SCALE`
    about its middle). Its twenty pieces, the open shapes, one after another
    round the circle clockwise, are joined into one closed path and written
    to lib/satori-pulse-2.json; the circles inside, the closed shapes, to
    drawing-2-rest.svg (for reference: the page now draws them itself, from
    lib/satori-core-2.json, components/satori-pulse.tsx).
    """
    import json
    pieces = [s for s in drawing if not s.get("closed")]
    rest = [s for s in drawing if s.get("closed")]
    ends = [tf(*s["start"]) for s in pieces]
    mx = sum(x for x, _ in ends) / len(ends)
    my = sum(y for _, y in ends) / len(ends)
    big = lambda x, y: (lambda p: (mx + (p[0] - mx) * PULSE_SCALE, my + (p[1] - my) * PULSE_SCALE))(tf(x, y))
    d = "".join(path_d(s, big) if i == 0 else path_d(s, big).split("C", 1)[1].join(["C", ""]) for i, s in enumerate(pieces))
    d = d.rstrip("Z") + "Z"
    lib = Path(__file__).resolve().parent.parent / "lib" / "satori-pulse-2.json"
    lib.write_text(json.dumps({"cx": round(mx, 2), "cy": round(my, 2), "scale": PULSE_SCALE, "d": d}))
    # The circles inside, each starting at the foot of its dip, for the page
    # to show only round the pendant's foot and to draw whole, one at a time,
    # as the light passes the pulses (2026-11-12, the author's asking).
    (lib.parent / "satori-core-2.json").write_text(json.dumps(
        {"fade": {"cx": round(gx, 2), "cy": round(gy, 2), "r": round(gr, 2), "peak": INTENSITY}, "lines": hand_lines(rest, tf)}))
    head = svg.split("<g stroke")[0]
    body = '<g stroke="url(#g)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">\n' + \
        "\n".join(f'<path d="{path_d(s, tf)}"/>' for s in rest) + "\n</g>\n</svg>\n"
    (out / "drawing-2-rest.svg").write_text(
        head.replace("Satori 2: written", "Satori 2 without its pulse line (the page runs a light along it): written") + body)
    print(f"pulse: {len(pieces)} pieces joined about {mx:.2f},{my:.2f} at {PULSE_SCALE:.0%}; {len(rest)} circles kept")


# Satori 1's lines as points this far apart (frame units), for the page to bend as it breathes.
BREATH_STEP = 2.5


def write_breath(drawing, tf, gx, gy, gr):
    """
    Satori 1, "the one who sits / is complete" (2026-11-12, the author's
    brief): only the figure sitting in meditation is shown, its circles hidden;
    its heart beats, the lines round the heart and the figure breathe, and on
    a hover the whole drawing is drawn by hand (components/satori-breath.tsx).
    The page bends the lines every frame, so they are written as points
    `BREATH_STEP` apart rather than curves, with what each is: "outer" (the
    great circle), "middle" (the middle circle, which comes down into the
    lines round the heart), "body" (the figure's body and crossed legs),
    "outline" (the great inner circle, which comes down into the figure's
    shoulders and arms) and "heart" (the small circle at its heart); and for
    the hand drawing, each line's length, ends and middle (as `hand_lines`).
    Written to lib/satori-breath-1.json, the points as 16-bit tenths in base64.
    """
    import base64
    import json
    import struct
    def box(s):
        p = points(s, tf)
        xs = [x for x, _ in p]; ys = [y for _, y in p]
        return min(xs), min(ys), max(xs), max(ys)
    boxes = [box(s) for s in drawing]
    heart = min(range(len(drawing)), key=lambda i: boxes[i][2] - boxes[i][0])
    outline = [i for i, s in enumerate(drawing) if not s.get("closed")][0]
    closed = sorted((i for i in range(len(drawing)) if i not in (heart, outline)), key=lambda i: boxes[i][1])
    roles = {closed[0]: "outer", closed[1]: "middle", closed[2]: "body", outline: "outline", heart: "heart"}
    hands = hand_lines(drawing, tf)
    lines = []
    for i, s in enumerate(drawing):
        p = points(s, tf, 64)
        if s.get("closed") and p[0] != p[-1]:
            p.append(p[0])
        seg = [math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) for k in range(len(p) - 1)]
        total = sum(seg)
        n = max(8, round(total / BREATH_STEP))
        out_pts, run, k = [], 0.0, 0
        for j in range(n + (0 if s.get("closed") else 1)):
            at = total * j / n
            while k < len(seg) - 1 and run + seg[k] < at:
                run += seg[k]; k += 1
            f = 0 if seg[k] == 0 else (at - run) / seg[k]
            out_pts.append((p[k][0] + (p[k + 1][0] - p[k][0]) * f, p[k][1] + (p[k + 1][1] - p[k][1]) * f))
        raw = b"".join(struct.pack("<hh", round(x * 10), round(y * 10)) for x, y in out_pts)
        line = dict(hands[i])
        del line["d"]
        line.update({"role": roles[i], "closed": bool(s.get("closed")), "pts": base64.b64encode(raw).decode()})
        lines.append(line)
    lib = Path(__file__).resolve().parent.parent / "lib" / "satori-breath-1.json"
    lib.write_text(json.dumps({"fade": {"cx": round(gx, 2), "cy": round(gy, 2), "r": round(gr, 2), "peak": INTENSITY},
                               "lines": lines}, separators=(",", ":")))
    print("breath: " + ", ".join(f"{l['role']} {l['len']:.0f}" for l in lines) + f"; {lib.stat().st_size // 1024} KB")


def main(src, out):
    shapes = parse(src)
    squares = [i for i, s in enumerate(shapes) if is_square(s)]
    assert len(squares) == 4, f"expected 4 squares of 210 mm, found {len(squares)}"
    bounds = squares + [len(shapes)]
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    for n, k in PANELS.items():
        drawing = [shapes[i] for i in range(bounds[k] + 1, bounds[k + 1])]
        sq = shapes[bounds[k]]
        qx0, qy0, qx1, qy1 = extent([sq])
        mx, my = (qx0 + qx1) / 2, (qy0 + qy1) / 2  # the square's centre, in points
        dx = AXIS_DX.get(n, 0.0)
        tf = lambda x, y: (CX + dx + (x - mx) * SCALE, CY - (y - my) * SCALE)
        x0, y0, x1, y1 = extent(drawing)
        (bx, by), (ex, ey) = tf(x0, y1), tf(x1, y0)
        bw, bh = ex - bx, ey - by
        cx, cy, r = bx + bw / 2, by + bh / 2, FADE_R * max(bw, bh)
        paths = "\n".join(f'<path d="{path_d(s, tf)}"/>' for s in drawing)
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none">
<!-- Satori {n}: written by scripts/satori-drawings.py from the author's 3ds Max .ai; edit there, not here. -->
<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(r)}">
<stop stop-color="{GOLD}" stop-opacity="{INTENSITY}"/><stop offset="1" stop-color="{GOLD}" stop-opacity="0"/></radialGradient></defs>
<style>path{{vector-effect:non-scaling-stroke}}</style>
<g stroke="url(#g)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
{paths}
</g>
</svg>
'''
        (out / f"drawing-{n}.svg").write_text(svg)
        if n == 4:
            write_sun(drawing, tf, cx, cy, r, out, svg)
        if n == 1:
            write_breath(drawing, tf, cx, cy, r)
        if n == 2:
            write_pulse(drawing, tf, svg, out, cx, cy, r)
        if n == 3:
            # Satori 3's whole drawing, drawn by hand on a hover (2026-11-12;
            # at rest the page shows circles closing on the pendant instead,
            # scripts/satori-flow.py).
            import json
            lib = Path(__file__).resolve().parent.parent / "lib" / "satori-core-3.json"
            lib.write_text(json.dumps({"fade": {"cx": round(cx, 2), "cy": round(cy, 2), "r": round(r, 2), "peak": INTENSITY},
                                       "lines": hand_lines(drawing, tf)}))
        print(f"drawing-{n}.svg: {len(drawing)} shapes, {SCALE * 72 / 25.4:.3f} units per mm, "
              f"box {fmt(bx)},{fmt(by)} {fmt(bw)} x {fmt(bh)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
