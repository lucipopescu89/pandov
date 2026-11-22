"use client"

import { useEffect, useRef, useState } from "react"
import { bigSrc, type SeenTile } from "@/lib/seen-gallery"
import { JULIUS } from "@/lib/type"

/**
 * A picture of /seen opened large (2026-11-22, the author's asking): a click
 * on it in the grid lays it over the page on the dark, whole, as large as the
 * screen allows, never larger than its file.
 *
 * - **Its larger file** (`big`, up to 2400px on its longer side) is fetched
 *   only now; until it is in, the grid's own copy, already loaded, stands in
 *   its place, so the picture is there at once and sharpens. The two either
 *   side of it are fetched too, so the next one is ready.
 * - **On through the gallery** with the arrows either side (at the foot on a
 *   phone), the keyboard's ← and →, or a swipe on a phone, in the order the
 *   grid shows them, row by row, and round from the last to the first.
 * - **Out** with a click anywhere but the arrows, the mark at the top right,
 *   or Esc. Back in the grid, the page stands where the last picture seen is
 *   (`onClose` in `seen-mosaic.tsx`).
 *
 * While it is open the page behind does not scroll (a wheel, a finger, the
 * keys), and the calm glide (`public/pandov-glide.js`) leaves it alone, since
 * it never takes a wheel the page has already taken.
 */

const FADE_MS = 350
/** A sideways drag at least this long (px) is a swipe, not a tap. */
const SWIPE_PX = 40
const GREY = "#888"

type Props = {
  tiles: SeenTile[]
  /** The tiles' indices in the order the grid shows them. */
  order: number[]
  /** The tile open, or null. */
  open: number | null
  onOpen: (i: number) => void
  onClose: () => void
}

