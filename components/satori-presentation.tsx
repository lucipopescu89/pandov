import type React from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { SATORI } from "@/lib/satori"
import { SatoriSun } from "@/components/satori-sun"
import { SatoriCore } from "@/components/satori-core"
import { SatoriFlow } from "@/components/satori-flow"
import { SatoriPulse } from "@/components/satori-pulse"
import { SatoriBreath } from "@/components/satori-breath"

/**
 * /body/satori: the author's four Figma frames, "Satori 1" to "Satori 4"
 * (2026-11-11), one under the next as they stand in Figma, each a link to its
 * pendant's page. The frames were 1020 × 1125 in Figma; here they are 125%
 * of that (the author's asking, 2026-11-12; 150% from the evening of
 * 2026-11-11), 1275 wide, drawn one unit
 * to a pixel on a screen wide enough for the largest drawing (`WIDEST`), the
 * empty sides cropped, and shrunk with the page below that.
 *
 * The drawings are the author's own from 3ds Max, made into
 * `public/images/body/satori/drawing-<n>.svg` by `scripts/satori-drawings.py`
 * from the .ai export, with their true Bézier curves (the SVG export from Max
 * had them as straight facets), all four at one scale as they stand in Max
 * (the author's asking, the same day): each frame is its 210 mm square, so
 * Satori 4's sun nearly fills its frame and Satori 1's ring is under half.
 * They are files served as images, so the browser draws each once.
 *
 * The verses are set here as text, Julius Sans One 12px #888 centred, at the
 * frames' own height (`VERSE_TOP`, in the frame's units). In Figma all four
 * frames still had the first one's verse; these are the four lines the author
 * wrote into the drawings in Max, one to a pendant, a two-space gap in them
 * set as a break with a blank line, as the first frame has it.
 *
 * Over each drawing stands its pendant's photograph (`PHOTO_BOX`). Satori 4's
 * sun moves (`components/satori-sun.tsx`, the author's brief, the same
 * night): its nine star lines are drawn there, flowing outward in a noise.
 * Inside them its circles and the figure in meditation are hidden at rest,
 * circles radiating from the pendant in their place, and drawn by hand on a
 * hover over the pendant (`components/satori-core.tsx`, 2026-11-12).
 * Satori 3's drawing is hidden at rest too, great circles closing inward on
 * its pendant in its place ("expands inside", `components/satori-flow.tsx`),
 * and drawn by hand on a hover in the same way (the same day). Satori 2's
 * line of pulses is a light running round it (`components/satori-pulse.tsx`,
 * the same day), and its circles, seen only round the pendant's foot, are
 * seen whole three at a time as a wave radiates outward through them.
 * Satori 1 is its figure alone, breathing, its heart beating
 * (`components/satori-breath.tsx`, the same day), its frame's empty top cut
 * off (`CROP`) so it stands nearer its verse.
 *
 * Until 2026-11-11 this page was the four renders of the models
 * (`satori-<n>.avif`, still on disk and in `lib/satori.ts`), until these
 * drawings came.
 */

const GROUND = "#202020"
/** The drawings' frame, as `scripts/satori-drawings.py` writes it: the 210 mm square, 125% of Figma's 1020, and 105 over it for the verse. */
const FRAME_W = 1275
const FRAME_H = 1380
/**
 * The widest drawing, Satori 4's sun, in the frame's units. A screen wider
 * than this sees the frame at its own size, cropped at the sides where there
 * is nothing; a narrower one shrinks it so the sun still fits whole.
 */
const WIDEST = 1100

/**
 * Each pendant's photograph, cut out on transparency (`photo-<n>.avif`, by
 * `scripts/satori-photos.py`), laid over its drawing where the author has the
 * model in Max (2026-11-11, from four screenshots; the script's header tells
 * how): top, width, height in the frame's units, centred on `AXIS_X`. Over the drawing, so
 * the lines behind the pendant are hidden, as in Max. Measured in the 1530
 * frame (`BOX` in the script) and carried to the 1275 one with the drawings:
 * the square's foot stays the frame's foot and the 105 over it the verse's.
 */
const PHOTO_BOX: Record<string, [number, number, number]> = {
  "satori-1": [714.8, 93.9, 139.9],
  "satori-2": [676.7, 101.4, 179.1],
  "satori-3": [596.2, 212.8, 378.3],
  "satori-4": [621.2, 234.1, 288.2],
}
/**
 * The frame's vertical middle. Every drawing's own axis of symmetry is on it
 * to a hundredth of a unit, and every photograph is cut evenly about its
 * pendant's line (ring hole and body), so centring the photograph on it
 * puts pendant and drawing on one line (2026-11-11, the author's asking).
 */
const AXIS_X = FRAME_W / 2

