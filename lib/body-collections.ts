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
 * A name is the collection's alone, never what the piece is: "Skeyes", not
 * "Skeyes earrings". The author asked for that on 2026-09-26, so a collection's
 * two pieces carry the same name. The names are the photographs', with one
 * spelling corrected, AWERNESS → Awareness. What the piece is lives in `kind`,
 * which only a screen reader hears.
 */
export type BodyPiece = {
  /** The collection's name, as the page shows it. */
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

/*
 * Every `scale` but Protection's is the author's, set by eye on the live page
 * on 2026-09-26. Each percentage the author gave is the size the piece ends at:
 * "110%" is 1.1, "60%" is 0.6.
 */
export const BODY_PIECES: BodyPiece[] = [
  { name: "Satori", kind: "sunburst pendant", file: "satori.avif", w: 558, h: 668, pad: 56 },
  { name: "Seeds", kind: "earrings", file: "seeds.avif", w: 557, h: 840, pad: 70 },
  // The Figma draws Protection a fifth smaller than the rule would.
  { name: "Protection", kind: "pendant", file: "protection.avif", w: 476, h: 841, pad: 70.5, scale: 0.8 },
  { name: "Awareness", kind: "bracelet", file: "awareness.avif", w: 697, h: 671, pad: 58 },
  { name: "Awareness", kind: "pendant", file: "awareness-pendant.avif", w: 532, h: 840, pad: 70.2 },
  { name: "Compassion", kind: "ring", file: "compassion.avif", w: 345, h: 408, pad: 34, scale: 0.6 },
  { name: "Compassion", kind: "pendant", file: "compassion-pendant.avif", w: 511, h: 840, pad: 70 },
  { name: "Duality", kind: "earrings", file: "duality.avif", w: 840, h: 659, pad: 70, scale: 1.18 },
  { name: "Duality", kind: "bracelet", file: "duality-bracelet.avif", w: 840, h: 709, pad: 70.2 },
  { name: "In", kind: "pendant", file: "in.avif", w: 368, h: 792, pad: 66, scale: 0.9 },
  { name: "Liman", kind: "earrings", file: "liman.avif", w: 647, h: 795, pad: 66, scale: 1.1 },
  { name: "One", kind: "pendant", file: "one.avif", w: 332, h: 744, pad: 62, scale: 0.8 },
  { name: "Prot", kind: "pendant", file: "prot.avif", w: 389, h: 838, pad: 70 },
  // Sed is a collection of its own, not Seed's: its photograph is SED RING.
  { name: "Sed", kind: "ring", file: "sed-ring.avif", w: 602, h: 469, pad: 50, scale: 0.9 },
  { name: "Seed", kind: "pendant", file: "seed.avif", w: 700, h: 694, pad: 58 },
  { name: "Skeyes", kind: "earrings", file: "skeyes-earrings.avif", w: 618, h: 840, pad: 70 },
  { name: "Skeyes", kind: "pendant", file: "skeyes-pendant.avif", w: 295, h: 839, pad: 69.7, scale: 1.2 },
  { name: "Word", kind: "pendant", file: "word.avif", w: 523, h: 754, pad: 63 },
]
