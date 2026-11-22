import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { MakingVideo } from "@/components/making-video"
import { MakingCompare } from "@/components/making-compare"
import { TEXT_FONT, TEXT_SIZE, TEXT_TRACK, JULIUS, TRACK } from "@/lib/type"

/*
 * /making, still (2026-11-22, the author's asking, after visitors said the
 * pages did not flow on their phones; see lib/still.ts): the same six steps,
 * their pictures, films and words, one under the next in a page that scrolls
 * like any other. Nothing held, nothing tied to the scroll: the found wood
 * with its drawing whole on it, the fire and the print as films that play
 * while they are on screen, the piece on its branch and the four models as
 * one picture each, the scan with a slider under it.
 *
 * The moving page it replaces is kept unchanged in `making-page.tsx`
 * (and `making-scroll.tsx`, `making-harag.tsx`, `making-heavy.tsx`,
 * `making-scan.tsx`); `app/making/page.tsx` says which is used.
 */

const GROUND = "#202020"
/** The words on the dark, the moving page's own colours. */
const INK = { night: "#a7a29b", search: "#74716c", chapter: "#a7a29b" }

/** The drawing on the found wood, placed on the photograph by its circle (as `DRAWING_AT` in making-page.tsx). */
const PLATE = { w: 1920, h: 1190 }
const DRAWING = { x: 746.5 - 139.5, y: 908 - 587.5 - 90, w: 716, h: 949 }
const pct = (n: number, of: number) => `${+((n / of) * 100).toFixed(3)}%`

function Words({ chapter, children }: { chapter: string; children: React.ReactNode }) {
  return (
    <div className="ms-words">
      <p className="ms-ch">{chapter}</p>
      {children}
    </div>
  )
}

