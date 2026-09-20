"use client"

import { useEffect, useRef } from "react"

/* --------------------------------------------------------------------------
   Rise and descend — the water at the seam.

   Where the Chess Set hero photograph ends and the white page begins there is
   a hard horizontal line, and the first caption under it reads "Rise and
   descend". Beads of water gather along that line, swell, sag and let go —
   some upward into the photograph, white; some downward into the page, in the
   ground colour. Each quickens as it goes, draws its light out behind it into
   a streak, thins, and is gone inside 240px, so the band never hardens into a
   border: it is the line coming apart, not a rule laid over it.

   It is the same water as the drips off the Waterfall figure in
   `particle-field.tsx` — the gather, the sag, the smear behind the head, the
   small chaser — with three differences. It runs both ways from a line
   instead of down from points of an artwork. The drops are an order larger
   (7px across at the biggest, against the sculpture's two), because here
   they carry the idea rather than merely wet a figure. And it works in CSS
   pixels rather than artwork units, since there is no artwork underneath it
   to scale with.

   The two halves never trespass, and that is what makes them read as coming
   *out of* the line rather than sitting on top of it: a white drop is only
   ever drawn above the seam and a dark one below it, so where a gathering
   bead sags across, the part that crosses is its own colour on its own colour
   and simply is not there. No clipping is needed, and none is done — which
   matters, because the one element a clip could hang on is
   `.chess-hero-media`, and that already crops the photograph on a phone.

   Canvas rather than elements. A few dozen drops in flight is a few dozen
   fills a frame; the same drops as DOM nodes would be a few dozen animated
   transforms, each asking the compositor for a layer of its own, on top of a
   page already carrying a 2667px photograph.
   -------------------------------------------------------------------------- */

/** How far from the line a drop gets before it is gone, in CSS pixels. */
const REACH = 240
/**
 * The same on a narrow screen, held to the same share of it that 92 was of
 * 120 — a phone has less room to give, and a band of the full depth would
 * read as a zone rather than as an edge giving way.
 */
const REACH_NARROW = 184
const NARROW_W = 640

/** Drop radius in CSS pixels — the largest is 7px across, the size asked for. */
const R_MIN = 1.4
const R_MAX = 3.5
const R_NARROW_MAX = 2.8
/** `rand()` is raised to this before it picks a size, so the big ones stay rare. */
const R_BIAS = 1.5
/** What a radius has thinned to by the end of its travel, as the drop gives way. */
const R_END = 0.55

/** Average CSS pixels between the points the water gathers at, and the jitter on it. */
const GAP = 54
const GAP_JITTER = 24

/** Seconds a bead takes to gather, randomised per bead in this range. */
const GATHER_MIN = 1.4
const GATHER_SPREAD = 4.2
/**
 * The last share of that time the bead is actually seen in. For the rest of
 * it the point is empty, which is the whole difference between a line that
 * breathes and a dotted rule: with a bead sitting at every point at every
 * moment, the seam read as a row of beads with a little water above and below
 * it, rather than as water gathering here and then there.
 */
const SWELL = 0.45
/**
 * Chance a drop is chased by a small quick one — the last of the water still
 * running to the same point — and how long that one takes to gather.
 */
const DOUBLE = 0.34
const FOLLOW_MIN = 0.22
const FOLLOW_SPREAD = 0.24
/** Chance a point sends its water both ways, turning about release by release. */
const BOTH_WAYS = 0.24

/**
 * The speed a drop comes away from the line at, how fast it quickens in
 * px/s², and the speed the air holds it to. At rest it crosses its 240px in
 * three and a half seconds: let go rather than thrown.
 *
 * The first of the three is what stops it creeping. Off a real edge a bead
 * does not start from nothing — it is already moving when the surface lets go
 * of it — and without that a drop spent its first second inside the bead it
 * came out of, which read as the line being beaded rather than as anything
 * leaving it.
 */
const V_0 = 18
const G = 40
const V_MAX = 82
/** A big drop goes a little harder than a small one; this scales both, by size. */
const PACE_MIN = 0.8
const PACE_SPREAD = 0.45

/**
 * Seconds of travel smeared out behind the head, and the cap on that streak.
 * Twice the Waterfall figure's, because these drops are ten times the size
 * and a tail in proportion to the head is what makes a drop read as drawn out
 * by its own falling rather than as a dot that happens to be moving.
 */
