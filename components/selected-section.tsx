"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

const textStyle = {
  fontFamily: "'Julius Sans One', sans-serif",
  textTransform: "uppercase" as const,
}

// Featured products, one per category. Cards keep the design's 507×568 ratio;
// the row shares a 1587px max width with the heading column beside it.
const PRODUCTS = [
  { src: "/images/mind-chess-set.jpg", alt: "Chess set", href: "/mind" },
  { src: "/images/home/product-2.png", alt: "Featured object two", href: "/body" },
  { src: "/images/home/product-3.png", alt: "Featured object three", href: "/space" },
]

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
        background: "#fff",
        width: "100%",
        paddingTop: "120px",
        paddingBottom: "40px",
        opacity: fade,
        transform: `translateY(${(1 - fade) * 30}px)`,
        transition: "opacity 0.15s, transform 0.15s",
      }}
    >
      {/* Heading in a left column, cards filling the rest of the row. */}
      <div
        style={{
          width: "82%",
          maxWidth: "1587px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "5%",
        }}
      >
        <div style={{ flex: "0 0 15%" }}>
          <p
            style={{
              ...textStyle,
              fontSize: "clamp(11px, 1.5vw, 18px)",
              letterSpacing: "0.28em",
              color: "#555",
              margin: 0,
            }}
          >
            Selected
          </p>
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              fontSize: "clamp(9px, 0.8vw, 12px)",
              letterSpacing: "0.06em",
              lineHeight: 1.7,
              color: "#999",
              margin: "18px 0 0",
            }}
          >
            A curated selection across Mind, Body and Space.
          </p>
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${PRODUCTS.length}, 1fr)`,
            gap: "3%",
          }}
        >
          {PRODUCTS.map((p, i) => (
            <Link key={i} href={p.href} className="selected-card" style={{ display: "block", textDecoration: "none" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "507 / 568", overflow: "hidden" }}>
                <Image
                  src={p.src || "/placeholder.svg"}
                  alt={p.alt}
                  fill
                  sizes="27vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </Link>
          ))}
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
