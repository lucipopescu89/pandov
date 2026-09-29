// The author's rendered door sequence -> the homepage hero's frames.
//
//   node scripts/hero-doors.mjs "D:/PANDOV/3_SPACE/FURNITURE HANDLE/secvente homepage 40frames" public/frames/doors
//
// The renders come out of 3ds Max on black, and the page is #202020. The
// frames before 2026-09-29 were the same render laid over #202020 with a
// lighten, every channel darker than 32 lifted to 32: their darks sit on 32,
// a quarter of every frame's pixels exactly, and above that the two renders
// match to a step (median 37, 75th percentile 50, 95th 82, in both). So each
// frame here is lightened onto 32 the same way. The opening between the doors
// is then the page's own ground, which is what lets text 1 stand in it (see
// GAP in components/hero-animation.tsx), and the last frame is the page itself.
//
// The sequence is taken up to the first frame that is all ground: the render
// runs on past it with two more of the same, and those are left out.
//
// The first frame is the one seen standing still, on every visit, so it keeps
// the quality the old first frame had: JPEG at 93, 4:4:4. The others are only
// seen in passing, a few hundredths of a second each, and are AVIF:
// - at 66 while the doors are still shut and only the handles turn. That part
//   moves slowly, so it is looked at almost as a still, and at 60 the wood's
//   grain and the handles' fine texture were visibly softer than the first
//   frame's, a change you would see the moment the doors start to move;
// - at 60 from there on. Below 60 both went to smears (50 halves the bytes,
//   and 40 halves them again, and neither is worth it).
// AVIF, not WebP: WebP cannot hold 32 (see the pendant photographs in
// CLAUDE.md). The script reads every file back and refuses one whose ground
// has moved by more than a step, or an empty frame that is not 32 throughout.
// On 2026-09-29 a few dozen of 3.9 million samples moved, each by one.
//
// It prints each file's size and the total, which is what the homepage pays
// for the doors.
import { mkdirSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"

const [inDir, outDir] = process.argv.slice(2)
if (!inDir || !outDir) {
  console.error('usage: node scripts/hero-doors.mjs "<render folder>" public/frames/doors')
  process.exit(1)
}

const GROUND = 32
/** A channel this far above the ground still counts as ground. */
const GROUND_REACH = 2
/** The last frame, counting from 1, still encoded as the slow part: shut doors, turning handles. */
const SLOW_UNTIL = 12
const QUALITY_SLOW = 66
const QUALITY = 60

const sources = readdirSync(inDir)
  .filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f))
  .sort()
mkdirSync(outDir, { recursive: true })

async function lightened(file) {
  const { data, info } = await sharp(path.join(inDir, file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let ground = true
  for (let k = 0; k < data.length; k++) {
    if (data[k] < GROUND) data[k] = GROUND
    else if (data[k] > GROUND + GROUND_REACH) ground = false
  }
  return { data, info, ground }
}

/**
 * Every pixel standing in a field of ground SOLID pixels across must read back
 * as the ground: the opening between the doors and the empty frame, which meet
 * the page. SOLID is AV1's largest block and a pixel. Nearer texture both
 * encoders move the lifted shadows of the wood by a few steps, as the old
 * frames' JPEG did (21 to 31 in them); that is inside the door and does not
 * show.
 */
const SOLID = 65
async function checkGround(file, before, info) {
  const { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const isGround = (buf, i) =>
    buf[3 * i] === GROUND && buf[3 * i + 1] === GROUND && buf[3 * i + 2] === GROUND
  // A summed-area table of the ground, so a field's count is four lookups.
  const sum = new Int32Array((W + 1) * (H + 1))
  for (let y = 0; y < H; y++) {
    let row = 0
    for (let x = 0; x < W; x++) {
      row += isGround(before, y * W + x) ? 1 : 0
      sum[(y + 1) * (W + 1) + x + 1] = sum[y * (W + 1) + x + 1] + row
    }
  }
  const r = (SOLID - 1) / 2
  let checked = 0
  let moved = 0
  let worst = 0
  for (let y = r; y < H - r; y += 4) {
    for (let x = r; x < W - r; x += 4) {
      const x0 = x - r, y0 = y - r, x1 = x + r + 1, y1 = y + r + 1
      const n =
        sum[y1 * (W + 1) + x1] - sum[y0 * (W + 1) + x1] - sum[y1 * (W + 1) + x0] + sum[y0 * (W + 1) + x0]
      if (n < SOLID * SOLID) continue
      checked++
      const i = y * W + x
      const off = Math.max(...[0, 1, 2].map((c) => Math.abs(data[3 * i + c] - GROUND)))
      if (off) moved++
      worst = Math.max(worst, off)
    }
  }
  return { checked, moved, worst }
}

let total = 0
for (let i = 0; i < sources.length; i++) {
  const { data, info, ground } = await lightened(sources[i])
  const name = `door-${String(i).padStart(2, "0")}`
  const img = sharp(Buffer.from(data), { raw: info })
  const out =
    i === 0
      ? path.join(outDir, `${name}.jpg`)
      : path.join(outDir, `${name}.avif`)
  if (i === 0) {
    await img.jpeg({ quality: 93, chromaSubsampling: "4:4:4", mozjpeg: true }).toFile(out)
  } else {
    const quality = i <= SLOW_UNTIL ? QUALITY_SLOW : QUALITY
    await img.avif({ quality, chromaSubsampling: "4:2:0", effort: 6 }).toFile(out)
  }
  const { checked, moved, worst } = await checkGround(out, data, info)
  const size = statSync(out).size
  total += size
  console.log(
    `${path.basename(out)}  ${(size / 1024).toFixed(0)} KB  ground: ${moved} of ${checked} samples off, by at most ${worst}`,
  )
  if (worst > 1 || (ground && moved > 0)) {
    console.error(`${out}: the ground has moved off ${GROUND}`)
    process.exit(1)
  }
  if (ground) {
    console.log(`all ground from ${sources[i]} on: ${i + 1} frames`)
    break
  }
}
console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`)
