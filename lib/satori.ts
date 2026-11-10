import type { Material, Pendant } from "@/lib/second-wind"

/*
 * Satori, the second collection on /body to be finished (2026-11-10, the
 * author's asking: moved up from the work in progress, above the rule, under
 * a beating diamond of its own). Four pendants, each on a page of its own at
 * /body/satori/<slug>, drawn by the same `PendantPage` as Second Wind's.
 *
 * Two forms, each in two sizes, from the author's 3ds Max exports in
 * D:\PANDOV\2_BODY\2_SATORI\Export OBJ (Satori1–4.obj), made into
 * public/models/satori-<n>.glb with scripts/obj-to-glb.mjs: a ring (1, 3) and
 * a sun of rays (2, 4), each with the bird at its foot. The heights are the
 * models' own, as the script measured them.
 *
 * For now a page has the model alone: no photographs, so the gallery opens on
 * the model and its "3D" mark is the only one. The author will retouch the
 * photographs and they go into `photos`, as Second Wind's do, with no other
 * change. The renders on /body/satori and the cut-outs here
 * (`satori-<n>-pendant.avif`, and its -thumb) are frames of the same model
 * drawn by the site's own viewer in gold plating, saved in
 * D:\PANDOV\2_BODY\2_SATORI\WEB RENDERS, until the author's own pictures and
 * the collection's SVG presentation replace them.
 *
 * Still the author's to give: each pendant's name, its statement and its line
 * (the pages show none until then).
 */

/**
 * The prices follow each pendant's volume of metal (2026-11-10, the author's
 * asking: in proportion to the metal, and to Second Wind's). Second Wind's are
 * worked out from what a pendant costs to have made (see `PRICES` in
 * lib/second-wind.ts); here the metal's part of that cost, the makers'
 * quotes in dollars, is scaled by the pendant's volume against Second Wind's
 * mean, and the rest is Second Wind's own rule unchanged: to euros at 1.145,
 * 12 € shipping and 21% VAT on top, brass and the platings three times that,
 * silver it and 150 € more, gold and platinum it and 500 € more, rounded up to
 * 5 € under 1000 € and to 50 € over it. At a volume of 1 it gives Second
 * Wind's prices exactly. Stainless steel, priced by the author at 50 €, is
 * scaled by the volume alone.
 *
 * The volumes are the OBJ exports' own, in mm³, measured as closed meshes
 * (every edge shared by two faces): Second Wind's seven are 368–675, a mean of
 * `SECOND_WIND_MM3`. The makers' quotes are not quite in proportion to the
 * metal (a part of each is handling), so these are estimates until Sculpteo
 * and Shapeways quote the pieces themselves.
 */
const SECOND_WIND_MM3 = 595.6
const QUOTE_USD = { brass: [22, 28], silver: [66, 86], plated: 53, gold: [1420, 2026], platinum: 2000 }
const STEEL_EUR = 50

function roundUp(eur: number): number {
  return eur < 1000 ? Math.ceil(eur / 5) * 5 : Math.ceil(eur / 50) * 50
}

/** The order panel's metals and prices for a pendant of `mm3` of metal, laid out as Second Wind's. */
function pricesFor(mm3: number): Material[][] {
  const k = mm3 / SECOND_WIND_MM3
  const cost = (usd: number) => (usd * k / 1.145 + 12) * 1.21
  const times3 = (usd: number) => roundUp(3 * cost(usd))
  const plus = (usd: number, eur: number) => roundUp(cost(usd) + eur)
  return [
    [{ metal: "Stainless steel", tone: "steel", price: roundUp(STEEL_EUR * k), made: ["Drawn by hand", "Printed in steel"] }],
    [
      { metal: "Brass", tone: "gold", finish: { Natural: times3(QUOTE_USD.brass[0]), Polished: times3(QUOTE_USD.brass[1]) } },
      {
        metal: "Silver",
        tone: "white",
        finish: { Polished: plus(QUOTE_USD.silver[0], 150), "Mirror Polished": plus(QUOTE_USD.silver[1], 150) },
      },
    ],
    [
      { metal: "Gold-plated brass", label: "Gold-plated", tone: "gold", price: times3(QUOTE_USD.plated) },
      { metal: "Black rhodium-plated brass", label: "Black rhodium", tone: "dark", price: times3(QUOTE_USD.plated) },
    ],
    [
      { metal: "Gold", tone: "gold", karat: { "14K": plus(QUOTE_USD.gold[0], 500), "18K": plus(QUOTE_USD.gold[1], 500) } },
      { metal: "Platinum", tone: "white", price: plus(QUOTE_USD.platinum, 500) },
    ],
  ]
}
export const SATORI: Record<string, Pendant> = {
  "satori-1": {
    name: "Satori I",
    statement: [],
    line: "",
    height: "56 mm",
    model: "/models/satori-1.glb",
    cutout: "/images/body/satori-1-pendant.avif",
    photos: [],
    materials: pricesFor(1114.0), // mm³
  },
  "satori-2": {
    name: "Satori II",
    statement: [],
    line: "",
    height: "24 mm",
    model: "/models/satori-2.glb",
    cutout: "/images/body/satori-2-pendant.avif",
    photos: [],
    materials: pricesFor(337.2), // mm³
  },
  "satori-3": {
    name: "Satori III",
    statement: [],
    line: "",
    height: "23 mm",
    model: "/models/satori-3.glb",
    cutout: "/images/body/satori-3-pendant.avif",
    photos: [],
    materials: pricesFor(200.7), // mm³
  },
  "satori-4": {
    name: "Satori IV",
    statement: [],
    line: "",
    height: "48 mm",
    model: "/models/satori-4.glb",
    cutout: "/images/body/satori-4-pendant.avif",
    photos: [],
    materials: pricesFor(2151.4), // mm³
  },
}

/** The renders /body/satori shows, one under the next, until the SVG presentation. */
export const SATORI_RENDER = (slug: string) => `/images/body/satori/${slug}.avif`
