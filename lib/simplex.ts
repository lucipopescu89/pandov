/**
 * 3D simplex noise (Stefan Gustavson's, public domain), for the Making
 * section's sun and sea (2026-11-17). It is the noise of Satori 4's sun
 * (`components/satori-sun.tsx`, which keeps its own copy), with the same fixed
 * seed, so a sun drawn with it moves as that one does: read on a circle in x,
 * y it is round without a seam, and it moves in z.
 */
const GRAD = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1],
  [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]
const PERM = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i)
  let s = 1797 // a fixed seed: the same sun on every visit
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  return Uint8Array.from([...p, ...p])
})()

/** About −1 … 1. */
export function simplex3(x: number, y: number, z: number): number {
  const F3 = 1 / 3, G3 = 1 / 6
  const s = (x + y + z) * F3
  const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s)
  const t = (i + j + k) * G3
  const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t)
  let i1, j1, k1, i2, j2, k2
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
  }
  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5
  const ii = i & 255, jj = j & 255, kk = k & 255
  const corner = (gi: number, cx: number, cy: number, cz: number) => {
    let tt = 0.6 - cx * cx - cy * cy - cz * cz
    if (tt < 0) return 0
    const g = GRAD[gi % 12]
    tt *= tt
    return tt * tt * (g[0] * cx + g[1] * cy + g[2] * cz)
  }
  const n0 = corner(PERM[ii + PERM[jj + PERM[kk]]], x0, y0, z0)
  const n1 = corner(PERM[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]], x1, y1, z1)
  const n2 = corner(PERM[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]], x2, y2, z2)
  const n3 = corner(PERM[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]], x3, y3, z3)
  return 32 * (n0 + n1 + n2 + n3)
}
