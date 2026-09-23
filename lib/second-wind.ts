import type { Material, Pendant } from "@/components/pendant-page"

/*
 * The seven pendants of Second Wind, each on a page of its own at
 * /body/second-wind/<slug>, all drawn by the one `PendantPage`. A page is
 * nothing but its entry here: change the design in `PendantPage`, and all
 * seven change; change a price or a photograph here, and only that pendant
 * does.
 *
 * Names, lines and heights are the author's, from TEXTS.txt beside the
 * photographs (D:\PANDOV\2_BODY\1_SECOND_WIND\WEBSITE). The photographs are
 * that folder's, encoded into public/images/body/<folder>/ at 1440px for a
 * computer and 1080px for a phone — AVIF q90, or q70 for the photographs on
 * textured stone, whose grain costs twice the bytes at q90 and shows no
 * difference for it at the size they are drawn. The models are the 3ds Max
 * OBJ exports, through scripts/obj-to-glb.mjs.
 */

/**
 * PLACEHOLDER. Only Icarus's prices are in the Figma design, and the author
 * has said the design's materials replace the older price list, PRICES.png;
 * until the author gives each pendant its own, every pendant shows these.
 */
const PLACEHOLDER_PRICES: Material[] = [
  { name: "Brass", finishes: [{ name: "Natural", price: "85€" }, { name: "Polished", price: "95€" }] },
  { name: "Silver", finishes: [{ name: "Natural", price: "120€" }, { name: "Polished", price: "180€" }] },
  { name: "Gold-plated brass", price: "120€" },
  { name: "Rhodium-plated brass", price: "120€" },
  { name: "Gold", finishes: [{ name: "14K", price: "1300€" }, { name: "18K", price: "1800€" }] },
  { name: "Platinum", price: "2000€" },
]

/** A pendant's photographs, in the order they are shown: `[file suffix, alt text]`. */
const photos = (folder: string, list: [string, string][]) =>
  list.map(([n, alt]) => ({
    src: `/images/body/${folder}/${folder}-${n}.avif`,
    phone: `/images/body/${folder}/${folder}-${n}-phone.avif`,
    alt,
  }))

/*
 * The photographs open on the cleanest picture of the pendant, then show it
 * hanging on its cord, then worn, and end on the stone the collection was
 * first shot on. Icarus's are the exception: the author cropped them and set
 * their order on 2026-09-23, numbered 01–04 in the source folder.
 */
export const SECOND_WIND: Record<string, Pendant> = {
  icarus: {
    name: "Icarus",
    lines: ["Suspended between falling and becoming.", "The freedom is not in the wings, but in the courage to fall."],
    height: "48mm",
    model: "/models/icarus.glb",
    photos: photos("icarus", [
      ["1", "Icarus on grey stone, in the middle of a splash of ink"],
      ["2", "Icarus hanging on a fine cord against white marble"],
      ["3", "Icarus worn on a fine cord at the collarbone"],
      ["4", "A pair of Icarus pendants on dark stone, one turned to show its side"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
  waterfall: {
    name: "Waterfall",
    lines: ["Where softness becomes power.", "A quiet surrender to the fall. Fluidity as a form of strength."],
    height: "53mm",
    model: "/models/waterfall.glb",
    photos: photos("waterfall", [
      ["6", "Waterfall hanging still on its cord against a black top"],
      ["5", "Waterfall swinging on its cord against a black top"],
      ["3", "Waterfall worn on a fine chain above a black neckline"],
      ["1", "Waterfall on dark grey stone"],
      ["2", "A pair of Waterfall pendants on dark wood, one turned to show its back"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
  chaos: {
    name: "Chaos",
    lines: ["Sometimes, to be shattered is the only way forward.", "Finding meaning at the core of turbulence."],
    height: "51mm",
    model: "/models/chaos.glb",
    photos: photos("chaos", [
      ["6", "Chaos hanging on its cord against a black top"],
      ["4", "Chaos in black, hanging against a pale bare back"],
      ["earrings", "Chaos as an earring, in black, worn with a black top"],
      ["1", "Chaos on grey stone with a wave-like grain"],
      ["2", "A pair of Chaos pendants on dark stone, one turned to show its back"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
  silence: {
    name: "Silence",
    lines: ["When meaning no longer needs language.", "The quiet pause where noise fades away."],
    height: "47mm",
    model: "/models/silence.glb",
    photos: photos("silence", [
      ["4", "Silence hanging on its cord against a black ground"],
      ["3", "Silence worn at the collar of a navy shirt"],
      ["1", "Silence on dark stone, in the middle of a ring-like grain"],
      ["2", "A pair of Silence pendants on dark stone, one turned to show its back"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
  "mother-nature": {
    name: "Mother Nature",
    lines: ["Order born from life returning in circles.", "A nurturing, feminine force of becoming."],
    height: "55mm",
    model: "/models/mnature.glb",
    photos: photos("mnature", [
      ["1", "Mother Nature on white, over a sweep of white brushstrokes"],
      ["7", "Mother Nature hanging on its cord against a black top"],
      ["4", "Mother Nature worn on a black cord with a black top"],
      ["alina", "Mother Nature worn on a fine chain, lying against the skin"],
      ["2", "Mother Nature on dark slate"],
      ["3", "A pair of Mother Nature pendants on dark slate, one turned to show its back"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
  presence: {
    name: "Presence",
    lines: ["Here, completely.", "A radiant anchor in the quiet power of now."],
    height: "52mm",
    model: "/models/presence.glb",
    photos: photos("presence", [
      ["4", "Presence in silver, hanging on a fine cord against a dark ground"],
      ["5", "Presence in silver, turned on its cord to show its edge"],
      ["7", "Presence in rose gold on streaked grey stone"],
      ["lumink", "Presence worn on a fine chain, a hand resting beside it"],
      ["1", "Presence in gold on dark stone, in the middle of a ring-like grain"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
  emperor: {
    name: "Emperor of Nothingness",
    lines: ["Emptiness holds endless potential.", "A surrender to the unseen, where every possibility awaits."],
    height: "60mm",
    model: "/models/emperor.glb",
    photos: photos("emperor", [
      ["4", "Emperor of Nothingness turning on its cord against a black top"],
      ["3", "Emperor of Nothingness worn on a black cord with an open white shirt"],
      ["5", "Emperor of Nothingness on dark stone, under a glow of embers"],
      ["1", "Emperor of Nothingness on dark slate"],
      ["2", "A pair of Emperor of Nothingness pendants on dark slate, one turned to show its back"],
    ]),
    materials: PLACEHOLDER_PRICES,
  },
}
