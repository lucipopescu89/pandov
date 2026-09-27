"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { readMandala, type MoonArt, type MoonMotion, type MoonRing, type MoonShape } from "@/lib/moon-mandala"

/* --------------------------------------------------------------------------
   The mandala over the Chess Set's moon, and the drop that sets it off.

   At rest its rings move as the author marked them on a copy of the drawing
   (the spec is `MOON_RINGS` in the page): some turn, and the rest breathe,
   copies of them coming up where they sit and leaving it, fading as they go,
   inward or outward, growing, shrinking or lengthening at both ends. Then, as
   the reader brings the moon up the screen, it plays the author's sequence of
   2026-09-27, which is the poem painted on the moon:

   1. Dark drops fall from the middle of the seam, where the photograph's
      water already falls into the page, and fade as the seam's own do. When
      the moon's rim first shows at the foot of the window, the drop then
      falling does not fade: it carries on down to the moon's centre, at the
      pace of the seam's own drops.
   2. As it falls the rings slow, to a fifth of their pace.
   3. Where it lands, the mandala is inked black from the centre outward, a
      ring at a time, like a drop spreading in water.
   4. As the reader scrolls on, every shape draws in toward the centre and
      shrinks: a bow being drawn.
   5. When the moon reaches the middle of the screen, it lets go. Every shape
      shoots straight out along its own radius, streaking as it goes, a volley
      of arrows loosed in every direction at once.
   6. The clouds, drifting at their calm pace until then, are hurried by it for
      a few seconds and slowly come back to it; the mandala gathers itself
      again where it was, from the centre out, and its rings wake to their
      own pace.

   It plays again for a reader who goes back up to see it: once the white
   section has come back down to the middle of the window, the next drop is
   sent on again, without the reader having to leave the section.

   Canvas rather than the ring layers Mother Nature uses: see
   `lib/moon-mandala.ts` for why a ring's transform could not say this.

   Scroll must never stop on this site, and nothing here holds the page. The
   drop and the ink keep their own time whatever the reader does: the drop
   falls as the seam's water falls, which the author asked for once it had
   been seen hurried by the scroll. It is sent on as soon as the moon shows,
   so it is well on its way by the time the reader has brought the moon up,
   and a reader who scrolls on ahead of it finds the moon waiting, with the
   rest playing where it stands. The draw is the one step that follows the
   scroll, since it is the reader's own hand drawing the bow, and it gives
   back if the page is scrolled back.
   -------------------------------------------------------------------------- */

const SRC = "/images/chess-set/mandala.svg"

/** The moon's radius in the mandala's units. `scripts/chess-mandala.mjs` parts white from grey there. */
const MOON_RIM = 63.5
/**
 * How much of the mandala's square the canvas covers, from its top. The page
 * cuts the mandala at 82% of the moon's canvas (the veil under the clouds is
 * solid white below that), which is 66.2% of the way down its own box, so
 * there is nothing to draw further down.
 */
const VISIBLE = 0.662
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

/* --- The drops ------------------------------------------------------------- */

/**
 * The share of the window the moon's disc has come up into when the drop
 * then falling is sent on to its centre: its rim just showing at the foot of
 * the screen. It was 60% of the disc at first, which left the drop, at the
 * seam's slow pace, still falling long after the reader had scrolled past.
 */
const RELEASE_SHOWN = 0.03
/**
 * Seconds a bead gathers at the middle of the seam before it lets go: a little
 * more often than the seam's own, whose beads take 1.4 to 5.6 seconds, so the
 * drop that is sent on is never far from its start. It swells over the last
 * SWELL of that time, as theirs do.
 */
const GATHER_MIN = 1.6
const GATHER_SPREAD = 1.2
const SWELL = 0.45
/**
 * The seam's water, from `components/seam-drops.tsx`: the speed a drop leaves
 * the line at, how fast it quickens (px/s²), and the speed the air holds it
 * to, each times the pace of its largest drop, which these are. The one sent
 * on crosses 700px in about seven and a half seconds. Unlike the seam's, they
 * do not quicken with the scroll: the author asked for the drop to fall as it
 * falls.
 */
