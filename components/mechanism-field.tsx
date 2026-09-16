"use client"

import { useEffect, useRef } from "react"
import type { MechanismLayer, Motion, ViewBox } from "@/lib/mechanism"

/** Seconds for one heartbeat at rest. */
const HEART_S = 2.2
/** Seconds between a wave ring's pulses: each of its dots sets off once a cycle. */
const WAVE_S = 6
/**
 * Seconds a dot takes from first light to gone. Longer than a cycle, so a
 * dot's last journey is still drifting out when its next one begins.
 */
const WAVE_LIFE_S = 10.8
/** Seconds a dot spends brightening where it sits, before it sets off. */
const WAVE_SURFACE_S = 0.9
/** Share of the journey out spent pulling away from rest, up to top speed. */
const JOURNEY_RAMP = 0.15
/** The slowest a dot drifts at the very end, as a share of its top speed. */
const JOURNEY_FLOOR = 0.1
/** Samples in the journey's distance-against-time table. */
const JOURNEY_SAMPLES = 256
/**
 * How much shorter than the full reach a dot's journey may be, at a scatter
 * of 1. It shrinks with the scatter, so a ring that moves as one stays whole.
 */
const REACH_SPREAD = 0.6
/** Scroll speed, in px/s, that reads as scrolling hard. */
const FULL_BOOST_SPEED = 1600
/** Spin multiplier added at full scroll, for rings with `scrollSpin`. */
const SPIN_BOOST = 6
/** Pulse-rate multiplier added at full scroll, for rings with `scrollPulse`. */
const PULSE_BOOST = 1.2
/**
 * Fraction of the remaining gap closed each 60fps frame. Lower is lazier, so
 * the mechanism winds up over a second or two rather than jumping.
 */
const RESPONSE = 0.025
/** Samples taken along the heartbeat curve to build its keyframes. */
const HEART_SAMPLES = 32
/**
 * Seconds the light a beat leaves behind takes to fall to half. Long enough
 * that the ripple running outward is a band of light crossing the mandala, not
 * a ring flashing on its own.
 */
const GLOW_FALL_S = 0.75
/** Retina is worth it on the wave canvas; 3x on a phone is not, for dots this small. */
const MAX_DPR = 2
/**
 * Pixels per artwork unit a wave ring is rasterised at, at the least, before
 * its dots are cut out. The two dots of a pair are barely two units apart, so
 * at a phone's scale they share pixels; each is cut apart at this finer scale
 * and only then shrunk onto its own sprite.
 */
const CUT_SCALE = 2
/** Artwork units kept around a dot as it is cut: its stroke and soft edge, short of its neighbour. */
const CUT_PAD = 1
/** Clear pixels around each sprite, so its edge can soften without being cut. */
const SPRITE_MARGIN_PX = 1.5
/** Artwork units kept clear beyond the waves' furthest reach. */
const FIELD_MARGIN = 4
/** Cut the wave sprites again once a resize has moved the scale this far from theirs. */
const REBUILD_DRIFT = 0.15

/** A dot's life, in cycles. */
const WAVE_LIFE = WAVE_LIFE_S / WAVE_S
/** Share of a dot's life spent brightening where it sits. */
const WAVE_SURFACE = WAVE_SURFACE_S / WAVE_LIFE_S

/** Lub-dub: a strong beat, a softer echo, then rest. 0 → 1 → 0 over a period. */
function heartbeat(t: number): number {
  const lub = Math.exp(-(((t - 0.15) / 0.055) ** 2))
  const dub = 0.55 * Math.exp(-(((t - 0.33) / 0.07) ** 2))
  return Math.min(1, lub + dub)
}

/**
 * The beat again, with the light of every beat before it still draining away.
 * A ring snaps back to its own size the moment a beat has passed, but the
 * brightness it left behind leaves slowly, so rings lagged one behind the next
 * read as a single band of light travelling outward rather than as rings
 * blinking in turn.
 */
function afterglow(beats: number[]): number[] {
  const decay = Math.pow(0.5, HEART_S / beats.length / GLOW_FALL_S)
  const light = beats.slice()
  // Twice around the cycle, so the tail of the last beat is already lighting
  // the ring as the next one arrives.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < light.length; i++) {
      light[i] = Math.max(light[i], light[(i + light.length - 1) % light.length] * decay)
    }
  }
  return light
}

const BEATS = Array.from({ length: HEART_SAMPLES }, (_, i) => heartbeat(i / HEART_SAMPLES))
const LIGHT = afterglow(BEATS)

