// node scripts/chess-clouds.mjs "<clouds.png>" public/images/chess-set
//
// Cuts the author's four clouds out of one PNG into cloud-1…4.avif, for the
// bank the Chess Set's moon rises behind. The source is
// D:\PANDOV\1_MIND\0_PANDOV CHESS\clouds.png (1774 × 887, four clouds on a
// transparent ground, two rows of two), put there by the author on 2026-09-27
// in place of clouds this script used to draw itself.
//
// Each cloud is found by its own transparency: the columns and rows that carry
// any cloud split the sheet into four, and each is trimmed to what it holds.
// The clouds are made grey. They came lit a cool blue in their shade, and
// the page is black, white, grey and the ornament's gold, with nothing blue in
// it. The grey keeps each pixel's lightness, so the clouds are as they were
// in every other way, but for the exposure below. They keep their own size,
// 773–874px across: the largest is drawn at 38% of the canvas, about 540 CSS
// px on a 1440 screen, so there is nothing to spare.

import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const [src, outDir] = process.argv.slice(2)
if (!src || !outDir) {
  console.error('usage: node scripts/chess-clouds.mjs "<clouds.png>" <out dir>')
  process.exit(1)
}

/**
 * The clouds' exposure, raised on the author's asking (2026-09-27), three
 * times: one stop, then two, then, asked for "much whiter", three. The light
 * is multiplied in linear light and rolled off at the top as a film's
 * shoulder does, x·g / (1 + (g − 1)·x), so white stays white and the puffs
 * keep a trace of their modelling instead of clipping flat. At three stops
 * the median grey goes from 225 to 251, the deepest shade (5th percentile)
 * from about 180 to 240.
 */
const EXPOSURE = 8
const toLinear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const toSrgb = (l) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055))
const expose = (v) => { const l = toLinear(v); return toSrgb((l * EXPOSURE) / (1 + (EXPOSURE - 1) * l)) }

/**
 * The clouds made solid, on the same asking ("not transparent"): the author's
 * render leaves their bodies at 252 of 255, and every alpha is scaled up by a
 * tenth, which closes the bodies and firms the fringe without cutting it.
 */
const SOLID = 1 / 0.9

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const alpha = (x, y) => data[(y * W + x) * 4 + 3]

/** Runs of indices where `has(i)` holds, as [first, last] pairs. */
const runs = (n, has) => {
  const out = []
  let start = -1
  for (let i = 0; i <= n; i++) {
    if (i < n && has(i)) {
      if (start < 0) start = i
    } else if (start >= 0) {
      out.push([start, i - 1])
      start = -1
    }
  }
  return out
}
const THRESHOLD = 2
const cols = runs(W, (x) => { for (let y = 0; y < H; y++) if (alpha(x, y) > THRESHOLD) return true; return false })
const rows = runs(H, (y) => { for (let x = 0; x < W; x++) if (alpha(x, y) > THRESHOLD) return true; return false })
if (cols.length !== 2 || rows.length !== 2) {
  console.error(`expected a sheet of 2 × 2 clouds, found ${cols.length} columns and ${rows.length} rows`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
let n = 0
for (const [y0, y1] of rows)
  for (const [x0, x1] of cols) {
    // Trim to this cloud alone within its quarter of the sheet.
    let top = y1, bottom = y0, left = x1, right = x0
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (alpha(x, y) > THRESHOLD) {
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (x < left) left = x
          if (x > right) right = x
        }
    const w = right - left + 1, h = bottom - top + 1
    const px = Buffer.alloc(w * h * 4)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = ((top + y) * W + left + x) * 4, o = (y * w + x) * 4
        const v = expose(Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]))
        px[o] = px[o + 1] = px[o + 2] = v
        px[o + 3] = Math.min(255, Math.round(data[i + 3] * SOLID))
      }
    const out = path.join(outDir, `cloud-${++n}.avif`)
    const info = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
      .avif({ quality: 80, effort: 9 })
      .toFile(out)
    console.log(`${out}: ${info.width}×${info.height}, ${(fs.statSync(out).size / 1024).toFixed(0)}KB (from ${w}×${h} at ${left},${top})`)
  }
