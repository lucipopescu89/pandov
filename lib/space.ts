import type { PendantPhoto } from "@/components/pendant-gallery"

/*
 * The pieces of Space, each on a page of its own at /space/<slug>, all drawn
 * by the one `SpacePiecePage`, as the pendants are by `PendantPage`: a page is
 * nothing but its entry here.
 *
 * A piece of Space is not offered in a choice of metals but in its wood's two
 * finishes, at one price: the wood left as it is, oiled, or ebonised. As on a
 * pendant's page, the photographs are the piece's, all of them together,
 * whatever the finish chosen; choosing one turns the gallery to the model,
 * wearing it (the author's asking, the evening of 2026-11-22).
 *
 * Heavy Light, the first (2026-11-22). The author's: the name, the size, the
 * bulb, the wood (reclaimed, so oak, white ash or acacia, whatever the piece
 * is cut from; drawn as oak in the model), the two finishes at one price, that
 * a piece is made to order, some of found wood and so one of a kind, the
 * cable cut short in the model because its length is the client's to choose,
 * the statement and the line under the name. Put in by Claude to be read over
 * and changed: the price and the words under "Wood", "Light", "Cable" and
 * "Made". The price was weighed against comparable pieces the same evening
 * (see the report in the conversation): kept at 690 €.
 *
 * The photographs are the author's, from D:\PANDOV\3_SPACE\1_HEAVY LIGHT,
 * cropped to the gallery's 30:41 and encoded into public/images/space/<slug>/
 * as the pendants' are: 1440px for a computer, 1080px for a phone, 176px for
 * the thumbnails. The model is the folder's OBJ, through
 * scripts/space-obj-to-glb.mjs.
 */

/** A finish of the wood, and what is said of it while it is chosen. */
export type SpaceFinish = {
  /** As written in the panel and in an order. */
  name: string
  /** The dot beside it in the panel. */
  dot: string
  /** Which of the viewer's woods the model wears. */
  look: "natural" | "ebonised"
  /** Under "Wood", one entry to a line. */
  wood: string[]
  /** Under "Made", one entry to a line. */
  made: string[]
}

export type SpacePiece = {
  name: string
  /** Set over the page in quotation marks, one entry to a line, as the pendants' are. */
  statement: string[]
  /** Under the name. */
  line: string
  /** One price for every finish, in euros. */
  price: number
  /** Width × depth × height. */
  size: string
  /** Under "Light", one entry to a line. */
  light: string[]
  /** Under "Cable", one entry to a line. */
  cable: string[]
  /** Every photograph of the piece, in the order they are shown, whatever the finish. */
  photos: PendantPhoto[]
  model: string
  /** The gallery's 3D thumbnail. */
  modelThumb: string
  /** The picture on the Space page. */
  card: string
  /** The first is the one the page opens on. */
  finishes: SpaceFinish[]
}

/** A piece's photographs, in the order they are shown: `[file name's end, alt text]`. */
const photos = (slug: string, list: [string, string][]): PendantPhoto[] =>
  list.map(([n, alt]) => ({
    src: `/images/space/${slug}/${slug}-${n}.avif`,
    phone: `/images/space/${slug}/${slug}-${n}-phone.avif`,
    thumb: `/images/space/${slug}/${slug}-${n}-thumb.avif`,
    alt,
  }))

const WOOD = ["Reclaimed oak, ash or acacia", "Each piece keeps its own grain"]
const SHAPED = "Shaped from solid wood"
const TO_ORDER = "Made to order"

export const SPACE_PIECES: Record<string, SpacePiece> = {
  "heavy-light": {
    name: "Heavy Light",
    statement: ["Unmoved,", "anchored by a heavy core of light."],
    line: "When light becomes heavy.",
    price: 690,
    size: "94 × 88 × 395 mm",
    light: ["E14 bulb, warm white", "with a gold crown"],
    cable: ["Black", "Its length made to order"],
    // The two finishes in turn at first, so both are seen early; then the rest.
    photos: photos("heavy-light", [
      ["natural-1", "Heavy Light in natural wood against a pale wall, its gold-crowned bulb set into the body"],
      ["ebonised-1", "Heavy Light ebonised, near black, its gold-crowned bulb set into the body"],
      ["natural-2", "Heavy Light lit in a dark room, the bulb glowing from its hollow"],
      ["ebonised-2", "Heavy Light ebonised, from the side, its cable running off behind"],
      ["natural-3", "Heavy Light lit on a stone, in the dark"],
      ["natural-4", "Heavy Light on a desk beside books and a vase"],
      ["natural-5", "The top of Heavy Light before a pale curtain"],
    ]),
    model: "/models/heavy-light.glb",
    modelThumb: "/images/space/heavy-light/heavy-light-3d-thumb.avif",
    card: "/images/space/heavy-light-card.avif",
    finishes: [
      {
        name: "Natural",
        dot: "#8C7358",
        look: "natural",
        wood: WOOD,
        made: [SHAPED, "Oiled by hand", TO_ORDER],
      },
      {
        name: "Ebonised",
        dot: "#4A443E",
        look: "ebonised",
        wood: [...WOOD.slice(0, 1), "Ebonised, the grain still showing"],
        made: [SHAPED, "Ebonised and oiled by hand", TO_ORDER],
      },
    ],
  },
}
