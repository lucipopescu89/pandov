import Link from "next/link"
import { Assistant } from "next/font/google"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { PendantGallery } from "@/components/pendant-gallery"
import { PendantOrder } from "@/components/pendant-order"
import { CORD, MADE, STUDIO_EMAIL, moreFrom, type Pendant } from "@/lib/second-wind"
import { u } from "@/lib/canvas-length"

/**
 * Assistant, the brand's face for text that is read rather than glanced at,
 * in the one weight the design uses. Loaded here rather than in the root
 * layout, so only the pages that set it download it; `--font-body` reaches it.
 */
const assistant = Assistant({ weight: "300", subsets: ["latin"], variable: "--font-body", display: "swap" })

/** Second Wind's ground. */
const GROUND = "#202020"

/*
 * The design's colours: ivory for the name and what is chosen, a warm grey for
 * running words, a darker one for labels, and the hairlines between them.
 */
const INK = "#E9E4DC"
const TEXT = "#8E8982"
const MUTED = "#7C7770"
const RULE = "#343230"

/** A size that follows the canvas down to a floor, for type that must stay legible. */
const fit = (n: number, floor: number) => `clamp(${floor}px, ${((n / 1920) * 100).toFixed(4)}vw, ${n}px)`

/**
 * The pendants under "More from Second Wind", at 60% of the design's size (620
 * tall at 1920): the author's asking on 2026-09-23, so that they read as a
 * suggestion beside the pendant of the page rather than as its equal. Their
 * places, the space between them and the captions are the design's own.
 */
const MORE_SCALE = 0.6

/**
 * One pendant of Second Wind on a page of its own, after the author's Figma
 * frame "Varianta D" (1920 wide). Under the menu, the pendant's statement in
 * quotation marks. Then a row: a column of thumbnails, the photograph they
 * choose, and beside it the name, its line, the metals with their prices, the
 * price of the one chosen, ORDER and "Ask a question", and what the pendant
 * is: its height, its cord, how it is made. Last, two more pendants of the
 * collection, to go on to.
 *
 * Every length is the Figma number on a 1920 screen and shrinks with a
 * narrower one (`u`); the type follows it down to a floor (`fit`), so it stays
 * legible on a laptop. The design's text sits in line boxes one em tall here,
 * and each margin is the distance between two boxes, worked out from where the
 * design sets each line's baseline and the fonts' own metrics.
 *
 * Under 1024px it stacks, in the order the author gave: statement,
 * photograph, thumbnails in a row, then the name, the metals, the price and
 * the buttons.
 */
