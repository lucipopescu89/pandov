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
//
// One change to the drawing itself, the author's asking of 2026-09-27: the
// cross is gone. Its four long bars, at the cardinal points, from 74 to 155
// units out, are left out, and in each one's place stands a long line of the
// ring of long lines around it (the ring marked light blue on the author's
// copy, 112–132 units out). That ring is one line every 10° with exactly the
// four cardinal ones missing, where the bars crossed it, and the ring of
// dense lines outside it leaves gaps there for it as it does at every tenth
// degree; so the four new lines complete it, 36 evenly round. Each is its
// nearest neighbour in the ring turned onto the bar's angle. On the page they
// are that ring's, and breathe with it.
//
// The bars had also crossed the ring of fine ticks (dark blue on the copy),
// one every 2°, which left out the four at the cardinal points for them.
// Those four are put back the same way, each its neighbour turned into the
// empty place. The dashes (yellow) lack one every 10° as well, but at every
// tenth degree, as the dense lines do: that is their own rhythm, not the
// cross's, and it is left.
//
// The same evening the author's own file was edited the same way, with the
// author's leave, and the file as exported was kept beside it as
// "MANDALA MOON (original cu cruce).svg". Run on the edited file, both steps
// find nothing to do, and the result matches what they made of the original
// to a hundredth of a unit. They stay, so that a fresh export from the
// author's 3D file, which will have the cross again, comes out the same.

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

/** A bar of the cross is 80 units long, and nothing else in the drawing comes near half that. */
const BAR_LENGTH = 60
/** The ring of long lines: each 20.4 units long, its middle 122 units out. */
const LONG_LINE = { length: [15, 30], r: [110, 135] }
/** The ring of fine ticks: each 1.6 units long, its middle 87 units out, one every 2°. */
const TICK = { length: [1.2, 2], r: [85, 89], every: 2 }

const svg = fs.readFileSync(src, "utf8")
const viewBox = svg.match(/viewBox="([^"]+)"/)[1]
const exported = [...svg.matchAll(/M(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+)/g)].map((m) => m.slice(1, 5).map(Number))

/**
 * The export's segments gathered back into the outlines they draw: each
 * outline's segments come one after another, each starting where the last
 * ended, until one comes back to the first.
 */
function outlinesOf(list) {
  const key = (x, y) => `${x.toFixed(3)} ${y.toFixed(3)}`
  const outlines = []
  let current = null
  for (const s of list) {
    const from = key(s[0], s[1]), to = key(s[2], s[3])
    if (current && !current.closed && from === current.end) {
      current.segments.push(s)
      current.end = to
      current.closed = to === current.start
    } else {
      current = { segments: [s], start: from, end: to, closed: false }
      outlines.push(current)
    }
  }
  for (const o of outlines) {
    const n = o.segments.length
    const cx = o.segments.reduce((sum, s) => sum + s[0], 0) / n
    const cy = o.segments.reduce((sum, s) => sum + s[1], 0) / n
    o.r = Math.hypot(cx, cy)
    o.angle = Math.atan2(cy, cx)
    const ux = Math.cos(o.angle), uy = Math.sin(o.angle)
    const along = o.segments.map((s) => s[0] * ux + s[1] * uy)
    o.length = Math.max(...along) - Math.min(...along)
  }
  return outlines
}

/** An outline turned about the centre by `turn` radians, as a new list of segments. */
function turned(outline, turn) {
  const c = Math.cos(turn), s = Math.sin(turn)
  const at = (x, y) => [x * c - y * s, x * s + y * c]
  return outline.segments.map(([x1, y1, x2, y2]) => [...at(x1, y1), ...at(x2, y2)])
}

/** The shortest way round from one angle to another, in radians. */
const apart = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

const within = (o, { length, r }) => o.length > length[0] && o.length < length[1] && o.r > r[0] && o.r < r[1]
/** The member of `ring` nearest to `angle`, turned onto it. */
const standIn = (ring, angle) => {
  const nearest = ring.reduce((a, b) => (Math.abs(apart(b.angle, angle)) < Math.abs(apart(a.angle, angle)) ? b : a))
  return turned(nearest, apart(angle, nearest.angle))
}

const outlines = outlinesOf(exported)
const bars = outlines.filter((o) => o.length > BAR_LENGTH)
const longLines = outlines.filter((o) => within(o, LONG_LINE))
const ticks = outlines.filter((o) => within(o, TICK))
if (bars.length > 0 && longLines.length === 0) {
  console.error(`found the cross's ${bars.length} bars but no ring of long lines to stand in for them`)
  process.exit(1)
}
// In each bar's place, its nearest long line turned onto the bar's angle.
const standIns = bars.map((bar) => standIn(longLines, bar.angle))
// And a tick in every place the ring of ticks has none.
const step = (TICK.every * Math.PI) / 180
const taken = new Set(ticks.map((t) => Math.round(t.angle / step)).map((k) => ((k % 180) + 180) % 180))
const tickIns = []
for (let k = 0; k < Math.round((2 * Math.PI) / step); k++) if (!taken.has(k)) tickIns.push(standIn(ticks, k * step))

const segments = [...outlines.filter((o) => !bars.includes(o)).flatMap((o) => o.segments), ...standIns.flat(), ...tickIns.flat()]

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
console.log(
  `${out}: ${segments.length} segments, ${on.length} on the moon, ${off.length} off it, ` +
    `the cross's ${bars.length} bars replaced by ${standIns.length} long lines, ${tickIns.length} ticks put back, ` +
    `${(body.length / 1024).toFixed(0)}KB (from ${(svg.length / 1024).toFixed(0)}KB)`,
)
