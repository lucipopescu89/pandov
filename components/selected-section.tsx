"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { JULIUS, JULIUS_MIN, TEXT_FONT, TEXT_MIN, TEXT_TRACK, TRACK } from "@/lib/type"

/**
 * SELECTED — laid out after the author's Figma frame "Selected" of
 * 2026-11-05 (`public/images/home/Selected.svg`, 1893 × 928): the section is
 * dark now (#202020), two cards on the left, and the heading with its line
 * on the right, ranged left. Every place is a share of the frame, so the
 * composition holds at any width.
 *
 * Until that day (the mock-up of 2026-10-30) the section was see-through and
 * the Making photograph rose up behind it; the two now stand one after the
 * other, each on its own ground, Selected second, under Making's dark wood.
 *
 * The cards are the frame's two photographs, lifted out of the export:
 * Emperor (`selected-emperor.avif`, 924 × 1124) and the Chess Set
 * (`selected-chess-set.avif`, 1187 × 1154), AVIF q90 4:4:4 as for the other
 * photographs of metal on dark. In Figma each is drawn at 85% with
 * `mix-blend-mode: lighten` on the ground, and so they are here: the section
 * is not transformed, so the blend still sees the #202020 behind it.
 *
 * On a phone (under 768px) it is the author's frame "Selected Mobile" (974 ×
 * 1522, 2026-11-05): the words at the top left, then one card filling most of
 * the width with the other peeking in at the side. A tap on the one that
 * peeks, or a swipe, slides it into the middle, and the first goes to peek on
 * the other side; a tap on the one in the middle opens its page. The two
 * layouts are both in the page and a media query shows one, so a phone never
 * draws the computer's first. Type on the phone is the other sections' on a
 * phone, as the author asked (the frame's sizes were rough): Julius 11px
 * tracked 0.2em, like "For Mind", and Assistant 12.5px, like the collections'
 * lines of intent.
 */

/** The frame, in its own units. */
const FW = 1893
const FH = 928
const pctX = (x: number) => `${(x / FW) * 100}%`
const pctY = (y: number) => `${(y / FH) * 100}%`
/** Type follows the frame's width; `px` is the size at 1893. */
const vw = (px: number) => `${(px / FW) * 100}vw`

const CARD_Y = 168
const CARD_W = 504
const CARD_H = 568
const PRODUCTS = [
  { x: 86, src: "/images/home/selected-emperor.avif", alt: "Emperor, a Second Wind pendant", href: "/body/second-wind" },
  { x: 660, src: "/images/home/selected-chess-set.avif", alt: "The Chess Set", href: "/mind/chess-set" },
]

/**
 * The words. Julius 29.9 and Assistant 15 at 1893, measured off the export's
 * outlined text (cap tops at 297.2 and 378.2, left edges at 1332). A line box's
 * top is set above the cap top by the face's own room: 0.085em for Julius at
 * line-height 1, 0.31em for Assistant at 1.35.
 */
const TEXT_X = 1332
const HEADING_PX = 29.9
const HEADING_TOP = 297.2 - 0.085 * HEADING_PX
const LINE_PX = 15
const LINE_TOP = 378.2 - 0.31 * LINE_PX

/** The line is in Manrope since 2026-11-16 (the frame has Assistant), never under TEXT_MIN. */

/**
 * The phone's frame, in its own units: the cards' sizes and places as the
 * frame has them, Emperor 69 units off the left edge with the Chess Set 41
 * units on, so 159 units of it show at the right. With the Chess Set in the
 * middle the two change sides: it stands 69 units off the right edge and
 * Emperor peeks in at the left.
 */
const PW = 974
const PH = 1522
const P_CARDS = [
  { w: 843, h: 1036, y: 411 },
  { w: 891, h: 1005, y: 383 },
]
const P_GAP = 41
const P_BLEED = 69
const P_TEXT_X = 61
const P_TEXT_Y = 79
/** Where each card starts on the strip, and the strip's offset with each in the middle. */
const P_START = [0, P_CARDS[0].w + P_GAP]
const P_OFFSET = [-P_BLEED, PW - P_CARDS[1].w + P_BLEED - P_START[1]]
/** A sideways drag at least this long (px) is a swipe. */
const SWIPE_PX = 40

