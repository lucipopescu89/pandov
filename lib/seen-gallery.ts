/**
 * What /seen shows (2026-11-22, the author's asking): the pictures the author
 * gathered for it in `D:\PANDOV\MARKETING\ELEMENTE WEBSITE\7 EYE`. Until that
 * day it showed every photograph on the site (the Chess Set, the categories,
 * Second Wind's photographs).
 *
 * The folder's pictures are in `public/images/seen/`, each made from its file
 * at no more than 1500 × 1000 (AVIF q70 4:4:4), whole, never cut, and again
 * larger in `public/images/seen/large/` for when one is opened (`big`). A new
 * one: make both the same way and add a line here with their sizes in pixels. Their
 * names here are cleaned up from the files' (the four Unsplash photographs
 * by what they show: `awareness-hand`, `awareness-worn`, `balance-worn`,
 * `compassion-worn`).
 *
 * The site's jewellery thumbnails (`BODY_PIECES`, `SATORI_PIECE`, the Second
 * Wind cut-outs) were shown here too for a moment the same morning, and taken
 * out at the author's asking: cut too close round the pieces, they came too
 * near the edges of their fields. The author is putting photographs of those
 * pieces with more ground into the folder instead.
 */
export type SeenTile = {
  src: string
  alt: string
  /** The file's size, px: its proportion is kept whole. */
  w: number
  h: number
  /**
   * The larger file shown when the picture is opened (`SeenLightbox`), its
   * size in px: `public/images/seen/large/`, the same name, made from the
   * same file at no more than 2400 on its longer side (smaller files as they
   * are), AVIF q70 4:4:4. Loaded only when the picture is opened.
   */
  big?: [number, number]
  /**
   * A piece cut out on the #202020 ground: never drawn larger than its own
   * pixels (some are small files), standing in the middle of its field, its
   * ground meeting the page's unseen.
   */
  cutout?: boolean
}

