"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/** Chess (Mind), figure (Body) and lamp (Space) all sit slightly back. */
const CATEGORY_IMAGE_OPACITY = 0.85

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

// FOR MIND — fade in on scroll
function MindRow() {
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
        opacity: fade,
        transform: `translateY(${(1 - fade) * 30}px)`,
        transition: "opacity 0.1s, transform 0.1s",
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
    <section style={{ background: "#fff", width: "100%" }}>
      <MindRow />
      <BodyRow />
      <SpaceRow />
    </section>
  )
}
