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

/** With `steady`: how lit a line must be before it sets off, so it is seen going. */
const STEADY_LIT = 0.3

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
  distance = TRAVEL,
  pace,
  steady = false,
  startFrom,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  /**
   * Where the line comes in from as it is lit: "below" rises into place,
   * "above" drops into it. Left out, it fades where it stands. Set by the
   * author on 2026-09-23 for the seam's pair: RISE IN HELL comes up out of
   * the dark, FALL IN HEAVEN comes down into the white.
   */
  from?: "below" | "above"
  /**
   * How far, in px, a line given `from` travels into place: TRAVEL unless
   * set. RISE IN HELL rises 150 (2026-11-07, the author's asking), from just
   * over the seam, so it climbs with the white drops coming off it.
   */
  distance?: number
  /**
   * The most px a second the line may travel, when it should keep its own
   * time rather than move with the scroll. RISE IN HELL is given 45: the
   * author found it rising too quickly at the scroll's pace (2026-11-07) and
   * asked for it to climb calmly, as the white drops off the seam climb (they
   * leave the line at 18px/s and are held to about 100). Its way up is also
   * spread over a longer stretch of the window, from coming in at the foot
   * until it begins to go (`OUT_LIT`), and it follows that stretch with an
   * ease and at no more than this pace, so a quick turn of the wheel does
   * not throw it up: it carries on climbing after the page has stopped.
   */
  pace?: number
  /**
   * With `pace`: the line sets off as soon as it comes into the window and
   * climbs all the way at that steady pace, on its own, never stopping and no
   * longer led by the scroll (RISE IN HELL, the author's asking, 2026-11-08:
   * it had stopped with the page and gone on only as the page went down).
   * Its light still follows the scroll.
   */
  steady?: boolean
  /**
   * With `from`: a selector for the element whose bottom edge the line sets
   * out from, in place of `distance`, measured afresh at every size. FALL IN
   * HEAVEN sets out from the foot of the dark photograph, where the black
   * drops leave the seam (the author's asking, 2026-11-08).
   */
  startFrom?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const travelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const inner = travelRef.current
    let offset = from === "above" ? -distance : distance
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
    /** With `pace`: where the line is on its way (px off its place) and where the scroll asks it to be. */
    const calm = Boolean(inner && from && pace)
    let liftNow = offset
    let liftGoal = offset
    let liftRaf = 0
    let liftLast = 0
    /** With `steady`: whether the line has come into the window and set off. */
    let setOff = false

    const measure = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const maxScroll = document.documentElement.scrollHeight - vh
      middle = (r.top + r.bottom) / 2 + window.scrollY
      if (startFrom) {
        const start = document.querySelector(startFrom)
        if (start) offset = start.getBoundingClientRect().bottom + window.scrollY - middle
        // Not yet on its way: it waits where it will set out from.
        if (calm && !setOff && inner) {
          liftNow = liftGoal = offset
          inner.style.transform = `translateY(${offset.toFixed(1)}px)`
        }
      }
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
      if (inner && from && !calm && Timeline && maxScroll > 0) {
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
      if (inner && from && !calm && !Timeline) {
        inner.style.transform = `translateY(${(offset * (1 - smooth(rising))).toFixed(1)}px)`
      }
      const o = Math.round(smooth(Math.min(rising, leaving)) * 100) / 100
      if (calm && steady) {
        // Once in the window where it is drawn (still `offset` off its place)
        // and lit enough to be seen, it is on its way, whatever the scroll
        // does after. The light matters for FALL IN HEAVEN, which is drawn
        // above its place and so comes into the window while still dark.
        if (!setOff && at + offset < window.innerHeight && o >= STEADY_LIT) setOff = true
        liftGoal = setOff ? 0 : offset
        if (!liftRaf && liftGoal !== liftNow) {
          liftLast = performance.now()
          liftRaf = requestAnimationFrame(rise)
        }
      } else if (calm) {
        const climb = clamp01((inGone - at) / (inGone - outLit))
        liftGoal = offset * (1 - smooth(climb))
        if (!liftRaf && liftGoal !== liftNow) {
          liftLast = performance.now()
          liftRaf = requestAnimationFrame(rise)
        }
      }
      if (o === shown) return
      shown = o
      el.style.opacity = String(o)
    }

    /** With `pace`: moves the line toward where the scroll asks, eased, and no faster than `pace`. */
    const rise = (now: number) => {
      liftRaf = 0
      if (!inner || !pace) return
      const dt = Math.max(0, Math.min(0.1, (now - liftLast) / 1000))
      liftLast = now
      const gap = liftGoal - liftNow
      const most = pace * dt
      // Steady: the same pace the whole way. Otherwise eased toward the scroll's goal.
      const step = steady
        ? Math.max(-most, Math.min(most, gap))
        : Math.max(-most, Math.min(most, gap * (1 - Math.exp(-dt / 0.5))))
      liftNow = Math.abs(gap) < 0.2 ? liftGoal : liftNow + step
      inner.style.transform = `translateY(${liftNow.toFixed(1)}px)`
      if (liftNow !== liftGoal) liftRaf = requestAnimationFrame(rise)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    if (calm && inner) inner.style.transform = `translateY(${offset}px)`
    measure()
    if (calm && !steady) liftNow = liftGoal
    if (calm && inner) inner.style.transform = `translateY(${liftNow.toFixed(1)}px)`
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
      if (liftRaf) cancelAnimationFrame(liftRaf)
      if (calm && inner) inner.style.transform = ""
      travel?.cancel()
      el.style.opacity = ""
    }
  }, [from, distance, pace, steady, startFrom])

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
