"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"

/**
 * The pieces under the rule on `/body`, as one horizontal gallery (2026-11-17,
 * the author's asking), over the list of eighteen, each under its own outlined
 * diamond, one under the next, that stood there until then. No diamonds now:
 * three pieces in a row, the one in the middle at full strength, the two
 * beside it at the strength the list had (`sideOpacity`, the page's 35%), as if
 * not yet active. The rest wait off to either side, unseen.
 *
 * It goes round: after the last piece comes the first again, either way. A
 * piece is moved to the middle by a click on it at the side, by the two small
 * chevrons either side of the name (the name being the one thing the eye
 * reads, they are found there without standing in the pictures' way), by a
 * swipe on a phone, or by the arrow keys once the gallery has the focus. The
 * arrow keys are the gallery's alone, not the page's: a visitor scrolling with
 * them elsewhere is not sent through the pieces.
 *
 * Motion is a slide in `transform` and a fade in `opacity`, both on the
 * compositor. A piece that comes round from one end to the other crosses the
 * stage at opacity 0, so it is never seen to travel.
 *
 * Sizes are the page's (`sizeOf` in `body-collections.tsx`), worked out on the
 * server and passed in, so a piece is as large here as it was in the list.
 * On a phone the row is drawn smaller and closer (`--gs`, `--slot` below), so
 * the middle piece keeps its distance from the screen's edges and the two
 * beside it come in from the edges, as Selected's cards do on a phone.
 */

export type GalleryItem = {
  src: string
  alt: string
  /** The photograph's drawn size, px, ground margin included. */
  w: number
  h: number
}

/** Edge to edge, the tallest piece's metal, px: the stage's height. */
type Props = {
  items: GalleryItem[]
  /** Each piece's name, drawn on the server (`CollectionName`), shown for the piece in the middle. */
  names: ReactNode[]
  stageH: number
  sideOpacity: number
  /** The rule to the name. */
  nameTop: number
  /** The name to the stage. */
  stageTop: number
}

const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)"
const SLIDE_MS = 750
/** A finger moved this far sideways is a swipe, px. */
const SWIPE_PX = 40

function css(sideOpacity: number) {
  return [
    // The distance from the middle piece's centre to a side piece's, and the
    // scale the row is drawn at. A computer: 400px, the widest metal (Duality's
    // earrings, 354) clearing its neighbours. Between phone and computer the
    // row closes up and draws a fifth smaller; a phone, smaller still, with the
    // side pieces coming in from the screen's edges.
    `.bg-stage{--slot:400px;--gs:1}`,
    `@media (max-width:1023px){.bg-stage{--slot:34vw;--gs:0.8}}`,
    `@media (max-width:767px){.bg-stage{--slot:58vw;--gs:0.76}}`,
    `.bg-item{position:absolute;left:50%;top:50%;display:block;opacity:0;pointer-events:none;` +
      `transition:transform ${SLIDE_MS}ms ${EASE},opacity ${SLIDE_MS}ms ${EASE};will-change:transform,opacity}`,
    `.bg-item[data-pos="0"]{opacity:1;z-index:2}`,
    `.bg-item[data-pos="1"],.bg-item[data-pos="-1"]{opacity:${sideOpacity};z-index:1;pointer-events:auto;cursor:pointer}`,
    // A side piece lifts a little under the mouse, so it reads as something to press.
    `@media (hover:hover){.bg-item[data-pos="1"]:hover,.bg-item[data-pos="-1"]:hover{opacity:${Math.min(1, sideOpacity + 0.17)}}}`,
    `.bg-name{position:absolute;left:50%;top:0;transform:translateX(-50%);opacity:0;transition:opacity ${SLIDE_MS * 0.6}ms ease}`,
    `.bg-name[data-on="1"]{opacity:1}`,
    `.bg-arrow{display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;background:none;` +
      `color:#888;opacity:0.45;cursor:pointer;transition:opacity 300ms ease}`,
    `@media (hover:hover){.bg-arrow:hover{opacity:1}}`,
    `.bg-arrow:focus-visible,.bg-stage:focus-visible{outline:1px solid rgba(198,155,92,0.5);outline-offset:4px}`,
    `@media (prefers-reduced-motion:reduce){.bg-item,.bg-name{transition-duration:1ms}}`,
  ].join("\n")
}

/** A thin chevron, pointing left or right. */
function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
      <path
        d={dir < 0 ? "M7 1L1 7L7 13" : "M1 1L7 7L1 13"}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="square"
      />
    </svg>
  )
}

export function BodyWipGallery({ items, names, stageH, sideOpacity, nameTop, stageTop }: Props) {
  const n = items.length
  const [at, setAt] = useState(0)
  const step = useCallback((d: number) => setAt((a) => (((a + d) % n) + n) % n), [n])

  // Where a piece stands from the middle: 0 in it, ±1 beside it, ±2 beyond
  // either side (all the rest wait there, unseen), counted the short way round.
  const posOf = (i: number) => {
    let p = (((i - at) % n) + n) % n
    if (p > n / 2) p -= n
    return Math.max(-2, Math.min(2, p))
  }

  // A swipe, and the click it must not also be.
  const down = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  return (
    <div className="flex flex-col items-center" style={{ alignSelf: "stretch", margin: "0 -20px" }}>
      <style>{css(sideOpacity)}</style>

      {/* The name of the piece in the middle, between the two chevrons. */}
      <div className="flex items-center justify-center" style={{ marginTop: nameTop, gap: 28 }}>
        <button type="button" className="bg-arrow" aria-label="Previous piece" onClick={() => step(-1)}>
          <Chevron dir={-1} />
        </button>
        <div aria-live="polite" style={{ position: "relative", width: 180, height: 18 }}>
          {names.map((name, i) => (
            <div key={i} className="bg-name" data-on={i === at ? "1" : "0"} aria-hidden={i !== at}>
              {name}
            </div>
          ))}
        </div>
        <button type="button" className="bg-arrow" aria-label="Next piece" onClick={() => step(1)}>
          <Chevron dir={1} />
        </button>
      </div>

      <div
        className="bg-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label="Work in progress"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
          e.preventDefault()
          step(e.key === "ArrowLeft" ? -1 : 1)
        }}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY }
          swiped.current = false
        }}
        onPointerUp={(e) => {
          const d = down.current
          down.current = null
          if (!d) return
          const dx = e.clientX - d.x
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
            swiped.current = true
            step(dx < 0 ? 1 : -1)
          }
        }}
        onPointerCancel={() => (down.current = null)}
        style={{
          position: "relative",
          width: "100%",
          height: `calc(${stageH}px * var(--gs))`,
          marginTop: stageTop,
          overflow: "visible",
          touchAction: "pan-y",
          userSelect: "none",
        }}
      >
        {items.map((it, i) => {
          const pos = posOf(i)
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={it.src}
              src={it.src}
              alt={it.alt}
              width={it.w}
              height={it.h}
              decoding="async"
              draggable={false}
              className="bg-item"
              data-pos={pos}
              aria-hidden={pos !== 0}
              onClick={() => {
                if (swiped.current) return
                if (pos === 1 || pos === -1) step(pos)
              }}
              style={{
                width: it.w,
                maxWidth: "none",
                height: it.h,
                transform: `translate(-50%, -50%) translateX(calc(var(--slot) * ${pos})) scale(var(--gs))`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
