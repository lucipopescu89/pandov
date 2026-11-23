"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { readMandala, type MoonArt, type MoonMotion, type MoonRing, type MoonShape } from "@/lib/moon-mandala"
import { DROP_LARGE, dropUnit } from "@/components/seam-drops"
import { still } from "@/lib/still"

/* --------------------------------------------------------------------------
   The mandala over the Chess Set's moon, and the drop that inks it.

   The simple version (2026-11-23, the author's asking). Since the evening of
   2026-11-22 nothing on the site may hold or carry the scroll, and the whole
   of the old sequence was built on a slowed scroll, so it had been switched
   off and only the still picture showed. Of it the author kept what does not
   touch the scroll:

   1. At rest its rings move as the author marked them on a copy of the
      drawing (the spec is `MOON_RINGS` in the page): some turn, and the rest
      breathe, copies of them coming up where they sit and leaving it, fading
      as they go, inward or outward, growing, shrinking or lengthening at both
      ends.
   2. Dark drops fall from the middle of the seam, where the photograph's
      water already falls into the page, and fade as the seam's own do. When
      the seam climbs past the middle of the window, the next one does not
      fade: it falls on down to the moon's centre. It leaves the line as the
      seam's own drops do, at their speed, and quickens more and more on its
      way down, as a real drop would (`SENT_JERK`): about three and a half
      seconds to the moon on a computer, two and a half on a phone. It used to
      take five to seven, held to the seam's pace, and the page waited for it;
      nothing waits now. (For one morning it fell in 1.6 seconds whatever the
      screen; the author found it left too quickly and got there far too soon.)
   3. Where it lands, the mandala is inked black from the centre outward.
   4. Once it is black through, the rings slow to a fifth of their pace and
      the rings on the moon itself quicken: the quiet waiting of the poem.
      It stays so while the reader is there.

   It goes back to its colours, fading over `UNINK_S`, once the moon's disc
   has gone off the top of the window, or once the reader has gone back up
   past the line the drop was sent at, and plays
   again on the way down.

   Left out, and kept whole in `D:\PANDOV\Claude outputs\
   moon-mandala.inainte-2026-11-23.tsx`: the slowed scroll and the page's
   following the drop, the phone's page cut off at the moon, the bow drawn
   by the reader's scrolling, the strike and the mandala gathering again, and
   the clouds' gust (the clouds are off anyway, `SHOW_CLOUDS` in the page).

   Canvas rather than the ring layers Mother Nature uses: see
   `lib/moon-mandala.ts` for why a ring's transform could not say this. A
   visitor whose device asks for less motion sees the still picture.
   -------------------------------------------------------------------------- */

const SRC = "/images/chess-set/mandala.svg"

/** The moon's radius in the mandala's units. `scripts/chess-mandala.mjs` parts white from grey there. */
const MOON_RIM = 63.5
const MAX_DPR = 2
/** The most pixels the canvas may hold. A very large screen draws it a little less finely. */
const MAX_PIXELS = 6e6

/* --- At rest ------------------------------------------------------------- */

/** Seconds between a ring's breaths, where its motion names none. */
const BREATH_S = 5
/** A breath's journey, in breaths: longer than one, so the last is still leaving as the next comes up. */
const BREATH_LIFE = 1.7
/** Share of a breath's journey spent coming up where it sits before it sets off. */
const SURFACE = 0.2
/**
 * On the moon itself a breath fades in over this share of its journey rather
 * than over `SURFACE` alone (the author's asking, 2026-11-08: they popped up
 * too suddenly), and sets off at once, fading in as it goes.
 */
const MOON_FADE_IN = 0.3
/** And gives its light up later on its way, so that, rising while it already moves, it still comes up near full. */
const MOON_LEAVE = 2.2

/* --- The drop -------------------------------------------------------------- */

/**
 * Where the seam stands in the window, as a share of its height from the top,
 * when the next drop is sent on to the moon's centre: the middle (the
 * author's asking, 2026-10-04).
 */
const SEND_AT = 0.5
/**
 * Where the seam must come back down to, the reader having gone back up, for
 * the ink to fade and the drop to be sent again on the way down. Lower than
 * `SEND_AT`, so that a reader who goes back a little does not undo it.
 */
const BACK_AT = 0.7
/**
 * Seconds a bead gathers at the middle of the seam before it lets go: a little
 * more often than the seam's own, whose beads take 1.4 to 5.6 seconds. It
 * swells over the last SWELL of that time, as theirs do.
 */
