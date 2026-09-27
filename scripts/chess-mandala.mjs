// node scripts/chess-mandala.mjs "<MANDALA MOON.svg>" public/images/chess-set/mandala.svg
//
// Makes the mandala that stands over the Chess Set's moon, from the author's
// D:\PANDOV\1_MIND\0_PANDOV CHESS\MANDALA MOON.svg (2026-09-27). That file is
// 7,110 separate <path> elements of one straight segment each, 1MB, all one
// grey. This writes the same lines as two paths, one per colour, with the
// segments that run on from one another joined into lines and the numbers cut
// to two decimals (a hundredth of a unit is a thirtieth of a pixel here):
//
//  - on the moon, white: every line inside the rim;
//  - off it, grey, as grey as the moon: every line outside.
//
// The rim is set by the author's picture of the two together: the moon's edge
// falls in the gap between the two rings of teardrops, the inner ring (radius
// 59–61.5 units) on the moon and the outer (65.5–68) off it. RIM is the middle
// of that gap, and no segment crosses it, so nothing has to be cut.
//
// It is kept as a file, not inlined into the page: inlined, it would be sent
// twice on every visit (in the HTML and again in the React payload, see
// CLAUDE.md), and as a file it is cached like any image.

import fs from "node:fs"

const [src, out] = process.argv.slice(2)
if (!src || !out) {
  console.error('usage: node scripts/chess-mandala.mjs "<MANDALA MOON.svg>" <out.svg>')
  process.exit(1)
}

/** The moon's radius, in the mandala's units. */
const RIM = 63.5
/** On the moon, and off it: the moon as the page draws it is 215–245 grey. */
const ON = "#ffffff"
const OFF = "#d2d2d2"

/**
 * The line, as fine as Second Wind's (the author's asking, 2026-09-27). Those
 * are Figma's 0.5 on a 1920-unit page, so 0.5/1920 of the page's width: 0.37px
 * on a 1440 screen, 0.5px on a 1920. The export's own 0.5 units, at this
 * mandala's scale, came to 4.7 times that (1.7px on a 1440). A unit here is
 * the moon's radius (0.15502 of the width) over RIM, so the same line is
 * 0.5/1920 ÷ (0.15502/63.5) = 0.107 units. On a phone, where Second Wind is
 * cropped rather than shrunk, its lines are 0.31px and these 0.22px.
 */
const STROKE = ((0.5 / 1920) / (0.15502 / RIM)).toFixed(3)

/**
 * The white lines on the moon are heavier: the author kept the fine line off
 * the moon, but found the white ones lost at that weight against the pale
 * disc, and asked for them a little heavier, not as heavy as the export's 0.5.
 * At 0.25 they are between the two: 0.87px on a 1440 screen, 0.62px on a 1026.
 */
const STROKE_ON = 0.25

const svg = fs.readFileSync(src, "utf8")
const viewBox = svg.match(/viewBox="([^"]+)"/)[1]
const segments = [...svg.matchAll(/M(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+)/g)].map((m) => m.slice(1, 5).map(Number))

const n = (v) => {
  const s = v.toFixed(2).replace(/\.?0+$/, "")
  return s === "-0" ? "0" : s
}
const pt = (x, y) => `${n(x)} ${n(y)}`

/** Joins segments that follow on from one another into one line, closing it where it comes back to its start. */
function draw(list) {
  let d = ""
  let start = null, end = null
  for (const [x1, y1, x2, y2] of list) {
    const from = pt(x1, y1), to = pt(x2, y2)
    if (end === from) {
      if (to === start) {
        d += "Z"
        start = end = null
      } else {
        d += `L${to}`
        end = to
      }
    } else {
      d += `M${from}L${to}`
      start = from
      end = to
    }
  }
  return d
}

const on = [], off = []
for (const s of segments) {
  const r = Math.max(Math.hypot(s[0], s[1]), Math.hypot(s[2], s[3]))
  ;(r < RIM ? on : off).push(s)
}

const body =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="800" height="800" fill="none" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
  `<path stroke="${OFF}" d="${draw(off)}"/>` +
  `<path stroke="${ON}" stroke-width="${STROKE_ON}" d="${draw(on)}"/>` +
  `</svg>\n`
fs.writeFileSync(out, body)
console.log(`${out}: ${segments.length} segments, ${on.length} on the moon, ${off.length} off it, ${(body.length / 1024).toFixed(0)}KB (from ${(svg.length / 1024).toFixed(0)}KB)`)
