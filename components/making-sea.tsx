"use client"

import { useEffect, useRef } from "react"
import SCENE from "@/lib/making-scene.json"
import { simplex3 } from "@/lib/simplex"
import { canvasDpr, isLite, skipFrame, type Gate } from "@/lib/satori-lights"

/**
 * The sea of drawings in the homepage's Making section (2026-11-17, the
 * author's brief: "animate them as the waves of a calm sea; probably as the
 * sun's rays on Satori 4, so the lines never cross and one is seen behind the
 * other").
 *
 * The five lines are the author's five greys, lightest and furthest first
 * (`SCENE.sea`, by `scripts/making-split.py`), **laid flat** (the same day,
 * the author's third brief: the lines' own drawn bumps stood always raised
 * under the waves, "not natural for a sea"): each a straight line, the back
 * one where the author's back line lies on average and the front one where
 * the front one does, the three between at gaps that grow towards the front,
 * each `GAP_GROWTH` times the one behind it, as a sea's do in perspective.
 * On them, since the author's asking later the same day ("much faster: now
 * the movement is not even perceived; the front line more aggressive, the
 * back ones progressively calmer, to simulate the depth of the perspective"):
 *
 * - **Waves run along every line from right to left**, each line with its own
 *   (`SWELL`, `RIPPLE`), graded by depth: the front line's are the largest,
 *   longest and fastest, each line behind smaller, shorter and slower, the
 *   back line's calm (`depth`; the `_BACK` and `_FRONT` of each). The first
 *   version, one slow swell of 2 units drifting 15 units a second, was not
 *   seen to move at all.
 * - **A nearer line hides what lies behind it**: where a wave of it rises
 *   past a line further back, that line goes behind its crest (the canvas is
 *   cleared under each line before it is drawn, back to front), so the lines
 *   never cross and one is seen behind the other. (The first version pushed
 *   each line down under the one behind it, as Satori 4's rays push outward;
 *   with waves this large the front line lay flattened against the next.)
 * - **A click sends a big wave** across the whole sea from right to left
 *   (`BIG_*`): a crest, tallest on the front line and lower on each further
 *   one, reaching the back lines a little later, with a shallow trough
 *   behind it. It is the section's click, which also sends the motes up the
 *   trunk and raises the sun's storm; up to `BIG_MAX` at once.
 *
 * They lie behind the trunk and the plank (the trunk photograph is cut out, so
 * the lines pass behind it) and in front of the sun's white. The canvas runs
 * the whole width of the screen, the lines being flat, so on a very wide
 * screen the sea goes on past the frame's ends as it is within it. It runs
 * only while on screen, and is still
 * under reduced motion. On a phone the section is the older phone frame, with
 * no sea: the canvas is not shown there.
 */

const FW = SCENE.frame.w
const FH = SCENE.frame.h
const SEA = SCENE.sea
/** The band the canvas covers, frame units: from above the highest a line can rise to under the plank's top (which hides the rest). */
const TOP = 1296
const BOTTOM = 1362

/**
 * Each line's waves, from the back line to the front one (`depth` 0 → 1, eased
 * by `DEPTH_CURVE`, so the front lines pull away from the rest): how tall
 * (units up and down), how long (units a noise cell spans across) and how
 * fast they run to the left (units a second).
 */
const SWELL_BACK = { amp: 0.9, len: 120, speed: 20 }
const SWELL_FRONT = { amp: 6, len: 340, speed: 95 }
const RIPPLE_BACK = { amp: 0.35, len: 45, speed: 28 }
const RIPPLE_FRONT = { amp: 2.2, len: 120, speed: 150 }
const DEPTH_CURVE = 1.6
/** How fast each line's waves change shape as they go (noise time, a second). */
const CHURN_BACK = 0.08
const CHURN_FRONT = 0.35

/**
 * The click's big wave: how tall its crest is on the front line and on the
 * back one (units), how wide (units, a half-width), how long it takes to cross
 * the screen (s), how much later it reaches each line further back (s), and
 * how deep the trough behind it is (a share of the crest).
 */
const BIG_FRONT = 16
const BIG_BACK = 3.5
const BIG_WIDTH_FRONT = 85
const BIG_WIDTH_BACK = 50
const BIG_CROSS_S = 3.2
const BIG_LAG_S = 0.12
const BIG_TROUGH = 0.3
const BIG_MAX = 3

/**
 * Each gap between two lines is this many times the one behind it, so the
 * lines close up towards the horizon, as a sea's do in perspective.
 */
const GAP_GROWTH = 1.45
/**
 * The flat lines' heights: the back one where the author's lies on average
 * (1318.0), the front one high enough that its waves stay clear of the
 * plank's top, which would hide them (the author's front line lies at 1337.2
 * on average; there, flat, it went behind the plank at every trough), the
 * rest between at growing gaps (about 1318.0, 1319.9, 1322.6, 1326.6, 1332.4).
 */
const LINES = (() => {
  const n = SEA.lines.length
  const back = SEA.lines[0].y
  const front = Math.min(SEA.lines[n - 1].y, SCENE.plank.top - (SWELL_FRONT.amp + RIPPLE_FRONT.amp) - 3)
  const sum = Array.from({ length: n - 1 }, (_, i) => Math.pow(GAP_GROWTH, i)).reduce((a, b) => a + b, 0)
  let at = back
  return SEA.lines.map((l, i) => {
    if (i) at += ((front - back) * Math.pow(GAP_GROWTH, i - 1)) / sum
    return { rgb: l.colour, y: at }
  })
})()
/** Points along a line, frame units apart. */
const DRAW_STEP = 4
const MAX_PX = 3200

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const sech2 = (u: number) => {
  const c = Math.cosh(u)
  return 1 / (c * c)
}

