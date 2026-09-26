"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/** Chess (Mind), figure (Body) and lamp (Space) all sit slightly back. */
const CATEGORY_IMAGE_OPACITY = 0.85

/**
 * Where each object's own axis falls across its photograph, read off the
 * pixels: the midpoint of the dark shape, row by row, through the figure. The
 * pendant's is a hair left of the frame's centre and steady from the ring to
 * the tip. The sculpture's is 0.448. It runs from 0.446 through the body to
 * 0.454 at the head, in the author's photograph of 2026-09-26, which replaced
 * one where it stood at 0.456. It is these lines, not the middle of each image,
 * that stand on the columns. BODY_RING is the left edge of the pendant's ring,
 * the part of it that reaches furthest towards the words. Re-measure if either
 * photograph is replaced.
 */
const BODY_ASPECT = 1026 / 1868
const BODY_AXIS = 0.495
const BODY_RING = 0.203
const SPACE_W = 2294
const SPACE_H = 1600
const SPACE_ASPECT = SPACE_W / SPACE_H
const SPACE_AXIS = 0.448

/** The pendant is drawn 60vh high; this is its width at that height. */
const BODY_H_VH = 60
const BODY_W_VH = +(BODY_H_VH * BODY_ASPECT).toFixed(3)

/**
 * On a wide screen For Body and For Space share two verticals, a twelfth of
 * the page either side of the centre line the menus sit on. "For Body" stands
 * on the left one with the Space sculpture under it; the pendant hangs on the
 * right one with "For Space" under it. The two rows read as one composition,
 * crossed. They stood a sixth out at first, on the thirds; that left the words
 * and the pendant too far apart to read as a pair, and the distance was
 * halved.
 *
 * A fraction of the page rather than pixels, so it holds at any width. Before
 * this the four were placed independently — the words by fixed offsets from
 * the centre, the sculpture by a cover crop that shifts with the shape of the
 * screen — and they drifted apart differently on every monitor: at 1440px the
 * sculpture stood 169px off the line of the words above it, at 1920px 106px.
 * Percentages of the row, not vw, because vw counts the scrollbar gutter and
 * the centre line does not.
 *
 * The twelfth has a floor. The pendant is sized by the height of the screen
 * and the columns by its width, so on a squarer or smaller screen the ring
 * closes on the words, and on an upright tablet it would run over them. The
 * floor keeps COLUMN_GAP_PX between the ring and the end of "For Body" at its
 * largest, LABEL_HALF_PX either side of its line. Both columns move out
 * together, so the words stay on their objects and the pair stays centred; only
 * the fraction gives. On the common desktop sizes, 1280×720 to 2560×1440, the
 * twelfth is the larger and the floor never applies.
 */
const LABEL_HALF_PX = 68
const COLUMN_GAP_PX = 60
const COLUMN_FLOOR = `${(LABEL_HALF_PX + COLUMN_GAP_PX) / 2}px + ${+(((BODY_AXIS - BODY_RING) * BODY_W_VH) / 2).toFixed(3)}vh`
const COLUMN_OFFSET = `max(${+(100 / 12).toFixed(4)}%, ${COLUMN_FLOOR})`
const COLUMN_LEFT = `calc(50% - ${COLUMN_OFFSET})`
const COLUMN_RIGHT = `calc(50% + ${COLUMN_OFFSET})`

/**
 * The room is drawn the full height of its row and at its own proportions,
 * then shown through a window that opens SPACE_FROM into the photograph and
 * runs to its right edge. The window replaces a box cropped with object-fit:
 * cover, which is what let the sculpture wander — a cover crop recentres on
 * the box, and the box was the shape of the screen. Opening an eighth of the
 * way in keeps the white margin to the left of the room about as wide as the
 * fixed 260px that box began at on a 1920px screen, and leaves the sculpture
 * about as much of the room beside it as it had.
 */
const SPACE_W_VH = 100 * SPACE_ASPECT
const SPACE_FROM = 0.125

/**
 * On a phone, For Body and For Space stand over their objects, as For Mind
 * always has. The author asked for it on 2026-09-26, after For Body had sat
 * beside its pendant and For Space over the right of its room. The words are
 * centred, and the object is centred under them.
 *
 * `PHONE_GAP` runs from the foot of "→ Explore" to the top of the object
 * itself, not of its photograph. The photographs leave different white above
 * their objects, so each margin takes off its own: the pendant starts
 * `BODY_TOP` down its photograph, the sculpture `SPACE_TOP`.
 *
 * The pendant keeps the 55vh it had beside its words. The room is shown
 * `SPACE_PHONE_H_VH` high, through a window as wide as the phone, with the
 * sculpture's axis on the centre line. There it stands about 69vh tall, near
 * the 86vh it had when the room filled the screen and the words sat on it.
 */