const SMEAR = 0.22
const TAIL_MAX = 46
/** How far the head itself is drawn out along its way, at full speed. */
const STRETCH = 0.9

/** Share of its reach a drop may come up short by, so they end at scattered heights. */
const SHORT = 0.3
/**
 * Above 1 a drop holds its light near the line and gives way further out,
 * which is what a drop dissolving in air does — and it keeps the fade from
 * reading as a grey gradient band lying parallel to the seam.
 */
const DECAY = 1.7
/** The most a drop is worth: white going up, the site's ground coming down. */
const PEAK = 0.85
const RISE_RGB = "255,255,255"
const FALL_RGB = "32,32,32"

/**
 * Scrolling quickens the water, as it quickens every field on the site — but
 * to twice its pace, not the eight times the Waterfall dots take. This one is
 * meant to be calm, and it runs under a caption the eye is reading.
 */
const MAX_BOOST = 2
const FULL_BOOST_SPEED = 1600
const RESPONSE = 0.025
/** Retina is worth it; 3x on a phone is not, for shapes this soft. */
const MAX_DPR = 2

/** Deterministic PRNG, so every visitor sees the same arrangement. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** CSS pixels a drop has travelled `t` seconds after letting go. */
function travelled(t: number, pace: number) {
  const v0 = V_0 * pace
  const g = G * pace
  const top = V_MAX * pace
  // Seconds of quickening before the air has it, and the ground it covered.
  const held = (top - v0) / g
  return t < held
    ? v0 * t + 0.5 * g * t * t
    : v0 * held + 0.5 * g * held * held + top * (t - held)
}

/** How fast it is going then. */
function speed(t: number, pace: number) {
  return Math.min(V_0 * pace + G * pace * t, V_MAX * pace)
}

type Drop = {
  /** Seconds since it let go. */
  t: number
  /** -1 rising, 1 descending. */
  dir: number
  r: number
  pace: number
  /** CSS pixels it travels before it is gone. */
  reach: number
}

type Source = {
  /** Along the seam, as a fraction of its width, so a resize only slides it. */
  fx: number
  dir: number
  both: boolean
  /** Seconds the hanging bead has been gathering, of the time it takes. */
  gathered: number
  gather: number
  r: number
  drops: Drop[]
}

