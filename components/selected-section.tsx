"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Assistant } from "next/font/google"

/**
 * SELECTED — laid out after the author's Figma frame "Selected" of
 * 2026-11-05 (`public/images/home/Selected.svg`, 1893 × 928): the section is
 * dark now (#202020), two cards on the left, and the heading with its line
 * on the right, ranged left. Every place is a share of the frame, so the
 * composition holds at any width.
 *
 * Until that day (the mock-up of 2026-10-30) the section was see-through and
 * the Making photograph rose up behind it; the two now stand one after the
 * other, each on its own ground, Selected second, under Making's dark wood.
 *
 * The cards are the frame's two photographs, lifted out of the export:
 * Emperor (`selected-emperor.avif`, 924 × 1124) and the Chess Set
 * (`selected-chess-set.avif`, 1187 × 1154), AVIF q90 4:4:4 as for the other
 * photographs of metal on dark. In Figma each is drawn at 85% with
 * `mix-blend-mode: lighten` on the ground, and so they are here: the section
 * is not transformed, so the blend still sees the #202020 behind it.
 */

/** The frame, in its own units. */
const FW = 1893
const FH = 928
const pctX = (x: number) => `${(x / FW) * 100}%`
const pctY = (y: number) => `${(y / FH) * 100}%`
/** Type follows the frame's width; `px` is the size at 1893. */
const vw = (px: number) => `${(px / FW) * 100}vw`

const CARD_Y = 168
const CARD_W = 504
const CARD_H = 568
const PRODUCTS = [
  { x: 86, src: "/images/home/selected-emperor.avif", alt: "Emperor, a Second Wind pendant", href: "/body/second-wind/emperor" },
  { x: 660, src: "/images/home/selected-chess-set.avif", alt: "The Chess Set", href: "/mind/chess-set" },
]

/**
 * The words. Julius 29.9 and Assistant 15 at 1893, measured off the export's
 * outlined text (cap tops at 297.2 and 378.2, left edges at 1332). A line box's
 * top is set above the cap top by the face's own room: 0.085em for Julius at
 * line-height 1, 0.31em for Assistant at 1.35.
 */
const TEXT_X = 1332
const HEADING_PX = 29.9
const HEADING_TOP = 297.2 - 0.085 * HEADING_PX
const LINE_PX = 15
const LINE_TOP = 378.2 - 0.31 * LINE_PX

/** The line's face: Assistant, Regular, as the frame has it. */
const assistant = Assistant({ weight: "400", subsets: ["latin"], display: "swap" })

const CARD_OPACITY = 0.85
const CARD_OPACITY_HOVER = 0.95

export function SelectedSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const start = vh * 0.9
      const end = vh * 0.4
      const raw = (start - rect.top) / (start - end)
      setFade(Math.min(1, Math.max(0, raw)))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section style={{ position: "relative", width: "100%", background: "#202020" }}>
      <div ref={ref} style={{ position: "relative", width: "100%", aspectRatio: `${FW} / ${FH}` }}>
        {/* The cards and the words come in together as the section rises; the
            ground stays put, so the dark never flashes. Each card carries the
            ground itself (#202020): while it fades its opacity makes it a group
            of its own, and a `lighten` inside a group sees only what is in the
            group. Without that ground the Chess Set, whose black is darker than
            the page's, came in dark and only took the blend once it was fully
            in (the author's report, 2026-11-05). */}
        {PRODUCTS.map((p, i) => (
          <Link
            key={i}
            href={p.href}
            className="selected-card"
            style={{
              position: "absolute",
              left: pctX(p.x),
              top: pctY(CARD_Y),
              width: pctX(CARD_W),
              height: pctY(CARD_H),
              overflow: "hidden",
              display: "block",
              background: "#202020",
              opacity: fade,
              transition: "opacity 0.15s",
            }}
          >
            <Image src={p.src} alt={p.alt} fill sizes="27vw" style={{ objectFit: "cover", objectPosition: "center" }} />
          </Link>
        ))}

        <div
          style={{
            position: "absolute",
            left: pctX(TEXT_X),
            top: pctY(HEADING_TOP),
            right: 0,
            opacity: fade,
            transform: `translateY(${(1 - fade) * 30}px)`,
            transition: "opacity 0.15s, transform 0.15s",
          }}
        >
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              textTransform: "uppercase",
              fontSize: `clamp(11px, ${vw(HEADING_PX)}, 32px)`,
              lineHeight: 1,
              color: "#888",
              margin: 0,
            }}
          >
            Selected
          </p>
          <p
            style={{
              fontFamily: assistant.style.fontFamily,
              fontWeight: 400,
              fontSize: `clamp(9px, ${vw(LINE_PX)}, 16px)`,
              lineHeight: 1.35,
              color: "#888",
              // from the heading's line box to this one's, as in the frame
              margin: `${vw(LINE_TOP - HEADING_TOP - HEADING_PX)} 0 0`,
            }}
          >
            A curated selection across Mind, Body and Space.
          </p>
        </div>
      </div>

      {/* next/image renders an <img>, so the blend and the hover are set there. */}
      <style>{`
        .selected-card img {
          opacity: ${CARD_OPACITY};
          mix-blend-mode: lighten;
          transition: opacity 0.45s ease;
        }
        .selected-card:hover img { opacity: ${CARD_OPACITY_HOVER}; }
      `}</style>
    </section>
  )
}
