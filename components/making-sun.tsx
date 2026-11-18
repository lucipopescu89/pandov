"use client"

import { useEffect, useRef } from "react"
import { WORDS_MARK as RISE_MARK } from "@/components/making-drawing"
import SUN from "@/lib/satori-sun-4.json"
import SCENE from "@/lib/making-scene.json"
import { simplex3 } from "@/lib/simplex"
import { canvasDpr, isLite, skipFrame, type Gate } from "@/lib/satori-lights"

/**
 * The sun behind the sea in the homepage's Making section (2026-11-17, the
 * author's brief: "import Satori 4's sun and its animation, put it behind,
 * after the sea's waves, behind a white gradient as in the SVG").
 *
 * **It is Satori 4's sun**, `components/satori-sun.tsx`, at 0.432 of its size
 * (`SCENE.sun.scale`, fitted by `scripts/making-split.py`: the author's eight
 * lines in the frame are exactly Satori 4's rays at 1/8 … 8/8 round a circle
 * of 158.7 units), in the author's grey: the same lines born on the circle
 * and flowing outward (`TRAVEL_S`), their ray tips moving in the same noise
 * (`TIP_NOISE`, `SWELL`, `CARRY`), never crossing (`GAP`, `SOFT`). The
 * radiating circles and the lights of Satori 4 are left out: they belong to
 * the pendant at its middle, and here there is none.
 *
 * **Its grey, and the white in front of it**, are the export's own gradient
 * down the sun, which stays where it is in the frame while the sun moves:
 * #E3E3E3 at y 927, #7D7D7D at nothing by y 1291 (`SCENE.sun.colour`,
 * `from`, `to`). So below 927 the sun goes into white, and it has gone before
 * the sea's highest line (y 1306 at the most): the two never meet.
 *
 * **It rises as the reader comes down** (the author's asking: "on scroll down
 * the sun rises and goes up against the sea, as if rising"): from `DROP`
 * units under where the author drew it, out of the white over the horizon,
 * to `RISE_ABOVE` over it; back up the page, it sets. Since the author's
 * asking later the same day ("it comes out much earlier and moves more
 * slowly in the room that is left, higher") it starts while the horizon is
 * still 0.9 of a screen under the screen's foot, about when the
 * section comes up, and ends with the horizon at `RISE_END` of the screen's
 * height, over more than one and a half screens of scrolling, eased out: it
 * comes up from the horizon at once and slows as it climbs. (At first it rose
 * over the horizon's way from the foot of the screen to 42% of it, eased in
 * and out, to the drawing's own place.)
 *
 * **Since the author's fifth brief, the same afternoon ("let the sun come up
 * from lower, so that it reaches the screen after the trumpet player has
 * gone"), it starts rising exactly when CREATOR2 has faded out**: when the
 * words' middle is up at `TRUMPET_GONE_AT` of the screen's height, the same
 * moment `making-drawing.tsx` ends CREATOR2's fade (read off the same words,
 * `[data-mk-words]`, so it holds on every screen), from `DROP` units under
 * the drawing's place, its highest rays then still under the white over the
 * horizon; and it has risen once the horizon is up at `RISE_END` of the
 * screen, where the whole risen sun is in view. Eased out as before. On a
 * page without those words it starts as the horizon comes up from the
 * screen's foot. (Before it, the rise started with the horizon still 0.9 of
 * a screen under the screen's foot, `RISE_LEAD`, while the trumpet played.)
 *
 * **The seventh brief, minutes later** ("raise it earlier, so it does not
 * spring up; let it appear larger: now it appears too small and grows very
 * fast all at once; I want the sun almost risen when the trumpet player goes,
 * so there is image, scrolling, with it in its place"): the rise no longer
 * waits for CREATOR2 to go. It runs as the words' middle goes up from
 * `RISE_FROM` of the screen's height (about as the section comes in, before
 * CREATOR2 has come) to `TRUMPET_GONE_AT`, the moment CREATOR2 has gone,
 * eased in and out so it neither springs up nor stops short; and it grows
 * from `GROW_FROM` to `GROW_TO` its drawn size, not from 1. After that it
 * stays in its place in the frame and goes up with the page.
 *
 * **Since CREATOR2 is gone and the words have gone up** (the same evening,
 * the author's asking), the rise is no longer read off the words but off the
 * point of the frame where their middle stood (`RISE_MARK`, `WORDS_MARK` in
 * `making-drawing.tsx`: y 666.3, the same on every screen): it runs as that point goes up from `RISE_FROM` of the
 * screen's height to `RISE_TO`, exactly as before, so the sun keeps its time.
 *
 * **A click is Satori 4's hover: a solar storm** (the author's asking: "on a
 * click the sun moves as on Satori 4"). The outer lines stand further out
 * (`STORM_SCALE`, with time as much slower, so they move out as fast as at
 * rest) and turn chaotic (`STORM_CHAOS`, `STORM_JITTER`); it holds
 * `STORM_HOLD_S` after the last click and calms over `RETURN_LAG_S`. The click
 * is the section's, the same that sends the gold motes up the trunk
 * (`[data-grain-click]`); the eye keeps its own.
 *
 * **The sixth brief, the same afternoon** ("it comes up too fast now: leave it
 * further out; only up, not left; let it grow on scroll down; and turn it
 * slowly clockwise"): at the trumpet player's going it is already well out
 * (`DROP` 180 under the drawing's place, its top rays in the white's upper
 * half) and fades in there (`APPEAR`, a share of its rise) rather than
 * climbing from under the horizon; it then climbs only `DROP` + `RISE_ABOVE`
 * (220 units, against 540 the hour before, so it is slower than the page)
 * straight up, and grows as it climbs (`GROW_TO` its drawn size, round its
 * centre; 1.35 at first, 2 at the author's asking). The whole sun turns clockwise at `TURN_DEG_S` degrees a second (1.5, the author's
 * number; 2 at first),
 * its flares with it; the white over the horizon stays where it is.
 *
 * Drawn on a canvas behind the sea and the trunk, in frame units; it runs only
 * while on screen. On a phone, smaller and nearer the trunk (`PHONE_*`).
 * Under reduced motion the author's
 * eight lines are drawn still, where they were drawn.
 */

