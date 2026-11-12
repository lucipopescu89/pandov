"""
The four Satori photographs, cut out on transparency, for /body/satori.

    python3 scripts/satori-photos.py "D:/PANDOV/2_BODY/2_SATORI" public/images/body/satori

Reads the author's "satori <n> png.png" (a photograph of the pendant with its
ground taken out), crops it to the pendant and writes photo-<n>.avif at twice
the size it is drawn on the page, alpha kept. The page lays it over its
drawing at `BOX` (frame units, the 1530 × 1635 frames of
scripts/satori-drawings.py), centred on the frame's middle; `PHOTO_BOX` in
components/satori-presentation.tsx holds the top, width and height it prints.

Since 2026-11-12 the frames are 1275 × 1380 (125% of Figma's, not 150%). `BOX`
stays in the 1530 frame it was measured in, and the script prints the place
in the 1275 one (`K`: the square's foot stays the frame's foot, the 105 over
it the verse's). The photographs on disk were made at the 1530 frame's
DENSITY, which is 2.4 pixels to a unit of the smaller frame; run again, it
makes them at 2 to the unit of the 1275 frame.

Where and how large (2026-11-11): from four screenshots of 3ds Max the author
sent, each pendant's model standing in its drawing as the author drew them
round it. Each screenshot's gold lines were fitted onto the drawing, scale
and offset (all four were taken at one zoom, 1.272 frame units to a screen
pixel, and the lines met within a pixel or two), and the model's box in the
screenshot carried over to the frame: its top, its foot, its middle (which
falls on the drawing's axis, x 765, in all four). The photograph's pendant is
then scaled to that height and centred on the axis. Height, not width: the
photographs are not all square on (Satori 3 is turned, its ring narrower than
the model's).

Each is set upright and on the axis by its own symmetry (2026-11-11, the
author's asking: Satori 2 and 4 stood a hair left of their drawings, 3 a hair
right). Centring the cut-out's box was not enough: the pendants are not in
the middle of their photographs' boxes (a ray or a highlight on one side
widens the box), and two are tilted, Satori 3 by 0.4° and Satori 4 by 1.25°,
so the bird's foot swung off the line the ring was on. `upright` finds the
turn about which the pendant's outline is most nearly its own mirror image
and turns the photograph upright. `axis` then finds the pendant's own line:
the middle of the ring's hole and the middle of the bird's body below it
(which, upright, agree within a quarter unit). The mirror line alone sat
half a unit to a unit off it, pulled by the shading at the alpha's edges.
The photograph is cropped evenly about that line, so it falls on the middle
of the image and the page puts the middle on the drawing's axis.

The models in Max are not all at the pendants' true size against the
drawings: Satori 1 and 4 are (23 and 47.5 mm at the drawings' 7.286 units to
the millimetre; the pendants are 23 and 48), Satori 2 comes out at 29.5 mm
(24) and Satori 3 at 62.3 mm (56), turned so its ring is narrower, as in its
photograph. The page follows the screenshots, the author's composition.
(Satori 3's first screenshot was the wrong one, by the author's word; it is
placed from the second, which has the pendant hanging lower and larger.)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

# The 1530 frame, where BOX was measured, carried to the 1275 one.
K = 1275 / 1530
AXIS_X = 765
# Frame units: the pendant's top and foot.
BOX = {1: (836.8, 1004.7), 2: (791.0, 1005.9), 3: (694.4, 1148.4), 4: (724.5, 1070.4)}
NAMES = {1: "satori 1 png.png", 2: "satori 2 png.png", 3: "Satori 3 png.png", 4: "Satori 4 png.png"}
DENSITY = 2  # pixels per frame unit, for sharp screens


def asym(a, ang, c):
    """How far the alpha `a`, turned `ang` degrees about column `c`, is from its mirror image there."""
    b = np.asarray(Image.fromarray(a).rotate(ang, resample=Image.Resampling.BILINEAR, center=(c, a.shape[0] / 2))).astype(float)
    ci = int(round(c))
    w = min(ci, b.shape[1] - ci - 1)
    return np.abs(b[:, ci - w:ci][:, ::-1] - b[:, ci + 1:ci + 1 + w]).mean()


def axis(alpha):
    """The pendant's vertical line in an upright cut-out: the mean of its ring hole's middle and its body's."""
    from scipy import ndimage
    a = alpha > 128
    h = a.shape[0]
    lab, nl = ndimage.label(~a)
    edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    hole = max((ndimage.sum(lab == i), i) for i in range(1, nl + 1) if i not in edge)[1]
    ys, xs = np.where(lab == hole)
    hole_x = xs.mean() + 0.5
    mids = [(np.where(a[y])[0].min() + np.where(a[y])[0].max() + 1) / 2
            for y in range(ys.max() + int(0.08 * h), h - 2, 3) if a[y].any()]
    return (hole_x + float(np.median(mids))) / 2


def upright(alpha):
    """The turn (degrees) and the column of the pendant's axis in `alpha`: a coarse search on a small copy, then refined."""
    k = 400 / alpha.shape[0]
    small = np.asarray(Image.fromarray(alpha).resize((int(alpha.shape[1] * k), 400), Image.Resampling.BILINEAR))
    best = min((asym(small, a, c), a, c) for a in np.arange(-4, 4.01, 0.25)
               for c in np.arange(small.shape[1] * 0.42, small.shape[1] * 0.58, 0.5))
    v, ang, c = best[0], best[1], best[2] / k
    for sa, sc in [(0.1, 1.0), (0.03, 0.3), (0.01, 0.1)]:
        moved = True
        while moved:
            moved = False
            for da, dc in [(sa, 0), (-sa, 0), (0, sc), (0, -sc)]:
                v2 = asym(alpha, ang + da, c + dc)
                if v2 < v - 1e-9:
                    v, ang, c, moved = v2, ang + da, c + dc, True
    return ang, c


def main(src, out):
    src, out = Path(src), Path(out)
    for n, (top, foot) in BOX.items():
        im = Image.open(src / NAMES[n]).convert("RGBA")
        a = np.asarray(im).copy()
        a[..., 3][a[..., 3] < 4] = 0  # a faint haze over the empty ground in some
        ys, xs = np.where(a[..., 3] > 8)
        a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        ang, c = upright(a[..., 3].copy())
        pad = 40
        big = Image.fromarray(np.pad(a, ((pad, pad), (pad, pad), (0, 0))))
        big = big.rotate(ang, resample=Image.Resampling.BICUBIC, center=(c + pad, pad + a.shape[0] / 2))
        b = np.asarray(big)
        ys, xs = np.where(b[..., 3] > 8)
        cx = axis(b[..., 3])
        half = max(cx - xs.min(), xs.max() + 1 - cx)
        crop = big.crop((round(cx - half), ys.min(), round(cx + half), ys.max() + 1))
        # Measured in the 1530 frame, placed in the 1275 one.
        h = (foot - top) * K
        w = h * crop.width / crop.height
        top = 105 + (top - 105) * K
        crop = crop.resize((round(w * DENSITY), round(h * DENSITY)), Image.Resampling.LANCZOS)
        crop.save(out / f"photo-{n}.avif", quality=80)
        print(f"photo-{n}.avif {crop.size}: turned {ang:+.2f}°, left {AXIS_X * K - w / 2:.1f}, top {top:.1f}, width {w:.1f}, height {h:.1f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
