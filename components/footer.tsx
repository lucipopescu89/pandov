"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BirdRings } from "@/components/bird-rings"
import { BodyFooter } from "@/components/body-footer"

/** The hand sits a little back, so the ring and the words over it lead. */
const HAND_OPACITY = 0.77

/**
 * White over the hand's lower half, at full strength; the scroll brings it up
 * to it. Solid for the bottom 30% of the image, which is where the lower
 * fingers end, then thinning to nothing at 60%, just short of the ring and
 * the knuckles, so what is left of the hand at the end is the ring on the
 * back of it.
 *
 * It was 90% at the bottom edge and gone by the middle. Over a white hand on
 * a white page that never read as a fade at all: at the height of "Get in
 * touch" it came to under half, and every fingertip still showed through.
 * Solid, rather than 90%, is what lets the fingers go altogether.
 */
const HAND_FADE = "linear-gradient(to top, #fff 0%, #fff 30%, rgba(255,255,255,0) 60%)"

/**
 * The footer's finale, read off the scroll and never holding it up.
 *
 * The hand comes up from below with the page while the Making section above
 * it dissolves (`MakingSection` times that off the hand's box — see
 * FOOTER_STAGE_ID), so by the time the whole hand is on screen it has the
 * screen to itself: Making is gone, and the bird below it has not come in
 * yet. From there to the end of the page is the stretch everything else
 * happens in, and the beats are fractions of it:
 *
 *   clean ─ white rises ─ words
 *                   └─ bird
 *
 * CLEAN_TO: the hand alone, before anything touches it.
 * WHITE_TO: the white over the lower fingers has come up to full strength.
 * TEXT_TO: "Get in touch" has faded in, into white that is already there.
 * BIRD_FROM: the bird starts to come in, as the words do, and is fully there
 * at the end of the page — it is below the hand, and seen any earlier it
 * would share the screen the hand is meant to have alone.
 *
 * The hand was held still in the middle of the screen for a while, with the
 * beats played out while it waited; the page seemed to stop under the hand,
 * and the hold was taken out. Everything now moves with the page.
 *
 * Fractions rather than lengths because the stretch is whatever the page has
 * left, which differs a lot by screen — measured, 460px on a 1026×800 window,
 * 510 at 1280×720, 540 at 1440×900 and at 1920×1080, 470 at 2560×960, and 280
 * on a phone, where the footer is shorter than the screen. A fixed length would
 * outrun the page on the short ones and stop part-way.
 */
const CLEAN_TO = 0.25
const WHITE_TO = 0.62
const TEXT_TO = 0.85
const BIRD_FROM = 0.6

/**
 * The hand's box, for `MakingSection`, which dissolves as it comes up. It
 * reads the box's own position rather than a copy of the numbers here, so the
 * two cannot drift apart.
 */
export const FOOTER_STAGE_ID = "footer-stage"

/**
 * Clamp to 0..1, treating a non-finite value as 0. A progress measured against
 * a viewport that has not been laid out yet — a background tab, a bfcache
 * restore — can come out NaN, and NaN survives Math.max/min.
 */
function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
}

/** Linear 0 → 1 ramp across [from, to], flat outside it. */
function ramp(v: number, from: number, to: number): number {
  if (to <= from) return v >= to ? 1 : 0
  return clamp01((v - from) / (to - from))
}

/**
 * Design canvas the footer was measured on: the page width of the design, from
 * the Making photo's bottom edge down to the bottom menu, 1600 × 1074.
 *
 * Down to the words it scales with the page like a single picture: the hand is
 * a photograph drawn wider than the page, and "Get in touch" hangs under its
 * ring, so both are lengths of the page's width. Below the words it scales only
 * until the page is as wide as the canvas and then holds: the gap, the bird and
 * the white under it stay the size they were drawn at however wide the screen.
 *
 * It all scaled once, and on a very wide screen that made the canvas far taller
 * than the screen — 1708px on a 2560 × 960 window, with a 573px bird — and left
 * the words so far above the end of the page that they were never on screen
 * there: they finished fading in 29px from the top edge and ended the page 86px
 * above it. Held, what lies under the words is never more than the 495px it was
 * drawn at, so at the end of the page the words and the bird stand where they do
 * on a laptop. Up to 1600px wide nothing moved.
 */
const CANVAS_W = 1600
const CANVAS_H = 1074
/** Where the words stand, down the canvas, and where it stops scaling. */
const WORDS_Y = 579