const S = SCENE.sun.scale
const CX = SCENE.sun.cx
const CY = SCENE.sun.cy
/**
 * How far below the drawing's place the sun stands as it appears (frame
 * units; 420 in the fifth brief, when it climbed out from under the horizon,
 * and 330 before), and how far over it it ends. Straight up: the drift to the
 * left of the fourth brief (150 units) is gone, the author's asking.
 */
const DROP = 180
const RISE_ABOVE = 40
/**
 * It rises as `RISE_MARK`, a point of the frame (where the words' middle
 * stood until they moved up), goes up from `RISE_FROM` of the screen's height
 * to `RISE_TO`, when the trumpet player had gone.
 */
const RISE_FROM = 0.85
const RISE_TO = 0.42
/** It fades in over this share of its rise. */
const APPEAR = 0.25
/** It grows as it climbs, from `GROW_FROM` to `GROW_TO` times its drawn size, round its centre (from 1 until the seventh brief). */
const GROW_FROM = 1.6
const GROW_TO = 2
/** It turns clockwise, this many degrees a second. */
const TURN_DEG_S = 1.5
/** The canvas, frame units: wide enough for a storm's outer lines (Satori 4's 2100 square, scaled) at the sun's largest and highest, down to where the white has hidden everything. */
const HALF = 1050 * S * GROW_TO
const BOX_X = CX - HALF
const BOX_Y = CY - RISE_ABOVE - HALF
const BOX_W = 2 * HALF
const BOX_H = SCENE.sun.to + 4 - BOX_Y
const FW = SCENE.frame.w
const FH = SCENE.frame.h


/**
 * On a phone (2026-11-18, the author's asking: "the sun stays fairly large,
 * but may be made smaller so the screen holds more of it"), the section is a
 * window onto the frame round the trunk (`P_CROP` in `making-section.tsx`),
 * and the sun, where it is drawn, would stand mostly off its left edge. So
 * there its canvas is `PHONE_SCALE` of its size and its centre at
 * `PHONE_CX`, scaled about its foot, so the white over the horizon still
 * ends just over the sea. Its motion, its rise and its storm are the same.
 */
// 900 and 0.5 at first; the same morning, the author's asking: further right and larger
const PHONE_CX = 1060
const PHONE_SCALE = 0.7
const PHONE = "(max-width: 767px)"

