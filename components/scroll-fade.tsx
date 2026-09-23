"use client"

import { useEffect, useRef } from "react"

/* --------------------------------------------------------------------------
   A line of type that is lit by where it stands in the window: out below the
   fold, coming up as it rises toward the middle, at full light across it, and
   going again as it carries on past. The fade follows the scroll rather than
   playing on a timer — where the line sits is how lit it is — so it reads the
   same however fast the page is moved, and reverses when it is moved back.

   This is `caption-fade.tsx`'s rule. That component can only light captions
   set as <text> inside an artwork's SVG, which is what every caption on the
   body page is; these are ordinary elements in the page, so they need the
   rule without the gathering-up of SVG text that comes with it.

   The figures below are that component's, doubled. A caption beside a pendant
   is one of seven the reader is being carried past, and it is right that it
   should come and go inside half a window; the pair at the seam are the only
   words in that stretch of the page and they name what the water is doing
   either side of them, so they are given nearly the whole window to be read
   in — which is also long enough that both are lit together across the middle
   of it, and they are meant to be seen together.

   It is not `chess-hero-lines.tsx` either, and the difference is worth having
   clear. There, two lines 250px apart are a claim and its reply, so they run
   off one clock and hand over to each other. Here each line answers only to
   its own place in the window — the pair above and below the seam are two
   halves of one image, not a sequence, and they are meant to be seen together.
   -------------------------------------------------------------------------- */

/**
 * Where the line's middle stands in the window, as a share of its height from
 * the top. Rising from below it is out until `IN_GONE` and at full light by
 * `IN_LIT`; carrying on up past the middle it begins to go at `OUT_LIT` and is
 * gone by `OUT_GONE`.
 *
 * Both the ramps and the hold between them are twice what `caption-fade.tsx`
 * gives a caption — 0.32 of the window each way rather than 0.16, and 0.24 lit
 * rather than 0.12 — so a line is present over 0.88 of a window's travel
 * instead of 0.44. It comes up as it clears the bottom edge and is gone only
 * as it nears the top: it is lit for very nearly as long as it is on screen.
 */
const IN_GONE = 0.94
const IN_LIT = 0.62
const OUT_LIT = 0.38
const OUT_GONE = 0.06

/**
 * How far a line given `from` travels as it comes up: it starts this many px
 * below (or above) its place and arrives there as it reaches full light, over
 * the same stretch of the window as the fade. It only arrives; going, it
 * fades where it stands.
 */
const TRAVEL = 40

/** Non-finite to 0: the ratios below are NaN before anything is measured. */
const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * The browser's own scroll-linked timeline, where it has one. Not yet in
 * TypeScript's DOM types, hence the shape given here (as in `footer.tsx`).
 */
type ScrollTimelineConstructor = new (options: { source: Element | null }) => AnimationTimeline

export function ScrollFade({
  className,
  style,
  from,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  /**
   * Where the line comes in from as it is lit: "below" rises into place,
   * "above" drops into it. Left out, it fades where it stands. Set by the
   * author on 2026-09-23 for the seam's pair: RISE IN HELL comes up out of
   * the dark, FALL INTO HEAVEN comes down into the white.
   */
  from?: "below" | "above"
  children: React.ReactNode
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const travelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const inner = travelRef.current
    const offset = from === "above" ? -TRAVEL : TRAVEL
    const Timeline = (window as unknown as { ScrollTimeline?: ScrollTimelineConstructor }).ScrollTimeline
    let travel: Animation | null = null

    /** The line's middle, from the top of the document. */
    let middle = 0
    /** Window positions, in px: out at `inGone` and `outGone`, lit between the other two. */
    let inGone = 0
    let inLit = 0
    let outLit = 0
    let outGone = 0
    let shown = -1
    let raf = 0

    const measure = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const maxScroll = document.documentElement.scrollHeight - vh
      middle = (r.top + r.bottom) / 2 + window.scrollY
      // A line that already rests above the middle of the window is lit where
      // it stands rather than waiting for a rise it will never make, and one
      // still low in the window at the very bottom of the page is lit by the
      // time the page can go no further.
      outLit = Math.min(OUT_LIT * vh, middle)
      inLit = Math.max(IN_LIT * vh, middle - maxScroll)
      inGone = inLit + (IN_GONE - IN_LIT) * vh
      outGone = outLit - (OUT_LIT - OUT_GONE) * vh

      // The travel is a position that parts from the page's own motion, so it
      // is played by the browser on the scroll itself rather than written from
      // the handler, which hears of each step a frame late and would leave the
      // line jumping back and forth against the page (see `footer.tsx`, where
      // that was measured). The inner span is what moves, so the line's own
      // box, which everything here is measured from, stays put.
      if (inner && from && Timeline && maxScroll > 0) {
        const at = (y: number) => Math.min(1, Math.max(0, y / maxScroll))
        const start = at(middle - inGone)
        const end = Math.max(start, at(middle - inLit))
        const frames: Keyframe[] = [
          { offset: 0, transform: `translateY(${offset}px)` },
          { offset: start, transform: `translateY(${offset}px)`, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
          { offset: end, transform: "none" },
          { offset: 1, transform: "none" },
        ]
        if (travel?.effect instanceof KeyframeEffect) travel.effect.setKeyframes(frames)
        else travel = inner.animate(frames, { timeline: new Timeline({ source: document.documentElement }), fill: "both" })
      }
      update()
    }

    const update = () => {
      raf = 0
      const at = middle - window.scrollY
      const rising = clamp01((inGone - at) / (inGone - inLit))
      const leaving = clamp01((at - outGone) / (outLit - outGone))
      // Where the browser has no scroll timeline — Safari before 26 — the
      // travel is written from here, a frame late, which is the price there.
      if (inner && from && !Timeline) {
        inner.style.transform = `translateY(${(offset * (1 - smooth(rising))).toFixed(1)}px)`
      }
      const o = Math.round(smooth(Math.min(rising, leaving)) * 100) / 100
      if (o === shown) return
      shown = o
      el.style.opacity = String(o)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", onScroll, { passive: true })
    // Julius Sans One changes the height of the line once it has loaded, and
    // with it the middle every position above is measured from.
    document.fonts?.ready.then(measure)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
      travel?.cancel()
      el.style.opacity = ""
    }
  }, [from])

  // Lit in the markup, not dark: these lines sit far below the fold, so there
  // is nothing to flash, and a reader without JavaScript is left with the page
  // as written rather than with a blank band.
  return (
    <p ref={ref} className={className} style={style}>
      {from ? (
        <span ref={travelRef} style={{ display: "inline-block", willChange: "transform" }}>
          {children}
        </span>
      ) : (
        children
      )}
    </p>
  )
}
