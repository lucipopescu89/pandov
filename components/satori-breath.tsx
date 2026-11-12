"use client"

import { useEffect, useRef } from "react"
import DATA from "@/lib/satori-breath-1.json"
import { HEART_S, heartbeat } from "@/lib/heartbeat"
import { PLAY_EVENT, startsHover } from "@/components/satori-sun"
import { comets, drawnStretches, ease, lightWay, span, stretch, type LightCfg, type Mode, type Pts } from "@/lib/satori-lights"

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
 * breathes, calmly, slower than the heart (`BREATH_S`): the two lines round
 * the heart open and close about it (`AROUND_HEART`), the chest widens and the
 * shoulders rise a little on the breath in (`CHEST`, `RISE`), the crossed legs
 * barely move, and the head, the pendant, does not move at all: nothing above
 * `NECK_Y` is bent.
 *
 * **On a hover over the pendant** the whole drawing is drawn by hand, as
 * Satori 3's and 4's are (`components/satori-core.tsx`, Making's speeds and
 * easing), from the pendant outward, the figure at rest fading while it is;
 * the middle circle, drawn whole, breathes too (`MIDDLE`). It is dimmed and
 * traced by lights as Satori 3's is (`DIM`, `LIGHT_*`). Off it, it is drawn
 * back, and the figure alone comes back.
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
/** The lines round the heart open about it by this share at the full breath, within about this far of it. */
const AROUND_HEART = 0.14
const AROUND_R = 38
/** The chest widens by this share, and the shoulders rise this far (frame units), at the full breath. */
const CHEST = 0.05
const RISE = 1.8
/** Nothing above this is bent: the head, the pendant, stays still. */
const NECK_Y = 852
/** On a hover, the middle circle swells by this share at the full breath (0.025 until 2026-11-12: the author asked for it far more visible). */
const MIDDLE = 0.09

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
/** The canvas the figure at rest is drawn on: the zone's box with room for its feathered edge, in frame units. */
const REST_BOX = (() => {
  const w = Math.max(...ZONE_HALF.map(([x]) => x)) + 4 * FEATHER + 6
  const ys = ZONE_HALF.map(([, y]) => y)
  const y0 = Math.min(...ys) - 4 * FEATHER - 6
  const y1 = Math.max(...ys) + 4 * FEATHER + 6
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
/** The middle circle's centre: halfway down from its top on the axis, by its width. */
const MIDDLE_C = (() => {
  const m = byRole("middle").xy
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity
  for (let i = 0; i < m.length; i += 2) { x0 = Math.min(x0, m[i]); x1 = Math.max(x1, m[i]); y0 = Math.min(y0, m[i + 1]) }
  return [(x0 + x1) / 2, y0 + (x1 - x0) / 2] as const
})()
const MIDDLE_R = (() => {
  const m = byRole("middle").xy
  let x0 = Infinity, x1 = -Infinity
  for (let i = 0; i < m.length; i += 2) { x0 = Math.min(x0, m[i]); x1 = Math.max(x1, m[i]) }
  return (x1 - x0) / 2
})()

/** The figure bent by a breath `b` (0 out, 1 in), into `out`. */
function breathe(l: (typeof LINES)[number], b: number, hovered: boolean, out: Float32Array) {
  const xy = l.xy
  for (let i = 0; i < xy.length; i += 2) {
    let x = xy[i]
    let y = xy[i + 1]
    if (l.role !== "outer" && y > NECK_Y) {
      // the lines round the heart open about it
      const hx = x - HEART[0]
      const hy = y - HEART[1]
      const near = Math.exp(-((hx * hx + hy * hy) / (AROUND_R * AROUND_R)))
      const open = AROUND_HEART * b * near
      // the chest widens and the shoulders rise; the legs barely, the neck not at all
      const chest = smooth(NECK_Y, 880, y) * (1 - smooth(930, 985, y))
      const rise = smooth(NECK_Y, 880, y) * (1 - smooth(940, 990, y))
      x += hx * open + (x - AXIS_X) * CHEST * b * chest
      y += hy * open - RISE * b * rise
    }
    if (hovered && l.role === "middle") {
      // the middle circle, drawn whole, breathes about its centre
      const cx = xy[i] - MIDDLE_C[0]
      const cy = xy[i + 1] - MIDDLE_C[1]
      const w = smooth(MIDDLE_R - 30, MIDDLE_R - 5, Math.hypot(cx, cy))
      x += cx * MIDDLE * b * w
      y += cy * MIDDLE * b * w
    }
    out[i] = x
    out[i + 1] = y
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
  const pad = MIDDLE_R * MIDDLE + 8
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
      dpr = Math.min(window.devicePixelRatio || 1, 2)
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

    const gradient = (c: CanvasRenderingContext2D, color: string, peak: number) => {
      const g = c.createRadialGradient(DATA.fade.cx, DATA.fade.cy, 0, DATA.fade.cx, DATA.fade.cy, DATA.fade.r)
      g.addColorStop(0, `rgba(${color}, ${peak})`)
      g.addColorStop(1, `rgba(${color}, 0)`)
      return g
    }
    const fade = gradient(ctx, "198, 155, 92", DATA.fade.peak)
    const dimFade = gradient(hctx, "198, 155, 92", DATA.fade.peak * DIM)
    const lightFade = gradient(hctx, LIGHT, LIGHT_PEAK)
    const bufs = LINES.map((l) => new Float32Array(l.xy.length))
    const hbufs = LINES.map((l) => new Float32Array(l.xy.length))
    const handPts: Pts[] = LINES.map((l, i) => ({ pts: hbufs[i], n: l.xy.length / 2, closed: l.closed, total: l.len }))
    const heart = byRole("heart")

    /** The figure at rest (seen `restA`) and the heart, on the canvas. */
    const paint = (b: number, beat: number, restA: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = "source-over"
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, -REST_BOX.x * scale, -REST_BOX.y * scale)
      ctx.lineWidth = dpr / scale // one screen pixel
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.strokeStyle = fade
      if (restA > 0.003) {
        ctx.globalAlpha = restA
        for (const { l, i } of REST) {
          const xy = breathe(l, b, false, bufs[i])
          ctx.beginPath()
          ctx.moveTo(xy[0], xy[1])
          for (let k = 2; k < xy.length; k += 2) ctx.lineTo(xy[k], xy[k + 1])
          if (l.closed) ctx.closePath()
          ctx.stroke()
        }
        // cut to the zone, its edge feathered
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = "destination-in"
        ctx.drawImage(zone, 0, 0)
        ctx.restore()
      }
      // the heart, beating, never cut
      const k = 1 + HEART_GROW * beat
      ctx.globalAlpha = HEART_DIM + (1 - HEART_DIM) * beat
      ctx.translate(HEART[0], HEART[1])
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
    const paintHand = (b: number, ht: number, lightsA: number, now: number) => {
      hctx.setTransform(1, 0, 0, 1, 0, 0)
      hctx.clearRect(0, 0, hand.width, hand.height)
      if (ht <= HAND_FIRST) return
      hctx.setTransform(hscale, 0, 0, hscale, -HAND_BOX.x * hscale, -HAND_BOX.y * hscale)
      hctx.lineWidth = dpr / hscale
      hctx.lineJoin = "round"
      hctx.lineCap = "round"
      for (const { l, i } of HAND) {
        const plan = PLAN[i]
        const local = ht - plan.delay
        if (local <= 0) {
          doneAt[i] = -1
          continue
        }
        breathe(l, b, true, hbufs[i])
        const lp = handPts[i]
        const p = ease(local / plan.duration)
        hctx.strokeStyle = dimFade
        hctx.beginPath()
        for (const [a0, a1] of drawnStretches(plan.mode as Mode, span(lp), p)) stretch(hctx, lp, a0, a1)
        hctx.stroke()
        if (lightsA <= 0.003) continue
        let after = 0
        if (local >= plan.duration) {
          if (doneAt[i] < 0) doneAt[i] = now
          after = (now - doneAt[i]) / 1000
        } else doneAt[i] = -1
        hctx.strokeStyle = lightFade
        comets(hctx, lp, plan.mode as Mode, lightWay(plan.mode as Mode, lp, p, after, LIGHT_CFG, STEP), lightsA, LIGHT_CFG, STEP)
      }
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
      // the figure at rest fades as it is drawn, and comes back once it is gone
      restA = handOn
        ? Math.max(0, restA - (dt * 1000) / REST_OUT_MS)
        : Math.min(1, restA + (dt * 1000) / REST_IN_MS)
      paint(b, beat, restA)
      if (handOn || hand.dataset.on) {
        paintHand(b, ht, lightsA, now)
        if (handOn) hand.dataset.on = "1"
        else delete hand.dataset.on
      }
    }

    let on = false
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
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
