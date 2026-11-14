"use client"

import { useEffect, useRef } from "react"
import DATA from "@/lib/satori-breath-1.json"
import { HEART_S, heartbeat } from "@/lib/heartbeat"
import { PLAY_EVENT, startsHover } from "@/components/satori-sun"
import { canvasDpr, comets, drawnStretches, flush, lights, skipFrame, type Gate, ease, lightWay, span, stretch, type LightCfg, type Mode, type Pts } from "@/lib/satori-lights"

/**
 * Satori 1, "the one who sits / is complete" (2026-11-12, the author's brief).
 *
 * **At rest only the figure sitting in meditation is shown.** The drawing's
 * circles are hidden: the great one wholly, and the two that come down into
 * the figure (the middle circle into the lines round its heart, the great
 * inner one into its shoulders and arms) are cut where they leave it, through
 * a soft mask round the figure (`ZONE`, feathered by `FEATHER`), so they fade
 * out just where they begin to turn into circles.
 *
 * **It lives.** The small circle at its heart beats at the site's one
 * heartbeat (`lib/heartbeat.ts`, Mother Nature's lub-dub): a little larger and
 * a little brighter on each beat (`HEART_GROW`, `HEART_DIM`). The figure
 * breathes, calmly, slower than the heart (`BREATH_S`): on the breath in the
 * chest swells, the lines round the heart open about it and the shoulders
 * rise a little (`BREATH_*`); the crossed legs barely move, and the head, the
 * pendant, does not move at all: nothing above `NECK_Y` is bent. The breath is
 * one smooth swelling centred on the chest that fades out in every direction
 * (`bend`), the same for every line and for the heart, so lines side by side
 * move together and never cross, nothing bends at an edge, and the circles,
 * away from it, stand still (2026-11-14, the author's asking: the chest's
 * widening was a band across the frame with steep edges, which bent the
 * circles where they crossed it, kinks on a hover; the middle circle's own
 * swell on a hover, `MIDDLE`, now gone, crossed the lines round the heart; a
 * first fix weighted the bending by the figure's zone, whose corners still
 * left a small hook where the middle circle leaves the shoulders).
 *
 * **On a hover over the pendant** the whole drawing is drawn by hand, as
 * Satori 3's and 4's are (`components/satori-core.tsx`, Making's speeds and
 * easing), from the pendant outward, the figure at rest giving way to it as
 * it is drawn over. It is dimmed and
 * traced by lights as Satori 3's is (`DIM`, `LIGHT_*`). Off it, it is drawn
 * back, and the figure alone comes back.
 *
 * **On a hover it also comes forward**, as Satori 2 does (2026-11-14, the
 * author's asking): the pendant and the figure grow to `ZOOM_IN` about the
 * great circle's centre and rise a little (`ZOOM_LIFT`), as one: the figure is
 * made of the circles where they come into it, so they are moved together,
 * rigidly, and the figure keeps its proportions all the way. The circles,
 * outside the figure, follow outward from it (`ZOOM_R0`…`ZOOM_R1`, a spring a
 * band, `ZOOM_STAGGER` apart), the great circle last, blending into the
 * figure's movement over `ZOOM_BLEND` round it. Off the pendant they go back
 * outermost first. Each band is a critically damped spring (`ZOOM_W`), as
 * Satori 2's circles.
 *
 * The lines are lib/satori-breath-1.json (`scripts/satori-drawings.py`,
 * `write_breath`): points 2.5 units apart, bent every frame, drawn on two
 * canvases (the figure at rest, the hover drawing). One screen pixel wide, in
 * the drawings' gold and fade. It runs only while the frame is on screen. Under reduced
 * motion the figure stands still and nothing is drawn on a hover.
 */

const FRAME_W = 1275
const FRAME_H = 1380
const AXIS_X = FRAME_W / 2

/** Where the figure is seen: round it, from the neck down to under its legs (x from the axis, y down the frame). */
const ZONE_HALF: [number, number][] = [
  [38, 822], [36, 856], [36, 902], [50, 925], [76, 941], [94, 957], [92, 974], [70, 990], [40, 999], [0, 1001],
]
const ZONE_D = (() => {
  const right = ZONE_HALF.map(([x, y]) => `${AXIS_X + x} ${y}`)
  const left = [...ZONE_HALF].reverse().map(([x, y]) => `${AXIS_X - x} ${y}`)
  return `M${[...right, ...left].join(" L")} Z`
})()
const FEATHER = 3.5

