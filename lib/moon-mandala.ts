/**
 * The mandala over the Chess Set's moon, read shape by shape and sorted into
 * the author's rings.
 *
 * The file is `public/images/chess-set/mandala.svg`, which
 * `scripts/chess-mandala.mjs` makes from the author's MANDALA MOON.svg: 1,441
 * closed outlines in two paths, white where they lie on the moon and grey off
 * it. The author marked on a copy of it (D:\PANDOV\1_MIND\0_PANDOV CHESS\
 * Explicativ Moon Mandala.jpg, 2026-09-27) which rings move and how, and the
 * rings fall out of the drawing cleanly by the distance of each outline's
 * middle from the centre: eighteen concentric families (nineteen until the
 * author's cross came out, see the script), none sharing a band
 * with another.
 *
 * Mother Nature's mandala is cut into rings too (`lib/mechanism.ts`), each ring
 * its own small SVG that the compositor turns. This one could not be done that
 * way, because its shapes do more than turn. Lines breathe out at both ends.
 * Teardrops leave the rim and fade. When the black drop has
 * inked it, every shape draws in toward the moon's centre and shrinks, and then
 * shoots out along its own radius, streaking as it goes but never growing. A
 * ring's transform can say none of that: scaling a ring moves its shapes
 * outward and enlarges them in the same breath. So the outlines are handed to
 * a canvas, one by one, and this module is what reads them: each outline's
 * points, where its middle stands, which way is out for it, and which ring it
 * belongs to.
 *
 * The file stays a file and is fetched, never inlined: inlined, it would be
 * sent twice on every visit (CLAUDE.md, on the Figma exports). The page shows
 * it as a plain image until the canvas has read it, and a reader who has asked
 * for less motion never sees anything else.
 *
 * Pure string work, as safe in the browser as on the server.
 */

/**
 * How one ring moves while the page is at rest, before anything falls.
 *
 * A ring may turn, and it may breathe. A breath is a copy of the ring that
 * comes up where the ring sits, then leaves it, changing as it goes, and has
 * faded out by the end of its journey; the next breath has already come up
 * behind it, so the ring itself never goes out. What changes along the way is
 * set by `drift`, `scale` and `stretch`, any of which may be combined.
 */
export type MoonMotion = {
  /** Degrees per second. Positive is clockwise, as in `lib/mechanism.ts`. */
  spin?: number
  /** Units a breath carries the ring's shapes without changing their size: outward if positive, inward if negative. */
  drift?: number
  /**
   * How much a breath grows the ring, shapes and all, as a share of itself:
   * outward if positive, inward if negative. For the small rings at the
   * centre, where a fixed distance would be half their radius.
   */
  scale?: number
  /** How much a breath lengthens the ring's lines, as a share of their length, half at either end. */
  stretch?: number
  /**
   * Seconds between the ring's breaths. Rings breathing at different paces
   * come apart and meet again, so no two moments of the mandala repeat.
   */
  breath?: number
}

export type MoonRing = {
  key: string
  /**
   * Bands of distance from the centre, [from, to) in the mandala's units,
   * measured to the middle of each outline. A ring may take several bands:
   * the two rows of chevrons and the dots that sit in their crooks are one.
   */
  bands: [number, number][]
  motion: MoonMotion
}

export type MoonShape = {
  /** Index into the rings given; -1 for an outline no band claims, which holds still. */
  ring: number
  /** Index into `MoonArt.strokes`: the colour and weight the file draws it in. */
  stroke: number
  /** Distance of the outline's middle from the centre, in units. */
  r: number
  /** Direction of that middle from the centre, in radians. */
  angle: number
  /**
   * The outline's points about its middle, as pairs of [along, across]: along
   * its own radius, outward positive, and across it. Kept in these terms so
   * that turning, drawing in, stretching and streaking are each a single
   * multiplication.
   */
  local: Float32Array
  /** Half the outline's extent along its radius. */
  half: number
}

export type MoonArt = {
  /** Half the side of the file's square viewBox, which is centred on the moon. */
  extent: number
  /** The furthest any outline reaches from the centre. */
  reach: number
  strokes: { color: string; width: number }[]
  shapes: MoonShape[]
}

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/g

export function readMandala(svg: string, rings: MoonRing[]): MoonArt {
  const viewBox = svg.match(/<svg\b[^>]*\sviewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number) ?? [0, 0, 0, 0]
  const extent = viewBox[2] / 2
  const rootWidth = Number(svg.match(/<svg\b[^>]*\sstroke-width="([^"]+)"/)?.[1] ?? 1)

  const strokes: MoonArt["strokes"] = []
  const shapes: MoonShape[] = []
  let reach = 0

  for (const [path] of svg.matchAll(/<path\b[^>]*>/g)) {
    const d = path.match(/\sd="([^"]+)"/)?.[1]
    if (!d) continue
    const stroke = strokes.length
    strokes.push({
      color: path.match(/\sstroke="([^"]+)"/)?.[1] ?? "#000",
      width: Number(path.match(/\sstroke-width="([^"]+)"/)?.[1] ?? rootWidth),
    })

    // One outline per subpath. The script closes each with Z rather than a
    // last line back to its start, so its points are its corners exactly once.
    for (const sub of d.split("M")) {
      const nums = sub.match(NUMBER)
      if (!nums || nums.length < 4) continue
      const count = nums.length >> 1
      let cx = 0
      let cy = 0
      for (let i = 0; i < count; i++) {
        cx += Number(nums[2 * i])
        cy += Number(nums[2 * i + 1])
      }
      cx /= count
      cy /= count
      const r = Math.hypot(cx, cy)
      const angle = Math.atan2(cy, cx)
      const ux = Math.cos(angle)
      const uy = Math.sin(angle)
      const local = new Float32Array(count * 2)
      let half = 0
      for (let i = 0; i < count; i++) {
        const dx = Number(nums[2 * i]) - cx
        const dy = Number(nums[2 * i + 1]) - cy
        const along = dx * ux + dy * uy
        local[2 * i] = along
        local[2 * i + 1] = dy * ux - dx * uy
        half = Math.max(half, Math.abs(along))
        reach = Math.max(reach, Math.hypot(Number(nums[2 * i]), Number(nums[2 * i + 1])))
      }
      shapes.push({
        ring: rings.findIndex((ring) => ring.bands.some(([from, to]) => r >= from && r < to)),
        stroke,
        r,
        angle,
        local,
        half,
      })
    }
  }

  return { extent, reach, strokes, shapes }
}
