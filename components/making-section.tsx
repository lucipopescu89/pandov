"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { FOOTER_STAGE_ID } from "@/components/footer"

const headingStyle = {
  fontFamily: "'Julius Sans One', sans-serif",
  textTransform: "uppercase" as const,
}

/** Clamp to 0..1, treating a non-finite value (a zero-size layout) as 0. */
function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
}

/**
 * The white band across the middle of the screen, centred a little above
 * half-height as in the design. It peaks just short of solid white so the
 * pendant still reads through it, and is gone well before the screen edges.
 */
const BAND_GRADIENT =
  "linear-gradient(to bottom, rgba(255,255,255,0) 17%, rgba(255,255,255,0.85) 33%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.85) 57%, rgba(255,255,255,0) 73%)"

/**
 * MAKING section — a single wide product photo (satori on dark) that the
 * Figma design fades into the white page with white gradient overlays.
 * Per the brief, the white overlay opacity GROWS as the section is scrolled
 * through, so the image gradually dissolves into white as you move past it.
 *
 * On top of that, a white band pinned to the middle of the viewport fades in
 * as the photo scrolls up, reaching full strength once the photo fills the
 * screen and holding there. The band belongs to the screen, not the photo:
 * the photo slides under it, and it is clipped to the photo so it never
 * washes the sections around it.
 *
 * Last, the whole section dissolves as the footer's hand comes up under it,
 * and is gone by the time the whole hand is on screen, so the hand has the
 * screen to itself (see the finale in `components/footer.tsx`). It is timed
 * off the hand's box itself, found by FOOTER_STAGE_ID: from the box's top
 * edge at the bottom of the screen to its foot there.
 *
 * The whole block links to the /making page — except once it has dissolved,
 * when an invisible link over the top of the screen would still take clicks.
 */
export function MakingSection() {
  const ref = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  // 0 = section just entered from the bottom, 1 = section leaving at the top
  const [progress, setProgress] = useState(0)
  // 0 = photo top at the viewport bottom, 1 = photo fills the screen
  const [band, setBand] = useState(0)
  // 0 = the footer's hand not yet on screen, 1 = all of it on screen, this gone
  const [leave, setLeave] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      const img = imageRef.current
      if (!el || !img) return
      const vh = window.innerHeight

      // progress: 0 when the section top hits the viewport bottom,
      // 1 when the section bottom reaches the viewport top.
      const rect = el.getBoundingClientRect()
      setProgress(clamp01((vh - rect.top) / (rect.height + vh)))

      // The photo fills the screen once its top reaches the viewport top. On a
      // screen taller than the photo that never happens, so there the band
      // peaks as soon as the whole photo is in view.
      const imgRect = img.getBoundingClientRect()
      const filledTop = Math.max(0, vh - imgRect.height)
      setBand(clamp01((vh - imgRect.top) / (vh - filledTop)))

      const hand = document.getElementById(FOOTER_STAGE_ID)
      if (hand) {
        const s = hand.getBoundingClientRect()
        setLeave(clamp01((vh - s.top) / s.height))
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

  // The white wash GROWS as you scroll through the section, so the photo
  // gradually dissolves into the white page. Baseline keeps the image
  // present when it first appears; it intensifies toward the bottom.
  const topWash = 0.35 + progress * 0.4 // washes the branch so text stays readable
  const bottomWash = 0.55 + progress * 0.45 // dissolves the image into the page

  return (
    <section
      ref={ref}
      style={{
        background: "#fff",
        width: "100%",
        paddingTop: "120px",
        paddingBottom: "120px",
      }}
    >
      {/* overflow: hidden first for browsers without overflow: clip — there the
          crop still holds and only the band's stickiness is lost. */}
      <style>{`.making-clip { overflow: hidden; overflow: clip; }`}</style>

      {/* Full-bleed product photo (edge to edge) with the heading + manifesto
          OVERLAID on top, as in Figma. The photo is cropped 80px from the top
          and 30px from the bottom via an overflow-hidden wrapper + negative
          margins, and white gradients fade it into the page. */}
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
        {/* Clipping wrapper — trims 80px off the top and 30px off the bottom.
            overflow: clip rather than hidden, so it is not a scroll container
            and the band's sticky layer still sticks to the viewport. */}
        <div ref={imageRef} className="making-clip" style={{ position: "relative", width: "100%" }}>
          <div style={{ marginTop: "-80px", marginBottom: "-30px" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "1587 / 1059" }}>
              <Image
                src="/images/home/making.png"
                alt="Satori pendant — the making process"
                fill
                sizes="100vw"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />

              {/* Top white wash (Figma "Rectangle 10") — softens the dark branch
                  in the upper area, while leaving the sunburst in the center
                  visible. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: "linear-gradient(to bottom, #fff 0%, rgba(255,255,255,0.85) 18%, transparent 46%)",
                  opacity: topWash,
                  transition: "opacity 0.12s linear",
                }}
              />

              {/* Bottom white wash (Figma "Rectangle 11") — dissolves the lower
                  half of the image seamlessly into the white page below. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: "linear-gradient(to bottom, transparent 55%, rgba(255,255,255,0.9) 82%, #fff 100%)",
                  opacity: bottomWash,
                  transition: "opacity 0.12s linear",
                }}
              />
            </div>
          </div>

          {/* Middle band — pinned to the viewport, so the photo slides under it.
              A screen-tall sticky layer on a track reaching one screen past the
              photo at both ends: whenever any of the photo is on screen, the
              layer sits exactly over the viewport, and the wrapper clips it to
              the photo. (A fixed layer under clip-path looks the same but
              froze the page once anything on it animated.) */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: 0, right: 0, top: "-100vh", bottom: "-100vh", pointerEvents: "none" }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                height: "100vh",
                background: BAND_GRADIENT,
                opacity: band,
                transition: "opacity 0.12s linear",
              }}
            />
          </div>
        </div>

        {/* Heading + manifesto — right of the pendant, level with its ring */}
        <div
          style={{
            position: "absolute",
            left: "59%",
            top: "44%",
            transform: "translateY(-50%)",
            maxWidth: "36%",
          }}
        >
          <p
            style={{
              ...headingStyle,
              fontSize: "clamp(11px, 2vw, 20px)",
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
              fontSize: "clamp(9px, 0.75vw, 12px)",
              lineHeight: 1.35,
              color: "#888",
              margin: "clamp(10px, 1.6vw, 22px) 0 0",
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
