import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { PendantGallery, type PendantPhoto } from "@/components/pendant-gallery"
import { u } from "@/lib/canvas-length"

export type { PendantPhoto }

/** Second Wind's ground. */
const GROUND = "#202020"

/** The text's grey, the site's own, and the hairlines', a step down from it. */
const TEXT = "#888888"
const RULE = "rgba(136, 136, 136, 0.35)"

/**
 * The type, read off the Figma frame by measuring set lines against it: the
 * name and "Materials" at 17px, everything else at 11px — small, as the design
 * has it, so the second of the two lines runs a little past the hairlines as
 * it does there.
 */
const TITLE_SIZE = "17px"
const TEXT_SIZE = "11px"

/** A material, priced, or a family of them priced one by one (Brass: natural, polished). */
export type Material = { name: string; price?: string; finishes?: { name: string; price: string }[] }

export type Pendant = {
  name: string
  /** The two lines under the name: what the pendant is about. */
  lines: [string, string]
  height: string
  model: string
  photos: PendantPhoto[]
  materials: Material[]
}

/**
 * One pendant of Second Wind on a page of its own, after the author's Figma
 * frame (1920 × 1794): the photographs and the model share one frame on the
 * left, the marks that choose between them stand beside it, and the name, its
 * two lines, its height and its price in each material run down the right,
 * behind a hairline.
 *
 * Every length is the Figma number on a 1920 screen and shrinks with a
 * narrower one (`u`); the type does not, below a floor, so it stays legible
 * on a laptop. Under 1024px the three columns stack: stage, a row of marks,
 * then the text. The phone layout is a placeholder until the author designs
 * one.
 *
 * On a computer the text column is held on screen (sticky) while the
 * photograph scrolls past it, so the name and the prices stay in view to the
 * foot of the frame; it sticks at the distance it already stands below the
 * frame's top, so it never jumps as it is caught.
 *
 * All the text is Julius Sans One for now, by the author's choice, although
 * the two lines are running text that the brand rules give to Assistant.
 */
export function PendantPage({ pendant }: { pendant: Pendant }) {
  const { name, lines, height, model, photos, materials } = pendant
  return (
    <main className="w-full" style={{ backgroundColor: GROUND, fontFamily: "var(--font-heading)", color: TEXT }}>
      <Navigation bgColor={GROUND} />
      <div className="pp-body">
        <PendantGallery name={name} model={model} photos={photos}>
          <section className="pp-text">
            <h1 style={{ fontSize: TITLE_SIZE, letterSpacing: "0.08em", fontWeight: 400 }}>{name}</h1>
            <p style={{ marginTop: 10 }}>{lines[0]}</p>
            <p style={{ marginTop: 4 }}>{lines[1]}</p>
            <hr className="pp-rule" />
            <p>Height: {height}</p>
            <hr className="pp-rule" />
            <h2 style={{ fontSize: TITLE_SIZE, letterSpacing: "0.08em", fontWeight: 400 }}>Materials</h2>
            <table className="pp-prices">
              <tbody>
                {materials.map((m, i) => (
                  <MaterialRows key={m.name} index={i + 1} material={m} />
                ))}
              </tbody>
            </table>
          </section>
        </PendantGallery>
      </div>
      <BodyFooter />

      <style>{`
        .pp-body { padding: 8px 0 72px; }
        .pp-text { padding: 8px 24px 0; font-size: ${TEXT_SIZE}; letter-spacing: 0.04em; line-height: 16px; }
        .pp-rule { border: 0; border-top: 1px solid ${RULE}; margin: 18px 0; }
        .pp-prices { margin-top: 16px; border-collapse: collapse; }
        .pp-prices td { padding: 0; line-height: 18px; vertical-align: top; }
        .pp-prices td:last-child { padding-left: 14px; border-left: 1px solid ${RULE}; white-space: nowrap; }
        .pp-prices td:first-child { padding-right: 24px; }
        @media (min-width: 1024px) {
          .pp-body { padding: ${u(86)} 0 ${u(150)}; }
          .pp-text {
            width: clamp(280px, ${((367 / 1920) * 100).toFixed(3)}vw, 367px);
            margin: ${u(62)} 0 0 ${u(20)};
            padding: 0 0 0 ${u(43)};
            border-left: 1px solid ${RULE};
            position: sticky;
            top: ${u(62)};
          }
          .pp-text p, .pp-text h1 { white-space: nowrap; }
        }
      `}</style>
    </main>
  )
}

/** A material's rows in the price list: one if it has a single price, or its name over its finishes. */
function MaterialRows({ index, material }: { index: number; material: Material }) {
  const label = `${index}. ${material.name}`
  if (!material.finishes) {
    return (
      <tr>
        <td>{label}</td>
        <td>{material.price}</td>
      </tr>
    )
  }
  return (
    <>
      <tr>
        <td>{label}</td>
        <td />
      </tr>
      {material.finishes.map((f) => (
        <tr key={f.name}>
          <td style={{ paddingLeft: "1.5em" }}>{f.name}</td>
          <td>{f.price}</td>
        </tr>
      ))}
    </>
  )
}
