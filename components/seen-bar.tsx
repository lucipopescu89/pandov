"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SeenEyesButton } from "@/components/seen-eyes"
import { JULIUS } from "@/lib/type"

/**
 * /seen's top bar (2026-11-22, the author's asking): an arrow on the left,
 * back to the homepage, and the pair of eyes on the right (back to the eye
 * the reader came in by, `SeenEyesButton`), both clear of the screen's edges
 * (`SIDE`). Until that day the eyes stood alone, centred above the grid, and
 * went up with the page.
 *
 * It lies over the page, on the page's #202020. Scrolling down sends it away;
 * a scroll back up brings it after about two or three turns of the wheel
 * (`REVEAL_UP_PX` of the page going up, counted afresh after any scroll
 * down), so a reader deep in the gallery need not scroll back through all of
 * it to leave. Near the top of the page it is always there. Read off the
 * page's position, so a wheel, a finger, the keys and the scrollbar all count.
 */

/** The bar's height, px; the page keeps this much room above the grid. */
export const BAR_H = 104
/**
 * From the screen's edges to the arrow and to the eyes: at least `SIDE`, and
 * on a wider screen as much as keeps the two within `SPAN` px of each other,
 * centred (the same morning, the author's asking: at the screen's edges, on a
 * wide screen they were hardly seen, out in the corners). Arrow to eyes' far
 * edge: 1100px, so 170px in from each edge at 1440, 410 at 1920, 730 at 2560;
 * under about 1200 wide, `SIDE` (41px at 1024).
 */
const SIDE = "clamp(24px, 4vw, 64px)"
const SPAN = 1100
const INSET = `max(${SIDE}, calc((100% - ${SPAN}px) / 2))`
/** How far the page must go back up, px, for the bar to come: two or three turns of a mouse wheel. */
const REVEAL_UP_PX = 220
const GREY = "#888"

export function SeenBar() {
  const [shown, setShown] = useState(true)

  useEffect(() => {
    let lastY = window.scrollY
    let up = 0
    let raf = 0
    const read = () => {
      raf = 0
      const y = window.scrollY
      const d = y - lastY
      lastY = y
      if (y <= BAR_H) {
        up = 0
        setShown(true)
        return
      }
      if (d > 0) {
        up = 0
        setShown(false)
      } else if (d < 0) {
        up -= d
        if (up >= REVEAL_UP_PX) setShown(true)
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    read()
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <header
      inert={!shown}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: BAR_H,
        zIndex: 50,
        background: "#202020",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${INSET}`,
        transform: shown ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: shown ? "auto" : "none",
      }}
    >
      <Link
        href="/"
        prefetch={false}
        aria-label="Home"
        className="transition-opacity hover:opacity-50"
        style={{
          fontFamily: JULIUS,
          fontSize: "24px",
          lineHeight: 1,
          color: GREY,
          textDecoration: "none",
          // only a larger target; the arrow itself stands on the bar's edge line
          padding: "12px 12px 12px 0",
        }}
      >
        &larr;
      </Link>
      <SeenEyesButton />
    </header>
  )
}
