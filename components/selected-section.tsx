"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

/**
 * SELECTED — laid out after the author's mock-up of 2026-10-30: two cards on
 * the left and the heading on the right, ranged right over the top of the
 * Making photograph, which rises up behind this section (see
 * `components/making-section.tsx`). Every place is a share of the page width,
 * measured off the mock-up, so the composition holds at any width.
 *
 * The section is see-through and lets clicks through, so the Making
 * photograph shows and links where the two overlap; only the cards take them.
 */

// Featured products. Cards keep the design's 507×568 ratio. The third card
// (product-3, to /space) left the row with the 2026-10-30 layout.
const PRODUCTS = [
  { src: "/images/mind-chess-set.jpg", alt: "Chess set", href: "/mind" },
  { src: "/images/home/product-2.png", alt: "Featured object two", href: "/body" },
]

/** Places, as % of the page width (measured on the mock-up). */
const CARD_LEFT = 8.7
const CARD_W = 26.4
const CARD_GAP = 3.05
/** Right edge of the heading and its line, from the page's right edge. */
const HEADING_RIGHT = 13.8

/** The card row starts at CARD_LEFT, so its own % are of what is left. */
const ofRow = (pct: number) => `${(pct / (100 - CARD_LEFT)) * 100}%`

const CARD_OPACITY = 0.8
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
    <section
      ref={ref}
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        paddingTop: "120px",
        pointerEvents: "none",
        opacity: fade,
        transform: `translateY(${(1 - fade) * 30}px)`,
        transition: "opacity 0.15s, transform 0.15s",
      }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        {/* The two cards, from the left. */}
        <div style={{ display: "flex", gap: ofRow(CARD_GAP), marginLeft: `${CARD_LEFT}%` }}>
          {PRODUCTS.map((p, i) => (
            <Link
              key={i}
              href={p.href}
              className="selected-card"
              style={{
                display: "block",
                flex: `0 0 ${ofRow(CARD_W)}`,
                textDecoration: "none",
                pointerEvents: "auto",
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "507 / 568", overflow: "hidden" }}>
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="27vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Heading and line, ranged right, level with the cards' top. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: `${HEADING_RIGHT}%`,
            left: `${CARD_LEFT + 2 * CARD_W + CARD_GAP + 3}%`,
            textAlign: "right",
          }}
        >
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              textTransform: "uppercase",
              fontSize: "clamp(11px, 1.6vw, 32px)",
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: "#555",
              margin: 0,
            }}
          >
            Selected
          </p>
          <p
            style={{
              fontSize: "clamp(9px, 0.75vw, 15px)",
              lineHeight: 1.35,
              color: "#888",
              margin: "clamp(10px, 2.7vw, 52px) 0 0",
            }}
          >
            A curated selection across Mind, Body and Space.
          </p>
        </div>
      </div>

      {/* next/image renders an <img>, so the hover lift is applied there. */}
      <style>{`
        .selected-card img {
          opacity: ${CARD_OPACITY};
          transition: opacity 0.45s ease;
        }
        .selected-card:hover img { opacity: ${CARD_OPACITY_HOVER}; }
      `}</style>
    </section>
  )
}
