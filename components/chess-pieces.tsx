"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

/**
 * The six pairs, in the order the set is usually read: the smallest piece
 * first, the tallest last. Every photograph is framed the same way — gold on
 * the left, dark on the right, on white — and all six were shot to a common
 * baseline: the shadows end between 91.4% and 92.8% of the frame's height. Held
 * at one size, the pieces therefore stand on a floor of their own and keep their
 * true hierarchy, the pawns at 57% of the frame against the kings at 75%. The
 * white above the shorter pieces is not a gap to be cropped out; it is the room
 * they are standing in, and it falls on a white page.
 */
const PAIRS = [
  { src: "/images/chess-pieces/pawns.jpg", label: "Pawns" },
  { src: "/images/chess-pieces/knights.jpg", label: "Knights" },
  { src: "/images/chess-pieces/rooks.jpg", label: "Rooks" },
  { src: "/images/chess-pieces/bishops.jpg", label: "Bishops" },
  { src: "/images/chess-pieces/queens.jpg", label: "Queens" },
  { src: "/images/chess-pieces/kings.jpg", label: "Kings" },
]

/** The photographs' own size. */
const ART_W = 1800
const ART_H = 1448

/**
 * How large a pair is drawn: never wider than `MAX_W`, never wider than the page
 * less a margin, and never taller than `MAX_VH` of the window.
 *
 * On any ordinary window it is the height that binds, not the width — so both
 * numbers have to move together for the pair to change size at all. `MAX_VH`
 * past 100 is deliberate: the frame is mostly white and it sits on a white page,
 * so the part that runs off the screen is empty room nobody can see. What
 * matters is the pieces inside it, which stand in the lower two thirds.
 */
const MAX_W = 1540
const MAX_VH = 109

/**
 * How much of the frame's top is cut away, as a share of its height.
 *
 * Every photograph carries a good deal of empty ceiling: the tallest pair, the
 * kings, starts 16% down, and the knights only at 39%. Held whole, the distance
 * from the section above to the piece itself swung by 223px depending on which
 * pair was up — a gap that opened and closed on its own every few seconds.
 * Taking 12% off the top brings the kings almost to the edge and leaves every
 * other pair its own share of sky, so the pieces keep both their common floor
 * and their true difference in height; only the dead ceiling goes.
 *
 * The pair is drawn at the size it always was — the crop takes height off the
 * frame, not scale off the pieces — so `MAX_W` and `MAX_VH` still describe the
 * whole photograph.
 */
const CROP_TOP = 0.12

/** Seconds a pair is held before the next one comes up. */
const HOLD_MS = 6000
/** Milliseconds one pair takes to give way to the next. */
const FADE_MS = 900

/** Same grey as the menus and the page's captions. */
const DOT_COLOR = "#888888"

/**
 * The pieces, one pair at a time.
 *
 * The pairs cross-fade in place. Nothing slides: the two figures in every
 * photograph stand on the same spot, so a piece simply becomes the next one —
 * which is quieter than motion and costs the compositor a single opacity per
 * frame. All six stay mounted, so a change never waits on a download and never
 * flashes white.
 *
 * It holds while the pointer is over it, so a pair can be looked at for as long
 * as the reader wants, and it doesn't start itself at all for a reader who has
 * asked the system for reduced motion — the dots move through the set by hand.
 */
export function ChessPieces() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = useCallback((i: number) => setCurrent((i + PAIRS.length) % PAIRS.length), [])

  /**
   * One pair, one timer: every change — the set's own or a reader's — schedules
   * the next and cancels whatever was pending. A repeating interval would keep
   * its own beat regardless, so choosing a pair by hand could leave it on screen
   * for the tail of a count already half spent, and a second interval surviving
   * a remount would run the set at twice the rate.
   */
  useEffect(() => {
    // Honour the OS "reduce motion" setting: nothing moves on its own, and the
    // dots below carry the reader through the set instead.
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = setTimeout(() => setCurrent((i) => (i + 1) % PAIRS.length), HOLD_MS)
    return () => clearTimeout(timer)
  }, [current, paused])

  return (
    <div
      className="mx-auto"
      style={{ width: `min(${MAX_W}px, 92vw, ${((ART_W / ART_H) * MAX_VH).toFixed(0)}vh)` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div style={{ position: "relative", aspectRatio: `${ART_W} / ${ART_H * (1 - CROP_TOP)}` }}>
        {PAIRS.map((pair, i) => (
          <Image
            key={pair.src}
            src={pair.src}
            alt={`${pair.label} — the gold piece and its dark counterpart, face to face`}
            width={ART_W}
            height={ART_H}
            sizes={`(max-width: ${Math.round(MAX_W / 0.92)}px) 92vw, ${MAX_W}px`}
            priority={i === 0}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              // Anchored to its foot, so the whole crop comes off the ceiling
              // and the pieces stay exactly where they stood.
              objectFit: "cover",
              objectPosition: "bottom",
              opacity: i === current ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease`,
            }}
          />
        ))}
      </div>

      {/* Six marks, in the page's grey. The only thing on this section that is
          not a photograph, kept to the smallest thing that still lets a reader
          choose a pair and stop the set where they want it. */}
      <div className="flex items-center justify-center gap-[14px]" style={{ marginTop: 44 }}>
        {PAIRS.map((pair, i) => (
          <button
            key={pair.src}
            type="button"
            onClick={() => go(i)}
            aria-label={pair.label}
            aria-current={i === current ? "true" : undefined}
            className="cursor-pointer border-none bg-transparent p-[6px]"
          >
            <span
              className="block rounded-full"
              style={{
                width: 5,
                height: 5,
                backgroundColor: DOT_COLOR,
                opacity: i === current ? 1 : 0.3,
                transition: "opacity 300ms ease",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
