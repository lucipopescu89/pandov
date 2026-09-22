// A pendant's 3ds Max OBJ export -> the compact GLB `PendantViewer` shows.
//
//   node scripts/obj-to-glb.mjs "D:/PANDOV/2_BODY/1_SECOND_WIND/Export OBJ/1_Icarus.obj" public/models/icarus.glb
//
// Keeps positions and the exported normals (3ds Max's smoothing groups, which
// is what keeps the edges that are meant to be sharp, sharp), drops the UVs —
// the gold has no texture — and makes one mesh per OBJ object. Recentred on the
// origin and scaled from millimetres to metres, then welded, reordered for the
// GPU's vertex cache, quantized (positions to 14 bits, a fraction of a micron on
// a 42mm pendant; normals to 10) and meshopt-compressed. Icarus went from a
// 4.2MB OBJ to a 269KB GLB this way, all 56,960 triangles kept.
//
// The export's own material is written but not used: the viewer sets the gold.
import { readFileSync } from "node:fs"
import { Document, NodeIO } from "@gltf-transform/core"
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions"
import { weld, reorder, quantize, dedup, prune } from "@gltf-transform/functions"
import { MeshoptEncoder } from "meshoptimizer"

const [inPath, outPath] = process.argv.slice(2)
const text = readFileSync(inPath, "utf8")

const V = [], N = []
const objects = [] // { name, faces: [[ [vi, ni], ... ], ...] }
let cur = null
for (const line of text.split(/\r?\n/)) {
  const t = line.trim().split(/\s+/)
  if (t[0] === "v") V.push([+t[1], +t[2], +t[3]])
  else if (t[0] === "vn") N.push([+t[1], +t[2], +t[3]])
  else if (t[0] === "o") objects.push((cur = { name: t[1], faces: [] }))
  else if (t[0] === "f") {
    if (!cur) objects.push((cur = { name: "mesh", faces: [] }))
    cur.faces.push(t.slice(1).map((s) => { const [v, , n] = s.split("/"); return [(+v) - 1, n ? (+n) - 1 : -1] }))
  }
}

// Bounding box of everything, to recentre.
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
for (const p of V) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]) }
const centre = min.map((m, k) => (m + max[k]) / 2)
const MM = 0.001

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene("pendant")
let tris = 0
for (const o of objects) {
  if (!o.faces.length) continue
  const pos = [], nor = []
  for (const f of o.faces) {
    for (let i = 1; i + 1 < f.length; i++) {
      for (const [vi, ni] of [f[0], f[i], f[i + 1]]) {
        const p = V[vi]
        pos.push((p[0] - centre[0]) * MM, (p[1] - centre[1]) * MM, (p[2] - centre[2]) * MM)
        const n = ni >= 0 ? N[ni] : [0, 1, 0]
        const l = Math.hypot(n[0], n[1], n[2]) || 1
        nor.push(n[0] / l, n[1] / l, n[2] / l)
      }
      tris++
    }
  }
  const material = doc.createMaterial(o.name).setBaseColorFactor([1, 0.78, 0.36, 1]).setMetallicFactor(1).setRoughnessFactor(0.3)
  const prim = doc.createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(nor)).setBuffer(buffer))
    .setMaterial(material)
  const mesh = doc.createMesh(o.name).addPrimitive(prim)
  scene.addChild(doc.createNode(o.name).setMesh(mesh))
}

await MeshoptEncoder.ready
doc.createExtension(KHRMeshQuantization).setRequired(true)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
await doc.transform(
  dedup(),
  weld(),
  reorder({ encoder: MeshoptEncoder }),
  quantize({ quantizePosition: 14, quantizeNormal: 10 }),
  prune(),
)
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.encoder": MeshoptEncoder })
await io.write(outPath, doc)
const size = readFileSync(outPath).length
console.log(JSON.stringify({
  objects: objects.map((o) => `${o.name}:${o.faces.length}`),
  triangles: tris,
  sizeMm: max.map((m, k) => +(m - min[k]).toFixed(2)),
  glbKB: +(size / 1024).toFixed(1),
}))
