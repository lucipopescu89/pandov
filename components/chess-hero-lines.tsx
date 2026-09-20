"use client"

import { useEffect, useRef } from "react"

/* --------------------------------------------------------------------------
   The Chess Set's two claims, one after the other.

   "Remember you are unique" and "Just like everybody else" are the page's one
   joke, and it only lands if the second arrives after the first has gone. They
   are set 40px apart under the ornament, but they are never both lit: the
   first is at full light where the page rests, dissolves as you begin to
   scroll, and the second comes up out of the space it leaves.

   The two are 40px apart and the sequence has to last far longer than 40px of
   scroll, so neither line's own position in the window can be the clock the
   way it is in `caption-fade.tsx` — with bands that near each other the pair
   would simply fade together. One clock drives both instead, and the beats are
   shares of it.

   That clock is the distance the pair has left to travel, not a figure in
   pixels or in vh: it starts where the first line begins to give way and ends
   as the second reaches the top of the window. A beat written as a share of it
   therefore plays out in full on any screen — the phone, where the pair sits
   350px down the page and leaves quickly, and the desktop, where it sits at
   740 and has twice as long. A count of vh would have run the phone's sequence
   off the top of the screen before the second line was ever lit.
   -------------------------------------------------------------------------- */

/**
 * Where the first line begins to give way, as a share of the window height
 * from its top. It is a ceiling rather than a mark to be reached: a line that
 * already rests above it starts to go as soon as the page moves at all, so the
 * page always opens on the claim at full light, however tall the window.
 */
const FADE_AT = 0.55

/**
 * The beats, as shares of that travel. The first line is gone by `OUT1`; the
 * second comes up between `IN2` and `LIT2`, holds, and gives way between
 * `OUT2` and `GONE2` — just before it reaches the top, not at it, so it is
 * never cut off mid-fade by the edge of the screen.
 *
 * `IN2` is deliberately well inside `OUT1`, so the two overlap: by the time
 * the claim is down to a tenth of its light the answer is already at a
 * quarter of its own. They were sequenced end to end at first, with a clear
 * gap between them, and the hand-over read as two separate captions rather
 * than as one line turning into the other — the answer has to be arriving
 * while the claim is still going for the second to feel like a reply to the
 * first.
 */
const OUT1 = 0.28
const IN2 = 0.1
const LIT2 = 0.5
const OUT2 = 0.72
const GONE2 = 0.94

/** Non-finite to 0: `scrolled / travel` is NaN before anything is measured. */
const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
const smooth = (t: number) => t * t * (3 - 2 * t)

export function ChessHeroLines() {
  const oneRef = useRef<HTMLParagraphElement>(null)
  const twoRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const one = oneRef.current
    const two = twoRef.current
    if (!one || !two) return

    /** The first line's middle, from the top of the document. */
    let middle = 0
    /** Where it begins to give way, in px from the top of the window. */
    let start = 0
    /** The px of scroll the whole sequence is measured over. */
    let travel = 1
    /** Last opacity written to each, so a scroll that changes nothing writes nothing. */
    let lit = [-1, -1]
    let raf = 0

    const measure = () => {
      const a = one.getBoundingClientRect()
      const b = two.getBoundingClientRect()
      const y = window.scrollY
      middle = (a.top + a.bottom) / 2 + y
      const drop = (b.top + b.bottom) / 2 - (a.top + a.bottom) / 2
      start = Math.min(FADE_AT * window.innerHeight, middle)
      // The second line reaches the top of the window one `drop` after the
      // first does, and that is where the sequence ends.
      travel = Math.max(1, start + drop)
      update()
    }

    const update = () => {
      raf = 0
      const at = middle - window.scrollY
      const u = clamp01((start - at) / travel)
      const opacity = [
        1 - smooth(clamp01(u / OUT1)),
        Math.min(
          smooth(clamp01((u - IN2) / (LIT2 - IN2))),
          1 - smooth(clamp01((u - OUT2) / (GONE2 - OUT2))),
        ),
      ]
      const els = [one, two]
      for (let i = 0; i < 2; i++) {
        const o = Math.round(opacity[i] * 100) / 100
        if (o === lit[i]) continue
        lit[i] = o
        els[i].style.opacity = String(o)
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", onScroll, { passive: true })
    // Julius Sans One changes the height of both lines once it has loaded,
    // which moves the middles the whole sequence is measured from.
    document.fonts?.ready.then(measure)

    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* The resting state is written into the markup, not waited for: the
          second line would otherwise be read at full light until hydration
          caught up, and the joke would be given away at the top of the page. */}
      <p ref={oneRef} className="chess-line chess-hero-claim" style={{ opacity: 1 }}>
        Remember you are unique
      </p>
      <p ref={twoRef} className="chess-line chess-hero-answer" style={{ opacity: 0 }}>
        Just like everybody else
      </p>
    </>
  )
}
