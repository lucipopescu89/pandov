// The Making page's 3D model: the scanned log end and the lamp designed to fit
// it, from the author's 3ds Max OBJ export ("Scan si Lampa.obj"), as one small GLB.
//
//   node scripts/making-model.mjs "<Scan si Lampa.obj>" public/models/making-scan.glb [scanTriangles]
//
// Written without gltf-transform, by hand: the scan is 160,035 triangles with
// one normal per face (3ds Max's "s off"), the lamp 6,272 quads and pentagons
// with its smoothing groups.
//
// - The scan is simplified by quadric error (Garland & Heckbert), one vertex
//   folded onto a neighbour at a time, never across the scan's open edge and
//   never turning a face over, down to `scanTriangles` (60,000 by default). Its
//   normals are not stored: the viewer works them out (`computeVertexNormals`).
//   Its UVs are dropped: the two 8192px textures beside the OBJ were baked on the
//   1M-triangle scan and do not fit this export's unwrap (checked on 2026-11-17:
//   their patches fall across this mesh's UV islands).
// - The lamp keeps every face and its exported normals.
// - Positions are 16-bit, normals 8-bit (KHR_mesh_quantization), indices 16-bit.
//
// Recentred on the origin and scaled so the whole stands 1 unit tall, +Y up.
import { readFileSync, writeFileSync } from "node:fs"

const [inPath, outPath, scanTarget = "60000"] = process.argv.slice(2)
const TARGET = +scanTarget

// ---------- read ----------
const V = [], N = []
const objects = []
let cur = null
for (const line of readFileSync(inPath, "utf8").split(/\r?\n/)) {
  if (line.startsWith("v ")) { const t = line.trim().split(/\s+/); V.push(+t[1], +t[2], +t[3]) }
  else if (line.startsWith("vn ")) { const t = line.trim().split(/\s+/); N.push(+t[1], +t[2], +t[3]) }
  else if (line.startsWith("o ")) objects.push((cur = { name: line.trim().split(/\s+/)[1], faces: [] }))
  else if (line.startsWith("f ")) {
    cur.faces.push(line.trim().split(/\s+/).slice(1).map((s) => { const p = s.split("/"); return [+p[0] - 1, p[2] ? +p[2] - 1 : -1] }))
  }
}
const scanObj = objects.find((o) => o.faces.length > 100000) ?? objects[0]
const lampObj = objects.find((o) => o !== scanObj)

let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < V.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], V[i + k]); hi[k] = Math.max(hi[k], V[i + k]) }
const centre = lo.map((l, k) => (l + hi[k]) / 2)
const unit = 1 / (hi[1] - lo[1])

