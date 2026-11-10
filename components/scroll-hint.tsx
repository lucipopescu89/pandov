"use client"

import { useEffect, useRef } from "react"
import { heroDoors } from "@/lib/played-beat"

/**
 * The hint to scroll, without words (2026-11-10, the author's asking: the
 * words "Scroll down" felt forced). While the page waits at the top on the
 * shut doors, the doors come ajar (`heroDoors.breathe`, played by the hero;
 * `BREATH_*` in `hero-animation.tsx`), and while they stand ajar a thin line
 * of light runs down the seam between them, top to foot, and goes out; then
 * they close again. Plain, with no glow (the author's asking the same day;
 * first the light ran on its own, glowing, and the doors breathed after it).
 * It comes `FIRST_MS` after the page opens and again every `CYCLE_MS`, until
 * the first scroll, key or finger going down, which takes the light away at
 * once (`GONE_MS`) and stops it for good: the reader has understood. Only on
 * a page opened at its top. It lies over the page and takes no clicks, so a
 * click still skips the opening (see `skip` in `hero-animation.tsx`).
 *
 * The seam is the middle of the screen: the frames are drawn centred and
 * their seam is at 50% of their width (`GAP` in `hero-animation.tsx`).
 *
 * Under reduced motion nothing moves: the words "Scroll down" come up once,
 * as they did from 2026-11-09 (small, Julius Sans One in #888, near the top).
 */
const FIRST_MS = 2000
const CYCLE_MS = 16000

/** The doors take this long to come ajar (`BREATH_UP_S` in the hero); the light starts then. */
const AJAR_MS = 1400
/** The light: where it runs on the screen (vh), how long, and its look. */
const DROP_FROM_VH = 4
const DROP_TO_VH = 96
const DROP_MS = 4000
const DROP_LENGTH_VH = 10
const DROP_COLOR = "rgba(240, 222, 184, 0.6)" // 0.9 until the author asked for it softer (2026-11-10)
const GONE_MS = 400

/** Reduced motion: the words' timing, as before. */
const WORDS_IN_MS = 2000
const WORDS_HOLD_MS = 2000
const WORDS_OUT_MS = 2000

export function ScrollHint() {
  const dropRef = useRef<HTMLDivElement>(null)
  const wordsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const drop = dropRef.current
    const words = wordsRef.current
    if (!drop || !words) return
    // Come in part-way down the page (restored, or from a link): no hint.
    if (window.scrollY > 2) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const timers: number[] = []
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
    let run: Animation | null = null

    const fall = () => {
      run?.cancel()
      run = drop.animate(
        [
          { transform: `translateY(${DROP_FROM_VH}vh)`, opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.75 },
          { transform: `translateY(${DROP_TO_VH - DROP_LENGTH_VH}vh)`, opacity: 0, offset: 1 },
        ],
        { duration: DROP_MS, easing: "cubic-bezier(.45,0,.4,1)", fill: "both" },
      )
    }
    const cycle = (at: number) => {
      later(at, () => {
        // Held ajar while the light runs, and a breath after it.
        const ajar = heroDoors.breathe((DROP_MS + 250) / 1000)
        later(ajar ? AJAR_MS : 0, fall)
      })
      later(at + CYCLE_MS, () => cycle(0))
    }

    const fadeWords = (to: number, ms: number) => {
      words.style.transition = `opacity ${ms}ms cubic-bezier(.45,0,.55,1)`
      words.style.opacity = String(to)
    }

    let gone = false
    const away = () => {
      if (gone) return
      gone = true
      timers.forEach((t) => window.clearTimeout(t))
      timers.length = 0
      if (run) {
        const o = Number(getComputedStyle(drop).opacity) || 0
        const t = getComputedStyle(drop).transform
        run.cancel()
        drop.animate([{ opacity: o, transform: t }, { opacity: 0, transform: t }], {
          duration: GONE_MS,
          fill: "forwards",
        })
      }
      fadeWords(0, GONE_MS)
      off()
    }
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) away()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") away()
    }
    const onScroll = () => {
      if (window.scrollY > 2) away()
    }
    const off = () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("touchmove", away)
      window.removeEventListener("scroll", onScroll)
    }
    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("keydown", onKey)
    window.addEventListener("touchmove", away, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })

    if (reduce) {
      later(FIRST_MS, () => fadeWords(1, WORDS_IN_MS))
      later(FIRST_MS + WORDS_IN_MS + WORDS_HOLD_MS, () => fadeWords(0, WORDS_OUT_MS))
    } else {
      cycle(FIRST_MS)
    }

    return () => {
      gone = true
      timers.forEach((t) => window.clearTimeout(t))
      run?.cancel()
      off()
    }
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none", overflow: "hidden" }}
      >
        <div
          ref={dropRef}
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: 1,
            marginLeft: -0.5,
            height: `${DROP_LENGTH_VH}vh`,
            opacity: 0,
            // A plain line, its tail thinning out behind it.
            background: `linear-gradient(to bottom, rgba(240,222,184,0) 0%, ${DROP_COLOR} 60%)`,
            willChange: "transform, opacity",
          }}
        />
      </div>
      <div
        ref={wordsRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: "clamp(20px, 4vh, 40px)",
          zIndex: 50,
          pointerEvents: "none",
          opacity: 0,
          textAlign: "center",
          paddingLeft: "0.25em",
          fontFamily: "'Julius Sans One', sans-serif",
          fontSize: "clamp(9px, 0.75vw, 11px)",
          letterSpacing: "0.25em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        Scroll down
      </div>
    </>
  )
}