function heartKeyframes({ grow = 0, dim }: Motion): Keyframe[] {
  return Array.from({ length: HEART_SAMPLES + 1 }, (_, i) => {
    // The last frame repeats the first, so the cycle closes on itself.
    const at = i % HEART_SAMPLES
    const frame: Keyframe = { offset: i / HEART_SAMPLES }
    if (grow) frame.transform = `scale(${1 + grow * BEATS[at]})`
    if (dim !== undefined) frame.opacity = dim + (1 - dim) * LIGHT[at]
    return frame
  })
}

function smoothstep(from: number, to: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)))
  return x * x * (3 - 2 * x)
}

/**
 * The journey out: distance covered (0 → 1) at evenly spaced moments (0 → 1).
 * A dot pulls away from rest, is at its quickest a little way out, then slows
 * in step with the distance still ahead of it, like something meeting drag, so
 * it all but hangs in the void as it fades. Its speed never drops below
 * JOURNEY_FLOOR of the top speed, so it does arrive.
 */
const JOURNEY = (() => {
  const speed = (d: number) =>
    Math.sqrt(Math.min(1, d / JOURNEY_RAMP)) * Math.max((1 - d) / (1 - JOURNEY_RAMP), JOURNEY_FLOOR)
  // The time taken to reach each of a fine run of distances.
  const steps = JOURNEY_SAMPLES * 8
  const reachedAt = new Float64Array(steps + 1)
  for (let i = 1; i <= steps; i++) {
    reachedAt[i] = reachedAt[i - 1] + 1 / steps / speed((i - 0.5) / steps)
  }
  // Turned around: the distance reached at evenly spaced moments.
  const total = reachedAt[steps]
  const table = new Float32Array(JOURNEY_SAMPLES + 1)
  for (let k = 0, i = 0; k <= JOURNEY_SAMPLES; k++) {
    const time = (k / JOURNEY_SAMPLES) * total
    while (i < steps - 1 && reachedAt[i + 1] < time) i++
    const span = reachedAt[i + 1] - reachedAt[i]
    table[k] = (i + (span > 0 ? (time - reachedAt[i]) / span : 0)) / steps
  }
  table[JOURNEY_SAMPLES] = 1
  return table
})()

/** How much of its journey a dot has covered, given how much of its travelling time has passed. */
function journey(u: number): number {
  const at = Math.min(1, Math.max(0, u)) * JOURNEY_SAMPLES
  const i = Math.min(JOURNEY_SAMPLES - 1, Math.floor(at))
  return JOURNEY[i] + (JOURNEY[i + 1] - JOURNEY[i]) * (at - i)
}

/*
 * A dot's life at τ (0 → 1). It brightens where it sits, then makes its
 * journey out. Its opacity falls in a straight line with the distance covered,
 * so it is gone exactly at its reach — and it is invisible at both ends of its
 * life, so its return to the start is never seen.
 */

/** How far out the dot has got, as a share of its reach. */
function waveOut(tau: number): number {
  return tau < WAVE_SURFACE ? 0 : journey((tau - WAVE_SURFACE) / (1 - WAVE_SURFACE))
}

/** How visible the dot is, given how far out it has got. */
function waveAlpha(tau: number, out: number): number {
  return tau < WAVE_SURFACE ? smoothstep(0, WAVE_SURFACE, tau) : 1 - out
}

/** Deterministic PRNG, so every visitor sees the same scatter. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function setRate(animations: Animation[], rate: number) {
  for (const a of animations) {
    // updatePlaybackRate keeps compositor-driven animations in step, without
    // the hitch that assigning playbackRate directly can cause.
    if (typeof a.updatePlaybackRate === "function") a.updatePlaybackRate(rate)
    else a.playbackRate = rate
  }
}

type Field = { x0: number; y0: number; x1: number; y1: number }

/** The box, in artwork units, that every wave covers on its way out; null without waves. */
function waveField(layers: MechanismLayer[]): Field | null {
  let field: Field | null = null
  for (const layer of layers) {
    if (layer.motion.pulse !== "wave") continue
    const out = (layer.motion.reach ?? 0) + FIELD_MARGIN
    const x0 = layer.x - out
    const y0 = layer.y - out
    const x1 = layer.x + layer.size + out
    const y1 = layer.y + layer.size + out
    field = field
      ? {
          x0: Math.min(field.x0, x0),
          y0: Math.min(field.y0, y0),
          x1: Math.max(field.x1, x1),
          y1: Math.max(field.y1, y1),
        }
      : { x0, y0, x1, y1 }
  }
  return field
}

