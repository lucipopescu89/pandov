"use client"

import { useEffect, useRef } from "react"
import CORE_3 from "@/lib/satori-core-3.json"
import CORE_4 from "@/lib/satori-core-4.json"
import { PLAY_EVENT, UNDRAWN_EVENT, startsHover } from "@/components/satori-sun"
import {
  canvasDpr,
  comets,
  drawnStretches,
  ease,
  flush,
  isLite,
  lights,
  lightWay,
  samplePath,
  span,
  stretch,
  type LightCfg,
  type Mode,
  type Pts,
} from "@/lib/satori-lights"

/**
 * The author's drawing, hidden at rest and drawn by hand on a hover over the
 * pendant, for Satori 4 and, since the same day, Satori 3 (`slug`; for
 * Satori 3 the whole drawing, which at rest gives way to circles closing on
 * the pendant, `SatoriFlow`, and fades out on the hover while this is drawn:
 * `UNDRAWN_EVENT` brings it back).
 *
 * Satori 4's inner drawing, its circles and the figure sitting in meditation
 * (2026-11-12, the author's brief). The sun's rays outside go on as ever
 * (`SatoriSun`); inside them:
 *
 * - **At rest the drawing is hidden**, and in its place concentric circles
 *   radiate from the pendant (drawn by `SatoriSun` on its canvas since
 *   2026-11-12; they were Presence's `RadiantRings` here). On a hover the
 *   sun's outer lines turn to a solar storm (`SatoriSun`).
 * - **On a hover over the pendant the drawing is drawn by hand**, as Making's
 *   figures are breathed out of the tulnic (`components/making-drawing.tsx`,
 *   whose speeds and easing these are): from the pendant outward, each line
 *   starting at its point nearest the pendant, the further that is the later
 *   it starts (`FRONT_SPEED`), and drawn at `DRAW_SPEED`. A line whose two
 *   ends lie alike on either side of the axis (the figure's outline, the
 *   circles, which open at the figure's shoulders) is drawn from both ends at
 *   once, to meet in its middle; one whose middle is well nearer the pendant
 *   than its ends (the outermost circle, open at the top) from its middle out
 *   to both ends; the small strokes from their nearer end. The radiating circles fade away while it is drawn.
 *   It is drawn dimmer (`dim`), and lights trace its lines as they are drawn
 *   and then run along them (`LIGHT_*`, 2026-11-12).
 * - **Off the pendant it is drawn back** into where it came from, a little
 *   faster (`UNDRAW_RATE`), from wherever it had got to, and the circles come
 *   back. Once it is gone it tells the frame (`UNDRAWN_EVENT`): Satori 4's
 *   storm only then calms, Satori 3's closing circles only then come back.
 *
 * A touch screen has no hover: there the circles radiate and the drawing
 * stays hidden (a tap is the frame's link). Under reduced motion the drawing
 * is shown whole and still, and nothing radiates.
 *
 * The lines are `lib/satori-core-<n>.json`, written by
 * `scripts/satori-drawings.py` with the rest of the drawings: each path's d,
 * its length, its two ends and its middle, in the frame's units. They are
 * measured into points (`samplePath`) and drawn on a canvas over the
 * drawing's box, each as the stretches its drawing has reached
 * (`drawnStretches`), one screen pixel wide like the drawings' lines (until
 * 2026-11-12 an SVG drawn through its dashes, repainted whole every frame,
 * which stuttered on the author's iPhone 8). On a phone (`isLite`) the canvas
 * draws at most 1.5 device pixels to a CSS pixel and only the long lines
 * carry lights.
 */

const FRAME_W = 1275
const FRAME_H = 1380

type Core = typeof CORE_4
/**
 * Each drawing, and the pendant's middle it is drawn out from: the middle of
 * its photograph (`PHOTO_BOX`) on the axis.
 *
 * `dim`: how strong the drawing is drawn on a hover, a share of the drawings'
 * gold, with `lights` tracing its lines over it (2026-11-12, the author's
 * asking: Satori 3 at 0.55, then a little less; Satori 4 the same since the
 * same afternoon).
 */
const DRAWINGS = {
  "satori-3": { core: CORE_3 as Core, origin: [637.5, 785.35], dim: 0.45, lights: true },
  "satori-4": { core: CORE_4, origin: [637.5, 765.3], dim: 0.45, lights: true },
} as const
type Slug = keyof typeof DRAWINGS

