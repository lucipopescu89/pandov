"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

/**
 * The square ornament that opens the Chess Set page. A golden band travels
 * across the line work as the page scrolls: the SVG is drawn once at low
 * opacity, and a second copy of it — masked to the same artwork — carries a
 * moving gradient on top.
 */
export function ChessSetOrnament() {
  const [gradientPosition, setGradientPosition] = useState(100)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      // Move gradient from right (100%) to left (0%) as user scrolls
      const progress = (scrollY % 800) / 800
      const position = 100 - (progress * 200) // Goes from 100 to -100
      setGradientPosition(position)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial call
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <style>{`
        .chess-ornament-wrapper {
          position: relative;
          width: 287px;
          height: 189px;
          margin: 0 auto;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .chess-ornament-wrapper {
            width: 172px;
            height: 113px;
          }
        }
      `}</style>
    <div className="chess-ornament-wrapper">
      {/* SVG with opacity */}
      <Image
        src="/images/chess-ornament.svg"
        alt=""
        width={287}
        height={189}
        style={{
          opacity: 0.8,
          display: "block",
          width: "100%",
          height: "auto",
        }}
        priority
      />
      {/* Golden gradient overlay that moves on scroll - masked to SVG shape */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(90deg, #202020 0%, #202020 ${gradientPosition - 20}%, #C9A84C ${gradientPosition}%, #202020 ${gradientPosition + 20}%, #202020 100%)`,
          WebkitMaskImage: "url(/images/chess-ornament.svg)",
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskImage: "url(/images/chess-ornament.svg)",
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          pointerEvents: "none",
        }}
      />
    </div>
    </>
  )
}