// ---------- the scan: compact, then simplify ----------
function simplify(faces, target) {
  const remap = new Map()
  const P = []
  const tri = []
  for (const f of faces) {
    const ids = f.map(([vi]) => {
      let id = remap.get(vi)
      if (id === undefined) { id = P.length / 3; remap.set(vi, id); P.push(V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]) }
      return id
    })
    for (let i = 1; i + 1 < ids.length; i++) tri.push(ids[0], ids[i], ids[i + 1])
  }
  const n = P.length / 3, m = tri.length / 3
  const pos = Float64Array.from(P)
  const T = Int32Array.from(tri)
  const alive = new Uint8Array(m).fill(1)
  const vt = Array.from({ length: n }, () => [])
  for (let t = 0; t < m; t++) for (let c = 0; c < 3; c++) vt[T[t * 3 + c]].push(t)

  // Open edges: an edge with one face. Its vertices stay where they are.
  const edgeCount = new Map()
  const key = (a, b) => (a < b ? a * n + b : b * n + a)
  for (let t = 0; t < m; t++) for (let c = 0; c < 3; c++) {
    const k = key(T[t * 3 + c], T[t * 3 + ((c + 1) % 3)])
    edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1)
  }
  const locked = new Uint8Array(n)
  for (const [k, c] of edgeCount) if (c !== 2) { locked[Math.floor(k / n)] = 1; locked[k % n] = 1 }

  // Quadrics, one per vertex: the sum of its faces' planes, weighted by area.
  const Q = new Float64Array(n * 10)
  const normalOf = (a, b, c, out) => {
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2]
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2]
    out[0] = uy * vz - uz * vy; out[1] = uz * vx - ux * vz; out[2] = ux * vy - uy * vx
    return Math.hypot(out[0], out[1], out[2])
  }
  const nn = [0, 0, 0]
  for (let t = 0; t < m; t++) {
    const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2]
    const len = normalOf(a, b, c, nn)
    if (!len) continue
    const x = nn[0] / len, y = nn[1] / len, z = nn[2] / len
    const d = -(x * pos[a * 3] + y * pos[a * 3 + 1] + z * pos[a * 3 + 2])
    const w = len / 2
    const q = [x * x, x * y, x * z, x * d, y * y, y * z, y * d, z * z, z * d, d * d]
    for (const v of [a, b, c]) for (let i = 0; i < 10; i++) Q[v * 10 + i] += q[i] * w
  }
  const err = (a, b, v) => {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]
    const q = (i) => Q[a * 10 + i] + Q[b * 10 + i]
    return q(0) * x * x + 2 * q(1) * x * y + 2 * q(2) * x * z + 2 * q(3) * x + q(4) * y * y + 2 * q(5) * y * z + 2 * q(6) * y + q(7) * z * z + 2 * q(8) * z + q(9)
  }

  // A binary heap of candidate folds: [cost, from, to, stampFrom, stampTo].
  const heap = []
  const stamp = new Int32Array(n)
  const push = (e) => { heap.push(e); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p } }
  const pop = () => {
    const top = heap[0], last = heap.pop()
    if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s } }
    return top
  }
  const consider = (a, b) => {
    const ca = locked[a] ? Infinity : err(a, b, b)
    const cb = locked[b] ? Infinity : err(a, b, a)
    if (ca === Infinity && cb === Infinity) return
    if (ca <= cb) push([ca, a, b, stamp[a], stamp[b]])
    else push([cb, b, a, stamp[b], stamp[a]])
  }
  const neighbours = (v) => {
    const s = new Set()
    for (const t of vt[v]) if (alive[t]) for (let c = 0; c < 3; c++) s.add(T[t * 3 + c])
    s.delete(v)
    return s
  }
  for (const k of edgeCount.keys()) consider(Math.floor(k / n), k % n)

  let tris = m
  const n0 = [0, 0, 0], n1 = [0, 0, 0]
  while (tris > target && heap.length) {
    const [, from, to, sf, st] = pop()
    if (stamp[from] !== sf || stamp[to] !== st || stamp[from] < 0 || stamp[to] < 0) continue
    // The link condition: the two may share only the vertices across their shared faces.
    const nf = neighbours(from), ntv = neighbours(to)
    if (!nf.has(to)) continue
    let shared = 0, common = 0
    for (const t of vt[from]) if (alive[t] && (T[t * 3] === to || T[t * 3 + 1] === to || T[t * 3 + 2] === to)) shared++
    for (const v of nf) if (ntv.has(v)) common++
    if (common !== shared) continue
    // No face may turn over or collapse.
    let ok = true
    for (const t of vt[from]) {
      if (!alive[t]) continue
      const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2]
      if (a === to || b === to || c === to) continue
      const l0 = normalOf(a, b, c, n0)
      const r = (v) => (v === from ? to : v)
      const l1 = normalOf(r(a), r(b), r(c), n1)
      if (!l0 || !l1 || (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) / (l0 * l1) < 0.2) { ok = false; break }
    }
    if (!ok) continue
    for (const t of vt[from]) {
      if (!alive[t]) continue
      let hasTo = false
      for (let c = 0; c < 3; c++) if (T[t * 3 + c] === to) hasTo = true
      if (hasTo) { alive[t] = 0; tris--; continue }
      for (let c = 0; c < 3; c++) if (T[t * 3 + c] === from) T[t * 3 + c] = to
      vt[to].push(t)
    }
    for (let i = 0; i < 10; i++) Q[to * 10 + i] += Q[from * 10 + i]
    stamp[from] = -1
    stamp[to]++
    vt[to] = vt[to].filter((t) => alive[t])
    for (const v of neighbours(to)) { stamp[v]++ }
    for (const v of neighbours(to)) consider(to, v)
    for (const v of neighbours(to)) for (const w of neighbours(v)) if (w !== to) consider(v, w)
  }

  // Compact what is left.
  const used = new Int32Array(n).fill(-1)
  const outP = [], outI = []
  for (let t = 0; t < m; t++) {
    if (!alive[t]) continue
    for (let c = 0; c < 3; c++) {
      const v = T[t * 3 + c]
      if (used[v] < 0) { used[v] = outP.length / 3; outP.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]) }
      outI.push(used[v])
    }
  }
  return { P: outP, I: outI, before: m }
}

function lampMesh(faces) {
  const key = new Map(), P = [], Nn = [], I = []
  for (const f of faces) {
    const ids = f.map(([vi, ni]) => {
      const k = vi + "/" + ni
      let id = key.get(k)
      if (id === undefined) {
        id = P.length / 3; key.set(k, id)
        P.push(V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2])
        const x = N[ni * 3], y = N[ni * 3 + 1], z = N[ni * 3 + 2], l = Math.hypot(x, y, z) || 1
        Nn.push(x / l, y / l, z / l)
      }
      return id
    })
    for (let i = 1; i + 1 < ids.length; i++) I.push(ids[0], ids[i], ids[i + 1])
  }
  return { P, N: Nn, I }
}

const scan = simplify(scanObj.faces, TARGET)
const lamp = lampObj ? lampMesh(lampObj.faces) : null

