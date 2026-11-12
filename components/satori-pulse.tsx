"use client"

import { useEffect, useRef } from "react"
import PULSE from "@/lib/satori-pulse-2.json"
import CORE from "@/lib/satori-core-2.json"
import { HEART_S, heartbeat } from "@/lib/heartbeat"
import { samplePath } from "@/lib/satori-lights"

/**
 * Satori 2, "a pulse of sparks / at the edge of mind" (2026-11-12, the
 * author's brief).
 *
 * **The pulse.** The line of pulses round the circles, the one that reads like
 * a heart's trace, is not drawn: drawn 120% of its size about its middle
 * (`scripts/satori-drawings.py`, `PULSE_SCALE`), it is the track of a light
 * that runs round it, as the light runs down the seam between the doors on
 * the homepage (`components/scroll-hint.tsx`), but in the drawings' gold and
 * softer: a one-pixel line whose trail fades out over several of the pulses
 * behind it (`TRAIL`) and whose front fades in over a shorter stretch
 * (`FRONT`), so it has no hard tip (a brighter point of about two pixels led
 * it at first; the author found it too sharp, and the light too white). The
 * pulses are seen only as the light passes over them. One lap takes `LAP_S`
 * (slowed the same day: the pulse should be low).
 *
 * **The circles.** The eleven circles inside are seen whole only round the
 * pendant's foot, where each dips into a V under it (`ZONE`, the author's
 * outline on a screenshot, made even about the axis), fading out softly from
 * there (`FEATHER`). Through them a light radiates outward, from the
 * innermost to the outermost, over and over (`WAVE_S`): three circles at a
 * time are seen whole, the middle one as strong as the foot, the one before
 * and the one behind it at 30% (`SIDE`), each coming up and going down
 * gradually as the wave passes (the author's asking, the same day; at first
 * each pulse the light passed drew a circle whole by hand, and the author
 * did not like it). The wave adds only what the foot does not show (`OUTSIDE`,
 * the zone's complement), so the foot is never brighter than it is.
 *
 * The wave goes out calmly, at an even pace (for a while the same day it went
 * out in surges at the heartbeat; the author preferred it calm). The foot is
 * at `FOOT_ALPHA` of the drawing's gold, the wave at `WAVE_ALPHA` of it (both
 * brought down the same day).
 *
 * **On a hover over the pendant** (the author's asking, the same day), with a
 * mouse:
 * - the wave widens from three circles seen whole to nine (`WIDE`: the middle
 *   one at full strength, falling to `SIDE` at the outermost two; five until
 *   2026-11-12);
 * - the line of pulses itself shows, still, at 30% (`TRACK_ALPHA`), and its
 *   pulses beat together at the site's one heartbeat (`lib/heartbeat.ts`,
 *   Mother Nature's lub-dub): on each beat every spike rises higher and every
 *   trough sinks lower, about the line's circle (`TRACK_BEAT_AMP`), and the
 *   line brightens a little (`TRACK_BEAT_LIGHT`), the light still running round
 *   it. It comes and goes over `TRACK_LAG_S`. (For a while the same day the
 *   whole line grew on the beat, and the circle under the pointer was drawn
 *   whole; the author preferred this.)
 *
 * The track and the circles are lib/satori-pulse-2.json and
 * lib/satori-core-2.json, in the frame's units. Lines are one screen pixel
 * wide. The foot is an SVG that never changes; the wave, the light and the
 * track are drawn on one canvas, the wave cut out of the zone there by a
 * feathered copy of it made once (it was an SVG whose circles changed every
 * frame under two blurred masks, which the browser blurred again every frame:
 * the page was slow, 2026-11-12). It runs only while the frame is on screen. Under reduced motion the
 * circles are drawn whole and still, and the track faint.
 */

const FRAME_W = 1275
const FRAME_H = 1380
const GOLD = "#C69B5C"

/** The light: the drawings' gold, a little lighter, at its brightest. */
const LIGHT = "214, 172, 106"
const TRAIL_ALPHA = 0.2 // 0.5 until the author asked for it much fainter, the same day
/**
 * One lap, seconds; the trail's length as a share of the track (the track has
 * twenty pulses: about four), and the stretch at its front over which it
 * fades in (under one pulse).
 */
