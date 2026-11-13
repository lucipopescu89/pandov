"use client"

import { useEffect, useRef } from "react"
import SUN from "@/lib/satori-sun-4.json"
import { canvasDpr, comets, flush, isLite, lights, skipFrame, type Gate, type LightCfg, type Pts } from "@/lib/satori-lights"

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
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
/** The frame, as scripts/satori-drawings.py writes it (125% of Figma's, since 2026-11-12). */
const FRAME_W = 1275
const FRAME_H = 1380
/**
 * The canvas: a square on the sun's centre, wider than the frame, so a line
 * that has grown past the drawing can go on growing until it has faded out;
 * it runs over the frames' edges, faint by then (the page crops it at the
 * window's sides). 2100 since the solar storm (below), whose outer lines go
 * further (1667 before).
 */
const SIDE = 2100
/**
 * The crown's lines at this share of the drawings' strength, at rest and on a
 * hover alike (2026-11-12, the author's asking: more transparent). The lights
 * that run along them on a hover keep theirs.
 */
const CROWN_ALPHA = 0.6
/**
 * The canvas's pixels are capped at this many a side: at twice the screen's
 * pixels the 2100 square would be over 4000 a side, cleared and drawn every
 * frame (the page was slow, 2026-11-12). The lines stay one screen pixel.
 */
const MAX_PX = 2800
/** On a phone, fewer (`isLite`; the author's iPhone 8 stuttered), and lights on every other line only. */
const MAX_PX_LITE = 1600

const TRAVEL_S = 16

/**
 * **The sun keeps its size, and a hover over the pendant is a solar storm**
 * (2026-11-12, the author's asking; until then the sun rested at 85% and grew
 * to its place on a hover). On a hover the outer lines, the last rows of the
 * rays, stand further out (`STORM_SCALE`: every line's way out from the
 * rays' circle is larger, so the outer ones grow most and the circle stays)
 * and move out exactly as fast as at rest (time runs as much slower), and
 * they turn chaotic: a second, finer and faster
 * noise shakes their rays and their whole line (`STORM_CHAOS`,
 * `STORM_JITTER`), more the further out the line is (`STORM_FROM`, `STORM_TO`,
 * in phases: 1 is the drawing's outermost line). The inner lines stay as they
 * are. (The author found the first tries far too fast, the outer lines racing
 * out and quickening, and asked for them only to grow and then to move as
 * slowly as before the hover; the storm's own noise was slowed too,
 * `STORM_SPEED`.) The hover drawing
 * inside (`SatoriCore`) is as it was. It eases in (`HOVER_LAG_S`) and, off
 * the pendant, waits for the hover drawing to be drawn back (`UNDRAWN_EVENT`
 * from `SatoriCore`) and calms more slowly (`RETURN_LAG_S`).
 * A touch screen, with no hover, keeps it at rest; under reduced motion it is
 * drawn still and whole.
 */
const HOVER_LAG_S = 0.4
const RETURN_LAG_S = 1.1
const STORM_FROM = 0.3
const STORM_TO = 1.2
/**
 * How much further out every line stands from the rays' circle at full storm
 * (the circle itself stays: the outer lines, furthest out, grow the most).
 * Time runs as much slower (`rate`), so each line moves out exactly as fast as
 * at rest: the author's asking, the same afternoon, after two tries that grew
 * the outer lines more the further out they were and so sped them outward
 * three to five times (measured).
 */
const STORM_SCALE = 0.7
/** The storm's own noise: its strength on the rays, its push on the whole line (frame units), how fine and how fast. */
const STORM_CHAOS = 0.75
const STORM_JITTER = 9
const STORM_ROUND = 13
const STORM_SPEED = 0.35 // 1.1 at first: it flickered, and read as speed

/**
 * On a hover the crown's lines are traced by lights too, as Satori 3's
 * drawing is (2026-11-12, the author's asking): on every line two lights leave
 * its top, mirrored, run round it and meet at its foot, and go on round
 * (`lib/satori-lights.ts`), brighter than the lines (`LIGHT_PEAK`, faded
 * towards the edge as they are) and as strong as each line is. They come with
 * the hover and go as it ends (`LIGHTS_IN_S`, `LIGHTS_OUT_S`).
 */
/**
 * Off since 2026-11-13, the author's asking: on a hover only the drawing
 * inside the rays is traced by lights (`SatoriCore`), the crown no longer.
 * `true` brings the crown's lights back as they were.
 */