/** The heart's beat: how much larger at its height, and how dim between beats (1 at the height). */
const HEART_GROW = 0.4
const HEART_DIM = 0.65
/** One breath, in and out, seconds (the heart beats every 2.2). */
const BREATH_S = 7
/** Nothing above this is bent: the head, the pendant, stays still (the breath fades in from `NECK_Y` − 15 to `NECK_Y` + 35). */
const NECK_Y = 852
/**
 * The breath at its fullest: a swelling of the chest, centred on the axis at
 * `BREATH_CY`, falling off as a Gaussian `BREATH_SX` wide and `BREATH_SY` tall;
 * at its middle the figure widens by `BREATH_X` about the axis, opens by
 * `BREATH_Y` about the heart, and rises `BREATH_RISE` frame units. At most
 * about 3.4 units anywhere (4.3 with the band it replaced).
 */
const BREATH_CY = 890
const BREATH_SX = 55
const BREATH_SY = 50
const BREATH_X = 0.11
const BREATH_Y = 0.07
const BREATH_RISE = 3.4

/** The hover drawing: Making's speeds and easing, from the pendant's middle (`PHOTO_BOX` satori-1). */
const ORIGIN: [number, number] = [AXIS_X, 784.75]
const FRONT_SPEED = 520
const DRAW_SPEED = 400
const DRAW_MIN_MS = 500
const UNDRAW_RATE = 1.6
const REST_OUT_MS = 500
const REST_IN_MS = 900
/**
 * The hover drawing as Satori 3's (2026-11-12, the author's asking): dimmed
 * (`DIM`, a share of the drawings' gold) and traced by lights that ride its
 * drawing and then run along its lines (`lib/satori-lights.ts`). It is drawn
 * on a canvas, every line bent by the breath each frame: drawn through SVG
 * dashes, the second circle from the outside broke here and there as it
 * breathed (the author's report, the same day).
 */
const DIM = 0.45
const LIGHT = "214, 172, 106"
const LIGHT_PEAK = 0.85
const LIGHT_CFG: LightCfg = { trail: 320, front: 30, piece: 6, speed: 115 }
/** The lines' points are this far apart (`BREATH_STEP` in `satori-drawings.py`). */
const STEP = 2.5
const LIGHT_OUT_S = 0.35
/**
 * Coming forward on a hover (2026-11-14; Satori 2's, `satori-pulse.tsx`, at
 * about half the size): everything grows to `ZOOM_IN` about the great
 * circle's centre (`DATA.fade`) and rises `ZOOM_LIFT` frame units. The pendant
 * and the figure (inside `ZONE`) move as one, first; outside it, the lines
 * set out by their distance from the centre, from `ZOOM_R0` (just past the
 * figure's heart and shoulders) to `ZOOM_R1` (the great circle), in
 * `ZOOM_BANDS` bands `ZOOM_STAGGER` apart, each a critically damped spring;
 * a point within `ZOOM_BLEND` of the figure moves partly with it, so no line
 * breaks where it leaves the figure. Back off the pendant `ZOOM_BACK` times
 * as fast in its order, outermost first. All at one size in the end, so the
 * drawing is only larger, never bent. The great circle grows to 288 and
 * rises, so the frame's extent on /body/satori is `DRAWING` satori-1 459 to
 * 1036 (`satori-presentation.tsx`), the verse still outside it.
 */
const ZOOM_IN = 1.15
const ZOOM_LIFT = 15
const ZOOM_C: [number, number] = [DATA.fade.cx, DATA.fade.cy]
const ZOOM_R0 = 100
const ZOOM_R1 = 255
const ZOOM_BANDS = 9
const ZOOM_STAGGER = 0.07
const ZOOM_BACK = 3
const ZOOM_W = 3.2
const ZOOM_W_BACK = 4
const ZOOM_BLEND = 30
/** The most a point can move, frame units: the boxes' room for it. */
const ZOOM_ROOM = 255 * (ZOOM_IN - 1) + ZOOM_LIFT + 4