export function SeenLightbox({ tiles, order, open, onOpen, onClose }: Props) {
  // What is on screen, kept through the fade out after `open` has gone.
  const [shown, setShown] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [sharp, setSharp] = useState<Set<number>>(() => new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open !== null) {
      setShown(open)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(r)
    }
    setVisible(false)
    const t = window.setTimeout(() => setShown(null), FADE_MS)
    return () => window.clearTimeout(t)
  }, [open])

  const step = (d: number) => {
    if (open === null || order.length === 0) return
    const n = order.length
    const p = Math.max(0, order.indexOf(open))
    onOpen(order[(p + d + n) % n])
  }
  const stepRef = useRef(step)
  stepRef.current = step
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // While open: the keys, and the page behind held still.
  const isOpen = open !== null
  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = "hidden"
    const HOLD = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End"])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current()
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        return stepRef.current(e.key === "ArrowRight" ? 1 : -1)
      }
      if (HOLD.has(e.key)) e.preventDefault()
    }
    const hold = (e: Event) => {
      if (e.cancelable) e.preventDefault()
    }
    const opts = { passive: false, capture: true } as const
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("wheel", hold, opts)
    window.addEventListener("touchmove", hold, opts)
    rootRef.current?.focus({ preventScroll: true })
    return () => {
      html.style.overflow = was
      window.removeEventListener("keydown", onKey, true)
      window.removeEventListener("wheel", hold, opts)
      window.removeEventListener("touchmove", hold, opts)
    }
  }, [isOpen])

  // The two either side, fetched ahead.
  useEffect(() => {
    if (open === null || order.length < 2) return
    const n = order.length
    const p = Math.max(0, order.indexOf(open))
    for (const d of [1, -1]) {
      const im = new Image()
      im.src = bigSrc(tiles[order[(p + d + n) % n]])
    }
  }, [open, order, tiles])

  // A swipe moves on; a tap closes (the click that follows a swipe is not one).
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  if (shown === null) return null
  const t = tiles[shown]
  const [bw] = t.big ?? [t.w, t.h]
  const isSharp = sharp.has(shown)
  const markSharp = () =>
    setSharp((s) => {
      if (s.has(shown)) return s
      const n = new Set(s)
      n.add(shown)
      return n
    })
  const button = (label: string, onPress: () => void) => ({
    type: "button" as const,
    "aria-label": label,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      onPress()
    },
  })

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.alt || "Picture"}
      tabIndex={-1}
      className="sl-root"
      onClick={() => {
        if (swiped.current) {
          swiped.current = false
          return
        }
        onClose()
      }}
      onTouchStart={(e) => {
        const p = e.touches[0]
        touch.current = p ? { x: p.clientX, y: p.clientY } : null
        swiped.current = false
      }}
      onTouchEnd={(e) => {
        const s = touch.current
        touch.current = null
        const p = e.changedTouches[0]
        if (!s || !p) return
        const dx = p.clientX - s.x
        const dy = p.clientY - s.y
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
        swiped.current = true
        step(dx < 0 ? 1 : -1)
      }}
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <div
        key={shown}
        className="sl-pic"
        style={{ aspectRatio: `${t.w} / ${t.h}`, ["--a" as string]: t.w / t.h, maxWidth: `${bw}px` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- `images.unoptimized` */}
        <img src={t.src} alt="" aria-hidden="true" draggable={false} className="sl-img" />
        {/* eslint-disable-next-line @next/next/no-img-element -- `images.unoptimized` */}
        <img
          src={bigSrc(t)}
          alt={t.alt}
          draggable={false}
          className="sl-img"
          onLoad={markSharp}
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && !isSharp) markSharp()
          }}
          style={{ opacity: isSharp ? 1 : 0, transition: "opacity 400ms ease" }}
        />
      </div>

      <button {...button("Previous", () => step(-1))} className="sl-btn sl-prev">
        &larr;
      </button>
      <button {...button("Next", () => step(1))} className="sl-btn sl-next">
        &rarr;
      </button>
      <button {...button("Close", onClose)} className="sl-btn sl-close">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M1 1 L17 17 M17 1 L1 17" stroke={GREY} strokeWidth="1.2" fill="none" />
        </svg>
      </button>

      <style>{`
        .sl-root {
          --side: clamp(16px, 4vw, 64px);
          position: fixed; inset: 0; z-index: 60; background: #202020;
          display: flex; align-items: center; justify-content: center;
          outline: none; cursor: zoom-out;
        }
        .sl-pic {
          position: relative;
          width: min(calc(100vw - 2 * (var(--side) + 64px)), calc((100vh - 96px) * var(--a)));
          width: min(calc(100vw - 2 * (var(--side) + 64px)), calc((100dvh - 96px) * var(--a)));
          animation: sl-in 300ms ease;
        }
        .sl-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
        .sl-btn {
          position: absolute; border: none; background: transparent; color: ${GREY};
          font-family: ${JULIUS}; font-size: 24px; line-height: 1; padding: 16px;
          cursor: pointer; transition: opacity .3s ease;
        }
        .sl-btn:hover { opacity: .5; }
        .sl-prev { left: calc(var(--side) - 16px); top: 50%; transform: translateY(-50%); }
        .sl-next { right: calc(var(--side) - 16px); top: 50%; transform: translateY(-50%); }
        .sl-close { right: calc(var(--side) - 16px); top: 18px; display: flex; }
        @keyframes sl-in { from { opacity: 0 } to { opacity: 1 } }
        @media (max-width: 767px) {
          .sl-pic {
            width: min(calc(100vw - 24px), calc((100vh - 170px) * var(--a)));
            width: min(calc(100vw - 24px), calc((100dvh - 170px) * var(--a)));
          }
          .sl-prev, .sl-next { top: auto; bottom: 18px; transform: none; }
          .sl-prev { left: calc(50% - 72px); }
          .sl-next { right: calc(50% - 72px); }
          .sl-close { top: 10px; right: 6px; }
        }
      `}</style>
    </div>
  )
}
