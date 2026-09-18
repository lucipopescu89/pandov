"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { RING_CLASS, type Radiant } from "@/lib/radiant"

/**
 * Seconds the light takes to cross the ornament, from the innermost contour to
 * the rim. This is the wave's speed, and nothing else: how often a new one sets
 * out is `FOLLOW` below, and the two are deliberately not the same number.
 */
const CROSS_S = 11.2

/**
 * How far the wave ahead has travelled when the next leaves the centre, as a
 * share of the crossing.
 *
 * At 1 the drawing carries one wave at a time, the next leaving the middle
 * exactly as this one reaches the rim. Below that they overlap: at 0.8 a second
 * sets out with a fifth of the first's journey still to run, so for that fifth
 * the ornament is working at both ends at once — a wave breaking at the rim
 * while another opens out of the centre.
 *
 * It works by letting the contours' delays run past one cycle and wrap. The ramp
 * of delays is 1 / FOLLOW cycles long, so that is how many bands are in the
 * drawing at any moment: 1.25 of them here.
 */
const FOLLOW = 0.8

/**
 * How many contours carry the light at once — the width of the band, counted in
 * contours rather than seconds, so it holds its look when the speed or the
 * spacing above is changed.
 */
const BAND = 3

/** What a contour keeps of its ink between waves, and at the peak of one. */
const FLOOR = 0.35
const PEAK = 1

/**
 * How much of the room to its neighbour a lit contour uses, as a share.
 *
 * Each contour arrives knowing how far it could swell before it met the one
 * outside it (`--g`, from `lib/radiant.ts`), and each has a different amount of
 * room: the two innermost are four units apart in a 722 box, the outermost two
 * nineteen. So every contour travels the same *share* of its own gap rather
 * than the same distance, and the whole drawing opens out by an equal-looking
 * step at every radius.
 *
 * At 0.9 a contour stops a tenth of the gap short of its neighbour — close
 * enough to read as almost touching, with a hair of daylight left. The
 * neighbour itself is a step behind in the wave and has not begun to move when
 * this one is at its widest, so the two never meet.
 */
const NEAR = 0.9

/** The ornament's own centre, measured across all fifteen contours. */
const CENTRE = 360.9

/**
 * Closing statement of the Chess Set page: the commission note on the left,
 * the radiant ornament on the right. The rosette at the centre of the radiant
 * turns continuously and speeds up with the scroll, so the drawing reads as a
 * mechanism rather than a static frame.
 *
 * The radiant itself is no longer a flat image: its fifteen contours arrive
 * ranked from the centre out (see `lib/radiant.ts`) and take the light in turn,
 * so a band climbs from the middle to the rim and begins again. It is Presence's
 * halo said in the only way this drawing allows — see the note in that file for
 * why its rings could not simply be copied here.
 */
