"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SeenEyes } from "@/components/seen-eyes"
import { BODY_PIECES, SATORI_PIECE } from "@/lib/body-collections"
import { SECOND_WIND } from "@/lib/second-wind"

/**
 * /seen — the hidden page behind the eye (2026-11-08, the author's asking, an
 * experiment). Nothing links to it but the eye in the homepage's Making
 * section (`EYE_HREF` in `making-drawing.tsx`), and it asks search engines to
 * leave it out (`app/seen/page.tsx`).
 *
 * No top or bottom menu (the author's asking, the same day): a pair of small
 * eyes above the grid and another below it are the only way out, back to the
 * eye the reader came in by (`components/seen-eyes.tsx`).
 *
 * Every photograph on the site at once, big, in a Mondrian-like grid on
 * #202020: rows that run the full width, each cut into fields, some fields
 * cut again across into two (`STACK_CHANCE`), held apart by `GAP` of ground.
 *
 * - **No piece is ever cut** (the author's asking: cropped jewellery looked
 *   wrong). A picture may lose some of its ground to fit its field, never any
 *   of the piece. Each file carries the box its piece stands in (`BOX`,
 *   measured once off the files: where the picture differs from the ground at
 *   its edges, plus air round it: 12% of the piece's longer side on the dark
 *   ground, so a cut-out piece is not blown up to its field's edges, 6% on white). That box sets how far the field may be wider
 *   or narrower than the picture, and the crop is placed round the piece
 *   (`objectPosition`). A photograph whose ground is textured (stone, skin,
 *   cloth) could not be measured that way and keeps its own proportions
 *   whole. A new picture missing from `BOX` is shown whole too, until it is
 *   measured and added.
 * - **About three across a laptop, four on a wide screen, two on a phone**
 *   (`columns`). The rows find their own heights within what the pieces
 *   allow, so the grid fills the width exactly and the page scrolls.
 * - **The order is random but fixed** (`SEED`): the same every visit. The
 *   tries that came before, the same day: one screen of small fields, a click
 *   that re-shuffled it, and an order dark → white → dark by lightness.
 * - **The list is read from the site's own data**, `SECOND_WIND` and
 *   `BODY_PIECES`, so a pendant photograph or a Body piece added there turns up
 *   here too (shown whole until measured). The rest is named in `SITE`.
 *
 * The Second Wind photographs are taken at their -phone size (1080px): no
 * field here is drawn wider than that. The rest are the files the site uses.
 */

/**
 * `cutout`: a piece cut out on the #202020 ground (or with no ground at all).
 * These are never drawn larger than their own pixels (`object-fit:
 * scale-down`): several are small files (the Compassion ring is 345px wide),
 * and filling a big field blew them up soft (the author's asking, 2026-11-08).
 * Smaller than its field, such a piece stands in the middle of it, its ground
 * meeting the page's invisibly. Photographs fill their fields as before.
 */
type Tile = { src: string; alt: string; cutout?: boolean }

/** The ground between the fields, px. */
const GAP = 3
/** Fields across a row: ~3 on a laptop, 4 on a wide screen (never more, the author's asking), 2 on a phone. */
const FIELD_PX = 480
const columns = (w: number) => (w < 768 ? 2 : Math.min(4, Math.max(3, Math.round(w / FIELD_PX))))
/** A row aims at this height, as a share of a field's width; the pieces decide how near it gets. */
const ROW_ASPECT = 1.15
/** How often two pictures share a field, one above the other, Mondrian's smaller divisions. */
const STACK_CHANCE = 0.3
/** Fixes the order and the stacks, so the page is the same on every visit. */
const SEED = 8

