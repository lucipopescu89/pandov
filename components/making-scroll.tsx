"use client"

import { useEffect } from "react"
import {
  clamp01,
  smooth,
  ramp,
  words,
  FADE,
  ARRIVE,
  arriveOpacity,
  fireTravel,
  fireSlowFrom,
  FIRE_EASE,
  FIRE_HOLD,
  PHONE_FIRE_ARRIVE,
  PHONE_FIRE_DRIFT,
  PHONE_FIRE_EXIT,
} from "@/lib/making-rhythm"

/* --------------------------------------------------------------------------
   The scroll on /making (`making-page.tsx`), written onto the page as it moves.
   It reads where the two held passages stand and sets opacities, dashes and
   one mask; layout is left to CSS (`position: sticky`).

   - The found wood: it comes up out of transparency and is held; the
     photograph travels down through its frame. Held, in turns (`STAGE`): the
     top words, its drawing traced and then untraced (each line drawn back
     from its end, the last drawn first), the bottom words. The drawing lives
     on the photograph's plate and never moves against it.
   - The fire: since 2026-11-19 not held: its own passage (`.mk-fs`) begins
     as the found wood is nearly gone, and it goes up the window all the way,
     slower about the middle where its words are (`fireTravel`). (Until then
     it rose over the found wood, was held, and a veil of the dark came over
     it.)
   - The sketches: they come up out of the white as their passage rises into
     the window; held, the first words come, Siluet 2 rises out of the paper
     from its foot, the words go, and the page moves on to Heavy Light
     (`making-heavy.tsx`, which has the last words since 2026-11-19, on
     white).

   Every change follows the scroll, so it goes back the way it came.

   Since 2026-11-19 every passage keeps the page's one rhythm
   (`lib/making-rhythm.ts`): the words come and go over `FADE` (`words`), the
   fire comes up out of transparency as the found wood does, and the turning
   piece comes in over its end (`making-harag.tsx`).
   The sketches are held in the found wood's frame (`--h1`), not the window.
   -------------------------------------------------------------------------- */

/** The drawing: each stroke takes this share of the tracing, the next starting `TRACE_STEP` later. */
const TRACE_SPAN = 0.42
/** The photograph is fully there by this share of its way to the middle, */
const ARRIVE_BY = 0.7
/** and rises this share of the window more than the page moves it, easing in. */
const ARRIVE_RISE = 0.12

/**
 * Held, the found wood tells its passage in turns (2026-11-17, the author's
 * asking: one thing after another), measured in windows of scroll since its
 * frame settled: the top words come and go; the drawing is traced, stands and
 * is untraced; the bottom words come and go while it is untraced, so that all
 * is done by the time the photograph has travelled to its foot (`PAN_END`)
 * and it can leave without waiting.
 */
const STAGE = {
  // The top words come as the photograph settles (from a quarter of a window
  // before it), and go early once it is held, before the drawing.
  top: [-0.25, 0.57],
  // They come as the drawing begins to be drawn back.
  bottom: [1.15, 1.85],
} as const
/**
 * The fire's words, in windows of scroll: they come this far before its slowing
 * begins, and are gone this far before it stands in the middle of the window.
 */
const FIRE_WORDS_LEAD = 0.25
const FIRE_WORDS_CLEAR = 0.05
/**
 * The last words and the menu: they come in from this share of the last
 * screen's way up (Heavy Light's white then nearly done), and rise together
 * this share of the window (the words from about its middle to 30% down).
 */
const LAST_IN = 0.15
const LAST_RISE = 0.2
/**
 * While the page flows: Heavy Light goes into the white as it rises
 * (`RISE_WHITE`, 0.4 of a window, making-heavy.tsx), and the last words come
 * only once it is nearly white (2026-11-19, the author's asking).
 */
const LAST_IN_FLOW = 0.32
/** The sketches, in windows since their frame settled: the words, and Siluet 2 rising. */
const PAPER_WORDS = [0.55, 1.85] as const
const PAPER_GROW = [0.6, 1.9] as const

/**
 * The drawing (2026-11-18, the author's asking: no empty scroll between the
 * top words and the drawing, the way down a little quicker, the drawing drawn
 * more slowly): it begins at `TRACE_FROM`, as the top words finish going, and
 * the photograph is brought down so that its circle has just come into the
 * frame by then (its foot at `CIRCLE.seenAt` of the frame's height; see the
 * pan, below). It is traced over `TRACE_FOR` windows of scroll (0.4 until
 * then), stands `TRACE_STAND`, and is untraced over `UNTRACE_FOR` (in
 * reverse, the last drawn first). `CIRCLE` is the knot's hollow on the plate,
 * as shares of its height: centre 908 and radius 37.5 (+1 of stroke) on the
 * whole photograph, less the 90 cut from its top (`WOOD_CROP` in
 * `making-page.tsx`), of 1190.
 */
