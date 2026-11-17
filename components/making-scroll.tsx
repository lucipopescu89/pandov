"use client"

import { useEffect } from "react"

/* --------------------------------------------------------------------------
   The scroll on /making (`making-page.tsx`), written onto the page as it moves.
   It reads where the two held passages stand and sets opacities, dashes and
   one mask; layout is left to CSS (`position: sticky`).

   - The found wood: it comes up out of transparency and is held; the
     photograph travels down through its frame. Held, in turns (`STAGE`): the
     top words, its drawing traced and then untraced (each line drawn back
     from its end, the last drawn first), the bottom words. The drawing lives
     on the photograph's plate and never moves against it.
   - The fire: once it has risen over the found wood and holds there too, a
     white veil comes over it as the page goes on.
   - The sketches: they come up out of the white as their passage rises into
     the window; held, the first words come, Siluet 2 rises out of the paper
     from its foot, the words go; then the picture goes down into #202020
     and the last words come up out of it.

   Every change follows the scroll, so it goes back the way it came.
   -------------------------------------------------------------------------- */

const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
const smooth = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}
/** 0 before `a`, 1 after `b`, eased between. */
const ramp = (x: number, a: number, b: number) => smooth((x - a) / (b - a))

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
  // The top words come as the photograph arrives (by its arrival, `pIn`),
  // and go early once it is held.
  top: { in: [0.5, 0.95], out: [0.35, 0.57] },
  // The drawing is not set here: it is begun when its circle stands well in
  // the frame, which depends on the screen's shape (`CIRCLE`, below).
  bottom: { in: [1.1, 1.25], out: [1.55, 1.72] },
} as const

/**
 * The drawing's circle on the photograph, as shares of its height (the knot's
 * hollow, `DRAWING_AT` + the circle in `drawing-wood.svg`: centre 908, radius
 * 38 of 1280), and how high in the frame its foot must stand before the
 * drawing begins. Then it is traced over `TRACE_FOR` windows of scroll, stands
 * `TRACE_STAND`, and is untraced over `UNTRACE_FOR` (in reverse, the last
 * drawn first), never before `STAGE_TRACE_FROM`.
 */
const CIRCLE = { y: 908 / 1280, r: 40 / 1280, seenAt: 0.85 }
const STAGE_TRACE_FROM = 0.6
const TRACE_FOR = 0.4
const TRACE_STAND = 0.12
const UNTRACE_FOR = 0.3

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
 * (2026-11-17, the author's asking: only vertically, quickly, and at an even
 * pace from the moment its frame settles, without a pause), until `PAN_END`.
 * Sideways it stands still, the branch towards the right (`PAN_LEFT`, the
 * plate's left edge as a share of the frame's width), so the top words on the
 * left and the bottom words on the right both stand clear of it: measured on
 * IMG_5078 the branch's left edge is at 0.55–0.52 of the photograph's width
 * where the top words are read and its right edge at 0.545 where the bottom
 * words are. A phone's frame is too narrow for that: there the branch's middle
 * is kept at the frame's middle (`PHONE_BRANCH_X`).
 */
