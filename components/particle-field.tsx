"use client"

import { useEffect, useRef } from "react"
import { revealPosition, revealStrip, type RevealLayer } from "@/lib/reveal"

const PARTICLES_PER_PATH = 36
/** Peak opacity, held between the fade in and the fade out. */
const PARTICLE_OPACITY = 0.2
/** Light and dark yellow, alternating for depth. */
const PARTICLE_COLORS = ["#f2e2a0", "#b8912f"]
/**
 * Seconds to cover `REF_LEN` at rest; randomised per dot in this range.
 * The range has been stretched twice from the 45-100s it was first tuned at —
 * 30% off the speed, then 35% off what was left — so the drift now runs at
 * 45% of that first pass. The scroll boost below multiplies this same speed,
 * so the quickened field slowed by exactly as much.
 */
const LAP_MIN = 98
const LAP_SPREAD = 122
/**
 * Seconds to cover `REF_LEN` for a falling field. Every dot is given this same
 * one — water comes down as a body, not as a crowd of stragglers — and it is
 * the quick end of the drift range, so the streams read as running rather than
 * hanging in the air.
 */
const FALL_LAP = LAP_MIN
/**
 * A rising stroke whose lowest point sits further than this share of its
 * length inside both ends is cut there in two: it is a loop hung under the
 * artwork, and the dots leave its bottom up both arms rather than climbing one
 * and sliding down the other.
 */
const SPLIT_EDGE = 0.05
/**
 * How close, in artwork units, a track's ends have to land on another's
 * reflection for the two to be taken as a mirrored pair.
 */
const MIRROR_TOLERANCE = 12
/**
 * The distance those times refer to: the mean Chaos path, the field this was
 * tuned against. Dots are given a speed rather than a lap rate, so a shorter
 * stroke carries them at the same pace instead of whipping them round it —
 * Waterfall's streams average 2483 units against Chaos's 3860, and a lap
 * apiece would have run them half as fast.
 */
const REF_LEN = 3860
/** Dot radius in the artwork's own units, before the section is scaled down. */
const R_MIN = 1
const R_SPREAD = 0.6
/**
 * Floor on the drawn radius, in CSS pixels. The artwork scales with the page,
 * so on a phone a dot would otherwise land well under one pixel and disappear.
 */
const R_MIN_CSS = 0.6
/** Fraction of a lap spent fading in, and the point where fading out begins. */
const FADE_IN = 0.12
const FADE_OUT = 0.85
/** Points sampled along each path. Interpolated between, so this is plenty. */
const SAMPLES = 240
/**
 * How much further apart, in artwork units, two samples may lie than the
 * length between them before the stroke is taken to lift the pen there.
 */
const LIFT = 2

/** Multiplier on the resting speed once you are scrolling hard. */
const MAX_BOOST = 8
/** Scroll speed, in px/s, that asks for the full boost. */
const FULL_BOOST_SPEED = 1600
/**
 * Fraction of the remaining gap closed each 60fps frame. Lower is lazier: the
 * boost eases toward what the scrolling is asking for rather than snapping to
 * it, so the field takes about a second to wind up and the same to wind down.
 */
const RESPONSE = 0.025
/** Retina is worth it; 3x on a phone is not, for dots this small. */
const MAX_DPR = 2

/**
 * Rain. Gold of the exported drops, the alpha at the tail of one, and the
 * brightest a head gets — the 0.8 group the export drew them in.
 */
const RAIN_RGB = "198,155,92"
const RAIN_TAIL = 0.17
const RAIN_PEAK = 0.8
/** Drops in flight per column: the export drew two staggered sets. */
const DROPS_PER_COLUMN = 2
/** Drop width in artwork units, and its floor in CSS pixels. */
const RAIN_W = 0.3
const RAIN_W_CSS = 0.5
/** Fraction of the fall spent coming up out of nothing. */
const RAIN_IN = 0.07
/**
 * How the rest of the fall loses its opacity. Above 1 it holds on near the
 * top and gives way lower down, which is what a drop dissolving in air does.
 */
const RAIN_DECAY = 1.4

/**
 * Water running off an artwork. A bead gathers where the water collects, lets
 * go and falls: how fast it quickens, in artwork units per second squared, and
 * the speed the air holds it to. At rest a drop off the hands is gone in about
 * four seconds — quicker than the streams pour, since a drop is let go rather
 * than carried — and scrolling quickens it with everything else.
 */