/** The canvas the figure at rest is drawn on: the zone's box with room for its feathered edge, in frame units. */
const REST_BOX = (() => {
  // with room for the figure grown and risen on a hover (`ZOOM_*`, below)
  const w = Math.max(...ZONE_HALF.map(([x]) => x)) * ZOOM_IN + 4 * FEATHER + 6
  const ys = ZONE_HALF.map(([, y]) => y)
  const y0 = Math.min(...ys) - 4 * FEATHER - 6 - ZOOM_LIFT
  const y1 = ZOOM_C[1] + (Math.max(...ys) - ZOOM_C[1]) * ZOOM_IN + 4 * FEATHER + 6
  return { x: AXIS_X - w, y: y0, w: 2 * w, h: y1 - y0 }
})()

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

type Role = "outer" | "middle" | "body" | "outline" | "heart"
const LINES = DATA.lines.map((l) => {
  const bin = atob(l.pts)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { ...l, role: l.role as Role, xy: Float32Array.from(new Int16Array(bytes.buffer), (v) => v / 10) }
})
const byRole = (r: Role) => LINES.find((l) => l.role === r)!
const HEART = (() => {
  const h = byRole("heart").xy
  let x = 0, y = 0
  for (let i = 0; i < h.length; i += 2) { x += h[i]; y += h[i + 1] }
  return [x / (h.length / 2), y / (h.length / 2)] as const
})()

/**
 * For coming forward: how much each point moves with the figure (1 inside the
 * zone, fading to 0 `ZOOM_BLEND` outside it) and its band by its distance
 * from the centre (0 … `ZOOM_BANDS` − 1), measured at rest.
 */
