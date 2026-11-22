import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { SpaceGallery } from "@/components/space-gallery"
import { SpaceChoice, SpaceFinishLines, SpaceOrder } from "@/components/space-order"
import { STUDIO_EMAIL } from "@/lib/second-wind"
import type { SpacePiece } from "@/lib/space"
import { u } from "@/lib/canvas-length"
import { JULIUS_MIN, TEXT_MIN, TEXT_TRACK, TRACK } from "@/lib/type"

/*
 * A piece of Space on a page of its own (2026-11-22, Heavy Light first): the
 * pendant's page (`pendant-page.tsx`) in its grammar and at its lengths, so a
 * visitor who has seen one knows the other. Under the menu, the statement in
 * quotation marks; then the gallery, and beside it the name, its line, the
 * finishes and the price, ORDER and "Ask a question", and what the piece is:
 * its size, wood, light, cable (its length the client's, 2026-11-22) and making.
 * Last, the way back to Space. There is no "More from" while Space has one
 * piece; when it has more, the pendants' row is the one to bring over.
 *
 * Its own copy of the pendant page's lengths rather than a share of its file,
 * so a change asked for on one does not move the other unasked.
 */

const GROUND = "#202020"
const INK = "#E9E4DC"
const TEXT = "#8E8982"
const MUTED = "#7C7770"
const RULE = "#343230"
const NAME_SIZE = "clamp(11px, 2vw, 20px)"
const fit = (n: number, floor: number) => `clamp(${floor}px, ${((n / 1920) * 100).toFixed(4)}vw, ${n}px)`
const AIR = { computer: 230 + 189.3, phone: 40 + 32 }
const SLACK = { computer: 42.6, phone: 34.5 }

export function SpacePiecePage({ piece }: { piece: SpacePiece }) {
  const { name, statement, line, price, size, light, cable, photos, model, modelThumb, finishes } = piece
  const last = statement.length - 1
  return (
    <main className="w-full" style={{ backgroundColor: GROUND, color: TEXT }}>
      <Navigation bgColor={GROUND} />
      <div className="sp">
        <p className="sp-statement">
          {statement.map((words, i) => (
            <span key={i}>
              {i === 0 && "“"}
              {words}
              {i === last ? "”" : " "}
            </span>
          ))}
        </p>

        <SpaceChoice>
          <div className="sp-row">
            <SpaceGallery name={name} photos={photos} model={model} modelThumb={modelThumb} finishes={finishes} />
            <section className="sp-info">
              <h1 className="sp-name">{name}</h1>
              <p className="sp-line">{line}</p>
              <SpaceOrder name={name} collection="Space" finishes={finishes} price={price} email={STUDIO_EMAIL} />
              <dl className="sp-details">
                <div>
                  <dt>Size</dt>
                  <dd>{size}</dd>
                </div>
                <div>
                  <dt>Wood</dt>
                  <dd>
                    <SpaceFinishLines finishes={finishes} of="wood" />
                  </dd>
                </div>
                <div>
                  <dt>Light</dt>
                  <dd>
                    {light.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Cable</dt>
                  <dd>
                    {cable.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Made</dt>
                  <dd>
                    <SpaceFinishLines finishes={finishes} of="made" />
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </SpaceChoice>

        <section className="sp-end">
          <Link href="/space" className="sp-back">
            &larr; Back to collection
          </Link>
        </section>
      </div>
      <BodyFooter activeLabel={null} />

      <style>{`
        .sp { max-width: 1920px; margin: 0 auto; }
        .sp-statement { max-width: 560px; margin: ${(AIR.phone - SLACK.phone) / 2}px auto 0; padding: 0 28px 0 calc(28px + ${TRACK}); text-align: center; text-wrap: balance;
          font-family: var(--font-heading); font-size: 12px; line-height: 2.5; letter-spacing: ${TRACK}; color: ${TEXT}; }
        .sp-statement > span { display: block; }
        .sp-row { margin-top: ${(AIR.phone + SLACK.phone) / 2}px; }
        .sp-info { max-width: 560px; margin: 40px auto 0; padding: 0 24px; }
        .sp-name { font-family: var(--font-heading); font-weight: 400; font-size: ${NAME_SIZE}; line-height: 1; letter-spacing: ${TRACK}; color: ${INK}; }
        .sp-line { margin: 14px 0 32px; font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; line-height: 1.3; letter-spacing: ${TEXT_TRACK}; color: ${TEXT}; }
        .sp-details { margin-top: 36px; }
        .sp-details > div { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 14px 0 12px; border-top: 1px solid ${RULE}; }
        .sp-details dt { flex: none; font-family: var(--font-heading); font-size: ${JULIUS_MIN}px; line-height: 1; letter-spacing: ${TRACK}; text-transform: uppercase; color: ${MUTED}; }
        .sp-details dd { margin-top: 1px; font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; letter-spacing: ${TEXT_TRACK}; line-height: 1.7333; text-align: right; color: ${TEXT}; }
        .sp-details dd > span { display: block; }
        .sp-end { margin: 72px 16px 0; padding: 0 0 40px; border-top: 1px solid ${RULE}; text-align: center; }
        .sp-back { display: inline-block; margin-top: 56px; padding: 12px 16px 12px calc(16px + ${TRACK}); font-family: var(--font-heading); font-size: 11px;
          line-height: 1; letter-spacing: ${TRACK}; text-transform: uppercase; white-space: nowrap; color: ${TEXT}; text-decoration: none; transition: opacity 150ms; }
        .sp-back:hover { opacity: 0.5; }

        @media (min-width: 1024px) {
          .sp-statement { max-width: none; margin: calc(${u(AIR.computer / 2)} - ${SLACK.computer / 2}px) auto 0; padding: 0 0 0 ${TRACK}; }
          .sp-row { display: flex; align-items: flex-start; margin-top: calc(${u(AIR.computer / 2)} + ${SLACK.computer / 2}px); padding-left: ${u(200)}; }
          .sp-info { flex: none; width: max(340px, ${u(500)}); max-width: none; margin: 0 0 0 ${u(166)}; padding: 0; }
          .sp-name { margin-top: ${u(1.8)}; }
          .sp-line { margin: ${u(20.5)} 0 ${u(46.7)}; line-height: 1; }
          .sp-details { margin-top: ${u(42.5)}; }
          .sp-details > div { padding: ${u(16)} 0 ${u(15)}; }
          .sp-details dt { font-size: ${fit(11, JULIUS_MIN)}; }
          .sp-details dd { margin-top: ${u(1)}; }
          .sp-end { width: ${u(1120)}; margin: ${u(207)} auto 0; padding-bottom: ${u(160)}; }
          .sp-back { margin-top: ${u(110)}; font-size: ${fit(12, JULIUS_MIN)}; }
        }
      `}</style>
    </main>
  )
}
