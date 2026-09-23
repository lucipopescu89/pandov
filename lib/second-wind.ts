import type { PendantPhoto } from "@/components/pendant-gallery"

/*
 * The seven pendants of Second Wind, each on a page of its own at
 * /body/second-wind/<slug>, all drawn by the one `PendantPage`. A page is
 * nothing but its entry here: change the design in `PendantPage`, and all
 * seven change; change a price, a photograph or a line here, and only that
 * pendant does.
 *
 * Names, statements, lines and heights are the author's, from TEXTS.txt beside
 * the photographs (D:\PANDOV\2_BODY\1_SECOND_WIND\WEBSITE): there the
 * statement is the paragraph that begins "____", and the line is the one that
 * follows it. The photographs are that folder's, encoded into
 * public/images/body/<folder>/ at 1440px for a computer, 1080px for a phone
 * and 176px for the gallery's thumbnails — AVIF q90, or q70 for the
 * photographs on textured stone, whose grain costs twice the bytes at q90 and
 * shows no difference for it at the size they are drawn. Each file is named
 * after its source's own number (pandativ_21_crop.jpg → chaos-21.avif), so a
 * photograph can always be traced back. The models are the 3ds Max OBJ
 * exports, through scripts/obj-to-glb.mjs.
 */

/**
 * Where an order or a question goes. There is no shop behind the site: ORDER
 * and "Ask a question" open the visitor's own mail program with the message
 * already written to this address, the author's choice on 2026-09-23 over a
 * form on the Contact page or a cart.
 */
export const STUDIO_EMAIL = "contact@pandov.studio"

/**
 * A metal as the order panel offers it, and its price in euros: one price, or
 * one per finish, or one per karat. The first finish or karat listed is the
 * one a visitor starts on.
 */
export type Material = {
  /** The metal as written beside the price and in an order. */
  metal: string
  /** As listed in the panel, where that is shorter than `metal`. */
  label?: string
  /** The dot beside it: a yellow metal or a white one. */
  tone: "gold" | "white"
} & ({ price: number } | { finish: Record<string, number> } | { karat: Record<string, number> })

/**
 * The prices — the one place they live. Laid out as the panel shows them: in
 * rows of two, each row followed by the span of its prices.
 *
 * PLACEHOLDER for every pendant but Icarus: these are Icarus's, from the
 * author's Figma design, and every pendant shows them until the author gives
 * each its own.
 */
const PRICES: Material[][] = [
  [
    { metal: "Brass", tone: "gold", finish: { Natural: 85, Polished: 95 } },
    { metal: "Silver", tone: "white", finish: { Natural: 120, Polished: 180 } },
  ],
  [
    { metal: "Gold-plated brass", label: "Gold-plated", tone: "gold", price: 120 },
    { metal: "Rhodium-plated brass", label: "Rhodium-plated", tone: "white", price: 120 },
  ],
  [
    { metal: "Gold", tone: "gold", karat: { "14K": 1300, "18K": 1800 } },
    { metal: "Platinum", tone: "white", price: 2000 },
  ],
]

/** What every pendant of the collection shares, listed under its prices. */
export const CORD = "Black cord"
export const MADE = ["Drawn by hand", "Printed in wax", "Cast in sand"]

export type Pendant = {
  name: string
  /**
   * Set over the page in quotation marks, one entry to a line: where it breaks
   * on a computer. A phone breaks it further where it has to.
   */
  statement: string[]
  /** The line under the name. */
  line: string
  height: string
  model: string
  /**
   * The pendant cut out on the collection's ground, as Second Wind shows it:
   * "More from Second Wind" draws it, and the gallery's mark for the model is
   * a small copy of it (the same name, ending -thumb).
   */
  cutout: string
  photos: PendantPhoto[]
  materials: Material[][]
}

/** A pendant's photographs, in the order they are shown: `[file number, alt text]`. */
const photos = (folder: string, list: [string, string][]): PendantPhoto[] =>
  list.map(([n, alt]) => ({
    src: `/images/body/${folder}/${folder}-${n}.avif`,
    phone: `/images/body/${folder}/${folder}-${n}-phone.avif`,
    thumb: `/images/body/${folder}/${folder}-${n}-thumb.avif`,
    alt,
  }))

/*
 * The photographs open on the cleanest picture of the pendant, then show it
 * hanging on its cord, then worn, and end on the stone the collection was
 * first shot on. Icarus's are the exception: the author cropped them and set
 * their order on 2026-09-23, numbered 01–04 in the source folder. The rest
 * were recropped to the same 30:41 the same day, all but the ones worn, which
 * stay 2:3 and lose a little top and bottom in the frame.
 */