const ZONE_PTS: [number, number][] = [
  ...ZONE_HALF.map(([x, y]) => [AXIS_X + x, y] as [number, number]),
  ...[...ZONE_HALF].reverse().map(([x, y]) => [AXIS_X - x, y] as [number, number]),
]
const outsideZone = (x: number, y: number) => {
  let inside = false
  let d = Infinity
  for (let i = 0, j = ZONE_PTS.length - 1; i < ZONE_PTS.length; j = i++) {
    const [xi, yi] = ZONE_PTS[i]
    const [xj, yj] = ZONE_PTS[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    const ex = xj - xi, ey = yj - yi
    const t = Math.max(0, Math.min(1, ((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey || 1)))
    d = Math.min(d, Math.hypot(x - xi - t * ex, y - yi - t * ey))
  }
  return inside ? 0 : d
}
const ZOOM_OF = LINES.map((l) => {
  const n = l.xy.length / 2
  const w = new Float32Array(n)
  const band = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const x = l.xy[2 * k], y = l.xy[2 * k + 1]
    w[k] = 1 - smooth(0, ZOOM_BLEND, outsideZone(x, y))
    const r = Math.hypot(x - ZOOM_C[0], y - ZOOM_C[1])
    band[k] = Math.min(1, Math.max(0, (r - ZOOM_R0) / (ZOOM_R1 - ZOOM_R0))) * (ZOOM_BANDS - 1)
  }
  return { w, band }
})
/** Each line's points moved forward in place, for the bands' ways forward `zp` (0 → 1; band 0 is the pendant and the figure). */
function forward(i: number, zp: Float32Array, xy: Float32Array) {
  const { w, band } = ZOOM_OF[i]
  const [cx, cy] = ZOOM_C
  for (let k = 0; k < w.length; k++) {
    const f = band[k]
    const b0 = Math.floor(f)
    const b1 = Math.min(ZOOM_BANDS - 1, b0 + 1)
    const pr = zp[b0] + (zp[b1] - zp[b0]) * (f - b0)
    const p = w[k] * zp[0] + (1 - w[k]) * pr
    if (p <= 0) continue
    const sc = 1 + (ZOOM_IN - 1) * p
    xy[2 * k] = cx + (xy[2 * k] - cx) * sc
    xy[2 * k + 1] = cy + (xy[2 * k + 1] - cy) * sc - ZOOM_LIFT * p
  }
}

/** How far the breath `b` (0 out, 1 in) moves the point (x, y), into `d`: smooth everywhere, nothing at the head or the circles. */
function bend(x: number, y: number, b: number, d: number[]) {
  const t = Math.min(1, Math.max(0, (y - (NECK_Y - 15)) / 50))
  const neck = t * t * t * (t * (t * 6 - 15) + 10)
  const dx = (x - AXIS_X) / BREATH_SX
  const dy = (y - BREATH_CY) / BREATH_SY
  const g = b * neck * Math.exp(-dx * dx - dy * dy)
  d[0] = g * BREATH_X * (x - AXIS_X)
  d[1] = g * (BREATH_Y * (y - HEART[1]) - BREATH_RISE)
  return d
}

/** Line `i` bent by a breath `b` (0 out, 1 in), into `out`: every line by the same `bend`. */
const bendD = [0, 0]
function breathe(i: number, b: number, out: Float32Array) {
  const xy = LINES[i].xy
  for (let k = 0; k < xy.length; k += 2) {
    const x = xy[k]
    const y = xy[k + 1]
    if (b > 0 && y > NECK_Y - 15) {
      bend(x, y, b, bendD)
      out[k] = x + bendD[0]
      out[k + 1] = y + bendD[1]
    } else {
      out[k] = x
      out[k + 1] = y
    }
  }
  return out
}

/** How each line is drawn on a hover, and when it starts (as `SatoriCore`'s). */
const PLAN = LINES.map((l) => {
  const dist = (p: number[]) => Math.hypot(p[0] - ORIGIN[0], p[1] - ORIGIN[1])
  const ds = dist(l.start), de = dist(l.end), dm = dist(l.mid)
  let mode: Mode
  let from: number
  if (dm < Math.min(ds, de) - 20) { mode = "middle"; from = dm }
  else if (Math.abs(ds - de) < 2) { mode = "both"; from = ds }
  else { mode = ds <= de ? "start" : "end"; from = Math.min(ds, de) }
  const along = mode === "both" || mode === "middle" ? l.len / 2 : l.len
  return { mode, delay: (from / FRONT_SPEED) * 1000, duration: Math.max(DRAW_MIN_MS, (along / DRAW_SPEED) * 1000) }
})
/**
 * At rest, the figure's doubled outline ends where its outer line leaves it
 * (2026-11-14, the author's asking, with four points marked on a screenshot:
 * the outer lines went on past the figure and faded out, or were cut at the
 * zone's edge, and the drawing looked unfinished). At the shoulders the outer
 * line is the middle circle's, on the legs' slopes the great inner circle's
 * (`outline`); each is drawn at rest only from its marked end inward, sharp
 * at the end, and not through the zone's feathered mask. `REST_ENDS`: the
 * marked points, frame units, left then right, matched to the nearest point
 * of the line, so they hold as the figure breathes and comes forward.
 */
const REST_ENDS: Partial<Record<Role, [[number, number], [number, number]]>> = {
  middle: [[609, 849.4], [666, 849.4]],
  outline: [[555.7, 947.7], [719.3, 947.7]],
}
const nearestPoint = (xy: Float32Array, [x, y]: [number, number]) => {
  let best = 0
  let bd = Infinity
  for (let k = 0; k < xy.length; k += 2) {
    const d = (xy[k] - x) ** 2 + (xy[k + 1] - y) ** 2
    if (d < bd) { bd = d; best = k >> 1 }
  }
  return best
}
/**
 * The stretches drawn at rest, point indices: the middle circle (closed) from
 * its left end forward round the lines about the heart to its right end; the
 * great inner circle (open, its two ends at the shoulders) from each shoulder
 * down to its mark.
 */
const REST_SPANS: Record<number, [number, number][]> = {}
LINES.forEach((l, i) => {
  const ends = REST_ENDS[l.role]
  if (!ends) return
  const n = l.xy.length / 2
  const a = nearestPoint(l.xy, ends[0])
  const b = nearestPoint(l.xy, ends[1])
  if (l.closed) REST_SPANS[i] = a > b ? [[a, n], [0, b]] : [[a, b]]
  else REST_SPANS[i] = [[0, Math.min(a, b)], [Math.max(a, b), n - 1]]
})
/** The figure's lines at rest (the heart apart), and all but the heart on a hover. */
const REST = LINES.map((l, i) => ({ l, i })).filter(({ l }) => l.role !== "outer" && l.role !== "heart")
const HAND = LINES.map((l, i) => ({ l, i })).filter(({ l }) => l.role !== "heart")
/** When the whole hover drawing is drawn, ms, and when its first line starts. */
export const HAND_END = Math.max(...HAND.map(({ i }) => PLAN[i].delay + PLAN[i].duration))
const HAND_FIRST = Math.min(...HAND.map(({ i }) => PLAN[i].delay))
/** The hover drawing's canvas: its lines' box, with room for the breath and the middle circle's swell. */
const HAND_BOX = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const { l } of HAND) {
    for (let k = 0; k < l.xy.length; k += 2) {
      x0 = Math.min(x0, l.xy[k]); x1 = Math.max(x1, l.xy[k])
      y0 = Math.min(y0, l.xy[k + 1]); y1 = Math.max(y1, l.xy[k + 1])
    }
  }
  const pad = 8 + ZOOM_ROOM
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
})()

