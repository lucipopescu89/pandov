"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

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
 *   doors open ──┤ text 1: in ── hold ── out ┤ dark ┤ presence ── text 2
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
const DARK_GAP_VH = 12         // empty beat before the presence
const PRESENCE_IN_VH = 32      // fade + scale up
const TEXT2_DELAY_VH = 12      // text 2 trails the presence
const TEXT2_IN_VH = 26
const STILL_VH = 20            // everything holds, nothing moves
const EXIT_LEAD_VH = 45        // content starts lifting before the section unpins

/** Scroll position, in vh, at which the sequence reaches a given frame. */
const frameVh = (f: number) => (f / (FRAME_COUNT - 1)) * DOORS_VH

// Beat boundaries in vh, each one following from the last.
const T1_IN_START_VH = frameVh(T1_FIRST_FRAME)
const T1_IN_END_VH = frameVh(T1_FULL_FRAME)
const T1_OUT_START_VH = frameVh(T1_HOLD_UNTIL_FRAME)
const T1_OUT_END_VH = T1_OUT_START_VH + TEXT1_OUT_VH
const PRESENCE_START_VH = T1_OUT_END_VH + DARK_GAP_VH
const PRESENCE_END_VH = PRESENCE_START_VH + PRESENCE_IN_VH
const T2_START_VH = PRESENCE_START_VH + TEXT2_DELAY_VH
const T2_END_VH = T2_START_VH + TEXT2_IN_VH

/**
 * The section is exactly as long as its beats need, plus the still beat and the
 * exit lead. Derived rather than fixed so lengthening any beat above can never
 * push the last one into the exit.
 */
const SCROLL_VH =
  Math.max(PRESENCE_END_VH, T2_END_VH) + STILL_VH + EXIT_LEAD_VH

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

/** vh of scroll → progress through the section (0 → 1). */
const v = (vh: number) => vh / SCROLL_VH

const FRAMES_END = v(DOORS_VH)

const TEXT1_IN_START = v(T1_IN_START_VH)
const TEXT1_IN_END = v(T1_IN_END_VH)
const TEXT1_OUT_START = v(T1_OUT_START_VH)
const TEXT1_OUT_END = v(T1_OUT_END_VH)

/** Presence and its caption only begin once text 1 is fully back to black. */
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

  // Presence follows only after text 1 has gone. Scrolling back up reverses it.
  const presenceProgress = ramp(progress, PRESENCE_IN_START, PRESENCE_IN_END)
  const presenceScale = 0.65 + presenceProgress * (1 - 0.65)  // 0.65 → 1.0
  const presenceOpacity = presenceProgress

  const text2Opacity = ramp(progress, TEXT2_IN_START, TEXT2_IN_END)

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

          {/* Presence PNG — on desktop shifted up by 25% of its own height */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: presenceOpacity,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <Image
              src="/presence.png?v=3"
              alt="Presence sculpture"
              width={220}
              height={440}
              className="presence-img"
              style={{
                height: `calc(55vh * ${presenceScale})`,
                width: "auto",
                objectFit: "contain",
                transform: "translateY(calc(-25% + 40px))",
              }}
              priority
            />
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

          {/* Text 2 - below presence */}
          <div
            style={{
              position: "absolute",
              bottom: "18%",
              left: "50%",
              transform: "translateX(-50%)",
              opacity: text2Opacity,
              zIndex: 3,
              pointerEvents: "none",
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
              We Give Form To Presence
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