/**
 * On a phone Selected goes into white as the reader goes on down (2026-11-18,
 * the author's asking: the hand with the ring came straight under the dark
 * and looked cramped; "let Selected be lost in a white fade"). A white veil
 * over the whole of it, the cards and the words alike, rises from nothing as
 * the cards' frame's foot goes up from `P_OUT_FROM` of the screen's height to
 * full by `P_OUT_TO`, on a smootherstep, as For Space washes out under
 * Making (`useWhiteOut` in `categories-section.tsx`); back up, it lifts. It
 * is written to the veil's style on each frame of scroll, not through React.
 * Under the cards, `P_WHITE_PX` of white before the hand (a static gradient
 * from the dark to white stood there for a moment; the author had it taken
 * out).
 */
const P_OUT_FROM = 0.85
const P_OUT_TO = 0.3
// 230 at first; less the same morning (the author's asking: with Selected going white, it left too much white over the hand)
const P_WHITE_PX = 30

const CARD_OPACITY = 0.85
const CARD_OPACITY_HOVER = 0.95

/** The phone's Selected: one card in the middle, the other peeking. */
function SelectedPhone() {
  const [active, setActive] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
    swiped.current = false
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
    swiped.current = true
    setActive(dx < 0 ? 1 : 0)
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: "relative", width: "100%", aspectRatio: `${PW} / ${PH}`, overflow: "hidden", touchAction: "pan-y" }}
    >
      <div style={{ position: "absolute", left: `${(P_TEXT_X / PW) * 100}%`, top: `${(P_TEXT_Y / PH) * 100}%`, right: "12%" }}>
        <p
          style={{
            fontFamily: JULIUS,
            textTransform: "uppercase",
            letterSpacing: TRACK,
            fontSize: `${JULIUS_MIN}px`,
            lineHeight: 1,
            color: "#888",
            margin: 0,
          }}
        >
          Selected
        </p>
        <p
          style={{
            fontFamily: TEXT_FONT,
            fontWeight: 400,
            fontSize: `${TEXT_MIN}px`,
            lineHeight: 1.5,
            letterSpacing: TEXT_TRACK,
            color: "#888",
            margin: "14px 0 0",
          }}
        >
          A curated selection across Mind, Body and Space.
        </p>
      </div>

      {/* The strip: both cards side by side, moved so the active one stands in
          the middle. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${(P_OFFSET[active] / PW) * 100}%)`,
          transition: "transform 0.75s cubic-bezier(.45,.05,.2,1)",
        }}
      >
        {PRODUCTS.map((p, i) => (
          <Link
            key={i}
            href={p.href}
            className="selected-card"
            aria-current={i === active ? "true" : undefined}
            onClick={(e) => {
              // A swipe that ends on a card is not a tap; a tap on the card
              // that peeks brings it to the middle instead of opening it.
              if (swiped.current || i !== active) {
                e.preventDefault()
                swiped.current = false
                setActive(i)
              }
            }}
            style={{
              position: "absolute",
              left: `${(P_START[i] / PW) * 100}%`,
              top: `${(P_CARDS[i].y / PH) * 100}%`,
              width: `${(P_CARDS[i].w / PW) * 100}%`,
              height: `${(P_CARDS[i].h / PH) * 100}%`,
              overflow: "hidden",
              display: "block",
              background: "#202020",
            }}
          >
            <Image src={p.src} alt={p.alt} fill sizes="90vw" style={{ objectFit: "cover", objectPosition: "center" }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function SelectedSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState(0)
  const cardsRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)

  // The phone's white veil (`P_OUT_*`).
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = cardsRef.current
      const v = veilRef.current
      if (!el || !v || !el.getClientRects().length) return
      const vh = window.innerHeight
      const foot = el.getBoundingClientRect().bottom
      const t = (P_OUT_FROM * vh - foot) / ((P_OUT_FROM - P_OUT_TO) * vh)
      const u = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
      v.style.opacity = String(u * u * u * (u * (u * 6 - 15) + 10))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    update()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

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
    <section className="sel-sec" style={{ position: "relative", width: "100%", background: "#202020" }}>
      <div className="sel-phone" style={{ position: "relative" }}>
        {/* a pixel up over Making's dark wood, so the white of Making's section
            never shows as a hairline between the two */}
        {/* over the hand (`zIndex`), whose photograph's white top reaches up under it */}
        <div ref={cardsRef} style={{ position: "relative", zIndex: 1, background: "#202020", marginTop: "-1px", paddingTop: "1px" }}>
          <SelectedPhone />
        </div>
        {/* white before the hand, a pixel over the cards' frame and over the
            hand's white top (`zIndex`); on a phone the section has no dark
            ground of its own (the cards' frame has it), so none can show as
            a hairline where a box ends between two pixels */}
        <div aria-hidden style={{ position: "relative", zIndex: 1, height: `${P_WHITE_PX + 1}px`, marginTop: "-1px", background: "#fff" }} />
        {/* the white veil over all of it, raised by the scroll */}
        <div
          ref={veilRef}
          aria-hidden
          style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0, pointerEvents: "none", zIndex: 2, willChange: "opacity" }}
        />
      </div>
      <div ref={ref} className="sel-desk" style={{ position: "relative", width: "100%", aspectRatio: `${FW} / ${FH}` }}>
        {/* The cards and the words come in together as the section rises; the
            ground stays put, so the dark never flashes. Each card carries the
            ground itself (#202020): while it fades its opacity makes it a group
            of its own, and a `lighten` inside a group sees only what is in the
            group. Without that ground the Chess Set, whose black is darker than
            the page's, came in dark and only took the blend once it was fully
            in (the author's report, 2026-11-05). */}
        {PRODUCTS.map((p, i) => (
          <Link
            key={i}
            href={p.href}
            className="selected-card"
            style={{
              position: "absolute",
              left: pctX(p.x),
              top: pctY(CARD_Y),
              width: pctX(CARD_W),
              height: pctY(CARD_H),
              overflow: "hidden",
              display: "block",
              background: "#202020",
              opacity: fade,
              transition: "opacity 0.15s",
            }}
          >
            <Image src={p.src} alt={p.alt} fill sizes="27vw" style={{ objectFit: "cover", objectPosition: "center" }} />
          </Link>
        ))}

        <div
          style={{
            position: "absolute",
            left: pctX(TEXT_X),
            top: pctY(HEADING_TOP),
            right: 0,
            opacity: fade,
            transform: `translateY(${(1 - fade) * 30}px)`,
            transition: "opacity 0.15s, transform 0.15s",
          }}
        >
          <p
            style={{
              fontFamily: JULIUS,
              textTransform: "uppercase",
              letterSpacing: TRACK,
              fontSize: `clamp(${JULIUS_MIN}px, ${vw(HEADING_PX)}, 32px)`,
              lineHeight: 1,
              color: "#888",
              margin: 0,
            }}
          >
            Selected
          </p>
          <p
            style={{
              fontFamily: TEXT_FONT,
              fontWeight: 400,
              letterSpacing: TEXT_TRACK,
              fontSize: `${TEXT_MIN}px`,
              lineHeight: 1.35,
              color: "#888",
              // from the heading's line box to this one's, as in the frame
              margin: `${vw(LINE_TOP - HEADING_TOP - HEADING_PX)} 0 0`,
            }}
          >
            A curated selection across Mind, Body and Space.
          </p>
        </div>
      </div>

      {/* next/image renders an <img>, so the blend and the hover are set there. */}
      <style>{`
        .selected-card img {
          opacity: ${CARD_OPACITY};
          mix-blend-mode: lighten;
          transition: opacity 0.45s ease;
        }
        .selected-card:hover img { opacity: ${CARD_OPACITY_HOVER}; }
        .sel-phone { display: none; }
        @media (max-width: 767px) {
          .sel-phone { display: block; }
          .sel-sec { background: transparent !important; }
          .sel-desk { display: none; }
        }
      `}</style>
    </section>
  )
}