/** A length on the canvas, px at its 1600 width, growing with the page. */
function wide(px: number): string {
  return `${(px / CANVAS_W) * 100}cqw`
}

/** A length below the words: grows with the page up to 1600px, then holds. */
function held(px: number): string {
  return `min(${(px / CANVAS_W) * 100}cqw, ${px}px)`
}

/**
 * The canvas's own height. It can't be given in cqw — those measure the
 * container around an element, and around the canvas there is none — so it is
 * padding, whose percentages are of the width the canvas fills.
 */
const CANVAS_HEIGHT = `calc(${(WORDS_Y / CANVAS_W) * 100}% + min(${((CANVAS_H - WORDS_Y) / CANVAS_W) * 100}%, ${CANVAS_H - WORDS_Y}px))`

/** The banner image's own size. */
const HAND_W = 2792
const HAND_H = 1230

export function Footer() {
  const handRef = useRef<HTMLDivElement>(null)
  const [white, setWhite] = useState(0)
  const [ctaIn, setCtaIn] = useState(0)
  const [birdIn, setBirdIn] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const hand = handRef.current
      if (!hand) return
      const vh = window.innerHeight
      const y = window.scrollY
      // From the whole hand on screen — its box's foot at the bottom of the
      // screen — to the end of the page.
      const whole = y + hand.getBoundingClientRect().bottom - vh
      const pageEnd = document.documentElement.scrollHeight - vh
      const p = ramp(y, whole, pageEnd)
      setWhite(ramp(p, CLEAN_TO, WHITE_TO))
      setCtaIn(ramp(p, WHITE_TO, TEXT_TO))
      setBirdIn(ramp(p, BIRD_FROM, 1))
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
          below the ring, then the bird in its rings. A container, so what is
          on it can be placed in lengths of its width. */}
      <div
        className="relative w-full overflow-hidden"
        style={{ containerType: "inline-size", paddingBottom: CANVAS_HEIGHT }}
      >
        {/* The white sculptural hand (Figma "Rectangle 2"), mirrored so the
            fingers point right. The image carries empty white space past the
            fingertips, so it is set wider than the page and right of centre to
            centre the hand itself; only that white margin is cropped. */}
        <div
          ref={handRef}
          id={FOOTER_STAGE_ID}
          style={{
            position: "absolute",
            left: wide(22),
            top: wide(-2),
            width: wide(1720),
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
          <div className="pointer-events-none absolute inset-0" style={{ background: HAND_FADE, opacity: white }} />
        </div>

        {/* Call to action, centred on the page below the ring. The padding only
            enlarges the tap target, which the small type would otherwise make
            hard to hit on a phone.

            The scroll's fade is on the words inside, not on the link, because
            the link's own opacity is its hover state and an inline one would
            override it. And the link is not clickable until the words have
            begun to show: an invisible link still takes a click, which is how
            For Mind came to be reached from the empty ground of the hero. */}
        <Link
          href="/contact"
          className="transition-opacity hover:opacity-50"
          style={{
            pointerEvents: ctaIn > 0 ? "auto" : "none",
            position: "absolute",
            left: "50%",
            top: wide(WORDS_Y),
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
          <span style={{ opacity: ctaIn }}>&rarr; Get in touch</span>
        </Link>

        {/* The bird in its rings, a way to Contact like the words above it. It
            was left decorative at first, GET IN TOUCH and the menu already
            leading there; the author asked for the bird to lead there too.

            It keeps the words' two rules: the scroll's fade is on the mark
            inside and the hover on the link, so neither overrides the other,
            and it takes no click until it has begun to show.

            Round, because the mark is. The link's own box is what takes the
            click, rounded, and the rings and the bird inside take none; left
            to them, the square each ring is drawn in would make the empty
            white in the corners a link to Contact. */}
        <Link
          href="/contact"
          aria-label="Get in touch"
          className="transition-opacity hover:opacity-50"
          style={{
            pointerEvents: birdIn > 0 ? "auto" : "none",
            position: "absolute",
            left: "50%",
            // Hung from the words by a held length, so the two stay a pair.
            top: `calc(${wide(WORDS_Y)} + ${held(862 - WORDS_Y)})`,
            width: held(360),
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
          }}
        >
          <BirdRings size="100%" style={{ opacity: birdIn, pointerEvents: "none" }} />
        </Link>
      </div>

      {/* Bottom menu — the shared `BodyFooter`, exactly as every other page
          renders it: same logo, same type, same spacing, all its own. */}
      <BodyFooter activeLabel={null} />
    </footer>
  )
}