export function MakingStill() {
  return (
    <main className="ms" style={{ background: GROUND }}>
      <Navigation bgColor={GROUND} />

      <p className="ms-title">Every Pandov piece begins with a search . . .</p>

      {/* I — Found */}
      <section className="ms-step">
        <div className="ms-plate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/making/found-wood-plate.avif?v=2"
            alt="A weathered branch standing in a bare autumn wood"
            width={3200}
            height={1983}
            fetchPriority="high"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/making/drawing-wood.svg"
            alt=""
            aria-hidden="true"
            className="ms-plate-draw"
            style={{ left: pct(DRAWING.x, PLATE.w), top: pct(DRAWING.y, PLATE.h), width: pct(DRAWING.w, PLATE.w), height: pct(DRAWING.h, PLATE.h) }}
          />
        </div>
        <Words chapter="I — Found">
          <p>It can be discovered in nature, among forms shaped by time.</p>
          <p>Or in discarded objects, waiting to be reimagined.</p>
          <p>Or anywhere there is a quiet potential.</p>
        </Words>
      </section>

      {/* II — Treat */}
      <section className="ms-step">
        <div className="ms-film ms-film-fire">
          <MakingVideo
            src="/videos/making-burn.mp4?v=2"
            poster="/videos/making-burn-poster.jpg?v=2"
            phone={{ src: "/videos/making-burn-phone.mp4?v=3", poster: "/videos/making-burn-phone-poster.jpg?v=3" }}
          />
        </div>
        <Words chapter="II — Treat">
          <p>Through careful cleaning and surface treatment.</p>
          <p>The excess is stripped away to reveal its raw, organic beauty.</p>
        </Words>
      </section>

      {/* III — Scan: the piece on its branch, then the scan */}
      <section className="ms-step">
        <div className="ms-narrow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/making/harag/1200/10.avif"
            alt="A white carved piece hanging on a bare branch"
            width={578}
            height={1200}
            loading="lazy"
            decoding="async"
            className="ms-harag"
          />
        </div>
        <Words chapter="III — Scan">
          <p>Most of the found pieces are 3D scanned.</p>
          <p>Hundreds of photographs are captured to digitally reconstruct every detail.</p>
        </Words>
        <div className="ms-narrow ms-after">
          <MakingCompare
            original="/images/making/scan-original-1600.avif"
            scan="/images/making/scan-edges-1600.avif"
            alt="The end of a log with a figure in its grain, and its 3D scan"
          />
        </div>
        <Words chapter="">
          <p>Capturing their exact geometry reveals what works visually,</p>
          <p>while allowing new elements to be engineered for a precise physical fit.</p>
        </Words>
      </section>

      {/* IV — Drawing */}
      <section className="ms-step">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ms-wide"
          src="/images/making/drawings-1-2400.avif?v=1"
          srcSet="/images/making/drawings-1-1200.avif?v=1 1200w, /images/making/drawings-1-2400.avif?v=1 2400w"
          sizes="100vw"
          alt="Pencil drawings of hanging pieces and standing figures, white on dark"
          loading="lazy"
          decoding="async"
        />
        <Words chapter="IV — Drawing">
          <p>Another way to search for a form is on a blank sheet of paper.</p>
          <p>Here, an imagined silhouette gradually takes shape.</p>
        </Words>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ms-wide ms-after"
          src="/images/making/drawings-2-2400.avif?v=2"
          srcSet="/images/making/drawings-2-1200.avif?v=2 1200w, /images/making/drawings-2-2400.avif?v=2 2400w"
          sizes="100vw"
          alt="Pencil drawings of sculptures on plinths, white on dark"
          loading="lazy"
          decoding="async"
        />
      </section>

      {/* V — Modeling: Heavy Light, and its four models */}
      <section className="ms-step">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ms-wide"
          src="/images/making/heavy/still-2400.avif?v=2"
          srcSet="/images/making/heavy/still-1400.avif?v=2 1400w, /images/making/heavy/still-2400.avif?v=2 2400w"
          sizes="100vw"
          alt="Heavy Light, a carved wooden lamp with a gold-crowned bulb, on a stone ledge in the dark"
          width={2400}
          height={1228}
          loading="lazy"
          decoding="async"
        />
        <div className="ms-models">
          {[1, 2, 3, 4].map((n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={n}
              src={`/images/making/heavy/800/${n}-00.avif`}
              alt={`Heavy Light's 3D model, stage ${n} of 4`}
              width={275}
              height={800}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
        <Words chapter="V — Modeling">
          <p>Once drawn, the form is modeled digitally</p>
          <p>and brought into the physical world</p>
          <p>through 3D printing, CNC milling and hand finishing.</p>
        </Words>
      </section>

      {/* VI — Print */}
      <section className="ms-step">
        <div className="ms-film ms-film-print">
          <MakingVideo
            src="/videos/making-print.mp4?v=2"
            poster="/videos/making-print-poster.jpg?v=2"
            phone={{ src: "/videos/making-print-phone.mp4?v=2", poster: "/videos/making-print-phone-poster.jpg?v=2" }}
            mirror={false}
            label="A white figure growing layer by layer inside a 3D printer"
          />
        </div>
        <Words chapter="VI — Print">{null}</Words>
      </section>

      {/* The last words */}
      <section className="ms-last">
        <p className="ms-lead">We don&apos;t follow a fixed formula.</p>
        <p>Every project brings new questions,</p>
        <p>every process opens new possibilities,</p>
        <p>and every object teaches us something for the next.</p>
        <p className="ms-sub">
          <Link href="/contact">Subscribe for more.</Link>
        </p>
      </section>

      <BodyFooter activeLabel="making" />

      <style>{`
        .ms { width: 100%; overflow-x: clip; font-family: ${TEXT_FONT}; font-size: ${TEXT_SIZE}px; letter-spacing: ${TEXT_TRACK}; line-height: 2; font-weight: 400; color: ${INK.night}; }
        .ms p { margin: 0; }
        .ms-title { padding: clamp(72px, 12svh, 140px) 24px clamp(64px, 10svh, 120px); text-align: center; font-family: ${JULIUS}; font-size: 13px; letter-spacing: ${TRACK}; line-height: 1.6; color: ${INK.search}; }
        .ms-step { padding-bottom: clamp(96px, 18svh, 200px); }
        .ms-plate { position: relative; width: 100%; aspect-ratio: ${PLATE.w} / ${PLATE.h}; overflow: hidden; }
        .ms-plate > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .ms-plate > img.ms-plate-draw { inset: auto; object-fit: fill; }
        .ms-film { position: relative; width: 100%; overflow: hidden; background: ${GROUND}; }
        .ms-film-fire { aspect-ratio: 1920 / 810; }
        .ms-film-print { aspect-ratio: 1920 / 810; }
        .ms-film .mk-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .ms-narrow { width: min(100% - 48px, 520px); margin: 0 auto; }
        .ms-harag { display: block; width: auto; height: clamp(360px, 70svh, 760px); margin: 0 auto; }
        .ms-after { margin-top: clamp(64px, 12svh, 140px); }
        .ms-wide { display: block; width: min(100%, 1600px); height: auto; margin-left: auto; margin-right: auto; }
        .ms-models { display: flex; justify-content: center; gap: clamp(8px, 2vw, 40px); width: min(100% - 32px, 1000px); margin: clamp(32px, 6svh, 64px) auto 0; }
        .ms-models img { display: block; flex: 1 1 0; min-width: 0; width: 100%; height: auto; max-width: 220px; }
        .ms-words { width: min(100% - 48px, 560px); margin: clamp(36px, 6svh, 64px) auto 0; }
        .ms-words p + p { margin-top: 0.4em; }
        .ms-ch { font-family: ${JULIUS}; font-size: 13px; letter-spacing: ${TRACK}; line-height: 1.4; color: ${INK.chapter}; opacity: 0.62; margin-bottom: 1.6em !important; }
        .ms-ch:empty { display: none; }
        .ms-last { text-align: center; padding: clamp(40px, 8svh, 100px) 24px clamp(96px, 16svh, 180px); }
        .ms-last p + p { margin-top: 0.2em; }
        .ms-lead { font-family: ${JULIUS}; font-size: 13px; letter-spacing: ${TRACK}; line-height: 1.6; margin-bottom: 1.6em !important; padding-left: ${TRACK}; }
        .ms-sub { margin-top: 2em !important; }
        .ms-sub a { color: #fff; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .25em; text-decoration-color: rgba(255,255,255,.45); }
        .ms-sub a:hover { text-decoration-color: #fff; }
        @media (max-width: 767px) {
          .ms-film-fire, .ms-film-print { aspect-ratio: 4 / 5; }
        }
      `}</style>
    </main>
  )
}