const GATHER_MIN = 1.6
const GATHER_SPREAD = 1.2
const SWELL = 0.45
/** Seconds the bead that is sent on takes to swell and let go. */
const SEND_SWELL_S = 0.3
/**
 * How quickly the drop sent on gathers speed, in px/s³ (2026-11-23, the
 * author's asking: to leave at the speed of the others and quicken as it goes
 * down, as it would for real). It leaves the line at the seam's speed (`V_0`)
 * and quickening (`G`), and its quickening grows by this much every second,
 * so for its first second it is hard to tell from the seam's own drops, and
 * then it draws away from them. The further it has to go, the longer it
 * takes, as a real drop would: on a 1440 × 900 screen, some 870px to the
 * moon's centre, about 3.4 seconds, arriving at some 650px a second; on a
 * 390px phone, some 440px, about 2.6 seconds. At 1.6 seconds whatever the screen, its first figure
 * that morning, the author found it far too quick.
 */
const SENT_JERK = 80
/**
 * The seam's water, from `components/seam-drops.tsx`, for the drops at the
 * middle that are not sent on: the speed a drop leaves the line at, how fast
 * it quickens (px/s²), and the speed the air holds it to, each times the
 * quickest of its paces.
 */
const V_0 = 18
const G = 40
const V_MAX = 82
const PACE = 1.25
/**
 * How far down a drop gets before it is gone, the share it may come up short
 * by, how it holds its light near the line, and what its radius thins to: the
 * seam's own figures.
 */
const REACH = 240
const REACH_NARROW = 184
const NARROW_W = 640
const SHORT = 0.3
const DECAY = 1.7
const R_END = 0.55

const DROP_W = 40
const DROP_RGB = "32,32,32"
const DROP_PEAK = 0.85
const SMEAR = 0.12
const TAIL_MAX = 46
const STRETCH = 0.9

/** CSS pixels one of the seam's drops has fallen `t` seconds after letting go, and how fast it is going. */
function seamFall(t: number) {
  const v0 = V_0 * PACE
  const g = G * PACE
  const top = V_MAX * PACE
  const held = (top - v0) / g
  if (t < held) return { y: v0 * t + 0.5 * g * t * t, v: v0 + g * t }
  return { y: v0 * held + 0.5 * g * held * held + top * (t - held), v: top }
}

/** The same for the drop sent on: off the line as the seam's drops go, then quickening more and more (`SENT_JERK`). */
function sentFall(t: number) {
  const v0 = V_0 * PACE
  const g = G * PACE
  return { y: v0 * t + 0.5 * g * t * t + (SENT_JERK * t * t * t) / 6, v: v0 + g * t + 0.5 * SENT_JERK * t * t }
}

/* --- The ink --------------------------------------------------------------- */

/**
 * The pace the rings slow to once the ink has filled the mandala, as a share
 * of their own (a tenth at first; the author found the rings all but stopped
 * there). The ink spreads over rings still moving at their own pace, and only
 * then do they quieten.
 */
const HUSH = 0.2
/**
 * While the rest is hushed, the rings on the moon itself go the other way and
 * quicken (the author's asking, 2026-11-08): the one at the very centre to
 * `MOON_QUICK_CENTRE` times its pace, the one on the moon's rim to
 * `MOON_QUICK_RIM` times, those between in proportion.
 */
const MOON_QUICK_CENTRE = 3
const MOON_QUICK_RIM = 2
const HUSH_S = 0.9
const WAKE_S = 1.8

const INK_S = 2.4
const INK_EDGE = 18
const INK = "#202020"
/**
 * Seconds the ink takes to fade back to the mandala's colours, and the drop to
 * go. It fades too when the moon's disc goes off the top of the window, where
 * the mandala's lower rings are still on the screen: until 2026-11-23 it went
 * back to its colours there at once, which the author found abrupt.
 */
const UNINK_S = 2
const UNDROP_S = 0.4
/**
 * The ink's line, in units. The grey lines off the moon are Second Wind's
 * hairline, 0.107 units; in black at that weight they read as grey, not ink,
 * so inked they are drawn at 0.2.
 */
