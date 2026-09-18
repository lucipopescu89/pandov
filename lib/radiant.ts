/**
 * Ranks the radiant ornament's contours so a band of light can climb them.
 *
 * The drawing closing the Chess Set page is fifteen closed contours about one
 * centre, morphing from a circle at r≈202 to a rounded square at r≈360. It is
 * the same shape of thing as Presence's halo — rings sharing a centre — so it
 * takes the same kind of movement. But Presence draws its own rings and grows
 * them outward, and that cannot be done here: these contours are each a
 * different shape, so a copy of the inner circle blown up to the rim would sit
 * inside a square and match nothing. There is also no room. The gap between the
 * two innermost contours is four units in a 722 box; anything scaled more than
 * a hair crosses its neighbour.
 *
 * So nothing new is drawn. The fifteen that are already there take the light in
 * turn, from the middle outward, and that is the ripple.
 *
 * The export does not hold them in radial order — it runs 8→14 and then 7→0 —
 * so each is measured and ranked here. Measuring is deliberately crude: the
 * extreme of a path's numbers, control points and all, rather than the curve's
 * true extent. A Bézier's handles reach past the curve it draws, so the radii
 * come out a little large — but every contour is drawn the same way, so the
 * ranking, which is the only thing this needs, is exact.
 *
 * Pure string work, run on the server while the page renders, so the ornament
 * arrives already ranked and there is nothing to measure in the browser.
 */

/** The class each contour carries; the statement's own CSS gives it the wave. */
export const RING_CLASS = "sr-ring"

const PATH = /<path\b[^>]*\/>/g
const NUMBER = /-?\d*\.?\d+(?:e-?\d+)?/gi

export type Radiant = {
  /** The artwork, its contours ranked from the centre out. */
  html: string
  /** How many there are, so the CSS can spread one cycle across them. */
  count: number
}

export function splitRadiant(svg: string): Radiant {
  const tags = svg.match(PATH) ?? []

  const radii = tags.map((tag) => {
    const d = /\sd="([^"]+)"/.exec(tag)?.[1] ?? ""
    const nums = (d.match(NUMBER) ?? []).map(Number)
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i]
      const y = nums[i + 1]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    return (x1 - x0 + (y1 - y0)) / 4
  })

  // Rank 0 is the innermost contour, and the light starts there. Each also
  // carries the room it has: how far it could swell before it met the contour
  // outside it, as a scale. The contours are not evenly spaced — four units
  // apart at the centre against nineteen at the rim — so one figure for all of
  // them would either barely move the outer ones or have the inner ones cross
  // their neighbours. The section's CSS decides how much of that room to use.
  const sorted = radii.map((radius, at) => ({ radius, at })).sort((a, b) => a.radius - b.radius)
  const rank = new Map<number, number>()
  const room = new Map<number, number>()
  sorted.forEach(({ at, radius }, i) => {
    rank.set(at, i)
    const next = sorted[i + 1]
    const previous = sorted[i - 1]
    // The outermost contour has no neighbour to measure against, so it borrows
    // the spacing it does have — the step up from the contour inside it. Held at
    // 1 it stayed put while everything else opened out, and the wave arriving at
    // the rim looked like it had been stopped rather than let go. It grows past
    // the edge of the artwork's own box; the section lifts the clip for it.
    room.set(at, next ? next.radius / radius : previous ? radius / previous.radius : 1)
  })

  let at = -1
  let html = svg.replace(PATH, (tag) => {
    at += 1
    const style = `--i:${rank.get(at)};--g:${room.get(at)?.toFixed(4)}`
    return tag.replace(/^<path\b/, `<path class="${RING_CLASS}" style="${style}"`)
  })

  // The export ships a fixed width and height; drop them so the drawing fills
  // whatever box the section gives it, and keep the viewBox so it stays vector.
  html = html
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1")
    .replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1")
    .replace(/<svg /, '<svg style="display:block;width:100%;height:100%" ')

  return { html, count: tags.length }
}