export function ChessSetStatement({ radiant }: { radiant: Radiant }) {
  const rosetteRef = useRef<HTMLImageElement>(null)
  const rotationRef = useRef(0)
  const velocityRef = useRef(0)
  const lastScrollYRef = useRef(0)
  const animationFrameRef = useRef<number>(0)
  // Degrees per second at rest, and how hard scrolling drives it on top. Both
  // were taken to two fifths of what they were together, so the rosette turns
  // slower without changing character — scrolling still quickens it by the same
  // proportion of its own pace.
  const baseSpeed = 12
  const scrollBoost = 0.8

  /**
   * The rosette's angle is written straight to its element rather than held in
   * state. Through state this ran React over the whole section sixty times a
   * second, and every one of those passes rewrote the radiant's inlined SVG —
   * which threw away the fifteen contours and started their wave again from
   * zero, so the light never got anywhere. One number on one element per frame
   * costs the compositor a transform and React nothing at all.
   */
  useEffect(() => {
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      velocityRef.current *= 0.95
      const totalSpeed = baseSpeed + Math.abs(velocityRef.current) * scrollBoost
      rotationRef.current = (rotationRef.current + totalSpeed * deltaTime) % 360
      if (rosetteRef.current) {
        rosetteRef.current.style.transform = `rotate(${rotationRef.current}deg)`
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Seconds from one contour taking the light to the next — the wave's speed,
  // spread over the gaps between the contours rather than over the contours
  // themselves, since the light travels between them.
  const step = CROSS_S / (radiant.count - 1)
  // How often a contour lights again, which is how often a wave sets out.
  const cycle = CROSS_S * FOLLOW
  // The band's width, as the share of a cycle one contour spends lit.
  const lit = (BAND * step) / cycle

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollDelta = scrollY - lastScrollYRef.current
      lastScrollYRef.current = scrollY
      velocityRef.current += scrollDelta * 0.5
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <style>{`
        .statement-section {
          width: 100%;
          /* The 180px that used to close this section have come down to 100.
             The pieces that follow are photographed with a good deal of white
             above them — a third of the frame over the shorter pairs — and that
             white reads as part of the gap, so the room measured here is not the
             room the eye sees. */
          background-color: #fff;
          padding: 160px 0 100px;
        }
        .statement-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 80px;
        }
        .statement-text {
          flex: 0 1 420px;
          font-family: 'Julius Sans One', sans-serif;
        }
        .statement-lead {
          font-size: clamp(11px, 1.05vw, 14px);
          letter-spacing: 0.12em;
          line-height: 2.2;
          color: #888;
          text-transform: uppercase;
          margin: 0;
        }
        .statement-note {
          font-size: clamp(10px, 0.85vw, 12px);
          letter-spacing: 0.08em;
          line-height: 2.1;
          color: #aaa;
          margin: 48px 0 0;
        }
        .statement-rule {
          height: 1px;
          background-color: #e0e0e0;
          margin: 44px 0 0;
        }
        .statement-contact {
          display: inline-block;
          margin-top: 40px;
          font-family: 'Julius Sans One', sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #888;
          text-decoration: none;
          transition: opacity 0.3s ease;
        }
        .statement-contact:hover {
          opacity: 0.5;
        }
        /* Ornament — radiant frame with the rosette turning at its centre */
        .statement-ornament {
          position: relative;
          flex: 0 0 auto;
          width: clamp(300px, 38vw, 560px);
          aspect-ratio: 1 / 1;
        }
        .statement-radiant {
          width: 100%;
          height: 100%;
          display: block;
          /* The drawing used to be held at half ink. That half now lives in the
             wave below instead, which rests under it and peaks above it, so the
             lit band reads brighter than the frame ever was. */
          opacity: 1;
        }
        .statement-radiant svg {
          /* An SVG clips to its own box by default. The outermost contour sits
             on that edge, so it needs the clip lifted to swell like the rest —
             it reaches some fifteen pixels past the drawing at most, well inside
             the 80px this ornament keeps from the text beside it. */
          overflow: visible;
        }
        .${RING_CLASS} {
          transform-box: view-box;
          transform-origin: ${CENTRE}px ${CENTRE}px;
          animation: sr-wave ${cycle.toFixed(3)}s linear infinite;
          /* Rank 0 is the innermost contour and has to reach the peak first, so
             it runs the furthest ahead — a negative delay starts an animation
             that far into its cycle. The ramp is longer than one cycle here, and
             the surplus wraps: that wrap is the second wave. */
          animation-delay: calc((${radiant.count - 1} - var(--i)) * ${(-step).toFixed(4)}s);
          will-change: opacity, transform;
        }
        @keyframes sr-wave {
          0%   { opacity: ${FLOOR}; transform: scale(1); }
          /* Its own gap, less the hair NEAR leaves. The outermost carries
             --g: 1, so it brightens where it stands. */
          ${(lit * 35).toFixed(2)}%  { opacity: ${PEAK}; transform: scale(calc(1 + (var(--g) - 1) * ${NEAR})); }
          ${(lit * 100).toFixed(2)}%  { opacity: ${FLOOR}; transform: scale(1); }
          100% { opacity: ${FLOOR}; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* Held at the light's own average, so the drawing keeps its weight. */
          .${RING_CLASS} { animation: none; opacity: 0.5; }
        }
        .statement-rotita {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 42%;
          height: 42%;
          margin: -21% 0 0 -21%;
          opacity: 0.65;
        }
        @media (max-width: 900px) {
          .statement-section {
            padding: 90px 0 100px;
          }
          .statement-inner {
            flex-direction: column;
            align-items: center;
            gap: 64px;
            padding: 0 32px;
          }
          .statement-text {
            flex: 1 1 auto;
            max-width: 420px;
            text-align: center;
          }
          .statement-ornament {
            width: min(80vw, 420px);
          }
        }
      `}</style>

      <section className="statement-section">
        <div className="statement-inner">
          <div className="statement-text">
            <p className="statement-lead">
              Reduced to what is essential, each piece holds just enough material to exist.
            </p>
            <p className="statement-note">
              Every edition is produced to order. Dimensions, materials and finishes
              are defined with each commission. Pricing is available upon request.
            </p>
            <div className="statement-rule" />
            <Link href="/contact" className="statement-contact">
              Contact
            </Link>
          </div>

          <div className="statement-ornament">
            {/* Radiant frame — its contours take the light in turn, inside out */}
            <div
              className="statement-radiant"
              dangerouslySetInnerHTML={{ __html: radiant.html }}
            />
            {/* Rosette — turns with the scroll, centred on the radiant */}
            <img
              ref={rosetteRef}
              src="/images/desen-rotita.svg"
              alt=""
              className="statement-rotita"
              style={{ transformOrigin: "center center" }}
            />
          </div>
        </div>
      </section>
    </>
  )
}
