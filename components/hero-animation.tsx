"use client"

import { useEffect, useRef, useState } from "react"
import { preload } from "react-dom"
import Image from "next/image"
import { RadiantRings } from "@/components/radiant-rings"

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
 * They start once the section stands in place, when the top of the frames
 * reaches the top of the screen, and open at their own pace, DOORS_S from the
 * first frame to the last, whatever the hand does next. Scrolled back until
 * the top of the frames leaves the top of the screen, they close the same way.
 * For an afternoon the first turn of the wheel set them going, while the
 * section was still rising into place; the author asked for them to wait for
 * it.
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
 * A scroll that outruns them drags them along instead of leaving them behind
 * (DOORS_CATCH_S), so they are always open by the end of DOORS_ROOM_VH, where
 * text 1 starts to fade. Between two frames the next is faded in over the last
 * (see `paint`), so the frames read as a movement rather than as pictures.
 *
 * 1.6s for the render of 2026-09-29, about 24 frames a second. Its doors open
 * (19 → 38) in 0.8s of it, as fast as the old twenty frames opened them in
 * their 1.2s, and the handles have the 0.8s before to turn in.
 */
const DOORS_S = 1.6
/** How quickly the doors catch up with a scroll that has got ahead of them, s. */
const DOORS_CATCH_S = 0.08
/**
 * Real scrolling, after the section pins, before text 1 starts to fade: about
 * four turns of the wheel on a 900px screen. The doors open inside it, and
 * text 1 comes up with them and holds. It was 30 while the doors took 1.2s,
 * and grew with them, so text 1 is lit for as long as it was.
 *
 * Only its second half can hurry the doors. A hand turning the wheel every
 * half second reaches it with them over a third of the way, and at most their
 * last frames, where they leave the picture, are hurried; a slower hand never
 * pulls them at all. With the pull spread over the whole room, the first turn
 * after the pin could throw them half-way at once, and then they slowed to
 * their own pace: a lurch. It was 12 while the doors opened during the
 * approach to the pin, which gave them the three turns of the menu and the
 * band under it.
 */
const DOORS_ROOM_VH = 40

/**
 * Choreography, expressed as distances in vh of scroll. Naming the durations
 * rather than the boundaries means a beat can be lengthened without hand-
 * retuning every number after it.
 *
 *   doors open ──┤ text 1: in ── hold ── out ┤ field ── presence ── line ┤ white
 *
 * The doors and text 1's first half are no longer on this line; they are
 * played (see DOORS_S). The line still starts with the doors' 120 vh, but the
 * section enters it where text 1 begins to fade, as it ends before its run-on
 * (TAIL_VH): only for the shape of the curve, so every beat from text 1's fade
 * on lands exactly where the author approved it.
 */
const DOORS_VH = 120           // the old twenty frames, when they were scrolled
const TEXT1_OUT_VH = 55        // fade back to black, after the hold
const TEXT1_RISE_PX = 60       // slow drift upward across its whole life

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
// they are played. It fades against the scroll. Its two frames are where the
// opening is as wide as it was at the old frames 5 and 13.
const T1_FIRST_FRAME = 20      // first glimmer through the crack
const T1_FIRST_OPACITY = 0.05
const T1_FULL_FRAME = 32       // fully lit
/**
 * The last beat arrives in three, not at once: the field out of the dark
 * first, then the sculpture standing in it, then the line under it. Each one
 * starts while the one before is still coming up and takes a little longer to
 * finish, so what you read is something opening rather than something
 * switching on.
 *
 * Both delays are counted from the field, which opens the beat the moment
 * text 1 has gone black — it takes over the empty beat that used to sit there.
 *
 * **These are floors, not preferences.** A beat is worth staggering only if a
 * turn of the wheel can land inside it, and a wheel notch is about 100px of
 * scroll. This stretch of the section runs at roughly 5px of real scrolling
 * per vh, so anything under about 20vh apart arrives, to a hand on a mouse, at
 * the same instant — which is what a first pass at 7vh did. 18 and 40 put a
 * notch between the field and the sculpture and two between the field and the
 * line. Don't tighten them back without checking at 100px steps rather than at
 * 10px ones; the fine sweep shows a cascade that nobody scrolling can see.
 *
 * Only the fades are staggered. The scale is shared, because the ring is drawn
 * at a fixed distance from the sculpture: letting the two grow on different
 * curves would pull the composition apart while it arrives.
 */