const PLATE_H = 1190
const CIRCLE = { y: (908 - 90) / PLATE_H, r: 38.5 / PLATE_H, seenAt: 0.9 }
const TRACE_FROM = 0.55
const TRACE_FOR = 0.65
const TRACE_STAND = 0.15
const UNTRACE_FOR = 0.4

/**
 * Its leaving (the author's asking: not held while the page goes on, but going
 * up and fading as it came, and smoothly): from the moment the photograph has
 * travelled to its foot, the frame goes up with the page, at first at the
 * photograph's own pace and gathering to the page's over `EXIT_EASE` of the
 * window, so it never stops; it fades out over `EXIT_FADE`. The fire comes up
 * after it.
 */
const EXIT_EASE = 0.3
const EXIT_FADE = 0.45

/**
 * The photograph is drawn larger than its frame (`--zoom` in
 * `making-page.tsx`) and travels through it straight down, top to bottom
 * (2026-11-17, the author's asking: only vertically, quickly, from the moment
 * its frame settles, without a pause), until `PAN_END`. Not at one pace since
 * 2026-11-18 (the author's asking): quicker on the way down to the knot (about
 * 1.15 times the even pace it had), bringing the circle in by `TRACE_FROM`,
 * then slower while the drawing is drawn, the change of pace eased over
 * `KNEE` windows; where the circle is in the frame from the start (a phone),
 * one pace throughout (`panAt`).
 * Sideways it stands still, the branch towards the right (`PAN_LEFT`, the
 * plate's left edge as a share of the frame's width), so the top words on the
 * left and the bottom words on the right both stand clear of it: measured on
 * IMG_5078 the branch's left edge is at 0.55–0.52 of the photograph's width
 * where the top words are read and its right edge at 0.545 where the bottom
 * words are. A phone's frame is too narrow for that: there the branch's middle
 * is kept at the frame's middle (`PHONE_BRANCH_X`).
 */
/** In windows of scroll since the frame settled. */
const PAN_END = 1.85
const KNEE = 0.3
const PAN_LEFT = -0.16
const PHONE_BRANCH_X = 0.48
/** The knot's circle across the plate (746.5 of 1920), and how far from the frame's left edge it is kept at least on a phone. */
const CIRCLE_X = 746.5 / 1920
const CIRCLE_MIN_X = 0.3
const PHONE = "(max-width: 767px)"

/**
 * The found wood's gearing (2026-11-19, the author's asking: on a narrow
 * screen the photograph went down its frame slowly). Its frame and plate are
 * sized by the window's width (vw) but its passage was measured in windows of
 * height, so a narrower window gave the photograph less to travel over the
 * same scroll: about 34px of picture per 100px of scroll at 1920 × 950, 15px
 * at 800 × 900. Now the passage is measured in a shorter "window" there, in
 * proportion to the photograph's travel (`REF_TRAVEL` of the window's height,
 * a 1440–1920 desktop's), so it goes at about the same pace everywhere; every
 * turn (`STAGE`, the drawing, the leaving) keeps its place along the way, and
 * the stretch before the fire (`--s1`, `S1_VH` in the CSS) is shortened with
 * it. A wide screen is unchanged (`f` is 1); never below `MIN_GEAR`, so the
 * words still have time to be read; the phone keeps its own (the author's
 * call still to make).
 */
const REF_TRAVEL = 0.6
const MIN_GEAR = 0.45
/** `--s1` in `making-page.tsx` (210vh, the phone's too): keep the two in step. */
const S1_VH = 210

/**
 * The paces of the pan, as shares of its travel per window of scroll: `fast`
 * until `TRACE_FROM`, `slow` after it, so that by `TRACE_FROM` it has come
 * `vIn` of its way (where the circle has just come into the frame) and by
 * `PAN_END` all of it. Never slower before than after.
 */
function panPaces(vIn: number) {
  const even = 1 / PAN_END
  const fast = Math.min(Math.max(vIn / TRACE_FROM, even), 0.9 / TRACE_FROM)
  const slow = (1 - fast * TRACE_FROM) / (PAN_END - TRACE_FROM)
  return { fast, slow }
}