const SITE: Tile[] = [
  { src: "/images/cat-mind.jpg", alt: "For Mind" },
  { src: "/images/cat-body.jpg", alt: "For Body" },
  { src: "/images/cat-space.avif", alt: "For Space" },
  { src: "/images/home/making-sculpture.jpg", alt: "A white vase in a burnt trunk" },
  { src: "/images/home/footer-banner.png", alt: "" },
  { src: "/images/mind-chess-set.jpg", alt: "The Chess Set" },
  { src: "/images/chess-set/set-left.jpg", alt: "The Chess Set" },
  { src: "/images/chess-set/set-front.jpg", alt: "The Chess Set" },
  { src: "/images/chess-set/board-side.jpg", alt: "The chess board" },
  { src: "/images/chess-set/board-marble.jpg", alt: "The chess board" },
  { src: "/images/chess-set/board-front.jpg", alt: "The chess board" },
  { src: "/images/chess-set/board-detail.jpg", alt: "The chess board" },
  { src: "/images/chess-pieces/kings.jpg", alt: "Kings" },
  { src: "/images/chess-pieces/queens.jpg", alt: "Queens" },
  { src: "/images/chess-pieces/bishops.jpg", alt: "Bishops" },
  { src: "/images/chess-pieces/knights.jpg", alt: "Knights" },
  { src: "/images/chess-pieces/rooks.jpg", alt: "Rooks" },
  { src: "/images/chess-pieces/pawns.jpg", alt: "Pawns" },
  { src: "/images/chess-set/hero.png", alt: "The Chess Set" },
  { src: "/images/chess-set/moon.avif", alt: "The moon" },
  { src: "/presence.png?v=3", alt: "Presence sculpture", cutout: true },
  { src: "/images/home/selected-emperor.avif", alt: "Emperor" },
  { src: "/images/home/selected-chess-set.avif", alt: "The Chess Set" },
  { src: "/images/body-collections/emperor.avif", alt: "Emperor", cutout: true },
]

const TILES: Tile[] = [
  ...SITE,
  ...Object.values(SECOND_WIND).flatMap((p) => [
    { src: p.cutout, alt: p.name, cutout: true },
    ...p.photos.map((ph) => ({ src: ph.phone, alt: ph.alt })),
  ]),
  ...[SATORI_PIECE, ...BODY_PIECES].map((p) => ({ src: `/images/body-collections/${p.file}`, alt: `${p.name}, ${p.kind}`, cutout: true })),
]

/**
 * Each picture: its size in pixels, then the box its piece stands in, as
 * shares of the width and height (left, top, right, bottom). A box of
 * 0, 0, 1, 1 is a picture shown whole. Measured off the files on 2026-11-08.
 */
