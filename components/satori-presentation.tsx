import type React from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { SATORI, SATORI_RENDER } from "@/lib/satori"

/**
 * /body/satori, for now (2026-11-10, the author's asking): the collection's
 * four pendants one under the next, each a render of its model on the
 * collection's #202020 and a link to its own page, until the author's SVGs
 * arrive and the page is made a presentation like Second Wind's
 * (`body-presentation.tsx`). The renders are frames of the site's own viewer
 * in gold plating (see `lib/satori.ts`); their ground is exactly #202020, so
 * they meet the page with no edge.
 *
 * The four are drawn in proportion to one another (the author's asking, the
 * same day: so the difference in size shows), with no heights written. The
 * viewer fits every model to its stage, so in every render the pendant is the
 * same share of the picture, `METAL_SHARE` of its height (each was cut with
 * 18% of the pendant's height as ground above and below it), and a render
 * drawn `MM` px for each of the pendant's millimetres keeps them true to
 * each other: Satori I, 56 mm, stands well over twice Satori III, 23 mm.
 * The space between them is measured metal to metal (`GAP`), not picture to
 * picture, since the smaller ones carry less ground round them.
 */

const GROUND = "#202020"
const INK = "#E9E4DC"

/** Px per millimetre of the pendant: 8 on a computer, less on a narrow phone. */
const MM = "min(8px, 1.65vw)"
/** The pendant's share of its render's height (1 / 1.36: 18% of ground above and below). */
const METAL_SHARE = 1 / 1.36
/** The ground above and below the pendant, as a share of the render's height. */
const GROUND_SHARE = (1 - METAL_SHARE) / 2
/** From one pendant's metal to the next one's name, px. */
const GAP = 96
/** The renders are 3:4. */
const RENDER_ASPECT = "3 / 4"

export function SatoriPresentation() {
  const pendants = Object.entries(SATORI)
  return (
    <main className="w-full overflow-x-hidden min-h-screen" style={{ backgroundColor: GROUND }}>
      <Navigation bgColor={GROUND} />
      <div className="sp">
        <h1 className="sp-title">Satori</h1>
        {pendants.map(([slug, p]) => (
          <Link
            key={slug}
            href={`/body/satori/${slug}`}
            className="sp-item"
            style={{ "--mm-h": parseFloat(p.height) / METAL_SHARE } as React.CSSProperties}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SATORI_RENDER(slug)} alt={`${p.name}, a pendant from Satori, in gold`} loading="lazy" decoding="async" />
            <span className="sp-name">{p.name}</span>
          </Link>
        ))}
      </div>
      <BodyFooter activeLabel="body" />
      <style>{`
        .sp { display: flex; flex-direction: column; align-items: center; padding: 96px 20px 240px; }
        .sp-title { margin: 0 0 40px; padding-left: 0.2em; font-family: var(--font-heading); font-weight: 400;
          font-size: clamp(11px, 1.2vw, 15px); letter-spacing: 0.2em; line-height: 1.2; text-transform: uppercase; color: #d9d9d9; }
        .sp-item { --h: calc(var(--mm-h) * ${MM}); display: flex; flex-direction: column; align-items: center;
          margin-top: calc(${GAP * 0.6}px - var(--h) * ${GROUND_SHARE.toFixed(4)}); text-decoration: none; transition: opacity 150ms; }
        .sp-item:hover { opacity: 0.8; }
        .sp-item > img { display: block; height: var(--h); width: auto; aspect-ratio: ${RENDER_ASPECT}; }
        .sp-name { margin-top: calc(14px - var(--h) * ${GROUND_SHARE.toFixed(4)}); padding-left: 0.24em; font-family: var(--font-heading); font-size: 11px; line-height: 1.5;
          letter-spacing: 0.24em; text-transform: uppercase; color: ${INK}; }
        @media (min-width: 1024px) {
          .sp-item { margin-top: calc(${GAP}px - var(--h) * ${GROUND_SHARE.toFixed(4)}); }
          .sp-name { font-size: 12px; }
        }
      `}</style>
    </main>
  )
}
