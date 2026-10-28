"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { NUDGE_PX, ease, heroUp, playBeat, ramp } from "@/lib/played-beat"

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
 * The room is drawn the full height of its row, at its own proportions and
 * whole, placed so the sculpture's axis stands on the left column. Placing it
 * by that axis replaced a box cropped with object-fit: cover, which is what
 * let the sculpture wander — a cover crop recentres on the box, and the box
 * was the shape of the screen.
 *
 * Until 2026-09-28 it was shown through a window that opened an eighth of the
 * way into the photograph, under a white fade a fifth of that window wide.
 * Between them they took away the curtain at the left of the room, and the
 * author asked for the photograph whole. Its left edge is already faded
 * nearly to white in the file (240–255, against the page's 255), so
 * SPACE_EDGE_FADE only takes the last of that grey off the edge and leaves
 * the curtain alone. The fade on the right covers the same part of the room
 * it always did, SPACE_RIGHT_FADE of it.
 *
 * Inside a browser window squarer than about 3:2, the left edge runs past the
 * page's own and the page crops it there. The axis on the column is the rule
 * that holds.
 */
const SPACE_W_VH = 100 * SPACE_ASPECT
const SPACE_EDGE_FADE = 0.06
const SPACE_RIGHT_FADE = 0.394

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
 * On a phone the three rows stand the same distance apart, the author's asking
 * on 2026-09-26. The distance is measured from the foot of one row's object to
 * the top of the next row's words, once each row has finished rising into place.
 *
 * The distance is the one from the pendant to "For Space": the white under the
 * pendant (`BODY_FOOT` down its photograph) and the 100px Space's row opens
 * with. That came to 131–144px on phones.
 *
 * From For Mind to "For Body" it was 195–297px, and not one number. For Mind
 * is held on screen while it arrives, centred in a frame the height of the
 * screen, so the white under it grows with the phone's height. Its photograph
 * is `MIND_PHONE_ASPECT` as tall as the page is wide, its chess set ends
 * `MIND_FOOT` down it, and its words take `MIND_LABEL_H` above it.
 *
 * `BODY_PHONE_PULL` draws For Body's row up by the difference, worked out for
 * whatever the screen is. On a tall phone it is pulled up into the bottom of
 * For Mind's frame while For Mind is still held, into white: 35px of it on a
 * 390 × 844 screen, where the chess set ends 150px above.
 */
const MIND_PHONE_ASPECT = 1195 / 1000
const MIND_FOOT = 0.953
const MIND_LABEL_H = 72
const BODY_FOOT = 0.915
const BODY_PHONE_PULL = `calc(${+((1 - BODY_FOOT) * BODY_PHONE_H_VH - 50).toFixed(4)}vh + ${MIND_LABEL_H / 2}px + ${+((0.5 - (1 - MIND_FOOT)) * MIND_PHONE_ASPECT * 100).toFixed(4)}vw)`

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
 * For Mind comes up out of the hero's white, played, not scrolled (2026-10-02,
 * the author's asking, after the hero's doors and Presence were played the
 * same day; see `lib/played-beat.ts`).
 *
 * The scroll after the Presence composition starts it, and the page is held
 * while it plays: the hero washes the screen to white (MIND_WASH_S, played by
 * `components/hero-animation.tsx`), a breath of empty white, then For Mind
 * fades in and rises from below into its place, where it comes to rest. The
 * scroll after that carries it on up the page with For Body and For Space
 * behind it. Scrolled back up, it sinks and fades and the white washes off
 * Presence again.
 *
 * It does not grow as it comes. Until 2026-09-21 it also eased forward from
 * 94% of its size over the fade; the author asked for that to go, and the
 * entrance is the fade and the rise alone.
 *
 * The proportions are those of the scrolled beat the author approved, a vh of
 * which a steady hand covered in about a thirtieth of a second: a wash of 24
 * vh, a breath of 12, a fade of 34 and a rise of 46. The breath is shorter
 * here, because still white held for a whole turn of the wheel read as a gap,
 * not a breath. 2.6s in all, as long as Presence's.
 *
 * Until then the row was pinned for 58 vh of scrolling and rose at the page's
 * own speed, so that it could hand over to the page without a seam at the
 * unpin. Played, it comes to rest before the page moves it on, so it eases in
 * and out instead. The fade leads the rise, so the picture is seen while it is
 * still low: at half strength it is still some 37 vh under its place, about
 * where the author asked for it to show on 2026-09-28.
 */
