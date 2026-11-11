"use client"

import { useEffect, useRef } from "react"
import SUN from "@/lib/satori-sun-4.json"

/**
 * Satori 4's sun, breathing like the sun's own atmosphere (2026-11-11, the
 * author's brief). The author drew the rays in 3ds Max as a straight line
 * whose points a Noise modifier pushed up, bent through 360°, and drew nine of
 * them: a plain circle and the same rays at 1/8, 2/8 … 8/8 of their height
 * (`scripts/satori-drawings.py` measured it and wrote the circle and the full
 * rise of the rays at 720 angles to lib/satori-sun-4.json). Here the nine are
 * not still:
 *
 * - **The lines flow outward.** Each is born on the circle, flat, and rises
 *   as it travels: its rays grow from nothing to the drawing's full height
 *   (`phase` 0 → 1), then goes on growing whole, outward into nothing, and
 *   fades as it goes (`GROW`, `FADE_OUT`), while a
 *   new one is born behind it, so about nine are always under way, `SPACING`
 *   apart, as in the drawing. A line takes `TRAVEL_S` seconds.
 * - **The ray tips move in an animated noise.** The rays keep the author's
 *   profile, but every tip lengthens and shortens unevenly, slowly, the way
 *   a corona flickers: a noise over angle and time scales each ray
 *   (`TIP_NOISE`), stronger at the tips than in the valleys, plus a slow
 *   swell of whole sectors (`SWELL`).
 * - **The lines under a ray follow its noise.** All the lines read the same
 *   noise, each as it was about when the line was born (`CARRY`), so a line
 *   carries its flares outward and the one behind it, born a moment later,
 *   has nearly the same: a flare runs outward from line to line, like a wave
 *   through the atmosphere.
 *
 * Drawn on a canvas laid on the frame in the frame's own units, over the
 * drawing without its stars (drawing-4-core.svg) and under the photograph,
 * in the same gold, faded towards the edge by the same radial gradient as
 * the drawings, and 1 screen pixel wide like their lines. It runs only while
 * the frame is on screen. With reduced motion it draws the author's nine
 * lines still, as drawn.
 */

const GOLD = "198, 155, 92" // #C69B5C
const FRAME_W = 1530
/**
 * The canvas: a square on the sun's centre, wider than the frame, so a line
 * that has grown past the drawing can go on growing until it has faded out;
 * it runs over the frames' edges, faint by then (the page crops it at the
 * window's sides).
 */
const SIDE = 2000

const TRAVEL_S = 16
const LINES = SUN.lines - 1 // the circle is drawn on its own
const SPACING = 1 / LINES
/** How far past the drawing's outermost line a line goes before it has faded away (1 = the outermost line). */
const FADE_OUT = 1.75
/**
 * Past the drawing's outermost line a line no longer only lengthens its rays:
 * it grows whole, as if it were moving off into space, `GROW` times its size
 * for each phase it goes on, while it fades to nothing.
 */
const GROW = 0.45
/** Over what share of its life a new line fades in. */
const FADE_IN = 0.12
/** How much a ray's height varies with the noise, at the tips (a share of its own height). */
const TIP_NOISE = 0.55
/** How much whole sectors of the sun swell and sink together. */
const SWELL = 0.3
/** How fast the noise moves. */
const NOISE_SPEED = 0.3
/** How far the noise runs round the circle: rays this many noise cells apart are unrelated. */
const NOISE_ROUND = 5.5
/**
 * Each line carries its own shape outward: it reads the noise as it was when
 * it was born, moving on only `1 - CARRY` as fast as the noise itself. So a
 * flare a line is born with travels out with it and the line behind follows
 * with nearly the same shape (until 2026-11-11 the outer lines read the
 * noise as it was and the inner ones as it had been, which ran the flares
 * inward: the author saw the lines "come back").
 */
const CARRY = 0.8
/**
 * The lines never cross (2026-11-11, the author's wish, "as I imagined it"):
 * where a line's ray would reach past the line outside it, it pushes that
 * line out instead, so they stay nested like the drawing's, at least `GAP`
 * apart, the push eased over `SOFT` so it bends rather than kinks. The first
 * version let them cross; `?sun=cross` on the page shows it again.
 */