export function PendantPage({ slug, pendant }: { slug: string; pendant: Pendant }) {
  const { name, statement, line, height, model, cutout, photos, materials } = pendant
  const last = statement.length - 1
  return (
    <main className={`w-full ${assistant.variable}`} style={{ backgroundColor: GROUND, color: TEXT }}>
      <Navigation bgColor={GROUND} />
      <div className="pp">
        <p className="pp-statement">
          {statement.map((words, i) => (
            <span key={i}>
              {i === 0 && "“"}
              {words}
              {i === last ? "”" : " "}
            </span>
          ))}
        </p>

        <div className="pp-row">
          <PendantGallery name={name} model={model} cutout={cutout} photos={photos} />
          <section className="pp-info">
            <h1 className="pp-name">{name}</h1>
            <p className="pp-line">{line}</p>
            <PendantOrder name={name} materials={materials} email={STUDIO_EMAIL} />
            <dl className="pp-details">
              <div>
                <dt>Height</dt>
                <dd>{height}</dd>
              </div>
              <div>
                <dt>Cord</dt>
                <dd>{CORD}</dd>
              </div>
              <div>
                <dt>Made</dt>
                <dd>
                  {MADE.map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="pp-more">
          <h2>More from Second Wind</h2>
          <div className="pp-more-list">
            {moreFrom(slug).map(({ slug: other, pendant: p }) => (
              <Link key={other} href={`/body/second-wind/${other}`} className="pp-more-item">
                <img src={p.cutout} alt="" loading="lazy" decoding="async" />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <BodyFooter />

      {/* Phone first; the design's own lengths from 1024 up. Centred lines that
          are letter-spaced carry the spacing after their last letter too, so
          each gives it back on its right to sit on the centre as drawn. */}
      <style>{`
        .pp { max-width: 1920px; margin: 0 auto; }
        .pp-statement { max-width: 560px; margin: 8px auto 0; padding: 0 28px 0 calc(28px + 0.06em); text-align: center; text-wrap: balance;
          font-family: var(--font-heading); font-size: 19px; line-height: 1.7; letter-spacing: 0.06em; color: ${TEXT}; }
        .pp-row { margin-top: 32px; }
        .pp-info { max-width: 560px; margin: 40px auto 0; padding: 0 24px; }
        .pp-name { font-family: var(--font-heading); font-weight: 400; font-size: 30px; line-height: 1; letter-spacing: 0.18em; color: ${INK}; }
        .pp-line { margin: 14px 0 32px; font-family: var(--font-body); font-weight: 300; font-size: 15px; line-height: 1.3; letter-spacing: 0.025em; color: ${TEXT}; }
        .pp-details { margin-top: 36px; }
        .pp-details > div { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0 12px; border-top: 1px solid ${RULE}; }
        .pp-details dt { font-family: var(--font-heading); font-size: 10px; line-height: 1; letter-spacing: 0.3em; text-transform: uppercase; color: ${MUTED}; }
        .pp-details dd { margin-top: 1px; font-family: var(--font-body); font-weight: 300; font-size: 14px; line-height: 1.7333; text-align: right; color: ${INK}; }
        .pp-details dd > span { display: block; }
        .pp-more { margin: 72px 16px 0; padding-bottom: 40px; border-top: 1px solid ${RULE}; text-align: center; }
        .pp-more > h2 { margin-top: 48px; padding-left: 0.34em; font-family: var(--font-heading); font-weight: 400; font-size: 11px; line-height: 1;
          letter-spacing: 0.34em; text-transform: uppercase; color: ${TEXT}; }
        .pp-more-list { display: flex; justify-content: center; gap: 12px; margin-top: 40px; }
        .pp-more-item { flex: 0 1 45%; display: flex; flex-direction: column; align-items: center; transition: opacity 150ms; }
        .pp-more-item:hover { opacity: 0.5; }
        .pp-more-item > img { display: block; width: 100%; height: min(${78 * MORE_SCALE}vw, ${320 * MORE_SCALE}px); object-fit: contain; }
        .pp-more-item > span { margin-top: 28px; padding-left: 0.24em; font-family: var(--font-heading); font-size: 11px; line-height: 1.5;
          letter-spacing: 0.24em; text-transform: uppercase; text-wrap: balance; color: ${INK}; }

        @media (min-width: 1024px) {
          .pp-statement { max-width: none; margin: ${u(146.7)} auto 0; padding: 0 0 0 0.06em; font-size: ${fit(28, 20)}; line-height: ${50 / 28}; }
          .pp-statement > span { display: block; }
          .pp-row { display: flex; align-items: flex-start; margin-top: ${u(189.3)}; padding-left: ${u(200)}; }
          .pp-info { flex: none; width: max(340px, ${u(500)}); max-width: none; margin: 0 0 0 ${u(166)}; padding: 0; }
          .pp-name { margin-top: ${u(1.8)}; font-size: ${fit(44, 28)}; }
          .pp-line { margin: ${u(20.5)} 0 ${u(46.7)}; font-size: ${fit(17, 14)}; line-height: 1; }
          .pp-details { margin-top: ${u(42.5)}; }
          .pp-details > div { padding: ${u(16)} 0 ${u(15)}; }
          .pp-details dt { font-size: ${fit(11, 10)}; }
          .pp-details dd { margin-top: ${u(1)}; font-size: ${fit(15, 13)}; }
          .pp-more { width: ${u(1120)}; margin: ${u(207)} auto 0; padding-bottom: ${u(160)}; }
          .pp-more > h2 { margin-top: ${u(80)}; font-size: ${fit(12, 10)}; }
          .pp-more-list { gap: ${u(132)}; margin-top: ${u(81)}; }
          .pp-more-item { flex: none; width: ${u(400)}; }
          .pp-more-item > img { height: ${u(620 * MORE_SCALE)}; }
          .pp-more-item > span { margin-top: ${u(60.5)}; font-size: ${fit(15, 11)}; line-height: 1; }
        }
      `}</style>
    </main>
  )
}
