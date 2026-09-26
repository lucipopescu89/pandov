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
 * to it. Solid for the bottom 30% of the hand's box, which is where the lower
 * fingers end, then thinning to nothing at 60%, just short of the ring and
 * the knuckles.
 *
 * It was 90% at the bottom edge and gone by the middle. Over a white hand on
 * a white page that never read as a fade at all: at the height of "Get in
 * touch" it came to under half, and every fingertip still showed through.
 * Solid, rather than 90%, is what lets the fingers go altogether.
 *
 * It belongs to the page, not to the photograph. It is laid on the hand's box,
 * which moves with the page, while the photograph under it settles (see the
 * finale below), so as the hand slows the white goes on rising at the page's
 * speed and the hand sinks into it from the fingertips up. "Get in touch" hangs
 * in its solid part, and so stands on clean white wherever the hand has got to.
 * That is also why it runs on below the box, solid, to VEIL_H box heights in
 * all: on a phone the photograph settles by more than its own height — 212px,
 * against 185, on a 390px screen — and would come out from under a white that
 * ended with the box.
 */
const VEIL_H = 2.5
const HAND_FADE = `linear-gradient(to bottom, rgba(255,255,255,0) ${40 / VEIL_H}%, #fff ${70 / VEIL_H}%)`

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
 *       clean ─ white rises ─ words ─ bird
 *   ├── the hand slows ───────────────────┤ at rest
 *            └── and fades into white ───┤ gone
 *
 * CLEAN_TO: the hand alone, before anything touches it.
 * WHITE_TO: the white over the lower fingers has come up to full strength.
 * TEXT_TO: "Get in touch" has faded in, into white that is already there.
 * BIRD_FROM: the bird starts to come in, once the words are fully there, and
 * is fully there at the end of the page — it is below the hand, and seen any
 * earlier it would share the screen the hand is meant to have alone.
 *
 * The words and the bird came in together at first (from 0.62 and 0.6); on
 * 2026-09-23 the author asked for the words to come first. The white was
 * brought forward to make room for them (0.62 → 0.5), so they still fade into
 * white that is already there, and the bird waits for them to finish.
 *
 * Under those beats the photograph settles: it leaves the page's speed a
 * little before the whole hand is on screen (SETTLE_FROM) and slows until, at
 * the end of the page, it stands still (see `settle`). From CLEAN_TO it
 * also fades into the white, and it is gone as it comes to rest, so the page
 * ends on the words and the bird with no hand left to stop. Both ease out to
 * nothing rather than running on into the end of the page, which is a hard
 * stop: anything still moving there would be cut off by it, and the author
 * asked for the page to finish gently.
 *
 * The hand was held still in the middle of the screen for a while, with the
 * beats played out while it waited; the page seemed to stop under the hand,
 * and the hold was taken out. Settling is not that. The hand never stands
 * still while the page moves — it comes to rest only as the page ends, and by
 * then it is gone — and everything else, the words, the bird, the menu, moves
 * with the page throughout.
 *
 * Fractions rather than lengths because the stretch is whatever the page has
 * left, which differs a lot by screen — measured, 460px on a 1026×800 window,
 * 510 at 1280×720, 540 at 1440×900 and at 1920×1080, 470 at 2560×960, and 280
 * on a phone, where the footer is shorter than the screen. A fixed length would
 * outrun the page on the short ones and stop part-way.
 */
const CLEAN_TO = 0.25
const WHITE_TO = 0.5
const TEXT_TO = 0.72
const BIRD_FROM = 0.72

/**
 * Where the settling begins: half the stretch before the whole hand is on
 * screen, while the last of it is still coming up. It began exactly as the hand
 * came on screen whole at first; the author asked for it a little sooner, and
 * then a little sooner again, a quarter of the stretch each time. By the time
 * the hand has the screen to itself it is already slowing — at three quarters
 * of the page's speed — rather than only starting to once it has.
 */
const SETTLE_FROM = -0.5

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