const DRIP_G = 60
const DRIP_VMAX = 120
/** Seconds a bead takes to gather, randomised per bead in this range. */
const DRIP_GATHER_MIN = 1.4
const DRIP_GATHER_SPREAD = 2.6
/**
 * Chance a drop is chased by a small quick one — the last of the water still
 * running to the tip — and how long that one takes to gather.
 */
const DRIP_DOUBLE = 0.3
const DRIP_FOLLOW_MIN = 0.25
const DRIP_FOLLOW_SPREAD = 0.2
/**
 * Seconds of travel smeared out behind a falling bead, so the faster it goes
 * the more it reads as a streak; capped, in artwork units, for hard scrolling.
 */
const DRIP_SMEAR = 0.12
const DRIP_TAIL_MAX = 60
/** Share of its fall a drop may come up short by, so they end at scattered heights. */
const DRIP_SHORT = 0.35
/**
 * As `RAIN_DECAY`: a drop holds its light near the top and thins out lower
 * down. Beads are otherwise the dots on the lines come loose — the smallest of
 * their size, one of their two yellows, and their opacity at the most.
 */
const DRIP_DECAY = 2

/** A drop's opacity, as a fraction of peak, at this point in its fall. */
function rainFade(phase: number) {
  if (phase < RAIN_IN) return phase / RAIN_IN
  return 1 - Math.pow((phase - RAIN_IN) / (1 - RAIN_IN), RAIN_DECAY)
}

/** Artwork units a bead has fallen `t` seconds after letting go. */
function fallen(t: number) {
  const held = DRIP_VMAX / DRIP_G
  return t < held
    ? 0.5 * DRIP_G * t * t
    : 0.5 * DRIP_VMAX * held + DRIP_VMAX * (t - held)
}

/**
 * A stretch of a stroke drawn without lifting the pen: its length, and its
 * points sampled into a flat [x,y,x,y,…] array between any two lengths along
 * it — either way round.
 */
type Stretch = {
  span: number
  sample: (from: number, to: number) => Float32Array
}

/**
 * Longest straight piece a curve is cut into when it is read off the path
 * data, in artwork units. At one unit the polyline's length is within a
 * hundred-thousandth of the curve's, well under anything a dot could show.
 */
const FLAT_STEP = 1
/** Cap on the pieces one curve is cut into, whatever its size. */
const FLAT_MAX = 1024

/**
 * A stroke's stretches, read straight off its `d` attribute.
 *
 * This is what the dots' tracks are measured with. The browser's own
 * `getPointAtLength` walks the path from its start on every call, so sampling
 * a track a few hundred times cost a few hundred walks: 310ms for Waterfall's
 * ten streams and 650ms for Chaos's eight strokes, on a desktop, all of it
 * before the page could do anything else — and twice over in development,
 * where React runs every effect twice. That was the page starting slowly.
 * Read here, each stroke is cut into a polyline once and every sample is a
 * lookup along it.
 *
 * The strokes are Figma's and the written tracks are ours, and between them
 * they use nothing but M, L and C; the other lines and curves are read too.
 * Anything else — an arc — returns null, and that stroke is measured the old
 * way instead (`domStretches`).
 *
 * A subpath that starts where the last one ended, within `LIFT`, carries on the
 * same stretch; one that starts anywhere else is a new stretch, as with a
 * mirrored pair exported as one path.
 */