const INK_WIDTH = 0.2
/**
 * No line is drawn thinner than one CSS pixel (2026-11-21, the author's
 * report: under a pixel the lines read broken), and since 2026-11-23 a line
 * that would be thinner is drawn 1px wide in its full colour (the author's
 * asking: the mandala's lines looked far too thin, and should be 1px like
 * the page's other drawings). Until then it gave back the ink it gained, at
 * the share of a pixel it would have been and never less than 0.55, which
 * left the grey hairline at about half its grey. Every line of the mandala,
 * the grey, the white and the ink's, is now under a pixel at every size it
 * is shown at, so every one is drawn 1px at full strength.
 */
const HAIR_INK = 1

/** The ring the drop leaves as it lands: seconds, and its reach in units. */
const SPLASH_S = 0.9
const SPLASH_R = 16

/** Non-finite to 0, as everywhere on the site that divides by a measurement. */
const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
const smooth = (t: number) => t * t * (3 - 2 * t)
/** Eases `value` toward `target` over the time constant `tau`, whatever the frame rate. */
const approach = (value: number, target: number, tau: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-dt / tau))

/** Deterministic PRNG, so every visitor sees the same drops. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Group = {
  motion: MoonMotion
  /** Whether it breathes, and the seconds between its breaths. */
  breathes: boolean
  period: number
  /** The mean radius of its shapes. */
  radius: number
  /** Its shapes, sorted by the stroke the file draws them in, and where each stroke's run ends. */
  shapes: MoonShape[]
  runs: { stroke: number; from: number; to: number }[]
  /** How far it has turned, in radians, and how far its breathing has run, in seconds of its own time. */
  turn: number
  clock: number
  /**
   * Its outlines traced once as they stand, one path per run, for a ring that
   * only turns, or only grows and shrinks: it is drawn from these, turned and
   * scaled, rather than traced again every frame.
   */
  kept: Path2D[]
}

function groupRings(art: MoonArt, rings: MoonRing[]): Group[] {
  const byRing = new Map<number, MoonShape[]>()
  for (const shape of art.shapes) {
    const list = byRing.get(shape.ring) ?? []
    list.push(shape)
    byRing.set(shape.ring, list)
  }
  return [...byRing].map(([ring, shapes]) => {
    shapes.sort((a, b) => a.stroke - b.stroke)
    const runs: Group["runs"] = []
    for (let i = 0; i < shapes.length; ) {
      let j = i
      while (j < shapes.length && shapes[j].stroke === shapes[i].stroke) j++
      runs.push({ stroke: shapes[i].stroke, from: i, to: j })
      i = j
    }
    const motion = rings[ring]?.motion ?? {}
    const breathes = Boolean(motion.drift || motion.scale || motion.stretch)
    const period = motion.breath ?? BREATH_S
    const radius = shapes.reduce((sum, s) => sum + s.r, 0) / shapes.length
    // On the moon a breath is fully up only at MOON_FADE_IN, so it starts there.
    const up = radius < MOON_RIM ? MOON_FADE_IN : SURFACE
    return {
      motion,
      breathes,
      period,
      radius,
      shapes,
      runs,
      turn: 0,
      // A breathing ring starts at the moment a breath has fully come up where
      // it sits, so the canvas takes over from the still picture unseen.
      clock: breathes ? up * BREATH_LIFE * period : 0,
      kept: [],
    }
  })
}

/**
 * The breaths of a ring now in the air: how far each has come on its journey
 * (0 where the ring sits, 1 at its end) and how much of it is left to see.
 */
function breaths(clock: number, period: number, fadeIn = SURFACE): { out: number; alpha: number }[] {
  const out: { out: number; alpha: number }[] = []
  for (let age = (clock / period) % 1; age < BREATH_LIFE; age += 1) {
    const u = age / BREATH_LIFE
    if (fadeIn > SURFACE) {
      // On the moon: moving from the first moment, and rising from nothing over `fadeIn` as it goes.
      const rise = smooth(clamp01(u / fadeIn))
      const w = Math.min(1, u / (1 - SURFACE))
      out.push({ out: Math.pow(w, 1.4), alpha: rise * (1 - Math.pow(w, MOON_LEAVE)) })
    } else if (u < SURFACE) {
      out.push({ out: 0, alpha: smooth(u / SURFACE) })
    } else {
      // It holds most of its light for most of the way and gives it up toward
      // the end: fading from the start, the breaths were gone before they had
      // gone far enough to be seen going.
      const w = (u - SURFACE) / (1 - SURFACE)
      out.push({ out: Math.pow(w, 1.4), alpha: 1 - Math.pow(w, 1.6) })
    }
  }
  return out
}

