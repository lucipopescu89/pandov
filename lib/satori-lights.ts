/**
 * What Satori's drawings share on a hover (2026-11-12): measuring a path into
 * points, Making's easing, and the lights that trace the lines as they are
 * drawn and then run along them.
 *
 * **Paths are measured here, not by the browser.** `getPointAtLength` costs
 * about a millisecond a call on Satori 2's line of pulses (some 300 curves):
 * measured a point a unit, as it was, it froze the page for 8 seconds on the
 * way in from /body (the author's report, the same day). `samplePath` reads
 * the d itself (absolute M, L, C, Z, all `satori-drawings.py` writes),
 * flattens it and spaces points evenly along it, in about a millisecond.
 */

export type Pts = { pts: Float32Array; n: number; closed: boolean; total: number }

/** A path's d as points `step` apart along it. A closed path's last point is not its first again. */
export function samplePath(d: string, step: number): Pts {
  const tok = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const poly: number[] = []
  let i = 0
  let cmd = ""
  let x = 0, y = 0, sx = 0, sy = 0
  let closed = false
  const num = () => parseFloat(tok[i++])
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++].toUpperCase()
    if (cmd === "M") {
      x = num(); y = num(); sx = x; sy = y
      poly.push(x, y)
      cmd = "L"
    } else if (cmd === "L") {
      x = num(); y = num()
      poly.push(x, y)
    } else if (cmd === "C") {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num()
      const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)
      const k = Math.max(2, Math.ceil(len / 1.5))
      for (let j = 1; j <= k; j++) {
        const t = j / k, u = 1 - t
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t
        poly.push(a * x + b * x1 + c * x2 + e * x3, a * y + b * y1 + c * y2 + e * y3)
      }
      x = x3; y = y3
    } else if (cmd === "Z") {
      closed = true
      if (x !== sx || y !== sy) poly.push(sx, sy)
      x = sx; y = sy
    } else {
      i++ // nothing else is written; skip it
    }
  }
  const m = poly.length / 2
  if (!closed && m > 1 && Math.hypot(poly[0] - poly[2 * m - 2], poly[1] - poly[2 * m - 1]) < 0.5) closed = true
  // lengths along it
  const acc = new Float64Array(m)
  for (let j = 1; j < m; j++) acc[j] = acc[j - 1] + Math.hypot(poly[2 * j] - poly[2 * j - 2], poly[2 * j + 1] - poly[2 * j - 1])
  const total = acc[m - 1]
  const n = Math.max(2, Math.round(total / step))
  const count = closed ? n : n + 1
  const pts = new Float32Array(count * 2)
  let j = 0
  for (let k = 0; k < count; k++) {
    const at = (k / n) * total
    while (j < m - 2 && acc[j + 1] < at) j++
    const seg = acc[j + 1] - acc[j]
    const f = seg > 0 ? Math.min(1, Math.max(0, (at - acc[j]) / seg)) : 0
    pts[2 * k] = poly[2 * j] + (poly[2 * j + 2] - poly[2 * j]) * f
    pts[2 * k + 1] = poly[2 * j + 1] + (poly[2 * j + 3] - poly[2 * j + 1]) * f
  }
  return { pts, n: count, closed, total }
}

/** Making's easing, cubic-bezier(.3, 0, .2, 1), at `x` (0 → 1). */
export function ease(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const X1 = 0.3, Y1 = 0, X2 = 0.2, Y2 = 1
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * X1 + 3 * (1 - t) * t * t * X2 + t * t * t
  let lo = 0, hi = 1, t = x
  for (let k = 0; k < 24; k++) {
    t = (lo + hi) / 2
    if (bx(t) < x) lo = t
    else hi = t
  }
  return 3 * (1 - t) * (1 - t) * t * Y1 + 3 * (1 - t) * t * t * Y2 + t * t * t
}

/** How a line is drawn by hand: from its start, its end, both ends to its middle, or its middle out. */
export type Mode = "start" | "end" | "both" | "middle"

/** The last segment's index along a line: a closed line goes on from its last point back to its first. */
export const span = (l: Pts) => (l.closed ? l.n : l.n - 1)