const CROWN_LIGHTS = false
const LIGHT = "214, 172, 106"
const LIGHT_PEAK = 1
const LIGHT_CFG: LightCfg = { trail: 420, front: 30, piece: 12, speed: 140 }
/** The lights' width, screen pixels: a little more than the lines', to read as a stroke over them. */
const LIGHT_PX = 1.5
const LIGHTS_IN_S = 0.6
const LIGHTS_OUT_S = 0.4

/**
 * The circles radiating from the pendant at rest, inside the rays (they were
 * Presence's `RadiantRings` in `SatoriCore`, an SVG repainted every frame;
 * drawn here since 2026-11-12, on the canvas that is drawn anyway). Each
 * leaves `RING_FROM` from the sun's centre, about 60px clear of the pendant,
 * and fades out as it reaches the circle the rays rise from (`SUN.r0`); one
 * leaves every 2s (`RING_CYCLE_S` / `RINGS`), fading in over the first 14% of
 * its way, at `RING_PEAK`, gold at its top and 45% of that at its foot, its
 * hairline (`RING_STROKE`) growing with it. On a hover over the pendant they
 * fade out (`RINGS_OUT_S`), and come back after it (`RINGS_BACK_S`).
 */
const RING_FROM = 180
const RING_CYCLE_S = 14
const RINGS = 7
const RING_PEAK = 0.25
const RING_STROKE = 0.75
const RINGS_OUT_S = 0.7
const RINGS_BACK_S = 1.4
const RINGS_BACK_DELAY_S = 0.3
/** Sent on the frame by `SatoriCore` once its drawing has been drawn back. */
export const UNDRAWN_EVENT = "satori-undrawn"
/**
 * Sent on the frame by `SatoriTap` when a finger taps the pendant (a touch
 * screen has no hover): every part of the frame plays its hover as if a mouse
 * had come onto the pendant, and stays so, since the page then opens the
 * pendant's own page (2026-11-12, the author's asking).
 */
export const PLAY_EVENT = "satori-play"
/** A pointer event from a mouse, or the tap's `PLAY_EVENT`: what starts a hover. */
export const startsHover = (e: Event) => !(e instanceof PointerEvent) || e.pointerType === "mouse"
const LINES = SUN.lines - 1 // the circle is not drawn: the lines are born on it unseen
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
const GAP = 2.5 // 3 and 6 in the 1530 frame, the same on the drawing
const SOFT = 5