/** In windows of scroll since the frame settled. */
const PAN_END = 1.75
const PAN_LEFT = -0.16
const PHONE_BRANCH_X = 0.48
const PHONE = "(max-width: 767px)"
/** The page's own words, held in the sketches' passage, rise this far as they come, px. */
const RISE_PX = 18
const DARK = [0x20, 0x20, 0x20]

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
    const white = $("white")
    const paper = $("paper")
    const stage = $("stage")
    const sketches = $("sketches")
    const siluet = $("siluet")
    const rise = document.querySelector<SVGRectElement>('[data-mk="rise"]')
    const paperWords = $("paper-words")
    const lastWords = $("last-words")
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

    const update = () => {
      raf = 0
      const vh = window.innerHeight

      // ── The found wood ──
      {
        const r = wood.getBoundingClientRect()
        const holdEl = wood.firstElementChild as HTMLElement
        const hold = holdEl.getBoundingClientRect()
        const settle = (vh - hold.height) / 2
        // How far the page has gone since the photograph settled and held, in
        // windows.
        const held = Math.max(0, settle - r.top)
        const u = held / vh
        // Its arrival, from where it first stands to its settling: it comes up
        // from below and out of full transparency (the page opens without it).
        const from = Math.min(vh * 0.92, r.top + window.scrollY)
        const pIn = clamp01((from - r.top) / Math.max(1, from - settle))
        // And its leaving: up with the page, out of opacity, setting off at
        // the pace the photograph was travelling through the frame.
        const pace = plate ? Math.max(0, plate.offsetHeight - hold.height) / (PAN_END * vh) : 0
        const x = Math.max(0, held - PAN_END * vh)
        const d = EXIT_EASE * vh
        const lift = x < d ? pace * x + ((1 - pace) * x * x) / (2 * d) : pace * d + ((1 - pace) * d) / 2 + (x - d)
        const leave = 1 - smooth(lift / (vh * EXIT_FADE))
        set(holdEl, "opacity", (smooth(pIn / ARRIVE_BY) * leave).toFixed(3))
        set(holdEl, "transform", `translateY(${((1 - smooth(pIn)) * vh * ARRIVE_RISE - lift).toFixed(1)}px)`)

        // The photograph travels straight down through its frame, at an even
        // pace from the moment it settles; its drawing is on it.
        if (plate) {
          const fw = hold.width, fh = hold.height
          const pw = plate.offsetWidth, ph = plate.offsetHeight
          const v = clamp01(u / PAN_END)
          const x = window.matchMedia(PHONE).matches ? fw / 2 - PHONE_BRANCH_X * pw : PAN_LEFT * fw
          const y = (fh - ph) * v
          set(plate, "transform", `translate3d(${Math.min(0, Math.max(fw - pw, x)).toFixed(1)}px, ${y.toFixed(1)}px, 0)`)
        }

        // In turns: the top words, the drawing, the bottom words.
        const turn = (w: { in: readonly number[]; out: readonly number[] }) =>
          (ramp(u, w.in[0], w.in[1]) * (1 - ramp(u, w.out[0], w.out[1]))).toFixed(3)
        set(woodWords1, "opacity", (ramp(pIn, STAGE.top.in[0], STAGE.top.in[1]) * (1 - ramp(u, STAGE.top.out[0], STAGE.top.out[1]))).toFixed(3))
        set(woodWords2, "opacity", turn(STAGE.bottom))
        // The drawing begins once its circle stands well in the frame (the
        // author's asking: on a wide screen it had been drawn before the knot
        // came in): the scroll at which the travelling photograph brings the
        // circle's foot up to `CIRCLE.seenAt` of the frame's height.
        let u0 = STAGE_TRACE_FROM
        if (plate) {
          const ph = plate.offsetHeight, fh = hold.height
          const foot = (CIRCLE.y + CIRCLE.r) * ph
          const v0 = ph > fh ? (foot - CIRCLE.seenAt * fh) / (ph - fh) : 0
          u0 = Math.max(STAGE_TRACE_FROM, clamp01(v0) * PAN_END)
        }
        const pTrace = clamp01((u - u0) / TRACE_FOR)
        const pOut = clamp01((u - u0 - TRACE_FOR - TRACE_STAND) / UNTRACE_FOR)
        traces.forEach((t, i) => {
          const drawn = smooth((pTrace - i * step) / TRACE_SPAN)
          const gone = smooth((pOut - (n - 1 - i) * step) / TRACE_SPAN)
          const q = Math.min(drawn, 1 - gone) * reach[i]
          set(t, "attr:stroke-dasharray", `${q.toFixed(4)} 1`)
        })
        // The white over the fire, through the last part of the stretch it
        // is held: from when it settles over the found wood until both go.
        if (fire && white) {
          const h1 = hold.height
          const s1 = (fire.previousElementSibling as HTMLElement | null)?.offsetHeight ?? 0
          const s2 = r.height - 2 * h1 - s1
          const t = s2 > 0 ? 1 - (r.bottom - settle - h1) / s2 : 0
          const w = ramp(t, 0.55, 0.9)
          // Its words, held with it: they come once it has settled and go
          // before the white, by opacity alone.
          set(fireWords, "opacity", (ramp(t, 0.04, 0.16) * (1 - ramp(t, 0.36, 0.5))).toFixed(3))
          set(white, "opacity", w.toFixed(3))
          // Its own ground goes white with it, so no hairline of black is left
          // at its edges where it meets the white page on a fractional pixel;
          // and the found wood under it goes once it is covered for good.
          const g = Math.round(255 * w)
          set(fire, "background-color", `rgb(${g},${g},${g})`)
          // The passage's dark ground (#202020) goes white with it, so the
          // page is white by the time the scan comes.
          const k = Math.round(0x20 + (255 - 0x20) * w)
          set(wood, "background-color", `rgb(${k},${k},${k})`)
          set(wood.firstElementChild, "visibility", w >= 0.999 ? "hidden" : "visible")
        }
      }

      // ── The sketches ──
      {
        const r = paper.getBoundingClientRect()
        const held = Math.max(1, r.height - vh)
        // Coming up into the window: out of the white.
        const come = smooth((vh - r.top) / vh)
        // Held: 0 → 1 across the stretch it stays.
        const q = clamp01(-r.top / held)
        const words = ramp(q, 0.02, 0.12) * (1 - ramp(q, 0.42, 0.52))
        const grow = ramp(q, 0.06, 0.55)
        const dusk = ramp(q, 0.58, 0.8)
        const last = ramp(q, 0.78, 0.93)
        const picture = (come * (1 - dusk)).toFixed(3)
        set(sketches, "opacity", picture)
        set(siluet, "opacity", picture)
        if (rise) set(rise, "attr:y", (868 - grow * 978).toFixed(1))
        const c = DARK.map((d) => Math.round(255 + (d - 255) * dusk))
        set(stage, "background-color", `rgb(${c[0]},${c[1]},${c[2]})`)
        // The passage under it too: where the held stage meets its ends on a
        // fractional pixel, the page's white would show as a hairline.
        set(paper, "background-color", `rgb(${c[0]},${c[1]},${c[2]})`)
        set(paperWords, "opacity", words.toFixed(3))
        set(paperWords, "transform", `translateY(${((1 - ramp(q, 0.02, 0.12)) * RISE_PX).toFixed(1)}px)`)
        set(lastWords, "opacity", last.toFixed(3))
        set(lastWords, "transform", `translateY(calc(-50% + ${((1 - last) * RISE_PX).toFixed(1)}px))`)
        set(lastWords, "pointer-events", last > 0.5 ? "auto" : "none")
      }
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
