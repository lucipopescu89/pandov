"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/** Chess (Mind), figure (Body) and lamp (Space) all sit slightly back. */
const CATEGORY_IMAGE_OPACITY = 0.85

/**
 * For Mind is the only row that is held still while it arrives.
 *
 * The hero ends by washing the whole screen to white (see `WHITE_OUT_VH` in
 * `components/hero-animation.tsx`). This row picks the screen up there: it is
 * pinned for MIND_IN_VH of scroll and comes up out of that same white where it
 * stands — fading in and easing forward from MIND_ZOOM — so what the eye reads
 * is a picture arriving, not a page moving. Once it has landed the row unpins
 * and For Body and For Space scroll in the ordinary way.
 *
 * WHITE is a breath of empty white before it starts, REVEAL the stretch it is
 * still arriving over, and what is left of MIND_IN holds it finished before
 * the page resumes. All three are counted in real scrolling, so they are also
 * what they look like: at roughly 9px of wheel per vh, the reveal runs about
 * three turns.
 */
const MIND_IN_VH = 50
const MIND_WHITE_VH = 12
const MIND_REVEAL_VH = 34
const MIND_ZOOM = 0.94

/**
 * Clamp to 0..1, treating a non-finite value as 0. `scrolled / total` is NaN
 * when the pinned container and the viewport measure the same — a background
 * tab, a bfcache restore, a prerender — and NaN survives Math.max/min, so an
 * unguarded one would leave the row stuck at whatever branch NaN falls
 * through to.
 */
function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
}

const textStyle = {
  fontFamily: "'Julius Sans One', sans-serif",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
}

function CategoryLabel({
  title,
  align = "center",
  dark = false,
  href,
}: {
  title: string
  align?: "center" | "right"
  dark?: boolean
  href?: string
}) {
  const color = dark ? "#1a1a1a" : "#555"
  const exploreColor = dark ? "#444" : "#888"

  const content = (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        cursor: href ? "pointer" : "default",
      }}
    >
      <p style={{ ...textStyle, fontSize: "clamp(11px, 2vw, 20px)", color, fontWeight: 400, margin: 0 }}>
        {title}
      </p>
      <p style={{ ...textStyle, fontSize: "clamp(9px, 1vw, 12px)", color: exploreColor, fontWeight: 400, margin: 0, letterSpacing: "0.15em" }}>
        &rarr; Explore
      </p>
    </div>
  )

  if (href) {
    return <a href={href} style={{ textDecoration: "none" }}>{content}</a>
  }

  return content
}

// Reusable hook: returns a value 0→1 as the element scrolls into the viewport center
function useScrollFadeIn(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Start fading in when top of element is 80% down the screen, fully in at 30%
      const start = vh * 0.85
      const end = vh * 0.3
      const top = rect.top
      const raw = (start - top) / (start - end)
      setProgress(Math.min(1, Math.max(0, raw)))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [ref])

  return progress
}

// FOR SPACE row — scroll-driven gradient overlays + fade in
function SpaceRow() {
  const rowRef = useRef<HTMLDivElement>(null)
  const [gradientOpacity, setGradientOpacity] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const fadeProgress = useScrollFadeIn(rowRef as React.RefObject<HTMLElement>)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const el = rowRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const center = rect.top + rect.height / 2
      const distFromCenter = Math.abs(center - vh / 2)
      const maxDist = vh / 2 + rect.height / 2
      const raw = 1 - Math.min(1, distFromCenter / (maxDist * 0.6))
      setGradientOpacity(Math.max(0, 1 - raw))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (isMobile) {
    return (
      <div
        ref={rowRef}
        style={{
          width: "100%",
          height: "100vh",
          background: "#fff",
          position: "relative",
          opacity: fadeProgress,
          transform: `translateY(${(1 - fadeProgress) * 30}px)`,
          transition: "opacity 0.1s, transform 0.1s",
          overflow: "hidden",
        }}
      >
        {/* Mobile: full-height image with text overlay on bottom-right */}
        <Image
          src="/images/cat-space.png"
          alt="For Space sculpture"
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center center", opacity: CATEGORY_IMAGE_OPACITY }}
        />
        {/* Right gradient for text readability */}
        <div style={{ position: "absolute", inset: 0, left: "auto", right: 0, width: "60%", background: "linear-gradient(to left, rgba(255,255,255,0.95), transparent)", pointerEvents: "none" }} />
        {/* Text overlay — right side, vertically centered, moved up 40px */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "55%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "translateY(-70px)",
          }}
        >
          <CategoryLabel title="For Space" align="center" dark href="/space" />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      style={{
        width: "100%",
        height: "100vh",
        background: "#fff",
        position: "relative",
        opacity: fadeProgress,
        transform: `translateY(${(1 - fadeProgress) * 30}px)`,
        transition: "opacity 0.1s, transform 0.1s",
        overflow: "hidden",
      }}
    >
      {/* Image — fills full height, shifted 140px right */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "260px",
          height: "100%",
          width: "62%",
        }}
      >
        <Image
          src="/images/cat-space.png"
          alt="For Space sculpture"
          fill
          sizes="62vw"
          style={{ objectFit: "cover", objectPosition: "center center", opacity: CATEGORY_IMAGE_OPACITY }}
        />

        {/* Left white gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "20%",
            background: "linear-gradient(to right, #fff, transparent)",
            opacity: 0.8 + gradientOpacity * 0.2,
            pointerEvents: "none",
          }}
        />

        {/* Right white gradient — blends image into text area */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            left: "auto",
            right: 0,
            width: "45%",
            background: "linear-gradient(to left, #fff, transparent)",
            opacity: 1,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Text — 20px right of page center, 30px up */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "calc(50% + 5px)",
          width: "300px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translateY(-60px)",
        }}
      >
        <CategoryLabel title="For Space" align="center" dark href="/space" />
      </div>
    </div>
  )
}