const V_0 = 18
const G = 40
const V_MAX = 82
const PACE = 1.25
/**
 * How far down a drop gets before it is gone, the share it may come up short
 * by, how it holds its light near the line, and what its radius thins to: the
 * seam's own figures, so the drops at the middle are the seam's water until
 * one is sent on.
 */
const REACH = 240
const REACH_NARROW = 184
const SHORT = 0.3
const DECAY = 1.7
const R_END = 0.55
/** Their radius: 7px across, the largest of the seam's own drops. A phone's are smaller. */
const DROP_R = 3.5
const DROP_R_NARROW = 2.8
const NARROW_W = 640
/** Width of the strip the drops fall down, in CSS pixels. */
const DROP_W = 40
const DROP_RGB = "32,32,32"
const DROP_PEAK = 0.85
/** The seam's streak: seconds of travel smeared out behind the head, its cap, and how far the head draws out at speed. */
const SMEAR = 0.22
const TAIL_MAX = 46
const STRETCH = 0.9
/**
 * A drop is sent on only if it has not yet gone this share of its way down,
 * or it would have to come back out of its fade; and it takes this long to
 * come back to full strength and size once it has been.
 */
const SEND_WITHIN = 0.7
const RECOVER_S = 0.8

/** CSS pixels a drop has fallen `t` seconds after letting go. */
function fallen(t: number) {
  const v0 = V_0 * PACE
  const g = G * PACE
  const top = V_MAX * PACE
  // Seconds of quickening before the air has it, and the ground it covered.
  const held = (top - v0) / g
  return t < held ? v0 * t + 0.5 * g * t * t : v0 * held + 0.5 * g * held * held + top * (t - held)
}

/** And how fast it is going then. */
function falling(t: number) {
  return Math.min(V_0 * PACE + G * PACE * t, V_MAX * PACE)
}

/* --- The ink and the draw ------------------------------------------------ */

/**
 * The pace the rings slow to as the drop falls, as a share of their own. A
 * tenth at first; the author found the rings all but stopped there and asked
 * for them quicker, at rest and drawn alike.
 */
const HUSH = 0.2
/** Time constants, in seconds, for slowing down and for waking again after the strike. */
const HUSH_S = 0.9
const WAKE_S = 1.8
/** Seconds the ink takes to cross the mandala from the centre, and the width of its edge in units. */
const INK_S = 2.4
const INK_EDGE = 18
const INK = "#202020"
/**
 * The ink's line, in units. The grey lines off the moon are Second Wind's
 * hairline, 0.107 units; in black at that weight they read as grey, not ink,
 * so inked they are drawn at 0.2 (0.7px on a 1440 screen). The white lines on
 * the moon are already heavier and keep their own.
 */
const INK_WIDTH = 0.2
/**
 * The bow can only be drawn once it is inked: the draw is held back until the
 * ink has gone this far, and has all of it by the time the ink is done.
 */
const INK_BEFORE_DRAW = 0.3
/** The draw follows the scroll through this time constant, so a jump of the page is not a jump of the bow. */
const DRAW_EASE_S = 0.25
/**
 * The quickest a full draw may be, in seconds. A reader who is already at the
 * strike when the ink is done sees the bow drawn over this long, not snapped.
 */
const DRAW_MIN_S = 1.4
/**
 * A reader closer to the strike than this share of the way when the drop
 * lands has no scroll left to draw the bow with; it draws itself.
 */
const DRAW_ROOM = 0.15
/**
 * How far the rings draw in at full draw, as a share of their radius: the
 * innermost by DRAW_MIN, the outermost by DRAW_MAX, so the mandala tightens as
 * well as shrinking. And how much each shape shrinks in itself.
 */