/** Making's birth: how fast the start of the drawing travels out from the pendant, and each line is drawn, units a second. */
const FRONT_SPEED = 520
const DRAW_SPEED = 400
const DRAW_MIN_MS = 500
/** Drawn back this many times faster than it was drawn. */
const UNDRAW_RATE = 1.6
/**
 * The lights over the hover drawing (2026-11-12, the author's brief: its
 * outline traced, more accented, like the light round Satori 2's line of
 * pulses): each line's lights start with its drawing and ride its front as it
 * is drawn, so the drawing is traced as it appears (the author's asking, the
 * same afternoon: at first they began once it was drawn), then run on along
 * it (`lib/satori-lights.ts`). Brighter than the dimmed drawing (`LIGHT_PEAK`,
 * faded towards the edge like the drawing); lines shorter than `LIGHT_MIN`
 * have none. They go out on leaving the pendant.
 */
const LIGHT = "214, 172, 106"
const LIGHT_PEAK = 0.85
const LIGHT_CFG: LightCfg = { trail: 320, front: 30, piece: 6, speed: 115 }
const LIGHT_STEP = 2
const LIGHT_MIN = 120
/** On a phone only the long lines carry lights (`isLite`). */
const LIGHT_MIN_LITE = 400
/** The drawing's lines are measured into points this far apart, frame units. */
const STEP = 2
const LIGHT_OUT_S = 0.35

/** How each line is drawn, and when it starts. */
const plan = (core: Core, origin: readonly number[]) => core.lines.map((l) => {
  const dist = (p: number[]) => Math.hypot(p[0] - origin[0], p[1] - origin[1])
  const ds = dist(l.start)
  const de = dist(l.end)
  const dm = dist(l.mid)
  let mode: Mode
  let from: number
  if (dm < Math.min(ds, de) - 20) {
    // Its middle well nearer the pendant than its ends (the outermost circle,
    // open at the top; the lap's lowest line): from the middle out to both ends.
    mode = "middle"
    from = dm
  } else if (Math.abs(ds - de) < 2) {
    // Its ends alike on either side of the axis: from both ends to meet in the middle.
    mode = "both"
    from = ds
  } else {
    mode = ds <= de ? "start" : "end"
    from = Math.min(ds, de)
  }
  const along = mode === "both" || mode === "middle" ? l.len / 2 : l.len
  return {
    mode,
    delay: (from / FRONT_SPEED) * 1000,
    duration: Math.max(DRAW_MIN_MS, (along / DRAW_SPEED) * 1000),
  }
})
const PLANS = Object.fromEntries(
  Object.entries(DRAWINGS).map(([slug, d]) => [slug, plan(d.core, d.origin)]),
) as Record<Slug, ReturnType<typeof plan>>
/** When each drawing is whole on a hover, ms: its last line's end (for `SatoriTap`, which waits for it on a phone). */
export const DRAWN_MS = Object.fromEntries(
  Object.entries(PLANS).map(([slug, p]) => [slug, Math.max(...p.map((l) => l.delay + l.duration))]),
) as Record<Slug, number>

