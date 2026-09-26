// One of the author's jewellery photographs -> a piece on the Body page.
//
//   node scripts/body-thumb.mjs "D:/PANDOV/2_BODY/BODY THUMBNAILS #202020 BACKGROUND/ONE.png" public/images/body-collections/one.avif
//
// The photographs are shot on the site's own ground and drawn straight onto it,
// with no blend, so the one thing that matters is that their ground *is* the
// page: #202020 exactly, all the way to the edge. Most arrive that way. Some do
// not: Duality's bracelet sits on 30, Satori on 30.5, Skeyes's pendant on 33,
// each with a grain of ±1–2 over it, and the page is a flat 32. One step off is
// enough for a rectangle to show on a good screen (see the WebP pendants in
// CLAUDE.md), so every photograph is brought onto the ground here:
//
// - The photograph's own ground is measured, per channel, round its border.
//   Every pixel is moved by the difference, so the ground lands on 32 and the
//   metal moves by the same step or two, which does not show on it.
// - What is left of the grain is shrunk away. A pixel within `SNAP` of the
//   ground becomes the ground; one past `KEEP` is untouched; in between it is
//   eased, so a shadow or a glow fades into the ground with no edge of its own.
// - The piece is cut out with `PAD` of ground round its solid metal, filled
//   with ground wherever the photograph ends sooner. Over the outer part of
//   that margin whatever is still not ground is faded to it, so the edge of
//   the file is 32 on every pixel, whatever the photograph had there.
//
// Then it is scaled so its longer side of metal is at most `LONG` pixels, and
// written as AVIF at quality 90, 4:4:4, as the pendant photographs are: AVIF
// keeps 32 where WebP cannot. The script reads its own output back and refuses
// to pass a file whose border is not 32,32,32 on every pixel.
//
// It prints the file's size in pixels and its pad, in the file's own pixels.
// `BODY_PIECES` in lib/body-collections.ts wants exactly those.
import { statSync } from "node:fs"
import sharp from "sharp"

const [inPath, outPath] = process.argv.slice(2)
if (!inPath || !outPath) {
  console.error('usage: node scripts/body-thumb.mjs "<photograph>" public/images/body-collections/<name>.avif')
  process.exit(1)
}

const GROUND = 32
/** Distance from the ground, in levels of the most distant channel, that is grain. */
const SNAP = 3
/** Distance from which a pixel is left exactly as it is. */
const KEEP = 12
/** Distance that counts as metal when the piece is measured. */
const SOLID = 14
/** Ground kept round the metal, as a share of its longer side. */
const PAD = 0.1
/** Longest side of metal written, in pixels: over 2 a canvas unit wherever it is drawn. */
const LONG = 700

const { data, info } = await sharp(inPath).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info

// The photograph's ground, per channel: its border band, less anything bright.
const band = Math.round(0.06 * Math.min(W, H))
const sum = [0, 0, 0]
let n = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (x >= band && x < W - band && y >= band && y < H - band) continue
    const i = (y * W + x) * 3
    if (Math.max(Math.abs(data[i] - GROUND), Math.abs(data[i + 1] - GROUND), Math.abs(data[i + 2] - GROUND)) >= 8) continue
    for (let c = 0; c < 3; c++) sum[c] += data[i + c]
    n++
  }
}
const ground = sum.map((s) => s / n)

// The solid metal's bounds.
let x0 = W, y0 = H, x1 = -1, y1 = -1
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3
    const m = Math.max(Math.abs(data[i] - ground[0]), Math.abs(data[i + 1] - ground[1]), Math.abs(data[i + 2] - ground[2]))
    if (m <= SOLID) continue
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
}
if (x1 < 0) throw new Error("no metal found")

const pad = Math.round(PAD * Math.max(x1 - x0 + 1, y1 - y0 + 1))
const cx0 = x0 - pad, cy0 = y0 - pad
const CW = x1 - x0 + 1 + 2 * pad, CH = y1 - y0 + 1 + 2 * pad
/** How far in from the cut the fade to ground reaches. */
const FEATHER = 0.6 * pad

const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const out = Buffer.alloc(CW * CH * 3, GROUND)
for (let y = 0; y < CH; y++) {
  const sy = y + cy0
  if (sy < 0 || sy >= H) continue
  for (let x = 0; x < CW; x++) {
    const sx = x + cx0
    if (sx < 0 || sx >= W) continue
    const i = (sy * W + sx) * 3
    const d = [data[i] - ground[0], data[i + 1] - ground[1], data[i + 2] - ground[2]]
    const m = Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2]))
    let k = m <= SNAP ? 0 : m >= KEEP ? 1 : ((m - SNAP) / (KEEP - SNAP)) * (KEEP / m)
    // The fade to ground at the cut, measured from the cut itself, so it is
    // ground at the photograph's own edge as much as at the margin's.
    const edge = Math.min(x + 0.5, y + 0.5, CW - x - 0.5, CH - y - 0.5)
    k *= smoothstep(edge / FEATHER)
    const o = (y * CW + x) * 3
    for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round(GROUND + d[c] * k)))
  }
}

const scale = Math.min(1, LONG / Math.max(x1 - x0 + 1, y1 - y0 + 1))
const OW = Math.round(CW * scale), OH = Math.round(CH * scale)
await sharp(out, { raw: { width: CW, height: CH, channels: 3 } })
  .resize(OW, OH, { kernel: "lanczos3" })
  .avif({ quality: 90, chromaSubsampling: "4:4:4", effort: 9 })
  .toFile(outPath)

// Read back: every pixel of the border must be the page.
const back = await sharp(outPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const bw = back.info.width, bh = back.info.height, bc = back.info.channels
let off = 0
for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    if (x > 0 && x < bw - 1 && y > 0 && y < bh - 1) continue
    const i = (y * bw + x) * bc
    if (back.data[i] !== GROUND || back.data[i + 1] !== GROUND || back.data[i + 2] !== GROUND) off++
  }
}
const result = {
  w: bw,
  h: bh,
  pad: +(pad * scale).toFixed(1),
  source: `${W}×${H}`,
  ground: ground.map((g) => +g.toFixed(2)),
  KB: +(statSync(outPath).size / 1024).toFixed(1),
}
console.log(JSON.stringify(result))
if (off) {
  console.error(`${off} border pixels are not ${GROUND},${GROUND},${GROUND}`)
  process.exit(2)
}