function readStretches(d: string): Stretch[] | null {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)
  if (!tokens) return null

  const subpaths: number[][] = []
  let pts: number[] | null = null
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  // The last control point, for S and T, which reflect it.
  let ctrlX = 0
  let ctrlY = 0
  let prev = ""
  let cmd = ""
  let i = 0

  const num = () => {
    const v = Number(tokens[i++])
    if (!Number.isFinite(v)) throw new Error("bad path data")
    return v
  }
  const open = () => {
    if (!pts) {
      pts = [x, y]
      subpaths.push(pts)
    }
    return pts
  }
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const out = open()
    const net = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)
    const n = Math.min(FLAT_MAX, Math.max(4, Math.ceil(net / FLAT_STEP)))
    for (let k = 1; k <= n; k++) {
      const t = k / n
      const u = 1 - t
      out.push(
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      )
    }
    ctrlX = x2
    ctrlY = y2
    x = x3
    y = y3
  }
  const line = (x1: number, y1: number) => {
    open().push(x1, y1)
    x = x1
    y = y1
  }

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    else if (!cmd) return null
    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (cmd.toUpperCase()) {
      case "M": {
        x = ox + num()
        y = oy + num()
        startX = x
        startY = y
        pts = null
        // Further pairs after a moveto are linetos.
        cmd = rel ? "l" : "L"
        break
      }
      case "L":
        line(ox + num(), oy + num())
        break
      case "H":
        line(ox + num(), y)
        break
      case "V":
        line(x, oy + num())
        break
      case "C": {
        const x1 = ox + num()
        const y1 = oy + num()
        const x2 = ox + num()
        const y2 = oy + num()
        cubic(x1, y1, x2, y2, ox + num(), oy + num())
        break
      }
      case "S": {
        const smooth = /[CS]/i.test(prev)
        const x1 = smooth ? 2 * x - ctrlX : x
        const y1 = smooth ? 2 * y - ctrlY : y
        const x2 = ox + num()
        const y2 = oy + num()
        cubic(x1, y1, x2, y2, ox + num(), oy + num())
        break
      }
      case "Q":
      case "T": {
        const smooth = cmd.toUpperCase() === "T"
        const qx = smooth ? (/[QT]/i.test(prev) ? 2 * x - ctrlX : x) : ox + num()
        const qy = smooth ? (/[QT]/i.test(prev) ? 2 * y - ctrlY : y) : oy + num()
        const x3 = ox + num()
        const y3 = oy + num()
        // A quadratic is the cubic with its controls two thirds of the way
        // to the one control point.
        cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x3 + (2 / 3) * (qx - x3), y3 + (2 / 3) * (qy - y3), x3, y3)
        ctrlX = qx
        ctrlY = qy
        break
      }
      case "Z":
        line(startX, startY)
        pts = null
        break
      default:
        return null
    }
    prev = cmd
  }

  // Join each subpath onto the last where the pen was not really lifted.
  const joined: number[][] = []
  for (const sp of subpaths) {
    if (sp.length < 4) continue
    const last = joined[joined.length - 1]
    if (last && Math.hypot(sp[0] - last[last.length - 2], sp[1] - last[last.length - 1]) <= LIFT) {
      for (let k = 2; k < sp.length; k++) last.push(sp[k])
    } else {
      joined.push(sp)
    }
  }

  return joined.map((flat) => {
    const count = flat.length / 2
    const at = new Float64Array(count)
    for (let k = 1; k < count; k++) {
      at[k] = at[k - 1] + Math.hypot(flat[k * 2] - flat[k * 2 - 2], flat[k * 2 + 1] - flat[k * 2 - 1])
    }
    const span = at[count - 1]
    const pointAt = (len: number, out: Float32Array, o: number) => {
      const l = Math.max(0, Math.min(span, len))
      let lo = 1
      let hi = count - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (at[mid] < l) lo = mid + 1
        else hi = mid
      }
      const piece = at[lo] - at[lo - 1]
      const t = piece > 0 ? (l - at[lo - 1]) / piece : 1
      out[o] = flat[lo * 2 - 2] + (flat[lo * 2] - flat[lo * 2 - 2]) * t
      out[o + 1] = flat[lo * 2 - 1] + (flat[lo * 2 + 1] - flat[lo * 2 - 1]) * t
    }
    return {
      span,
      sample: (from: number, to: number) => {
        const out = new Float32Array(SAMPLES * 2)
        for (let k = 0; k < SAMPLES; k++) pointAt(from + ((to - from) * k) / (SAMPLES - 1), out, k * 2)
        return out
      },
    }
  })
}

/**
 * A stroke's stretches measured by the browser, for path data `readStretches`
 * does not read. Slow — see there — but exact for anything.
 */
function domStretches(path: SVGPathElement): Stretch[] {
  const len = path.getTotalLength()
  if (!len) return []
  return stretches(path, len).map(([from, to]) => ({
    span: to - from,
    sample: (a: number, b: number) => sample(path, from + a, from + b),
  }))
}