const HALO_IN_VH = 22          // the field, first
const PRESENCE_DELAY_VH = 18   // the sculpture trails it by a notch
const PRESENCE_IN_VH = 28
const TEXT2_DELAY_VH = 40      // and the line by another
const TEXT2_IN_VH = 34

/**
 * How far the eased timeline runs on past the line. None of it is played: the
 * section lets go before it gets there (see SCROLL_VH). It is here for the
 * shape of the curve, because easeInOutCubic is nearly flat as it approaches
 * 1. With no run-on, the line would land right on that flat end and take
 * several turns of the wheel to finish lighting.
 *
 * It was two beats until 2026-09-28, 4 held still and 8 for the exit lift, and
 * the section played them out to the end. Being eased, those 12 vh cost some
 * 57 vh of real scrolling after the line was lit, about five turns of the wheel
 * before the screen was white. The author asked for the exit to be quicker.
 * Shortening the run-on was not the way: it slides the line onto the flatter
 * part of the curve, and its fade grows by nearly what the tail loses. So the
 * run-on is kept, every beat up to the line is exactly where it was, and only
 * the end moved. Don't answer a stall here by trimming the beats above
 * instead: those are the ones you can see.
 */
const TAIL_VH = 12

// Beat boundaries in vh, each one following from the last. Text 1 began to
// fade where the old frame 17 of 20 fell on the curve.
const T1_OUT_START_VH = (17 / 19) * DOORS_VH
const T1_OUT_END_VH = T1_OUT_START_VH + TEXT1_OUT_VH
const HALO_START_VH = T1_OUT_END_VH
const HALO_END_VH = HALO_START_VH + HALO_IN_VH
const PRESENCE_START_VH = HALO_START_VH + PRESENCE_DELAY_VH
const PRESENCE_END_VH = PRESENCE_START_VH + PRESENCE_IN_VH
const T2_START_VH = HALO_START_VH + TEXT2_DELAY_VH
const T2_END_VH = T2_START_VH + TEXT2_IN_VH

/** Where the last beat is fully up, and the eased timeline with its run-on. */
const LAST_VH = Math.max(HALO_END_VH, PRESENCE_END_VH, T2_END_VH)
const TIMELINE_VH = LAST_VH + TAIL_VH

/** The inverse of `ease`: where in the scrolling an eased value falls. */
function uneased(p: number): number {
  return p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2
}

/**
 * Vertical easing at the section's two edges, in px of content travel.
 *
 * A sticky section otherwise snaps between two states: the page scrolls, then
 * it abruptly holds; at the end it abruptly resumes. These let the content keep
 * moving a little into the pin and start moving a little before the unpin, so
 * the eye reads a deceleration rather than a stop. Both use a cubic curve,
 * which reaches zero velocity exactly at the boundary.
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
 * `components/categories-section.tsx` picks the screen up from there and holds
 * For Mind still while it comes out of the same white, so the two read as one
 * dissolve rather than as two sections meeting.
 *
 * The exit is counted in **real scrolling**, not in the eased vh every beat
 * above uses. From the moment the line is fully lit, HOLD is a turn of the
 * wheel with the finished composition on screen, and WHITE_OUT is two more
 * washing it to white. A turn is about 100px, some 11 vh on a 900px screen.
 * Until 2026-09-28 the exit was 25 vh held and 32 washing, about five turns
 * from the line to white; the author asked for it to be quicker.
 */
const HOLD_VH = 12
const WHITE_OUT_VH = 24

/** vh of the eased timeline → progress through it (0 → 1). */
const v = (vh: number) => vh / TIMELINE_VH

/**
 * Where the section enters the curve, in its own uneased terms: text 1
 * starting to fade. Everything before it is the doors' and is played.
 */