// ---------- write the GLB ----------
const chunks = []
let offset = 0
const bufferViews = [], accessors = []
const add = (bytes, target, stride) => {
  const pad = (4 - (offset % 4)) % 4
  if (pad) { chunks.push(new Uint8Array(pad)); offset += pad }
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, ...(target ? { target } : {}), ...(stride ? { byteStride: stride } : {}) })
  chunks.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  offset += bytes.byteLength
  return bufferViews.length - 1
}
// Positions to 16 bits within the model's own box, which the node's scale and translation undo.
function quantPositions(P) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  const W = P.map((v, i) => (v - centre[i % 3]) * unit)
  for (let i = 0; i < W.length; i++) { lo[i % 3] = Math.min(lo[i % 3], W[i]); hi[i % 3] = Math.max(hi[i % 3], W[i]) }
  const mid = lo.map((l, k) => (l + hi[k]) / 2)
  const half = Math.max(...hi.map((h, k) => h - lo[k])) / 2
  const q = new Int16Array((W.length / 3) * 4)
  const qmin = [32767, 32767, 32767], qmax = [-32767, -32767, -32767]
  for (let v = 0; v < W.length / 3; v++) for (let k = 0; k < 3; k++) {
    const s = Math.round(((W[v * 3 + k] - mid[k]) / half) * 32767)
    q[v * 4 + k] = s; qmin[k] = Math.min(qmin[k], s); qmax[k] = Math.max(qmax[k], s)
  }
  const view = add(q, 34962, 8)
  accessors.push({ bufferView: view, componentType: 5122, normalized: true, count: W.length / 3, type: "VEC3", min: qmin, max: qmax })
  return { accessor: accessors.length - 1, translation: mid, scale: half }
}
function indices(I) {
  const a = I.length && Math.max(...I.slice(0, 1)) >= 0 && I.reduce((m, v) => (v > m ? v : m), 0) < 65535 ? new Uint16Array(I) : new Uint32Array(I)
  const view = add(a, 34963)
  accessors.push({ bufferView: view, componentType: a instanceof Uint16Array ? 5123 : 5125, count: I.length, type: "SCALAR" })
  return accessors.length - 1
}
function normals(Nn) {
  const q = new Int8Array((Nn.length / 3) * 4)
  for (let v = 0; v < Nn.length / 3; v++) for (let k = 0; k < 3; k++) q[v * 4 + k] = Math.round(Nn[v * 3 + k] * 127)
  const view = add(q, 34962, 4)
  accessors.push({ bufferView: view, componentType: 5120, normalized: true, count: Nn.length / 3, type: "VEC3" })
  return accessors.length - 1
}

const meshes = [], nodes = []
const materials = [
  { name: "scan", pbrMetallicRoughness: { baseColorFactor: [0.035, 0.03, 0.028, 1], metallicFactor: 0, roughnessFactor: 0.82 } },
  { name: "lamp", pbrMetallicRoughness: { baseColorFactor: [0.93, 0.86, 0.84, 1], metallicFactor: 0, roughnessFactor: 0.45 } },
]
{
  const qp = quantPositions(scan.P)
  const ix = indices(scan.I)
  meshes.push({ name: "scan", primitives: [{ attributes: { POSITION: qp.accessor }, indices: ix, material: 0 }] })
  nodes.push({ name: "scan", mesh: 0, translation: qp.translation, scale: [qp.scale, qp.scale, qp.scale] })
}
if (lamp) {
  const qp = quantPositions(lamp.P)
  const nx = normals(lamp.N)
  const ix = indices(lamp.I)
  meshes.push({ name: "lamp", primitives: [{ attributes: { POSITION: qp.accessor, NORMAL: nx }, indices: ix, material: 1 }] })
  nodes.push({ name: "lamp", mesh: 1, translation: qp.translation, scale: [qp.scale, qp.scale, qp.scale] })
}

const bin = new Uint8Array(offset + ((4 - (offset % 4)) % 4))
{ let o = 0; for (const c of chunks) { bin.set(c, o); o += c.byteLength } }
const gltf = {
  asset: { version: "2.0", generator: "pandov making-model.mjs" },
  extensionsUsed: ["KHR_mesh_quantization"],
  extensionsRequired: ["KHR_mesh_quantization"],
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes, meshes, materials, accessors, bufferViews,
  buffers: [{ byteLength: bin.byteLength }],
}
let json = new TextEncoder().encode(JSON.stringify(gltf))
const jpad = (4 - (json.length % 4)) % 4
const jsonChunk = new Uint8Array(json.length + jpad).fill(0x20); jsonChunk.set(json)
const total = 12 + 8 + jsonChunk.length + 8 + bin.length
const out = new Uint8Array(total), dv = new DataView(out.buffer)
dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true)
dv.setUint32(12, jsonChunk.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(jsonChunk, 20)
const b0 = 20 + jsonChunk.length
dv.setUint32(b0, bin.length, true); dv.setUint32(b0 + 4, 0x004e4942, true); out.set(bin, b0 + 8)
writeFileSync(outPath, out)
console.log(JSON.stringify({
  scanTriangles: `${scan.before} -> ${scan.I.length / 3}`,
  lampTriangles: lamp ? lamp.I.length / 3 : 0,
  glbKB: +(total / 1024).toFixed(1),
}))
