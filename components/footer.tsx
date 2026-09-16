"use client"

import Image from "next/image"
import Link from "next/link"
import { BodyFooter } from "@/components/body-footer"

/** The hand sits well back, so the ring and the words beside it lead. */
const HAND_OPACITY = 0.5

export function Footer() {
  return (
    <footer style={{ width: "100%", backgroundColor: "#fff", fontFamily: "'Julius Sans One', sans-serif" }}>

      {/* Full-bleed banner image (Figma "Rectangle 2") — the white sculptural
          hand wearing the golden ring, mirrored so the fingers point toward
          GET IN TOUCH. Pulled up into the Making section's bottom padding so it
          follows the photo closely. Uses the image's own ratio with
          object-contain so the hand and ring are never cropped, and blends into
          the white page. */}
      <div style={{ width: "100%", position: "relative", aspectRatio: "2792 / 1230", marginTop: "-88px" }}>
        <Image
          src="/images/home/footer-banner.png"
          alt="White sculptural hand wearing the Pandov golden ring"
          fill
          sizes="100vw"
          style={{
            objectFit: "contain",
            objectPosition: "center",
            opacity: HAND_OPACITY,
            transform: "translateX(-5.5%) scaleX(-1)",
          }}
        />

        {/* Call to action, level with the fingertips */}
        <Link
          href="/contact"
          className="transition-opacity hover:opacity-50"
          style={{
            position: "absolute",
            left: "67%",
            top: "39%",
            transform: "translateY(-50%)",
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
      </div>

      {/* Bottom menu — the shared `BodyFooter` in its compact form, as in the
          homepage design. */}
      <div
        style={{
          maxWidth: 1920,
          margin: "0 auto",
          padding: "28px 0 34px",
          containerType: "inline-size",
        }}
      >
        <BodyFooter activeLabel={null} compact />
      </div>

    </footer>
  )
}
