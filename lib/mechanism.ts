/**
 * Splits a concentric SVG artwork into rings that can each be animated alone.
 *
 * Every ring is moved into its own small `<svg>`, cropped to a square around
 * that ring's centre. A browser can then rasterise each ring once and spin,
 * scale or fade it as a GPU layer. Animating `<g>` groups inside one SVG would
 * repaint every path on every frame instead — the same trap that made the SMIL
 * particles stutter on an iPhone 8.
 *
 * Pure string work, run on the server while the page renders.
 */

/** How one ring moves. Spin is in degrees per second; positive is clockwise. */
export type Motion = {
  spin: number
  /**
   * "heart": a lub-dub beat. "wave": a pulse into the void — the ring's dots
   * brighten where they sit, then travel straight outward, fading with the
   * distance until they are gone.
   */
  pulse?: "heart" | "wave"
  /** Heart only: scale added at the peak of the beat. */
  grow?: number
  /** Heart only: opacity between beats; the beat itself peaks at 1. */
  dim?: number
  /** Wave only: how far the dots travel before they have faded out, in the artwork's units. */
  reach?: number
  /**
   * How far behind the shared cycle this ring runs, as a share of a cycle.
   * Hearts lagged ring by ring send the beat rippling outward.
   */
  lag?: number
  /**
   * Wave only: how individually the dots move, 0 → 1. At 0 a ring travels as
   * one. Above that, each dot sets off up to this share of a cycle late and
   * may travel less far, so the ring breaks apart as it goes.
   */
  scatter?: number
  /** Spin quickens while the page is scrolling. */
  scrollSpin?: boolean
  /** Pulse rate quickens while the page is scrolling. */
  scrollPulse?: boolean
}

/**
 * One circular gradient laid over the whole mechanism, in the artwork's own
 * units: the rings keep all of their light through the band where the pattern
 * is densest and fade toward the centre and toward the rim, the way a lens
 * gathers an image. Three points, as a design tool draws it — `floor` at the
 * centre, solid at `peak`, `floor` again from `edge` outward.
 *
 * It is the one shaping that costs nothing to combine with a turning ring: a
 * circle centred on what the ring turns about looks the same at every angle, so
 * the mask never has to be redrawn. Rings take it one by one, through
 * `RingSpec.vignette`.
 */
export type Vignette = {
  /** Radius, in the artwork's units, at which the gradient is fully solid. */
  peak: number
  /** Radius at which the fade outward has finished; it stays at `floor` beyond. */
  edge: number
  /** How much of a ring's light is left at the centre and past the edge, 0 → 1. */
  floor: number
}

/** A ring, picked out by its distance from the artwork's centre. */
export type RingSpec = {
  key: string
  /** Radius band in the artwork's own units: from inclusive, to exclusive. */
  from: number
  to: number
  motion: Motion
  /**
   * Multiplies the opacity the ring inherits from the design file's groups,
   * capped at fully opaque.
   */
  brighten?: number
  /**
   * Lowest opacity any gradient stop on this ring may have. For rings whose
   * glow fades them almost to nothing exactly where they sit.
   */
  gradientFloor?: number
  /**
   * Lay the shared circular gradient over this ring. See `Vignette`. Rings
   * whose dots leave the mandala are left out: they are cut into sprites and
   * carried far past where the gradient means anything.
   */
  vignette?: boolean
}

export type MechanismLayer = {
  key: string
  svg: string
  /** Placement over the base artwork, in percent of its width and height. */
  left: number
  top: number
  width: number
  height: number
  /** The same square in the artwork's own units. */
  x: number
  y: number
  size: number
  motion: Motion
  /**
   * Wave rings only: the separate shapes the wave carries outward, as
   * [x0, y0, x1, y1, …] boxes in the artwork's units.
   */
  pieces?: number[]
}

export type ViewBox = { x: number; y: number; width: number; height: number }