/*
 * Quicker and more direct (2026-10-27, the author's asking: For Mind should
 * come in sooner after the scroll past Presence, keeping the inertia but
 * lighter and smaller). The wash, the breath, the fade and the rise are all
 * shorter, the rise is a third of the way it was (46 vh before), and the rise
 * runs on an ease-out: it moves at once and only settles at the end, where it
 * used to gather speed first. 1.55s in all, from 2.6.
 */
export const MIND_WASH_S = 0.5
const MIND_BREATH_S = 0.1
const MIND_FROM_S = MIND_WASH_S + MIND_BREATH_S
const MIND_FADE_S = 0.7
const MIND_RISE_S = 0.95
/** The whole beat, s, wash included: the time the scroll is held for. */
export const MIND_BEAT_S = MIND_FROM_S + Math.max(MIND_FADE_S, MIND_RISE_S)
/** How far below its place the picture starts, vh. */
const MIND_RISE_VH = 16

// easeOutCubic: the rise leaves at speed and settles into its place.
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
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
      {/* The whole room, placed so the sculpture's axis stands on the left
          column. See SPACE_W_VH. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `calc(${COLUMN_LEFT} - ${+(SPACE_AXIS * SPACE_W_VH).toFixed(3)}vh)`,
          height: "100%",
          width: `${+SPACE_W_VH.toFixed(3)}vh`,
        }}
      >
        <Image
          src="/images/cat-space.avif"
          alt="For Space sculpture"
          width={SPACE_W}
          height={SPACE_H}
          sizes={`${+SPACE_W_VH.toFixed(3)}vh`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            maxWidth: "none",
            opacity: CATEGORY_IMAGE_OPACITY,
          }}
        />

        {/* Left white gradient, on the edge alone */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${+(SPACE_EDGE_FADE * 100).toFixed(2)}%`,
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
            width: `${+(SPACE_RIGHT_FADE * 100).toFixed(2)}%`,
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

// FOR MIND — comes up out of the hero's white, played
function MindRow() {
  const ref = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Its place is the hero's last: the row stands exactly on the screen when
  // the hero lets go, and the scroll that starts the beat nudges the page
  // NUDGE_PX past it, so on is the row's top within that of the screen's.
  useEffect(() => {
    const el = ref.current
    const content = contentRef.current
    if (!el || !content) return
    const beat = playBeat(
      MIND_BEAT_S,
      // On the way back up it stays in its place and scrolls away with the
      // page, rather than sinking (see `heroUp`).
      () => heroUp.on || el.getBoundingClientRect().top < NUDGE_PX,
      (t) => {
        const fade = ease(ramp(t, MIND_FROM_S, MIND_FROM_S + MIND_FADE_S))
        const rise = MIND_RISE_VH * (1 - easeOut(ramp(t, MIND_FROM_S, MIND_FROM_S + MIND_RISE_S)))
        content.style.opacity = String(fade)
        content.style.transform = `translateY(${rise.toFixed(3)}vh)`
        content.style.pointerEvents = fade > 0 ? "auto" : "none"
      },
      // One beat with the hero's wash, so that the hero can send both back
      // to the start together (see `rewind`).
      "mind",
    )
    return beat.dispose
  }, [])

  return (
    /* One screen, and no longer pinned: the beat is played where the row
       stands, and the scroll after it carries the row on with the page.
       Deliberately transparent, not white. This section is pulled up over the
       hero's last screen, and a white ground here would cover the hero while
       it is still washing. Left clear, the white under all of this is the
       section's own background, which paints below the hero, so the hero
       washes out over it and then slides away against it without a seam. The
       overflow keeps the rising picture inside the screen it rises on. */
    <div
      ref={ref}
      style={{
        position: "relative",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Not clickable until it has begun to appear. This row is pulled up
          over the hero's last screen, so for the whole Presence beat it is
          already there at opacity 0, behind "We give form to presence", and
          an invisible link still takes the click, which sent people to /mind
          from what looked like empty ground. Its player writes the fade, the
          rise and the clicks; React sets them once, unseen, and never again. */}
      <div
        ref={contentRef}
        style={{
          width: "100%",
          opacity: 0,
          transform: `translateY(${MIND_RISE_VH}vh)`,
          willChange: "opacity, transform",
          pointerEvents: "none",
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
        marginTop: isMobile ? BODY_PHONE_PULL : 0,
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
     * Mind's row exactly on the screen at the moment the hero's pin releases,
     * which is where For Mind's beat is played. The hero then slides away,
     * washed white, against this section's own white, so nothing of it is ever
     * seen leaving and the two beats read as one dissolve.
     */
    <section style={{ background: "#fff", width: "100%", marginTop: "-100vh" }}>
      <MindRow />
      <BodyRow />
      <SpaceRow />
    </section>
  )
}