const DRAW_MIN = 0.12
const DRAW_MAX = 0.3
const SHRINK = 0.38
/** The ring the drop leaves in the ink as it lands: seconds, and how far it spreads, in units. */
const SPLASH_S = 0.9
const SPLASH_R = 16

/* --- The strike ------------------------------------------------------------ */

/**
 * Seconds for a loosed shape's speed to fall by e: drag on an arrow. It sets
 * off at LOOSE_FAR / LOOSE_TAU, some 2,000 to 3,000px a second on a 1440
 * screen, and has flown 90% of its way in half a second.
 */
const LOOSE_TAU = 0.22
/** How far a shape flies, in units: this, plus a share of its own radius, so the rim flies furthest. */
const LOOSE_FAR = 140
const LOOSE_FAR_PER = 0.6
/**
 * Seconds of flight a shape streaks over, like a photograph of it in motion.
 * At 0.035 the first frames of the strike were all streak, a sunburst of
 * hairlines in which no shape could be told from another; at this the
 * streaks still say speed and the shapes are still arrows.
 */
const BLUR_S = 0.022
/**
 * The longest a streak may be, in units. In the first frame after the strike
 * every shape is at full speed at once, and uncapped the mandala flashed into
 * a starburst of long black rays for a frame before any arrow could be seen.
 */
const STREAK_MAX = 14
/** Seconds a loosed shape takes to fade out. */
const LOOSE_FADE_S = 0.85
/** Seconds between the centre letting go and the rim: the strike leaves from the middle. */
const LOOSE_STAGGER = 0.07
/** Seconds after the strike the mandala begins to gather again, how long each ring takes, and the lag from centre to rim. */
const RETURN_AFTER = 1.3
const RETURN_S = 2.2
const RETURN_STAGGER = 0.8
/** Where a returning shape starts from, as shares of its place and its size. */
const RETURN_FROM = 0.9
const RETURN_SHRINK = 0.82

/* --- The clouds ------------------------------------------------------------ */

/**
 * The clouds' pace at the height of the gust, as a multiple of their drift,
 * how quickly it comes, and the time constant it dies away over. At three
 * seconds they are still going six times their pace; by ten they are all but
 * back. The drift is the page's CSS animation (`chess-cloud-drift`), and only
 * its playback rate is touched, so the bank carries on from wherever the gust
 * left it.
 */
const RUSH = 20
const RUSH_RISE_S = 0.15
const RUSH_TAU = 1.8
const RUSH_END_S = 12

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

function setRate(animation: Animation, rate: number) {
  // updatePlaybackRate keeps a compositor animation in step, without the
  // hitch that assigning playbackRate directly can cause.
  if (typeof animation.updatePlaybackRate === "function") animation.updatePlaybackRate(rate)
  else animation.playbackRate = rate
}

type Group = {
  motion: MoonMotion
  /** Whether it breathes, and the seconds between its breaths. */
  breathes: boolean
  period: number
  /** The mean radius of its shapes, which is when the strike and the return reach it. */
  radius: number
  /** Its shapes, sorted by the stroke the file draws them in, and where each stroke's run ends. */
  shapes: MoonShape[]
  runs: { stroke: number; from: number; to: number }[]
  /** How far it has turned, in radians, and how far its breathing has run, in seconds of its own time. */
  turn: number
  clock: number
  /**
   * Its outlines as last traced, one path per run, and the figures they were
   * traced at. A ring that only turns, or only grows and shrinks, is drawn
   * from these, turned and scaled, rather than traced again every frame.
   */
  kept: Path2D[]
  keptAt: string
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
    return {
      motion,
      breathes,
      period,
      radius: shapes.reduce((sum, s) => sum + s.r, 0) / shapes.length,
      shapes,
      runs,
      turn: 0,
      // A breathing ring starts at the moment a breath has fully come up where
      // it sits, so the canvas takes over from the still picture unseen.
      clock: breathes ? SURFACE * BREATH_LIFE * period : 0,
      kept: [],
      keptAt: "",
    }
  })
}