/** Room around a ring's outer edge so no stroke touches the crop. */
const PAD = 2
/**
 * Subpaths on a wave ring whose boxes overlap draw one shape — the inner and
 * outer edge of a ring, say — and travel together. Separate dots travel on
 * their own, even the two of a pair, whose boxes almost touch when the pair
 * sits diagonally.
 */
const SHAPE_GAP = 0

const PATH = /<path\b[^>]*?(?:\/>|>[\s\S]*?<\/path>)/g
const TOKEN = new RegExp(`<g\\b([^>]*?)(/?)>|</g>|${PATH.source}`, "g")
const GRADIENT = /<(linearGradient|radialGradient)\b[^>]*\sid="([^"]+)"[^>]*>[\s\S]*?<\/\1>/g
const PAINT_REF = /url\(#([^)]+)\)/g

export type Box = { x0: number; y0: number; x1: number; y1: number }

/**
 * Bounding box of a path's points, control points included. Handles the
 * absolute commands design tools export; relative commands are skipped, so a
 * hand-written path using them would be measured wrong.
 */
export function extent(d: string): Box {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  const add = (x: number, y: number) => {
    if (x < box.x0) box.x0 = x
    if (x > box.x1) box.x1 = x
    if (y < box.y0) box.y0 = y
    if (y > box.y1) box.y1 = y
  }
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
  let cmd = ""
  let x = 0
  let y = 0
  for (let i = 0; i < tokens.length; ) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i++]
      continue
    }
    const n = (k: number) => Number(tokens[i + k])
    switch (cmd) {
      case "M":
      case "L":
      case "T":
        x = n(0)
        y = n(1)
        add(x, y)
        i += 2
        if (cmd === "M") cmd = "L"
        break
      case "H":
        x = n(0)
        add(x, y)
        i += 1
        break
      case "V":
        y = n(0)
        add(x, y)
        i += 1
        break
      case "C":
        add(n(0), n(1))
        add(n(2), n(3))
        x = n(4)
        y = n(5)
        add(x, y)
        i += 6
        break
      case "S":
      case "Q":
        add(n(0), n(1))
        x = n(2)
        y = n(3)
        add(x, y)
        i += 4
        break
      case "A":
        x = n(5)
        y = n(6)
        add(x, y)
        i += 7
        break
      default:
        i += 1
    }
  }
  return box
}

const round = (n: number) => Math.round(n * 1000) / 1000
const fmt = (n: number) => String(round(n))

/** Raises every stop-opacity in a gradient definition to at least `floor`. */
function floorStops(def: string, floor: number): string {
  // A stop without stop-opacity is already fully opaque, so it is left alone.
  return def.replace(/(<stop\b[^>]*\sstop-opacity=")([^"]+)"/g, (_, head: string, value: string) =>
    `${head}${fmt(Math.max(floor, Number(value)))}"`,
  )
}

/**
 * The separate shapes a set of paths draws: every subpath is measured, and
 * subpaths within SHAPE_GAP of each other are gathered into one box.
 */
function piecesOf(els: string[]): number[] {
  const boxes = els
    .flatMap((el) => (el.match(/\sd="([^"]+)"/)?.[1] ?? "").split(/(?=M)/))
    .map(extent)
    .filter((box) => Number.isFinite(box.x0))

  const parent = boxes.map((_, i) => i)
  const root = (i: number) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i]
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j]
      if (
        Math.max(a.x0 - b.x1, b.x0 - a.x1) < SHAPE_GAP &&
        Math.max(a.y0 - b.y1, b.y0 - a.y1) < SHAPE_GAP
      ) {
        parent[root(i)] = root(j)
      }
    }
  }

  const groups = new Map<number, Box>()
  boxes.forEach((box, i) => {
    const key = root(i)
    const group = groups.get(key)
    groups.set(
      key,
      group
        ? {
            x0: Math.min(group.x0, box.x0),
            y0: Math.min(group.y0, box.y0),
            x1: Math.max(group.x1, box.x1),
            y1: Math.max(group.y1, box.y1),
          }
        : box,
    )
  })
  return [...groups.values()].flatMap((g) => [round(g.x0), round(g.y0), round(g.x1), round(g.y1)])
}

