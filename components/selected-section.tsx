"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { JULIUS, JULIUS_MIN, TEXT_FONT, TEXT_MIN, TEXT_TRACK, TRACK, TRACK_BACK } from "@/lib/type"

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

/**
 * 2026-11-21, the author's asking: the words go above the cards, and Satori
 * joins Emperor and the Chess Set, three cards where there were two. The
 * Chess Set stands in the middle, a pendant either side (Satori 4's render,
 * on the same #202020 ground, until the author's retouched photograph). The
 * three are the frame's cards at the frame's size and the frame's gap
 * (`CARD_GAP`, 70), the row centred on the page (`GALLERY_X`).
 *
 * On a computer the words are Making's mirror image about the page's centre
 * line (the author's asking, the same morning): Making's words are ranged
 * left on a line `MAKING_TEXT_X` into Making's composition, so these are
 * ranged right on a line as far right of the centre (`MIRROR_RIGHT`).
 * Making's composition is the page's width only up to 16:9 of the screen's
 * height (`BOX_W` in `making-section.tsx`), so the distance is worked out from
 * the same box and the two stay mirrored on any screen. The letters, not
 * their boxes, end on the line: the tracking after the last letter is handed
 * back (`TRACK_BACK`, and the line's own `TEXT_TRACK`). On the phone they are
 * centred, as Making's are there.
 *
 * Before that, the same morning, they were ranged left on the first card's
 * edge, then centred over the gallery.
 *
 * Vertically, the heading's cap top is where the cards' tops were (168), so
 * the dark from Making down to the first thing in Selected is unchanged, and
 * the cards come `CARD_Y` down, under the line; the frame is that much taller
 * (`FH`, 928 before), with the same 192 units of dark under the cards. Until
 * that day the words stood at the right of the two cards, at x 1332.
 */
/** The frame, in its own units. */
const FW = 1893
const pctX = (x: number) => `${(x / FW) * 100}%`
const pctY = (y: number) => `${(y / FH) * 100}%`
/** Type follows the frame's width; `px` is the size at 1893. */
const vw = (px: number) => `${(px / FW) * 100}vw`

/**
 * 2026-11-22, the author's asking: four cards. Mother Nature joins (the author's
 * photograph, worn), Satori's render gives way to the author's photograph of
 * Satori IV on its drawing ("emperor.png" in `8_Selected`), and Emperor and
 * Satori lose the top light of the black paper they were photographed on: it
 * went from lighter than the page at the top to darker at the foot, so the
 * card showed as a panel at the top that faded out at the bottom
 * (`selected-emperor-2.avif`; the paper made one level, under the page's, with
 * the piece and the lines as they were). The pendants open their own pages,
 * not their collections'.
 *
 * The four stand in the row the three stood in (`ROW_W`, the same 120 units
 * from either edge, the same `CARD_GAP`), so each is smaller, at the same
 * proportion; the frame is shorter by as much, the 192 units of dark under the
 * cards kept (`FH`).
 */
const CARD_Y = 340
const CARD_GAP = 70
const ROW_W = 3 * 504 + 2 * CARD_GAP
const PRODUCTS = [
  { src: "/images/home/selected-emperor-2.avif", alt: "Emperor of Nothingness, a Second Wind pendant", href: "/body/second-wind/emperor" },
  { src: "/images/home/selected-chess-set.avif", alt: "The Chess Set", href: "/mind/chess-set" },
  { src: "/images/home/selected-satori.avif", alt: "Satori IV, a pendant, on its drawing", href: "/body/satori/satori-4" },
  { src: "/images/home/selected-mother-nature.avif", alt: "Mother Nature, a Second Wind pendant, worn", href: "/body/second-wind/mother-nature" },
]
const CARD_W = (ROW_W - (PRODUCTS.length - 1) * CARD_GAP) / PRODUCTS.length
const CARD_H = (CARD_W * 568) / 504
const FH = CARD_Y + CARD_H + 192
const GALLERY_W = PRODUCTS.length * CARD_W + (PRODUCTS.length - 1) * CARD_GAP
const GALLERY_X = (FW - GALLERY_W) / 2
const cardX = (i: number) => GALLERY_X + i * (CARD_W + CARD_GAP)

/**
 * The words. Julius 29.9 and Assistant 15 at 1893, measured off the export's
 * outlined text (cap tops 81 apart: 297.2 and 378.2 in the frame). A line
 * box's top is set above the cap top by the face's own room: 0.085em for
 * Julius at line-height 1, 0.31em for Assistant at 1.35.
 */