/**
 * The breaths of a ring now in the air: how far each has come on its journey
 * (0 where the ring sits, 1 at its end) and how much of it is left to see.
 */
function breaths(clock: number, period: number): { out: number; alpha: number }[] {
  const out: { out: number; alpha: number }[] = []
  for (let age = (clock / period) % 1; age < BREATH_LIFE; age += 1) {
    const u = age / BREATH_LIFE
    if (u < SURFACE) {
      out.push({ out: 0, alpha: smooth(u / SURFACE) })
    } else {
      // It lingers as it leaves and gathers pace. It holds most of its light
      // for most of the way and gives it up toward the end: fading from the
      // start, as it first did, the breaths were gone before they had gone
      // far enough to be seen going.
      const w = (u - SURFACE) / (1 - SURFACE)
      out.push({ out: Math.pow(w, 1.4), alpha: 1 - Math.pow(w, 1.6) })
    }
  }
  return out
}

const STILL = [{ out: 0, alpha: 1 }]

/** Adds one outline to a path: its middle at `radius`, turned by `turn`, scaled along and across its radius. */
function trace(
  path: Path2D,
  shape: MoonShape,
  radius: number,
  turn: number,
  along: number,
  shift: number,
  across: number,
) {
  const angle = shape.angle + turn
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const cx = radius * ux
  const cy = radius * uy
  const local = shape.local
  for (let i = 0; i < local.length; i += 2) {
    const a = local[i] * along + shift
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
  /** Sent on to the moon's centre: seconds since, and how it looked at that moment. */
  sent: boolean
  since: number
  sentAlpha: number
  sentR: number
}

type Phase = "rest" | "fall" | "ink" | "strike" | "recede"

export function MoonMandala({ rings }: { rings: MoonRing[] }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const dropCanvas = dropRef.current
    if (!box || !canvas || !dropCanvas) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")
    const dctx = dropCanvas.getContext("2d")
    const frameEl = box.parentElement
    const section = box.closest("section")
    if (!ctx || !dctx || !frameEl || !section) return
    const clouds = frameEl.querySelector<HTMLElement>(".chess-cloud-track")

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
    let dropR = DROP_R
    let fallReach = REACH

    /* The drops at the middle of the seam. */
    const rand = seeded(0x1d20)
    let drips: Drip[] = []
    let gathered = 0
    let gatherS = GATHER_MIN + rand() * GATHER_SPREAD
    /** Sent on with nothing in the air to send: the next drop to let go goes all the way. */
    let sendNext = false
    let dropShown = false

    /* The sequence. */
    let phase: Phase = "rest"
    let armed = false
    /** Where the seam stood in the window last frame, to tell the page coming back down. */
    let lastSeam = NaN
    let ink = 0
    let inkAlpha = 1
    let dropAlpha = 1
    let drawTarget = 0
    let drawn = 0
    let drawnAtStrike = 0
    let landWay = 0
    let landAt = -1
    let strikeAt = -1
    let hush = 0

    /* The clouds' gust. */
    let rushAt = -1
    let rushRate = 1
    let rushAnimations: Animation[] = []

    const measure = () => {
      const rect = box.getBoundingClientRect()
      if (!rect.width) return
      const cssW = rect.width
      const cssH = rect.width * VISIBLE
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
      // so it paints over the mandala and under the words and the clouds.
      const seam = section.getBoundingClientRect().top
      const frameTop = frameEl.getBoundingClientRect().top
      const narrow = window.innerWidth < NARROW_W
      dropH = rect.top + cssW / 2 - seam
      dropR = narrow ? DROP_R_NARROW : DROP_R
      fallReach = narrow ? REACH_NARROW : REACH
      dropDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const stripH = Math.max(1, dropH + dropR * 4)
      dropCanvas.style.top = `${seam - frameTop}px`
      dropCanvas.style.height = `${stripH}px`
      dropCanvas.width = Math.round(DROP_W * dropDpr)
      dropCanvas.height = Math.round(stripH * dropDpr)
      dropShown = false
    }

    const startRush = (now: number) => {
      rushAnimations = clouds?.getAnimations() ?? []
      rushAt = now
    }
    const stopRush = () => {
      if (rushAt < 0) return
      rushAt = -1
      rushRate = 1
      for (const a of rushAnimations) setRate(a, 1)
    }
    const rushClouds = (now: number) => {
      if (rushAt < 0) return
      const t = (now - rushAt) / 1000
      if (t >= RUSH_END_S) return stopRush()
      const rate =
        1 + (RUSH - 1) * smooth(clamp01(t / RUSH_RISE_S)) * Math.exp(-Math.max(0, t - RUSH_RISE_S) / RUSH_TAU)
      // Only touched once the rate has really moved.
      if (Math.abs(rate - rushRate) > rushRate * 0.02) {
        rushRate = rate
        for (const a of rushAnimations) setRate(a, rate)
      }
    }

    /** How a drop looks now: its strength and radius, faded by its way down or, once sent on, coming back. */
    const look = (d: Drip) => {
      if (d.sent) {
        const k = smooth(clamp01(d.since / RECOVER_S))
        return {
          alpha: (d.sentAlpha + (DROP_PEAK - d.sentAlpha) * k) * dropAlpha,
          r: d.sentR + (dropR - d.sentR) * k,
        }
      }
      const gone = fallen(d.t) / d.reach
      return { alpha: DROP_PEAK * (1 - Math.pow(gone, DECAY)), r: dropR * (1 - (1 - R_END) * gone) }
    }

    /**
     * Sends a drop on to the moon's centre: the newest one in the air if it is
     * near enough its start, or else the next to let go.
     */
    const sendOn = () => {
      const newest = drips.reduce<Drip | null>((a, d) => (!d.sent && (!a || d.t < a.t) ? d : a), null)
      if (newest && fallen(newest.t) < SEND_WITHIN * newest.reach) {
        const { alpha, r } = look(newest)
        newest.sent = true
        newest.since = 0
        newest.sentAlpha = alpha
        newest.sentR = r
      } else {
        sendNext = true
      }
      dropAlpha = 1
    }

    /** Moves the drops on by `dt`, and lets a new one go when its bead has gathered. */
    const drip = (dt: number) => {
      const sending = phase === "fall"
      // While one is on its way to the moon, the middle of the seam holds its
      // water, unless that one has still to let go.
      if (!sending || sendNext) {
        gathered += dt
        if (gathered >= gatherS) {
          drips.push({
            t: gathered - gatherS,
            reach: fallReach * (1 - rand() * SHORT),
            sent: sendNext,
            since: 0,
            sentAlpha: DROP_PEAK,
            sentR: dropR,
          })
          sendNext = false
          gathered = 0
          gatherS = GATHER_MIN + rand() * GATHER_SPREAD
        }
      }
      for (const d of drips) {
        d.t += dt
        if (d.sent) d.since += dt
      }
      drips = drips.filter((d) => (d.sent ? phase === "fall" || phase === "recede" : fallen(d.t) < d.reach))
    }

    /** Back to rest at once: for when the moon has gone off the screen mid-sequence. */
    const reset = () => {
      phase = "rest"
      armed = false
      ink = drawn = drawTarget = 0
      inkAlpha = dropAlpha = 1
      landAt = strikeAt = -1
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
      const rim = centre - discR
      // 0 when the moon's rim first shows, 1 when its centre stands in the
      // middle of the window: the strike.
      const release = vh * (1 - RELEASE_SHOWN) + discR
      const way = (release - centre) / (release - vh / 2)
      const gone = centre + discR < 0
      // The white section coming back down to the middle of the window: the
      // page is being scrolled back up past the moon.
      const comingBack = lastSeam < vh / 2 && seam >= vh / 2
      lastSeam = seam
      let drawRate = 1 / DRAW_MIN_S

      switch (phase) {
        case "rest":
          // Armed once the white section stands in the lower half of the
          // window, or the moon is out of sight below it: on the way down it is
          // sent on as the rim first shows, and on the way back up it is sent
          // on again the moment the section comes back down to the middle.
          if (seam >= vh / 2 || rim >= vh) armed = true
          if (!gone && (comingBack || (armed && rim <= vh * (1 - RELEASE_SHOWN)))) {
            phase = "fall"
            armed = false
            sendOn()
          }
          break
        case "fall": {
          const sent = drips.find((d) => d.sent)
          if (seam > vh) phase = "recede"
          else if (gone) reset()
          else if (sent && dropR * 1.2 + fallen(sent.t) >= dropH) {
            phase = "ink"
            ink = 0
            inkAlpha = 1
            landAt = now
            landWay = way
            drips = drips.filter((d) => !d.sent)
          }
          break
        }
        case "ink": {
          ink = Math.min(1, ink + dt / INK_S)
          // The reader's scroll from where the drop landed to the strike draws
          // the bow. A drop that lands with less than DRAW_ROOM of the way
          // left draws it over that last stretch, so that at the strike it
          // draws itself, and it still gives back if the page goes back.
          const from = Math.min(landWay, 1 - DRAW_ROOM)
          const byScroll = clamp01((way - from) / (1 - from))
          drawTarget = Math.min(smooth(byScroll), smooth(clamp01((ink - INK_BEFORE_DRAW) / (1 - INK_BEFORE_DRAW))))
          if (seam > vh) phase = "recede"
          else if (gone) reset()
          else if (ink >= 1 && way >= 1 && drawn >= 0.97) {
            phase = "strike"
            strikeAt = now
            drawnAtStrike = drawn
            startRush(now)
          }
          break
        }
        case "strike":
          if ((now - strikeAt) / 1000 > RETURN_AFTER + RETURN_S + RETURN_STAGGER) {
            phase = "rest"
            ink = drawn = drawTarget = 0
            strikeAt = -1
            armed = false
          }
          break
        case "recede":
          // The page was scrolled back up past the white section before the
          // strike: the drop and the ink fade, the bow is eased and the rings
          // wake, and it can all play again.
          drawTarget = 0
          drawRate = Infinity
          inkAlpha = Math.max(0, inkAlpha - dt / 1.2)
          dropAlpha = Math.max(0, dropAlpha - dt / 0.4)
          if (inkAlpha <= 0 && dropAlpha <= 0 && drawn < 0.01) reset()
          break
      }

      // The bow follows its figure smoothly, and never faster than a full draw
      // in DRAW_MIN_S. Landed exactly, so a mandala at rest draws the same
      // shapes frame after frame and its still rings can be kept.
      if (Math.abs(drawTarget - drawn) < 1e-4) drawn = drawTarget
      else {
        const eased = approach(drawn, drawTarget, DRAW_EASE_S, dt)
        const most = drawRate * dt
        drawn = drawn + Math.max(-most, Math.min(most, eased - drawn))
      }
      const hushed = phase === "fall" || phase === "ink" ? 1 : 0
      hush = approach(hush, hushed, hushed > hush ? HUSH_S : WAKE_S, dt)
    }

    const draw = (now: number, dt: number) => {
      if (!art) return
      const speed = 1 - (1 - HUSH) * hush
      for (const g of groups) {
        g.turn += ((g.motion.spin ?? 0) * speed * dt * Math.PI) / 180
        g.clock += speed * dt
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, origin, origin)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const reach = art.reach
      const strikeAge = phase === "strike" ? (now - strikeAt) / 1000 : -1
      const held = smooth(drawn)
      const cocked = smooth(drawnAtStrike)

      // The ink: a radial gradient while its edge is crossing the mandala,
      // solid once it has passed the rim, so that shapes flying out beyond
      // any radius stay black.
      let inkStyle: string | CanvasGradient | null = null
      let inkOnly = false
      if (ink > 0 && (phase === "ink" || phase === "recede" || (phase === "strike" && strikeAge < RETURN_AFTER))) {
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

      const paint = (
        g: Group,
        alpha: number,
        withInk: boolean,
        withColour: boolean,
        place: (s: MoonShape, path: Path2D) => void,
        /** The figures the shapes are placed by, when they alone decide it: the paths are kept under them. */
        keep?: string,
        /**
         * A turn and a scale to draw the paths at, rather than traced into
         * them. A ring that only turns or grows is kept traced as it stands
         * and drawn turned and scaled, so moving costs it nothing.
         */
        turn = 0,
        zoom = 1,
      ) => {
        if (alpha <= 0.002 || !art) return
        const reuse = keep !== undefined && g.keptAt === keep && g.kept.length === g.runs.length
        const moved = turn !== 0 || zoom !== 1
        if (moved) {
          const cos = Math.cos(turn) * scale * zoom
          const sin = Math.sin(turn) * scale * zoom
          ctx.setTransform(cos, sin, -sin, cos, origin, origin)
        }
        for (let n = 0; n < g.runs.length; n++) {
          const run = g.runs[n]
          let path = reuse ? g.kept[n] : null
          if (!path) {
            path = new Path2D()
            for (let i = run.from; i < run.to; i++) place(g.shapes[i], path)
            if (keep !== undefined) g.kept[n] = path
          }
          const stroke = art.strokes[run.stroke]
          if (withColour) {
            ctx.globalAlpha = alpha
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = stroke.width / zoom
            ctx.stroke(path)
          }
          if (withInk && inkStyle) {
            ctx.globalAlpha = alpha * inkAlpha
            ctx.strokeStyle = inkStyle
            ctx.lineWidth = Math.max(stroke.width, INK_WIDTH) / zoom
            ctx.stroke(path)
          }
        }
        if (keep !== undefined) g.keptAt = keep
        if (moved) ctx.setTransform(scale, 0, 0, scale, origin, origin)
      }

      for (const g of groups) {
        const drift = g.motion.drift ?? 0
        const grow = g.motion.scale ?? 0
        const lengthen = g.motion.stretch ?? 0
        const air = g.breathes ? breaths(g.clock, g.period) : STILL

        if (strikeAge < 0) {
          // At rest, falling, inking, drawn: every shape in its place, drawn in
          // toward the centre by the bow and shrunk in itself.
          const across = 1 - held * SHRINK
          const pull = (s: MoonShape) => 1 - held * (DRAW_MIN + ((DRAW_MAX - DRAW_MIN) * s.r) / reach)
          if (!drift && !lengthen) {
            // A ring that only turns, or grows and shrinks as it breathes, is
            // traced once as it stands under the bow and drawn turned and
            // scaled, every breath from the same path.
            for (const { out, alpha } of air) {
              paint(
                g,
                alpha,
                true,
                !inkOnly,
                (s, path) => trace(path, s, s.r * pull(s), 0, across, 0, across),
                `${held}`,
                g.turn,
                1 + grow * out,
              )
            }
          } else {
            for (const { out, alpha } of air) {
              const zoom = 1 + grow * out
              const size = across * zoom
              const along = size * (1 + lengthen * out)
              paint(g, alpha, true, !inkOnly, (s, path) =>
                trace(path, s, (s.r * zoom + out * drift) * pull(s), g.turn, along, 0, size),
              )
            }
          }
          continue
        }

        // The strike. The ring lets go a moment after the centre, and every
        // shape flies straight out, fastest at first, streaking backward
        // along its way by as far as it travels in BLUR_S.
        const loose = strikeAge - (LOOSE_STAGGER * g.radius) / reach
        if (loose < LOOSE_FADE_S) {
          const across = 1 - cocked * SHRINK
          const fade = loose < 0 ? 1 : 1 - smooth(clamp01((loose - 0.05) / (LOOSE_FADE_S - 0.05)))
          const drag = loose < 0 ? 1 : Math.exp(-loose / LOOSE_TAU)
          for (const { out, alpha } of air) {
            const zoom = 1 + grow * out
            const size = across * zoom
            const along = size * (1 + lengthen * out)
            paint(g, alpha * fade, true, false, (s, path) => {
              const pull = 1 - cocked * (DRAW_MIN + ((DRAW_MAX - DRAW_MIN) * s.r) / reach)
              const far = LOOSE_FAR + LOOSE_FAR_PER * s.r
              const flown = loose < 0 ? 0 : far * (1 - drag)
              const streak = loose < 0 ? 0 : Math.min(STREAK_MAX, (far / LOOSE_TAU) * drag * BLUR_S)
              // Streaked backward, so its leading edge stays where it would be.
              const streaked = s.half > 0 ? along + streak / (2 * s.half) : along
              trace(path, s, (s.r * zoom + out * drift) * pull + flown, g.turn, streaked, s.half * (along - streaked), size)
            })
          }
        }

        // And gathers again where it was, from the centre out, in its own colours.
        const back = smooth(clamp01((strikeAge - RETURN_AFTER - (RETURN_STAGGER * g.radius) / reach) / RETURN_S))
        if (back > 0) {
          const size0 = RETURN_SHRINK + (1 - RETURN_SHRINK) * back
          const place = RETURN_FROM + (1 - RETURN_FROM) * back
          for (const { out, alpha } of air) {
            const zoom = 1 + grow * out
            const size = size0 * zoom
            const along = size * (1 + lengthen * out)
            paint(g, alpha * back, false, true, (s, path) =>
              trace(path, s, (s.r * zoom + out * drift) * place, g.turn, along, 0, size),
            )
          }
        }
      }

      // The ring the drop leaves as it lands.
      if (landAt >= 0) {
        const u = (now - landAt) / 1000 / SPLASH_S
        if (u < 1) {
          ctx.globalAlpha = 0.55 * (1 - u) * inkAlpha
          ctx.strokeStyle = INK
          ctx.lineWidth = INK_WIDTH
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
        // Falling, quickening until the air holds it, with its light drawn out
        // behind it, from where the bead had sagged to.
        const { alpha, r } = look(d)
        if (alpha < 0.002) continue
        const y = Math.min(dropH, dropR * 1.2 + fallen(d.t))
        const v = falling(d.t)
        const tail = Math.min(TAIL_MAX, v * SMEAR)
        if (tail > r) {
          const gradient = dctx.createLinearGradient(x, y - tail, x, y)
          gradient.addColorStop(0, `rgba(${DROP_RGB},0)`)
          gradient.addColorStop(1, `rgba(${DROP_RGB},${alpha})`)
          dctx.strokeStyle = gradient
          dctx.lineWidth = r * 1.5
          dctx.lineCap = "round"
          dctx.beginPath()
          dctx.moveTo(x, y - tail)
          dctx.lineTo(x, y)
          dctx.stroke()
        }
        dctx.fillStyle = `rgba(${DROP_RGB},${alpha})`
        dctx.beginPath()
        dctx.ellipse(x, y, r, r * (1 + STRETCH * Math.min(1, v / V_MAX)), 0, 0, Math.PI * 2)
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
      rushClouds(now)
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      // Not known until the first frame has measured it, so that frame is
      // never read as the page coming back.
      lastSeam = NaN
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      stopRush()
      // Off the screen mid-sequence, it goes back to rest where nobody sees
      // it; after the strike it simply finishes.
      if (phase !== "strike") reset()
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
    })
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
      stopRush()
      if (imageRef.current) imageRef.current.style.visibility = ""
    }
  }, [rings])

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
