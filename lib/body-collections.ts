/**
 * The pieces on `/body` under "work in progress", in the order the page shows
 * them. Each has its own mark, name and photograph, one under the next, as the
 * author asked on 2026-09-26 (over grouping them by collection).
 *
 * The first three are the author's Figma frame "Body" (node 4269-2) in its own
 * order; the rest follow alphabetically, which keeps each collection's two
 * pieces together. The order is this list's: move an entry to move a piece.
 *
 * The photographs are the author's, from `D:\PANDOV\2_BODY\BODY THUMBNAILS
 * #202020 BACKGROUND\`, each made into `public/images/body-collections/<file>`
 * by `node scripts/body-thumb.mjs "<photograph>" <out.avif>`, which prints the
 * `w`, `h` and `pad` below. Re-make a file and copy its numbers here.
 *
 * Names are the photographs' own, with three spellings corrected: AWERNESS →
 * Awareness, BRACELLET → bracelet, SED RING → Seed ring.
 */
export type BodyPiece = {
  name: string
  /** What the piece is, for its description to anyone who cannot see it. */
  kind: string
  /** Under `/images/body-collections/`. */
  file: string
  /** The file's size in pixels, and the ground left round the metal on each side. */
  w: number
  h: number
  pad: number
  /**
   * The piece's size against the others, 1 by default (see `PIECE_AREA` in
   * `components/body-collections.tsx`). The author's own knob for a piece that
   * reads too large or too small beside its neighbours.
   */
  scale?: number
}

export const BODY_PIECES: BodyPiece[] = [
  { name: "Satori", kind: "sunburst pendant", file: "satori.avif", w: 558, h: 669, pad: 56 },
  { name: "Seeds", kind: "earrings", file: "seeds.avif", w: 557, h: 840, pad: 70 },
  // The Figma draws Protection a fifth smaller than the rule would.
  { name: "Protection", kind: "pendant", file: "protection.avif", w: 476, h: 841, pad: 70.5, scale: 0.8 },
  { name: "Awareness", kind: "bracelet", file: "awareness.avif", w: 697, h: 672, pad: 58 },
  { name: "Awareness pendant", kind: "pendant", file: "awareness-pendant.avif", w: 532, h: 840, pad: 70.2 },
  { name: "Compassion", kind: "ring", file: "compassion.avif", w: 344, h: 408, pad: 34 },
  { name: "Compassion pendant", kind: "pendant", file: "compassion-pendant.avif", w: 511, h: 840, pad: 70 },
  { name: "Duality", kind: "earrings", file: "duality.avif", w: 840, h: 659, pad: 69.9 },
  { name: "Duality bracelet", kind: "bracelet", file: "duality-bracelet.avif", w: 840, h: 708, pad: 70.2 },
  { name: "In", kind: "pendant", file: "in.avif", w: 368, h: 793, pad: 66 },
  { name: "Liman", kind: "earrings", file: "liman.avif", w: 647, h: 794, pad: 66 },
  { name: "One", kind: "pendant", file: "one.avif", w: 333, h: 744, pad: 62 },
  { name: "Prot", kind: "pendant", file: "prot.avif", w: 389, h: 838, pad: 70 },
  { name: "Seed", kind: "pendant", file: "seed.avif", w: 700, h: 695, pad: 58 },
  { name: "Seed ring", kind: "ring", file: "seed-ring.avif", w: 602, h: 469, pad: 50 },
  { name: "Skeyes earrings", kind: "earrings", file: "skeyes-earrings.avif", w: 620, h: 840, pad: 70 },
  { name: "Skeyes pendant", kind: "pendant", file: "skeyes-pendant.avif", w: 295, h: 839, pad: 69.7 },
  { name: "Word", kind: "pendant", file: "word.avif", w: 523, h: 754, pad: 63 },
]