/**
 * Samples a stretch of a stroke into a flat [x,y,x,y,…] array, from `from` to
 * `to` along its length — either way round.
 */
function sample(path: SVGPathElement, from: number, to: number) {
  const pts = new Float32Array(SAMPLES * 2)
  for (let i = 0; i < SAMPLES; i++) {
    const pt = path.getPointAtLength(from + ((to - from) * i) / (SAMPLES - 1))
    pts[i * 2] = pt.x
    pts[i * 2 + 1] = pt.y
  }
  return pts
}

/** Turns a sampled track round in place. */
function reverse(pts: Float32Array) {
  for (let i = 0, j = pts.length / 2 - 1; i < j; i++, j--) {
    const x = pts[i * 2]
    const y = pts[i * 2 + 1]
    pts[i * 2] = pts[j * 2]
    pts[i * 2 + 1] = pts[j * 2 + 1]
    pts[j * 2] = x
    pts[j * 2 + 1] = y
  }
}

/**
 * The stretches of a stroke drawn without lifting the pen, as [from, to]
 * lengths along it. Figma exports a mirrored pair of lines as one path of two
 * subpaths — every one of Waterfall's streams is its left side and its right —
 * and `getPointAtLength` runs straight on from the end of one to the start of
 * the next. A dot sent along the whole path was carried across that gap in a
 * few frames, a speck flickering over the middle of the artwork, so each
 * stretch is made a track of its own.
 *
 * Along one stretch two points are never further apart than the length between
 * them, so a pair of samples that is marks a lift; it is then narrowed down by
 * halving to within a hundredth of a unit.
 */
function stretches(path: SVGPathElement, len: number) {
  const out: [number, number][] = []
  const step = len / (SAMPLES - 1)
  let start = 0
  let prev = path.getPointAtLength(0)
  for (let i = 1; i < SAMPLES; i++) {
    const pt = path.getPointAtLength(i * step)
    if (Math.hypot(pt.x - prev.x, pt.y - prev.y) > step + LIFT) {
      let lo = (i - 1) * step
      let hi = i * step
      let before = prev
      while (hi - lo > 0.01) {
        const mid = (lo + hi) / 2
        const m = path.getPointAtLength(mid)
        if (Math.hypot(m.x - before.x, m.y - before.y) > mid - lo + LIFT) {
          hi = mid
        } else {
          lo = mid
          before = m
        }
      }
      out.push([start, lo])
      start = hi
    }
    prev = pt
  }
  out.push([start, len])
  return out
}

/** Deterministic PRNG, so every visitor sees the same arrangement. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Particle = {
  track: number
  phase: number
  /** Laps per second at rest. */
  speed: number
  radius: number
  color: number
}

type Drop = {
  x: number
  /** Tail to head, in artwork units. */
  len: number
  phase: number
  /** Falls per second at rest. */
  speed: number
}

/**
 * Falling drops over an artwork: the columns they fall down, and the band of
 * the artwork's own y axis they cross. All in the artwork's units.
 */
export type RainSpec = {
  from: number
  to: number
  columns: { x: number; len: number }[]
}

/**
 * Where water runs off an artwork: the points a bead gathers at, and how far
 * down the artwork's y axis a drop from each gets before it is gone.
 */
export type DripSpec = { x: number; y: number; to: number }[]

type Bead = {
  /** Seconds since it let go. */
  t: number
  size: number
  color: number
  /** Artwork units it falls before it is gone. */
  fall: number
}

type DripSource = {
  x: number
  y: number
  fall: number
  /** Seconds the hanging bead has been gathering, of the time it takes. */
  gathered: number
  gather: number
  size: number
  color: number
  falling: Bead[]
}