export function SatoriBreath() {
  const restRef = useRef<HTMLCanvasElement>(null)
  const handRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = restRef.current
    const ctx = canvas?.getContext("2d")
    const hand = handRef.current
    const hctx = hand?.getContext("2d")
    if (!canvas || !ctx || !hand || !hctx) return
    const host = canvas.parentElement

    // The figure at rest and the heart are drawn on a small canvas over the
    // zone (2026-11-12: they were an SVG under a blurred mask whose lines
    // changed every frame, which the browser blurred again every frame, slow,
    // and broke the lines here and there as they moved). The zone's feathered
    // edge is made once, at the canvas's size. The hover drawing has a canvas
    // of its own, over its whole box.
    const zone = document.createElement("canvas")
    const zoneD = new Path2D(ZONE_D)
    let scale = 1 // device pixels per frame unit, rest canvas
    let hscale = 1 // and hover canvas
    let dpr = 1
    const fit = (c: HTMLCanvasElement, box: { w: number; h: number }) => {
      const pw = Math.max(1, Math.round(c.getBoundingClientRect().width * dpr))
      const ph = Math.max(1, Math.round((pw * box.h) / box.w))
      if (c.width !== pw || c.height !== ph) {
        c.width = pw
        c.height = ph
      }
      return pw / box.w
    }
    const resize = () => {
      dpr = canvasDpr()
      scale = fit(canvas, REST_BOX)
      hscale = fit(hand, HAND_BOX)
      zone.width = canvas.width
      zone.height = canvas.height
      const z = zone.getContext("2d")
      if (!z) return
      // drawn off the canvas, only its shadow on it: a Gaussian edge (blur = 2 sigma)
      const off = REST_BOX.w + 4 * FEATHER
      z.setTransform(scale, 0, 0, scale, (-REST_BOX.x - off) * scale, -REST_BOX.y * scale)
      z.shadowColor = "#000"
      z.shadowBlur = 2 * FEATHER * scale
      z.shadowOffsetX = off * scale
      z.fillStyle = "#000"
      z.fill(zoneD)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    ro.observe(hand)
    resize()

    // the drawing's fade, grown and risen with the figure (`p`, its way forward) so the lines keep their strength
    const gradient = (c: CanvasRenderingContext2D, color: string, peak: number, p = 0) => {
      const sc = 1 + (ZOOM_IN - 1) * p
      const cy = DATA.fade.cy - ZOOM_LIFT * p
      const g = c.createRadialGradient(DATA.fade.cx, cy, 0, DATA.fade.cx, cy, DATA.fade.r * sc)
      g.addColorStop(0, `rgba(${color}, ${peak})`)
      g.addColorStop(1, `rgba(${color}, 0)`)
      return g
    }
    let fade = gradient(ctx, "198, 155, 92", DATA.fade.peak)
    let dimFade = gradient(hctx, "198, 155, 92", DATA.fade.peak * DIM)
    let lightFade = gradient(hctx, LIGHT, LIGHT_PEAK)
    let fadeP = 0
    const fadesAt = (p: number) => {
      if (p === fadeP) return
      fadeP = p
      fade = gradient(ctx, "198, 155, 92", DATA.fade.peak, p)
      dimFade = gradient(hctx, "198, 155, 92", DATA.fade.peak * DIM, p)
      lightFade = gradient(hctx, LIGHT, LIGHT_PEAK, p)
    }
    // each band's way forward (0 → 1), band 0 the pendant and the figure, and its pace
    const zp = new Float32Array(ZOOM_BANDS)
    const zv = new Float32Array(ZOOM_BANDS)
    let moved = false // any band off its rest
    const bufs = LINES.map((l) => new Float32Array(l.xy.length))
    const hbufs = LINES.map((l) => new Float32Array(l.xy.length))
    const handPts: Pts[] = LINES.map((l, i) => ({ pts: hbufs[i], n: l.xy.length / 2, closed: l.closed, total: l.len }))
    const heart = byRole("heart")
    const heartD = [0, 0]
    const restPts: Pts[] = LINES.map((l, i) => ({ pts: bufs[i], n: l.xy.length / 2, closed: l.closed, total: l.len }))

    /**
     * The figure at rest (seen `restA`) and the heart, on the canvas. While
     * the hover drawing is drawn (`ht` ms into it), the figure is left out
     * only where it has been drawn over, so it is never missing anywhere
     * (2026-11-14, the author's report: it faded out whole at once, and its
     * body and legs were gone for a moment before the drawing reached them).
     */
    const paint = (b: number, beat: number, restA: number, ht = 0) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = "source-over"
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, -REST_BOX.x * scale, -REST_BOX.y * scale)
      ctx.lineWidth = dpr / scale // one screen pixel
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.strokeStyle = fade
      // a line of the figure at rest
      const restLine = (l: (typeof LINES)[number], i: number) => {
        const xy = breathe(i, b, bufs[i])
        if (moved) forward(i, zp, xy)
        const plan = PLAN[i]
        const local = ht - plan.delay
        const spans = REST_SPANS[i]
        ctx.beginPath()
        if (local <= 0 && !spans) {
          ctx.moveTo(xy[0], xy[1])
          for (let k = 2; k < xy.length; k += 2) ctx.lineTo(xy[k], xy[k + 1])
          if (l.closed) ctx.closePath()
        } else {
          // what is drawn at rest (`REST_SPANS`), less what the hover drawing has reached
          const lp = restPts[i]
          const m = span(lp)
          const drawn = local <= 0 ? [] : drawnStretches(plan.mode as Mode, m, ease(local / plan.duration)).sort((u, v) => u[0] - v[0])
          const left: [number, number][] = []
          let from = 0
          for (const [a0, a1] of drawn) {
            if (a0 > from) left.push([from, a0])
            from = Math.max(from, a1)
          }
          if (from < m) left.push([from, m])
          for (const [a0, a1] of left) {
            for (const [s0, s1] of spans ?? [[0, m]]) {
              const u0 = Math.max(a0, s0)
              const u1 = Math.min(a1, s1)
              if (u1 > u0) stretch(ctx, lp, u0, u1)
            }
          }
        }
        ctx.stroke()
      }
      if (restA > 0.003) {
        ctx.globalAlpha = restA
        for (const { l, i } of REST) if (!REST_SPANS[i]) restLine(l, i)
        // cut to the zone, its edge feathered, moved with the figure
        ctx.save()
        const zs = 1 + (ZOOM_IN - 1) * zp[0]
        ctx.setTransform(
          zs, 0, 0, zs,
          (ZOOM_C[0] - REST_BOX.x) * scale * (1 - zs),
          ((ZOOM_C[1] - REST_BOX.y) * (1 - zs) - ZOOM_LIFT * zp[0]) * scale,
        )
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = "destination-in"
        ctx.drawImage(zone, 0, 0)
        ctx.restore()
        // the figure's doubled outline, to its marked ends (`REST_ENDS`), sharp, not through the zone
        ctx.globalAlpha = restA
        for (const { l, i } of REST) if (REST_SPANS[i]) restLine(l, i)
        ctx.globalAlpha = 1
      }
      // the heart, beating, never cut; moved by the breath with the lines round it, and forward with the figure
      const fs = 1 + (ZOOM_IN - 1) * zp[0]
      const k = (1 + HEART_GROW * beat) * fs
      ctx.globalAlpha = HEART_DIM + (1 - HEART_DIM) * beat
      bend(HEART[0], HEART[1], b, heartD)
      ctx.translate(
        ZOOM_C[0] + (HEART[0] + heartD[0] - ZOOM_C[0]) * fs,
        ZOOM_C[1] + (HEART[1] + heartD[1] - ZOOM_C[1]) * fs - ZOOM_LIFT * zp[0],
      )
      ctx.scale(k, k)
      ctx.translate(-HEART[0], -HEART[1])
      ctx.lineWidth = dpr / (scale * k)
      const h = heart.xy
      ctx.beginPath()
      ctx.moveTo(h[0], h[1])
      for (let q = 2; q < h.length; q += 2) ctx.lineTo(h[q], h[q + 1])
      ctx.closePath()
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    /**
     * The hover drawing at `ht` ms into its drawing (the same clock runs back,
     * faster, off the pendant), bent by the breath, and its lights, seen
     * `lightsA`.
     */
    const doneAt = LINES.map(() => -1)
    const gather = lights()
    const paintHand = (b: number, ht: number, lightsA: number, now: number) => {
      hctx.setTransform(1, 0, 0, 1, 0, 0)
      hctx.clearRect(0, 0, hand.width, hand.height)
      if (ht <= HAND_FIRST) return
      hctx.setTransform(hscale, 0, 0, hscale, -HAND_BOX.x * hscale, -HAND_BOX.y * hscale)
      hctx.lineWidth = dpr / hscale
      hctx.lineJoin = "round"
      hctx.lineCap = "round"
      // every line in one stroke and every light in at most 32 (see `flush`):
      // a stroke each was some 500 a frame, too many for an older phone
      hctx.strokeStyle = dimFade
      hctx.beginPath()
      for (const { i } of HAND) {
        const plan = PLAN[i]
        const local = ht - plan.delay
        if (local <= 0) {
          doneAt[i] = -1
          continue
        }
        breathe(i, b, hbufs[i])
        if (moved) forward(i, zp, hbufs[i])
        const lp = handPts[i]
        const p = ease(local / plan.duration)
        for (const [a0, a1] of drawnStretches(plan.mode as Mode, span(lp), p)) stretch(hctx, lp, a0, a1)
        if (lightsA <= 0.003) continue
        let after = 0
        if (local >= plan.duration) {
          if (doneAt[i] < 0) doneAt[i] = now
          after = (now - doneAt[i]) / 1000
        } else doneAt[i] = -1
        comets(gather, lp, plan.mode as Mode, lightWay(plan.mode as Mode, lp, p, after, LIGHT_CFG, STEP), lightsA, LIGHT_CFG, STEP)
      }
      hctx.stroke()
      hctx.strokeStyle = lightFade
      flush(hctx, gather)
    }

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(0, 0, 1)
      const still = new ResizeObserver(() => paint(0, 0, 1))
      still.observe(canvas)
      return () => {
        ro.disconnect()
        still.disconnect()
      }
    }

    let hovered = false
    let ht = 0 // ms into the hover drawing
    let lightsA = 0
    let restA = 1

    // On a hover over the pendant: the whole drawing drawn by hand.
    const photo = host?.querySelector<HTMLElement>(".sp-photo")
    const enter = (e: Event) => {
      if (startsHover(e)) hovered = true
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovered = false
    }
    photo?.addEventListener("pointerenter", enter)
    host?.addEventListener(PLAY_EVENT, enter)
    photo?.addEventListener("pointerleave", leave)

    // The pendant comes forward with the figure: its photograph grown from the
    // great circle's centre and raised (its box is set by the page, `PHOTO_BOX`).
    const photoBox = photo
      ? {
          x: (parseFloat(photo.style.left) / 100) * FRAME_W,
          y: (parseFloat(photo.style.top) / 100) * FRAME_H,
          w: (parseFloat(photo.style.width) / 100) * FRAME_W,
          h: (parseFloat(photo.style.height) / 100) * FRAME_H,
        }
      : null
    if (photo && photoBox && photoBox.w > 0 && photoBox.h > 0) {
      photo.style.transformOrigin = `${(((ZOOM_C[0] - photoBox.x) / photoBox.w) * 100).toFixed(3)}% ${(((ZOOM_C[1] - photoBox.y) / photoBox.h) * 100).toFixed(3)}%`
      // on a layer of its own from the start, and kept there: added only for
      // the movement and dropped after it, the layer put the photograph a
      // pixel or so aside as it came and went (2026-11-14, the author's report)
      photo.style.willChange = "transform"
      photo.style.transform = "translateY(0%) scale(1)"
    }
    let photoP = 0
    const placePhoto = (p: number) => {
      if (!photo || !photoBox || Math.abs(p - photoP) < 0.0002) return
      photoP = p
      if (p <= 0) {
        photo.style.transform = "translateY(0%) scale(1)"
      } else {
        const up = (ZOOM_LIFT * p * 100) / photoBox.h
        photo.style.transform = `translateY(${(-up).toFixed(3)}%) scale(${(1 + (ZOOM_IN - 1) * p).toFixed(4)})`
      }
    }
    // an intent that runs on with the hover and back off it, seconds, which
    // sends each band forward, the figure first, or back, the outermost first
    const icEnd = (ZOOM_BANDS - 1) * ZOOM_STAGGER + 0.001
    let ic = 0
    const zoom = (dt: number) => {
      ic = hovered ? Math.min(icEnd, ic + dt) : Math.max(0, ic - dt * ZOOM_BACK)
      moved = false
      for (let j = 0; j < ZOOM_BANDS; j++) {
        const target = ic > j * ZOOM_STAGGER ? 1 : 0
        let p = zp[j]
        let v = zv[j]
        if (dt > 0 && (p !== target || v !== 0)) {
          const w = target ? ZOOM_W : ZOOM_W_BACK
          // a critically damped spring, in small steps so it holds at any frame rate
          const steps = Math.max(1, Math.ceil(dt / 0.008))
          const h = dt / steps
          for (let q = 0; q < steps; q++) {
            v += (w * w * (target - p) - 2 * w * v) * h
            p += v * h
          }
          if (p < 0) { p = 0; if (v < 0) v = 0 }
          if (p > 1) { p = 1; if (v > 0) v = 0 }
          if (Math.abs(target - p) < 0.0004 && Math.abs(v) < 0.002) { p = target; v = 0 }
          zp[j] = p
          zv[j] = v
        }
        if (zp[j] > 0) moved = true
      }
      placePhoto(zp[0])
      fadesAt(zp[0])
    }

    let last = 0
    const frame = (t: number, dt: number, now: number) => {
      // the breath: in and out, calm, eased at both ends
      const b = (1 - Math.cos((2 * Math.PI * t) / BREATH_S)) / 2
      const beat = heartbeat((((t / HEART_S) % 1) + 1) % 1)
      // drawn on, or drawn back faster from wherever it has got to
      ht = hovered ? Math.min(HAND_END, ht + dt * 1000) : Math.max(0, ht - dt * 1000 * UNDRAW_RATE)
      if (!hovered && ht <= HAND_FIRST) ht = 0
      const handOn = hovered || ht > 0
      lightsA = hovered ? Math.min(1, lightsA + dt / 0.2) : Math.max(0, lightsA - dt / LIGHT_OUT_S)
      // the figure at rest dims to the hover drawing's strength (`DIM`) while it
      // is drawn, and is left out only where it has been drawn over (`paint`);
      // it comes back to its own strength once the drawing is gone
      restA = handOn
        ? Math.max(DIM, restA - ((1 - DIM) * dt * 1000) / REST_OUT_MS)
        : Math.min(1, restA + (dt * 1000) / REST_IN_MS)
      zoom(dt)
      paint(b, beat, restA, ht)
      if (handOn || hand.dataset.on) {
        paintHand(b, ht, lightsA, now)
        if (handOn) hand.dataset.on = "1"
        else delete hand.dataset.on
      }
    }

    let on = false
    let raf = 0
    const t0 = performance.now()
    const gate: Gate = { at: 0 }
    const tick = (now: number) => {
      if (skipFrame(gate, now)) {
        raf = requestAnimationFrame(tick)
        return
      }
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      frame((now - t0) / 1000, dt, now)
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) {
        on = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      } else if (!e.isIntersecting && on) {
        on = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(hand)
    paint(0, 0, 1)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      photo?.removeEventListener("pointerenter", enter)
      host?.removeEventListener(PLAY_EVENT, enter)
      photo?.removeEventListener("pointerleave", leave)
      if (photo) {
        photo.style.transform = ""
        photo.style.transformOrigin = ""
        photo.style.willChange = ""
      }
    }
  }, [])

  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: `${(b.x / FRAME_W) * 100}%`,
    top: `${(b.y / FRAME_H) * 100}%`,
    width: `${(b.w / FRAME_W) * 100}%`,
    aspectRatio: `${b.w} / ${b.h}`,
    pointerEvents: "none" as const,
  })
  return (
    <>
      {/* The hover drawing and its lights. */}
      <canvas ref={handRef} aria-hidden style={box(HAND_BOX)} />
      {/* The figure at rest and its heart. */}
      <canvas ref={restRef} aria-hidden style={box(REST_BOX)} />
    </>
  )
}
