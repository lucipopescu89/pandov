"use client"

import { useEffect, useRef } from "react"
import PULSE from "@/lib/satori-pulse-2.json"
import CORE from "@/lib/satori-core-2.json"
import { HEART_S, heartbeat } from "@/lib/heartbeat"
import { canvasDpr, cometsFrom, ease, flush, level, lights, samplePath, skipFrame, stretch, type Gate, type LightCfg, type Pts } from "@/lib/satori-lights"
import { PLAY_EVENT, startsHover } from "@/components/satori-sun"

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
 * the zone's complement), so the foot is never brighter than it is. The foot
 * fades towards the sides, to nothing `LATERAL_R` from the axis (2026-11-13).
 *
 * The wave goes out calmly, at an even pace (for a while the same day it went
 * out in surges at the heartbeat; the author preferred it calm). The foot is
 * at `FOOT_ALPHA` of the drawing's gold, the wave at `WAVE_ALPHA` of it (both
 * brought down the same day).
 *
 * **On a hover over the pendant** (the author's asking, the same day), with a
 * mouse (on a phone, a tap: `satori-tap.tsx`):
 * - lights trace the circles, as Satori 3's drawing is traced (2026-11-13, the
 *   author's asking; until then the wave widened to nine circles, now gone):
 *   each circle is drawn by hand from where it comes nearest the pendant's
 *   body, one on either side, both ways round it, its lights riding the
 *   fronts and then running on; off the pendant it is drawn back, as the
 *   other three are (`DRAW_SPEED`, `UNDRAW_RATE`). The circles set out
 *   one after another from the neck down to the feet: the innermost, which
 *   passes 4 units from the figure's shoulders, first, the outermost, under
 *   its feet, last (`NEAREST`, `FRONT_SPEED`), at the others' pace. The wave goes on as at rest;
 * - the line of pulses itself shows, still, at 10% (`TRACK_ALPHA`), and its
 *   pulses beat together at the site's one heartbeat (`lib/heartbeat.ts`,
 *   Mother Nature's lub-dub): on each beat every spike rises higher and every
 *   trough sinks lower, about the line's circle (`TRACK_BEAT_AMP`), and the
 *   line brightens a little (`TRACK_BEAT_LIGHT`), the light still running round
 *   it. It comes and goes over `TRACK_LAG_S`. (For a while the same day the
 *   whole line grew on the beat, and the circle under the pointer was drawn
 *   whole; the author preferred this.)
 *
 * - the pendant and its circles come forward (2026-11-14, the author's
 *   asking): the pendant grows to `ZOOM_IN` about the circles' centre and
 *   rises a little (`ZOOM_LIFT`), the innermost circle with it, and the
 *   others follow one after another outward while their gold lines are
 *   being drawn (`ZOOM_STAGGER`), so it reads as one movement spreading out
 *   from the pendant. The outer circles grow less, down to `ZOOM_OUT` for
 *   the outermost, so they stay inside the line of pulses (at 130% the two
 *   outermost dips crossed it). The line of pulses and its light do not
 *   move. Each circle (and the pendant) is a spring, critically damped
 *   (`ZOOM_W`), so the movement starts the moment the pointer arrives,
 *   settles softly, and turns round smoothly if the pointer leaves mid-way.
 *   Off the pendant they go back outermost first, the pendant last, a little
 *   quicker (`ZOOM_W_BACK`). The zone round the foot moves with the pendant.
 *
 * The track and the circles are lib/satori-pulse-2.json and
 * lib/satori-core-2.json, in the frame's units. Lines are one screen pixel
 * wide, at any size. Everything is drawn on one canvas: the foot (an SVG until
 * 2026-11-14; its circles now move on a hover, so it is drawn on a scratch
 * canvas, cut by a feathered copy of the zone and the sideways fade made
 * once, and kept while the circles stand still), the wave, cut out of the
 * zone by a feathered copy of it made once (it was an SVG whose circles
 * changed every frame under two blurred masks, which the browser blurred
 * again every frame: the page was slow, 2026-11-12), the light and the track.
 * It runs only while the frame is on screen. Under reduced motion the
 * foot is drawn still, the track faint, and nothing comes forward.
 */

const FRAME_W = 1275
const FRAME_H = 1380

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
 * The circles round the foot fade sideways (2026-11-13, the author's asking,
 * with a sketch): as strong as they were along the axis, top and bottom, and
 * fading towards the left and the right until, `LATERAL_R` from the axis,
 * where the zone's feathered edge already had them gone, nothing is left. So
 * the V under the pendant stays and the strokes reaching out at its shoulders
 * go softly. A gradient across the frame over the foot, on top of the zone and
 * the drawing's own fade; the wave and the line of pulses are as they were.
 * The fall-off is a smoothstep. (The same morning it ran out to the outermost
 * circle's sides, 307, and changed next to nothing.)
 */
const LATERAL_R = 100
const lateral = (u: number) => {
  const a = Math.min(1, Math.abs(u))
  return 1 - a * a * (3 - 2 * a)
}
/** The gradient's stops across [axis − LATERAL_R, axis + LATERAL_R]: offset 0…1 and strength. */
const LATERAL_STOPS: [number, number][] = Array.from({ length: 21 }, (_, i) => {
  const o = i / 20
  return [o, +lateral(2 * o - 1).toFixed(4)]
})

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
const TRACK_ALPHA = 0.1 // 0.3, then 0.2 (2026-11-12), then half that (2026-11-13): the author asked for it fainter each time
const TRACK_BEAT_LIGHT = 0.04 // 0.25, then 0.12, then 0.08 on 2026-11-12, halved with the line on 2026-11-13
const TRACK_BEAT_AMP = 0.22 // 0.45 until then
const TRACK_LAG_S = 0.25
/**
 * The wave's half-width in circles: one either side (three seen). On a hover
 * it widened to `WIDE` either side (nine) until 2026-11-13; it no longer
 * does, but its pace is still reckoned with room for nine (`WAVE_S`).
 */
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
 * The lights round the circles on a hover: Satori 3's (`satori-core.tsx`),
 * brighter than the circles and faded towards the edge as they are.
 */
const LIGHT_PEAK = 0.85
const LIGHT_CFG: LightCfg = { trail: 320, front: 30, piece: 6, speed: 115 }
/** The circles are measured into points this far apart for the lights, frame units. */
const LIGHT_STEP = 2
/**
 * How fast the start goes down the body from one circle to the next, frame
 * units a second: Satori 3's `FRONT_SPEED`, so the circles set out from the
 * shoulders to under the feet in about a quarter of a second (0.13s a circle,
 * 1.3s in all, the first try that morning, was slow beside the others).
 */
const FRONT_SPEED = 520
/** Seconds the lights take to come, and to go on leaving the pendant. */
const LIGHT_IN_S = 0.2
const LIGHT_OUT_S = 0.35
/**
 * The circles are drawn by hand behind the lights, as Satori 3's drawing is
 * (2026-11-13, the author's asking: off the pendant the lights only went
 * out, where the other three draw their lines back): from where each comes
 * nearest the body, both ways, at `DRAW_SPEED` frame units a second (eased,
 * never under `DRAW_MIN_S`), the lights riding the fronts and then running
 * on; dimmed to `DIM` of the drawing's gold. Off the pendant they are drawn
 * back `UNDRAW_RATE` times faster, from wherever they had got to, and the
 * lights go out. Satori 3's numbers (`satori-core.tsx`).
 */
const DRAW_SPEED = 400
const DRAW_MIN_S = 0.5
const UNDRAW_RATE = 1.6
const DIM = 0.45
/**
 * Where each circle comes nearest the pendant's body, frame units along it
 * from its start (the foot of its dip, going right), in lib/satori-core-2.json's
 * order, outermost first; its mirror on the left is as far from the end.
 * Measured on the page against photo-2.avif's alpha (2026-11-13): no circle
 * passes behind the figure; the innermost comes within 4 units of it at the
 * shoulders (y 803), each next one a little lower, the outermost 84 units
 * under its feet (y 920). Measure again if the photograph or the circles move.
 */
const NEAREST = [174, 158, 144, 130, 118, 106, 94, 84, 76, 72, 68]
/** Those points, on the right (x, y), in the same order: the innermost's, by the shoulders, is where the drawing starts. */
const NEAREST_AT = [[691, 920], [686, 904], [682, 888], [677, 875], [674, 862], [670, 851], [667, 843], [664, 834], [661, 825], [660, 813], [658, 803]]
/** Each circle's start, its farthest front (up and round to its top) and its drawing's length, seconds. */
const RING_PLAN = CORE.lines.map((l, i) => {
  const reach = l.len / 2 - NEAREST[i]
  const [x0, y0] = NEAREST_AT[NEAREST_AT.length - 1]
  return {
    delay: Math.hypot(NEAREST_AT[i][0] - x0, NEAREST_AT[i][1] - y0) / FRONT_SPEED,
    reach,
    duration: Math.max(DRAW_MIN_S, reach / DRAW_SPEED),
  }
})
/** When the circles are whole on a hover, ms (for `SatoriTap`, which waits for it on a phone). */
export const PULSE_DRAWN_MS = Math.max(...RING_PLAN.map((r) => r.delay + r.duration)) * 1000

/**
 * Coming forward on a hover (2026-11-14, the author's asking): the pendant and
 * the innermost circle grow to `ZOOM_IN`, the outermost circle to `ZOOM_OUT`,
 * the ones between in proportion, all about the circles' centre (`PULSE.cx`,
 * `PULSE.cy`: the circles, the line of pulses and the drawing's fade share
 * it). At 1.3 for all, the two outermost circles' dips crossed the line of
 * pulses by up to 25 units; with the outermost at 1.15 they stay some 20
 * units inside it, its beat included.
 */
const ZOOM_IN = 1.3
const ZOOM_OUT = 1.15
/**
 * As it comes forward, the pendant and its circles rise by `ZOOM_LIFT` frame
 * units (2026-11-14, the author's asking, the same morning: grown about the
 * circles' centre alone, the figure seemed to lose height). With the lift the
 * circles stay some 30 units inside the line of pulses, top and bottom.
 */
const ZOOM_LIFT = 30
/**
 * Each circle sets out `ZOOM_STAGGER` seconds after the one inside it, the
 * pendant and the innermost first; off the pendant the outermost turns back
 * first, `ZOOM_STAGGER / ZOOM_BACK` apart, so all are on their way back within 0.3s. Each moves as a critically damped
 * spring of angular frequency `ZOOM_W` (back: `ZOOM_W_BACK`): it moves off at
 * once, with no wait, and settles without overshoot, about 95% of the way in
 * 1.5s (1.2s back). The first try the same morning ran every circle along one
 * eased clock, whose soft start (and a 0.3s ramp of its pace) read as a lag.
 */
const ZOOM_STAGGER = 0.09
const ZOOM_BACK = 3 // 1.3 at first: the pendant, last to be sent back, went on forward 0.7s after the pointer had left
const ZOOM_W = 3.2
const ZOOM_W_BACK = 4
/** Circle `k`'s scale at full forward (0 the innermost). */
const zoomTop = (k: number, count: number) => ZOOM_IN + ((ZOOM_OUT - ZOOM_IN) * k) / Math.max(1, count - 1)

export function SatoriPulse() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const host = canvas.parentElement

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
    // out of it, so the foot is never brighter than it is (`OUTSIDE`); and the
    // same zone faded sideways (`LATERAL_R`), through which the foot is seen.
    const zone = document.createElement("canvas")
    const footMask = document.createElement("canvas")
    // the foot itself, drawn here and kept while its circles stand still
    const foot = document.createElement("canvas")
    const fctx = foot.getContext("2d")
    const zoneD = new Path2D(ZONE_D)
    let footKey = "" // the scales the foot was last drawn at ("" : to be drawn)

    let scale = 1 // device pixels per frame unit
    let dpr = 1
    const size = () => {
      const cssW = canvas.getBoundingClientRect().width
      dpr = canvasDpr()
      const w = Math.max(1, Math.round(cssW * dpr))
      const h = Math.max(1, Math.round((w * box.h) / box.w))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      scale = w / box.w
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
      // the foot's mask: the zone, faded towards the sides
      footMask.width = w
      footMask.height = h
      const m = footMask.getContext("2d")
      if (m) {
        m.drawImage(zone, 0, 0)
        m.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale)
        const side = m.createLinearGradient(AXIS_X - LATERAL_R, 0, AXIS_X + LATERAL_R, 0)
        for (const [o, a] of LATERAL_STOPS) side.addColorStop(o, `rgba(0, 0, 0, ${a})`)
        m.globalCompositeOperation = "destination-in"
        m.fillStyle = side
        m.fillRect(box.x, box.y, box.w, box.h)
      }
      foot.width = w
      foot.height = h
      footKey = ""
    }
    size()

    /** The canvas's transform, grown `s` times about the circles' centre and raised `lift` frame units. */
    const zoomed = (c: CanvasRenderingContext2D, s: number, lift: number) =>
      c.setTransform(
        scale * s, 0, 0, scale * s,
        (PULSE.cx * (1 - s) - box.x) * scale,
        (PULSE.cy * (1 - s) - lift - box.y) * scale,
      )
    /** A mask made at the canvas's size, drawn grown `s` times about the circles' centre and raised `lift`. */
    const maskAt = (c: CanvasRenderingContext2D, mask: HTMLCanvasElement, s: number, lift: number) => {
      c.setTransform(s, 0, 0, s, (PULSE.cx - box.x) * scale * (1 - s), ((PULSE.cy - box.y) * (1 - s) - lift) * scale)
      c.drawImage(mask, 0, 0)
    }

    const at = (i: number) => ((i % n) + n) % n
    const begin = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale)
      ctx.lineWidth = dpr / scale // one screen pixel
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
    }

    /** The drawing's own gold, fading from the centre, in a context's frame units. */
    const fadeIn = (c: CanvasRenderingContext2D, peak: number) => {
      const g = c.createRadialGradient(CORE.fade.cx, CORE.fade.cy, 0, CORE.fade.cx, CORE.fade.cy, CORE.fade.r)
      g.addColorStop(0, `rgba(198, 155, 92, ${peak})`)
      g.addColorStop(1, "rgba(198, 155, 92, 0)")
      return g
    }
    const footFade = fctx ? fadeIn(fctx, CORE.fade.peak) : null

    /**
     * The circles round the pendant's foot, each at its own scale and lift
     * (innermost first), seen through the zone moved with the pendant (the
     * innermost's). Drawn on the scratch canvas only when one has moved, then
     * laid on.
     */
    const drawFoot = (sc: Float32Array, lf: Float32Array) => {
      if (!fctx || !footFade) return
      let key = ""
      for (let k = 0; k < count; k++) key += sc[k].toFixed(4) + ":" + lf[k].toFixed(2) + " "
      if (key !== footKey) {
        footKey = key
        fctx.setTransform(1, 0, 0, 1, 0, 0)
        fctx.globalCompositeOperation = "source-over"
        fctx.clearRect(0, 0, foot.width, foot.height)
        fctx.strokeStyle = footFade
        fctx.lineJoin = "round"
        fctx.lineCap = "round"
        for (let k = 0; k < count; k++) {
          zoomed(fctx, sc[k], lf[k])
          fctx.lineWidth = dpr / (scale * sc[k]) // still one screen pixel
          fctx.stroke(circles[k])
        }
        fctx.globalCompositeOperation = "destination-in"
        maskAt(fctx, footMask, sc[0], lf[0])
        fctx.globalCompositeOperation = "source-over"
      }
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = FOOT_ALPHA
      ctx.drawImage(foot, 0, 0)
      ctx.restore()
    }

    const rest = new Float32Array(count).fill(1)
    const none = new Float32Array(count)
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (still) {
      // The circles round the foot only, still, and the track faint.
      const drawStill = () => {
        begin()
        drawFoot(rest, none)
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

    const fade = fadeIn(ctx, CORE.fade.peak)

    /** The wave through the circles, each at its scale and lift, cut out of the zone round the foot (moved with the pendant). */
    const wave = (t: number, sc: Float32Array, lf: Float32Array) => {
      const w = ((t / WAVE_S) % 1) * (count + 2 * WIDE + 1) - (WIDE + 0.5)
      ctx.strokeStyle = fade
      let any = false
      for (let j = 0; j < count; j++) {
        const a = WAVE_ALPHA * strength(j - w, NARROW)
        if (a < 0.003) continue
        ctx.globalAlpha = a
        zoomed(ctx, sc[j], lf[j])
        ctx.lineWidth = dpr / (scale * sc[j])
        ctx.stroke(circles[j])
        any = true
      }
      ctx.globalAlpha = 1
      ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale)
      ctx.lineWidth = dpr / scale
      if (!any) return
      ctx.save()
      ctx.globalCompositeOperation = "destination-out"
      maskAt(ctx, zone, sc[0], lf[0])
      ctx.restore()
    }

    // On a hover. Over the pendant: the line of pulses shows and beats.
    const frame = host
    const photo = frame?.querySelector<HTMLElement>(".sp-photo")
    let onPendant = false
    const enterPendant = (e: Event) => {
      if (!startsHover(e)) return
      onPendant = true
    }
    const leavePendant = () => {
      onPendant = false
    }
    photo?.addEventListener("pointerenter", enterPendant)
    frame?.addEventListener(PLAY_EVENT, enterPendant)
    photo?.addEventListener("pointerleave", leavePendant)

    // The pendant comes forward about the circles' centre: its photograph is
    // grown from that point (its box is set by the page, `PHOTO_BOX`).
    if (photo) {
      // its box, in shares of the frame, as the page sets it
      const left = (parseFloat(photo.style.left) / 100) * FRAME_W
      const top = (parseFloat(photo.style.top) / 100) * FRAME_H
      const w = (parseFloat(photo.style.width) / 100) * FRAME_W
      const h = (parseFloat(photo.style.height) / 100) * FRAME_H
      if (w > 0 && h > 0) {
        photo.style.transformOrigin = `${(((PULSE.cx - left) / w) * 100).toFixed(3)}% ${(((PULSE.cy - top) / h) * 100).toFixed(3)}%`
        // on a layer of its own from the start, and kept there: added only for
        // the movement and dropped after it, the layer put the photograph a
        // pixel or so aside as it came and went (2026-11-14, the author's report)
        photo.style.willChange = "transform"
        photo.style.transform = "translateY(0%) scale(1)"
      }
    }
    // its height in frame units, for the lift (a share of it, as CSS takes it)
    const photoH = photo ? (parseFloat(photo.style.height) / 100) * FRAME_H : 0
    let photoP = 0
    const placePhoto = (p: number, s: number, lift: number) => {
      if (!photo || Math.abs(p - photoP) < 0.0002) return
      photoP = p
      if (p <= 0) {
        photo.style.transform = "translateY(0%) scale(1)"
      } else {
        const up = photoH > 0 ? (lift / photoH) * 100 : 0
        photo.style.transform = `translateY(${(-up).toFixed(3)}%) scale(${s.toFixed(4)})`
      }
    }

    // Coming forward: an intent that runs on with the hover and back off it
    // (seconds), which sends each circle, the innermost first, towards the
    // front or back (`ZOOM_STAGGER`), and each circle's way forward (0 → 1),
    // a spring towards where it is sent.
    const icEnd = (count - 1) * ZOOM_STAGGER + 0.001
    let ic = 0
    const zp = new Float32Array(count) // each circle's way forward, innermost first
    const zv = new Float32Array(count) // and its pace
    const sc = new Float32Array(count).fill(1) // each circle's scale
    const lf = new Float32Array(count) // and how far it has risen, frame units
    const tops = Array.from({ length: count }, (_, k) => zoomTop(k, count))
    const zoom = (dt: number) => {
      ic = onPendant ? Math.min(icEnd, ic + dt) : Math.max(0, ic - dt * ZOOM_BACK)
      for (let k = 0; k < count; k++) {
        const target = ic > k * ZOOM_STAGGER ? 1 : 0
        let p = zp[k]
        let v = zv[k]
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
          // at rest (or all the way forward) it is exactly there
          if (Math.abs(target - p) < 0.0004 && Math.abs(v) < 0.002) { p = target; v = 0 }
          zp[k] = p
          zv[k] = v
        }
        sc[k] = 1 + (tops[k] - 1) * zp[k]
        lf[k] = ZOOM_LIFT * zp[k]
      }
      placePhoto(zp[0], sc[0], lf[0])
    }

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
    const gather = lights(TRAIL_ALPHA)
    /** The light running round the track. */
    const light = (t: number) => {
      const head = Math.floor(((t / LAP_S) % 1) * n)
      ctx.strokeStyle = `rgb(${LIGHT})`
      // From the head back: it fades in over the front, then out over the
      // trail, each piece a little fainter: the light lingers on the pulses it has passed.
      // gathered into at most 32 strokes by strength (`flush`): a stroke a
      // piece was some 240 a frame, too many for an older phone
      for (let k = 0; k < trail; k += piece) {
        const mid = k + piece / 2
        const f = 1 - mid / trail
        const g = Math.min(1, mid / front)
        const path = level(gather, TRAIL_ALPHA * f * f * g * g * (3 - 2 * g))
        if (!path) continue
        const a = at(head - k)
        path.moveTo(pts[2 * a], pts[2 * a + 1])
        for (let j = 1; j <= piece; j++) {
          const b = at(head - k - j)
          path.lineTo(pts[2 * b], pts[2 * b + 1])
        }
      }
      flush(ctx, gather)
    }
    // The lights round the circles, on a hover.
    const rings: Pts[] = CORE.lines.map((l) => samplePath(l.d, LIGHT_STEP))
    // the same points grown with their circle as it comes forward (CORE's
    // order, outermost first: circle i is `sc[count - 1 - i]`)
    const grown: Pts[] = rings.map((l) => ({ ...l, pts: Float32Array.from(l.pts) }))
    const grownAt = new Float32Array(count) // the way forward each was last grown at
    const grow = () => {
      for (let i = 0; i < count; i++) {
        const k = count - 1 - i
        if (zp[k] === grownAt[i]) continue
        grownAt[i] = zp[k]
        const s = sc[k]
        const up = lf[k]
        const src = rings[i].pts
        const dst = grown[i].pts
        for (let q = 0; q < src.length; q += 2) {
          dst[q] = PULSE.cx + (src[q] - PULSE.cx) * s
          dst[q + 1] = PULSE.cy + (src[q + 1] - PULSE.cy) * s - up
        }
      }
    }
    const origins = rings.map((l, i) => {
      const per = l.total / l.n // frame units a point
      return [NEAREST[i] / per, (l.total - NEAREST[i]) / per]
    })
    // the drawing's fade, moved with the pendant so the circles keep their strength
    const fadeAt = (peak: string, s: number, up: number) => {
      const g = ctx.createRadialGradient(CORE.fade.cx, CORE.fade.cy - up, 0, CORE.fade.cx, CORE.fade.cy - up, CORE.fade.r * s)
      g.addColorStop(0, peak)
      g.addColorStop(1, peak.replace(/[\d.]+\)$/, "0)"))
      return g
    }
    let fadeP = -1
    let lineFade: CanvasGradient = fade
    let lightFade: CanvasGradient = fade
    const fadesAt = () => {
      if (zp[0] === fadeP) return
      fadeP = zp[0]
      lineFade = fadeAt(`rgba(198, 155, 92, ${CORE.fade.peak * DIM})`, sc[0], lf[0])
      lightFade = fadeAt(`rgba(${LIGHT}, ${LIGHT_PEAK})`, sc[0], lf[0])
    }
    const ringGather = lights()
    const drawnEnd = PULSE_DRAWN_MS / 1000
    let clock = 0 // seconds into the drawing: on with the hover, back faster off it
    let lit = 0 // the lights, 0 → 1
    const after = RING_PLAN.map(() => 0) // seconds each circle has been whole, for its lights to run on
    const ringLights = (dt: number) => {
      clock = onPendant ? Math.min(drawnEnd, clock + dt) : Math.max(0, clock - dt * UNDRAW_RATE)
      lit = onPendant ? Math.min(1, lit + dt / LIGHT_IN_S) : Math.max(0, lit - dt / LIGHT_OUT_S)
      if (clock <= 0 && lit <= 0) {
        after.fill(0)
        return
      }
      grow()
      fadesAt()
      // how far each circle's fronts have come from where it set out, frame units
      const fronts = RING_PLAN.map((r, i) => {
        const p = ease((clock - r.delay) / r.duration)
        after[i] = onPendant && p >= 1 ? after[i] + dt : p >= 1 ? after[i] : 0
        return p * r.reach
      })
      // the circles, drawn from where they set out: down to the foot of the dip, up and round to the top
      ctx.strokeStyle = lineFade
      ctx.beginPath()
      rings.forEach((l, i) => {
        const D = fronts[i]
        if (D <= 0) return
        const per = l.total / l.n
        const down = Math.min(D, NEAREST[i]) / per
        const up = Math.min(D, RING_PLAN[i].reach) / per
        const [right, left] = origins[i]
        stretch(ctx, grown[i], right - down, right + up)
        stretch(ctx, grown[i], left - up, left + down)
      })
      ctx.stroke()
      if (lit <= 0.003) return
      // the lights ride the fronts, then run on round
      ctx.strokeStyle = lightFade
      rings.forEach((l, i) => {
        if (fronts[i] <= 0) return
        const per = l.total / l.n
        const d = (fronts[i] + after[i] * LIGHT_CFG.speed) / per
        cometsFrom(ringGather, grown[i], origins[i], d, lit, LIGHT_CFG, per)
      })
      flush(ctx, ringGather)
    }

    const draw = (t: number, dt: number) => {
      zoom(dt)
      begin()
      wave(t, sc, lf)
      drawFoot(sc, lf)
      light(t)
      drawTrack(t, dt)
      ringLights(dt)
    }

    let on = false
    let t = 0
    let raf = 0
    let last = 0
    const gate: Gate = { at: 0 }
    const tick = (now: number) => {
      if (skipFrame(gate, now)) {
        raf = requestAnimationFrame(tick)
        return
      }
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
      frame?.removeEventListener(PLAY_EVENT, enterPendant)
      photo?.removeEventListener("pointerleave", leavePendant)
      if (photo) {
        photo.style.transform = ""
        photo.style.transformOrigin = ""
        photo.style.willChange = ""
      }
    }
  }, [])

  // The circles round the pendant's foot, the wave, the light and the line of
  // pulses: one canvas over the frame's box of the track.
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", pointerEvents: "none" }} />
}