const GAP = 3
const SOFT = 6

const N = SUN.rise.length
const RISE = Float32Array.from(SUN.rise)
const MAX_RISE = Math.max(...SUN.rise)
const COS = new Float32Array(N)
const SIN = new Float32Array(N)
for (let k = 0; k < N; k++) {
  const a = (2 * Math.PI * k) / N
  COS[k] = Math.cos(a)
  SIN[k] = Math.sin(a)
}

/* 3D simplex noise (Stefan Gustavson's, public domain), for a noise that is
   round the circle without a seam (it is read on a circle in x, y) and moves
   in z. */
const GRAD = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1],
  [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]
const PERM = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i)
  let s = 1797 // a fixed seed: the same sun on every visit
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  return Uint8Array.from([...p, ...p])
})()
function simplex3(x: number, y: number, z: number): number {
  const F3 = 1 / 3, G3 = 1 / 6
  const s = (x + y + z) * F3
  const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s)
  const t = (i + j + k) * G3
  const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t)
  let i1, j1, k1, i2, j2, k2
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
  }
  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5
  const ii = i & 255, jj = j & 255, kk = k & 255
  const corner = (gi: number, cx: number, cy: number, cz: number) => {
    let tt = 0.6 - cx * cx - cy * cy - cz * cz
    if (tt < 0) return 0
    const g = GRAD[gi % 12]
    tt *= tt
    return tt * tt * (g[0] * cx + g[1] * cy + g[2] * cz)
  }
  const n0 = corner(PERM[ii + PERM[jj + PERM[kk]]], x0, y0, z0)
  const n1 = corner(PERM[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]], x1, y1, z1)
  const n2 = corner(PERM[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]], x2, y2, z2)
  const n3 = corner(PERM[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]], x3, y3, z3)
  return 32 * (n0 + n1 + n2 + n3) // about −1 … 1
}

/** The noise on the circle, sampled coarser than the line and interpolated: the rays are 31, the noise needs no finer grain. */
const NOISE_N = 180
function noiseRing(out: Float32Array, z: number, round: number, w: number) {
  for (let k = 0; k < NOISE_N; k++) {
    const a = (2 * Math.PI * k) / NOISE_N
    out[k] = simplex3(Math.cos(a) * round + w, Math.sin(a) * round, z)
  }
}