/** A ring's inline SVG as a standalone image, `size` pixels square. */
function svgImage(svg: string, size: number): string {
  const standalone = svg.replace(/^<svg\b[^>]*>/, (open) =>
    open
      .replace(/\s(?:style|width|height|xmlns)="[^"]*"/g, "")
      .replace(/^<svg/, `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"`),
  )
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standalone)}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

type SpriteSource = { element: HTMLElement; layer: MechanismLayer }

type WaveRing = {
  element: HTMLElement
  motion: Motion
  /** The ring's centre, in artwork units. */
  cx: number
  cy: number
  count: number
  /** Per dot, its sprite on the sheet: x, y, width, height in pixels. */
  src: Float32Array
  /** Per dot, its sprite's box at rest relative to the ring's centre, in artwork units. */
  dst: Float32Array
  /** Per dot, the unit vector pointing straight out from the centre. */
  dir: Float32Array
  /** Per dot, how far behind its ring it sets off, as a share of the cycle. */
  delay: Float32Array
  /** Per dot, how far it travels before it has faded out, in artwork units. */
  reach: Float32Array
}

/**
 * Rasterises each wave ring once, finely, cuts out every dot and shrinks it
 * onto its own cell of one small sprite sheet. The full-size ring images are
 * only needed for a moment, so the sheet is all that stays in memory.
 *
 * The two dots of a pair sit so close that, set diagonally, a box around one
 * takes in the rim of the other. So every cut is also clipped to a circle
 * around its own dot, reaching no more than halfway to the nearest dot.
 */