/**
 * Sends dots travelling along an SVG artwork's own strokes, the way a point
 * traces a Lorenz attractor.
 *
 * The paths are measured once with `getPointAtLength` into flat coordinate
 * arrays, then the dots are drawn on a canvas laid over the artwork. The
 * earlier version animated real `<circle>` elements with SMIL, which meant
 * hundreds of DOM nodes and animation records being re-sampled on the main
 * thread every frame — smooth on a desktop, visibly choppy on an iPhone 8.
 * Sampled paths plus one canvas reduce a frame to a few hundred arc fills.
 *
 * Scrolling adds to a boost that eases back to nothing, so the field drifts
 * almost imperceptibly at rest and quickens while the page is moving. The loop
 * only runs while the artwork is on screen.
 *
 * `tracks` is the selector for the strokes the dots ride — Chaos hands over
 * every stroked path, Waterfall only its long streams, since dots crawling on
 * the sculpture's two-pixel details would read as dirt. `rain` adds falling
 * drops to the same canvas and the same frame, which is why Waterfall's
 * drops are here rather than animated as SVG nodes over the artwork.
 *
 * A `rise` field is a fall run backwards: every dot climbs from the bottom of
 * its stroke at the one shared speed. With `mirror` each track is paired with
 * its reflection and the two carry the same dots, so they leave the centre
 * line together. `reveal` lays the strokes `splitReveal` lifted out of the
 * artwork underneath it and slides their mask on this same clock, so the band
 * of light climbs at the dots' pace.
 *
 * An `along` field runs every dot the way its track was written, at that same
 * shared speed. Silence's rays are written from the pendant's ring outward.
 *
 * `drips` hangs beads of water off points of the drawing — Waterfall's figure,
 * wet from the fall — and lets each go in its own time, down the same canvas.
 */