/** How far along it each end of the drawing is, at `p` (0 → 1) of its drawing: the stretches drawn, in point indices. */
export function drawnStretches(mode: Mode, m: number, p: number): [number, number][] {
  switch (mode) {
    case "start":
      return [[0, p * m]]
    case "end":
      return [[m - p * m, m]]
    case "both":
      return [[0, (p * m) / 2], [m - (p * m) / 2, m]]
    case "middle":
      return [[m / 2 - (p * m) / 2, m / 2 + (p * m) / 2]]
  }
}

/** Stroke a stretch of a line, from index `a` to `b` (fractional, `a` < `b`), into the current path. */
export function stretch(ctx: CanvasRenderingContext2D, l: Pts, a: number, b: number) {
  if (b - a <= 0.001) return
  const { pts, n } = l
  const P = (k: number) => {
    const i = Math.floor(k)
    const f = k - i
    const i0 = i % n
    const i1 = (i + 1) % n
    return [pts[2 * i0] + (pts[2 * i1] - pts[2 * i0]) * f, pts[2 * i0 + 1] + (pts[2 * i1 + 1] - pts[2 * i0 + 1]) * f]
  }
  const s = P(a)
  ctx.moveTo(s[0], s[1])
  for (let k = Math.floor(a) + 1; k < b; k++) {
    const q = k % n
    ctx.lineTo(pts[2 * q], pts[2 * q + 1])
  }
  const e = P(b)
  ctx.lineTo(e[0], e[1])
}

/**
 * The lights (2026-11-12, the author's brief, from Satori 2's light round its
 * line of pulses): each starts where the line's drawing starts and rides its
 * front as it is drawn (from both ends, from the middle out, or from one end,
 * as the line is drawn), so the drawing is traced as it appears, then runs on
 * along the line at `speed`: round and round a closed line, off the end of an
 * open one and back in from where it began. A trail fades out behind it
 * (`trail`) and its front fades in (`front`); never longer than the way it has
 * come.
 */
export type LightCfg = { trail: number; front: number; piece: number; speed: number }

/** The lights of one line, `d` points along their way from where they began. */
export function comets(ctx: CanvasRenderingContext2D, l: Pts, mode: Mode, d: number, alpha: number, cfg: LightCfg, step: number) {
  const m = span(l)
  const seeds: [number, 1 | -1, number][] =
    mode === "both" ? [[0, 1, m], [m, -1, m]]
      : mode === "middle" ? [[m / 2, 1, m / 2], [m / 2, -1, m / 2]]
        : mode === "start" ? [[0, 1, m]]
          : [[m, -1, m]]
  const trail = cfg.trail / step
  const front = Math.max(1, cfg.front / step)
  const piece = Math.max(1, Math.round(cfg.piece / step))
  const { pts, n, closed } = l
  for (const [origin, dir, reach] of seeds) {
    const e = closed ? d : d % (reach + trail)
    const head = Math.floor(origin + dir * e)
    const len = Math.min(trail, e)
    for (let k = 0; k < len; k += piece) {
      const mid = k + piece / 2
      const f = 1 - mid / trail
      const g = Math.min(1, mid / front)
      const a0 = head - dir * k
      if (!closed && (a0 < 0 || a0 > m)) continue
      ctx.globalAlpha = alpha * f * f * g * g * (3 - 2 * g)
      ctx.beginPath()
      const i0 = ((a0 % n) + n) % n
      ctx.moveTo(pts[2 * i0], pts[2 * i0 + 1])
      for (let j = 1; j <= piece && k + j <= len; j++) {
        const b = a0 - dir * j
        if (!closed && (b < 0 || b > m)) break
        const q = ((b % n) + n) % n
        ctx.lineTo(pts[2 * q], pts[2 * q + 1])
      }
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/** How far a line's lights have come, in points: `p` (0 → 1) of its drawing, then on at `speed` for `after` seconds. */
export function lightWay(mode: Mode, l: Pts, p: number, after: number, cfg: LightCfg, step: number) {
  const m = span(l)
  const reach = mode === "both" || mode === "middle" ? m / 2 : m
  return reach * p + (after > 0 ? (after * cfg.speed) / step : 0)
}