/** The pendant whose sun moves: its stars are drawn by `SatoriSun`, and the rest of its drawing by `SatoriCore`. */
const SUN_SLUG = "satori-4"
/** The pendant with circles closing on it (`SatoriFlow`) and its drawing drawn on a hover (`SatoriCore`). */
const FLOW_SLUG = "satori-3"
/** The pendant whose pulse line is a light running round it, a wave radiating through its circles (`SatoriPulse`, which draws the whole drawing). */
const PULSE_SLUG = "satori-2"
/** The pendant whose figure breathes, its heart beating (`SatoriBreath`, which draws the whole drawing). */
const BREATH_SLUG = "satori-1"

/**
 * Empty frame cut off a frame's top, in its units, so its drawing and pendant
 * stand nearer its verse (2026-11-12, the author's asking: there was a gap
 * between the first verse and the first pendant). Satori 1's drawing is the
 * smallest, its great circle (seen on a hover) beginning 512 down; 300 off
 * leaves it about 80 under the verse. The verse keeps its place.
 */
const CROP: Record<string, number> = { "satori-1": 300 }

const VERSES: Record<string, { text: string; top: number }> = {
  "satori-1": { text: "the one who sits\n\nis complete", top: 88 },
  "satori-2": { text: "a pulse of sparks\n\nat the edge of mind", top: 53 },
  "satori-3": { text: "the one who sits\n\nexpands inside", top: 39 },
  "satori-4": { text: "and becomes the sun.", top: 39 },
}

export function SatoriPresentation() {
  const pendants = Object.entries(SATORI)
  return (
    <main className="w-full overflow-x-hidden min-h-screen" style={{ backgroundColor: GROUND }}>
      <Navigation bgColor={GROUND} />
      <div className="sp">
        {pendants.map(([slug, p], i) => {
          const verse = VERSES[slug]
          const crop = CROP[slug] ?? 0
          const link = (
            <Link
              key={slug}
              href={`/body/satori/${slug}`}
              className="sp-frame"
              aria-label={p.name}
              style={crop ? { position: "absolute", left: 0, width: "100%", top: `${(-crop / (FRAME_H - crop)) * 100}%` } : undefined}
            >
              {slug === FLOW_SLUG && <SatoriFlow />}
              {slug === SUN_SLUG || slug === FLOW_SLUG ? (
                <SatoriCore slug={slug} />
              ) : slug === PULSE_SLUG ? null : slug === BREATH_SLUG ? (
                <SatoriBreath />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/images/body/satori/drawing-${slug.split("-")[1]}.svg`}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              )}
              {slug === SUN_SLUG && <SatoriSun />}
              {slug === PULSE_SLUG && <SatoriPulse />}
              {PHOTO_BOX[slug] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="sp-photo"
                  src={`/images/body/satori/photo-${slug.split("-")[1]}.avif`}
                  alt={`${p.name}, a pendant from Satori`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  style={{
                    left: `${((AXIS_X - PHOTO_BOX[slug][1] / 2) / FRAME_W) * 100}%`,
                    top: `${(PHOTO_BOX[slug][0] / FRAME_H) * 100}%`,
                    width: `${(PHOTO_BOX[slug][1] / FRAME_W) * 100}%`,
                    height: `${(PHOTO_BOX[slug][2] / FRAME_H) * 100}%`,
                  }}
                />
              )}
              {verse && (
                <p className="sp-verse" style={{ top: `${((verse.top + crop) / FRAME_H) * 100}%` } as React.CSSProperties}>
                  {verse.text}
                </p>
              )}
            </Link>
          )
          return crop ? (
            <div key={slug} className="sp-crop" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H - crop}` }}>
              {link}
            </div>
          ) : (
            link
          )
        })}
      </div>
      <BodyFooter activeLabel="body" />
      <style>{`
        .sp { display: flex; flex-direction: column; align-items: center; padding: 24px 0 160px; overflow: hidden; }
        .sp-frame, .sp-crop { position: relative; display: block; flex: none; width: min(${FRAME_W}px, ${(FRAME_W / WIDEST) * 100}%); aspect-ratio: ${FRAME_W} / ${FRAME_H};
          text-decoration: none; }
        .sp-crop { overflow: hidden; }
        .sp-frame > img { position: absolute; inset: 0; width: 100%; height: 100%; transition: opacity 200ms; }
        .sp-frame > img.sp-photo { inset: auto; }
        .sp-frame:hover > img { opacity: 0.8; }
        .sp-verse { position: absolute; left: 0; right: 0; pointer-events: none; margin: 0; text-align: center; white-space: pre-line;
          font-family: "Julius Sans One", var(--font-heading); font-size: 12px; line-height: 14px; color: #888888; }
        @media (max-width: 600px) { .sp-verse { font-size: 10px; line-height: 12px; } }
      `}</style>
    </main>
  )
}