export const SEEN_FOLDER: SeenTile[] = [
  { src: "/images/seen/1-fata-albita.avif", alt: "Pendants on a burnt trunk, on white", w: 1500, h: 1000, big: [2400, 1600] },
  { src: "/images/seen/11-cruce.avif", alt: "A gold pendant hung from a burnt branch", w: 667, h: 1000, big: [1600, 2400] },
  { src: "/images/seen/12-daydreming.avif", alt: "Pendants hung from a burnt branch", w: 667, h: 1000, big: [1600, 2400] },
  { src: "/images/seen/14-satori-white.avif", alt: "Satori on a burnt trunk, on white", w: 1500, h: 1000, big: [2400, 1600] },
  { src: "/images/seen/3-compassion.avif", alt: "A ring and two pendants on a burnt trunk, on white", w: 1500, h: 1000, big: [2400, 1600] },
  { src: "/images/seen/3.avif", alt: "The Chess Set's pieces on their board", w: 1334, h: 1000, big: [2400, 1800] },
  { src: "/images/seen/5-protection.avif", alt: "Protection, a gold pendant, on a burnt trunk", w: 750, h: 1000, big: [1800, 2400] },
  { src: "/images/seen/8bulu.avif", alt: "Pendants hung over a burnt sculpture", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/arh.avif", alt: "A wall sculpture in wood", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/awareness-hand.avif", alt: "The Awareness bracelet worn at the wrist", w: 1000, h: 1000, big: [2400, 2400] },
  { src: "/images/seen/awareness-pendant.avif", alt: "Awareness, a gold pendant", w: 666, h: 1000, big: [1023, 1537] },
  { src: "/images/seen/awareness-worn.avif", alt: "The Awareness pendant worn", w: 1000, h: 1000, big: [2400, 2400] },
  { src: "/images/seen/b-waterfall-3.avif", alt: "The Waterfall pendant on stone", w: 666, h: 1000, big: [1253, 1881] },
  { src: "/images/seen/balance-bracelet.avif", alt: "The Balance bracelet on a white wrist", w: 1000, h: 1000, big: [2000, 2000] },
  { src: "/images/seen/balance-worn.avif", alt: "The Balance earrings worn", w: 1000, h: 1000, big: [2348, 2349] },
  { src: "/images/seen/burning-wall.avif", alt: "A wall sculpture lit from within", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/c-chaos-4.avif", alt: "The Chaos pendant worn", w: 737, h: 1000, big: [1768, 2400] },
  { src: "/images/seen/compassion-worn.avif", alt: "The Compassion pendant worn", w: 1000, h: 1000, big: [2400, 2400] },
  { src: "/images/seen/compassion.avif", alt: "The Compassion ring worn", w: 1000, h: 1000, big: [1328, 1328] },
  { src: "/images/seen/d-nature-4.avif", alt: "The Mother Nature pendant worn", w: 667, h: 1000, big: [1341, 2012] },
  { src: "/images/seen/duality-bracelet.avif", alt: "Duality, a bracelet", w: 979, h: 1000, big: [1241, 1268] },
  { src: "/images/seen/duality.avif", alt: "Duality, earrings", w: 666, h: 1000, big: [1023, 1537] },
  { src: "/images/seen/e-silence-3.avif", alt: "The Silence pendant worn", w: 667, h: 1000, big: [1084, 1625] },
  { src: "/images/seen/eatinganima.avif", alt: "A carved mask in dark and pale wood", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/emperor-of-nothingness-2.avif", alt: "Emperor of Nothingness on dark stone", w: 667, h: 1000, big: [1600, 2400] },
  { src: "/images/seen/eye-in-the-sky-sculpture.avif", alt: "Eye in the Sky, a sculpture", w: 1000, h: 1000, big: [2100, 2100] },
  { src: "/images/seen/f-presence-1.avif", alt: "Presence on dark stone", w: 667, h: 1000, big: [1600, 2400] },
  { src: "/images/seen/falling-1.avif", alt: "A gold sculpture amid rings of light", w: 1000, h: 1000, big: [1980, 1980] },
  { src: "/images/seen/falling-3-a.avif", alt: "A white sculpture on a wooden base", w: 752, h: 1000, big: [1805, 2400] },
  { src: "/images/seen/falling.avif", alt: "A dark disc with a point of gold", w: 1000, h: 1000, big: [1200, 1200] },
  { src: "/images/seen/fatacucapra.avif", alt: "A carved wall sculpture", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/grounded-1.avif", alt: "A glowing sculpture", w: 647, h: 1000, big: [1553, 2400] },
  { src: "/images/seen/icarus-1.avif", alt: "The Icarus pendant worn", w: 666, h: 1000, big: [1376, 2065] },
  { src: "/images/seen/img-4671.avif", alt: "A tall wooden sculpture", w: 785, h: 1000, big: [1728, 2200] },
  { src: "/images/seen/img-7929.avif", alt: "A silver pendant", w: 680, h: 1000, big: [1632, 2400] },
  { src: "/images/seen/laz-c.avif", alt: "A pendant on white", w: 1000, h: 1000, big: [1500, 1500] },
  { src: "/images/seen/lil.avif", alt: "A pair of sculptural handles on dark wood", w: 1000, h: 1000, big: [2100, 2100] },
  { src: "/images/seen/liman.avif", alt: "Liman, earrings", w: 666, h: 1000, big: [1023, 1537] },
  { src: "/images/seen/nerv-2.avif", alt: "A wall sculpture in wood with a lit eye", w: 635, h: 1000, big: [1524, 2400] },
  { src: "/images/seen/noiz.avif", alt: "A pair of sculptural handles on dark wood", w: 1000, h: 1000, big: [2100, 2100] },
  { src: "/images/seen/omnimal-5.avif", alt: "A carved wall sculpture in pale wood", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/omnimal-6.avif", alt: "A carved wall sculpture in pale wood", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/orez.avif", alt: "A lamp, a figure under a white shade", w: 647, h: 1000, big: [1553, 2400] },
  { src: "/images/seen/ou-duality.avif", alt: "A pendant on a dark stone egg", w: 1000, h: 1000, big: [2275, 2275] },
  { src: "/images/seen/perception.avif", alt: "A sculpted head", w: 1000, h: 1000, big: [2100, 2100] },
  { src: "/images/seen/raiz-3.avif", alt: "A pendant before a radiant ground", w: 1000, h: 1000, big: [2000, 2000] },
  { src: "/images/seen/satori-11.avif", alt: "A figure before a sunburst", w: 1000, h: 1000, big: [2100, 2100] },
  { src: "/images/seen/seduction-re.avif", alt: "A ring on a white hand", w: 1500, h: 844, big: [2400, 1350] },
  { src: "/images/seen/seed.avif", alt: "Seed, a pendant", w: 894, h: 1000, big: [1186, 1327] },
  { src: "/images/seen/seeds-earrings.avif", alt: "Seeds, earrings", w: 800, h: 1000, big: [1920, 2400] },
  { src: "/images/seen/skeyes-pendant.avif", alt: "Skeyes, a pendant", w: 917, h: 1000, big: [1201, 1309] },
  { src: "/images/seen/sss.avif", alt: "A wall sculpture in wood and white", w: 709, h: 1000, big: [1056, 1489] },
  { src: "/images/seen/stufo5.avif", alt: "A white sculpture on a red base", w: 635, h: 1000, big: [1500, 2363] },
  { src: "/images/seen/t2-15.avif", alt: "A sunburst pendant over line drawings", w: 667, h: 1000, big: [1600, 2400] },
  { src: "/images/seen/ume.avif", alt: "A white lamp on a wooden base", w: 752, h: 1000, big: [1805, 2400] },
  { src: "/images/seen/universe-of-presence.avif", alt: "Pendants hung on dark cloth", w: 943, h: 1000, big: [2264, 2400] },
  { src: "/images/seen/untitled-1.avif", alt: "A pendant with a glowing sphere", w: 752, h: 1000, big: [1087, 1446] },
  { src: "/images/seen/untitled-2.avif", alt: "A pendant over a drawn sun", w: 688, h: 1000, big: [1651, 2400] },
  { src: "/images/seen/x-oline.avif", alt: "A sculptural object on dark stone", w: 1000, h: 1000, big: [2000, 2000] },
  // Added to the folder the same morning, while the page was being made.
  { src: "/images/seen/black-king.avif", alt: "The Chess Set's black king in the dark", w: 1000, h: 1000, big: [1203, 1203] },
  { src: "/images/seen/imagine-headline.avif", alt: "Chess pieces in a row, a gold one among them", w: 1334, h: 1000, big: [2400, 1800] },
  { src: "/images/seen/on-table-1.avif", alt: "The Chess Set on a white table", w: 1500, h: 1000, big: [2400, 1600] },
  { src: "/images/seen/on-table-2.avif", alt: "Chess pieces on the board, close", w: 1262, h: 1000, big: [2400, 1901] },
  { src: "/images/seen/on-table-4.avif", alt: "A game under way on the Chess Set", w: 1500, h: 1000, big: [2400, 1600] },
  { src: "/images/seen/on-table-5.avif", alt: "The Chess Set on a white table", w: 1500, h: 1000, big: [2400, 1600] },
  { src: "/images/seen/rendering-2.avif", alt: "A gold piece among pale chess pieces", w: 1334, h: 1000, big: [2400, 1800] },
]

export const SEEN_TILES: SeenTile[] = SEEN_FOLDER

/** The file a picture opens on: its larger copy where it has one. */
export const bigSrc = (t: SeenTile) => (t.big ? t.src.replace("/images/seen/", "/images/seen/large/") : t.src)
