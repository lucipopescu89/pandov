"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { RadiantRings } from "@/components/radiant-rings"

const FRAME_COUNT = 20

// Frame paths for the door animation. The files live in `public/frames/` and are
// exported on a #202020 background so they meet the header band seamlessly.
const FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/frames/Handler${String(i).padStart(4, "0")}.jpg`,
)

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
 * Choreography, expressed as distances in vh of scroll. Naming the durations
 * rather than the boundaries means a beat can be lengthened without hand-
 * retuning every number after it.
 *
 *   doors open ──┤ text 1: in ── hold ── out ┤ field ── presence ── line ┤ white
 *
 * Text 1 starts rising exactly as the sequence reaches frame 15, so its fade-in
 * overlaps the last of the door movement and completes just after it settles.
 */
const DOORS_VH = 120           // frames 0 → 19
const TEXT1_OUT_VH = 55        // fade back to black, after the hold
const TEXT1_RISE_PX = 60       // slow drift upward across its whole life

/**
 * Text 1 lives *behind* the doors: it is drawn over the canvas but clipped to
 * the opening between them, so it is revealed as they slide apart.
 *
 * The frames are opaque JPEGs, so nothing can be placed under them. What makes
 * the illusion work is that the opening renders as flat #202020, measured here
 * as [left, right] edges in percent of image width, frame 0 → 19.
 *
 * The right edge is NOT where the lit wood begins. Each door shows its own edge
 * face — its thickness — and that grows as it slides. On the left that face
 * catches light and is easy to find; on the right it is unlit and reads as the
 * same flat #202020 as the void behind it, so measuring brightness alone puts
 * the boundary too far right and the text spills onto the door.
 *
 * Since the doors travel symmetrically, the right edge is the mirror of the
 * left, `100 - left`, capped at the lit wood so it can never run past a surface
 * that is actually visible. Checked against the left face's measured width:
 * 7.31% vs 7.65% at frame 12, 9.00% vs 9.18% at frame 14.
 */
const GAP: [number, number][] = [
  [49.91, 50.09], [49.79, 50.21], [49.76, 50.24], [49.19, 50.81],
  [48.41, 51.59], [47.66, 52.34], [46.72, 53.28], [45.59, 54.41],
  [44.39, 55.61], [42.78, 57.22], [41.02, 58.98], [39.22, 60.78],
  [37.31, 62.69], [34.16, 65.84], [30.63, 69.37], [26.62, 73.38],
  [13.20, 86.80], [4.95, 93.89], [0, 99.96], [0, 99.96],
]

/** Source frame aspect, used to map gap percentages onto the drawn image. */
const FRAME_ASPECT = 2667 / 1500

// Text 1 is timed against frames rather than scroll, so it stays locked to the
// doors if the pacing above ever changes.
const T1_FIRST_FRAME = 5       // first glimmer through the crack
const T1_FIRST_OPACITY = 0.05
const T1_FULL_FRAME = 13       // fully lit
const T1_HOLD_UNTIL_FRAME = 17 // then begins to fade
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
 * The two tail beats. Both are counted in *eased* vh, and easeInOutCubic is
 * nearly flat as it approaches 1, so a beat at the very end of the section
 * buys several times its own number in real scrolling. At 20 + 45 the wheel
 * had to travel a full viewport height after "we give form to presence" was
 * lit before the section let go — which reads as the page having stalled
 * rather than as a frame being held. Shortening them costs nothing visible:
 * the 28px exit lift below still spreads across some 70vh of actual scroll.
 * Don't answer a stall here by trimming the beats above instead — those are
 * the ones you can see.
 */
const STILL_VH = 4             // everything holds, nothing moves
const EXIT_LEAD_VH = 8         // content starts lifting before the section unpins

/** Scroll position, in vh, at which the sequence reaches a given frame. */
const frameVh = (f: number) => (f / (FRAME_COUNT - 1)) * DOORS_VH

// Beat boundaries in vh, each one following from the last.
const T1_IN_START_VH = frameVh(T1_FIRST_FRAME)
const T1_IN_END_VH = frameVh(T1_FULL_FRAME)
const T1_OUT_START_VH = frameVh(T1_HOLD_UNTIL_FRAME)
const T1_OUT_END_VH = T1_OUT_START_VH + TEXT1_OUT_VH
const HALO_START_VH = T1_OUT_END_VH
const HALO_END_VH = HALO_START_VH + HALO_IN_VH
const PRESENCE_START_VH = HALO_START_VH + PRESENCE_DELAY_VH
const PRESENCE_END_VH = PRESENCE_START_VH + PRESENCE_IN_VH
const T2_START_VH = HALO_START_VH + TEXT2_DELAY_VH
const T2_END_VH = T2_START_VH + TEXT2_IN_VH

/**
 * The section is exactly as long as its beats need, plus the still beat and the
 * exit lead. Derived rather than fixed so lengthening any beat above can never
 * push the last one into the exit.
 */
const SCROLL_VH =
  Math.max(HALO_END_VH, PRESENCE_END_VH, T2_END_VH) + STILL_VH + EXIT_LEAD_VH

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
 * This one beat is counted in **real scrolling**, not in the eased vh every
 * beat above uses, and it is the only thing in the file that is. `ease` is
 * nearly flat this close to 1, so a beat written here buys several times its
 * own number in wheel — the 12 eased vh left after the line lands are already
 * some 520px of it. Written raw, 32 is 32: about three turns of a wheel to
 * wash a whole screen out, with the two turns before it holding the finished
 * composition still.
 */
const WHITE_OUT_VH = 32

/** vh of scroll → progress through the section (0 → 1). */
const v = (vh: number) => vh / SCROLL_VH

/** Where the wash begins, as a fraction of the section's *uneased* travel. */
const WHITE_OUT_FROM = 1 - WHITE_OUT_VH / SCROLL_VH

const FRAMES_END = v(DOORS_VH)

const TEXT1_IN_START = v(T1_IN_START_VH)
const TEXT1_IN_END = v(T1_IN_END_VH)
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

/** Continuous position in the frame sequence, 0 → FRAME_COUNT - 1. */
function framePos(p: number): number {
  const t = FRAMES_END > 0 ? clamp01(p / FRAMES_END) : 1
  return t * (FRAME_COUNT - 1)
}

/** Frame to draw for a given progress; holds the last frame after FRAMES_END. */
function frameFor(p: number): number {
  return Math.min(Math.round(framePos(p)), FRAME_COUNT - 1)
}

/** Gap edges at any point between frames, as fractions of image width. */
function gapAt(p: number): [number, number] {
  const f = framePos(p)
  const i = Math.min(Math.floor(f), FRAME_COUNT - 2)
  const t = clamp01(f - i)
  const [l0, r0] = GAP[i]
  const [l1, r1] = GAP[i + 1]
  return [(l0 + (l1 - l0) * t) / 100, (r0 + (r1 - r0) * t) / 100]
}

export function HeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<HTMLImageElement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  // The wash to white is the one beat driven by raw scroll — see WHITE_OUT_VH.
  const [rawProgress, setRawProgress] = useState(0)
  // 1 while the section is a full approach away from pinning, 0 once pinned.
  const [arrive, setArrive] = useState(1)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  // Mirrors `progress` for the resize handler, which is registered once and so
  // would otherwise close over the initial value forever.
  const progressRef = useRef(0)

  const setCanvasSize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Use the actual rendered size of the canvas element, not window size
    // This prevents distortion when CSS size != canvas internal resolution
    // offsetWidth/Height are layout sizes — unlike getBoundingClientRect they
    // ignore the settle/lift transform, so the backing resolution stays stable.
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(canvas.offsetWidth * dpr)
    canvas.height = Math.round(canvas.offsetHeight * dpr)
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(dpr, dpr)
  }

  const drawFrame = (frameIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const img = framesRef.current[frameIndex]
    if (!img || !img.complete || img.naturalWidth === 0) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    if (W === 0 || H === 0) return

    const scale = H / img.naturalHeight
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    const x = (W - w) / 2
    const y = 0

    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(img, x, y, w, h)
  }

  // Resize canvas — uses actual DOM size to avoid distortion
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      setCanvasSize()
      drawFrame(frameFor(progressRef.current))
    }
    // Use ResizeObserver for accurate size tracking including mobile chrome bar changes
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load all frames — frame 0 drawn immediately on load to avoid blank canvas
  useEffect(() => {
    setCanvasSize()

    let count = 0
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT)

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new window.Image()
      img.src = FRAME_URLS[i]
      img.onload = () => {
        count++
        imgs[i] = img
        framesRef.current = imgs
        // Draw frame 0 as soon as it's ready — no waiting for all frames
        if (i === 0) {
          drawFrame(0)
        }
        if (count === FRAME_COUNT) {
          setLoaded(true)
        }
      }
      imgs[i] = img
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Draw frame on canvas when progress changes
  useEffect(() => {
    if (!loaded) return
    drawFrame(frameFor(progress))
  }, [loaded, progress]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const eased = ease(raw)
      progressRef.current = eased
      setProgress(eased)
      setRawProgress(raw)

      // Distance still to travel before the sticky child pins, normalised.
      const pinTravel = el.offsetTop || 1
      setArrive(clamp01(rect.top / pinTravel))
      setViewport((prev) =>
        prev.w === window.innerWidth && prev.h === window.innerHeight
          ? prev
          : { w: window.innerWidth, h: window.innerHeight },
      )
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

  // Text 1 lights up from 5% at frame 5 to full at frame 13, holds to frame 17,
  // then fades. It is clipped to the opening, so it also gets *wider* as the
  // doors slide apart — the reveal is as much the clip as the opacity.
  const t1In = ramp(progress, TEXT1_IN_START, TEXT1_IN_END)
  const text1Opacity =
    (progress < TEXT1_IN_START
      ? 0
      : T1_FIRST_OPACITY + t1In * (1 - T1_FIRST_OPACITY)) *
    (1 - ramp(progress, TEXT1_OUT_START, TEXT1_OUT_END))

  // Drifts upward as you scroll: starts half a rise below centre, ends half a
  // rise above it, so the fully-lit stretch passes through the middle.
  const text1Rise =
    (0.5 - ramp(progress, TEXT1_IN_START, TEXT1_OUT_END)) * TEXT1_RISE_PX

  // The canvas draws each frame scaled to its height and centred, so the gap
  // percentages have to be mapped through that same fit to land on the doors.
  const canvasH = viewport.h + 2 * OVERSCAN_PX
  const drawnW = canvasH * FRAME_ASPECT
  const drawnLeft = (viewport.w - drawnW) / 2
  const [gapL, gapR] = gapAt(progress)
  const clipLeft = drawnLeft + gapL * drawnW
  const clipRight = drawnLeft + gapR * drawnW
  const text1Clip =
    viewport.w > 0
      ? `inset(0 ${Math.max(0, viewport.w - clipRight)}px 0 ${Math.max(0, clipLeft)}px)`
      : "inset(0 50% 0 50%)"

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

  // Content lags on the way in and leads on the way out. Cubed so the velocity
  // relative to the page reaches zero exactly at the pin and unpin boundaries.
  const entryShift = ENTRY_SETTLE_PX * Math.pow(arrive, 3)
  const exitShift =
    -EXIT_LIFT_PX * Math.pow(ramp(progress, 1 - v(EXIT_LEAD_VH), 1), 3)
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
                  height: presenceH,
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
              being behind them. The outer layer spans the canvas exactly, which
              is what lets the inset be given in canvas pixels. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: text1Clip,
              WebkitClipPath: text1Clip,
              opacity: text1Opacity,
              zIndex: 1,
              pointerEvents: "none",
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
