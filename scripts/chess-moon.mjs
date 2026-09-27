// node scripts/chess-moon.mjs "<moon.tif>" public/images/chess-set/moon.avif [quality]
//
// Makes the Chess Set's moon from NASA's full Moon. The source is frame 0059 of
// the Scientific Visualization Studio's "Moon Phase and Libration, 2026"
// (svs.gsfc.nasa.gov/5587, frames/3840x2160_16x9_30p/plain/moon.0059.tif, the
// full moon of 3 January 2026), which is in the public domain. The TIF is 5.5MB
// and stays out of the repo, as the pendants' OBJs and the studio's EXR do.
//
// The moon it replaced (the author's, with the pieces and a dial drawn over it)
// was a pale, flat grey, and this one is set to read as that one did: grey, not
// the faint colour NASA renders, and its tones pressed up into the light. The
// map below puts NASA's 10th and 90th percentiles on the old moon's own, 205
// and 243, which lands the rest where the old one sat too (mean 223 against
// 226, darkest maria 198 against 191). The page still draws it at 0.8 opacity.
//
// It is placed exactly where the old moon stood in a canvas of the old one's
// shape, 4957 : 2202, so every position written against it in the page (the
// text on the moon, the phone's crop and the moon's top edge worked out from
// it) holds unchanged: centre 45.3% of the height down, radius 34.9% of it.
// The canvas is smaller than the old one, because 1200px across is all the
// disc is ever drawn at: 595 CSS px on a 1920 screen, twice that on a Retina
// one, and 266 on a phone.
//
// AVIF at quality 90, as the site's other photographs are. The craters are the
// whole of what this moon has to show, and they go first. Drawn at 884px across
// (a Retina laptop), q90 keeps 90% of the fine detail a lossless encode has,
// q85 80% and q75 60%. It comes to 164KB, against the old moon's 1.1MB.

import sharp from "sharp"

const [src, out, q = "90"] = process.argv.slice(2)
if (!src || !out) {
  console.error('usage: node scripts/chess-moon.mjs "<moon.tif>" <out.avif> [quality]')
  process.exit(1)
}

/** The disc's diameter in the output, in px. */
const DISC = 1200
/** The old canvas's shape, and where its moon stood in it. */
const ASPECT = 4957 / 2202
const CENTRE_Y = 0.453
const RADIUS = 0.349

const H = Math.round(DISC / (2 * RADIUS))
const W = Math.round(H * ASPECT)

// Grey, pressed into the light: NASA's p10 117 → 205 and p90 210 → 243.
const GAIN = (243 - 205) / (210 - 117)
const LIFT = 205 - 117 * GAIN

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: sw, height: sh, channels } = info

// The disc's bounds, off its alpha.
let top = sh, bottom = -1, left = sw, right = -1
for (let y = 0; y < sh; y++)
  for (let x = 0; x < sw; x++)
    if (data[(y * sw + x) * channels + 3] > 0) {
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
const size = Math.max(bottom - top, right - left) + 1

// Grey it, lift it, and lay it on white by its own alpha, so its anti-aliased
// rim meets the page rather than a black halo.
const grey = Buffer.alloc(size * size)
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const sx = left + x, sy = top + y
    if (sx >= sw || sy >= sh) { grey[y * size + x] = 255; continue }
    const i = (sy * sw + sx) * channels
    const v = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    const a = data[i + 3] / 255
    const lit = Math.min(255, v * GAIN + LIFT)
    grey[y * size + x] = Math.round(a * lit + (1 - a) * 255)
  }

// One channel out as it went in: left to itself sharp hands the raw back as
// three, which laid across a one-channel canvas comes out as stripes.
const disc = await sharp(grey, { raw: { width: size, height: size, channels: 1 } })
  .resize(DISC, DISC, { kernel: "lanczos3" })
  .extractChannel(0)
  .raw()
  .toBuffer()

const canvas = Buffer.alloc(W * H, 255)
const ox = Math.round(W / 2 - DISC / 2)
const oy = Math.round(CENTRE_Y * H - DISC / 2)
for (let y = 0; y < DISC; y++) disc.copy(canvas, (oy + y) * W + ox, y * DISC, (y + 1) * DISC)

await sharp(canvas, { raw: { width: W, height: H, channels: 1 } })
  .avif({ quality: Number(q), chromaSubsampling: "4:4:4", effort: 9 })
  .toFile(out)

// The page is white, and a canvas one step off it would show as a rectangle.
const back = await sharp(out).raw().toBuffer({ resolveWithObject: true })
const at = (x, y) => back.data[(y * back.info.width + x) * back.info.channels]
const corners = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1), at(W >> 1, 2), at(W >> 1, H - 3)]
const { size: bytes } = await import("node:fs").then((fs) => fs.statSync(out))
console.log(`${out}: ${W}×${H}, disc ${DISC}px at (${W / 2}, ${(CENTRE_Y * H).toFixed(1)}), ${(bytes / 1024).toFixed(0)}KB, edges ${corners.join(",")}`)
if (corners.some((v) => v !== 255)) {
  console.error("the canvas is not pure white at its edges")
  process.exit(1)
}
