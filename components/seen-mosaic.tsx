"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BAR_H, SeenBar } from "@/components/seen-bar"
import { SeenEyes } from "@/components/seen-eyes"
import { SeenLightbox } from "@/components/seen-lightbox"
import { SEEN_TILES, type SeenTile } from "@/lib/seen-gallery"
import { JULIUS, TEXT_FONT, TEXT_SIZE, TEXT_TRACK, TRACK, TRACK_BACK } from "@/lib/type"
import { still } from "@/lib/still"

/**
 * /seen — the hidden page behind the eye (2026-11-08, the author's asking, an
 * experiment). Nothing links to it but the eye in the homepage's Making
 * section (`EYE_HREF` in `making-drawing.tsx`), and it asks search engines to
 * leave it out (`app/seen/page.tsx`).
 *
 * Since 2026-11-22 (the author's asking):
 *
 * - **What it shows** is the author's folder for it (`lib/seen-gallery.ts`),
 *   no longer every photograph on the site.
 * - **Nothing is cut.** Each picture keeps its own proportion whole: the
 *   fields are made to the pictures, not the pictures to the fields. Until
 *   then a picture could lose some of its ground to fit its field (never the
 *   piece; `BOX`, measured off the files, said how much).
 * - **A word first.** The page opens on the dark with one line, which comes
 *   up, stays a moment and goes, and then the pictures come up out of the
 *   dark (`Intro`). A scroll, a key or a click lets the reader straight in.
 * - **A bar at the top** (`SeenBar`): an arrow home on the left, the eyes on
 *   the right; it goes with a scroll down and comes back with a scroll up.
 *   The pair of eyes at the foot of the page stays.
 * - **A click opens a picture** large, on the dark, and the arrows go on
 *   through the gallery (`SeenLightbox`).
 *
 * The grid is still Mondrian-like, in a random order that is the same on every
 * visit (`SEED`): rows that run the full width, held apart by `GAP` of
 * ground, some fields holding two pictures one above the other
 * (`STACK_CHANCE`). A row's height is whatever lets its pictures fill the
 * width whole, so the pictures are shared out among the rows to keep the rows
 * as near one height as they can (`rowsOf`): about three across a laptop, four
 * on a wide screen, two on a phone (`columns`).
 */

/** The ground between the fields, px. */
const GAP = 3
/** Fields across a row: ~3 on a laptop, 4 on a wide screen (never more, the author's asking), 2 on a phone. */
const FIELD_PX = 480
const columns = (w: number) => (w < 768 ? 2 : Math.min(4, Math.max(3, Math.round(w / FIELD_PX))))
/** A row aims at this height, as a share of a field's width. */
const ROW_ASPECT = 1.15
/** How often two pictures share a field, one above the other, Mondrian's smaller divisions. */
const STACK_CHANCE = 0.3
/** Fixes the order and the stacks, so the page is the same on every visit. */
const SEED = 8

/**
 * The opening line: up in `INTRO_IN_MS`, held `INTRO_HOLD_MS`, gone in
 * `INTRO_OUT_MS`; then the pictures come up in `GRID_IN_MS`. Let in early by
 * the reader, the line goes in `INTRO_SKIP_MS`.
 */
const INTRO_IN_MS = 1200
const INTRO_HOLD_MS = 2000
const INTRO_OUT_MS = 1000
const INTRO_SKIP_MS = 450
const GRID_IN_MS = 1200
const INTRO_TITLE = "You found the hidden gallery"
const INTRO_LINE = "What the eye has kept, in no particular order."
const GREY = "#888"

/** A small seeded random, so the order is the same for the same seed. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A field: one picture, or two one above the other. `n` is its proportion, width over height. */
type Field = { items: number[]; n: number }

/**
 * The fields shared out among `k` rows, in order, so each row's proportions
 * add up as near the same sum as they can: the row heights then come out as
 * near one another as the pictures allow. Returns where each row starts, and
 * the end.
 */
function rowsOf(ns: number[], k: number): number[] {
  const n = ns.length
  k = Math.max(1, Math.min(k, n))
  const pre = [0]
  for (const v of ns) pre.push(pre[pre.length - 1] + v)
  const avg = pre[n] / k
  const cost = (i: number, j: number) => (pre[j] - pre[i] - avg) ** 2
  const best = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(Infinity))
  const from = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(0))
  best[0][0] = 0
  for (let r = 1; r <= k; r++) {
    for (let j = r; j <= n; j++) {
      for (let i = r - 1; i < j; i++) {
        const v = best[r - 1][i] + cost(i, j)
        if (v < best[r][j]) {
          best[r][j] = v
          from[r][j] = i
        }
      }
    }
  }
  const cuts = [n]
  let j = n
  for (let r = k; r >= 1; r--) {
    j = from[r][j]
    cuts.push(j)
  }
  return cuts.reverse()
}

