"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { FOOTER_STAGE_ID } from "@/components/footer"

/** Clamp to 0..1, treating a non-finite value (a zero-size layout) as 0. */
function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
}

/**
 * How far the photograph rises up behind Selected, as % of the page width:
 * Selected's cards are 29.6% tall (26.4% wide at 507×568), and the
 * photograph's top sits 8.1% under their top, as in the mock-up.
 */
const RISE = 29.6 - 8.1

/**
 * MAKING section — laid out after the author's mock-up of 2026-10-30. The
 * photograph (the white vase in the burnt trunk, on white) runs the page's
 * full width, cut at the trunk's right edge so the trunk meets the page edge.
 * It rises up behind Selected, under that section's heading; its ground is
 * pure white (255), so it meets the page with no edge. The heading and the
 * manifesto stand on the left, under Selected's cards.
 *
 * The source is `D:\PANDOV\MARKETING\ELEMENTE WEBSITE\1 HOMEPAGE\Homepage_making.jpg`
 * (7667 × 5652), cropped to 7300 wide and exported 2400 wide, JPEG q86 4:4:4.
 * Read its top-left pixel after a re-export: it must be 255,255,255.
 *
 * The old satori photograph's white washes and the band pinned to the middle
 * of the screen went with it: the new photograph is shown as it is.
 *
 * The section still dissolves as the footer's hand comes up under it, and is
 * gone by the time the whole hand is on screen, so the hand has the screen
 * to itself (see the finale in `components/footer.tsx`). It is timed off the
 * hand's box itself, found by FOOTER_STAGE_ID: from the box's top edge at the
 * bottom of the screen to its foot there.
 *
 * The whole block links to the /making page — except once it has dissolved,
 * when an invisible link over the top of the screen would still take clicks.
 */
export function MakingSection() {
  // 0 = the footer's hand not yet on screen, 1 = all of it on screen, this gone
  const [leave, setLeave] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const hand = document.getElementById(FOOTER_STAGE_ID)
      if (hand) {
        const s = hand.getBoundingClientRect()
        setLeave(clamp01((window.innerHeight - s.top) / s.height))
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <section
      style={{
        position: "relative",
        background: "#fff",
        width: "100%",
        marginTop: `-${RISE}%`,
        paddingBottom: "120px",
      }}
    >
      <Link
        href="/making"
        aria-label="Explore the making process"
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          textDecoration: "none",
          opacity: 1 - leave,
          pointerEvents: leave < 1 ? "auto" : "none",
        }}
      >
        <div style={{ position: "relative", width: "100%", aspectRatio: "2400 / 1858" }}>
          <Image
            src="/images/home/making-sculpture.jpg"
            alt="A white vase in a burnt trunk — the making process"
            fill
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>

        {/* Heading + manifesto — on the left, under Selected's cards */}
        <div style={{ position: "absolute", left: "15%", top: "35.6%", maxWidth: "40%" }}>
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              textTransform: "uppercase",
              fontSize: "clamp(11px, 1.6vw, 32px)",
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: "#444",
              margin: 0,
            }}
          >
            Making
          </p>
          {/* Lines broken as in the design; a narrow screen still wraps them. */}
          <p
            style={{
              fontSize: "clamp(9px, 0.75vw, 15px)",
              lineHeight: 1.35,
              color: "#888",
              margin: "clamp(8px, 1.1vw, 22px) 0 0",
            }}
          >
            Every object begins with the search for a form.
            <br />
            Some are discovered. Some are imagined.
            <br />
            All are shaped through a dialogue between
            <br />
            material, intuition and technology.
          </p>
        </div>
      </Link>
    </section>
  )
}