export function ParticleField({
  html,
  className,
  style,
  label,
  tracks: trackSelector = "path[stroke]",
  flow = "drift",
  rain,
  drips,
  spacing,
  mirror,
  reveal,
}: {
  html: string
  className?: string
  style?: React.CSSProperties
  label?: string
  tracks?: string
  flow?: "drift" | "fall" | "rise" | "along"
  rain?: RainSpec
  drips?: DripSpec
  /**
   * Average artwork units between dots along a track. Unset, every stroke
   * carries `PARTICLES_PER_PATH` whatever its length, shared between its
   * stretches.
   */
  spacing?: number
  /** The x of the artwork's axis of symmetry, in its own units. */
  mirror?: number
  reveal?: RevealLayer
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const liftedRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const svg = artRef.current?.querySelector("svg")
    const ctx = canvas.getContext("2d")
    if (!svg || !ctx) return

    // Measure the chosen strokes into flat [x,y,x,y,…] arrays.
    const paths = Array.from(
      svg.querySelectorAll<SVGPathElement>(trackSelector),
    )
    const tracks: Float32Array[] = []
    const trackLens: number[] = []
    /** Each track's part of its stroke, by length, and so of its dots. */
    const trackShares: number[] = []
    /** Each track's mirrored partner, or -1. */
    const twins: number[] = []
    const tail = (SAMPLES - 1) * 2
    for (const path of paths) {
      let parts: Stretch[]
      try {
        parts = readStretches(path.getAttribute("d") ?? "") ?? domStretches(path)
      } catch {
        continue
      }
      const len = parts.reduce((sum, part) => sum + part.span, 0)
      if (!len) continue
      for (const part of parts) {
        const span = part.span
        if (span < 1) continue
        const share = span / len
        const pts = part.sample(0, span)
        // A rising field starts every dot at the bottom of its stroke. Where
        // the bottom is in the middle — Icarus's aura is a loop hung under the
        // pendant — the stroke is cut there and each arm becomes a track of
        // its own, both leaving from the one low point. The arms are each
        // other's reflection by construction.
        if (flow === "rise") {
          let low = 0
          for (let i = 1; i < SAMPLES; i++) {
            if (pts[i * 2 + 1] > pts[low * 2 + 1]) low = i
          }
          if (low > SAMPLES * SPLIT_EDGE && low < SAMPLES * (1 - SPLIT_EDGE)) {
            const at = (low / (SAMPLES - 1)) * span
            const n = tracks.length
            tracks.push(part.sample(at, 0), part.sample(at, span))
            trackLens.push(at, span - at)
            trackShares.push(share, share)
            twins.push(n + 1, n)
            continue
          }
        }
        // A falling field has to run down the artwork whichever way the stroke
        // happened to be drawn, and Figma's streams alternate direction; a
        // rising one up it. The dots only ever travel a track forwards, so the
        // track itself is turned round. Comparing the ends is enough for
        // strokes that sweep one way.
        if (
          (flow === "fall" && pts[1] > pts[tail + 1]) ||
          (flow === "rise" && pts[1] < pts[tail + 1])
        ) {
          reverse(pts)
        }
        tracks.push(pts)
        trackLens.push(span)
        trackShares.push(share)
        twins.push(-1)
      }
    }
    if (tracks.length === 0 && !rain && !reveal && !drips) return

    // Pair every other track with the one lying on its reflection, ends to ends.
    if (mirror !== undefined) {
      for (let t = 0; t < tracks.length; t++) {
        if (twins[t] >= 0) continue
        const a = tracks[t]
        for (let u = t + 1; u < tracks.length; u++) {
          if (twins[u] >= 0) continue
          const b = tracks[u]
          const off =
            Math.hypot(2 * mirror - a[0] - b[0], a[1] - b[1]) +
            Math.hypot(2 * mirror - a[tail] - b[tail], a[tail + 1] - b[tail + 1])
          if (off < MIRROR_TOLERANCE) {
            twins[t] = u
            twins[u] = t
            break
          }
        }
      }
    }

    const rand = seeded(0x5eed)
    /** Artwork units per second, at rest. */
    const unitSpeed = () =>
      REF_LEN / (flow === "drift" ? LAP_MIN + rand() * LAP_SPREAD : FALL_LAP)

    const particles: Particle[] = []
    const sets: Particle[][] = []
    for (let t = 0; t < tracks.length; t++) {
      // A reflection takes its partner's dots as they are, speed in laps
      // included, so the pair stay in step however long the page is open.
      const twin = mirror !== undefined ? twins[t] : -1
      if (twin >= 0 && twin < t) {
        sets[t] = sets[twin].map((p) => ({ ...p, track: t }))
        particles.push(...sets[t])
        continue
      }
      // Unspaced, a stroke's dots are dealt out between its stretches by
      // length, so a pair exported as one path is no denser for being split.
      const count = spacing
        ? Math.max(2, Math.round(trackLens[t] / spacing))
        : Math.max(2, Math.round(PARTICLES_PER_PATH * trackShares[t]))
      sets[t] = []
      for (let i = 0; i < count; i++) {
        sets[t].push({
          track: t,
          // Spaced dots are few to a stroke, so each is dealt its own share of
          // the lap rather than left to bunch.
          phase: spacing ? (i + rand()) / count : rand(),
          speed: unitSpeed() / trackLens[t],
          radius: R_MIN + rand() * R_SPREAD,
          color: rand() < 0.5 ? 0 : 1,
        })
      }
      particles.push(...sets[t])
    }
    // Grouped by colour so the loop sets fillStyle twice, not once per dot.
    particles.sort((a, b) => a.color - b.color)

    const fall = rain ? rain.to - rain.from : 0
    const drops: Drop[] = []
    if (rain) {
      for (const col of rain.columns) {
        for (let i = 0; i < DROPS_PER_COLUMN; i++) {
          drops.push({
            x: col.x,
            len: col.len,
            // Spread over the fall, so a column is never empty on arrival.
            phase: (i / DROPS_PER_COLUMN + rand() / DROPS_PER_COLUMN) % 1,
            speed: unitSpeed() / fall,
          })
        }
      }
    }

    const beadSize = () => 0.85 + rand() * 0.3
    const sources: DripSource[] = (drips ?? []).map((d) => {
      const gather = DRIP_GATHER_MIN + rand() * DRIP_GATHER_SPREAD
      return {
        x: d.x,
        y: d.y,
        fall: d.to - d.y,
        // Part-way through, so the points don't all let go together on arrival.
        gathered: rand() * gather,
        gather,
        size: beadSize(),
        color: rand() < 0.5 ? 0 : 1,
        falling: [],
      }
    })

    const box = svg.viewBox.baseVal
    let dpr = 1
    let scale = 0
    let cssW = 0
    let cssH = 0

    const measure = () => {
      const rect = svg.getBoundingClientRect()
      if (!rect.width || !box.width) return
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      cssW = rect.width
      cssH = rect.height
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      scale = cssW / box.width
    }

    let boost = 0
    let scrolled = 0
    let last = performance.now()
    let lastY = window.scrollY
    let raf = 0
    let visible = false

    const lifted = reveal ? liftedRef.current : null
    /** Artwork units the band has climbed. */
    let travel = 0

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const onScroll = () => {
      const y = window.scrollY
      scrolled += Math.abs(y - lastY)
      lastY = y
    }

    const frame = (now: number) => {
      // Clamp so a backgrounded tab doesn't jump the clock forward on return,
      // and so the first frame never runs it backwards: a frame's timestamp is
      // when the frame began, which can be a moment before `last` was taken.
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000))
      last = now

      // Scroll events are bursty, so turn them into a speed and let the boost
      // chase that target instead of reacting to each event directly.
      const pxPerSec = dt > 0 ? scrolled / dt : 0
      scrolled = 0
      const target = calm
        ? 0
        : Math.min(MAX_BOOST, (pxPerSec / FULL_BOOST_SPEED) * MAX_BOOST)
      boost += (target - boost) * (1 - Math.pow(1 - RESPONSE, dt * 60))
      const advance = dt * (1 + boost)

      if (scale > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, cssW, cssH)
        let painted = -1
        for (const p of particles) {
          p.phase += advance * p.speed
          if (p.phase >= 1) p.phase -= 1

          const phase = p.phase
          const fade =
            phase < FADE_IN
              ? phase / FADE_IN
              : phase > FADE_OUT
                ? (1 - phase) / (1 - FADE_OUT)
                : 1

          const track = tracks[p.track]
          const at = phase * (SAMPLES - 1)
          const i = at | 0
          const t = at - i
          const j = i + 1 < SAMPLES ? i + 1 : i
          const x = track[i * 2] + (track[j * 2] - track[i * 2]) * t
          const y = track[i * 2 + 1] + (track[j * 2 + 1] - track[i * 2 + 1]) * t

          if (p.color !== painted) {
            painted = p.color
            ctx.fillStyle = PARTICLE_COLORS[painted]
          }
          ctx.globalAlpha = fade * PARTICLE_OPACITY
          ctx.beginPath()
          ctx.arc(
            (x - box.x) * scale,
            (y - box.y) * scale,
            Math.max(R_MIN_CSS, p.radius * scale),
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }

        // The drops come after the dots, drawn as the export had them: a
        // hairline tapering from a pale tail to a gold head.
        if (rain) {
          ctx.lineWidth = Math.max(RAIN_W_CSS, RAIN_W * scale)
          for (const d of drops) {
            d.phase += advance * d.speed
            if (d.phase >= 1) d.phase -= 1

            const x = (d.x - box.x) * scale
            const head = (rain.from + fall * d.phase - box.y) * scale
            const tail = head - Math.max(1, d.len * scale)
            const grad = ctx.createLinearGradient(x, tail, x, head)
            grad.addColorStop(0, `rgba(${RAIN_RGB},${RAIN_TAIL})`)
            grad.addColorStop(1, `rgba(${RAIN_RGB},1)`)
            ctx.strokeStyle = grad
            ctx.globalAlpha = rainFade(d.phase) * RAIN_PEAK
            ctx.beginPath()
            ctx.moveTo(x, tail)
            ctx.lineTo(x, head)
            ctx.stroke()
          }
        }

        // Water off the figure. At each point a bead swells and sags until it
        // lets go, then falls quickening, its light drawn out behind it, and
        // thins into the air before the end of its fall.
        for (const s of sources) {
          s.gathered += advance
          if (s.gathered >= s.gather) {
            s.falling.push({
              t: s.gathered - s.gather,
              size: s.size,
              color: s.color,
              fall: s.fall * (1 - rand() * DRIP_SHORT),
            })
            // Only a full drop is chased, so the small ones never run on.
            const follow = s.size > 0.8 && rand() < DRIP_DOUBLE
            s.gathered = 0
            s.gather = follow
              ? DRIP_FOLLOW_MIN + rand() * DRIP_FOLLOW_SPREAD
              : DRIP_GATHER_MIN + rand() * DRIP_GATHER_SPREAD
            s.size = follow ? 0.55 + rand() * 0.15 : beadSize()
            // A chaser is the same water; a fresh bead catches either light.
            if (!follow) s.color = rand() < 0.5 ? 0 : 1
          }

          const x = (s.x - box.x) * scale
          const top = (s.y - box.y) * scale

          const p = s.gathered / s.gather
          const hanging =
            Math.max(R_MIN_CSS, R_MIN * s.size * scale) * Math.sqrt(p)
          ctx.fillStyle = PARTICLE_COLORS[s.color]
          ctx.globalAlpha = PARTICLE_OPACITY * (0.3 + 0.7 * p)
          ctx.beginPath()
          ctx.ellipse(
            x,
            top + hanging * (0.6 + 0.6 * p * p),
            hanging,
            hanging * (1 + 0.5 * p ** 4),
            0,
            0,
            Math.PI * 2,
          )
          ctx.fill()

          let kept = 0
          for (const b of s.falling) {
            b.t += advance
            const d = fallen(b.t)
            if (d >= b.fall) continue
            s.falling[kept++] = b

            const r = Math.max(R_MIN_CSS, R_MIN * b.size * scale)
            const color = PARTICLE_COLORS[b.color]
            // Let go from where the hanging bead had sagged to.
            const head = top + r * 1.2 + d * scale
            const speed = Math.min(DRIP_G * b.t, DRIP_VMAX) * (1 + boost)
            const tail = Math.min(DRIP_TAIL_MAX, speed * DRIP_SMEAR) * scale
            ctx.globalAlpha =
              (1 - Math.pow(d / b.fall, DRIP_DECAY)) * PARTICLE_OPACITY
            if (tail > r) {
              const grad = ctx.createLinearGradient(x, head - tail, x, head)
              grad.addColorStop(0, `${color}00`)
              grad.addColorStop(1, color)
              ctx.strokeStyle = grad
              ctx.lineWidth = r * 1.2
              ctx.beginPath()
              ctx.moveTo(x, head - tail)
              ctx.lineTo(x, head)
              ctx.stroke()
            }
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(x, head, r, 0, Math.PI * 2)
            ctx.fill()
          }
          s.falling.length = kept
        }
        ctx.globalAlpha = 1
      }

      // The band climbs at the pace the dots run their tracks and quickens
      // with them. Moving it slides the mask down the strokes' layer, which
      // paints the mask again but not the strokes, so it is written every frame.
      if (lifted && reveal) {
        travel += (advance * REF_LEN) / FALL_LAP
        const at = revealPosition(reveal, travel)
        lifted.style.setProperty("mask-position", at)
        lifted.style.setProperty("-webkit-mask-position", at)
      }

      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    measure()

    const io = new IntersectionObserver(
      (entries) => {
        // The newest entry, not the first. When the page is busy the observer
        // can hold back more than one for the same element and deliver them
        // together, oldest first — off screen, then on. Reading only the first
        // left the field believing it was still off screen while it was in
        // view, its loop never started and its dots never appeared, until
        // scrolling away and back or reloading.
        const entry = entries[entries.length - 1]
        if (entry.isIntersecting === visible) return
        visible = entry.isIntersecting
        if (visible) {
          last = performance.now()
          lastY = window.scrollY
          scrolled = 0
          raf = requestAnimationFrame(frame)
        } else {
          cancelAnimationFrame(raf)
          raf = 0
        }
      },
      // No margin: a section's loop, and its band with it, stops the moment
      // the artwork is off screen. With one, Icarus kept running while
      // Waterfall's pendant filled a phone's screen, and Chaos alongside them.
      { rootMargin: "0px" },
    )
    io.observe(wrap)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [trackSelector, flow, rain, drips, spacing, mirror, reveal])

  return (
    <div ref={wrapRef} aria-label={label} className={className} style={style}>
      {/* The lifted strokes at full light, seen through the mask that holds
          them dim everywhere but the band. A layer of their own, so sliding
          the mask never has the strokes painted again. */}
      {reveal && (
        <div
          ref={liftedRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            maskImage: reveal.mask,
            WebkitMaskImage: reveal.mask,
            maskSize: `100% ${revealStrip(reveal) * 100}%`,
            WebkitMaskSize: `100% ${revealStrip(reveal) * 100}%`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: revealPosition(reveal, 0),
            WebkitMaskPosition: revealPosition(reveal, 0),
            willChange: "transform",
          }}
          dangerouslySetInnerHTML={{ __html: reveal.strokes }}
        />
      )}
      {/* Positioned, so it paints over the layers before it. */}
      <div ref={artRef} style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: html }} />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