type Rect = { x: number; y: number; w: number; h: number }

/**
 * The whole grid for a box `w` wide: where each picture goes, and the height
 * it all takes. Every rect, less `GAP`, has its picture's own proportion
 * exactly, the gaps included in the sums, so nothing is cut.
 */
function layout(w: number, tiles: SeenTile[]): { rects: Rect[]; height: number; order: number[] } {
  const rand = seeded(SEED)
  const aspect = tiles.map((t) => t.w / t.h)
  const order = tiles.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // Fields: one picture, or two one above the other when their proportions
  // together still make a reasonable field.
  const fields: Field[] = []
  for (let k = 0; k < order.length; k++) {
    const a = aspect[order[k]]
    if (k + 1 < order.length && rand() < STACK_CHANCE) {
      const b = aspect[order[k + 1]]
      const n = 1 / (1 / a + 1 / b)
      if (n > 0.45 && n < 1.3) {
        fields.push({ items: [order[k], order[k + 1]], n })
        k++
        continue
      }
    }
    fields.push({ items: [order[k]], n: a })
  }

  const cols = columns(w)
  const perRow = cols * ROW_ASPECT
  const total = fields.reduce((s, f) => s + f.n, 0)
  const cuts = rowsOf(
    fields.map((f) => f.n),
    Math.round(total / perRow),
  )

  const rects: Rect[] = new Array(tiles.length)
  // The order the eye reads them in, row by row, for the arrows of the opened picture.
  const seen: number[] = []
  let y = 0
  for (let r = 0; r + 1 < cuts.length; r++) {
    const row = fields.slice(cuts[r], cuts[r + 1])
    // Each field is GAP wider and (one GAP per picture in it) taller than
    // the pictures it shows; the height that makes the row fill `w` exactly:
    const sumN = row.reduce((s, f) => s + f.n, 0)
    const sumCN = row.reduce((s, f) => s + f.items.length * f.n, 0)
    const h = (w - row.length * GAP + GAP * sumCN) / sumN
    let x = 0
    for (const f of row) {
      seen.push(...f.items)
      const fw = GAP + (h - f.items.length * GAP) * f.n
      if (f.items.length === 1) {
        rects[f.items[0]] = { x, y, w: fw, h }
      } else {
        const [a, b] = f.items
        const ha = (fw - GAP) / aspect[a] + GAP
        rects[a] = { x, y, w: fw, h: ha }
        rects[b] = { x, y: y + ha, w: fw, h: h - ha }
      }
      x += fw
    }
    y += h
  }
  return { rects, height: y, order: seen }
}

/** The line the page opens on, over the dark, before the pictures. */
function Intro({ phase }: { phase: "in" | "hold" | "out" | "skip" }) {
  const [on, setOn] = useState(false)
  // Laid at 0 first, then raised, so it fades up rather than appearing.
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(r)
  }, [])
  const leaving = phase === "out" || phase === "skip"
  const ms = phase === "skip" ? INTRO_SKIP_MS : leaving ? INTRO_OUT_MS : INTRO_IN_MS
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
        pointerEvents: "none",
        opacity: on && !leaving ? 1 : 0,
        transition: `opacity ${ms}ms cubic-bezier(.45,0,.55,1)`,
      }}
    >
      <p
        style={{
          fontFamily: JULIUS,
          textTransform: "uppercase",
          letterSpacing: TRACK,
          fontSize: "clamp(13px, 1.25vw, 20px)",
          lineHeight: 1.3,
          color: GREY,
          margin: `0 ${TRACK_BACK} 0 0`,
        }}
      >
        {INTRO_TITLE}
      </p>
      <p
        style={{
          fontFamily: TEXT_FONT,
          fontWeight: 400,
          fontSize: `${TEXT_SIZE}px`,
          lineHeight: 1.5,
          letterSpacing: TEXT_TRACK,
          color: GREY,
          margin: `18px -${TEXT_TRACK} 0 0`,
        }}
      >
        {INTRO_LINE}
      </p>
    </div>
  )
}