/** The canvas's pixels, capped (Satori 4's caps; 2000 until the sun grew to twice its size, which made the canvas half as wide again: raised so its lines stay as sharp). */
const MAX_PX = 2800
const MAX_PX_LITE = 1200

/* Satori 4's motion, unchanged (see `components/satori-sun.tsx`). */
const TRAVEL_S = 16
const LINES = SUN.lines - 1
const SPACING = 1 / LINES
const FADE_OUT = 1.75
const GROW = 0.45
const FADE_IN = 0.12
const TIP_NOISE = 0.55
const SWELL = 0.3
const NOISE_SPEED = 0.3
const NOISE_ROUND = 5.5
const CARRY = 0.8
const GAP = 2.5
const SOFT = 5
const HOVER_LAG_S = 0.4
const RETURN_LAG_S = 1.1
const STORM_FROM = 0.3
const STORM_TO = 1.2
const STORM_SCALE = 0.7
const STORM_CHAOS = 0.75
const STORM_JITTER = 9
const STORM_ROUND = 13
const STORM_SPEED = 0.35
/** A click's storm holds this long after the last click, then calms. */
const STORM_HOLD_S = 3.5

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
const NOISE_N = 180
function noiseRing(out: Float32Array, z: number, round: number, w: number) {
  for (let k = 0; k < NOISE_N; k++) {
    const a = (2 * Math.PI * k) / NOISE_N
    out[k] = simplex3(Math.cos(a) * round + w, Math.sin(a) * round, z)
  }
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const [C0, C1] = SCENE.sun.colour.map(hex)

export function MakingSun({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let scale = 1 // device pixels per frame unit
    let unitPx = 1 // CSS pixels per frame unit
    const size = () => {
      const cssW = canvas.getBoundingClientRect().width
      if (cssW <= 0) return
      const px = Math.max(1, Math.min(isLite() ? MAX_PX_LITE : MAX_PX, Math.round(cssW * canvasDpr())))
      const h = Math.max(1, Math.round((px * BOX_H) / BOX_W))
      if (canvas.width !== px || canvas.height !== h) {
        canvas.width = px
        canvas.height = h
      }
      scale = px / BOX_W
      unitPx = cssW / BOX_W
    }
    size()

    // The export's gradient, fixed in the frame: the grey, and the white over it.
    const paint = () => {
      const g = ctx.createLinearGradient(0, 0, 0, BOX_H)
      const from = SCENE.sun.from - BOX_Y
      const to = SCENE.sun.to - BOX_Y
      for (let i = 0; i <= 10; i++) {
        const y = (BOX_H * i) / 10
        const t = Math.min(1, Math.max(0, (y - from) / (to - from)))
        const c = C0.map((v, j) => Math.round(v + (C1[j] - v) * t))
        g.addColorStop(i / 10, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(1 - t).toFixed(3)})`)
      }
      return g
    }

    const tip = new Float32Array(NOISE_N)
    const swell = new Float32Array(NOISE_N)
    const chaos = new Float32Array(NOISE_N)
    let storm = 0

    /** A line's radius at every angle (Satori 4's units), into `out`. */
    const radii = (out: Float32Array, phase: number, noiseAt: number | null, now = 0) => {
      const s = noiseAt === null ? 0 : storm * smooth(STORM_FROM, STORM_TO, phase)
      const grow = 1 + GROW * Math.max(0, phase - 1)
      const rise = Math.min(phase, 1)
      const wide = noiseAt === null ? 1 : 1 + STORM_SCALE * storm
      if (noiseAt !== null) {
        noiseRing(tip, noiseAt * NOISE_SPEED, NOISE_ROUND, 0)
        noiseRing(swell, noiseAt * NOISE_SPEED * 0.5, 1.6, 40)
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
          const tipness = RISE[kk] / MAX_RISE
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
    const nest = (out: Float32Array, inner: Float32Array) => {
      for (let kk = 0; kk < N; kk++) {
        const a = out[kk]
        const b = inner[kk] + GAP
        const d = a - b
        out[kk] = (a + b + Math.sqrt(d * d + SOFT * SOFT)) / 2
      }
    }
    let cy = CY - BOX_Y // the sun's centre in the canvas, frame units (it rises)
    const cx = CX - BOX_X
    let grown = S // frame units per Satori 4 unit: its drawn scale, growing as it climbs
    let seen = 1 // how much of it shows: it fades in as it appears
    let tc = 1 // its turn, cosine and sine
    let ts = 0
    const stroke = (r: Float32Array, alpha: number) => {
      ctx.globalAlpha = alpha * seen
      ctx.beginPath()
      for (let k = 0; k <= N; k++) {
        const kk = k % N
        const c = COS[kk] * tc - SIN[kk] * ts
        const sn = SIN[kk] * tc + COS[kk] * ts
        const x = cx + r[kk] * grown * c
        const y = cy + r[kk] * grown * sn
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
      // the export's lines are a frame unit wide; never under 0.8 of a screen pixel
      ctx.lineWidth = Math.max(1, 0.8 / (unitPx || 1))
      ctx.lineJoin = "round"
      ctx.strokeStyle = paint()
      if (t === null) {
        for (let k = 1; k <= LINES; k++) {
          const r = buf(k)
          radii(r, k / LINES, null)
          stroke(r, 1)
        }
        ctx.globalAlpha = 1
        return
      }
      const travel = t / TRAVEL_S
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
        radii(r, phase, t - CARRY * TRAVEL_S * phase, t)
        nest(r, inner)
        stroke(r, alpha)
        inner = r
      }
      ctx.globalAlpha = 1
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

    /** Where the sun stands for the page's scroll: its centre, canvas frame units. */
    const place = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width) return
      const k = r.width / BOX_W
      const vh = window.innerHeight
      // read off a point of the frame, so it keeps its time on every screen
      const mark = r.top + (RISE_MARK - BOX_Y) * k
      const u = Math.min(1, Math.max(0, (RISE_FROM * vh - mark) / ((RISE_FROM - RISE_TO) * vh)))
      const p = u * u * (3 - 2 * u) // eased in and out: no spring, no stop
      cy = CY - BOX_Y + DROP - (DROP + RISE_ABOVE) * p
      grown = S * (GROW_FROM + (GROW_TO - GROW_FROM) * p)
      const a = Math.min(1, u / APPEAR)
      seen = a * a * (3 - 2 * a)
    }

    let raf = 0
    let on = false
    let last = performance.now()
    let t = TRAVEL_S * FADE_OUT // start full: the lines already under way
    let stormUntil = 0
    let turn = 0
    const gate: Gate = { at: 0 }
    const tick = (now: number) => {
      if (skipFrame(gate, now)) {
        raf = requestAnimationFrame(tick)
        return
      }
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const hovered = now < stormUntil
      const k = 1 - Math.exp(-dt / (hovered ? HOVER_LAG_S : RETURN_LAG_S))
      storm += ((hovered ? 1 : 0) - storm) * k
      t += dt / (1 + STORM_SCALE * storm)
      turn += (TURN_DEG_S * Math.PI * dt) / 180
      tc = Math.cos(turn)
      ts = Math.sin(turn)
      place()
      draw(t)
      raf = requestAnimationFrame(tick)
    }
    // The section's click (the eye's own click stops before it gets here).
    const hit = canvas.closest<HTMLElement>("[data-grain-click]")
    const onClick = () => {
      stormUntil = performance.now() + STORM_HOLD_S * 1000
    }
    hit?.addEventListener("click", onClick)
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
      size()
      if (!on) {
        place()
        draw(t)
      }
    })
    ro.observe(canvas)
    place()
    draw(t)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      hit?.removeEventListener("click", onClick)
    }
  }, [])

  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`
  const f = PHONE_SCALE
  return (
    <>
      <canvas
        ref={ref}
        className={`mk-sun-c${className ? ` ${className}` : ""}`}
        aria-hidden
        style={{ position: "absolute", pointerEvents: "none" }}
      />
      <style>{`
        .mk-sun-c { left: ${pct(BOX_X, FW)}; top: ${pct(BOX_Y, FH)}; width: ${pct(BOX_W, FW)}; height: ${pct(BOX_H, FH)}; }
        @media ${PHONE} {
          .mk-sun-c { left: ${pct(PHONE_CX - (CX - BOX_X) * f, FW)}; top: ${pct(BOX_Y + BOX_H * (1 - f), FH)}; width: ${pct(BOX_W * f, FW)}; height: ${pct(BOX_H * f, FH)}; }
        }
      `}</style>
    </>
  )
}