const ENTRY_U = uneased(v(T1_OUT_START_VH))

/**
 * The section's real scrolling: the doors' room, then the curve from its entry
 * to where the line is fully lit, worked back through the curve, then the hold
 * and the wash. It lets go there, before the timeline has run out. Derived
 * rather than fixed so lengthening any beat above can never push the last one
 * into the exit.
 */
const LIT_VH =
  DOORS_ROOM_VH + TIMELINE_VH * (uneased(v(LAST_VH)) - ENTRY_U)
const SCROLL_VH = LIT_VH + HOLD_VH + WHITE_OUT_VH

/** Real scrolling at which text 1 has gone back to black: the end of its rise. */
const T1_GONE_VH =
  DOORS_ROOM_VH + TIMELINE_VH * (uneased(v(T1_OUT_END_VH)) - ENTRY_U)

/** Where the wash begins, as a fraction of the section's real scrolling. */
const WHITE_OUT_FROM = 1 - WHITE_OUT_VH / SCROLL_VH

const TEXT1_OUT_START = v(T1_OUT_START_VH)
const TEXT1_OUT_END = v(T1_OUT_END_VH)

/** None of the three begins until text 1 is fully back to black. */
const HALO_IN_START = v(HALO_START_VH)
const HALO_IN_END = v(HALO_END_VH)
const PRESENCE_IN_START = v(PRESENCE_START_VH)
const PRESENCE_IN_END = v(PRESENCE_END_VH)
const TEXT2_IN_START = v(T2_START_VH)
const TEXT2_IN_END = v(T2_END_VH)

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