const PHONE_GAP = 60
const BODY_TOP = 0.048
const BODY_PHONE_H_VH = 55
const SPACE_TOP = 0.024
const SPACE_PHONE_H_VH = 80
const SPACE_PHONE_W_VH = SPACE_PHONE_H_VH * SPACE_ASPECT

/**
 * Puts a CategoryLabel on a column by its letters rather than by its box. The
 * title carries 0.2em of letter-spacing after its last letter as well as
 * between them, so the letters stand 0.1em left of the centre of their own
 * box. The wrapper takes the title's size so that 0.1em can be handed back
 * here. `lift` moves it up from the middle of the row.
 */
function onColumn(left: string, lift = 0): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    left,
    fontSize: "clamp(11px, 2vw, 20px)",
    transform: `translate(calc(-50% + 0.1em), calc(-50% - ${lift}px))`,
  }
}

/**
 * For Mind is the only row that is pinned while it arrives.
 *
 * The hero ends by washing the whole screen to white (see `WHITE_OUT_VH` in
 * `components/hero-animation.tsx`). This row picks the screen up there: it is
 * pinned for MIND_IN_VH of scroll and comes up out of that same white — fading
 * in and rising from below into its place, see MIND_RISE_VH — and when the row
 * unpins it is already travelling with the page, so it goes on up the screen
 * with For Body and For Space behind it.
 *
 * It does not grow as it comes. Until 2026-09-21 it also eased forward from
 * 94% of its size over the fade; the author asked for that to go, and the
 * entrance is now the fade and the rise alone.
 *
 * WHITE is a breath of empty white before it starts, REVEAL the stretch it
 * fades in over, and what is left of MIND_IN lets it finish rising before the
 * page takes it. All three are counted in real scrolling, so they are also
 * what they look like: at roughly 9px of wheel per vh, the reveal runs about
 * three turns.
 */
const MIND_IN_VH = 50
const MIND_WHITE_VH = 12
const MIND_REVEAL_VH = 34

/**
 * How far below its place the picture starts, and why it is exactly this far.
 *
 * The rise goes with the hand, the same way For Body and For Space come in, so
 * it has to hand over to them without a seam. The row unpins at the top of the
 * rise, and from that moment the page carries it at the full speed of the
 * scroll. A rise that settled and stopped first would leave the picture
 * standing still for a beat and then jerk into motion; one that ran at a
 * steady fraction of the scroll would visibly lurch faster at the unpin.
 *
 * So the rise starts from rest and accelerates — an ease-in, t² — and is sized
 * to be moving at exactly the page's speed when the pin lets go. It runs from
 * the first glimmer to the unpin, the MIND_IN - MIND_WHITE stretch; t² covers a
 * distance in half the time the speed it ends at would, which makes half that
 * stretch the one distance whose last step matches the scroll's. Anything
 * shorter hands over slower than the page and anything longer faster. Keep it
 * derived: retune the beats above and it stays matched.
 *
 * Given in vh, not px, for the same reason — the pin is measured in vh, so the
 * handover only matches on every screen if the rise is too. It is about 137px
 * on a 720px-high window and 205px on a 1080px one, and it is spent mostly
 * while the picture is still faint: it has only started moving when it first
 * shows, and is some 20% short of its place when it is fully there.
 */