async function buildSprites(
  sources: SpriteSource[],
  scale: number,
): Promise<{ sheet: HTMLCanvasElement; rings: WaveRing[] }> {
  const fine = Math.max(scale, CUT_SCALE)
  const shrink = scale / fine
  // Measure every cut first, so the sheet can be sized before any drawing.
  const cuts = sources.map(({ layer }) => {
    const p = layer.pieces ?? []
    const side = Math.ceil(layer.size * fine)
    const rects: number[] = []
    /** Per dot: its centre in artwork units, and the radius its cut is clipped to. */
    const circles: number[] = []
    for (let i = 0; i + 3 < p.length; i += 4) {
      const x0 = Math.max(0, Math.floor((p[i] - CUT_PAD - layer.x) * fine))
      const y0 = Math.max(0, Math.floor((p[i + 1] - CUT_PAD - layer.y) * fine))
      const x1 = Math.min(side, Math.ceil((p[i + 2] + CUT_PAD - layer.x) * fine))
      const y1 = Math.min(side, Math.ceil((p[i + 3] + CUT_PAD - layer.y) * fine))
      rects.push(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0))

      const mx = (p[i] + p[i + 2]) / 2
      const my = (p[i + 1] + p[i + 3]) / 2
      let nearest = Infinity
      for (let j = 0; j + 3 < p.length; j += 4) {
        if (j === i) continue
        nearest = Math.min(nearest, Math.hypot((p[j] + p[j + 2]) / 2 - mx, (p[j + 1] + p[j + 3]) / 2 - my))
      }
      const own = Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]) / 2 + CUT_PAD
      circles.push(mx, my, Math.min(own, nearest / 2))
    }
    return { side, rects, circles }
  })

  let cutW = 1
  let cutH = 1
  let total = 0
  for (const { rects } of cuts) {
    for (let i = 0; i < rects.length; i += 4) {
      cutW = Math.max(cutW, rects[i + 2])
      cutH = Math.max(cutH, rects[i + 3])
    }
    total += rects.length / 4
  }
  const cellW = Math.ceil(cutW * shrink + 2 * SPRITE_MARGIN_PX)
  const cellH = Math.ceil(cutH * shrink + 2 * SPRITE_MARGIN_PX)
  // A clear gutter between cells, so smoothing never pulls in a neighbour.
  const pitchX = cellW + 2
  const pitchY = cellH + 2
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)))
  const sheet = document.createElement("canvas")
  sheet.width = cols * pitchX
  sheet.height = Math.max(1, Math.ceil(total / cols)) * pitchY
  const scratch = document.createElement("canvas")
  scratch.width = cutW
  scratch.height = cutH
  const sheetCtx = sheet.getContext("2d")
  const scratchCtx = scratch.getContext("2d")
  if (!sheetCtx || !scratchCtx) throw new Error("No 2D canvas")
  sheetCtx.imageSmoothingEnabled = true
  sheetCtx.imageSmoothingQuality = "high"

  const rings: WaveRing[] = []
  let cell = 0
  for (let r = 0; r < sources.length; r++) {
    const { element, layer } = sources[r]
    const { motion } = layer
    const { side, rects, circles } = cuts[r]
    const exact = layer.size * fine
    const image = await loadImage(svgImage(layer.svg, exact))
    const full = document.createElement("canvas")
    full.width = side
    full.height = side
    const fullCtx = full.getContext("2d")
    if (!fullCtx) throw new Error("No 2D canvas")
    fullCtx.drawImage(image, 0, 0, exact, exact)

    const count = rects.length / 4
    const src = new Float32Array(count * 4)
    const dst = new Float32Array(count * 4)
    const dir = new Float32Array(count * 2)
    const delay = new Float32Array(count)
    const reach = new Float32Array(count)
    const cx = layer.x + layer.size / 2
    const cy = layer.y + layer.size / 2
    const scatter = motion.scatter ?? 0
    const rand = seeded(0x5eed + r)
    for (let i = 0; i < count; i++) {
      const [x, y, w, h] = rects.slice(i * 4, i * 4 + 4)
      const [mx, my, radius] = circles.slice(i * 3, i * 3 + 3)
      const sx = (cell % cols) * pitchX + 1
      const sy = Math.floor(cell / cols) * pitchY + 1
      cell++
      if (w > 0 && h > 0) {
        // Cut the dot out at the fine scale, clipped to its own circle, then
        // shrink it onto its cell.
        scratchCtx.clearRect(0, 0, scratch.width, scratch.height)
        scratchCtx.save()
        scratchCtx.beginPath()
        scratchCtx.arc((mx - layer.x) * fine - x, (my - layer.y) * fine - y, radius * fine, 0, Math.PI * 2)
        scratchCtx.clip()
        scratchCtx.drawImage(full, x, y, w, h, 0, 0, w, h)
        scratchCtx.restore()
        sheetCtx.drawImage(
          scratch,
          0,
          0,
          w,
          h,
          sx + SPRITE_MARGIN_PX,
          sy + SPRITE_MARGIN_PX,
          w * shrink,
          h * shrink,
        )
      }
      src.set([sx, sy, cellW, cellH], i * 4)
      const left = x / fine + layer.x - SPRITE_MARGIN_PX / scale
      const top = y / fine + layer.y - SPRITE_MARGIN_PX / scale
      dst.set([left - cx, top - cy, cellW / scale, cellH / scale], i * 4)

      const len = Math.hypot(mx - cx, my - cy) || 1
      dir[i * 2] = (mx - cx) / len
      dir[i * 2 + 1] = (my - cy) / len
      delay[i] = rand() * scatter
      reach[i] = (motion.reach ?? 0) * (1 - rand() * scatter * REACH_SPREAD)
    }
    // Let the full-size ring go; the sheet holds everything the waves need.
    full.width = 0
    full.height = 0
    rings.push({ element, motion, cx, cy, count, src, dst, dir, delay, reach })
  }
  scratch.width = 0
  scratch.height = 0
  return { sheet, rings }
}

/**
 * Renders a split artwork (see `splitMechanism`) and sets its rings turning.
 *
 * Spinning and beating rings are Web Animations API animations of `transform`
 * or `opacity` on each ring's own element, so browsers run them on the
 * compositor: they keep moving smoothly while the main thread is busy,
 * including during momentum scrolling on iOS. Each ring has an outer element
 * that spins and an inner one that beats, so the two never fight over the same
 * transform.
 *
 * Waves can't work that way. Their dots travel out as far again as their own
 * radius, each on its own schedule, and scaling a ring that far would double
 * the size of every dot. So each wave ring is cut into one sprite per dot, and
 * a canvas draws every dot moving straight outward at its own size — several
 * hundred sprite copies a frame, like the particles over Chaos. The canvas
 * sits behind the artwork, so the waves pass under its text.
 *
 * A light loop also turns scroll velocity into an eased boost and adjusts
 * playback rates. It and the animations run only while the artwork is near
 * the screen.
 */
