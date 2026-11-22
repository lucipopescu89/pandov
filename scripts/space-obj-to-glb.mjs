// A Space piece's 3ds Max OBJ export -> the compact GLB its page shows.
//
//   node scripts/space-obj-to-glb.mjs "D:/PANDOV/3_SPACE/1_HEAVY LIGHT/OBJ- 3d/1_HEAVY LIGHT.obj" public/models/heavy-light.glb
//
// The pendants' recipe (scripts/obj-to-glb.mjs), with what a piece made of
// several materials needs on top: each part of the export is kept as a mesh of
// its own, under a name the viewer looks for, since the wood, the glass of the
// bulb and its gold crown are dressed differently; and parts that are not the
// piece (Heavy Light's plinth, which is only there for the renders) are left out.
//
// Heavy Light (2026-11-22) was exported Y-up, in tenths of a millimetre: its
// body measures 884.6 × 3959.6 × 947.8 units, the author's 88 × 395 × 94 mm.
// Its parts, by their names in the export (the second export, of the evening,
// with the body turned right way out, the lampholder shortened and the cable):
//   Box3089     the plinth of the renders     left out (gone from the
//                                              second export, kept here in
//                                              case it comes back)
//   Plane115    the wooden body               "wood"
//   Cylinder499 the E14 lampholder, shortened
//               so it no longer stands out of
//               the back; a part of it shows  "socket"
//   Line672     the cable, leaving the back
//               low down and cut short on
//               purpose: its length is the
//               client's to choose            "cable"
//   Sphere1318  the bulb's glass              "glass"
//   Sphere1317  the bulb's gold crown         "crown"
// Anything else would be kept under its own name.
//
// Positions and the exported normals are kept, the UVs dropped (the wood's
// grain is drawn by the viewer from the position in the piece, as if carved
// out of a block, so it needs none), then welded, reordered, quantized and
// meshopt-compressed as the pendants are.
import { readFileSync } from "node:fs"
import { Document, NodeIO } from "@gltf-transform/core"
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions"
import { weld, reorder, quantize, dedup, prune } from "@gltf-transform/functions"
import { MeshoptEncoder } from "meshoptimizer"

const PARTS = { Plane115: "wood", Cylinder499: "socket", Line672: "cable", Sphere1318: "glass", Sphere1317: "crown" }
const LEAVE_OUT = new Set(["Box3089"])
/** The export's unit, in metres: a tenth of a millimetre. */
const UNIT = 0.0001

const [inPath, outPath] = process.argv.slice(2)
const text = readFileSync(inPath, "utf8")

// 3ds Max writes each part as an empty "o" followed by a "g" of the same name
// that holds its faces; either is taken as the start of a part.
const V = [], N = []
const parts = []
let cur = null
for (const line of text.split(/\r?\n/)) {
  const t = line.trim().split(/\s+/)
  if (t[0] === "v") V.push([+t[1], +t[2], +t[3]])
  else if (t[0] === "vn") N.push([+t[1], +t[2], +t[3]])
  else if (t[0] === "o" || t[0] === "g") {
    const name = t[1] ?? "mesh"
    if (!cur || cur.name !== name) parts.push((cur = { name, faces: [] }))
  } else if (t[0] === "f") {
    if (!cur) parts.push((cur = { name: "mesh", faces: [] }))
    cur.faces.push(t.slice(1).map((s) => { const [v, , n] = s.split("/"); return [(+v) - 1, n ? (+n) - 1 : -1] }))
  }
}
const kept = parts.filter((p) => p.faces.length && !LEAVE_OUT.has(p.name))

// Centred on the box of what is kept, so the plinth left out does not pull it aside.
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
for (const p of kept) for (const f of p.faces) for (const [vi] of f) {
  const v = V[vi]
  for (let k = 0; k < 3; k++) { if (v[k] < min[k]) min[k] = v[k]; if (v[k] > max[k]) max[k] = v[k] }
}
const centre = min.map((m, k) => (m + max[k]) / 2)

// A part that comes out inside out is turned right way out. Heavy Light's
// body did (2026-11-22): its faces wound and its normals pointed inward, as a
// part mirrored in 3ds Max comes out, so a browser drew the inside of the far
// wall instead of the near one, and the bulb's light, which stands inside the
// body, lit the whole lamp from within. A closed part's signed volume, the sum
// over its faces of v0 · (v1 × v2) / 6, is negative when it is inside out.
for (const o of kept) {
  let volume = 0
  for (const f of o.faces) {
    for (let i = 1; i + 1 < f.length; i++) {
      const a = V[f[0][0]], b = V[f[i][0]], c = V[f[i + 1][0]]
      volume += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])
    }
  }
  if (volume < 0) {
    o.faces = o.faces.map((f) => f.slice().reverse())
    o.flipNormals = true
    console.error(`${o.name}: inside out, turned`)
  }
}

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene("piece")
let tris = 0
for (const o of kept) {
  const name = PARTS[o.name] ?? o.name
  const pos = [], nor = []
  for (const f of o.faces) {
    for (let i = 1; i + 1 < f.length; i++) {
      for (const [vi, ni] of [f[0], f[i], f[i + 1]]) {
        const p = V[vi]
        pos.push((p[0] - centre[0]) * UNIT, (p[1] - centre[1]) * UNIT, (p[2] - centre[2]) * UNIT)
        const n = ni >= 0 ? N[ni] : [0, 1, 0]
        const l = (Math.hypot(n[0], n[1], n[2]) || 1) * (o.flipNormals ? -1 : 1)
        nor.push(n[0] / l, n[1] / l, n[2] / l)
      }
      tris++
    }
  }
  const material = doc.createMaterial(name).setBaseColorFactor([0.6, 0.45, 0.3, 1]).setMetallicFactor(0).setRoughnessFactor(0.6)
  const prim = doc.createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(nor)).setBuffer(buffer))
    .setMaterial(material)
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
}

await MeshoptEncoder.ready
doc.createExtension(KHRMeshQuantization).setRequired(true)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
await doc.transform(
  dedup(),
  weld(),
  reorder({ encoder: MeshoptEncoder }),
  // One volume for every part, so they keep their places to the same grid.
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizationVolume: "scene" }),
  prune(),
)
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.encoder": MeshoptEncoder })
await io.write(outPath, doc)
const size = readFileSync(outPath).length
console.log(JSON.stringify({
  parts: kept.map((o) => `${PARTS[o.name] ?? o.name}:${o.faces.length}`),
  leftOut: parts.filter((p) => LEAVE_OUT.has(p.name)).map((p) => p.name),
  triangles: tris,
  sizeMm: max.map((m, k) => +((m - min[k]) * UNIT * 1000).toFixed(1)),
  glbKB: +(size / 1024).toFixed(1),
}))
