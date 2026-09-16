/**
 * Lifts a bird drawn as loose strokes into wings that can beat.
 *
 * The Icarus export has no grouping to work with: the face, the plumage and the
 * aura around the pendant are 199 sibling `<path>`s. Rather than cutting the
 * export up by hand — which the next export out of Figma would undo — this
 * reads the bird back out of the geometry. Every stroke is measured, and the
 * ones that belong to a wing are lifted into groups that CSS can turn about the
 * shoulder.
 *
 * A wing is not a plate on a hinge. The primaries at the tip swing furthest and
 * arrive late; the coverts at the shoulder barely move. So each wing is cut into
 * bands by distance from the shoulder, and a band both turns further and trails
 * a little longer than the one inside it. That lag is the whole difference
 * between a wingbeat and a door opening — and it is also what keeps the face
 * attached, since the band nearest the shoulder hardly shifts at all.
 *
 * Pure string work, run on the server while the page renders. Each band is one
 * group carrying one transform, so a frame costs the compositor a dozen layer
 * moves instead of 199 repainted strokes.
 */

import { extent, type Box } from "./mechanism"

export type WingSpec = {
  /** The bird's centre line. Strokes are sorted into wings either side of it. */
  axis: number
  /**
   * The face. Strokes lying wholly inside it are left exactly where they are,
   * so the gaze never moves — for Icarus that is both eyes, both brows and the
   * beak. Strokes that cross `axis` are left alone too: they are the aura
   * around the pendant, which belongs to neither wing.
   */
  head: Box
  /**
   * The left shoulder, in the artwork's units — the point a wing turns about.
   * The right wing turns about its mirror in `axis`.
   */
  pivot: { x: number; y: number }
  /** Bands per wing, shoulder outwards. */
  bands: number
  /** Degrees the band at the shoulder drops through, and the one at the tip. */
  swingIn: number
  swingOut: number
  /** Seconds the tip trails the shoulder by. */
  lag: number
  /** Seconds for one full beat, down and back up. */
  cycle: number
}

/** The class the bands carry; `WingedField` gives it the beat. */
export const WING_CLASS = "bird-wing"
/** The keyframes that class runs. */
export const WING_KEYFRAMES = "bird-beat"

const PATH = /<path\b[^>]*?(?:\/>|>[\s\S]*?<\/path>)/g

const inside = (b: Box, h: Box) =>
  b.x0 >= h.x0 && b.x1 <= h.x1 && b.y0 >= h.y0 && b.y1 <= h.y1

/** Which band a stroke rides, 0 at the shoulder, `bands - 1` at the tip. */
function bandOf(b: Box, pivot: { x: number; y: number }, reach: number, bands: number) {
  // The far corner of the stroke's box: how far out along the wing it reaches.
  const dx = Math.max(Math.abs(b.x0 - pivot.x), Math.abs(b.x1 - pivot.x))
  const dy = Math.max(Math.abs(b.y0 - pivot.y), Math.abs(b.y1 - pivot.y))
  const d = Math.hypot(dx, dy)
  const i = Math.floor((d / reach) * bands)
  return Math.max(0, Math.min(bands - 1, i))
}

type Slot = { side: -1 | 1; band: number } | null

export function splitWings(svg: string, spec: WingSpec): string {
  const { axis, head, pivot, bands } = spec

  // Measure every stroke once, in document order.
  const tags: string[] = []
  const boxes: Box[] = []
  for (const m of svg.matchAll(PATH)) {
    const d = /\sd="([^"]+)"/.exec(m[0])
    tags.push(m[0])
    boxes.push(d ? extent(d[1]) : { x0: 0, y0: 0, x1: 0, y1: 0 })
  }

  // Sort them: the face and the aura stay put, the rest is wing.
  const slots: Slot[] = boxes.map((b) => {
    if (b.x0 < axis && b.x1 > axis) return null
    if (inside(b, head)) return null
    return { side: b.x1 <= axis ? -1 : 1, band: 0 }
  })

  // How far the furthest stroke reaches, so the bands divide the real wing
  // rather than a guess at its span.
  let reach = 0
  slots.forEach((slot, i) => {
    if (!slot) return
    const b = boxes[i]
    const p = slot.side === -1 ? pivot : { x: 2 * axis - pivot.x, y: pivot.y }
    const dx = Math.max(Math.abs(b.x0 - p.x), Math.abs(b.x1 - p.x))
    const dy = Math.max(Math.abs(b.y0 - p.y), Math.abs(b.y1 - p.y))
    reach = Math.max(reach, Math.hypot(dx, dy))
  })
  slots.forEach((slot, i) => {
    if (!slot) return
    const p = slot.side === -1 ? pivot : { x: 2 * axis - pivot.x, y: pivot.y }
    slot.band = bandOf(boxes[i], p, reach, bands)
  })

  /**
   * A band's group. Bands are written as runs, so a stroke never changes the
   * order it is painted in — the plumage in front of the pendant photo stays in
   * front of it, and the face stays where the export put it. Runs of one band
   * share a class and a delay, so however many the export's ordering produces,
   * they beat as one.
   */
  const open = (slot: NonNullable<Slot>) => {
    const t = bands > 1 ? slot.band / (bands - 1) : 0
    const swing = spec.swingIn + (spec.swingOut - spec.swingIn) * t
    const p = slot.side === -1 ? pivot : { x: 2 * axis - pivot.x, y: pivot.y }
    // Negative, so a band is already mid-beat on arrival rather than waiting
    // out its lag at rest; a whole cycle back is the same phase.
    const delay = -(spec.cycle - t * spec.lag)
    return (
      `<g class="${WING_CLASS}" style="transform-origin:${p.x}px ${p.y}px;` +
      `--swing:${(swing * slot.side).toFixed(2)}deg;` +
      `animation-delay:${delay.toFixed(3)}s">`
    )
  }

  // Rebuild the document. Strokes are gathered a run at a time — a run being a
  // stretch of the file holding nothing but strokes — so each band comes out as
  // one group rather than as the dozens of fragments the export's ordering
  // would otherwise give. Anything else drawn in between ends the run: the
  // pendant photo sits in the middle of the file, and the plumage drawn after
  // it has to stay in front of it.
  //
  // Within a run the fixed strokes are written first and the bands after them.
  // Nothing there overlaps opaquely — every stroke is a hairline under a
  // gradient — so the order among them is not something the eye can read; the
  // rendering is identical, checked against the export.
  let out = ""
  let at = 0
  let i = 0
  let fixed: string[] = []
  const bandsOut = new Map<string, { slot: NonNullable<Slot>; tags: string[] }>()

  const flush = () => {
    for (const tag of fixed) out += tag + "\n"
    for (const { slot, tags: band } of bandsOut.values()) {
      out += open(slot) + band.join("\n") + "</g>\n"
    }
    fixed = []
    bandsOut.clear()
  }

  for (const m of svg.matchAll(PATH)) {
    const start = m.index ?? 0
    const between = svg.slice(at, start)
    if (between.trim().length > 0) {
      flush()
      out += between
    }
    const slot = slots[i]
    if (!slot) {
      fixed.push(tags[i])
    } else {
      const key = `${slot.side}:${slot.band}`
      const entry = bandsOut.get(key) ?? { slot, tags: [] }
      entry.tags.push(tags[i])
      bandsOut.set(key, entry)
    }
    at = start + m[0].length
    i++
  }
  flush()
  return out + svg.slice(at)
}