export function splitMechanism(
  svg: string,
  rings: RingSpec[],
  vignette?: Vignette,
): { base: string; layers: MechanismLayer[]; viewBox: ViewBox } {
  const viewBoxAttr = svg.match(/<svg\b[^>]*\sviewBox="([^"]+)"/)?.[1]
  if (!viewBoxAttr) return { base: svg, layers: [], viewBox: { x: 0, y: 0, width: 1, height: 1 } }
  const [vbX, vbY, vbW, vbH] = viewBoxAttr.split(/[\s,]+/).map(Number)
  const viewBox = { x: vbX, y: vbY, width: vbW, height: vbH }
  // Paths inherit presentation attributes from the root; Figma sets fill="none".
  const rootFill = svg.match(/<svg\b[^>]*\sfill="([^"]+)"/)?.[1]

  const gradients = new Map<string, string>()
  for (const m of svg.matchAll(GRADIENT)) gradients.set(m[2], m[0])

  // Walk groups and paths in document order, so each path carries the combined
  // opacity of every <g> it sits inside. Figma wraps whole rings in opacity
  // groups, and lifting a path out without that would make it brighter.
  const found: { el: string; box: Box; opacity: number }[] = []
  const opacity = [1]
  for (const m of svg.matchAll(TOKEN)) {
    const tag = m[0]
    if (tag.startsWith("</g")) {
      if (opacity.length > 1) opacity.pop()
    } else if (tag.startsWith("<g")) {
      if (m[2] !== "/") {
        const own = Number(m[1].match(/\sopacity="([^"]+)"/)?.[1] ?? 1)
        opacity.push(opacity[opacity.length - 1] * own)
      }
    } else {
      const d = tag.match(/\sd="([^"]+)"/)?.[1] ?? ""
      found.push({ el: tag, box: extent(d), opacity: opacity[opacity.length - 1] })
    }
  }
  if (found.length === 0) return { base: svg, layers: [], viewBox }

  // The widest path is a complete outer ring, so its box is centred on the art.
  const widest = found.reduce((a, b) =>
    b.box.x1 - b.box.x0 > a.box.x1 - a.box.x0 ? b : a,
  )
  const cx = (widest.box.x0 + widest.box.x1) / 2
  const cy = (widest.box.y0 + widest.box.y1) / 2

  // A complete ring's box surrounds the centre, so half its width is its
  // radius; a single ornament sits at the distance of its own middle.
  const ringOf = found.map(({ box: { x0, y0, x1, y1 } }) => {
    const r =
      x0 < cx && x1 > cx && y0 < cy && y1 > cy
        ? Math.max(x1 - x0, y1 - y0) / 2
        : Math.hypot((x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy)
    return rings.find((ring) => r >= ring.from && r < ring.to)
  })

  const lifted = new Set<number>()
  const moved = new Set<string>()
  const layers: MechanismLayer[] = []

  for (const ring of rings) {
    const members = found.flatMap((f, i) => (ringOf[i] === ring ? [{ ...f, i }] : []))
    if (members.length === 0) continue

    const box = {
      x0: Math.min(...members.map((m) => m.box.x0)),
      y0: Math.min(...members.map((m) => m.box.y0)),
      x1: Math.max(...members.map((m) => m.box.x1)),
      y1: Math.max(...members.map((m) => m.box.y1)),
    }
    // Each ring turns about its own middle, which stays right even if the
    // rings of a drawing are not all perfectly concentric.
    const half = Math.max(box.x1 - box.x0, box.y1 - box.y0) / 2 + PAD
    const x = round((box.x0 + box.x1) / 2 - half)
    const y = round((box.y0 + box.y1) / 2 - half)
    const size = round(half * 2)

    const defs: string[] = []
    const seen = new Set<string>()
    const byOpacity = new Map<number, string[]>()
    for (const m of members) {
      lifted.add(m.i)
      let el = m.el
      for (const [, id] of m.el.matchAll(PAINT_REF)) {
        const def = gradients.get(id)
        if (!def) continue
        moved.add(id)
        if (ring.gradientFloor === undefined) {
          if (!seen.has(id)) defs.push(def)
        } else {
          // The lifted copy gets its own id: gradient ids are shared across the
          // whole page, and it must not stand in for the original anywhere else.
          const own = `${id}--${ring.key}`
          el = el.replaceAll(`url(#${id})`, `url(#${own})`)
          if (!seen.has(id)) {
            defs.push(floorStops(def, ring.gradientFloor).replace(`id="${id}"`, `id="${own}"`))
          }
        }
        seen.add(id)
      }
      const op = Math.min(1, m.opacity * (ring.brighten ?? 1))
      const group = byOpacity.get(op) ?? []
      group.push(el)
      byOpacity.set(op, group)
    }
    let body = [...byOpacity]
      .map(([op, els]) =>
        op === 1 ? els.join("") : `<g opacity="${fmt(op)}">${els.join("")}</g>`,
      )
      .join("")

    if (vignette && ring.vignette) {
      // The shared circular gradient, as a mask in the artwork's own units, so
      // every ring is cut by the same one. It is centred on the ring's own
      // middle — what the ring turns about — so however far the ring has turned
      // the mask lies over it exactly as it did at rest, and is never redrawn.
      const id = `vignette--${ring.key}`
      const { peak, edge, floor } = vignette
      const square = `x="${fmt(x)}" y="${fmt(y)}" width="${fmt(size)}" height="${fmt(size)}"`
      defs.push(
        `<radialGradient id="${id}-fade" gradientUnits="userSpaceOnUse"` +
          ` cx="${fmt(x + size / 2)}" cy="${fmt(y + size / 2)}" r="${fmt(edge)}">` +
          `<stop offset="0" stop-color="#fff" stop-opacity="${fmt(floor)}"/>` +
          `<stop offset="${fmt(Math.min(1, peak / edge))}" stop-color="#fff"/>` +
          `<stop offset="1" stop-color="#fff" stop-opacity="${fmt(floor)}"/>` +
          `</radialGradient>` +
          // White at full opacity leaves a ring untouched: a luminance mask
          // takes the stop's own opacity straight through.
          `<mask id="${id}" maskUnits="userSpaceOnUse" ${square}>` +
          `<rect ${square} fill="url(#${id}-fade)"/>` +
          `</mask>`,
      )
      body = `<g mask="url(#${id})">${body}</g>`
    }

    layers.push({
      key: ring.key,
      motion: ring.motion,
      svg:
        `<svg viewBox="${x} ${y} ${size} ${size}"` +
        (rootFill ? ` fill="${rootFill}"` : "") +
        ` style="display:block;width:100%;height:100%"><defs>${defs.join("")}</defs>${body}</svg>`,
      left: ((x - vbX) / vbW) * 100,
      top: ((y - vbY) / vbH) * 100,
      width: (size / vbW) * 100,
      height: (size / vbH) * 100,
      x,
      y,
      size,
      ...(ring.motion.pulse === "wave" && { pieces: piecesOf(members.map((m) => m.el)) }),
    })
  }

  let index = 0
  let base = svg.replace(PATH, (el) => (lifted.has(index++) ? "" : el))
  // Drop the moved gradients, unless something left in the base still uses one.
  const stillUsed = new Set([...base.matchAll(PAINT_REF)].map((m) => m[1]))
  base = base.replace(GRADIENT, (def, _tag, id: string) =>
    moved.has(id) && !stillUsed.has(id) ? "" : def,
  )

  return { base, layers, viewBox }
}