export function SeamDrops() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let dpr = 1
    let cssW = 0
    let reach = REACH
    let rMax = R_MAX
    let columns = 0
    let sources: Source[] = []

    /** Small far more often than large, and never under the floor. */
    const size = (pick: () => number) =>
      R_MIN + Math.pow(pick(), R_BIAS) * (rMax - R_MIN)

    const build = (n: number) => {
      const pick = seeded(0x51de)
      const out: Source[] = []
      for (let i = 0; i < n; i++) {
        const gather = GATHER_MIN + pick() * GATHER_SPREAD
        out.push({
          fx: (i + 0.5) / n + ((pick() - 0.5) * GAP_JITTER) / (n * GAP),
          dir: pick() < 0.5 ? -1 : 1,
          both: pick() < BOTH_WAYS,
          // Part-way through, so the line doesn't let go all at once on arrival.
          gathered: pick() * gather,
          gather,
          r: size(pick),
          drops: [],
        })
      }
      return out
    }

    const measure = () => {
      const w = wrap.getBoundingClientRect().width
      if (!w) return
      const narrow = w < NARROW_W
      reach = narrow ? REACH_NARROW : REACH
      rMax = narrow ? R_NARROW_MAX : R_MAX
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      cssW = w
      canvas.style.top = `${-reach}px`
      canvas.style.height = `${reach * 2}px`
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(reach * 2 * dpr)
      // Sources hold their place as a fraction of the width, so a resize
      // slides them along the line rather than starting the water over. Only
      // a real change of density — a different column count — is worth
      // rebuilding for.
      const n = Math.max(3, Math.round(w / GAP))
      if (n !== columns || sources.length === 0) {
        columns = n
        sources = build(n)
      }
    }

    const rand = seeded(0x5eed)
    let boost = 0
    let scrolled = 0
    let last = performance.now()
    let lastY = window.scrollY
    let raf = 0
    let visible = false
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const onScroll = () => {
      const y = window.scrollY
      scrolled += Math.abs(y - lastY)
      lastY = y
    }

    const frame = (now: number) => {
      // Clamp so a backgrounded tab doesn't jump the clock forward on return.
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      // Scroll events are bursty, so turn them into a speed and let the boost
      // chase that target rather than react to each event.
      const pxPerSec = dt > 0 ? scrolled / dt : 0
      scrolled = 0
      const target = calm
        ? 0
        : Math.min(MAX_BOOST, (pxPerSec / FULL_BOOST_SPEED) * MAX_BOOST)
      boost += (target - boost) * (1 - Math.pow(1 - RESPONSE, dt * 60))
      const advance = dt * (1 + boost)

      if (cssW > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, cssW, reach * 2)
        ctx.lineCap = "round"
        const line = reach

        for (const s of sources) {
          const x = s.fx * cssW

          s.gathered += advance
          if (s.gathered >= s.gather) {
            const grown = (s.r - R_MIN) / (rMax - R_MIN)
            s.drops.push({
              t: s.gathered - s.gather,
              dir: s.dir,
              r: s.r,
              pace: PACE_MIN + PACE_SPREAD * grown,
              reach: reach * (1 - rand() * SHORT),
            })
            // Only a full drop is chased, so the small ones never run on.
            const follow = grown > 0.35 && rand() < DOUBLE
            s.gathered = 0
            s.gather = follow
              ? FOLLOW_MIN + rand() * FOLLOW_SPREAD
              : GATHER_MIN + rand() * GATHER_SPREAD
            s.r = follow ? R_MIN + rand() * (rMax - R_MIN) * 0.28 : size(rand)
            // A chaser is the same water and goes the same way; a fresh bead
            // at a point that runs both ways takes the other one.
            if (!follow && s.both) s.dir = -s.dir
          }

          // The bead, over the last `SWELL` of the wait. It swells as the
          // square root of its time, so it comes up quickly and then only
          // creeps, and it sags and draws out just before it goes.
          const p = Math.max(
            0,
            (s.gathered / s.gather - (1 - SWELL)) / SWELL,
          )
          if (p > 0) {
            const hang = s.r * Math.sqrt(p)
            ctx.fillStyle = `rgba(${s.dir < 0 ? RISE_RGB : FALL_RGB},${
              PEAK * (0.15 + 0.85 * p)
            })`
            ctx.beginPath()
            ctx.ellipse(
              x,
              line + s.dir * hang * (0.6 + 0.6 * p * p),
              hang,
              hang * (1 + 0.5 * p ** 4),
              0,
              0,
              Math.PI * 2,
            )
            ctx.fill()
          }

          let kept = 0
          for (const d of s.drops) {
            d.t += advance
            const dist = travelled(d.t, d.pace)
            if (dist >= d.reach) continue
            s.drops[kept++] = d

            const gone = dist / d.reach
            const rgb = d.dir < 0 ? RISE_RGB : FALL_RGB
            const alpha = PEAK * (1 - Math.pow(gone, DECAY))
            const r = d.r * (1 - (1 - R_END) * gone)
            // Let go from where the hanging bead had sagged to.
            const head = line + d.dir * (d.r * 1.2 + dist)
            const v = speed(d.t, d.pace) * (1 + boost)
            const tail = Math.min(TAIL_MAX, v * SMEAR)

            if (tail > r) {
              const back = head - d.dir * tail
              const grad = ctx.createLinearGradient(x, back, x, head)
              grad.addColorStop(0, `rgba(${rgb},0)`)
              grad.addColorStop(1, `rgba(${rgb},${alpha})`)
              ctx.strokeStyle = grad
              ctx.lineWidth = r * 1.5
              ctx.beginPath()
              ctx.moveTo(x, back)
              ctx.lineTo(x, head)
              ctx.stroke()
            }
            ctx.fillStyle = `rgba(${rgb},${alpha})`
            ctx.beginPath()
            ctx.ellipse(
              x,
              head,
              r,
              r * (1 + STRETCH * Math.min(1, v / V_MAX)),
              0,
              0,
              Math.PI * 2,
            )
            ctx.fill()
          }
          s.drops.length = kept
        }
      }

      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    measure()

    // The band is the thing to watch, not the zero-height wrapper: its drops
    // are still on screen for 240px after the seam itself has left.
    const io = new IntersectionObserver(
      ([entry]) => {
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
      { rootMargin: "0px" },
    )
    io.observe(canvas)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    // No height of its own: it sits in the flow between the two sections and
    // hangs its band symmetrically over the line they meet on, so neither
    // section has to make room and the seam stays exactly where it was.
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: "relative", height: 0, zIndex: 1 }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: 0,
          top: -REACH,
          width: "100%",
          height: REACH * 2,
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