/** How far the pan has come at `u`, 0–1: the two paces, eased one into the other across `KNEE`. */
function panAt(u: number, fast: number, slow: number) {
  const a = TRACE_FROM - KNEE / 2
  if (u <= a) return clamp01(fast * u)
  const t = Math.min(1, (u - a) / KNEE)
  // The pace eases by a smoothstep; this is its integral (t³ − t⁴/2).
  let v = fast * a + KNEE * (fast * t + (slow - fast) * (t * t * t - (t * t * t * t) / 2))
  if (u > a + KNEE) v += slow * (u - a - KNEE)
  return clamp01(v)
}

export function MakingScroll() {
  useEffect(() => {
    const $ = (k: string) => document.querySelector<HTMLElement>(`[data-mk="${k}"]`)
    const wood = $("wood")
    const drawing = $("drawing")
    const fire = $("fire")
    const woodWords1 = $("wood-words-1")
    const woodWords2 = $("wood-words-2")
    const plate = $("plate")
    const fireWords = $("fire-words")
    const fireSec = $("fire-sec")
    const paper = $("paper")
    const stage = $("stage")
    const sketches = $("sketches")
    const siluet = $("siluet")
    const rise = document.querySelector<SVGRectElement>('[data-mk="rise"]')
    const paperWords = $("paper-words")
    const end = $("end")
    const bgVeil = $("bg-veil")
    const flowing = !!wood?.closest(".mk-flow")
    const endIn = $("end-in")
    if (!wood || !drawing || !paper || !stage) return

    // The strokes, in the order the export lists them; the circle is the knot.
    const traces = Array.from(drawing.querySelectorAll<SVGElement>("[data-trace]"))
    const n = traces.length
    const step = n > 1 ? (1 - TRACE_SPAN) / (n - 1) : 0
    // An outline goes out along one side of its line and back along the
    // other; drawn as a 9-unit stroke, its first half covers the whole line.
    const reach = traces.map((t) => (t.dataset.trace === "mask" ? 0.52 : 1))

    let raf = 0
    // What was last written, so a scroll that changes nothing writes nothing.
    const written = new WeakMap<Element, Record<string, string>>()
    const set = (el: Element | null, prop: string, value: string) => {
      if (!el) return
      const was = written.get(el) ?? {}
      if (was[prop] === value) return
      was[prop] = value
      written.set(el, was)
      if (prop.startsWith("attr:")) el.setAttribute(prop.slice(5), value)
      else (el as HTMLElement).style.setProperty(prop, value)
    }

    /**
     * A phone, to try (2026-11-19, the author's asking: "it runs very heavy;
     * take off all the holding to the screen and let us see how the page
     * flows"): the found wood, the fire and the sketches are not held; they
     * go up with the page, and what they do is read off how far each has
     * come through the window (`passing`: 0 as it comes in at the foot, or
     * where it first stands, to 1 as it leaves at the top). Only the turning
     * piece and Heavy Light, which play sequences, are still held.
     */
    const passing = (el: HTMLElement, vh: number) => {
      const r = el.getBoundingClientRect()
      const docTop = r.top + window.scrollY
      const from = Math.min(vh, docTop)
      return { p: clamp01((from - r.top) / Math.max(1, from + r.height)), first: docTop < vh }
    }
    const lastScreen = (vh: number) => {
    // ── The last screen: the last words with the bottom menu (2026-11-19) ──
    // The words and the menu are one (`.mk-end-in`): they come out of
    // transparency together, the words about the middle of the window,
    // Heavy Light nearly gone into the white (`LAST_IN` of the last
    // screen's way up), and rise together, only `LAST_RISE` of the window,
    // reaching their places as the page ends. (Earlier that day the words
    // came alone, or the two came up with the page from its foot.)
    if (end && endIn) {
      const top = end.getBoundingClientRect().top
      const p = clamp01(1 - top / vh)
      const from = flowing ? LAST_IN_FLOW : LAST_IN
      const l = ramp(p, from, from + FADE)
      set(endIn, "opacity", l.toFixed(3))
      set(endIn, "transform", `translate3d(0, ${((1 - p) * LAST_RISE * vh - Math.max(0, top)).toFixed(1)}px, 0)`)
      set(endIn, "pointer-events", l > 0.5 ? "auto" : "none")
    }
    }
    const phoneFlow = (vh: number) => {
      // ── The found wood ──
      const holdEl = wood.firstElementChild as HTMLElement
      set(holdEl, "transform", "none")
      const w = passing(holdEl, vh)
      const fadeIn = w.first ? 1 : ramp(w.p, 0.02, 0.2)
      set(holdEl, "opacity", (fadeIn * (1 - ramp(w.p, 0.8, 0.97))).toFixed(3))
      if (plate) {
        const fw = holdEl.offsetWidth
        const pw = plate.offsetWidth
        const fhh = holdEl.offsetHeight
        const phh = plate.offsetHeight
        const travel = Math.max(0, phh - fhh)
        // The branch in the middle, unless that would take the knot's circle
        // (the drawing's centre of interest, `CIRCLE_X` of the plate's width)
        // nearer the left edge than `CIRCLE_MIN_X` of the frame: then the
        // circle is kept there (2026-11-19, the author's asking).
        const xBranch = fw / 2 - PHONE_BRANCH_X * pw
        const xCircle = CIRCLE_MIN_X * fw - CIRCLE_X * pw
        // A computer: the branch towards the right, as when it was held (`PAN_LEFT`).
        const xWant = window.matchMedia(PHONE).matches ? Math.max(xBranch, xCircle) : PAN_LEFT * fw
        const x = Math.min(0, Math.max(fw - pw, xWant))
        // It starts as far down the photograph as needs be for the knot's
        // circle to be in the frame (its foot at 85% of it) by the time the
        // drawing begins (`w.p` 0.25): on a wide screen the frame shows less of
        // the photograph's height, and the circle came in already drawn
        // (2026-11-19, the author's asking).
        const vIn = travel > 0 ? clamp01(((CIRCLE.y + CIRCLE.r) * phh - 0.85 * fhh) / travel) : 0
        const k0 = 0.25 / 0.85
        const v0 = clamp01((vIn - k0) / (1 - k0))
        const v = v0 + (1 - v0) * clamp01(w.p / 0.85)
        set(plate, "transform", `translate3d(${x.toFixed(1)}px, ${(-travel * v).toFixed(1)}px, 0)`)
      }
      const pTrace = clamp01((w.p - 0.25) / 0.25)
      const pOut = clamp01((w.p - 0.55) / 0.15)
      traces.forEach((t, i) => {
        const drawn = smooth((pTrace - i * step) / TRACE_SPAN)
        const gone = smooth((pOut - (n - 1 - i) * step) / TRACE_SPAN)
        set(t, "attr:stroke-dasharray", `${(Math.min(drawn, 1 - gone) * reach[i]).toFixed(4)} 1`)
      })
      set(woodWords1, "opacity", ((w.first ? 1 : ramp(w.p, 0.08, 0.18)) * (1 - ramp(w.p, 0.2, 0.28))).toFixed(3))
      // The second words (2026-11-19, the author's asking: "they pass too
      // quickly"): lower on the wood (77%, 65% before) and much sooner, as
      // they come up into the lower part of the window while the circle is
      // being drawn; they stay until near the top (0.36 … 0.84 of the way,
      // 0.58 … 0.84 until then).
      set(woodWords2, "opacity", (ramp(w.p, 0.36, 0.46) * (1 - ramp(w.p, 0.74, 0.84))).toFixed(3))

      // ── The fire ──
      if (fire) {
        set(fire, "transform", "none")
        const f = passing(fire, vh)
        // Out of transparency over its first third, as the found wood came; its
        // words high on it, gone before it fills the window (its middle is
        // there at about half its way).
        set(fire, "opacity", (ramp(f.p, 0, 0.32) * (1 - ramp(f.p, 0.78, 0.97))).toFixed(3))
        set(fireWords, "opacity", (ramp(f.p, 0.1, 0.2) * (1 - ramp(f.p, 0.3, 0.4))).toFixed(3))
      }

      // ── The sketches ──
      const band = paper.querySelector<HTMLElement>(".mk-band")
      if (band) {
        const k = passing(band, vh)
        const picture = ramp(k.p, 0.02, 0.25).toFixed(3)
        set(sketches, "opacity", picture)
        set(siluet, "opacity", picture)
        if (rise) set(rise, "attr:y", (868 - ramp(k.p, 0.25, 0.65) * 978).toFixed(1))
        set(paperWords, "opacity", (ramp(k.p, 0.12, 0.25) * (1 - ramp(k.p, 0.6, 0.72))).toFixed(3))
      }
      // ── The white after the scan (2026-11-19, the author's asking: "it goes
      // straight into white, no grey or black under it") ──
      if (bgVeil) {
        const sc = document.querySelector<HTMLElement>('[data-mk="scan"]')
        // White as its words reach the top of the window (the author's asking,
        // later: 0.3–0.48 turned white with them only half way up), nearly so
        // as the picture's foot comes in.
        set(bgVeil, "opacity", sc ? ramp(passing(sc, vh).p, 0.38, 0.54).toFixed(3) : "0")
      }
      lastScreen(vh)
    }

    const update = () => {
      raf = 0
      const vh = window.innerHeight
      // The page flows (nothing held but the turning piece and Heavy Light)
      // on a phone, and on a computer while <main> carries `.mk-flow`
      // (2026-11-19, the author's asking, to see it there too; take the class
      // off in making-page.tsx and the held passages come back).
      if (flowing || window.matchMedia(PHONE).matches) {
        phoneFlow(vh)
        return
      }

      // ── The found wood ──
      {
        const holdEl = wood.firstElementChild as HTMLElement
        // The gearing first (it sets `--s1`, so before anything is measured):
        // from the frame and plate, which do not depend on it.
        const fh0 = holdEl.offsetHeight
        const travel0 = Math.max(0, (plate ? plate.offsetHeight : fh0) - fh0)
        const phone = window.matchMedia(PHONE).matches
        // A phone too since 2026-11-19 (its plate was made larger for it,
        // `--zoom` 1.6): it went at a ninth of the page's pace there.
        const f = Math.min(1, Math.max(MIN_GEAR, travel0 / (REF_TRAVEL * vh)))
        // On the page, not the found wood alone: the fire's passage is placed by it too.
        set(wood.parentElement, "--s1", f < 1 ? `${(S1_VH * f).toFixed(2)}vh` : "")
        // The passage's "window" of scroll: the window's height, or less (`f`).
        const win = vh * f

        const r = wood.getBoundingClientRect()
        const hold = holdEl.getBoundingClientRect()
        const settle = (vh - hold.height) / 2
        // How far the page has gone since the photograph settled and held, in
        // windows of the passage.
        const held = Math.max(0, settle - r.top)
        const u = held / win
        // Its arrival, from where it first stands to its settling: it comes up
        // from below and out of full transparency (the page opens without it).
        const from = Math.min(vh * 0.92, r.top + window.scrollY)
        const pIn = clamp01((from - r.top) / Math.max(1, from - settle))
        // The pan's two paces, from where the circle stands on the plate: the
        // share of the travel that brings its foot up to `CIRCLE.seenAt` of
        // the frame.
        const fh = hold.height
        const ph = plate ? plate.offsetHeight : fh
        const travel = Math.max(0, ph - fh)
        const vIn = travel > 0 ? clamp01(((CIRCLE.y + CIRCLE.r) * ph - CIRCLE.seenAt * fh) / travel) : 0
        const { fast, slow } = panPaces(vIn)
        // And its leaving: up with the page, out of opacity, setting off at
        // the pace the photograph was travelling through the frame.
        const pace = (slow * travel) / win
        const x = Math.max(0, held - PAN_END * win)
        const d = EXIT_EASE * win
        const lift = x < d ? pace * x + ((1 - pace) * x * x) / (2 * d) : pace * d + ((1 - pace) * d) / 2 + (x - d)
        const leave = 1 - smooth(lift / (win * EXIT_FADE))
        set(holdEl, "opacity", (smooth(pIn / ARRIVE_BY) * leave).toFixed(3))
        set(holdEl, "transform", `translateY(${((1 - smooth(pIn)) * vh * ARRIVE_RISE - lift).toFixed(1)}px)`)

        // The photograph travels straight down through its frame from the
        // moment it settles, quicker to the knot, slower while it is drawn
        // (`panAt`); its drawing is on it.
        if (plate) {
          const fw = hold.width
          const pw = plate.offsetWidth
          const v = panAt(u, fast, slow)
          const x = window.matchMedia(PHONE).matches ? fw / 2 - PHONE_BRANCH_X * pw : PAN_LEFT * fw
          const y = -travel * v
          set(plate, "transform", `translate3d(${Math.min(0, Math.max(fw - pw, x)).toFixed(1)}px, ${y.toFixed(1)}px, 0)`)
        }

        // In turns: the top words, the drawing, the bottom words (`x` is `u`
        // but goes on below 0 before it settles).
        const xs = (settle - r.top) / win
        set(woodWords1, "opacity", words(xs, STAGE.top[0], STAGE.top[1]).toFixed(3))
        set(woodWords2, "opacity", words(u, STAGE.bottom[0], STAGE.bottom[1]).toFixed(3))
        // The drawing begins as the top words finish going, the pan having
        // brought its circle into the frame by then.
        const u0 = TRACE_FROM
        const pTrace = clamp01((u - u0) / TRACE_FOR)
        const pOut = clamp01((u - u0 - TRACE_FOR - TRACE_STAND) / UNTRACE_FOR)
        traces.forEach((t, i) => {
          const drawn = smooth((pTrace - i * step) / TRACE_SPAN)
          const gone = smooth((pOut - (n - 1 - i) * step) / TRACE_SPAN)
          const q = Math.min(drawn, 1 - gone) * reach[i]
          set(t, "attr:stroke-dasharray", `${q.toFixed(4)} 1`)
        })
        // The fire (2026-11-19, later, the author's asking): its own
        // passage, not held; it goes up the window all the way, slower about
        // the middle where its words are (`fireTravel`), out of transparency
        // as it comes up from the foot and into it again as it goes out at
        // the top, as the found wood comes and goes.
        if (fire && fireSec && phone) {
          // A phone (2026-11-19, the author's asking): it comes where the
          // found wood stands and as it came, drifts up slowly while it is
          // watched, and goes up and out as the found wood goes.
          const z = -fireSec.getBoundingClientRect().top / vh
          const a = clamp01(z / PHONE_FIRE_ARRIVE)
          const drift = PHONE_FIRE_DRIFT * Math.min(Math.max(0, z), PHONE_FIRE_EXIT)
          const xo = Math.max(0, z - PHONE_FIRE_EXIT)
          const pace = PHONE_FIRE_DRIFT
          const lift =
            xo < EXIT_EASE
              ? pace * xo + ((1 - pace) * xo * xo) / (2 * EXIT_EASE)
              : pace * EXIT_EASE + ((1 - pace) * EXIT_EASE) / 2 + (xo - EXIT_EASE)
          const T = settle + (1 - smooth(a)) * vh * ARRIVE_RISE - (drift + lift) * vh
          set(fire, "transform", `translate3d(0, ${T.toFixed(1)}px, 0)`)
          set(fire, "opacity", (smooth(a / ARRIVE_BY) * (1 - smooth(lift / EXIT_FADE))).toFixed(3))
          set(fireWords, "opacity", words(z, 0.1, 1.0).toFixed(3))
        } else if (fire && fireSec) {
          const h1 = hold.height
          const z = -fireSec.getBoundingClientRect().top / vh
          const T = vh - fireTravel(z, h1 / vh) * vh // its top, in the window
          set(fire, "transform", `translate3d(0, ${T.toFixed(1)}px, 0)`)
          const reach = Math.max(1, vh * 0.92 - settle)
          const pIn = clamp01((vh * 0.92 - T) / reach)
          const pOut = clamp01((settle - T) / reach)
          set(fire, "opacity", (smooth(pIn / ARRIVE_BY) * smooth((1 - pOut) / ARRIVE_BY)).toFixed(3))
          // Its words: early, as it comes up, and gone by the time it stands
          // in the middle of the window, so the fire is then seen with
          // nothing over it (2026-11-19, the author's asking; they stood
          // through the slow stretch until then).
          const z1 = fireSlowFrom(h1 / vh)
          const zMid = z1 + FIRE_EASE + FIRE_HOLD / 2
          set(fireWords, "opacity", words(z, z1 - FIRE_WORDS_LEAD, zMid - FIRE_WORDS_CLEAR).toFixed(3))
        }
      }

      // ── The sketches ──
      // Since 2026-11-19 they begin under the scan's white end: their window
      // is held from the moment the scan's white is done; until then it is
      // transparent and empty, then white, and the picture comes out of
      // transparency in the found wood's frame (`ARRIVE`), its words and
      // Siluet 2 after it. Timed in windows since the window was held.
      {
        const r = paper.getBoundingClientRect()
        const y = -r.top / vh
        set(stage, "background-color", y >= 0 ? "#fff" : "transparent")
        const picture = arriveOpacity(y / ARRIVE).toFixed(3)
        set(sketches, "opacity", picture)
        set(siluet, "opacity", picture)
        const grow = ramp(y, PAPER_GROW[0], PAPER_GROW[1])
        if (rise) set(rise, "attr:y", (868 - grow * 978).toFixed(1))
        set(paperWords, "opacity", words(y, PAPER_WORDS[0], PAPER_WORDS[1]).toFixed(3))
      }

      lastScreen(vh)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