const LAP_S = 30
const TRAIL = 0.2
const FRONT = 0.035
/** The trail is drawn in pieces this long, frame units, each a little fainter than the one before. */
const PIECE = 6
/** The track measured into points this far apart, frame units. */
const STEP = 1
const STILL_COLOR = "rgba(198, 155, 92, 0.3)"

/**
 * Where the circles are seen: the author's outline round the pendant's foot,
 * from its neck down to under the deepest dip, made even about the axis
 * (x from the axis, y down the frame), its edge faded over `FEATHER` (a
 * Gaussian's sigma, frame units).
 */
const AXIS_X = FRAME_W / 2
const ZONE_HALF: [number, number][] = [
  [52, 781], [84, 861], [88, 921], [84, 991], [76, 1046], [52, 1086], [14, 1108],
]
const ZONE_D = (() => {
  const right = ZONE_HALF.map(([x, y]) => `${AXIS_X + x} ${y}`)
  const left = [...ZONE_HALF].reverse().map(([x, y]) => `${AXIS_X - x} ${y}`)
  return `M${[...right, ...left].join(" L")} Z`
})()
const FEATHER = 18

/**
 * The wave through the circles: seconds from before the innermost to past the
 * outermost, and how strong the circles either side of its middle one are.
 */
const WAVE_S = 12.5 // 9 when it ran from three circles before to three after, 10 with room for five; the same pace with room for nine
const SIDE = 0.3
/** The wave and the foot, as shares of the drawing's own strength (the author's asking: half, and 30% less). */
const WAVE_ALPHA = 0.5
const FOOT_ALPHA = 0.7
/** On a hover over the pendant: the line of pulses at this strength, its beat's extra light and spike height, and how fast it comes and goes. */
const TRACK_ALPHA = 0.2 // 0.3 until the author asked for it fainter, 2026-11-12
const TRACK_BEAT_LIGHT = 0.08 // 0.25, then 0.12, the same day: the author asked for a gentler beat, in light and in height
const TRACK_BEAT_AMP = 0.22 // 0.45 until then
const TRACK_LAG_S = 0.25
/** The wave's half-width in circles: one either side at rest (three seen), four on a hover (nine; five until 2026-11-12, the author's asking). */
const NARROW = 1
const WIDE = 4

/**
 * How strong circle `d` circles away from the wave's middle is seen whole,
 * for a wave `h` circles either side: 1 at its middle, SIDE at `h`, nothing
 * one further out.
 */
const strength = (d: number, h: number) => {
  const a = Math.abs(d)
  return a <= h ? 1 - ((1 - SIDE) * a) / h : a <= h + 1 ? SIDE * (h + 1 - a) : 0
}
/**
 * On a hover the nine fade one way only (2026-11-12, the author's asking): the
 * one leading the wave out, `WIDE` past its middle, is the strongest, and each
 * behind it a little fainter, down to `TAIL` at the ninth; nothing past them.
 * It comes in from nothing over the circle ahead of the leader.
 */
const TAIL = 0.1
const leading = (d: number) => {
  const k = WIDE - d // circles behind the leader
  if (k < -1 || k > 2 * WIDE + 1) return 0
  if (k < 0) return 1 + k
  if (k <= 2 * WIDE) return 1 - ((1 - TAIL) * k) / (2 * WIDE)
  return TAIL * (2 * WIDE + 1 - k)
}