/** Making's words' left edge in Making's frame (`TEXT_X` in `making-section.tsx`, 1893 wide). */
const MAKING_TEXT_X = 582.6
/** Making's composition's width (`BOX_W` there): the page's, up to 16:9 of the screen's height. */
const MAKING_BOX_W = `min(100%, ${+((16 / 9) * 100).toFixed(3)}vh)`
/** From the page's right edge to the mirror of Making's line. */
const MIRROR_RIGHT = `calc(50% - ${+((FW / 2 - MAKING_TEXT_X) / FW).toFixed(5)} * ${MAKING_BOX_W})`
const HEADING_PX = 29.9
const HEADING_CAP = 168
const HEADING_TOP = HEADING_CAP - 0.085 * HEADING_PX
const LINE_PX = 15
const LINE_TOP = HEADING_CAP + 81 - 0.31 * LINE_PX

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
/*
 * Satori (2026-11-21) is a third card at Emperor's size, after the Chess Set.
 * Every card but the last, in front, stands `P_BLEED` off the left edge, as
 * Emperor did, with the next one peeking in at the right; the last stands
 * `P_BLEED` off the right edge with the one before peeking in at the left, as
 * the Chess Set did. (Centred, the Chess Set left none of its neighbours
 * showing: the phone's frame is only its width and two gaps wide.) A swipe
 * moves one card along.
 */
const P_CARDS = [
  { w: 843, h: 1036, y: 411 },
  { w: 891, h: 1005, y: 383 },
  { w: 843, h: 1036, y: 411 },
  // Mother Nature (2026-11-22), at Emperor's size.
  { w: 843, h: 1036, y: 411 },
]
const P_GAP = 41
const P_BLEED = 69
const P_TEXT_X = 61
const P_TEXT_Y = 79
/** Where each card starts on the strip, and the strip's offset with each in the middle. */
const P_START = P_CARDS.map((_, i) => P_CARDS.slice(0, i).reduce((s, c) => s + c.w + P_GAP, 0))
const P_LAST = P_CARDS.length - 1
const P_OFFSET = P_CARDS.map((c, i) =>
  i === P_LAST ? PW - c.w + P_BLEED - P_START[i] : -P_BLEED - P_START[i],
)
/** A sideways drag at least this long (px) is a swipe. */
const SWIPE_PX = 40

/**
 * (Until 2026-11-21, when the homepage footer went dark and lost its hand, the
 * author's asking, the white fade below led into that footer's white; it went
 * with it, and on a phone Selected runs straight on into the dark footer.)
 *
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

/**
 * Selected higher on a computer (2026-11-22, the author's asking: 50px as a
 * first try, "I can't always judge the distance yet", then 50 more the same
 * morning, 100 in all). The frame keeps all its places; it is drawn
 * `LIFT_PX` higher inside a box that cuts off that much of the plain dark at
 * its top (`.sel-lift`), so the words and the cards come that much nearer
 * Making's dark wood without covering any of it, and everything under
 * Selected comes up as much. The fade is read off the frame, so it keeps its
 * time to the words and the cards.
 *
 * The dark above the heading is a share of the width (`HEADING_TOP`: about
 * 126px at 1440 wide, 112 at 1280, 90 at 1024), so 100px would cut the
 * heading off in a window under about 1420px wide. The lift stops
 * `MIN_ROOM_PX` short of it there (a CSS `min`; a margin's % is of the width,
 * as the frame's units are): the full 100px from about 1420 wide, some 88 at
 * 1280, 66 at 1024.
 * The phone is as it was: its words stand only some 30px under Making.
 */
const LIFT_PX = 100
const MIN_ROOM_PX = 24
const LIFT = `min(${LIFT_PX}px, ${+((HEADING_TOP / FW) * 100).toFixed(4)}% - ${MIN_ROOM_PX}px)`

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
    setActive((a) => (dx < 0 ? Math.min(a + 1, P_LAST) : Math.max(a - 1, 0)))
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: "relative", width: "100%", aspectRatio: `${PW} / ${PH}`, overflow: "hidden", touchAction: "pan-y" }}
    >
      {/* Centred, as Making's words on the phone (2026-11-21; it stood at
          the left, `P_TEXT_X` in). */}
      <div style={{ position: "absolute", left: `${(P_TEXT_X / PW) * 100}%`, right: `${(P_TEXT_X / PW) * 100}%`, top: `${(P_TEXT_Y / PH) * 100}%`, textAlign: "center" }}>
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
            prefetch={false}
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
        <div style={{ position: "relative", background: "#202020", marginTop: "-1px", paddingTop: "1px" }}>
          <SelectedPhone />
        </div>
      </div>
      {/* LIFT_PX: the frame drawn higher, the top of its dark cut off. */}
      <div className="sel-lift" style={{ overflow: "hidden" }}>
      <div ref={ref} className="sel-desk" style={{ position: "relative", width: "100%", aspectRatio: `${FW} / ${FH}`, marginTop: `calc(-1 * ${LIFT})` }}>
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
            prefetch={false}
            className="selected-card"
            style={{
              position: "absolute",
              left: pctX(cardX(i)),
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
            <Image src={p.src} alt={p.alt} fill sizes="20vw" style={{ objectFit: "cover", objectPosition: "center" }} />
          </Link>
        ))}

        <div
          style={{
            position: "absolute",
            left: 0,
            top: pctY(HEADING_TOP),
            right: MIRROR_RIGHT,
            textAlign: "right",
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
              margin: `0 ${TRACK_BACK} 0 0`,
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
              margin: `${vw(LINE_TOP - HEADING_TOP - HEADING_PX)} -${TEXT_TRACK} 0 0`,
            }}
          >
            A curated selection across Mind, Body and Space.
          </p>
        </div>
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
          .sel-desk { display: none; }
        }
      `}</style>
    </section>
  )
}
