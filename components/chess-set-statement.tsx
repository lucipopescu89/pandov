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
 *
 * That is the figure the drawing keeps while the page is still. The scroll
 * carries it well past 1 and the lines do then cross — see `DRIVE_NEAR`.
 */
const NEAR = 0.9

/**
 * What the reader's scroll adds to the two figures above.
 *
 * The rosette at the centre already quickened under the hand while the contours
 * around it kept one pace whatever happened, and the drawing read as two
 * mechanisms sharing a centre rather than as one. They now run off the same
 * velocity: while the page is moving the wave travels faster and every contour
 * opens further into its own gap, and both ebb back to their resting figures
 * within about a second of the page coming to rest.
 *
 * The drive is `v / (v + DRIVE_HALF)` — a share, never a multiple, and a very
 * steep one: an easy turn of the wheel already stands at four fifths of it, and
 * a hard flick spends the last fifth. The drawing has two readings and a short
 * road between them — held, and driven — which is what was asked of it. Measured
 * in the page: at rest a contour takes 0.9 of its gap, on an easy scroll 1.8, on
 * a hard one 2.0, and there is nothing past 2.03 for a flick to find.
 *
 * Note that a jump — `scrollTo`, an anchor, the browser restoring a position —
 * arrives as one enormous delta and drives the ornament as hard as anything a
 * hand can do. That is left alone: a page that has just been thrown somewhere is
 * exactly when the drawing may as well be at full tilt.
 */
const DRIVE_HALF = 12
/** Turns of speed added at the top of the drive; 1 would be twice the pace. */
const DRIVE_RATE = 3.2
/**
 * Share of its own gap a contour takes at the top of the drive, over NEAR.
 *
 * Past 1 — which a driven contour is, well past — it does not stop at the gap
 * but crosses where its neighbour rests. That is deliberate and it is what makes
 * the drive legible: at rest each contour holds its lane, and under the hand the
 * lit band gathers and rides over the lines ahead of it. The band is three
 * contours wide, so the neighbour being crossed is itself already rising, and
 * the two swell together rather than one cutting through a line that is standing
 * still. The outermost reaches some way past the artwork's own box; the section
 * lifts the clip for it, and the room this ornament keeps from the text beside
 * it absorbs the rest.
 */
const DRIVE_NEAR = 1.13

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
 * so a band climbs from the middle to the rim and begins again. That band answers
 * to the scroll as the rosette does — faster, and opening further, while the page
 * is moving. It is Presence's halo said in the only way this drawing allows —
 * see the note in that file for why its rings could not simply be copied here.
 */
export function ChessSetStatement({ radiant }: { radiant: Radiant }) {
  const rosetteRef = useRef<HTMLImageElement>(null)
  const ornamentRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(0)
  const velocityRef = useRef(0)
  /** The share of the drive last written out, so a still page writes nothing. */
  const driveRef = useRef(-1)
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

    /**
     * The fifteen contours' own animations, taken on the first frame — by then
     * the section has been painted once and the browser has certainly made
     * them.
     *
     * Their speed is changed through `playbackRate`, not by rewriting
     * `animation-duration`: the duration is what every contour's delay is
     * measured against, so rewriting it would throw all fifteen to new points of
     * the cycle and scatter the band. A playback rate leaves each animation
     * exactly where it stands and only carries it on faster, so the wave keeps
     * its shape and simply quickens.
     *
     * A reader who has asked the system for reduced motion has no animations
     * here at all, and this stays empty for the life of the page.
     */
    let rings: Animation[] | null = null

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      if (!rings) {
        rings = Array.from(
          ornamentRef.current?.querySelectorAll<SVGPathElement>(`.${RING_CLASS}`) ?? [],
        ).flatMap((ring) => ring.getAnimations())
      }

      velocityRef.current *= 0.95
      const speed = Math.abs(velocityRef.current)
      const totalSpeed = baseSpeed + speed * scrollBoost
      rotationRef.current = (rotationRef.current + totalSpeed * deltaTime) % 360
      if (rosetteRef.current) {
        rosetteRef.current.style.transform = `rotate(${rotationRef.current}deg)`
      }

      // The same velocity the rosette turns on, read as a share of the drive
      // rather than as a number of degrees.
      const drive = speed / (speed + DRIVE_HALF)
      // Written only once it has actually moved. The rate reaches fifteen
      // animations and the share fifteen elements' styles; on a still page it is
      // the same figure frame after frame, and not worth a recalculation apiece.
      if (Math.abs(drive - driveRef.current) > 0.002) {
        driveRef.current = drive
        const rate = 1 + DRIVE_RATE * drive
        for (const ring of rings) ring.playbackRate = rate
        ornamentRef.current?.style.setProperty("--sr-near", (NEAR + DRIVE_NEAR * drive).toFixed(3))
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
          /* How much of its gap a lit contour takes: NEAR while the page is
             still, driven up from the scroll loop below. It is written here,
             once, rather than on each contour — the fifteen inherit it, so a
             frame of drive costs one property write. */
          --sr-near: ${NEAR};
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
          /* Its own gap, less the hair the share above leaves. That share is a
             variable and not a number because the scroll moves it; the outermost
             carries --g: 1, so it brightens where it stands whatever it is. */
          ${(lit * 35).toFixed(2)}%  { opacity: ${PEAK}; transform: scale(calc(1 + (var(--g) - 1) * var(--sr-near))); }
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

          <div className="statement-ornament" ref={ornamentRef}>
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