// FOR MIND — held still while it comes up out of the hero's white
function MindRow() {
  const ref = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const scrolled = -el.getBoundingClientRect().top
      setPinned(total > 0 ? clamp01(scrolled / total) : 0)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    // The measurements themselves move on a resize, and a tab that loaded in
    // the background only gets a real viewport once it is looked at.
    window.addEventListener("resize", onScroll)
    window.addEventListener("pageshow", onScroll)
    document.addEventListener("visibilitychange", onScroll)
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("pageshow", onScroll)
      document.removeEventListener("visibilitychange", onScroll)
    }
  }, [])

  // Linear in scroll, not eased: this beat is short, and a dissolve that lags
  // the hand reads as a delay rather than as a fade.
  const reveal = clamp01((pinned * MIND_IN_VH - MIND_WHITE_VH) / MIND_REVEAL_VH)

  return (
    <div ref={ref} style={{ height: `${100 + MIND_IN_VH}vh`, position: "relative" }}>
      {/* Deliberately transparent, not white. Because this section is pulled
          up over the hero's last screen, a white ground here would creep up
          from the bottom edge and cover the hero while it is still washing —
          which is the very thing the wash replaced. Left clear, the white
          under all of this is the section's own background, which paints below
          every pinned frame, so the hero washes out over it and then slides
          away against it without a seam. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            opacity: reveal,
            transform: `scale(${MIND_ZOOM + reveal * (1 - MIND_ZOOM)})`,
            willChange: "opacity, transform",
          }}
        >
          <div style={{ textAlign: "center", paddingBottom: "24px" }}>
            <CategoryLabel title="For Mind" align="center" href="/mind" />
          </div>
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {isMobile ? (
              <Image
                src="/images/cat-mind-mobile.jpg?v=3"
                alt="Chess set — For Mind"
                width={900}
                height={1200}
                style={{ width: "100%", height: "auto", display: "block", opacity: CATEGORY_IMAGE_OPACITY }}
                priority
              />
            ) : (
              <Image
                src="/images/cat-mind.jpg"
                alt="Chess set — For Mind"
                width={1600}
                height={600}
                style={{ width: "100%", height: "auto", display: "block", opacity: CATEGORY_IMAGE_OPACITY }}
                priority
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// FOR BODY — fade in on scroll
function BodyRow() {
  const ref = useRef<HTMLDivElement>(null)
  const fade = useScrollFadeIn(ref as React.RefObject<HTMLElement>)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return (
    <div
      ref={ref}
      style={{
        paddingTop: "100px",
        paddingBottom: "0",
        opacity: fade,
        transform: `translateY(${(1 - fade) * 30}px)`,
        transition: "opacity 0.1s, transform 0.1s",
      }}
    >
      {isMobile ? (
        /* Mobile: image slightly larger, shifted left; text shifted right — fits on one screen */
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginRight: "16px", minWidth: "100px", transform: "translateX(30px)" }}>
            <CategoryLabel title="For Body" align="center" href="/body" />
          </div>
          <div style={{ transform: "translateX(-40px)", flexShrink: 0 }}>
            <Image
              src="/images/cat-body.jpg"
              alt="Body sculpture — For Body"
              width={600}
              height={800}
              style={{ width: "auto", height: "55vh", objectFit: "contain", display: "block", opacity: CATEGORY_IMAGE_OPACITY }}
            />
          </div>
        </div>
      ) : (
        /* Desktop: unchanged */
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginRight: "48px", minWidth: "160px" }}>
            <CategoryLabel title="For Body" align="center" href="/body" />
          </div>
          <div style={{ marginLeft: "45px" }}>
            <Image
              src="/images/cat-body.jpg"
              alt="Body sculpture — For Body"
              width={600}
              height={800}
              style={{ width: "auto", height: "60vh", objectFit: "contain", display: "block", opacity: CATEGORY_IMAGE_OPACITY }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function CategoriesSection() {
  return (
    /**
     * Pulled up by one screen, deliberately.
     *
     * A sticky section stops being pinned one viewport before its container
     * ends — the last screen is the room its pinned child needs to travel up
     * through. The hero has finished washing to white by the time it gets
     * there, so that screen is a blank white scroll: some 900px of nothing
     * between the wash and For Mind arriving.
     *
     * Overlapping this section onto it by exactly that one screen puts For
     * Mind's pin at the moment the hero's pin releases. The hero then slides
     * away behind this section's own white sticky viewport, which is opaque
     * and covers the frame, so nothing of it is ever seen leaving and the two
     * beats read as one dissolve.
     */
    <section style={{ background: "#fff", width: "100%", marginTop: "-100vh" }}>
      <MindRow />
      <BodyRow />
      <SpaceRow />
    </section>
  )
}