const MIND_RISE_VH = (MIND_IN_VH - MIND_WHITE_VH) / 2

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
          paddingTop: "100px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: fadeProgress,
          transform: `translateY(${(1 - fadeProgress) * 30}px)`,
          transition: "opacity 0.1s, transform 0.1s",
        }}
      >
        {/* The words on white now, over the room rather than on it, so they
            take For Body's grey rather than the darker ink they needed on the
            photograph. See PHONE_GAP. */}
        <div style={{ marginBottom: `calc(${PHONE_GAP}px - ${+(SPACE_TOP * SPACE_PHONE_H_VH).toFixed(3)}vh)` }}>
          <CategoryLabel title="For Space" align="center" href="/space" />
        </div>
        {/* The window onto the room, the sculpture's axis on the centre line. */}
        <div style={{ position: "relative", width: "100%", height: `${SPACE_PHONE_H_VH}vh`, overflow: "hidden" }}>
          <Image
            src="/images/cat-space.avif"
            alt="For Space sculpture"
            width={SPACE_W}
            height={SPACE_H}
            sizes={`${+SPACE_PHONE_W_VH.toFixed(3)}vh`}
            style={{
              position: "absolute",
              top: 0,
              left: `calc(50% - ${+(SPACE_AXIS * SPACE_PHONE_W_VH).toFixed(3)}vh)`,
              height: "100%",
              width: `${+SPACE_PHONE_W_VH.toFixed(3)}vh`,
              maxWidth: "none",
              opacity: CATEGORY_IMAGE_OPACITY,
            }}
          />
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
      {/* The window onto the room, placed so the sculpture's axis stands on
          the left column. See SPACE_FROM. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `calc(${COLUMN_LEFT} - ${+((SPACE_AXIS - SPACE_FROM) * SPACE_W_VH).toFixed(3)}vh)`,
          height: "100%",
          width: `${+((1 - SPACE_FROM) * SPACE_W_VH).toFixed(3)}vh`,
          overflow: "hidden",
        }}
      >
        <Image
          src="/images/cat-space.avif"
          alt="For Space sculpture"
          width={SPACE_W}
          height={SPACE_H}
          sizes={`${SPACE_W_VH}vh`}
          style={{
            position: "absolute",
            top: 0,
            left: `${-SPACE_FROM * SPACE_W_VH}vh`,
            height: "100%",
            width: `${SPACE_W_VH}vh`,
            maxWidth: "none",
            opacity: CATEGORY_IMAGE_OPACITY,
          }}
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

      {/* On the right column, over the pendant above it; 60px above the
          middle of the row, where it has always stood. */}
      <div style={onColumn(COLUMN_RIGHT, 60)}>
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
  // From the first glimmer to the unpin, 0 → 1, eased in. See MIND_RISE_VH.
  const climb = clamp01((pinned * MIND_IN_VH - MIND_WHITE_VH) / (MIND_IN_VH - MIND_WHITE_VH))
  const rise = MIND_RISE_VH * (1 - climb * climb)

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
        {/* Not clickable until it has begun to appear. This row is pulled up
            over the hero's last screen, so for the whole Presence beat it is
            already there at opacity 0, climbing the screen behind "We give form
            to presence" — and an invisible link still takes the click, which
            sent people to /mind from what looked like empty ground. */}
        <div
          style={{
            width: "100%",
            opacity: reveal,
            transform: `translateY(${rise}vh)`,
            willChange: "opacity, transform",
            pointerEvents: reveal > 0 ? "auto" : "none",
          }}
        >
          {/* Centred by flex rather than by text-align, so the link is only as
              wide as its two lines. Under text-align the <a> wrapped a block
              that ran the full width of the page, and the whole band either
              side of the words was a link too.

              On a wide screen it is set 60px below where the flow puts it,
              down onto the white at the top of the photograph, which leaves it
              some 45px clear of the board on a laptop and more on anything
              wider. Moved by `top` rather than by
              changing the padding, so the photograph stays where it was and
              the pair stays centred on the screen as it was drawn. The z-index
              is what keeps the words visible: the photograph's opacity makes it
              a layer of its own, painted after this one, and its white would
              otherwise cover them.

              Not on a phone. The mobile photograph is a closer crop and its
              tallest gold piece stands almost to the top edge, straight under
              the words: 60px down puts the arrow of "→ Explore" on its tip. */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingBottom: "24px",
              position: "relative",
              top: isMobile ? 0 : "60px",
              zIndex: 1,
            }}
          >
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
        /* Phone: the words over the pendant, both centred. See PHONE_GAP. */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: `calc(${PHONE_GAP}px - ${+(BODY_TOP * BODY_PHONE_H_VH).toFixed(3)}vh)` }}>
            <CategoryLabel title="For Body" align="center" href="/body" />
          </div>
          <Image
            src="/images/cat-body.jpg"
            alt="Body sculpture — For Body"
            width={1026}
            height={1868}
            style={{ width: "auto", height: `${BODY_PHONE_H_VH}vh`, display: "block", opacity: CATEGORY_IMAGE_OPACITY }}
          />
        </div>
      ) : (
        /* Desktop: the pendant's axis on the right column, the words on the
           left one, level with the middle of the pendant. */
        <div style={{ position: "relative" }}>
          <Image
            src="/images/cat-body.jpg"
            alt="Body sculpture — For Body"
            width={1026}
            height={1868}
            style={{
              display: "block",
              height: `${BODY_H_VH}vh`,
              width: `${BODY_W_VH}vh`,
              marginLeft: `calc(${COLUMN_RIGHT} - ${+(BODY_AXIS * BODY_W_VH).toFixed(3)}vh)`,
              opacity: CATEGORY_IMAGE_OPACITY,
            }}
          />
          <div style={onColumn(COLUMN_LEFT)}>
            <CategoryLabel title="For Body" align="center" href="/body" />
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
