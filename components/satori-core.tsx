"use client"

import { useEffect, useRef } from "react"
import CORE_3 from "@/lib/satori-core-3.json"
import CORE_4 from "@/lib/satori-core-4.json"
import { UNDRAWN_EVENT } from "@/components/satori-sun"
import { comets, ease, lightWay, samplePath, type LightCfg, type Pts } from "@/lib/satori-lights"

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
 * its length, its two ends and its middle, in the frame's units. Each is drawn through
 * its dash (pathLength 1), one screen pixel wide like the drawings' lines,
 * with flat ends, so a dash of no length draws nothing.
 */

const FRAME_W = 1275
const FRAME_H = 1380
const GOLD = "#C69B5C"

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
const EASE = "cubic-bezier(.3,0,.2,1)"
/** Drawn back this many times faster than it was drawn. */
const UNDRAW_RATE = 1.6
/**
 * A drawn dash is this much longer than its line (in `pathLength` 1): the
 * browser's own measure of a path can come out a hair longer than the one it
 * scales the dash by, which left a gap at a line's far end.
 */
const OVER = 0.02

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
const LIGHT_OUT_S = 0.35

type Mode = "start" | "end" | "both" | "middle"

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

/** A line's dash, hidden (0) to drawn (1). */
function dash(mode: Mode, drawn: 0 | 1): Keyframe {
  const one = 1 + OVER
  switch (mode) {
    case "start":
      return { strokeDasharray: `${one} 2`, strokeDashoffset: drawn ? "0" : `${one}` }
    case "end":
      return { strokeDasharray: `${one} 2`, strokeDashoffset: drawn ? "0" : "-1" }
    case "both":
      // u from each end, the gap between: "u (1 - 2u)" repeats from the far end.
      return { strokeDasharray: drawn ? "0.5 0" : "0 1", strokeDashoffset: "0" }
    case "middle":
      // A gap of (0.5 - u), then 2u drawn about the middle.
      return { strokeDasharray: drawn ? `0 0 ${one} 2` : "0 0.5 0 2", strokeDashoffset: "0" }
  }
}

export function SatoriCore({ slug }: { slug: Slug }) {
  const { core: CORE, dim, lights: withLights } = DRAWINGS[slug]
  const PLAN = PLANS[slug]
  const host = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const lightsRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = host.current
    const svg = svgRef.current
    if (!el || !svg) return
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"))

    // One screen pixel wide, however large the frame is drawn.
    const hairline = () => {
      const w = el.clientWidth
      if (w > 0) svg.style.strokeWidth = String(FRAME_W / w)
    }
    const ro = new ResizeObserver(hairline)
    ro.observe(el)
    hairline()

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paths.forEach((p) => (p.style.strokeDasharray = "none"))
      svg.style.opacity = String(dim)
      return () => ro.disconnect()
    }

    const photo = el.parentElement?.querySelector<HTMLElement>(".sp-photo")
    if (!photo) return () => ro.disconnect()

    const lights = withLights ? runLights(lightsRef.current, CORE, PLAN) : null

    let anims: Animation[] | null = null
    let gone = 0
    const frame = el.parentElement
    const enter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      window.clearTimeout(gone)
      if (!anims) {
        svg.style.opacity = String(dim)
        anims = paths.map((p, i) =>
          p.animate([dash(PLAN[i].mode, 0), dash(PLAN[i].mode, 1)], {
            delay: PLAN[i].delay,
            duration: PLAN[i].duration,
            easing: EASE,
            fill: "both",
          }),
        )
        lights?.start(anims)
        return
      }
      anims.forEach((a) => {
        a.playbackRate = 1
        a.play()
      })
      lights?.start(anims)
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !anims) return
      lights?.stop()
      // How long until the last line has gone: each is drawn back from where
      // it has got to, all at once, before running back through its delay.
      let left = 0
      anims.forEach((a, i) => {
        left = Math.max(left, (Number(a.currentTime) || 0) - PLAN[i].delay)
        a.playbackRate = -UNDRAW_RATE
        a.play()
      })
      gone = window.setTimeout(() => frame?.dispatchEvent(new Event(UNDRAWN_EVENT)), left / UNDRAW_RATE)
    }
    photo.addEventListener("pointerenter", enter)
    photo.addEventListener("pointerleave", leave)
    return () => {
      ro.disconnect()
      window.clearTimeout(gone)
      lights?.dispose()
      photo.removeEventListener("pointerenter", enter)
      photo.removeEventListener("pointerleave", leave)
      anims?.forEach((a) => a.cancel())
    }
  }, [PLAN, dim, withLights])

  return (
    <div ref={host} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
        fill="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 }}
      >
        <defs>
          <radialGradient
            id={`satori-core-fade-${slug}`}
            gradientUnits="userSpaceOnUse"
            cx={CORE.fade.cx}
            cy={CORE.fade.cy}
            r={CORE.fade.r}
          >
            <stop stopColor={GOLD} stopOpacity={CORE.fade.peak} />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g stroke={`url(#satori-core-fade-${slug})`} strokeLinecap="butt" strokeLinejoin="round">
          {CORE.lines.map((l, i) => (
            <path
              key={i}
              d={l.d}
              pathLength={1}
              style={{
                strokeDasharray: dash(PLAN[i].mode, 0).strokeDasharray as string,
                strokeDashoffset: dash(PLAN[i].mode, 0).strokeDashoffset as string,
              }}
            />
          ))}
        </g>
      </svg>
      {withLights && <canvas ref={lightsRef} style={{ position: "absolute", pointerEvents: "none" }} />}
    </div>
  )
}