export function HeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Text 1's clip to the opening and its fade in, which belong to the doors
  // and are written by their player (see `paint`), not by React.
  const text1DoorsRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  // The wash to white is the one beat driven by raw scroll — see WHITE_OUT_VH.
  const [rawProgress, setRawProgress] = useState(0)
  // 1 while the section is a full approach away from pinning, 0 once pinned.
  const [arrive, setArrive] = useState(1)

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
    let floor = 0 // how far the scroll alone would have them by now
    let primed = false
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
      if (open) {
        pos = Math.min(1, pos + dt / DOORS_S)
        // A scroll that has got ahead pulls them after it, quickly but
        // without a jump.
        if (pos < floor) {
          pos += (floor - pos) * (1 - Math.exp(-dt / DOORS_CATCH_S))
          if (floor - pos < 0.001) pos = floor
        }
      } else {
        pos = Math.max(0, pos - dt / DOORS_S)
      }
      paint()
      if (moving()) raf = requestAnimationFrame(tick)
    }

    const play = () => {
      if (!ready || raf || !moving()) return
      last = 0
      raf = requestAnimationFrame(tick)
    }

    const measure = () => {
      const top = el.getBoundingClientRect().top
      // Where the top of the frames stands on the screen. The canvas reaches
      // OVERSCAN_PX above the section and lags behind it as it arrives, by
      // the same settle the render below gives it.
      const arrive = clamp01(top / (el.offsetTop || 1))
      open = top - OVERSCAN_PX + ENTRY_SETTLE_PX * Math.pow(arrive, 3) <= 0
      // The second half of the doors' room, see DOORS_ROOM_VH.
      const half = (DOORS_ROOM_VH * window.innerHeight) / 200
      floor = clamp01((-top - half) / half)
      if (!primed) {
        // A page that opens part-way down, restored or followed from a link,
        // finds the doors already open rather than opening them out of sight.
        primed = true
        pos = open ? 1 : 0
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
      cancelAnimationFrame(raf)
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

  // The first frame is what the hero shows until the wheel turns, so the page
  // asks for it with the document rather than once the script has run.
  preload(FRAME_URLS[0], { as: "image", fetchPriority: "high" })

  // Track scroll progress
  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = -rect.top
      // A zero or negative `total` means the container has no scrollable range
      // yet; treat that as "not started" instead of dividing by it.
      const raw = total > 0 ? clamp01(scrolled / total) : 0
      // The doors' room is played, not scrolled, so the section enters the
      // curve after it (see ENTRY_U); and it lets go before the curve runs
      // out (see SCROLL_VH), so it only ever plays its own share of it.
      const eased = ease(
        ENTRY_U + Math.max(0, raw * SCROLL_VH - DOORS_ROOM_VH) / TIMELINE_VH,
      )
      setProgress(eased)
      setRawProgress(raw)

      // Distance still to travel before the sticky child pins, normalised.
      const pinTravel = el.offsetTop || 1
      setArrive(clamp01(rect.top / pinTravel))
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

  // Text 1 fades with the scroll; its coming up is the doors' (see `paint`).
  const text1Out = ramp(progress, TEXT1_OUT_START, TEXT1_OUT_END)

  // Drifts upward as you scroll: starts half a rise below centre as the
  // section pins, and ends half a rise above it as the text goes.
  const text1Rise =
    (0.5 - ramp(rawProgress * SCROLL_VH, 0, T1_GONE_VH)) * TEXT1_RISE_PX

  // The beat follows only after text 1 has gone, and comes up in three.
  // Scrolling back up reverses all of it.
  const haloOpacity = ramp(progress, HALO_IN_START, HALO_IN_END)
  const presenceProgress = ramp(progress, PRESENCE_IN_START, PRESENCE_IN_END)
  const presenceOpacity = presenceProgress
  const captionOpacity = ramp(progress, TEXT2_IN_START, TEXT2_IN_END)
  const whiteOut = ramp(rawProgress, WHITE_OUT_FROM, 1)

  // One scale for the whole composition, taken from the sculpture's own
  // arrival. The halo is sized in multiples of this height, so the field and
  // the sculpture grow together however differently the two of them light up.
  const presenceScale = 0.65 + presenceProgress * (1 - 0.65)  // 0.65 → 1.0
  const presenceH = `calc(${PRESENCE_VH}vh * ${presenceScale})`

  // Content lags on the way in and leads on the way out, lifting as it washes
  // to white. Cubed so the velocity relative to the page reaches zero exactly
  // at the pin and unpin boundaries.
  const entryShift = ENTRY_SETTLE_PX * Math.pow(arrive, 3)
  const exitShift = -EXIT_LIFT_PX * Math.pow(whiteOut, 3)
  const shift = entryShift + exitShift

  return (
    // Container height = 1 sticky screen + SCROLL_VH of scroll to drive it.
    <div ref={containerRef} style={{ height: `${100 + SCROLL_VH}vh`, position: "relative" }}>
      {/* Sticky viewport */}
      <div
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
          style={{
            position: "absolute",
            top: -OVERSCAN_PX,
            bottom: -OVERSCAN_PX,
            left: 0,
            right: 0,
            transform: `translateY(${shift}px)`,
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
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: `calc(${presenceH} * ${HALO_BOX_W})`,
                  height: `calc(${presenceH} * ${HALO_BOX_H})`,
                  transform: "translate(-50%, -50%)",
                  opacity: haloOpacity,
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
                  // Nothing of this beat is on screen while the doors are still
                  // opening, and that is the stretch the page can least spare.
                  paused={haloOpacity === 0}
                />
              </div>
              <Image
                src="/presence.png?v=3"
                alt="Presence sculpture"
                width={220}
                height={440}
                className="presence-img"
                style={{
                  position: "relative",
                  display: "block",
                  opacity: presenceOpacity,
                  height: `calc(${presenceH} * ${PRESENCE_SIZE})`,
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
                style={{
                  position: "relative",
                  marginTop: `calc(${presenceH} * ${PRESENCE_ROOM})`,
                  opacity: captionOpacity,
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
              fades with the scroll; the inner one is the doors', and its clip
              and light are written by their player, so React sets them once,
              shut, and never again. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1 - text1Out,
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
                  transform: `translate(-50%, calc(-50% + ${text1Rise}px))`,
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
              on both edges, so no strip of #202020 can show under it. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#fff",
              opacity: whiteOut,
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        </div>
      </div>
    </div>
  )
}