const N = SUN.rise.length
/** The index of a line's top: the angle 3/4 of a turn round (y is down). */
const TOP = Math.round((3 * N) / 4)
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
    const lite = isLite()
    const crossing = new URLSearchParams(window.location.search).get("sun") === "cross"

    let scale = 1 // device pixels per frame unit
    const size = () => {
      const cssW = canvas.getBoundingClientRect().width
      const dpr = canvasDpr()
      const px = Math.max(1, Math.min(isLite() ? MAX_PX_LITE : MAX_PX, Math.round(cssW * dpr)))
      if (canvas.width !== px) {
        canvas.width = px
        canvas.height = px
      }
      scale = px / SIDE
      // device pixels per CSS pixel, as the canvas is drawn (less than the
      // screen's when capped), so a line of `dpr / scale` is one CSS pixel
      return cssW > 0 ? px / cssW : dpr
    }
    let dpr = size()

    // The canvas's origin is the frame's (SUN.cx - SIDE/2, SUN.cy - SIDE/2).
    const ox = SUN.cx - SIDE / 2
    const oy = SUN.cy - SIDE / 2
    const tip = new Float32Array(NOISE_N)
    const swell = new Float32Array(NOISE_N)
    const chaos = new Float32Array(NOISE_N)
    let storm = 0 // 0 at rest → 1 on a hover over the pendant

    const strokeStyle = () => {
      const g = ctx.createRadialGradient(SUN.fade.cx - ox, SUN.fade.cy - oy, 0, SUN.fade.cx - ox, SUN.fade.cy - oy, SUN.fade.r)
      g.addColorStop(0, `rgba(${GOLD}, ${SUN.fade.peak * CROWN_ALPHA})`) // the drawings' strength (INTENSITY in the script), less (CROWN_ALPHA)
      g.addColorStop(1, `rgba(${GOLD}, 0)`)
      return g
    }

    /** A line's radius at every angle, into `out`; `now` is the time, for the storm's noise. */
    const radii = (out: Float32Array, phase: number, noiseAt: number | null, now = 0) => {
      // the storm: the further out the line, the more
      // the storm's chaos: the further out the line, the more
      const s = noiseAt === null ? 0 : storm * smooth(STORM_FROM, STORM_TO, phase)
      const grow = 1 + GROW * Math.max(0, phase - 1)
      const rise = Math.min(phase, 1)
      // the storm's size: every line's way out from the rays' circle, larger alike
      const wide = noiseAt === null ? 1 : 1 + STORM_SCALE * storm
      if (noiseAt !== null) {
        noiseRing(tip, noiseAt * NOISE_SPEED, NOISE_ROUND, 0)
        noiseRing(swell, noiseAt * NOISE_SPEED * 0.5, 1.6, 40)
        // its own noise, read now and not carried, each line a little apart: turbulent
        if (s > 0.005) noiseRing(chaos, now * STORM_SPEED + phase * 2.3, STORM_ROUND, 90)
      }
      for (let kk = 0; kk < N; kk++) {
        let h = RISE[kk] * rise
        let jitter = 0
        if (noiseAt !== null) {
          const f = (kk / N) * NOISE_N
          const i0 = Math.floor(f) % NOISE_N
          const i1 = (i0 + 1) % NOISE_N
          const u = f - Math.floor(f)
          const nt = tip[i0] + (tip[i1] - tip[i0]) * u
          const ns = swell[i0] + (swell[i1] - swell[i0]) * u
          const tipness = RISE[kk] / MAX_RISE // the tips move most, the valleys least
          let k = 1 + TIP_NOISE * nt * (0.35 + 0.65 * tipness) + SWELL * ns
          if (s > 0.005) {
            const nc = chaos[i0] + (chaos[i1] - chaos[i0]) * u
            k += STORM_CHAOS * s * nc * (0.4 + 0.6 * tipness)
            jitter = STORM_JITTER * s * nc
          }
          h *= Math.max(0, k)
        }
        out[kk] = SUN.r0 + ((SUN.r0 + h) * grow - SUN.r0) * wide + jitter
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

    const lightStyle = () => {
      const g = ctx.createRadialGradient(SUN.fade.cx - ox, SUN.fade.cy - oy, 0, SUN.fade.cx - ox, SUN.fade.cy - oy, SUN.fade.r)
      g.addColorStop(0, `rgba(${LIGHT}, ${LIGHT_PEAK})`)
      g.addColorStop(1, `rgba(${LIGHT}, 0)`)
      return g
    }
    const lpts = new Float32Array(N * 2)
    const line: Pts = { pts: lpts, n: N, closed: true, total: 0 }
    const alphas: number[] = []
    const gather = lights()
    let lightsA = 0
    let lightT = 0
    let photoOn = false

    const circle = new Float32Array(N).fill(SUN.r0)
    const pool: Float32Array[] = []
    const buf = (i: number) => (pool[i] ??= new Float32Array(N))

    // On a hover, a solar storm and a little quicker (see STORM_*).
    let rate = 1
    let hovered = false
    // The radiating circles: their own time, and how much they are seen (0 on a hover).
    let ringT = 0
    let ringsA = 1
    let ringsTarget = 1
    let ringsBackAt = -1

    /** The radiating circles inside the rays, at time `rt`. */
    const drawRings = (rt: number) => {
      if (ringsA < 0.003) return
      const cx = SUN.cx - ox
      const cy = SUN.cy - oy
      for (let i = 0; i < RINGS; i++) {
        const f = (((rt / RING_CYCLE_S + i / RINGS) % 1) + 1) % 1
        const fade = f < 0.14 ? f / 0.14 : (1 - f) / 0.86
        const a = RING_PEAK * ringsA * fade
        if (a < 0.003) continue
        const r = RING_FROM + (SUN.r0 - RING_FROM) * f
        const g = ctx.createLinearGradient(0, cy - r, 0, cy + r)
        g.addColorStop(0, `rgb(${GOLD})`)
        g.addColorStop(1, `rgba(${GOLD}, 0.45)`)
        ctx.strokeStyle = g
        ctx.globalAlpha = a
        ctx.lineWidth = RING_STROKE * (r / RING_FROM)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, 2 * Math.PI)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const draw = (t: number | null) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      if (t !== null) drawRings(ringT)
      ctx.lineWidth = dpr / scale // one screen pixel, like the drawings' lines
      ctx.lineJoin = "round"
      ctx.strokeStyle = strokeStyle()
      // The circle the lines are born on is not drawn (2026-11-12, the author's
      // asking: it stood still inside the moving lines); they still rise off it.
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
        radii(r, phase, t - CARRY * TRAVEL_S * phase, t)
        if (!crossing) nest(r, inner)
        stroke(r, alpha)
        alphas[i - 1] = alpha
        inner = r
      }
      ctx.globalAlpha = 1
      // the lights round the lines, on a hover; not on a phone (2026-11-12,
      // the author's asking: there they cost more than they gave)
      if (CROWN_LIGHTS && lightsA > 0.003 && !lite) {
        ctx.strokeStyle = lightStyle()
        ctx.lineCap = "round"
        ctx.lineWidth = (LIGHT_PX * dpr) / scale
        const cx = SUN.cx - ox
        const cy = SUN.cy - oy
        for (let j = 0; j < i; j++) {
          const r = pool[j]
          // its points from its top (a quarter turn back: y is down), clockwise
          let len = 0
          for (let k = 0; k < N; k++) {
            const kk = (k + TOP) % N
            lpts[2 * k] = cx + r[kk] * COS[kk]
            lpts[2 * k + 1] = cy + r[kk] * SIN[kk]
            if (k) len += Math.hypot(lpts[2 * k] - lpts[2 * k - 2], lpts[2 * k + 1] - lpts[2 * k - 1])
          }
          const step = len / (N - 1)
          comets(gather, line, "both", (lightT * LIGHT_CFG.speed) / step, lightsA * alphas[j], LIGHT_CFG, step)
        }
        flush(ctx, gather)
      }
    }

    if (still) {
      draw(null)
      return
    }

    let raf = 0
    let on = false
    let last = performance.now()
    let t = TRAVEL_S * FADE_OUT // start full: the lines already under way
    const gate: Gate = { at: 0 }
    const tick = (now: number) => {
      if (skipFrame(gate, now)) {
        raf = requestAnimationFrame(tick)
        return
      }
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const k = 1 - Math.exp(-dt / (hovered ? HOVER_LAG_S : RETURN_LAG_S))
      storm += ((hovered ? 1 : 0) - storm) * k
      // as much slower as the crown is wider, so every line moves out as fast as at rest
      rate = 1 / (1 + STORM_SCALE * storm)
      t += dt * rate
      ringT += dt
      lightT += dt
      lightsA = photoOn ? Math.min(1, lightsA + dt / LIGHTS_IN_S) : Math.max(0, lightsA - dt / LIGHTS_OUT_S)
      if (ringsBackAt >= 0 && now >= ringsBackAt) {
        ringsTarget = 1
        ringsBackAt = -1
      }
      ringsA = ringsTarget > ringsA
        ? Math.min(ringsTarget, ringsA + dt / RINGS_BACK_S)
        : Math.max(ringsTarget, ringsA - dt / RINGS_OUT_S)
      draw(t)
      raf = requestAnimationFrame(tick)
    }
    // The pendant's photograph, in the same frame: a mouse over it. Off it,
    // the storm waits for the drawing to be drawn back (UNDRAWN_EVENT); the
    // radiating circles come back as the drawing goes.
    const frame = canvas.parentElement
    const photo = frame?.querySelector<HTMLElement>(".sp-photo")
    const enter = (e: Event) => {
      if (!startsHover(e)) return
      hovered = true
      ringsTarget = 0
      ringsBackAt = -1
      if (!photoOn && lightsA <= 0) lightT = 0
      photoOn = true
    }
    const leavePhoto = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      photoOn = false
      ringsBackAt = performance.now() + RINGS_BACK_DELAY_S * 1000
    }
    const leave = () => {
      hovered = false
    }
    photo?.addEventListener("pointerenter", enter)
    frame?.addEventListener(PLAY_EVENT, enter)
    photo?.addEventListener("pointerleave", leavePhoto)
    frame?.addEventListener(UNDRAWN_EVENT, leave)
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
      photo?.removeEventListener("pointerenter", enter)
      frame?.removeEventListener(PLAY_EVENT, enter)
      photo?.removeEventListener("pointerleave", leavePhoto)
      frame?.removeEventListener(UNDRAWN_EVENT, leave)
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
        top: `${((SUN.cy - SIDE / 2) / FRAME_H) * 100}%`,
        width: `${(SIDE / FRAME_W) * 100}%`,
        aspectRatio: "1 / 1",
        pointerEvents: "none",
      }}
    />
  )
}