export function MechanismField({
  base,
  layers,
  viewBox,
  className,
  style,
  label,
}: {
  base: string
  layers: MechanismLayer[]
  viewBox: ViewBox
  className?: string
  style?: React.CSSProperties
  label?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || typeof wrap.animate !== "function") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const all: Animation[] = []
    const spinBoosted: Animation[] = []
    const pulseBoosted: Animation[] = []
    const waveSources: SpriteSource[] = []

    for (const ring of wrap.querySelectorAll<HTMLElement>("[data-ring]")) {
      const layer = layers[Number(ring.dataset.ring)]
      const pulse = ring.firstElementChild as HTMLElement | null
      if (!layer || !pulse) continue
      const { motion } = layer

      // A wave ring moves on the canvas; its own layer is only the still
      // picture shown until the canvas takes over.
      if (motion.pulse === "wave") {
        waveSources.push({ element: ring, layer })
        continue
      }

      if (motion.spin) {
        const spin = ring.animate(
          [{ transform: "rotate(0deg)" }, { transform: `rotate(${Math.sign(motion.spin) * 360}deg)` }],
          { duration: (360 / Math.abs(motion.spin)) * 1000, iterations: Infinity, easing: "linear" },
        )
        all.push(spin)
        if (motion.scrollSpin) spinBoosted.push(spin)
      }

      if (motion.pulse === "heart") {
        // Hearts share a start, so a ring's lag alone sets when it beats, and
        // they keep their places in the ripple however scrolling quickens them.
        const beat = pulse.animate(heartKeyframes(motion), {
          duration: HEART_S * 1000,
          iterations: Infinity,
          // Setting off 1 − lag of the way into a beat is running lag behind.
          iterationStart: (((1 - (motion.lag ?? 0)) % 1) + 1) % 1,
        })
        all.push(beat)
        if (motion.scrollPulse) pulseBoosted.push(beat)
      }
    }

    const field = waveField(layers)
    const canvas = canvasRef.current
    const ctx = field && canvas && waveSources.length > 0 ? canvas.getContext("2d") : null
    if (all.length === 0 && !ctx) return
    // Held until the observer confirms the artwork is on screen.
    for (const a of all) a.pause()

    let sheet: HTMLCanvasElement | null = null
    let waves: WaveRing[] = []
    /** Canvas pixels per artwork unit: now, for the current sprites, and for any being cut. */
    let scale = 0
    let spriteScale = 0
    let buildingAt = 0
    let generation = 0
    let disposed = false
    /** Seconds the waves have run while on screen. */
    let clock = 0

    const drawWaves = () => {
      if (!ctx || !canvas || !field) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const image = sheet
      if (!image) return
      for (const wave of waves) {
        // The whole ring turns about its centre; within that, every dot moves
        // straight out along its own direction, on its own schedule.
        const turn = (wave.motion.spin * clock * Math.PI) / 180
        const cos = Math.cos(turn) * scale
        const sin = Math.sin(turn) * scale
        ctx.setTransform(cos, sin, -sin, cos, (wave.cx - field.x0) * scale, (wave.cy - field.y0) * scale)
        // Kept above every delay, so the phase below never goes negative.
        const cycle = clock / WAVE_S + 2 - (wave.motion.lag ?? 0)
        const { src, dst, dir, delay, reach } = wave
        for (let i = 0; i < wave.count; i++) {
          // A dot sets off once a cycle but lives longer than one, so its last
          // journey can still be drifting out as the next begins.
          for (let age = (cycle - delay[i]) % 1; age < WAVE_LIFE; age += 1) {
            const tau = age / WAVE_LIFE
            const out = waveOut(tau)
            const alpha = waveAlpha(tau, out)
            if (alpha < 0.002) continue
            const travel = out * reach[i]
            const s = i * 4
            ctx.globalAlpha = alpha
            ctx.drawImage(
              image,
              src[s],
              src[s + 1],
              src[s + 2],
              src[s + 3],
              dst[s] + dir[i * 2] * travel,
              dst[s + 1] + dir[i * 2 + 1] * travel,
              dst[s + 2],
              dst[s + 3],
            )
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const measure = () => {
      if (!ctx || !canvas || !field) return
      const width = wrap.getBoundingClientRect().width
      if (!width) return
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const fieldW = field.x1 - field.x0
      const pixels = Math.round(fieldW * (width / viewBox.width) * dpr)
      if (pixels !== canvas.width) {
        canvas.width = pixels
        canvas.height = Math.round((field.y1 - field.y0) * (pixels / fieldW))
      }
      scale = canvas.width / fieldW
      drawWaves()

      const current = spriteScale || buildingAt
      if (current && Math.abs(scale / current - 1) <= REBUILD_DRIFT) return
      const mine = ++generation
      const at = scale
      buildingAt = at
      buildSprites(waveSources, at).then(
        (built) => {
          if (disposed || mine !== generation) return
          sheet = built.sheet
          waves = built.rings
          spriteScale = at
          buildingAt = 0
          // The canvas takes over from the still rings.
          for (const { element } of waveSources) element.style.visibility = "hidden"
          drawWaves()
        },
        () => {
          // Without sprites the still rings simply stay on show.
          if (mine === generation) buildingAt = 0
        },
      )
    }

    let boost = 0
    let scrolled = 0
    let lastY = window.scrollY
    let last = performance.now()
    let spinRate = 1
    let pulseRate = 1
    let raf = 0
    let visible = false

    const onScroll = () => {
      const y = window.scrollY
      scrolled += Math.abs(y - lastY)
      lastY = y
    }

    const frame = (now: number) => {
      // Clamp so a backgrounded tab doesn't read as one enormous scroll.
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const target = dt > 0 ? Math.min(1, scrolled / dt / FULL_BOOST_SPEED) : 0
      scrolled = 0
      boost += (target - boost) * (1 - Math.pow(1 - RESPONSE, dt * 60))
      if (boost < 0.001) boost = 0

      // Only touch the animations when the rate has really moved, and always
      // land exactly on 1 once the page is still.
      const nextSpin = 1 + boost * SPIN_BOOST
      if (nextSpin !== spinRate && (Math.abs(nextSpin - spinRate) > 0.005 || nextSpin === 1)) {
        spinRate = nextSpin
        setRate(spinBoosted, spinRate)
      }
      const nextPulse = 1 + boost * PULSE_BOOST
      if (nextPulse !== pulseRate && (Math.abs(nextPulse - pulseRate) > 0.005 || nextPulse === 1)) {
        pulseRate = nextPulse
        setRate(pulseBoosted, pulseRate)
      }

      clock += dt
      drawWaves()

      raf = requestAnimationFrame(frame)
    }

    // The wave canvas reaches well beyond the artwork, so either one being
    // near the screen counts.
    const near = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) near.add(entry.target)
          else near.delete(entry.target)
        }
        if (near.size > 0 === visible) return
        visible = near.size > 0
        if (visible) {
          for (const a of all) a.play()
          last = performance.now()
          lastY = window.scrollY
          scrolled = 0
          raf = requestAnimationFrame(frame)
        } else {
          for (const a of all) a.pause()
          cancelAnimationFrame(raf)
          raf = 0
        }
      },
      // No margin, as in `ParticleField`: the mechanism only turns while some
      // of it is on screen. Paused, the rings hold where they stopped, so they
      // come back exactly as they were left.
      { rootMargin: "0px" },
    )
    io.observe(wrap)
    if (ctx && canvas) io.observe(canvas)
    const ro = ctx ? new ResizeObserver(measure) : null
    ro?.observe(wrap)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      disposed = true
      io.disconnect()
      ro?.disconnect()
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
      for (const a of all) a.cancel()
      // Back to the still rings, with nothing left behind on the canvas.
      for (const { element } of waveSources) element.style.visibility = ""
      if (ctx && canvas) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [layers, viewBox])

  const field = waveField(layers)

  return (
    <div ref={wrapRef} aria-label={label} className={className} style={style}>
      {field && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${((field.x0 - viewBox.x) / viewBox.width) * 100}%`,
            top: `${((field.y0 - viewBox.y) / viewBox.height) * 100}%`,
            width: `${((field.x1 - field.x0) / viewBox.width) * 100}%`,
            height: `${((field.y1 - field.y0) / viewBox.height) * 100}%`,
            pointerEvents: "none",
          }}
        />
      )}
      {/* Positioned, so it paints over the wave canvas that comes before it. */}
      <div style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: base }} />
      {layers.map((layer, i) => (
        <div
          key={layer.key}
          data-ring={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${layer.left}%`,
            top: `${layer.top}%`,
            width: `${layer.width}%`,
            height: `${layer.height}%`,
            pointerEvents: "none",
          }}
        >
          <div
            style={{ position: "absolute", inset: 0 }}
            dangerouslySetInnerHTML={{ __html: layer.svg }}
          />
        </div>
      ))}
    </div>
  )
}
