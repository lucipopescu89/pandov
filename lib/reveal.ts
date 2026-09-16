/**
 * Strokes that sit all but dark until a band of light climbs over them.
 *
 * The strokes are lifted out of the export onto an artwork of their own, laid
 * under the rest of it, and seen through a mask: held at `floor` everywhere but
 * the band, where it opens to the export's full light at the peak — the same
 * arithmetic as dimming the strokes.
 *
 * The mask is a strip one `period` taller than the artwork with the band
 * repeating down it, so moving the band is sliding the strip down the strokes'
 * layer. The strokes keep a composited layer of their own, so only the mask is
 * painted again as it slides. The first version dimmed the strokes through an
 * SVG mask inside the artwork and moved the mask's gradient instead, and every
 * move had the whole artwork repainted — Icarus's 164 gradient strokes and its
 * pendant photo — thirty to sixty times a second, more than a phone can keep up
 * with.
 *
 * The one after it laid a shade in the ground's colour over the strokes and
 * moved that by transform. Over the empty ground the shade should have been
 * invisible, but the browser blends layers eight bits a channel, and down the
 * band's soft edges the rounding left the ground a level darker in fine stripes
 * that climbed with the band across the whole artwork. A mask draws nothing
 * where there is no stroke, so the ground is never touched.
 *
 * Pure string work, run on the server while the page renders, so the strokes
 * arrive already dimmed and there is no flash of the export's full light before
 * the page hydrates.
 */

export type RevealSpec = {
  /** The class the strokes carry in the export. */
  className: string
  /** Artwork units from one band to the next. */
  period: number
  /** How far above its peak the band starts coming up out of `floor`. */
  head: number
  /** How far below its peak it takes to sink back to `floor`. */
  tail: number
  /** What the strokes keep of the export's light outside the band. */
  floor: number
  /** Where the band's peak sits on arrival, on the artwork's y axis. */
  start: number
}

/** A section's lifted strokes and the mask over them, for `ParticleField`. */
export type RevealLayer = {
  spec: RevealSpec
  /** The strokes, as an SVG of their own over the artwork's viewBox. */
  strokes: string
  /** The mask strip's CSS image. */
  mask: string
  /** The artwork's height, in its own units. */
  height: number
}

/** Stops per edge. Eased, so the band has no visible line at either end. */
const STEPS = 6

const smooth = (t: number) => t * t * (3 - 2 * t)

/** The strip's length in artwork units: the artwork and one period more. */
const stripLength = (spec: RevealSpec, height: number) => height + spec.period

/** The strip's height as a share of the artwork's. */
export const revealStrip = ({ spec, height }: RevealLayer) => stripLength(spec, height) / height

/**
 * The strip's `mask-position` with the band's peak `travel` units above
 * `start`. Its top is held within one period above the artwork's, so it always
 * covers the artwork. A percentage places the strip by the share of its
 * overhang, which is one period whatever size the page is drawn, so it holds at
 * any size.
 */
export function revealPosition({ spec }: RevealLayer, travel: number) {
  const top = spec.start - spec.head - (travel % spec.period)
  const phase = ((top % spec.period) + spec.period) % spec.period
  return `0 ${(((spec.period - phase) / spec.period) * 100).toFixed(4)}%`
}

/**
 * The mask down the whole strip. Each period starts at the floor, comes up to
 * the peak over `head`, sinks back over `tail` and holds there to the next.
 */
function maskGradient(spec: RevealSpec, height: number) {
  const { period, head, tail, floor } = spec
  const length = stripLength(spec, height)
  const stops: string[] = []
  const stop = (at: number, lit: number) => {
    const alpha = floor + (1 - floor) * lit
    stops.push(`rgba(0,0,0,${alpha.toFixed(3)}) ${((at / length) * 100).toFixed(3)}%`)
  }
  const periods = Math.ceil(length / period)
  for (let k = 0; k < periods; k++) {
    const from = k * period
    stop(from, 0)
    for (let i = 1; i <= STEPS; i++) stop(from + (head * i) / STEPS, smooth(i / STEPS))
    for (let i = 1; i <= STEPS; i++) stop(from + head + (tail * i) / STEPS, 1 - smooth(i / STEPS))
  }
  stop(periods * period, 0)
  return `linear-gradient(to bottom, ${stops.join(", ")})`
}

export function splitReveal(
  svg: string,
  spec: RevealSpec,
): { html: string; layer: RevealLayer | undefined } {
  const pattern = new RegExp(`<path\\b[^>]*\\sclass="${spec.className}"[^>]*/>\\s*`, "g")
  const strokes: string[] = []
  const paints = new Set<string>()
  let html = svg.replace(pattern, (tag: string) => {
    strokes.push(tag.trim())
    for (const [, id] of tag.matchAll(/url\(#([^)]+)\)/g)) paints.add(id)
    return ""
  })
  const open = /<svg\b[^>]*>/.exec(html)?.[0]
  if (!strokes.length || !open) return { html: svg, layer: undefined }

  // The gradients the strokes are painted with go with them, unless something
  // left behind is painted with one too; that one stays, and is still found by
  // its id from the strokes' own SVG.
  const kept = new Set<string>()
  for (const [, id] of html.matchAll(/url\(#([^)]+)\)/g)) kept.add(id)
  const defs: string[] = []
  html = html.replace(
    /<(radialGradient|linearGradient)\b[^>]*\sid="([^"]+)"[^>]*>[\s\S]*?<\/\1>\s*/g,
    (def: string, _kind: string, id: string) => {
      if (!paints.has(id) || kept.has(id)) return def
      defs.push(def.trim())
      return ""
    },
  )

  const height = Number((/viewBox="([^"]+)"/.exec(open)?.[1] ?? "0 0 0 0").split(/[\s,]+/)[3])
  const layer: RevealLayer = {
    spec,
    strokes:
      open.replace(/^<svg\b/, '<svg aria-hidden="true"') +
      `\n<defs>\n${defs.join("\n")}\n</defs>\n${strokes.join("\n")}\n</svg>`,
    mask: maskGradient(spec, height),
    height,
  }
  return { html, layer }
}
