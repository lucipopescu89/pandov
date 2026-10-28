"use client"

import { useEffect, useRef, useState } from "react"
import { preload } from "react-dom"
import Image from "next/image"
import { RadiantRings } from "@/components/radiant-rings"
import { MIND_BEAT_S, MIND_WASH_S } from "@/components/categories-section"
import { NUDGE_PX, TO_TOP_EVENT, heroUp, hurry, playBeat, rewind } from "@/lib/played-beat"

/**
 * The door animation, the author's render of 2026-09-29: 38 frames of motion
 * and an empty one to end on. They are made from the render with
 * `scripts/hero-doors.mjs`, which lays them over #202020 so they meet the
 * header band seamlessly and says why each is encoded as it is: the first, the
 * one seen standing still, as JPEG at the old frames' quality, the rest as
 * AVIF.
 *
 * The render has twice the old twenty frames, but it spends most of the extra
 * on the handles turning before the doors move (0 → 18). The doors' opening
 * (19 → 38) has five more frames than it had, and its last steps, where the
 * doors leave the picture, are about as far apart as they were.
 */
const FRAME_COUNT = 39
const FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/frames/doors/door-${String(i).padStart(2, "0")}.${i === 0 ? "jpg" : "avif"}`,
)

/**
 * How many pixels of decoded frames the page will hold: 64 million, 256MB.
 * Decoded, a frame is its whole size in memory whatever its file weighs, and
 * 39 of them cut to a 1440 × 900 screen come to 212MB, on a phone 152MB; on a
 * 1920 × 1080 screen 340MB, on a 2× laptop 520MB. Under the budget nothing
 * changes; past it the frames in motion are decoded smaller and enlarged as
 * they are drawn: at 0.87 of their size at 1920 × 1080, at 0.69 of the file's
 * on a 2× laptop, which a frame seen for 40ms does not show. The first frame
 * is always kept whole.
 */
const BITMAP_BUDGET_PX = 64e6

/**
 * Clamp to 0..1, treating a non-finite value as 0. `scrolled / total` yields
 * NaN when the container and the viewport measure the same (a page that
 * initialises without a laid-out viewport — background tab, bfcache restore,
 * prerender). Math.max/min propagate NaN rather than clamping it, and every
 * `<` comparison against NaN is false, so an unguarded NaN falls through the
 * opacity ternaries below to their final branch and reveals overlays that
 * should still be hidden.
 */
function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
}

// easeInOutCubic
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * The doors are played, not scrolled (2026-09-29, the author's asking).
 *
 * They start on the first scroll past the pin and open at their own pace,
 * DOORS_S from the first frame to the last, whatever the hand does next.
 * Scrolled back to the pin, they close the same way. For an afternoon the
 * first turn of the wheel set them going, while the section was still rising
 * into place; the author asked for them to wait for it. Then, from 2026-09-29,
 * they started as the section pinned, and a hand still turning the wheel to
 * get there found them already opening. Since 2026-10-02 the page comes to
 * rest at the pin first (`holdScroll`), and they wait for the next scroll.
 *
 * Until then the frames were tied to the scroll, and it read as stuttering:
 *   - the curve the section scrolls along starts flat, so the first frame came
 *     only after some 46 vh of scrolling, and the section only begins to be
 *     scrolled once the menu and the band under it have gone by. It took five
 *     or six turns of the wheel before anything moved;
 *   - after that a turn of the wheel is about 100px and the frames were 3 to
 *     4 vh apart, so every turn jumped three or four frames at once and then
 *     stood still until the next one.
 *
 * Nothing hurries them (2026-10-02, the author's asking): they open at the
 * same pace however much, or however fast, the page is scrolled. Until then a
 * scroll that outran them dragged them along, so they were always open by the
 * end of the 40 vh of scrolling they had after the pin (DOORS_ROOM_VH, gone
 * with it), and a quick turn of the wheel threw them open in a
 * fraction of their time. Now the page is held while they open instead (see
 * `holdScroll`), so a hand cannot carry it on to text 1's fade before they
 * have finished. Between two frames the next is faded in over the last (see
 * `paint`), so the frames read as a movement rather than as pictures.
 *
 * 1.6s for the render of 2026-09-29, about 24 frames a second. Its doors open
 * (19 → 38) in 0.8s of it, as fast as the old twenty frames opened them in
 * their 1.2s, and the handles have the 0.8s before to turn in.
 */
const DOORS_S = 1.6
/**
 * How long the page waits at the doors for frames still loading, ms, before it
 * lets the reader on without them. Measured from the scroll that asks them to
 * open.
 */
const DOORS_WAIT_MS = 3500

/**
 * The section is a few pictures, and the scroll moves from one to the next:
 *
 *   doors shut ─(doors)→ text 1 lit ─(presence)→ the composition ─(mind)→ For Mind
 *
 * Each arrow is played at its own pace, and the page is held while it plays
 * (`holdScroll`, `lib/played-beat.ts`). The last is For Mind's: the wash to
 * white is its first second, played here, and For Mind's rise out of the white
 * the rest, played by its row in `components/categories-section.tsx`. Each
 * beat stands at a place on the page, in px of real scrolling past the pin: on
 * past it, off before it. A scroll down nudges the page just past the next one
 * (NUDGE_PX), so the beats come one to a scroll however much the hand scrolls,
 * and a scroll back up past one plays it backwards.
 *
 * The doors stand at the pin itself (PAST_PIN_PX). Presence stands
 * PRESENCE_AT_VH further on, about a turn of the wheel on a 900px screen, and
 * For Mind MIND_GAP_VH past Presence's resting place. The page between them
 * shows nothing that moves with it, so the nudge across a gap is never seen.
 * The gaps are there for the way back: each turn of the wheel up plays one
 * beat backwards.
 *
 * For Mind's resting place is where the pin lets go, and where For Mind's row
 * stands exactly on the screen. The scroll after it carries both on with the
 * page.
 *
 * Until 2026-10-02 everything from text 1's fade to For Mind in its place was
 * tied to the scroll: an eased curve of some 73 vh to Presence's line, 36
 * more to white, and 58 of For Mind's own pin. The author asked for each to
 * come on one scroll, or on any number of them, fluidly, as the doors do.
 */
const PRESENCE_AT_VH = 12
const MIND_GAP_VH = 12
/**
 * Text 1's slow drift upward across its whole life: the first half as it
 * comes up with the doors, the second as it fades out ahead of Presence. It
 * stands still while it is lit and waiting.
 */
const TEXT1_RISE_PX = 60

/**
 * Text 1 lives *behind* the doors: it is drawn over the canvas but clipped to
 * the opening between them, so it is revealed as they slide apart.
 *
 * The frames are opaque JPEGs, so nothing can be placed under them. What makes
 * the illusion work is that the opening renders as flat #202020, measured here
 * as [left, right] edges in percent of image width, frame 0 → 38.
 *
 * The right edge is NOT where the lit wood begins. Each door shows its own edge
 * face — its thickness — and that grows as it slides. On the left that face
 * catches light and is easy to find; on the right it is unlit and reads as the
 * same flat #202020 as the void behind it, so measuring brightness alone puts
 * the boundary too far right and the text spills onto the door.
 *
 * Since the doors travel symmetrically, the right edge is the mirror of the
 * left, `100 - left`, capped at the lit wood so it can never run past a surface
 * that is actually visible.
 *
 * Measured on the render of 2026-09-29, over a band above the handles (6–30%
 * of the height): the opening is the run of columns that are ground all the
 * way down that band, holding the middle of the frame. The same measure on the
 * old twenty frames gave their table back to within 0.8% wherever text 1 can
 * reach; it runs a little inside it, if anything, never past it.
 */
const GAP: [number, number][] = [
  [49.91, 50.09], [49.91, 50.09], [49.91, 50.09], [49.91, 50.09],
  [49.91, 50.09], [49.91, 50.09], [49.91, 50.09], [49.87, 50.13],
  [49.83, 50.17], [49.79, 50.21], [49.76, 50.24], [49.72, 50.28],
  [49.61, 50.39], [49.49, 50.51], [49.38, 50.62], [49.19, 50.81],
  [49.01, 50.99], [48.71, 51.29], [48.48, 51.52], [48.07, 51.93],
  [47.81, 52.19], [47.32, 52.68], [46.79, 53.21], [46.19, 53.81],
  [45.63, 54.37], [44.84, 55.16], [44.09, 55.91], [43.04, 56.96],
  [41.96, 58.04], [40.87, 59.13], [39.41, 60.59], [37.27, 62.73],
  [34.83, 65.17], [32.06, 67.94], [28.87, 71.13], [25.31, 74.69],
  [20.40, 79.60], [5.92, 94.08], [0, 100],
]

/** Source frame aspect, used to map gap percentages onto the drawn image. */
const FRAME_ASPECT = 2667 / 1500

// Text 1 comes up against the frames, so it stays locked to the doors however
// they are played. It fades with Presence's beat. Its two frames are where the
// opening is as wide as it was at the old frames 5 and 13.
const T1_FIRST_FRAME = 20      // first glimmer through the crack
const T1_FIRST_OPACITY = 0.05
const T1_FULL_FRAME = 32       // fully lit

/**
 * Presence's beat, played: seconds from the scroll that starts it.
 *
 * Text 1 goes back to black first. Then the last beat arrives in three, not
 * at once: the field out of the dark first, then the sculpture standing in
 * it, then the line under it. Each one starts while the one before is still
 * coming up and takes a little longer to finish, so what you read is
 * something opening rather than something switching on. Both delays are
 * counted from the field, which opens the moment text 1 has gone black.
 *
 * Each fade is eased in and out, so nothing starts or stops with a jolt.
 * Played backwards, scrolling up, the line goes first and text 1 comes back
 * last.
 *
 * The proportions are those of the scrolled beat the author approved, where
 * at a steady hand text 1 took about 20 vh to fade, the field 10, the
 * sculpture 16 starting 8 after it, and the line 32 starting 21 after it. The
 * line's was long only because it landed on the flat end of the eased curve,
 * and the played beat gives it about as long as the sculpture's. 2.6s in all,
 * the time the scroll is held for.
 *
 * Only the fades are staggered. The scale is shared, because the ring is drawn
 * at a fixed distance from the sculpture: letting the two grow on different
 * curves would pull the composition apart while it arrives.
 */
const TEXT1_OUT_S = 0.8
const HALO_IN_S = 0.9          // the field, first
const PRESENCE_DELAY_S = 0.3   // the sculpture trails it
const PRESENCE_IN_S = 1.2
const TEXT2_DELAY_S = 0.8      // and the line trails the sculpture
const TEXT2_IN_S = 1.0

const HALO_FROM_S = TEXT1_OUT_S
const PRESENCE_FROM_S = HALO_FROM_S + PRESENCE_DELAY_S
const TEXT2_FROM_S = HALO_FROM_S + TEXT2_DELAY_S
/** The whole beat, s: where the last of the three is fully up. */
const PRESENCE_BEAT_S = Math.max(
  HALO_FROM_S + HALO_IN_S,
  PRESENCE_FROM_S + PRESENCE_IN_S,
  TEXT2_FROM_S + TEXT2_IN_S,
)

/**
 * How long Presence takes to go off on a scroll up from inside the hero, s,
 * before the doors close by their frames (2026-10-28, the author's asking).
 * The same beat played backward, the line first and text 1 back last, only
 * faster than it comes on.
 */
const PRESENCE_OFF_S = 0.7

/** easeOutCubic: the sculpture's growth, quick to start and long to settle. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Presence's place, px past the pin. Measured on the pinned screen, which is
 * what the section's vh are, rather than on `innerHeight`: on a phone the two
 * differ by the browser's bars.
 */
function presenceAt(sticky: HTMLElement | null): number {
  return (PRESENCE_AT_VH * (sticky?.offsetHeight || window.innerHeight)) / 100
}

/** For Mind's place, px past the pin, measured as Presence's is. */
function mindAt(sticky: HTMLElement | null): number {
  return presenceAt(sticky) + NUDGE_PX + (MIND_GAP_VH * (sticky?.offsetHeight || window.innerHeight)) / 100
}

/**
 * Vertical easing at the section's two edges, in px of content travel.
 *
 * A sticky section otherwise snaps between two states: the page scrolls, then
 * it abruptly holds; at the end it abruptly resumes. The settle lets the
 * content keep moving a little into the pin, on a cubic curve, which reaches
 * zero velocity exactly there, so the eye reads a deceleration rather than a
 * stop. The lift raises it a little as it washes to white, played with the
 * wash, so it leaves already moving the way the page will carry it.
 */
const ENTRY_SETTLE_PX = 28
const EXIT_LIFT_PX = 28

/**
 * The moving layer is extended by this much above and below the viewport so it
 * can translate by up to the larger of the two distances without uncovering the
 * background. Overscanning rather than scaling keeps the frames a fixed size:
 * any scale that varies with scroll shows up as the image breathing.
 */
const OVERSCAN_PX = Math.max(ENTRY_SETTLE_PX, EXIT_LIFT_PX)

/**
 * The Presence beat, composed as one thing: the sculpture, the line that names
 * it, and the innermost ring drawn round the pair. Everything is a multiple of
 * the height the sculpture is drawn at, so the composition holds at any screen
 * size, and the pair is centred on the screen rather than lifted off it — the
 * lift only existed to balance a caption that used to be pinned near the
 * bottom of the viewport, and that caption now stands under the sculpture.
 *
 * The sculpture is drawn at 90% of the 55vh it used to be, which is what makes
 * the room for the line beneath it without pushing the ring off the screen.
 *
 * ROOM is the one spacing unit, spent twice: between the sculpture's foot and
 * the first line, and between the last line and the ring. It is the even
 * rhythm the Presence section keeps on /body/second-wind, where the caption
 * and the pendant sit centred in the innermost ring with about the same air on
 * every side.
 *
 * CAPTION is what the two lines are allowed — enough for the 20px they reach
 * on a desktop. A phone sets them at 11px and uses less, and since the pair is
 * centred by the layout rather than placed by these numbers, the ring simply
 * ends up with a little more room than it asked for.
 */
const PRESENCE_VH = 49.5
const PRESENCE_ROOM = 0.1
const PRESENCE_CAPTION = 0.16
const PRESENCE_GROUP = 1 + PRESENCE_ROOM + PRESENCE_CAPTION

/**
 * The sculpture is drawn at 90% of its place, shrunk toward its foot: the
 * author's asking on 2026-09-28. Its foot stays where it stood and its top
 * comes down, so the line under it and the ring round both keep their places,
 * and the room it gives up is left empty above it, inside the ring. The rest is
 * still measured from the whole place, PRESENCE_VH. The photograph runs from
 * edge to edge of its file, so the foot of the image is the sculpture's own.
 */
const PRESENCE_SIZE = 0.9

/**
 * That field, in thousandths of the drawn height.
 *
 * The height is derived, not chosen: the innermost ring clears the sculpture
 * and its caption by PRESENCE_ROOM at the top and at the bottom, so nothing
 * can be drawn taller without the ring opening to take it.
 *
 * The width is set by the caption's bottom corners, which is where the curve
 * comes in closest to it — not by the sculpture, which is narrow and sits
 * where the ellipse is widest. At 545 the ring still passes about 25px clear
 * of the end of "WE GIVE FORM" on a 910px screen. That runs a little rounder
 * than the Figma export's own ellipse (rx/ry 0.75 against 0.687), which is the
 * price of hanging two lines of type inside it.
 *
 * The box is what the field finishes in: exactly the outermost ring's bounds,
 * so the SVG's aspect equals the box's and one viewBox unit stays one
 * thousandth of the sculpture's height however the page is measured. Derived
 * from the radii rather than given, so drawing the ellipse in or out can't
 * leave the last ring clipped or the box out of proportion.
 */
const HALO_RX = 545
const HALO_RY = Math.round((PRESENCE_GROUP / 2 + PRESENCE_ROOM) * 1000)
/**
 * The hairline. A unit here is about half a pixel on a desktop screen, so the
 * export's own 0.5 lands at a quarter of one and the rings all but disappear
 * over this much ground. The field here is read from across a whole screen
 * rather than inside a section of one, so it is drawn heavier, denser and
 * brighter than the one on /body/second-wind — the same ornament, carrying
 * further.
 */
const HALO_STROKE = 1.15
const HALO_RINGS = 14
const HALO_PEAK = 0.38

/**
 * How far a ring travels, and how it paces that travel.
 *
 * Evenly spaced rings read as a target rather than as something spreading, so
 * the ring accelerates instead: the gap between two of them is the distance
 * one covers in the time between them, and at 1.5 that gap runs from about
 * 12px around the outline to about 65px by the time a ring leaves — roughly
 * two and a half times as wide across the stretch you can actually see it,
 * which is the whole of the effect and none of the lurch.
 *
 * Reach is up from the 1.85 the export travels because acceleration alone
 * would have made the field smaller, not bigger: the same distance covered
 * with more of the time spent near the middle leaves the rings small for
 * longer. Carrying them to 2.8 puts the half-lit ring about a fifth further
 * out than it stood before.
 */
const HALO_REACH = 2.8
const HALO_GROWTH = 1.5
const HALO_BOX_W = +((2 * HALO_RX * HALO_REACH) / 1000).toFixed(4)
const HALO_BOX_H = +((2 * HALO_RY * HALO_REACH) / 1000).toFixed(4)
const HALO_VIEW_BOX = [-HALO_RX, -HALO_RY, 2 * HALO_RX, 2 * HALO_RY]
  .map((n) => +(n * HALO_REACH).toFixed(2))
  .join(" ")

/**
 * The exit: the screen washes to white rather than handing the page on by
 * scrolling the next section up behind it. `MindRow` in
 * `components/categories-section.tsx` picks the screen up from there and
 * brings For Mind up out of the same white, so the two read as one dissolve
 * rather than as two sections meeting.
 *
 * The wash is the first MIND_WASH_S of For Mind's beat, played. Until
 * 2026-09-28 it was scrolled, 25 vh held and 32 washing, about five turns
 * from the line to white, and the author asked for it to be quicker. It was
 * then 12 held and 24 washing until 2026-10-02, when For Mind's beat came to
 * be played and the wash with it.
 *
 * The section's real scrolling past the pin is then only the places of its
 * beats: up to Presence's, the nudge past it, the gap to For Mind's, and the
 * nudge past that, where the pin lets go.
 */
const SCROLL_VH = PRESENCE_AT_VH + MIND_GAP_VH
const SCROLL_PX = 2 * NUDGE_PX

/** Linear 0 → 1 ramp across [from, to], flat outside it. */
function ramp(v: number, from: number, to: number): number {
  if (to <= from) return v >= to ? 1 : 0
  return clamp01((v - from) / (to - from))
}

/** Gap edges at a position in the frames (0 → 19), as fractions of image width. */
function gapAt(f: number): [number, number] {
  const i = Math.min(Math.floor(f), FRAME_COUNT - 2)
  const t = clamp01(f - i)
  const [l0, r0] = GAP[i]
  const [l1, r1] = GAP[i + 1]
  return [(l0 + (l1 - l0) * t) / 100, (r0 + (r1 - r0) * t) / 100]
}

/**
 * The arrival (2026-10-02, the author's asking). The first scroll down from
 * the top of the page goes only as far as the hero, to where the doors fill
 * the screen, and comes to rest there. The doors open on the next one.
 *
 * Until then the page scrolled freely into the hero and the doors started as
 * it pinned. The menu and the band under it are 345px on a 1440 × 900 screen,
 * three or four turns of the wheel. A hand turning the wheel that many times
 * was already inside the doors' room as they began, and a trackpad's fling
 * carried it through them.
 *
 * So a scroll down that starts above the pin is taken over. The page is
 * carried there by itself, leaving at about the speed a turn of the wheel
 * scrolls at and slowing to nothing exactly at the pin: the inertia the author
 * asked for, so that it settles rather than stops. Whatever more the same hand
 * sends is absorbed: the rest of a quick turn of several notches, a trackpad's
 * momentum, a key held down.
 *
 * The next scroll opens the doors, and the page is held again while they do
 * (the same day, the author's asking: they must open at the same pace however
 * much or however fast the page is scrolled). The one after brings Presence
 * on, held the same way (the author's asking again, the same day). Each such
 * scroll moves the page NUDGE_PX past the beat's place, where nothing on the
 * screen moves with it, and the beat starts: the players wait for the page to
 * go past their place. The rest of that scroll is absorbed, and so is every
 * scroll down until the beat has played. Before, a quick turn carried the
 * page on through text 1's fade while the doors were still opening, and
 * dragged them open to keep up.
 *
 * Once the last beat has played, a new turn after GESTURE_GAP_MS of quiet
 * scrolls on as ever, into the wash.
 *
 * These are the only places on the page where the scroll is held, at the
 * author's asking. Only on the way down; going back up is never held. A finger
 * is followed as it drags to the pin and, once lifted, the page glides on from
 * the finger's own speed. The scrollbar is left alone. While the doors' frames
 * are still loading, nothing waits on them.
 *
 * The listeners that can hold the scroll are on the page only while it is
 * above the last beat's place. A wheel listener that may cancel makes the
 * browser wait for the page's script before every scroll it starts, and the
 * rest of the page has nothing to wait for.
 */
/** px/s the page leaves at, for a wheel or a key: about a turn of the wheel. */
const ARRIVE_SPEED = 900
/** The glide's length, s: 345px at ARRIVE_SPEED is 1.15s. */
const ARRIVE_MIN_S = 0.4
const ARRIVE_MAX_S = 1.3
/**
 * Quiet that ends a turn of the hand, ms. A quick turn's notches come 30–100ms
 * apart and a trackpad's momentum every 16ms. A hand that stops to look and
 * turns again is well past it.
 */
const GESTURE_GAP_MS = 250
/**
 * The glide's last pixels, where it is still easing in but no longer seen to
 * move. A new turn that comes then finds the page arrived: they are covered at
 * once and the turn opens the doors.
 */
const SETTLED_PX = 4
/**
 * How far past the pin the page must go for the doors to open. Not 0: a pin at
 * 345.14px leaves the page a fraction of a pixel either side of it.
 */
const PAST_PIN_PX = 2
/**
 * How long after a finger is lifted its fling may still be carrying the page,
 * ms. A hard flick on a phone decelerates over two seconds or so.
 */
const FLING_MS = 3000

/** A played beat, as the scroll's hold sees it. */
type Beat = {
  /** Its place, px of real scrolling past the pin: on past it, off before. */
  at: () => number
  /** How far it has played, 0 → 1; 1 also while it cannot play at all. */
  done: () => number
}

/**
 * Holds the first scroll down at the pin, and every scroll down while a beat
 * plays. `beats` are in the order they come. Returns its undoing.
 */
function holdScroll(el: HTMLElement, beats: Beat[]): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  // How far the page still has to go: the section's own top on the screen.
  const rest = () => el.getBoundingClientRect().top

  let wrote = 0
  const to = (y: number) => {
    window.scrollTo({ top: y, behavior: "instant" })
    wrote = window.scrollY
  }

  // The glide: a cubic from the speed it leaves at to rest. With `lead` 3 it
  // is the plain ease-out; under 3 it leaves slower than that and gathers
  // first, as it must when a finger lets go of it slowly.
  let raf = 0
  let gliding = false
  let from = 0
  let span = 0
  let lead = 0
  let start = 0
  let length = 0

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
    gliding = false
  }

  const step = (now: number) => {
    // Something else has moved the page (the scrollbar): it is theirs.
    if (Math.abs(window.scrollY - wrote) > 2) return stop()
    const s = clamp01((now - start) / length)
    to(from + span * ((s * s * s - 2 * s * s + s) * lead + (3 - 2 * s) * s * s))
    if (s < 1) raf = requestAnimationFrame(step)
    else stop()
  }

  const glide = (speed: number) => {
    stop()
    const d = rest()
    if (d <= 0.5) return
    if (reduce.matches) return to(window.scrollY + d)
    from = window.scrollY
    wrote = from
    span = d
    length =
      1000 *
      Math.min(ARRIVE_MAX_S, Math.max(ARRIVE_MIN_S, (3 * d) / Math.max(speed, ARRIVE_SPEED)))
    lead = Math.min(3, (speed * length) / 1000 / d)
    start = performance.now()
    gliding = true
    raf = requestAnimationFrame(step)
  }

  // A new turn in the glide's last pixels: they are covered at once.
  const land = () => {
    if (!gliding) return
    stop()
    to(window.scrollY + rest())
  }

  /** Past the last beat's resting place, nothing here holds the page. */
  const end = () => beats[beats.length - 1].at() + NUDGE_PX + 1

  /**
   * Whether the page takes a scroll down, rather than the browser. `same` is
   * whether it comes from a hand already being held: within GESTURE_GAP_MS of
   * the last turn, or a key held down.
   */
  let held = false
  const take = (same: boolean): boolean => {
    // On the way back up the hero is a plain screen: nothing is held.
    if (heroUp.on) {
      held = false
      return false
    }
    // Above the pin: carried there.
    if (rest() > SETTLED_PX) {
      held = true
      if (!gliding) glide(ARRIVE_SPEED)
      return true
    }
    if (-rest() > end()) {
      held = false
      return false
    }
    // The rest of a hand already held, whether it brought the page in or
    // started a beat.
    if (held && same) return true
    land()
    const x = -rest()
    // The last beat the page is past: while it plays, the page waits.
    let i = beats.length - 1
    while (i >= 0 && x <= beats[i].at()) i--
    if (i >= 0 && beats[i].done() < 1) {
      held = true
      return true
    }
    // The next one: this scroll starts it.
    const next = beats[i + 1]
    if (!next) {
      held = false
      return false
    }
    held = true
    to(window.scrollY + next.at() + NUDGE_PX - x)
    return true
  }

  // The wheel, and a trackpad, which the browser sends as one.
  let lastWheel = -Infinity
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    const gap = e.timeStamp - lastWheel
    lastWheel = e.timeStamp
    if (e.deltaY < 0) {
      stop()
      held = false
      return
    }
    if (e.deltaY === 0 || !e.cancelable) return
    if (take(gap < GESTURE_GAP_MS)) e.preventDefault()
  }

  // The keys that scroll down. One held down repeats as the same hand.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    if (!(e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey))) return
    const t = e.target
    if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input, textarea, select, button"))) return
    if (take(e.repeat)) e.preventDefault()
  }

  // A finger. What the touch is is settled on its first move, the only one
  // the browser lets the page cancel. Going down above the pin, it brings the
  // page in: the page follows the finger, as far as the pin and no further,
  // and once it is lifted glides on from the finger's speed. Going down where
  // it starts a beat, or while one plays, it is held whole. Anything else is the
  // browser's.
  type Touching = { x: number; y: number; at: number; v: number; mode: "arrive" | "hold" | "native" | null }
  let touch: Touching | null = null
  const onTouchStart = (e: TouchEvent) => {
    touch = null
    fingerUntil = Infinity
    if (e.touches.length !== 1) return
    const p = e.touches[0]
    touch = { x: p.clientX, y: p.clientY, at: e.timeStamp, v: 0, mode: null }
  }
  const onTouchMove = (e: TouchEvent) => {
    if (!touch) return
    if (e.touches.length !== 1) {
      touch = null
      return
    }
    const p = e.touches[0]
    const dy = touch.y - p.clientY
    if (touch.mode === null) {
      // A tap leaves a glide running. A drag takes the page from it.
      stop()
      if (!e.cancelable || dy <= 0 || dy < Math.abs(p.clientX - touch.x)) touch.mode = "native"
      else if (rest() > SETTLED_PX) touch.mode = "arrive"
      else touch.mode = take(false) ? "hold" : "native"
    }
    if (touch.mode === "native") return
    e.preventDefault()
    if (touch.mode === "hold") return
    const y = window.scrollY
    to(Math.max(0, Math.min(y + rest(), y + dy)))
    const dt = e.timeStamp - touch.at
    if (dt > 0) touch.v = 0.75 * ((dy / dt) * 1000) + 0.25 * touch.v
    touch.x = p.clientX
    touch.y = p.clientY
    touch.at = e.timeStamp
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch
    touch = null
    fingerUntil = performance.now() + FLING_MS
    if (t?.mode !== "arrive") return
    // A finger that stopped before it was lifted throws nothing; one that
    // turned back up leaves the page where it is.
    const v = e.timeStamp - t.at > 80 ? 0 : t.v
    if (v >= 0) glide(v)
  }

  // The fence (2026-10-26, on mobile). A phone does not always let the page
  // cancel a touch: a touchmove that comes while the page's script is busy
  // (the frames being decoded) or while a fling is still running arrives with
  // `cancelable` false, and the browser scrolls it natively, momentum and all.
  // Nothing above can hold that. It carried the page from the doors straight
  // into For Mind's white with Presence never played, or from Presence past
  // For Mind into For Body while For Mind's row was still rising.
  //
  // So while a finger is down, or its fling may still be running, a page
  // scrolled past the place of the first beat that has not yet played to the
  // end is put back there, NUDGE_PX past it: where a held scroll would have
  // left it. That starts the beat if it has not started, and the page waits
  // while it plays, exactly as with a held scroll. Only ever downward; going
  // back up is never fenced. The wheel, the keys and the scrollbar are left as
  // they were: a computer cancels them reliably, and the scrollbar is the
  // reader's.
  //
  // It listens in the capture phase, so the page is put back before the
  // beats' own scroll listeners read it: a beat further down sees the page
  // short of its place and does not start.
  let fingerUntil = 0
  const fence = () => {
    if (performance.now() > fingerUntil || heroUp.on) return
    const x = -rest()
    if (x <= 0) return
    let k = 0
    while (k < beats.length && beats[k].done() >= 1) k++
    if (k === beats.length) return
    const limit = beats[k].at() + NUDGE_PX
    if (x <= limit + 1) return
    stop()
    held = true
    to(window.scrollY + limit - x)
  }

  // On the page only while it is short of the last beat's resting place, or
  // being carried to the pin.
  let armed = false
  const arm = () => {
    const want = gliding || -rest() <= end()
    if (want === armed) return
    armed = want
    if (want) {
      window.addEventListener("wheel", onWheel, { passive: false })
      window.addEventListener("touchmove", onTouchMove, { passive: false })
    } else {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchmove", onTouchMove)
    }
  }

  arm()
  window.addEventListener("scroll", fence, { passive: true, capture: true })
  window.addEventListener("scroll", arm, { passive: true })
  window.addEventListener("resize", arm)
  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("touchstart", onTouchStart, { passive: true })
  window.addEventListener("touchend", onTouchEnd, { passive: true })
  window.addEventListener("touchcancel", onTouchEnd, { passive: true })
  return () => {
    stop()
    window.removeEventListener("wheel", onWheel)
    window.removeEventListener("touchmove", onTouchMove)
    window.removeEventListener("scroll", fence, { capture: true })
    window.removeEventListener("scroll", arm)
    window.removeEventListener("resize", arm)
    window.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("touchstart", onTouchStart)
    window.removeEventListener("touchend", onTouchEnd)
    window.removeEventListener("touchcancel", onTouchEnd)
  }
}

export function HeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  // The pinned screen, whose height is the section's vh.
  const stickyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Text 1's clip to the opening and its fade in, which belong to the doors
  // and are written by their player (see `paint`), not by React.
  const text1DoorsRef = useRef<HTMLDivElement>(null)
  // Presence's beat, written by its player (see the second effect), not by
  // React: text 1's fade, the field, the sculpture and the line, and the scale
  // the three share, as `--presence-scale` on the stage.
  const stageRef = useRef<HTMLDivElement>(null)
  const text1OutRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const sculptureRef = useRef<HTMLImageElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  // The wash to white, the start of For Mind's beat, written by its player
  // with the lift that goes with it, as `--exit-lift` on the stage.
  const washRef = useRef<HTMLDivElement>(null)
  // The field's rings run only while it can be seen.
  const [haloLive, setHaloLive] = useState(false)
  // 1 while the section is a full approach away from pinning, 0 once pinned.
  const [arrive, setArrive] = useState(1)
  // How far each played beat has gone, 0 → 1, for the scroll's hold to wait
  // on. The doors read 1 while they cannot play, so that nothing waits on
  // frames still loading.
  const doorsRef = useRef<() => number>(() => 1)
  const presenceRef = useRef<() => number>(() => 1)
  const mindRef = useRef<() => number>(() => 1)
  // Shuts the doors at once, on frame 0, rather than playing them shut.
  const shutDoorsRef = useRef<() => void>(() => {})

  // The doors: loaded, decoded, played and drawn here, outside React. They
  // change every frame for a second and a bit, and nothing else on the page
  // needs to hear of it.
  useEffect(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!el || !canvas || !ctx) return

    const imgs: HTMLImageElement[] = []
    let loadedCount = 0
    let ready = false // every frame has arrived, and been decoded if it can be
    let disposed = false

    let pos = 0 // where the doors stand, 0 shut → 1 open
    let open = false // where they are going
    let primed = false
    // While the frames are still on their way the page waits for them, but
    // only so long (DOORS_WAIT_MS from the scroll that asked for them). On a
    // phone the frames can take some seconds, and reading 1 meanwhile let the
    // next scroll go straight on to Presence and For Mind with the doors still
    // shut, then opened them out of sight (2026-10-26, on mobile).
    let askedAt = 0
    doorsRef.current = () =>
      ready ? pos : askedAt && performance.now() - askedAt > DOORS_WAIT_MS ? 1 : 0
    let raf = 0
    let last = 0

    // The canvas's layout size, which text 1's clip is given in.
    let cssW = 0
    let cssH = 0

    /**
     * Each frame decoded ahead of time, cut to the part of it the canvas shows
     * and scaled to the canvas's own pixels. Drawn from its <img>, a frame is
     * decoded the first time it is drawn, some 20ms for a 2667 × 1500 JPEG,
     * and the browser is free to let it go and decode it again the next time:
     * a second stutter, under the first. On a phone the canvas shows about a
     * quarter of the frame's width, so the cut is most of the saving there,
     * 4MB a frame instead of 16. Past BITMAP_BUDGET_PX the frames in motion
     * are kept smaller, and enlarged as they are drawn.
     */
    let bitmaps: (ImageBitmap | null)[] = []
    let fitW = 0
    let fitH = 0
    let fitX = 0
    let fitDW = 0
    let generation = 0
    let rebuild = 0

    const decode = async () => {
      if (loadedCount < FRAME_COUNT || typeof createImageBitmap !== "function") return
      const W = canvas.width
      const H = canvas.height
      const known = imgs.find((img) => img.naturalWidth > 0)
      if (!known || !W || !H || (W === fitW && H === fitH)) return
      const gen = ++generation
      const nw = known.naturalWidth
      const nh = known.naturalHeight
      const scale = H / nh
      const sx = Math.floor(Math.max(0, (nw * scale - W) / 2) / scale)
      const sw = nw - 2 * sx
      // Never enlarged here: a canvas taller than the frame scales it up as
      // it draws, as it did before.
      const k = Math.min(1, scale)
      // The first frame, the one that stands still, is kept whole; the ones
      // in motion share what the budget leaves.
      const px = sw * k * nh * k
      const m = Math.min(
        1,
        Math.max(0.3, Math.sqrt((BITMAP_BUDGET_PX - px) / (FRAME_COUNT - 1) / px) || 0),
      )
      try {
        const made = await Promise.all(
          imgs.map((img, i) =>
            img.naturalWidth > 0
              ? createImageBitmap(img, sx, 0, sw, nh, {
                  resizeWidth: Math.round(sw * k * (i === 0 ? 1 : m)),
                  resizeHeight: Math.round(nh * k * (i === 0 ? 1 : m)),
                  resizeQuality: "high",
                })
              : null,
          ),
        )
        if (disposed || gen !== generation) {
          made.forEach((b) => b?.close())
          return
        }
        bitmaps.forEach((b) => b?.close())
        bitmaps = made
        fitW = W
        fitH = H
        fitX = (W - sw * scale) / 2
        fitDW = sw * scale
        paint()
      } catch {
        // Left drawing from the images, as it always did.
      }
    }

    const has = (i: number) =>
      (fitW === canvas.width && fitH === canvas.height && !!bitmaps[i]) ||
      (!!imgs[i] && imgs[i].complete && imgs[i].naturalWidth > 0)

    const draw = (i: number, W: number, H: number) => {
      const bitmap = fitW === W && fitH === H ? bitmaps[i] : null
      if (bitmap) {
        ctx.drawImage(bitmap, fitX, 0, fitDW, H)
        return
      }
      const img = imgs[i]
      const dw = (img.naturalWidth * H) / img.naturalHeight
      ctx.drawImage(img, (W - dw) / 2, 0, dw, H)
    }

    const paint = () => {
      const f = pos * (FRAME_COUNT - 1)

      // Text 1 lights up from 5% at frame 20 to full at frame 32. It is
      // clipped to the opening, so it also gets *wider* as the doors slide
      // apart: the reveal is as much the clip as the light. The canvas draws
      // each frame scaled to its height and centred, so the gap's percentages
      // go through that same fit to land on the doors.
      const layer = text1DoorsRef.current
      if (layer && cssW > 0) {
        const drawnW = cssH * FRAME_ASPECT
        const left = (cssW - drawnW) / 2
        const [gapL, gapR] = gapAt(f)
        const clip = `inset(0 ${Math.max(0, cssW - left - gapR * drawnW)}px 0 ${Math.max(0, left + gapL * drawnW)}px)`
        layer.style.clipPath = clip
        layer.style.setProperty("-webkit-clip-path", clip)
        layer.style.opacity = String(
          f < T1_FIRST_FRAME
            ? 0
            : T1_FIRST_OPACITY +
                ramp(f, T1_FIRST_FRAME, T1_FULL_FRAME) * (1 - T1_FIRST_OPACITY),
        )
        // The first half of its drift, from its first glimmer to the last
        // frame (see TEXT1_RISE_PX).
        layer.style.setProperty("--t1-in", String(ease(ramp(f, T1_FIRST_FRAME, FRAME_COUNT - 1))))
      }

      const W = canvas.width
      const H = canvas.height
      const i = Math.min(Math.floor(f), FRAME_COUNT - 1)
      if (!W || !H || !has(i)) return
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, W, H)
      draw(i, W, H)
      // Between two frames the next is faded in over the last, by how far
      // the doors have come from one to the other. Both are opaque, so this is
      // a true mix of the two, as a film editor's frame blending is.
      const t = f - i
      if (t > 0.002 && i + 1 < FRAME_COUNT && has(i + 1)) {
        ctx.globalAlpha = t
        draw(i + 1, W, H)
        ctx.globalAlpha = 1
      }
    }

    const moving = () => (open ? pos < 1 : pos > 0)

    const tick = (now: number) => {
      raf = 0
      // Held to a twentieth of a second, so a tab coming back from the
      // background carries on where it was rather than leaping to the end.
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
      last = now
      pos = open ? Math.min(1, pos + dt / DOORS_S) : Math.max(0, pos - dt / DOORS_S)
      paint()
      if (moving()) raf = requestAnimationFrame(tick)
    }

    // A page scrolled back up above the pin finds them shut, the handles
    // there at once (see `rewind` in lib/played-beat.ts).
    shutDoorsRef.current = () => {
      if (pos === 0 && !raf) return
      cancelAnimationFrame(raf)
      raf = 0
      pos = 0
      paint()
    }

    const play = () => {
      if (!ready || raf || !moving()) return
      last = 0
      raf = requestAnimationFrame(tick)
    }

    // Looked at again each frame while the doors wait for Presence to go off.
    let waiting = 0
    const measure = () => {
      const top = el.getBoundingClientRect().top
      // Past the pin, not at it: the page comes to rest at the pin first (see
      // `holdScroll`), and the doors wait for the next scroll.
      const want = !heroUp.on && top < -PAST_PIN_PX
      // Sent shut from inside the hero, they stay open until Presence has
      // gone off, and then close by their frames (2026-10-28, the author's
      // asking).
      const wait = !want && primed && !heroUp.on && pos > 0 && presenceRef.current() > 0
      open = want || wait
      if (wait && !waiting) {
        waiting = requestAnimationFrame(() => {
          waiting = 0
          measure()
        })
      }
      if (!want) askedAt = 0
      else if (!askedAt) askedAt = performance.now()
      if (!primed) {
        // A page that opens part-way down, restored or followed from a link,
        // finds the doors already open rather than opening them out of sight.
        primed = true
        pos = open ? 1 : 0
        // Nor does it wait on their frames.
        if (open) askedAt = -Infinity
        paint()
      }
      play()
    }

    // The backing store follows the canvas's layout size: offsetWidth and
    // offsetHeight ignore the settle/lift transform, so it stays stable while
    // the section moves. The frames are cut again once it has settled.
    const resize = () => {
      cssW = canvas.offsetWidth
      cssH = canvas.offsetHeight
      const dpr = window.devicePixelRatio || 1
      const W = Math.round(cssW * dpr)
      const H = Math.round(cssH * dpr)
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }
      paint()
      window.clearTimeout(rebuild)
      rebuild = window.setTimeout(decode, 200)
    }

    const load = (i: number, then?: () => void) => {
      const img = new window.Image()
      // A frame that fails is counted all the same, and skipped when drawn,
      // so one missing file cannot keep the doors shut.
      const settle = () => {
        if (disposed) return
        // Whatever frame the doors stand at is drawn as soon as it arrives,
        // without waiting on the rest.
        paint()
        then?.()
        if (++loadedCount === FRAME_COUNT) {
          // They play once they are decoded, or from the images where that
          // cannot be done: a first play that stutters is the one everyone
          // sees. The scroll takes some turns to reach the pin, and decoding
          // takes a fraction of a second on a computer, a second or two on a
          // phone.
          decode().finally(() => {
            if (disposed) return
            ready = true
            play()
          })
        }
      }
      img.onload = settle
      img.onerror = settle
      img.src = FRAME_URLS[i]
      imgs[i] = img
    }
    // The first frame first, alone: it is the one on screen, and it would
    // otherwise share the connection with the 38 behind it. The page asks for
    // it early too (see `preload` below).
    load(0, () => {
      for (let i = 1; i < FRAME_COUNT; i++) load(i)
    })

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    measure()
    window.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    window.addEventListener("pageshow", measure)
    return () => {
      disposed = true
      doorsRef.current = () => 1
      shutDoorsRef.current = () => {}
      cancelAnimationFrame(raf)
      cancelAnimationFrame(waiting)
      window.clearTimeout(rebuild)
      ro.disconnect()
      window.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      window.removeEventListener("pageshow", measure)
      imgs.forEach((img) => {
        img.onload = null
        img.onerror = null
      })
      bitmaps.forEach((b) => b?.close())
    }
  }, [])

  // Presence's beat, and the wash that opens For Mind's: played here, outside
  // React, as the doors are (see `lib/played-beat.ts`). Each starts with the
  // scroll that nudges the page past its place and plays whatever the hand
  // does next; scrolled back before its place, it plays backwards, unless the
  // page has gone back past an earlier beat's place too.
  useEffect(() => {
    const el = containerRef.current
    const stage = stageRef.current
    if (!el || !stage) return
    const past = () => -el.getBoundingClientRect().top
    let live = false

    // Text 1 goes back to black, then the field, the sculpture and the line
    // come up, PRESENCE_BEAT_S in all.
    const presence = playBeat(
      PRESENCE_BEAT_S,
      () => !heroUp.on && past() > presenceAt(stickyRef.current),
      (t) => {
        const fade = (from: number, length: number) => ease(ramp(t, from, from + length))
        const out = fade(0, TEXT1_OUT_S)
        const halo = fade(HALO_FROM_S, HALO_IN_S)
        const grow = ramp(t, PRESENCE_FROM_S, PRESENCE_FROM_S + PRESENCE_IN_S)
        stage.style.setProperty("--t1-out", String(out))
        stage.style.setProperty("--presence-scale", String(0.65 + 0.35 * easeOut(grow)))
        if (text1OutRef.current) text1OutRef.current.style.opacity = String(1 - out)
        if (haloRef.current) haloRef.current.style.opacity = String(halo)
        if (sculptureRef.current) sculptureRef.current.style.opacity = String(ease(grow))
        if (captionRef.current) {
          captionRef.current.style.opacity = String(fade(TEXT2_FROM_S, TEXT2_IN_S))
        }
        // Nothing of the field is on screen while the doors are still
        // opening, and that is the stretch the page can least spare.
        if (halo > 0 !== live) {
          live = halo > 0
          setHaloLive(live)
        }
      },
      "presence",
    )

    // For Mind's beat, whose first MIND_WASH_S is the wash to white and the
    // lift that goes with it. Its row plays the rest on the same clock: both
    // start on the same scroll, and its place is the row's (see MindRow).
    const mind = playBeat(
      MIND_BEAT_S,
      () => !heroUp.on && past() > mindAt(stickyRef.current),
      (t) => {
        const wash = ease(ramp(t, 0, MIND_WASH_S))
        if (washRef.current) washRef.current.style.opacity = String(wash)
        stage.style.setProperty("--exit-lift", `${(-EXIT_LIFT_PX * wash).toFixed(2)}px`)
      },
      // Its own name as well as For Mind's: on the way back up the wash comes
      // off while For Mind's row stays in its place.
      "mind",
      "wash",
    )

    // Only the last beat the page has gone back before plays backward: the
    // ones after it go straight back to their start (see `rewind`). Above the
    // pin they all do, the doors with them, so a page scrolled back to the top
    // finds the handles there at once.
    //
    // Going up, nothing plays backward (2026-10-27, the author's asking: the
    // doors opening and Presence coming on are for the way down only, and on
    // the way up the shut doors scroll down into view like the rest of the
    // page, in one steady movement, rather than appearing all at once).
    //
    // So a scroll up from For Mind lays the hero out as a plain screen
    // standing directly above For Mind (`heroUp`): its pin room is taken out
    // and For Mind's section no longer overlaps it, and the page is moved by
    // exactly what that shifts For Mind by, in the same frame, so nothing on
    // the screen moves. Every beat of the hero goes to its start at once: the
    // doors shut, Presence off, the wash off. For Mind's row stays where it
    // is. From there the page scrolls up through the shut doors as through
    // any other picture. Once the page is back at the pin, with the doors
    // filling the screen, the hero is laid out as before, unseen, and the next
    // scroll down plays everything again in order.
    //
    // A scroll up from inside the hero (Presence, or text 1) has no picture
    // above it to scroll in, so there the page is put at the pin, Presence
    // goes off quickly (PRESENCE_OFF_S) and the doors then close by their
    // frames, as they opened (2026-10-28, the author's asking; until then they
    // were shut at once). The page is not held meanwhile: scrolled on up, it
    // carries the doors down with it as they close.
    const section = el.nextElementSibling as HTMLElement | null
    // What React set, put back as it was.
    const height = el.style.height
    const marginTop = section?.style.marginTop ?? ""
    const setUp = (on: boolean) => {
      heroUp.on = on
      el.style.height = on ? "100vh" : height
      if (section) section.style.marginTop = on ? "0px" : marginTop
    }
    let lastY = window.scrollY
    let lastX = past()
    // While the doors are closing by their frames after a scroll up from
    // inside the hero: going above the pin then leaves them to finish.
    let closing = false

    // The hero as a plain screen above For Mind, the page moved by what that
    // shifts For Mind by, so nothing on screen moves.
    const layOutUp = () => {
      if (!section) return
      const s = section.getBoundingClientRect().top
      shutDoorsRef.current()
      rewind("presence")
      rewind("wash")
      setUp(true)
      const moved = section.getBoundingClientRect().top - s
      window.scrollTo({ top: window.scrollY + moved, behavior: "instant" })
      lastY = window.scrollY
      lastX = past()
    }

    // The bottom logo, back to the top of the page (2026-10-27: it used to
    // stop at For Body or at the doors). The browser's smooth scroll is
    // stopped by any scrollTo made while it runs, and the way up made two. So
    // the bottom menu says so first (TO_TOP_EVENT), and the hero is laid out
    // for the way up before the smooth scroll starts: from For Mind or below
    // as a plain screen of shut doors above For Mind, from inside the hero by
    // shutting the doors where they are. Either way no beat plays and nothing
    // is held on the way up, and nothing moves the page until it is at the top.
    const toTop = () => {
      if (heroUp.on) return
      const x = past()
      if (x <= 0) return
      if (x >= mindAt(stickyRef.current) && section) {
        layOutUp()
        return
      }
      shutDoorsRef.current()
      rewind("presence")
      rewind("mind")
      heroUp.on = true
    }
    window.addEventListener(TO_TOP_EVENT, toTop)

    const back = () => {
      const y = window.scrollY
      const up = y < lastY
      const wasX = lastX
      lastY = y
      lastX = past()
      const x = lastX

      if (heroUp.on) {
        if (x <= 0) {
          // Nothing here moves the page: a scrollTo would stop a smooth scroll
          // under way (the bottom logo's, back to the top) at the doors. What
          // changes is all below the screen, and the hero's top stays put.
          setUp(false)
          // For Mind's row is off the screen now: back to its start, unseen.
          rewind("mind")
        }
        return
      }

      // Only from within a screen of For Mind's place: further down the hero
      // is out of sight anyway, and the page is left to scroll undisturbed.
      const screen = stickyRef.current?.offsetHeight || window.innerHeight
      const atMind = mindAt(stickyRef.current)
      if (up && wasX >= atMind && wasX < atMind + NUDGE_PX + screen && section) {
        layOutUp()
        // Already at the pin or above it (a page scrolled up a long way in
        // one go): back as it was at once.
        if (lastX <= 0) back()
        return
      }

      if (!up && x > PAST_PIN_PX) closing = false
      if (closing && doorsRef.current() === 0 && presenceRef.current() === 0) closing = false

      if (x < 0 && !closing) {
        shutDoorsRef.current()
        rewind("presence")
      }
      if (x < presenceAt(stickyRef.current)) rewind("mind")

      if (up && x > PAST_PIN_PX && x < mindAt(stickyRef.current)) {
        closing = true
        hurry("presence", PRESENCE_BEAT_S / PRESENCE_OFF_S)
        rewind("mind")
        window.scrollTo({ top: y - x, behavior: "instant" })
        lastY = window.scrollY
        lastX = past()
      }
    }
    back()
    // In the capture phase, so that it runs before every beat's own listener
    // on the same scroll, whichever order they were added in: the beats then
    // read the page, and heroUp, as back has left them.
    window.addEventListener("scroll", back, { passive: true, capture: true })

    presenceRef.current = presence.done
    mindRef.current = mind.done
    return () => {
      window.removeEventListener("scroll", back, { capture: true })
      window.removeEventListener(TO_TOP_EVENT, toTop)
      if (heroUp.on) setUp(false)
      presence.dispose()
      mind.dispose()
      presenceRef.current = () => 1
      mindRef.current = () => 1
    }
  }, [])

  // The page comes to rest where the doors fill the screen, and stays while
  // each beat plays (see holdScroll).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    return holdScroll(el, [
      { at: () => PAST_PIN_PX, done: () => doorsRef.current() },
      { at: () => presenceAt(stickyRef.current), done: () => presenceRef.current() },
      { at: () => mindAt(stickyRef.current), done: () => mindRef.current() },
    ])
  }, [])

  // The first frame is what the hero shows until the wheel turns, so the page
  // asks for it with the document rather than once the script has run.
  preload(FRAME_URLS[0], { as: "image", fetchPriority: "high" })

  // The one thing still driven by the scroll: the settle into the pin.
  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      // Distance still to travel before the sticky child pins, normalised.
      setArrive(clamp01(el.getBoundingClientRect().top / (el.offsetTop || 1)))
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    // Recompute when the measurements themselves change, not just on scroll:
    // a resize/rotation alters both terms, and a tab that loaded in the
    // background only gets a real viewport once it becomes visible.
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

  // One scale for the whole composition, taken from the sculpture's own
  // arrival, 0.65 → 1, written by Presence's player. The halo is sized in
  // multiples of this height, so the field and the sculpture grow together
  // however differently the two of them light up.
  const presenceH = `calc(${PRESENCE_VH}vh * var(--presence-scale, 0.65))`

  // Text 1 drifts up half a rise as it comes up with the doors (`--t1-in`)
  // and half again as it fades ahead of Presence (`--t1-out`).
  const text1Rise = `${TEXT1_RISE_PX}px * (0.5 - 0.5 * var(--t1-in, 0) - 0.5 * var(--t1-out, 0))`

  // Content lags on the way in, cubed so its velocity relative to the page
  // reaches zero exactly at the pin. On the way out it lifts as it washes to
  // white, played with the wash (`--exit-lift`).
  const entryShift = ENTRY_SETTLE_PX * Math.pow(arrive, 3)

  return (
    // Container height = 1 sticky screen + the places of the beats past the
    // pin, the last of which is where the pin lets go (see SCROLL_VH).
    <div
      ref={containerRef}
      style={{ height: `calc(${100 + SCROLL_VH}vh + ${SCROLL_PX}px)`, position: "relative" }}
    >
      {/* Sticky viewport */}
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          background: "#202020",
        }}
      >
        {/* Everything that moves, shifted as one so the section eases into the
            pin and out of it instead of snapping between scrolling and held. */}
        <div
          ref={stageRef}
          style={{
            position: "absolute",
            top: -OVERSCAN_PX,
            bottom: -OVERSCAN_PX,
            left: 0,
            right: 0,
            transform: `translateY(calc(${entryShift}px + var(--exit-lift, 0px)))`,
            willChange: "transform",
          }}
        >
          {/* Canvas - doors frames */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />

          {/* Presence: the sculpture, the line beneath it, and the field
              radiating from the pair — all three on one centre. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* The rings grow far past the sculpture, so they are given a box
                  of their own, centred on it and out of the flow. The sculpture
                  is then positioned in turn: a positioned box paints over a
                  static one whatever the order between them, and without this
                  the field would rise in front of the sculpture rather than
                  behind it. */}
              <div
                ref={haloRef}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: `calc(${presenceH} * ${HALO_BOX_W} * var(--presence-halo-k, 1))`,
                  height: `calc(${presenceH} * ${HALO_BOX_H} * var(--presence-halo-k, 1))`,
                  transform: "translate(-50%, -50%)",
                  opacity: 0,
                }}
              >
                <RadiantRings
                  cx={0}
                  cy={0}
                  rx={HALO_RX}
                  ry={HALO_RY}
                  viewBox={HALO_VIEW_BOX}
                  strokeWidth={HALO_STROKE}
                  rings={HALO_RINGS}
                  peak={HALO_PEAK}
                  reach={HALO_REACH}
                  growth={HALO_GROWTH}
                  paused={!haloLive}
                />
              </div>
              <Image
                ref={sculptureRef}
                src="/presence.png?v=3"
                alt="Presence sculpture"
                width={220}
                height={440}
                className="presence-img"
                style={{
                  position: "relative",
                  display: "block",
                  opacity: 0,
                  height: `calc(${presenceH} * ${PRESENCE_SIZE} * var(--presence-sculpture-k, 1))`,
                  marginTop: `calc(${presenceH} * ${+(1 - PRESENCE_SIZE).toFixed(4)})`,
                  width: "auto",
                  objectFit: "contain",
                }}
                priority
              />

              {/* The line the sculpture is given. It keeps its own fade — the
                  last of the three — but it is laid out with the sculpture, so
                  the ring is drawn round both and neither can drift out from
                  under it. */}
              <div
                ref={captionRef}
                style={{
                  position: "relative",
                  marginTop: `calc(${presenceH} * ${PRESENCE_ROOM})`,
                  opacity: 0,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  // A line's advance width carries the letter-spacing after its
                  // last glyph, which would leave the type half of that left of
                  // the centre line. Widening the box by the whole of it on the
                  // right puts both lines back on centre.
                  marginRight: "-0.2em",
                  fontFamily: "'Julius Sans One', sans-serif",
                  fontSize: "clamp(11px, 2vw, 20px)",
                  letterSpacing: "0.2em",
                  lineHeight: 1.8,
                  color: "#888",
                  fontWeight: 400,
                  textTransform: "uppercase",
                }}
              >
                We Give Form
                <br />
                To Presence
              </div>
            </div>
          </div>

          {/* Text 1 — clipped to the opening between the doors so it reads as
              being behind them. The layers span the canvas exactly, which is
              what lets the inset be given in canvas pixels. The outer one
              fades with Presence's beat; the inner one is the doors'. Their
              players write both, so React sets them once and never again. */}
          <div
            ref={text1OutRef}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <div
              ref={text1DoorsRef}
              style={{
                position: "absolute",
                inset: 0,
                clipPath: "inset(0 50% 0 50%)",
                WebkitClipPath: "inset(0 50% 0 50%)",
                opacity: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, calc(-50% + ${text1Rise}))`,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Julius Sans One', sans-serif",
                    fontSize: "clamp(11px, 2vw, 20px)",
                    letterSpacing: "0.2em",
                    color: "#888",
                    fontWeight: 400,
                    textTransform: "uppercase",
                  }}
                >
                  We Open The Doors Of Perception
                </span>
              </div>
            </div>
          </div>

          {/* The wash. It covers everything the section draws — the doors as
              well as the composition — so what leaves the screen is one white
              field rather than a sculpture fading off a dark ground. It sits
              inside the moving layer, which is overscanned past the viewport
              on both edges, so no strip of #202020 can show under it. Its
              strength is written by For Mind's player. */}
          <div
            ref={washRef}
            style={{
              position: "absolute",
              inset: 0,
              background: "#fff",
              opacity: 0,
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        </div>
      </div>
    </div>
  )
}