export function SatoriCore({ slug }: { slug: Slug }) {
  const { core: CORE, dim, lights: withLights } = DRAWINGS[slug]
  const PLAN = PLANS[slug]
  const host = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = host.current
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!el || !canvas || !ctx) return
    const lite = isLite()

    // The drawing on a canvas over its box (since 2026-11-12: drawn through
    // SVG dashes, the whole frame-sized SVG was painted again every frame
    // while it was drawn, which an iPhone 8 could not keep up with).
    const lines: Pts[] = CORE.lines.map((l) => samplePath(l.d, STEP))
    const lit = CORE.lines.map((l) => withLights && l.len >= (lite ? LIGHT_MIN_LITE : LIGHT_MIN))
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const l of lines) {
      for (let k = 0; k < l.n; k++) {
        x0 = Math.min(x0, l.pts[2 * k]); x1 = Math.max(x1, l.pts[2 * k])
        y0 = Math.min(y0, l.pts[2 * k + 1]); y1 = Math.max(y1, l.pts[2 * k + 1])
      }
    }
    const pad = 4
    const box = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
    canvas.style.left = `${(box.x / FRAME_W) * 100}%`
    canvas.style.top = `${(box.y / FRAME_H) * 100}%`
    canvas.style.width = `${(box.w / FRAME_W) * 100}%`
    canvas.style.aspectRatio = `${box.w} / ${box.h}`

    const gradient = (color: string, peak: number) => {
      const g = ctx.createRadialGradient(CORE.fade.cx, CORE.fade.cy, 0, CORE.fade.cx, CORE.fade.cy, CORE.fade.r)
      g.addColorStop(0, `rgba(${color}, ${peak})`)
      g.addColorStop(1, `rgba(${color}, 0)`)
      return g
    }
    const lineFade = gradient("198, 155, 92", CORE.fade.peak * dim)
    const lightFade = gradient(LIGHT, LIGHT_PEAK)

    let scale = 1
    let dpr = 1
    const size = () => {
      dpr = canvasDpr()
      const w = Math.max(1, Math.round(canvas.getBoundingClientRect().width * dpr))
      const h = Math.max(1, Math.round((w * box.h) / box.w))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      scale = w / box.w
    }
    size()

    /**
     * Each line's own clock, ms, as its animation's was: forward while the
     * pendant is hovered, through its delay and its drawing; back off it,
     * from wherever it has got to, `UNDRAW_RATE` times faster, all at once.
     */
    const clock = PLAN.map(() => 0)
    /** How long each line has been whole, s, for its lights to run on. */
    const whole = PLAN.map(() => 0)
    let hovered = false
    let shown = 0 // the lights, 0 → 1

    const gather = lights()
    const draw = (all = false) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale)
      ctx.lineWidth = dpr / scale // one screen pixel
      ctx.lineJoin = "round"
      ctx.lineCap = "butt"
      ctx.strokeStyle = lineFade
      ctx.beginPath()
      const ps = PLAN.map((pl, i) => (all ? 1 : ease((clock[i] - pl.delay) / pl.duration)))
      lines.forEach((l, i) => {
        if (ps[i] <= 0) return
        for (const [a, b] of drawnStretches(PLAN[i].mode as Mode, span(l), ps[i])) stretch(ctx, l, a, b)
      })
      ctx.stroke()
      if (shown < 0.003 || all) return
      ctx.lineCap = "round"
      ctx.strokeStyle = lightFade
      lines.forEach((l, i) => {
        if (!lit[i] || ps[i] <= 0) return
        comets(gather, l, PLAN[i].mode as Mode, lightWay(PLAN[i].mode as Mode, l, ps[i], whole[i], LIGHT_CFG, STEP), shown, LIGHT_CFG, STEP)
      })
      flush(ctx, gather)
    }

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(true)
      const ro = new ResizeObserver(() => {
        size()
        draw(true)
      })
      ro.observe(canvas)
      return () => ro.disconnect()
    }

    const frame = el.parentElement
    const photo = frame?.querySelector<HTMLElement>(".sp-photo")
    if (!photo) return

    let raf = 0
    let last = 0
    let drawn = false // something is drawn, or being drawn back
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      let any = false
      PLAN.forEach((pl, i) => {
        const end = pl.delay + pl.duration
        if (hovered) {
          clock[i] = Math.min(end, clock[i] + dt * 1000)
          whole[i] = clock[i] >= end ? whole[i] + dt : 0
        } else {
          clock[i] = Math.max(0, clock[i] - dt * 1000 * UNDRAW_RATE)
        }
        if (clock[i] > pl.delay) any = true
      })
      shown = hovered ? Math.min(1, shown + dt / 0.2) : Math.max(0, shown - dt / LIGHT_OUT_S)
      draw()
      if (!hovered && !any) {
        // drawn back: the sun calms, Satori 3's circles come back
        clock.fill(0)
        if (drawn) frame?.dispatchEvent(new Event(UNDRAWN_EVENT))
        drawn = false
        raf = 0
        return
      }
      drawn = drawn || any
      raf = requestAnimationFrame(tick)
    }
    const run = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const enter = (e: Event) => {
      if (!startsHover(e)) return
      hovered = true
      run()
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      hovered = false
      run()
    }
    const ro = new ResizeObserver(() => {
      size()
      if (!raf) draw()
    })
    ro.observe(canvas)
    photo.addEventListener("pointerenter", enter)
    frame?.addEventListener(PLAY_EVENT, enter)
    photo.addEventListener("pointerleave", leave)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      photo.removeEventListener("pointerenter", enter)
      frame?.removeEventListener(PLAY_EVENT, enter)
      photo.removeEventListener("pointerleave", leave)
    }
  }, [CORE, PLAN, dim, withLights])

  return (
    <div ref={host} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <canvas ref={ref} style={{ position: "absolute", pointerEvents: "none" }} />
    </div>
  )
}
