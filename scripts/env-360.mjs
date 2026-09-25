// The author's 360° studio -> the small image the pendant viewer reflects.
//
//   node scripts/env-360.mjs "D:/PANDOV/2_BODY/1_SECOND_WIND/360.exr" public/models/studio.webp
//
// The source is an OpenEXR panorama, 2000 × 1000 in half floats: its softboxes
// run to about 8, its floor to about 0.5 and its walls to 0.04, and it is that
// range, not the picture, that makes metal look like metal. Sent as it is, it
// would be 3.6MB and a decoder the browser does not have. So it is averaged
// down to 1024 × 512, which is all the viewer can use (three.js prefilters an
// equirectangular map into cube faces a quarter of its width, and caps them at
// 256), and the range is folded into eight bits a channel:
//
//   stored = (v / (1 + v)) ^ (1 / 2.2)      v = s / (1 - s),  s = stored ^ 2.2
//
// The first half keeps the lights (8 is stored at 242 of 255); the gamma keeps
// the steps fine in the dark, where a plain eight-bit scale would band. It is
// written as lossless WebP, three channels and no alpha, because the viewer
// reads the pixels back through a canvas, and a canvas would round the colour
// of anything semi-transparent. `PendantViewer` undoes the curve.
import { readFileSync } from "node:fs"
import * as THREE from "three"
import { EXRLoader } from "three/addons/loaders/EXRLoader.js"
import sharp from "sharp"

const [inPath, outPath] = process.argv.slice(2)
const W = 1024, H = 512

const file = readFileSync(inPath)
const exr = new EXRLoader().setDataType(THREE.FloatType).parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
const { width: w, height: h, data } = exr
const ch = data.length / (w * h)

// Averaged down, each output pixel over the source pixels whose centres fall
// in it. The loader hands rows over bottom first, as WebGL wants them; images
// are written top first, so the rows are turned back here.
const out = Buffer.alloc(W * H * 3)
let max = 0
for (let y = 0; y < H; y++) {
  const y0 = Math.floor((y * h) / H), y1 = Math.floor(((y + 1) * h) / H)
  for (let x = 0; x < W; x++) {
    const x0 = Math.floor((x * w) / W), x1 = Math.floor(((x + 1) * w) / W)
    const sum = [0, 0, 0]
    for (let sy = y0; sy < y1; sy++) {
      const row = h - 1 - sy
      for (let sx = x0; sx < x1; sx++) for (let c = 0; c < 3; c++) sum[c] += data[(row * w + sx) * ch + c]
    }
    const n = (y1 - y0) * (x1 - x0)
    for (let c = 0; c < 3; c++) {
      const v = Math.max(0, sum[c] / n)
      max = Math.max(max, v)
      out[(y * W + x) * 3 + c] = Math.round(Math.pow(v / (1 + v), 1 / 2.2) * 255)
    }
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ lossless: true, effort: 6 }).toFile(outPath)
console.log(JSON.stringify({ source: `${w}×${h}`, out: `${W}×${H}`, brightest: +max.toFixed(2), KB: +(readFileSync(outPath).length / 1024).toFixed(1) }))