export function SatoriSun({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const crossing = new URLSearchParams(window.location.search).get("sun") === "cross"

    let scale = 1 // device pixels per frame unit
    const size = () => {
      const cssW = canvas.getBoundingClientRect().width
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.max(1, Math.round(cssW * dpr))
      if (canvas.width !== px) {
        canvas.width = px
        canvas.height = px
      }
      scale = px / SIDE
      return dpr
    }
    let dpr = size()

    // The canvas's origin is the frame's (SUN.cx - SIDE/2, SUN.cy - SIDE/2).
    const ox = SUN.cx - SIDE / 2
    const oy = SUN.cy - SIDE / 2
    const tip = new Float32Array(NOISE_N)
    const swell = new Float32Array(NOISE_N)

    const strokeStyle = () => {
      const g = ctx.createRadialGradient(SUN.fade.cx - ox, SUN.fade.cy - oy, 0, SUN.fade.cx - ox, SUN.fade.cy - oy, SUN.fade.r)
      g.addColorStop(0, `rgba(${GOLD}, 1)`)
      g.addColorStop(1, `rgba(${GOLD}, 0)`)
      return g
    }

    /** A line's radius at every angle, into `out`. */
    const radii = (out: Float32Array, phase: number, noiseAt: number | null) => {
      const grow = 1 + GROW * Math.max(0, phase - 1)
      const rise = Math.min(phase, 1)
      if (noiseAt !== null) {
        noiseRing(tip, noiseAt * NOISE_SPEED, NOISE_ROUND, 0)
        noiseRing(swell, noiseAt * NOISE_SPEED * 0.5, 1.6, 40)
      }
      for (let kk = 0; kk < N; kk++) {
        let h = RISE[kk] * rise
        if (noiseAt !== null) {
          const f = (kk / N) * NOISE_N
          const i0 = Math.floor(f) % NOISE_N
          const i1 = (i0 + 1) % NOISE_N
          const u = f - Math.floor(f)
          const nt = tip[i0] + (tip[i1] - tip[i0]) * u
          const ns = swell[i0] + (swell[i1] - swell[i0]) * u
          const tipness = RISE[kk] / MAX_RISE // the tips move most, the valleys least
          h *= Math.max(0, 1 + TIP_NOISE * nt * (0.35 + 0.65 * tipness) + SWELL * ns)
        }
        out[kk] = (SUN.r0 + h) * grow
      }
    }

    /** Push `out` clear of `inner`, the line inside it, at every angle: a smooth max, never closer than `GAP`. */
    const nest = (out: Float32Array, inner: Float32Array) => {
      for (let kk = 0; kk < N; kk++) {
        const a = out[kk]
        const b = inner[kk] + GAP
        const d = a - b
        out[kk] = (a + b + Math.sqrt(d * d + SOFT * SOFT)) / 2
      }
    }

    const stroke = (r: Float32Array, alpha: number) => {
      ctx.globalAlpha = alpha
      ctx.beginPath()
      const cx = SUN.cx - ox
      const cy = SUN.cy - oy
      for (let k = 0; k <= N; k++) {
        const kk = k % N
        const x = cx + r[kk] * COS[kk]
        const y = cy + r[kk] * SIN[kk]
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    const circle = new Float32Array(N).fill(SUN.r0)
    const pool: Float32Array[] = []
    const buf = (i: number) => (pool[i] ??= new Float32Array(N))

    const draw = (t: number | null) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.lineWidth = dpr / scale // one screen pixel, like the drawings' lines
      ctx.lineJoin = "round"
      ctx.strokeStyle = strokeStyle()
      stroke(circle, 1) // the circle the lines are born on
      if (t === null) {
        for (let k = 1; k <= LINES; k++) {
          const r = buf(k)
          radii(r, k / LINES, null)
          stroke(r, 1)
        }
        ctx.globalAlpha = 1
        return
      }
      const travel = t / TRAVEL_S // in phases: a line moves 1 in TRAVEL_S
      // the lines under way, innermost (youngest) first, so each can be pushed clear of the one inside it
      let inner: Float32Array = circle
      let i = 0
      for (let n = Math.floor(travel / SPACING); ; n--) {
        const phase = travel - n * SPACING
        if (phase <= 0) continue
        if (phase >= FADE_OUT) break
        const fadeIn = Math.min(1, phase / FADE_IN)
        const fadeOut = phase <= 1 ? 1 : 1 - (phase - 1) / (FADE_OUT - 1)
        const alpha = fadeIn * fadeIn * (fadeOut * fadeOut * (3 - 2 * fadeOut))
        const r = buf(i++)
        // a line reads the noise from about when it was born: it carries its shape out
        radii(r, phase, t - CARRY * TRAVEL_S * phase)
        if (!crossing) nest(r, inner)
        stroke(r, alpha)
        inner = r
      }
      ctx.globalAlpha = 1
    }

    if (still) {
      draw(null)
      return
    }

    let raf = 0
    let on = false
    let last = performance.now()
    let t = TRAVEL_S * FADE_OUT // start full: the lines already under way
    const tick = (now: number) => {
      t += Math.min(0.1, (now - last) / 1000)
      last = now
      draw(t)
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
    io.observe(canvas)
    const ro = new ResizeObserver(() => {
      dpr = size()
      if (!on) draw(t)
    })
    ro.observe(canvas)
    draw(t)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        left: `${((SUN.cx - SIDE / 2) / FRAME_W) * 100}%`,
        top: `${((SUN.cy - SIDE / 2) / 1635) * 100}%`,
        width: `${(SIDE / FRAME_W) * 100}%`,
        aspectRatio: "1 / 1",
        pointerEvents: "none",
      }}
    />
  )
}