const BOX: Record<string, [number, number, number, number, number, number]> = {
  "/images/body/icarus/icarus-1-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/icarus/icarus-2-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/icarus/icarus-3-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/icarus/icarus-4-phone.avif": [1080, 1476, 0.000, 0.302, 1.000, 0.974],
  "/images/body/waterfall/waterfall-5-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/waterfall/waterfall-6-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/waterfall/waterfall-3-phone.avif": [1080, 1621, 0.000, 0.000, 1.000, 1.000],
  "/images/body/waterfall/waterfall-2-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/waterfall/waterfall-1-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/chaos/chaos-24-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/chaos/chaos-23-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/chaos/chaos-earrings-phone.avif": [1080, 1620, 0.000, 0.000, 1.000, 1.000],
  "/images/body/chaos/chaos-21-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/chaos/chaos-22-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/silence/silence-19-phone.avif": [1080, 1476, 0.279, 0.000, 0.707, 0.904],
  "/images/body/silence/silence-3-phone.avif": [1080, 1619, 0.000, 0.000, 1.000, 1.000],
  "/images/body/silence/silence-20-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/silence/silence-18-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/mnature/mnature-9-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/mnature/mnature-4-phone.avif": [1080, 1620, 0.000, 0.000, 1.000, 1.000],
  "/images/body/mnature/mnature-13-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/mnature/mnature-10-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/mnature/mnature-11-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/presence/presence-15-phone.avif": [1080, 1476, 0.341, 0.320, 0.621, 0.845],
  "/images/body/presence/presence-16-phone.avif": [1080, 1476, 0.342, 0.313, 0.638, 0.835],
  "/images/body/presence/presence-17-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/presence/presence-lumink-phone.avif": [707, 1062, 0.000, 0.000, 1.000, 1.000],
  "/images/body/presence/presence-14-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/emperor/emperor-3-phone.avif": [1024, 1536, 0.000, 0.000, 1.000, 1.000],
  "/images/body/emperor/emperor-7-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/emperor/emperor-8-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/emperor/emperor-5-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/emperor/emperor-6-phone.avif": [1080, 1476, 0.000, 0.000, 1.000, 1.000],
  "/images/body/icarus-pendant.avif": [415, 1190, 0.000, 0.000, 1.000, 1.000],
  "/images/body/waterfall-pendant.avif": [483, 1298, 0.000, 0.000, 1.000, 1.000],
  "/images/body/chaos-pendant.avif": [483, 1298, 0.000, 0.000, 1.000, 1.000],
  "/images/body/silence-pendant.avif": [449, 1244, 0.000, 0.000, 1.000, 1.000],
  "/images/body/mnature-pendant.avif": [659, 1611, 0.000, 0.000, 1.000, 1.000],
  "/images/body/presence-pendant.avif": [449, 1244, 0.000, 0.000, 1.000, 1.000],
  "/images/body/emperor-pendant.avif": [493, 1489, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/satori.avif": [558, 668, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/seeds.avif": [557, 840, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/protection.avif": [476, 841, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/awareness.avif": [697, 671, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/awareness-pendant.avif": [532, 840, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/compassion.avif": [345, 408, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/compassion-pendant.avif": [511, 840, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/duality.avif": [840, 659, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/duality-bracelet.avif": [840, 709, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/in.avif": [368, 792, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/liman.avif": [647, 795, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/one.avif": [332, 744, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/prot.avif": [389, 838, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/sed-ring.avif": [602, 469, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/seed.avif": [700, 694, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/skeyes-earrings.avif": [618, 840, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/skeyes-pendant.avif": [295, 839, 0.008, 0.000, 0.999, 1.000],
  "/images/body-collections/word.avif": [523, 754, 0.000, 0.000, 1.000, 1.000],
  "/images/cat-mind.jpg": [2968, 900, 0.038, 0.000, 0.962, 1.000],
  "/images/cat-body.jpg": [1026, 1868, 0.101, 0.000, 0.890, 0.975],
  "/images/cat-space.avif": [2294, 1600, 0.000, 0.000, 1.000, 1.000],
  "/images/home/making-sculpture.jpg": [2400, 2287, 0.000, 0.000, 1.000, 1.000],
  "/images/home/footer-banner.png": [2792, 1230, 0.109, 0.128, 0.876, 0.809],
  "/images/mind-chess-set.jpg": [1338, 837, 0.000, 0.052, 1.000, 1.000],
  "/images/chess-set/set-left.jpg": [2079, 1550, 0.000, 0.182, 1.000, 0.969],
  "/images/chess-set/set-front.jpg": [2079, 1550, 0.000, 0.166, 1.000, 0.985],
  "/images/chess-set/board-side.jpg": [2079, 1550, 0.000, 0.000, 1.000, 1.000],
  "/images/chess-set/board-marble.jpg": [2079, 1550, 0.000, 0.000, 1.000, 1.000],
  "/images/chess-set/board-front.jpg": [2079, 1550, 0.000, 0.239, 1.000, 0.791],
  "/images/chess-set/board-detail.jpg": [2079, 1550, 0.000, 0.000, 1.000, 1.000],
  "/images/chess-pieces/kings.jpg": [1800, 1448, 0.039, 0.105, 0.899, 0.973],
  "/images/chess-pieces/queens.jpg": [1800, 1448, 0.028, 0.153, 0.910, 0.987],
  "/images/chess-pieces/bishops.jpg": [1800, 1448, 0.053, 0.231, 0.885, 0.974],
  "/images/chess-pieces/knights.jpg": [1800, 1448, 0.061, 0.335, 0.881, 0.967],
  "/images/chess-pieces/rooks.jpg": [1800, 1448, 0.065, 0.324, 0.908, 0.969],
  "/images/chess-pieces/pawns.jpg": [1800, 1448, 0.052, 0.292, 0.861, 0.970],
  "/images/chess-set/hero.png": [2667, 1861, 0.000, 0.014, 1.000, 1.000],
  "/images/chess-set/moon.avif": [3870, 1719, 0.326, 0.065, 0.674, 0.844],
  "/presence.png": [309, 1089, 0.000, 0.000, 1.000, 1.000],
  "/images/home/selected-emperor.avif": [924, 1124, 0.000, 0.000, 0.907, 1.000],
  "/images/home/selected-chess-set.avif": [1187, 1154, 0.000, 0.000, 1.000, 1.000],
  "/images/body-collections/emperor.avif": [278, 840, 0.000, 0.000, 1.000, 1.000],
}

/** A small seeded random, so the order is the same for the same seed. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * What a picture allows: its own proportion (width over height) and how far
 * a field may go narrower (`lo`) or wider (`hi`) before the crop reaches the
 * piece. An unmeasured picture is taken as a square shown whole.
 */
type Shape = { n: number; lo: number; hi: number; box: [number, number, number, number] }
function shapeOf(t: Tile): Shape {
  const m = BOX[t.src.split("?")[0]]
  if (!m) return { n: 1, lo: 1, hi: 1, box: [0, 0, 1, 1] }
  const [w, h, x0, y0, x1, y1] = m
  const n = w / h
  return { n, lo: n * (x1 - x0), hi: n / (y1 - y0), box: [x0, y0, x1, y1] }
}

/**
 * Sizes that add up to `total`, one per [natural, min, max], each as near its
 * natural share as its limits allow: a common factor found by halving.
 */
function share(total: number, parts: [number, number, number][]): number[] {
  const at = (f: number) => parts.map(([n, lo, hi]) => Math.min(hi, Math.max(lo, n * f)))
  const sum = (f: number) => at(f).reduce((s, v) => s + v, 0)
  let a = 0
  let b = 1
  while (sum(b) < total && b < 1e9) b *= 2
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2
    if (sum(m) < total) a = m
    else b = m
  }
  return at(b)
}

type Rect = { x: number; y: number; w: number; h: number }
type Placed = { rect: Rect; pos: string }

/** Where to hold the picture in a field of this proportion so its piece stays whole. */
function objectPosition(s: Shape, fieldAspect: number): string {
  const [x0, y0, x1, y1] = s.box
  const place = (vis: number, c0: number, c1: number) => {
    if (vis >= 1) return 50
    const lo = Math.max(0, c1 - vis)
    const hi = Math.min(c0, 1 - vis)
    const at = lo <= hi ? Math.min(hi, Math.max(lo, (c0 + c1) / 2 - vis / 2)) : (lo + hi) / 2
    return (at / (1 - vis)) * 100
  }
  if (fieldAspect < s.n) return `${place(fieldAspect / s.n, x0, x1).toFixed(1)}% 50%`
  return `50% ${place(s.n / fieldAspect, y0, y1).toFixed(1)}%`
}

/** The whole grid for a box `w` wide: where each picture goes, and the height it all takes. */
function layout(w: number): { placed: Placed[]; height: number } {
  const rand = seeded(SEED)
  const shapes = TILES.map(shapeOf)
  const order = TILES.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // Fields: one picture, or two one above the other when their proportions
  // together still make a reasonable field.
  type Field = { items: number[]; n: number; lo: number; hi: number }
  const fields: Field[] = []
  for (let k = 0; k < order.length; k++) {
    const a = shapes[order[k]]
    const b = k + 1 < order.length ? shapes[order[k + 1]] : null
    if (b && rand() < STACK_CHANCE) {
      const n = 1 / (1 / a.n + 1 / b.n)
      if (n > 0.45 && n < 1.3) {
        fields.push({ items: [order[k], order[k + 1]], n, lo: 1 / (1 / a.lo + 1 / b.lo), hi: 1 / (1 / a.hi + 1 / b.hi) })
        k++
        continue
      }
    }
    fields.push({ items: [order[k]], n: a.n, lo: a.lo, hi: a.hi })
  }

  // Rows of `columns` fields, the last ones spread evenly so no row is left short.
  const cols = columns(w)
  const rowCount = Math.max(1, Math.round(fields.length / cols))
  const target = (w / cols) / ROW_ASPECT
  const placed: Placed[] = new Array(TILES.length)
  let y = 0
  let start = 0
  for (let r = 0; r < rowCount; r++) {
    const end = Math.round(((r + 1) * fields.length) / rowCount)
    const row = fields.slice(start, end)
    start = end
    const sumLo = row.reduce((s, f) => s + f.lo, 0)
    const sumHi = row.reduce((s, f) => s + f.hi, 0)
    // The row's height: as near the target as the pieces allow.
    const h = Math.min(w / sumLo, Math.max(w / sumHi, target))
    const widths = share(w, row.map((f) => [f.n * h, f.lo * h, f.hi * h]))
    let x = 0
    row.forEach((f, i) => {
      const fw = widths[i]
      if (f.items.length === 1) {
        const s = shapes[f.items[0]]
        placed[f.items[0]] = { rect: { x, y, w: fw, h }, pos: objectPosition(s, fw / h) }
      } else {
        const [a, b] = f.items.map((it) => shapes[it])
        const [ha, hb] = share(h, [
          [fw / a.n, fw / a.hi, fw / a.lo],
          [fw / b.n, fw / b.hi, fw / b.lo],
        ])
        placed[f.items[0]] = { rect: { x, y, w: fw, h: ha }, pos: objectPosition(a, fw / ha) }
        placed[f.items[1]] = { rect: { x, y: y + ha, w: fw, h: hb }, pos: objectPosition(b, fw / hb) }
      }
      x += fw
    })
    y += h
  }
  return { placed, height: y }
}

export function SeenMosaic() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    const measure = () => {
      const w = boxRef.current?.clientWidth ?? 0
      if (w > 0) setWidth((old) => (old === w ? old : w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (boxRef.current) ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [])

  const grid = width ? layout(width) : null
  const onLoad = useCallback((i: number) => {
    setLoaded((s) => {
      if (s.has(i)) return s
      const n = new Set(s)
      n.add(i)
      return n
    })
  }, [])

  return (
    <main className="w-full" style={{ backgroundColor: "#202020", minHeight: "100vh" }}>
      <SeenEyes place="header" />

      <div ref={boxRef} className="relative w-full overflow-hidden" style={{ height: grid ? grid.height : "100vh" }}>
        {grid &&
          TILES.map((t, i) => {
            const { rect: r, pos } = grid.placed[i]
            return (
              <div
                key={t.src}
                className="absolute"
                style={{
                  left: r.x + GAP / 2,
                  top: r.y + GAP / 2,
                  width: Math.max(0, r.w - GAP),
                  height: Math.max(0, r.h - GAP),
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- `images.unoptimized`: next/image would serve the same file */}
                <img
                  src={t.src}
                  alt={t.alt}
                  draggable={false}
                  decoding="async"
                  loading="lazy"
                  onLoad={() => onLoad(i)}
                  ref={(el) => {
                    // A picture already in the cache can finish before React listens.
                    if (el?.complete && el.naturalWidth > 0) onLoad(i)
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: t.cutout ? "scale-down" : "cover",
                    objectPosition: t.cutout ? "50% 50%" : pos,
                    opacity: loaded.has(i) ? 1 : 0,
                    transition: "opacity 900ms ease",
                  }}
                />
              </div>
            )
          })}
      </div>

      <SeenEyes place="footer" />
    </main>
  )
}