/** 0 → 1 across 0..1, leaving and arriving with no speed. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * How far the photograph has fallen behind the page at u through its settling
 * — from SETTLE_FROM to the end of the page — as a share of that span. It is
 * the integral of `smooth`, so the hand's own speed on screen, 1 − smooth(u),
 * is the page's as the span begins and nothing at its end, and it changes
 * without a jolt at either: the handover from moving with the page is exact,
 * and so is the arrival. By the end it is half the span behind, having covered
 * half the ground the page has.
 *
 * It starts a little before the whole hand is on screen, not as the hand first
 * appears. Slowing from the bottom edge up, it would on most screens never be
 * on screen whole at all — at 1440 × 900 it would still be 70px short at the
 * end. Begun half the stretch early, it is 25px behind when its box comes on
 * screen whole at 1440 × 900, and 13px on a phone: less, both times, than the
 * empty white under the fingertips, so the whole hand is on screen as before.
 * SETTLE_FROM has to stay above −1 for that, and well above it.
 */
function settle(u: number): number {
  return u * u * u * (1 - u / 2)
}

/**
 * The photograph at scroll position y: how far it has settled behind the page,
 * and how much of it is left, with `whole` and `pageEnd` the scroll positions
 * the finale runs between.
 */
function photoAt(y: number, whole: number, pageEnd: number, span: number): { transform: string; opacity: string } {
  const behind = span * settle(ramp(y, pageEnd - span, pageEnd))
  const left = 1 - smooth(ramp(ramp(y, whole, pageEnd), CLEAN_TO, 1))
  return { transform: `translate3d(0, ${behind.toFixed(2)}px, 0)`, opacity: (HAND_OPACITY * left).toFixed(3) }
}

/**
 * The browser's own scroll-linked timeline, where it has one: an animation on
 * it is played by the scroll position itself, on the same step that moves the
 * page, rather than by a script told about the scroll afterwards. Not yet in
 * TypeScript's DOM types, hence the shape given here.
 */
type ScrollTimelineConstructor = new (options: { source: Element | null }) => AnimationTimeline

/**
 * Straight steps the settling is drawn in, across its span, when the browser
 * plays it. Thirty-two keep the photograph within a sixth of a pixel of the
 * curve on the longest span measured, 812px at 1440 × 900.
 */
const SETTLE_STEPS = 32

/**
 * The settling and the fade as keyframes over the whole scroll of the page, 0
 * at the top and 1 at the end: flat until the span begins, then SETTLE_STEPS
 * samples of `photoAt` across it.
 */
function settlingKeyframes(whole: number, pageEnd: number, span: number): Keyframe[] {
  // Sampled from the settling or the finale, whichever begins first. The fade
  // runs through the whole finale, and a span that starts later than it — a
  // phone's can be a sixth as long — would leave the fade unsampled, drawn as
  // one straight line from the top of the page: the hand at a quarter of its
  // strength before it had even come on screen.
  const from = Math.max(0, Math.min(pageEnd - span, whole))
  const frames: Keyframe[] = [{ offset: 0, ...photoAt(0, whole, pageEnd, span) }]
  for (let i = 0; i <= SETTLE_STEPS; i++) {
    const y = from + ((pageEnd - from) * i) / SETTLE_STEPS
    frames.push({ offset: Math.min(1, y / pageEnd), ...photoAt(y, whole, pageEnd, span) })
  }
  return frames
}

/**
 * On a phone the hand rises further before it settles, the author's asking on
 * 2026-09-26: the screen is tall, and a hand that came to rest half-way up it
 * left the top empty. It moves with the page until nearly the end and comes to
 * rest with its ring `PHONE_REST` px under the top of the screen, fading as it
 * goes.
 *
 * The lag it ends with is how far short of that the page alone would carry
 * it. `settle` covers half its span, so the span is twice the lag. Where the
 * page alone would not carry the ring that high, the span is nothing, and the
 * hand simply moves with the page.
 */
const PHONE_REST = 70

/**
 * The span the photograph settles over, in px of scroll up to the end of the
 * page. `hand` is its box as it stands at scroll position y.
 */