const STILL = [{ out: 0, alpha: 1 }]

/** Adds one outline to a path: its middle at `radius`, turned by `turn`, scaled along and across its radius. */
function trace(path: Path2D, shape: MoonShape, radius: number, turn: number, along: number, across: number) {
  const angle = shape.angle + turn
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const cx = radius * ux
  const cy = radius * uy
  const local = shape.local
  for (let i = 0; i < local.length; i += 2) {
    const a = local[i] * along
    const b = local[i + 1] * across
    const x = cx + a * ux - b * uy
    const y = cy + a * uy + b * ux
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.closePath()
}

/** A drop from the middle of the seam, falling. */
type Drip = {
  /** Seconds since it let go. */
  t: number
  /** CSS pixels it falls before it is gone, unless it is sent on. */
  reach: number
  /** Sent on to the moon's centre. */
  sent: boolean
}

type Phase = "rest" | "fall" | "ink" | "recede"

export function MoonMandala({
  rings,
  cover,
}: {
  rings: MoonRing[]
  /**
   * How much of the mandala's square the canvas covers, from its top: as far
   * down as the page cuts the mandala, where the white veil under the moon is
   * solid (`MANDALA_VISIBLE` in the page, which sets the canvas's height in the
   * CSS to match).
   */
  cover: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const dropCanvas = dropRef.current
    if (!box || !canvas || !dropCanvas) return
    if (still()) return
    const ctx = canvas.getContext("2d")
    const dctx = dropCanvas.getContext("2d")
    const frameEl = box.parentElement
    const section = box.closest("section")
    if (!ctx || !dctx || !frameEl || !section) return

    let art: MoonArt | null = null
    let groups: Group[] = []
    let disposed = false

    /* Measurements, refreshed on resize. */
    let dpr = 1
    /** Device pixels per unit, and where the centre falls on the canvas. */
    let scale = 1
    let origin = 0
    let dropDpr = 1
    /** CSS pixels from the seam down to the moon's centre, the drops' size and how far they fall. */
    let dropH = 0
    let dropR = DROP_LARGE
    let fallReach = REACH

    /* The drops at the middle of the seam. */
    const rand = seeded(0x1d20)
    let drips: Drip[] = []
    let gathered = 0
    let gatherS = GATHER_MIN + rand() * GATHER_SPREAD
    /** The next drop to let go goes all the way to the moon. */
    let sendNext = false
    let dropShown = false

    /* The sequence. */
    let phase: Phase = "rest"
    let armed = false
    let ink = 0
    let inkAlpha = 1
    let dropAlpha = 1
    let landAt = -1
    let hush = 0

    const measure = () => {
      const rect = box.getBoundingClientRect()
      if (!rect.width) return
      const cssW = rect.width
      const cssH = rect.width * cover
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, Math.sqrt(MAX_PIXELS / (cssW * cssH)))
      const w = Math.round(cssW * dpr)
      const h = Math.round(cssH * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      if (art) scale = (dpr * cssW) / (2 * art.extent)
      origin = (dpr * cssW) / 2

      // The drops' strip runs from the seam, the top of the moon's section, to
      // the moon's centre. It hangs from the frame the mandala is placed in,
      // so it paints over the mandala and under the words.
      const seam = section.getBoundingClientRect().top
      const frameTop = frameEl.getBoundingClientRect().top
      dropH = rect.top + cssW / 2 - seam
      // The page's width, as the seam measures it: the section spans it.
      dropR = DROP_LARGE * dropUnit(section.getBoundingClientRect().width)
      fallReach = window.innerWidth < NARROW_W ? REACH_NARROW : REACH
      dropDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const stripH = Math.max(1, dropH + dropR * 4)
      dropCanvas.style.top = `${seam - frameTop}px`
      dropCanvas.style.height = `${stripH}px`
      dropCanvas.width = Math.round(DROP_W * dropDpr)
      dropCanvas.height = Math.round(stripH * dropDpr)
      dropShown = false
    }

    /** Where a drop is and how it looks now. */
    const look = (d: Drip) => {
      if (d.sent) {
        const { y, v } = sentFall(d.t)
        return { y, v, alpha: DROP_PEAK * dropAlpha, r: dropR }
      }
      const { y, v } = seamFall(d.t)
      const gone = y / d.reach
      return { y, v, alpha: DROP_PEAK * (1 - Math.pow(gone, DECAY)), r: dropR * (1 - (1 - R_END) * gone) }
    }

    /** Moves the drops on by `dt`, and lets a new one go when its bead has gathered. */
    const drip = (dt: number) => {
      // While one is on its way to the moon, the middle of the seam holds its
      // water, unless that one has still to let go.
      if (phase !== "fall" || sendNext) {
        // The bead that is to be sent on swells in SEND_SWELL_S.
        gathered += sendNext ? (dt * gatherS * SWELL) / SEND_SWELL_S : dt
        if (gathered >= gatherS) {
          drips.push({ t: sendNext ? 0 : gathered - gatherS, reach: fallReach * (1 - rand() * SHORT), sent: sendNext })
          sendNext = false
          gathered = 0
          gatherS = GATHER_MIN + rand() * GATHER_SPREAD
        }
      }
      for (const d of drips) d.t += dt
      drips = drips.filter((d) => (d.sent ? phase === "fall" || phase === "recede" : seamFall(d.t).y < d.reach))
    }

    /** Back to rest at once: for when the moon has gone off the screen. */
    const reset = () => {
      phase = "rest"
      armed = false
      ink = 0
      inkAlpha = dropAlpha = 1
      landAt = -1
      sendNext = false
      drips = drips.filter((d) => !d.sent)
    }

    /** Where the moon stands in the window, and the phase it calls for. */
    const direct = (now: number, dt: number) => {
      if (!art) return
      const rect = box.getBoundingClientRect()
      const unit = rect.width / (2 * art.extent)
      const centre = rect.top + rect.width / 2
      const discR = MOON_RIM * unit
      const vh = window.innerHeight
      const seam = centre - dropH
      const gone = centre + discR < 0
      const back = seam > vh * BACK_AT

      switch (phase) {
        case "rest":
          // Armed while the seam stands in the lower half of the window, or the
          // moon is out of sight below it; sent on as the seam climbs past the
          // middle on the way down.
          if (seam >= vh * SEND_AT || centre - discR >= vh) armed = true
          if (armed && !gone && seam < vh * SEND_AT) {
            phase = "fall"
            armed = false
            sendNext = true
            // From where the bead begins to show, so it does not jump.
            gathered = Math.max(gathered, gatherS * (1 - SWELL))
            dropAlpha = 1
          }
          break
        case "fall": {
          const sent = drips.find((d) => d.sent)
          if (gone || back) phase = "recede"
          else if (sent && dropR * 1.2 + look(sent).y >= dropH) {
            phase = "ink"
            ink = 0
            inkAlpha = 1
            landAt = now
            drips = drips.filter((d) => !d.sent)
          }
          break
        }
        case "ink":
          ink = Math.min(1, ink + dt / INK_S)
          if (gone || back) phase = "recede"
          break
        case "recede":
          // The moon's disc has gone off the top of the window, or the reader
          // went back up past where the drop was sent: the drop and
          // the ink fade, the rings wake, and it can all play again.
          inkAlpha = Math.max(0, inkAlpha - dt / UNINK_S)
          dropAlpha = Math.max(0, dropAlpha - dt / UNDROP_S)
          if (inkAlpha <= 0 && dropAlpha <= 0) reset()
          break
      }

      const hushed = phase === "ink" && ink >= 1 ? 1 : 0
      hush = approach(hush, hushed, hushed > hush ? HUSH_S : WAKE_S, dt)
    }

    const draw = (now: number, dt: number) => {
      if (!art) return
      const speed = 1 - (1 - HUSH) * hush
      // The rings on the moon, innermost to the rim, for MOON_QUICK_CENTRE.
      let innerMin = Infinity
      let innerMax = -Infinity
      for (const g of groups)
        if (g.radius < MOON_RIM) {
          innerMin = Math.min(innerMin, g.radius)
          innerMax = Math.max(innerMax, g.radius)
        }
      for (const g of groups) {
        let pace = speed
        if (g.radius < MOON_RIM) {
          const out = innerMax > innerMin ? (g.radius - innerMin) / (innerMax - innerMin) : 0
          const quick = MOON_QUICK_CENTRE + (MOON_QUICK_RIM - MOON_QUICK_CENTRE) * out
          pace = 1 + (quick - 1) * hush
        }
        g.turn += ((g.motion.spin ?? 0) * pace * dt * Math.PI) / 180
        g.clock += pace * dt
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, origin, origin)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // The ink: a radial gradient while its edge is crossing the mandala,
      // solid once it has passed the rim.
      const reach = art.reach
      let inkStyle: string | CanvasGradient | null = null
      let inkOnly = false
      if (ink > 0 && (phase === "ink" || phase === "recede")) {
        if (ink >= 1) {
          inkStyle = INK
          inkOnly = inkAlpha >= 1
        } else {
          const front = (reach + INK_EDGE) * (1 - (1 - ink) * (1 - ink))
          const edge = reach + INK_EDGE
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, edge)
          gradient.addColorStop(0, INK)
          gradient.addColorStop(clamp01((front - INK_EDGE) / edge), INK)
          gradient.addColorStop(clamp01(front / edge), "rgba(32,32,32,0)")
          gradient.addColorStop(1, "rgba(32,32,32,0)")
          inkStyle = gradient
        }
      }

      /**
       * A line's width in units and the share of its ink to draw it with: as
       * it is, or 1 CSS pixel where it would be thinner (see `HAIR_INK`).
       */
      const hair = (width: number): [number, number] => {
        const px = (width * scale) / dpr
        return px >= 1 ? [width, 1] : [dpr / scale, Math.max(HAIR_INK, px)]
      }

      /**
       * Strokes a ring's outlines in its colours, the ink, or both. `kept`
       * draws them from the paths traced once, turned by `turn` and scaled by
       * `zoom`; otherwise `place` traces them afresh.
       */
      const paint = (
        g: Group,
        alpha: number,
        place: ((s: MoonShape, path: Path2D) => void) | null,
        turn = 0,
        zoom = 1,
      ) => {
        if (alpha <= 0.002 || !art) return
        const moved = turn !== 0 || zoom !== 1
        if (moved) {
          const cos = Math.cos(turn) * scale * zoom
          const sin = Math.sin(turn) * scale * zoom
          ctx.setTransform(cos, sin, -sin, cos, origin, origin)
        }
        for (let n = 0; n < g.runs.length; n++) {
          const run = g.runs[n]
          let path = place ? null : g.kept[n]
          if (!path) {
            path = new Path2D()
            for (let i = run.from; i < run.to; i++) {
              const s = g.shapes[i]
              if (place) place(s, path)
              else trace(path, s, s.r, 0, 1, 1)
            }
            if (!place) g.kept[n] = path
          }
          const stroke = art.strokes[run.stroke]
          if (!inkOnly) {
            const [w, k] = hair(stroke.width)
            ctx.globalAlpha = alpha * k
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = w / zoom
            ctx.stroke(path)
          }
          if (inkStyle) {
            const [w, k] = hair(Math.max(stroke.width, INK_WIDTH))
            ctx.globalAlpha = alpha * inkAlpha * k
            ctx.strokeStyle = inkStyle
            ctx.lineWidth = w / zoom
            ctx.stroke(path)
          }
        }
        if (moved) ctx.setTransform(scale, 0, 0, scale, origin, origin)
      }

      for (const g of groups) {
        const drift = g.motion.drift ?? 0
        const grow = g.motion.scale ?? 0
        const lengthen = g.motion.stretch ?? 0
        const air = g.breathes ? breaths(g.clock, g.period, g.radius < MOON_RIM ? MOON_FADE_IN : SURFACE) : STILL
        for (const { out, alpha } of air) {
          if (!drift && !lengthen) {
            // A ring that only turns, or grows and shrinks as it breathes: the
            // paths traced once, drawn turned and scaled, so moving costs it nothing.
            paint(g, alpha, null, g.turn, 1 + grow * out)
          } else {
            const zoom = 1 + grow * out
            const along = zoom * (1 + lengthen * out)
            paint(g, alpha, (s, path) => trace(path, s, s.r * zoom + out * drift, g.turn, along, zoom))
          }
        }
      }

      // The ring the drop leaves as it lands.
      if (landAt >= 0) {
        const u = (now - landAt) / 1000 / SPLASH_S
        if (u < 1) {
          const [w, k] = hair(INK_WIDTH)
          ctx.globalAlpha = 0.55 * (1 - u) * inkAlpha * k
          ctx.strokeStyle = INK
          ctx.lineWidth = w
          ctx.beginPath()
          ctx.arc(0, 0, SPLASH_R * (1 - (1 - u) * (1 - u)), 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    const drawDrops = () => {
      const beading = phase !== "fall" || sendNext
      const bead = beading ? Math.max(0, (gathered / gatherS - (1 - SWELL)) / SWELL) : 0
      if (drips.length === 0 && bead <= 0) {
        if (dropShown) {
          dctx.setTransform(1, 0, 0, 1, 0, 0)
          dctx.clearRect(0, 0, dropCanvas.width, dropCanvas.height)
          dropShown = false
        }
        return
      }
      dropShown = true
      dctx.setTransform(1, 0, 0, 1, 0, 0)
      dctx.clearRect(0, 0, dropCanvas.width, dropCanvas.height)
      dctx.setTransform(dropDpr, 0, 0, dropDpr, 0, 0)
      const x = DROP_W / 2

      if (bead > 0) {
        // The bead gathering on the seam, as the seam's own do: swelling as the
        // square root of its time, and sagging just before it goes.
        const r = dropR * Math.sqrt(bead)
        dctx.fillStyle = `rgba(${DROP_RGB},${DROP_PEAK * (0.15 + 0.85 * bead)})`
        dctx.beginPath()
        dctx.ellipse(x, r * (0.6 + 0.6 * bead * bead), Math.max(r, 0.01), Math.max(r * (1 + 0.5 * bead ** 4), 0.01), 0, 0, Math.PI * 2)
        dctx.fill()
      }

      for (const d of drips) {
        // Falling, quickening, with its light drawn out behind it, from where
        // the bead had sagged to.
        const { y: fell, v, alpha, r } = look(d)
        if (alpha < 0.002) continue
        const y = Math.min(dropH, dropR * 1.2 + fell)
        const tail = Math.min(TAIL_MAX, v * SMEAR)
        if (tail > r) {
          const gradient = dctx.createLinearGradient(x, y - tail, x, y)
          gradient.addColorStop(0, `rgba(${DROP_RGB},0)`)
          gradient.addColorStop(1, `rgba(${DROP_RGB},${alpha})`)
          dctx.strokeStyle = gradient
          dctx.lineWidth = r * 1.2
          dctx.lineCap = "round"
          dctx.beginPath()
          dctx.moveTo(x, y - tail)
          dctx.lineTo(x, y)
          dctx.stroke()
        }
        dctx.fillStyle = `rgba(${DROP_RGB},${alpha})`
        dctx.beginPath()
        dctx.ellipse(x, y, r, r * (1 + STRETCH * Math.min(1, v / (V_MAX * PACE))), 0, 0, Math.PI * 2)
        dctx.fill()
      }
    }

    let raf = 0
    let last = performance.now()
    let visible = false
    let shown = false

    const frame = (now: number) => {
      // Clamped so a backgrounded tab does not come back as one enormous step,
      // and never negative: a frame's timestamp can be a moment before `last`.
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000))
      last = now
      if (art) {
        direct(now, dt)
        drip(dt)
        draw(now, dt)
        drawDrops()
        if (!shown) {
          // The canvas takes over from the still picture.
          shown = true
          if (imageRef.current) imageRef.current.style.visibility = "hidden"
        }
      }
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      // Off the screen, it goes back to rest where nobody sees it.
      reset()
    }

    fetch(SRC)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((text) => {
        if (disposed) return
        art = readMandala(text, rings)
        groups = groupRings(art, rings)
        measure()
        if (visible) start()
      })
      // Without the drawing's data, the still picture simply stays.
      .catch(() => {})

    const near = new Set<Element>()
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) near.add(entry.target)
        else near.delete(entry.target)
      }
      if (near.size > 0 === visible) return
      visible = near.size > 0
      if (visible && art) start()
      else if (!visible) stop()
      // A quarter of the window early: the still picture draws the lines at
      // the file's own fineness, under the canvas's 1px (`HAIR_INK`), so the
      // canvas takes over before any of it is on the screen.
    }, { rootMargin: "25% 0px" })
    io.observe(box)
    io.observe(dropCanvas)
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    ro.observe(section)

    return () => {
      disposed = true
      io.disconnect()
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      if (imageRef.current) imageRef.current.style.visibility = ""
    }
  }, [rings, cover])

  return (
    <>
      <div ref={boxRef} className="chess-mandala" aria-hidden="true">
        <Image ref={imageRef} src={SRC} alt="" width={800} height={800} className="chess-mandala-image" />
        <canvas ref={canvasRef} className="chess-mandala-canvas" />
      </div>
      <canvas ref={dropRef} className="chess-moon-drop" aria-hidden="true" />
    </>
  )
}