export function MakingSea({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // The canvas spans the screen's width; the frame is the composition box,
    // its parent, whose width is the frame's 1893 units.
    let k = 1 // CSS px per frame unit
    let dpr = 1
    let xFrom = 0 // the canvas's left edge, frame units
    let xTo = FW
    let n = 0
    let ys: Float32Array[] = []
    const size = () => {
      const box = canvas.parentElement?.getBoundingClientRect()
      const r = canvas.getBoundingClientRect()
      if (!box || !box.width || !r.width) return
      k = box.width / FW
      dpr = Math.min(canvasDpr(), isLite() ? 1.5 : 2)
      const pxW = Math.min(MAX_PX, Math.round(r.width * dpr))
      dpr = pxW / r.width
      const pxH = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW
        canvas.height = pxH
      }
      xFrom = (r.left - box.left) / k
      xTo = (r.right - box.left) / k
      n = Math.ceil((xTo - xFrom) / DRAW_STEP) + 1
      ys = LINES.map(() => new Float32Array(n))
    }
    size()

    /** The click's big waves: when each was sent (s, the sea's own time). */
    const big: number[] = []

    const draw = (t: number | null) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!n) return
      // frame units to the canvas's pixels
      const s = k * dpr
      ctx.setTransform(s, 0, 0, s, -xFrom * s, -TOP * s)
      ctx.lineWidth = Math.max(1, 0.8 / k)
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      // the big waves still crossing, and where their crests are (frame units)
      const span = xTo - xFrom + 6 * BIG_WIDTH_FRONT
      while (big.length && t !== null && t - big[0] > BIG_CROSS_S + LINES.length * BIG_LAG_S + 0.5) big.shift()
      for (let j = 0; j < LINES.length; j++) {
        const y = ys[j]
        const depth = Math.pow(j / (LINES.length - 1), DEPTH_CURVE)
        const sw = { amp: lerp(SWELL_BACK.amp, SWELL_FRONT.amp, depth), len: lerp(SWELL_BACK.len, SWELL_FRONT.len, depth), speed: lerp(SWELL_BACK.speed, SWELL_FRONT.speed, depth) }
        const rp = { amp: lerp(RIPPLE_BACK.amp, RIPPLE_FRONT.amp, depth), len: lerp(RIPPLE_BACK.len, RIPPLE_FRONT.len, depth), speed: lerp(RIPPLE_BACK.speed, RIPPLE_FRONT.speed, depth) }
        const churn = lerp(CHURN_BACK, CHURN_FRONT, depth)
        const bigAmp = lerp(BIG_BACK, BIG_FRONT, depth)
        const bigW = lerp(BIG_WIDTH_BACK, BIG_WIDTH_FRONT, depth)
        const lag = (LINES.length - 1 - j) * BIG_LAG_S
        for (let i = 0; i < n; i++) {
          const x = xFrom + i * DRAW_STEP
          let v = LINES[j].y
          if (t !== null) {
            // waves running to the left: the noise read further right as time goes on
            v += sw.amp * simplex3((x + t * sw.speed) / sw.len, 0.37 + 5.1 * j, t * churn)
            v += rp.amp * simplex3((x + t * rp.speed) / rp.len, 7.3 + 3.1 * j, t * churn * 1.7)
            for (const t0 of big) {
              const f = (t - t0 - lag) / BIG_CROSS_S
              if (f <= 0) continue
              const crest = xTo + 3 * BIG_WIDTH_FRONT - f * span
              const u = (x - crest) / bigW
              if (u < -4 || u > 7) continue
              v -= bigAmp * (sech2(u) - BIG_TROUGH * sech2((u - 2.2) / 1.6))
            }
          }
          y[i] = v
        }
        // what lies behind this line, under it, is hidden by it
        if (j > 0) {
          ctx.globalCompositeOperation = "destination-out"
          ctx.beginPath()
          ctx.moveTo(xFrom, BOTTOM)
          for (let i = 0; i < n; i++) ctx.lineTo(xFrom + i * DRAW_STEP, y[i])
          ctx.lineTo(xFrom + (n - 1) * DRAW_STEP, BOTTOM)
          ctx.closePath()
          ctx.fill()
          ctx.globalCompositeOperation = "source-over"
        }
        ctx.strokeStyle = LINES[j].rgb
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const x = xFrom + i * DRAW_STEP
          if (i === 0) ctx.moveTo(x, y[i])
          else ctx.lineTo(x, y[i])
        }
        ctx.stroke()
      }
    }

    if (still) {
      draw(null)
      const ro = new ResizeObserver(() => {
        size()
        draw(null)
      })
      ro.observe(canvas)
      return () => ro.disconnect()
    }

    let raf = 0
    let on = false
    let last = performance.now()
    let t = 0
    const gate: Gate = { at: 0 }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (skipFrame(gate, now)) return
      t += Math.min(0.1, (now - last) / 1000)
      last = now
      draw(t)
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
    io.observe(canvas)
    // the section's click: a big wave (the eye's own click stops before it gets here)
    const hit = canvas.closest<HTMLElement>("[data-grain-click]")
    const onClick = () => {
      if (big.length >= BIG_MAX) big.shift()
      big.push(t)
    }
    hit?.addEventListener("click", onClick)
    const ro = new ResizeObserver(() => {
      size()
      draw(t)
    })
    ro.observe(canvas)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    draw(t)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      hit?.removeEventListener("click", onClick)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        // the screen's whole width, wherever the composition stands in it
        left: "calc(50% - 50vw)",
        width: "100vw",
        top: `${((TOP / FH) * 100).toFixed(4)}%`,
        height: `${(((BOTTOM - TOP) / FH) * 100).toFixed(4)}%`,
        pointerEvents: "none",
      }}
    />
  )
}