/**
 * The lights along a drawing's lines (`LIGHT_*`), on `canvas` over the
 * drawing's box: drawn only while the pendant is hovered and as they fade out
 * after. Each line's drawing is read from its animation, so the lights ride it.
 */
function runLights(canvas: HTMLCanvasElement | null, core: Core, PLAN: ReturnType<typeof plan>) {
  const ctx = canvas?.getContext("2d")
  if (!canvas || !ctx) return null
  const lines: (Pts | null)[] = core.lines.map((l) => (l.len >= LIGHT_MIN ? samplePath(l.d, LIGHT_STEP) : null))
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const l of lines) {
    if (!l) continue
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
  const fade = ctx.createRadialGradient(core.fade.cx, core.fade.cy, 0, core.fade.cx, core.fade.cy, core.fade.r)
  fade.addColorStop(0, `rgba(${LIGHT}, ${LIGHT_PEAK})`)
  fade.addColorStop(1, `rgba(${LIGHT}, 0)`)
  let scale = 1
  let dpr = 1
  const size = () => {
    const cssW = canvas.getBoundingClientRect().width
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round((w * box.h) / box.w))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    scale = w / box.w
  }

  let anims: Animation[] = []
  let on = false
  let shown = 0
  let last = 0
  let raf = 0
  /** When each line finished being drawn (performance.now), or -1. */
  const doneAt = lines.map(() => -1)
  const draw = (now: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (shown < 0.003) return
    ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale)
    ctx.lineWidth = dpr / scale // one screen pixel
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.strokeStyle = fade
    lines.forEach((l, i) => {
      const a = anims[i]
      if (!l || !a) return
      const local = (Number(a.currentTime) || 0) - PLAN[i].delay
      if (local <= 0) return
      let p = 1
      let after = 0
      if (local < PLAN[i].duration) {
        p = ease(local / PLAN[i].duration)
        doneAt[i] = -1
      } else {
        if (doneAt[i] < 0) doneAt[i] = now
        after = (now - doneAt[i]) / 1000
      }
      comets(ctx, l, PLAN[i].mode, lightWay(PLAN[i].mode, l, p, after, LIGHT_CFG, LIGHT_STEP), shown, LIGHT_CFG, LIGHT_STEP)
    })
    ctx.globalAlpha = 1
  }
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    shown = on ? Math.min(1, shown + dt / 0.2) : Math.max(0, shown - dt / LIGHT_OUT_S)
    draw(now)
    raf = !on && shown <= 0 ? 0 : requestAnimationFrame(tick)
  }
  const ro = new ResizeObserver(size)
  ro.observe(canvas)
  return {
    start(a: Animation[]) {
      anims = a
      size()
      on = true
      doneAt.fill(-1)
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    },
    stop() {
      on = false
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
    },
  }
}