export function SeenMosaic() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set())
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "skip" | "done">("in")
  const [open, setOpen] = useState<number | null>(null)

  // Back from an opened picture, the page stands where the last one seen is,
  // if the arrows went on past the screen.
  const close = useCallback(() => {
    const last = open
    setOpen(null)
    if (last === null) return
    const el = document.querySelector<HTMLElement>(`[data-seen="${last}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top >= BAR_H && r.bottom <= window.innerHeight) return
    window.scrollTo({ top: window.scrollY + r.top - Math.max(BAR_H, (window.innerHeight - r.height) / 2), behavior: "instant" })
  }, [open])

  useEffect(() => {
    const measure = () => {
      const w = boxRef.current?.clientWidth ?? 0
      if (w > 0) setWidth((old) => (old === w ? old : w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (boxRef.current) ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [])

  // The opening line's time, and the reader's way past it. While it shows, a
  // scroll does not move the page (it would come up already scrolled): it
  // lets the reader in. A click on the bar (home, the eyes) still does what
  // it does.
  useEffect(() => {
    if (still()) {
      setPhase("done")
      return
    }
    const timers: number[] = []
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
    let over = false
    const end = (leaveMs: number, from: "out" | "skip") => {
      if (over) return
      over = true
      timers.forEach((t) => window.clearTimeout(t))
      setPhase(from)
      at(leaveMs, () => setPhase("done"))
      remove()
    }
    at(INTRO_IN_MS, () => setPhase("hold"))
    at(INTRO_IN_MS + INTRO_HOLD_MS, () => end(INTRO_OUT_MS, "out"))

    const skip = () => end(INTRO_SKIP_MS, "skip")
    const hold = (e: Event) => {
      if (e.cancelable) e.preventDefault()
      skip()
    }
    const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "End", "Home"])
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) e.preventDefault()
      skip()
    }
    const opts = { passive: false, capture: true } as const
    window.addEventListener("wheel", hold, opts)
    window.addEventListener("touchmove", hold, opts)
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("pointerdown", skip, true)
    function remove() {
      window.removeEventListener("wheel", hold, opts)
      window.removeEventListener("touchmove", hold, opts)
      window.removeEventListener("keydown", onKey, true)
      window.removeEventListener("pointerdown", skip, true)
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      remove()
    }
  }, [])

  const grid = width ? layout(width, SEEN_TILES) : null
  const onLoad = useCallback((i: number) => {
    setLoaded((s) => {
      if (s.has(i)) return s
      const n = new Set(s)
      n.add(i)
      return n
    })
  }, [])

  return (
    <main className="w-full" style={{ backgroundColor: "#202020", minHeight: "100vh" }}>
      <SeenBar />
      <div aria-hidden="true" style={{ height: BAR_H }} />

      <div
        ref={boxRef}
        className="relative w-full overflow-hidden"
        style={{
          height: grid ? grid.height : "100vh",
          opacity: phase === "done" ? 1 : 0,
          // not to be clicked before it shows
          pointerEvents: phase === "done" ? "auto" : "none",
          transition: `opacity ${GRID_IN_MS}ms ease`,
        }}
      >
        {grid &&
          SEEN_TILES.map((t, i) => {
            const r = grid.rects[i]
            return (
              <button
                key={t.src}
                type="button"
                data-seen={i}
                onClick={() => setOpen(i)}
                className="absolute"
                style={{
                  left: r.x + GAP / 2,
                  top: r.y + GAP / 2,
                  width: Math.max(0, r.w - GAP),
                  height: Math.max(0, r.h - GAP),
                  overflow: "hidden",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "zoom-in",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- `images.unoptimized`: next/image would serve the same file */}
                <img
                  src={t.src}
                  alt={t.alt}
                  width={t.w}
                  height={t.h}
                  draggable={false}
                  decoding="async"
                  loading="lazy"
                  onLoad={() => onLoad(i)}
                  ref={(el) => {
                    // A picture already in the cache can finish before React listens.
                    if (el?.complete && el.naturalWidth > 0) onLoad(i)
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    // The field has the picture's own proportion: `cover` cuts
                    // nothing but a fraction of a pixel. A cut-out is never
                    // drawn larger than its own pixels.
                    objectFit: t.cutout ? "scale-down" : "cover",
                    opacity: loaded.has(i) ? 1 : 0,
                    transition: "opacity 900ms ease",
                  }}
                />
              </button>
            )
          })}
      </div>

      <SeenEyes place="footer" />

      {phase !== "done" && <Intro phase={phase} />}

      <SeenLightbox tiles={SEEN_TILES} order={grid?.order ?? []} open={open} onOpen={setOpen} onClose={close} />
    </main>
  )
}