export const SECOND_WIND: Record<string, Pendant> = {
  icarus: {
    name: "Icarus",
    statement: ["The freedom is not in the wings,", "but in the courage to fall."],
    line: "Suspended between falling and becoming.",
    height: "48 mm",
    model: "/models/icarus.glb",
    cutout: "/images/body/icarus-pendant.avif",
    photos: photos("icarus", [
      ["1", "Icarus on grey stone, in the middle of a splash of ink"],
      ["2", "Icarus hanging on a fine cord against white marble"],
      ["3", "Icarus worn on a fine cord at the collarbone"],
      ["4", "A pair of Icarus pendants on dark stone, one turned to show its side"],
    ]),
    materials: PRICES,
  },
  waterfall: {
    name: "Waterfall",
    statement: ["Softness is power.", "Like water surrendering to gravity."],
    line: "Fluidity as a form of strength.",
    height: "53 mm",
    model: "/models/waterfall.glb",
    cutout: "/images/body/waterfall-pendant.avif",
    photos: photos("waterfall", [
      ["5", "Waterfall hanging still on its cord against a black top"],
      ["6", "Waterfall swinging on its cord against a black top"],
      ["3", "Waterfall worn on a fine chain above a black neckline"],
      ["2", "Waterfall on dark grey stone"],
      ["1", "A pair of Waterfall pendants on dark wood, one turned to show its back"],
    ]),
    materials: PRICES,
  },
  chaos: {
    name: "Chaos",
    statement: ["Sometimes, to be shattered", "is the only way forward."],
    line: "Finding meaning at the core of turbulence.",
    height: "51 mm",
    model: "/models/chaos.glb",
    cutout: "/images/body/chaos-pendant.avif",
    photos: photos("chaos", [
      ["24", "Chaos hanging on its cord against a black top"],
      ["23", "Chaos in black, hanging against a pale bare back"],
      ["earrings", "Chaos as an earring, in black, worn with a black top"],
      ["21", "Chaos on grey stone with a wave-like grain"],
      ["22", "A pair of Chaos pendants on dark stone, one turned to show its back"],
    ]),
    materials: PRICES,
  },
  silence: {
    name: "Silence",
    statement: ["Unspeakable beauty begins", "when meaning no longer needs language."],
    line: "The quiet pause where noise fades away.",
    height: "47 mm",
    model: "/models/silence.glb",
    cutout: "/images/body/silence-pendant.avif",
    photos: photos("silence", [
      ["19", "Silence hanging on its cord against a black ground"],
      ["3", "Silence worn at the collar of a navy shirt"],
      ["20", "Silence on dark stone, in the middle of a ring-like grain"],
      ["18", "A pair of Silence pendants on dark stone, one turned to show its back"],
    ]),
    materials: PRICES,
  },
  "mother-nature": {
    name: "Mother Nature",
    statement: [
      "Order is born from life returning in circles,",
      "guided by the quiet intelligence",
      "that shapes matter into living form.",
    ],
    line: "The nurturing, feminine force of becoming.",
    height: "55 mm",
    model: "/models/mnature.glb",
    cutout: "/images/body/mnature-pendant.avif",
    photos: photos("mnature", [
      ["9", "Mother Nature on white, over a sweep of white brushstrokes"],
      ["4", "Mother Nature worn on a black cord with a black top"],
      ["13", "Mother Nature worn on a fine chain, lying against the skin"],
      ["10", "Mother Nature on dark slate"],
      ["11", "A pair of Mother Nature pendants on dark slate, one turned to show its back"],
    ]),
    materials: PRICES,
  },
  presence: {
    name: "Presence",
    statement: ["To be present", "is to let life reveal itself."],
    line: "A radiant anchor in the quiet power of now.",
    height: "52 mm",
    model: "/models/presence.glb",
    cutout: "/images/body/presence-pendant.avif",
    photos: photos("presence", [
      ["15", "Presence in silver, hanging on a fine cord against a dark ground"],
      ["16", "Presence in silver, turned on its cord to show its edge"],
      ["17", "Presence in rose gold on streaked grey stone"],
      ["lumink", "Presence worn on a fine chain, a hand resting beside it"],
      ["14", "Presence in gold on dark stone, in the middle of a ring-like grain"],
    ]),
    materials: PRICES,
  },
  emperor: {
    name: "Emperor of Nothingness",
    statement: ["Emptiness is the space", "where everything begins."],
    line: "A surrender to the unseen, where every possibility awaits.",
    height: "60 mm",
    model: "/models/emperor.glb",
    cutout: "/images/body/emperor-pendant.avif",
    photos: photos("emperor", [
      ["6", "Emperor of Nothingness turning on its cord against a black top"],
      ["3", "Emperor of Nothingness worn on a black cord with an open white shirt"],
      ["7", "Emperor of Nothingness on dark stone, under a glow of embers"],
      ["8", "Emperor of Nothingness on dark slate"],
      ["5", "A pair of Emperor of Nothingness pendants on dark slate, one turned to show its back"],
    ]),
    materials: PRICES,
  },
}

/**
 * The two pendants a page ends on, under "More from Second Wind": the two that
 * come before it in the collection, counting round from the end. That is what
 * the author's design shows on Icarus — Presence and Emperor of Nothingness —
 * and it shows every pendant on exactly two other pages.
 */
export function moreFrom(slug: string): { slug: string; pendant: Pendant }[] {
  const slugs = Object.keys(SECOND_WIND)
  const i = slugs.indexOf(slug)
  return [2, 1].map((back) => {
    const s = slugs[(i - back + slugs.length) % slugs.length]
    return { slug: s, pendant: SECOND_WIND[s] }
  })
}