function settlingSpan(hand: DOMRect, y: number, whole: number, pageEnd: number, phone: boolean): number {
  if (!phone) return Math.max(0, pageEnd - whole) * (1 - SETTLE_FROM)
  const ringAtEnd = hand.top - (pageEnd - y) + RING_TOP * hand.height
  return 2 * Math.max(0, PHONE_REST - ringAtEnd)
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

/**
 * A phone has its own composition, the author's sketch of 2026-09-26. Drawn
 * like the computer's, the hand was 185px high, the words 9px and the bird in
 * its rings 88px across, a button at the foot of the screen. In the sketch the
 * three fill it:
 *
 * - The hand is `PHONE_HAND_W` of the page wide, three times the computer's
 *   share, with its ring `PHONE_RING_AT` across the page and `PHONE_RING_TOP`
 *   under the top of the canvas. `RING_X` and `RING_TOP` are where the ring
 *   sits in the photograph, mirrored as it is drawn, read off its gold pixels.
 * - The words are 12px, the menus' size, at `PHONE_WORDS_Y`.
 * - The rings are `PHONE_BIRD_W` of the page across, with the bird centred
 *   `PHONE_BIRD_Y` down.
 *
 * All in hundredths of the page's width, since cqw is what they are drawn in.
 * The canvas ends at the foot of the rings.
 *
 * The finale is the computer's. For an afternoon the hand stayed on a phone,
 * because the sketch ends on hand, words and bird together. The author asked
 * for it to settle into the white and fade as it does on a computer. The
 * sketch is the page just before the hand has gone.
 */
const PHONE = "(max-width: 767.98px)"
const RING_X = 0.4155
const RING_TOP = 0.222
const PHONE_HAND_W = 300
const PHONE_RING_AT = 45
const PHONE_RING_TOP = 12
const PHONE_WORDS_Y = 92
const PHONE_BIRD_W = 74
const PHONE_BIRD_Y = PHONE_WORDS_Y + 40
const PHONE_HAND_H = (PHONE_HAND_W * HAND_H) / HAND_W

/**
 * Where everything stands, on a computer and then on a phone. In a stylesheet
 * rather than inline, because a media query can only live there. The hand's
 * photograph is not in it: its transform and opacity are the finale's own.
 */
const LAYOUT = `
.ft-canvas { padding-bottom: ${CANVAS_HEIGHT}; }
.ft-hand { left: ${wide(22)}; top: ${wide(-2)}; width: ${wide(1720)}; }
.ft-words { top: ${wide(WORDS_Y)}; font-size: clamp(9px, 0.75vw, 12px); }
.ft-bird { top: calc(${wide(WORDS_Y)} + ${held(862 - WORDS_Y)}); width: ${held(360)}; }
@media ${PHONE} {
  .ft-canvas { padding-bottom: ${PHONE_BIRD_Y + PHONE_BIRD_W / 2}%; }
  .ft-hand {
    left: ${+(PHONE_RING_AT - RING_X * PHONE_HAND_W).toFixed(3)}cqw;
    top: ${+(PHONE_RING_TOP - RING_TOP * PHONE_HAND_H).toFixed(3)}cqw;
    width: ${PHONE_HAND_W}cqw;
  }
  .ft-words { top: ${PHONE_WORDS_Y}cqw; font-size: 12px; }
  .ft-bird { top: ${PHONE_BIRD_Y}cqw; width: ${PHONE_BIRD_W}cqw; }
}
`

export function Footer() {
  const handRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const [white, setWhite] = useState(0)
  const [ctaIn, setCtaIn] = useState(0)
  const [birdIn, setBirdIn] = useState(0)

  useEffect(() => {
    const Timeline = (window as unknown as { ScrollTimeline?: ScrollTimelineConstructor }).ScrollTimeline
    let settling: Animation | null = null
    let builtFor = { whole: NaN, pageEnd: NaN, span: NaN }

    const onScroll = () => {
      const hand = handRef.current
      if (!hand) return
      const vh = window.innerHeight
      const y = window.scrollY
      // From the whole hand on screen — its box's foot at the bottom of the
      // screen — to the end of the page. The box, not the photograph: the box
      // never moves off the page, so this is not thrown by the settling below.
      const box = hand.getBoundingClientRect()
      const whole = y + box.bottom - vh
      const pageEnd = document.documentElement.scrollHeight - vh
      const span = settlingSpan(box, y, whole, pageEnd, window.matchMedia(PHONE).matches)
      const p = ramp(y, whole, pageEnd)
      setWhite(ramp(p, CLEAN_TO, WHITE_TO))
      setCtaIn(ramp(p, WHITE_TO, TEXT_TO))
      setBirdIn(ramp(p, BIRD_FROM, 1))

      // The photograph is handed to the browser as an animation on the scroll
      // itself, and only rebuilt when the page's measurements change. It was
      // written from here on every scroll event at first, and every turn of
      // the wheel it jumped up and dropped back: the page moves the moment the
      // wheel turns, and the script only hears of it afterwards, so for a frame
      // the photograph went up with the page by as much as it should have been
      // held back — 44px a notch as it began to slow, 91 near the end, measured
      // in Chrome. Played by the scroll, it is placed on the same step the page
      // moves on. The fades above only change strength, which a frame late
      // does not show. Nothing may set the photograph's transform or opacity
      // with !important: Chrome then plays the animation a frame late again.
      //
      // Where there is no such timeline — Safari before 26, which takes in the
      // iPhones that cannot update to it — it is still written from here, and
      // the jump is the price of the settling there.
      const photo = photoRef.current
      if (!photo) return
      if (!Timeline) {
        Object.assign(photo.style, photoAt(y, whole, pageEnd, span))
        return
      }
      if (pageEnd <= 0) return
      if (
        Math.abs(whole - builtFor.whole) < 0.5 &&
        Math.abs(pageEnd - builtFor.pageEnd) < 0.5 &&
        Math.abs(span - builtFor.span) < 0.5
      )
        return
      builtFor = { whole, pageEnd, span }
      const frames = settlingKeyframes(whole, pageEnd, span)
      // Rebuilt in place: cancelling one animation and starting another would
      // leave a frame with neither, and the photograph unsettled, between them.
      if (settling?.effect instanceof KeyframeEffect) settling.effect.setKeyframes(frames)
      else settling = photo.animate(frames, { timeline: new Timeline({ source: document.documentElement }), fill: "both" })
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
      settling?.cancel()
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
      <style>{LAYOUT}</style>
      <div className="ft-canvas relative w-full overflow-hidden" style={{ containerType: "inline-size" }}>
        {/* The white sculptural hand (Figma "Rectangle 2"), mirrored so the
            fingers point right. The image carries empty white space past the
            fingertips, so it is set wider than the page and right of centre to
            centre the hand itself; only that white margin is cropped.

            The box stays where the page puts it, and is what the finale and
            Making measure; the photograph inside it is what settles and fades,
            on a layer of its own so that it is drawn once and then only moved.
            The white is laid over it on the box, which is what lets the hand
            sink into it (see HAND_FADE). */}
        <div
          ref={handRef}
          id={FOOTER_STAGE_ID}
          className="ft-hand"
          style={{ position: "absolute", aspectRatio: `${HAND_W} / ${HAND_H}` }}
        >
          <div
            ref={photoRef}
            style={{ position: "absolute", inset: 0, opacity: HAND_OPACITY, willChange: "transform, opacity" }}
          >
            <Image
              src="/images/home/footer-banner.png"
              alt="White sculptural hand wearing the Pandov golden ring"
              fill
              sizes={`${PHONE} ${PHONE_HAND_W}vw, 108vw`}
              style={{ objectFit: "contain", transform: "scaleX(-1)" }}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: `${VEIL_H * 100}%`, background: HAND_FADE, opacity: white }}
          />
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
          className="ft-words transition-opacity hover:opacity-50"
          style={{
            pointerEvents: ctaIn > 0 ? "auto" : "none",
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "12px 16px",
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
          className="ft-bird transition-opacity hover:opacity-50"
          style={{
            pointerEvents: birdIn > 0 ? "auto" : "none",
            position: "absolute",
            left: "50%",
            // Hung from the words by a held length, so the two stay a pair
            // (`LAYOUT`).
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
