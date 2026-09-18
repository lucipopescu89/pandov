"use client"

import Image from "next/image"
import Link from "next/link"
import { BirdRings } from "@/components/bird-rings"
import { BodyFooter } from "@/components/body-footer"

/** The hand sits a little back, so the ring and the words over it lead. */
const HAND_OPACITY = 0.77

/** White over the hand's lower half: 90% at the image's bottom edge, gone by its middle. */
const HAND_FADE = "linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%)"

/**
 * Design canvas the footer was measured on: the page width of the design, from
 * the Making photo's bottom edge down to the bottom menu. Everything on it is a
 * percentage, so the composition scales with the page like a single picture.
 */
const CANVAS_W = 1600
const CANVAS_H = 1074

/** The banner image's own size. */
const HAND_W = 2792
const HAND_H = 1230

/** left/top/width are px on the 1600 x 1074 design canvas */
function pct(px: number, axis: "w" | "h") {
  return `${(px / (axis === "w" ? CANVAS_W : CANVAS_H)) * 100}%`
}

export function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: "#fff",
        fontFamily: "'Julius Sans One', sans-serif",
        // The Making photo's visible bottom edge sits 90px above the end of its
        // section, so the canvas starts right at the photo's edge.
        marginTop: "-90px",
      }}
    >
      {/* One centred column: the hand wearing the golden ring, GET IN TOUCH
          below the ring, then the bird in its rings. */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      >
        {/* The white sculptural hand (Figma "Rectangle 2"), mirrored so the
            fingers point right. The image carries empty white space past the
            fingertips, so it is set wider than the page and right of centre to
            centre the hand itself; only that white margin is cropped. */}
        <div
          style={{
            position: "absolute",
            left: pct(22, "w"),
            top: pct(-2, "h"),
            width: pct(1720, "w"),
            aspectRatio: `${HAND_W} / ${HAND_H}`,
          }}
        >
          <Image
            src="/images/home/footer-banner.png"
            alt="White sculptural hand wearing the Pandov golden ring"
            fill
            sizes="108vw"
            style={{ objectFit: "contain", opacity: HAND_OPACITY, transform: "scaleX(-1)" }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ background: HAND_FADE }} />
        </div>

        {/* Call to action, centred on the page below the ring. The padding only
            enlarges the tap target, which the small type would otherwise make
            hard to hit on a phone. */}
        <Link
          href="/contact"
          className="transition-opacity hover:opacity-50"
          style={{
            position: "absolute",
            left: "50%",
            top: pct(579, "h"),
            transform: "translate(-50%, -50%)",
            padding: "12px 16px",
            fontSize: "clamp(9px, 0.75vw, 12px)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: "#444",
            textDecoration: "none",
          }}
        >
          &rarr; Get in touch
        </Link>

        {/* The bird in its rings. Decorative, not a link: GET IN TOUCH just above
            and the menu below already lead to Contact. */}
        <BirdRings
          size={pct(360, "w")}
          style={{ position: "absolute", left: "50%", top: pct(862, "h"), transform: "translate(-50%, -50%)" }}
        />
      </div>

      {/* Bottom menu — the shared `BodyFooter`, exactly as every other page
          renders it: same logo, same type, same spacing, all its own. */}
      <BodyFooter activeLabel={null} />
    </footer>
  )
}