export function SatoriPulse() {
  const ref = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const svg = svgRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !svg || !ctx) return
    const host = svg.parentElement

    // One screen pixel wide, however large the frame is drawn (the foot's SVG).
    const hairline = () => {
      const w = host?.clientWidth || 0
      if (w > 0) svg.style.strokeWidth = String(FRAME_W / w)
    }

    // The track, as points STEP apart (measured from its d: the browser's
    // own measure, a point at a time, froze the page for seconds).
    const { pts, n, total } = samplePath(PULSE.d, STEP)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = 0; i < n; i++) {
      x0 = Math.min(x0, pts[2 * i]); x1 = Math.max(x1, pts[2 * i])
      y0 = Math.min(y0, pts[2 * i + 1]); y1 = Math.max(y1, pts[2 * i + 1])
    }
    // The line of pulses about its circle: each point's distance from the
    // middle and its rise over the circle, which a beat makes larger.
    const radii = new Float32Array(n)
    for (let i = 0; i < n; i++) radii[i] = Math.hypot(pts[2 * i] - PULSE.cx, pts[2 * i + 1] - PULSE.cy)
    const base = Float32Array.from(radii).sort()[n >> 1] // the circle: most of the line lies on it
    let reach = 0
    for (let i = 0; i < n; i++) reach = Math.max(reach, radii[i] - base)
    // the box: the track's, with room for the stroke and for its spikes on the beat
    const pad = 6 + TRACK_BEAT_AMP * reach
    const box = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
    canvas.style.left = `${(box.x / FRAME_W) * 100}%`
    canvas.style.top = `${(box.y / FRAME_H) * 100}%`
    canvas.style.width = `${(box.w / FRAME_W) * 100}%`
    canvas.style.aspectRatio = `${box.w} / ${box.h}`

    // The circles, innermost first (the file has them outermost first).
    const circles = CORE.lines.map((l) => new Path2D(l.d)).reverse()
    const count = circles.length
    // The zone round the foot, feathered, at the canvas's size: the wave is cut
    // out of it, so the foot is never brighter than it is (`OUTSIDE`).
    const zone = document.createElement("canvas")
    const zoneD = new Path2D(ZONE_D)

    let scale = 1 // device pixels per frame unit
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
      hairline()
      // A Gaussian edge as the SVG's blur had it: the zone drawn far off the
      // canvas, only its shadow on it (a shadow's blur is twice its sigma).
      zone.width = w
      zone.height = h
      const z = zone.getContext("2d")
      if (!z) return
      const off = box.w + 4 * FEATHER
      z.setTransform(scale, 0, 0, scale, (-box.x - off) * scale, -box.y * scale)
      z.shadowColor = "#000"
      z.shadowBlur = 2 * FEATHER * scale
      z.shadowOffsetX = off * scale
      z.fillStyle = "#000"
      z.fill(zoneD)
    }
    size()

    const at = (i: number) => ((i % n) + n) % n
    const begin = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale)
      ctx.lineWidth = dpr / scale // one screen pixel
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (still) {
      // The circles round the foot only, still, and the track faint.
      const drawStill = () => {
        begin()
        ctx.strokeStyle = STILL_COLOR
        ctx.beginPath()
        for (let i = 0; i < n; i++) ctx[i ? "lineTo" : "moveTo"](pts[2 * i], pts[2 * i + 1])
        ctx.closePath()
        ctx.stroke()
      }
      drawStill()
      const ro = new ResizeObserver(() => {
        size()
        drawStill()
      })
      ro.observe(canvas)
      if (host) ro.observe(host)
      return () => ro.disconnect()
    }

    let shown = 0 // 0 → 1, a hover over the pendant coming in (see below)

    const fade = ctx.createRadialGradient(CORE.fade.cx, CORE.fade.cy, 0, CORE.fade.cx, CORE.fade.cy, CORE.fade.r)
    fade.addColorStop(0, `rgba(198, 155, 92, ${CORE.fade.peak})`)
    fade.addColorStop(1, "rgba(198, 155, 92, 0)")

    /** The wave through the circles, cut out of the zone round the foot. */
    const wave = (t: number) => {
      const w = ((t / WAVE_S) % 1) * (count + 2 * WIDE + 1) - (WIDE + 0.5)
      const h = NARROW + (WIDE - NARROW) * shown
      ctx.strokeStyle = fade
      let any = false
      for (let j = 0; j < count; j++) {
        // at rest even about its middle; on a hover, strongest at its lead
        const a = WAVE_ALPHA * (strength(j - w, h) * (1 - shown) + leading(j - w) * shown)
        if (a < 0.003) continue
        ctx.globalAlpha = a
        ctx.stroke(circles[j])
        any = true
      }
      ctx.globalAlpha = 1
      if (!any) return
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = "destination-out"
      ctx.drawImage(zone, 0, 0)
      ctx.restore()
    }

    // On a hover. Over the pendant: the line of pulses shows and beats.
    const frame = host
    const photo = frame?.querySelector<HTMLElement>(".sp-photo")
    let onPendant = false
    const enterPendant = (e: PointerEvent) => {
      if (e.pointerType === "mouse") onPendant = true
    }
    const leavePendant = () => {
      onPendant = false
    }
    photo?.addEventListener("pointerenter", enterPendant)
    photo?.addEventListener("pointerleave", leavePendant)

    const beaten = new Float32Array(n * 2)

    /** The line of pulses itself, while the pendant is hovered: still, beating. */
    const drawTrack = (t: number, dt: number) => {
      shown += ((onPendant ? 1 : 0) - shown) * (1 - Math.exp(-dt / TRACK_LAG_S))
      if (shown < 0.003) return
      const beat = heartbeat((((t / HEART_S) % 1) + 1) % 1)
      // Every spike higher and every trough lower together, about the circle.
      const amp = 1 + TRACK_BEAT_AMP * beat
      for (let i = 0; i < n; i++) {
        const r = radii[i]
        const k = r > 0 ? (base + (r - base) * amp) / r : 1
        beaten[2 * i] = PULSE.cx + (pts[2 * i] - PULSE.cx) * k
        beaten[2 * i + 1] = PULSE.cy + (pts[2 * i + 1] - PULSE.cy) * k
      }
      ctx.strokeStyle = `rgb(${LIGHT})`
      ctx.globalAlpha = shown * Math.min(1, TRACK_ALPHA + TRACK_BEAT_LIGHT * beat)
      ctx.beginPath()
      for (let i = 0; i < n; i++) ctx[i ? "lineTo" : "moveTo"](beaten[2 * i], beaten[2 * i + 1])
      ctx.closePath()
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const trail = Math.floor((TRAIL * total) / STEP)
    const front = Math.max(1, Math.floor((FRONT * total) / STEP))
    const piece = Math.max(1, Math.round(PIECE / STEP))
    /** The light running round the track. */
    const light = (t: number) => {
      const head = Math.floor(((t / LAP_S) % 1) * n)
      ctx.strokeStyle = `rgb(${LIGHT})`
      // From the head back: it fades in over the front, then out over the
      // trail, each piece a little fainter: the light lingers on the pulses it has passed.
      for (let k = 0; k < trail; k += piece) {
        const mid = k + piece / 2
        const f = 1 - mid / trail
        const g = Math.min(1, mid / front)
        ctx.globalAlpha = TRAIL_ALPHA * f * f * g * g * (3 - 2 * g)
        ctx.beginPath()
        const a = at(head - k)
        ctx.moveTo(pts[2 * a], pts[2 * a + 1])
        for (let j = 1; j <= piece; j++) {
          const b = at(head - k - j)
          ctx.lineTo(pts[2 * b], pts[2 * b + 1])
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    const draw = (t: number, dt: number) => {
      begin()
      wave(t)
      light(t)
      drawTrack(t, dt)
    }

    let on = false
    let t = 0
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      t += dt
      last = now
      draw(t, dt)
      raf = requestAnimationFrame(tick)
    }
    const ro = new ResizeObserver(() => {
      size()
      if (!on) draw(t, 0)
    })
    ro.observe(canvas)
    if (host) ro.observe(host)
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
    draw(t, 0)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      photo?.removeEventListener("pointerenter", enterPendant)
      photo?.removeEventListener("pointerleave", leavePendant)
    }
  }, [])

  return (
    <>
      {/* The circles round the pendant's foot: still, so drawn once. */}
      <svg
        ref={svgRef}
        aria-hidden
        viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
        fill="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          <radialGradient
            id="satori-pulse-fade"
            gradientUnits="userSpaceOnUse"
            cx={CORE.fade.cx}
            cy={CORE.fade.cy}
            r={CORE.fade.r}
          >
            <stop stopColor={GOLD} stopOpacity={CORE.fade.peak} />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <filter id="satori-pulse-feather" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={FEATHER} />
          </filter>
          <mask id="satori-pulse-zone" maskUnits="userSpaceOnUse" x="0" y="0" width={FRAME_W} height={FRAME_H}>
            <path d={ZONE_D} fill="white" filter="url(#satori-pulse-feather)" />
          </mask>
        </defs>
        <g stroke="url(#satori-pulse-fade)" strokeLinecap="round" strokeLinejoin="round">
          <g mask="url(#satori-pulse-zone)" opacity={FOOT_ALPHA}>
            {CORE.lines.map((l, i) => (
              <path key={i} d={l.d} />
            ))}
          </g>
        </g>
      </svg>
      <canvas ref={ref} aria-hidden style={{ position: "absolute", pointerEvents: "none" }} />
    </>
  )
}
