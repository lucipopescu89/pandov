"use client"

import { useEffect } from "react"

/* --------------------------------------------------------------------------
   Lights the pieces of a page by where they stand in the window, as the
   captions on Second Wind are lit (`caption-fade.tsx`): out below the fold,
   coming up as they rise toward the middle, at full light across it, and going
   again as they carry on past. Only what is about the middle of the window is
   read; the rest is the film. The author asked for it on the Contact page on
   2026-11-16, "like the text on Second Wind", and then for each of its three
   blocks to come and go whole rather than line by line.

   The page marks what fades with `data-center-fade`, and this finds them.
   Two rules, by the mark's value:

   - `data-center-fade` alone: a line, lit by where its middle stands, with
     Second Wind's figures. Contact's hairlines.
   - `data-center-fade="block"`: a block taller than a line, lit for as long as
     it covers the middle of the window, by its edges rather than its middle.
     Get in Touch is about a laptop's window tall and twice an iPhone 8's; lit
     by its middle, as a line, its title would be dark while it stood in the
     middle of a phone. So it comes up as its top edge rises to the middle and
     goes as its bottom edge passes it, and where one block meets the next the
     two cross: one going as the other comes.

   `scroll-fade.tsx` does the line's rule for single lines, but it renders its
   own <p>, which cannot hold a form; this one leaves the markup to the page
   and only writes each piece's opacity.
   -------------------------------------------------------------------------- */

/**
 * A line: where its middle stands in the window, as a share of its height from
 * the top. Rising from the bottom it is out until `IN_GONE` and lit by
 * `IN_LIT`; carrying on up it begins to go at `OUT_LIT` and is gone by
 * `OUT_GONE`. Second Wind's figures (`caption-fade.tsx`, as the author set
 * them on 2026-11-08): lit across the middle 40% of the window.
 */
const IN_GONE = 0.92
const IN_LIT = 0.7
const OUT_LIT = 0.3
const OUT_GONE = 0.08

/**
 * A block: its top edge brings it up between `BLOCK_IN_GONE` and
 * `BLOCK_IN_LIT`, its bottom edge takes it away between `BLOCK_OUT_LIT` and
 * `BLOCK_OUT_GONE`. The two ramps overlap about the middle, so where one block
 * ends and the next begins, as the line between them crosses the middle, the
 * one is three quarters gone as the other is three quarters come.
 */
const BLOCK_IN_GONE = 0.65
const BLOCK_IN_LIT = 0.45
const BLOCK_OUT_LIT = 0.55
const BLOCK_OUT_GONE = 0.35

/** Non-finite to 0: the ratios below are NaN before anything is measured. */
const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
const smooth = (t: number) => t * t * (3 - 2 * t)

type Piece = {
  el: HTMLElement
  /** From the top of the document: the edge that brings it up and the edge that takes it away (both its middle, for a line). */
  lead: number
  tail: number
  /** Window positions, in px: out at `inGone` and `outGone`, lit between the other two. */
  inGone: number
  inLit: number
  outLit: number
  outGone: number
  shown: number
}

export function CenterFade({ selector = "[data-center-fade]" }: { selector?: string }) {
  useEffect(() => {
    let pieces: Piece[] = []
    let raf = 0

    const measure = () => {
      const vh = window.innerHeight
      const maxScroll = document.documentElement.scrollHeight - vh
      pieces = Array.from(document.querySelectorAll<HTMLElement>(selector)).map((el) => {
        const r = el.getBoundingClientRect()
        const block = el.dataset.centerFade === "block"
        const lead = (block ? r.top : (r.top + r.bottom) / 2) + window.scrollY
        const tail = (block ? r.bottom : (r.top + r.bottom) / 2) + window.scrollY
        const f = block
          ? { inGone: BLOCK_IN_GONE, inLit: BLOCK_IN_LIT, outLit: BLOCK_OUT_LIT, outGone: BLOCK_OUT_GONE }
          : { inGone: IN_GONE, inLit: IN_LIT, outLit: OUT_LIT, outGone: OUT_GONE }
        // As in `scroll-fade.tsx`: what is already past its going-edge with the
        // page at its top is lit where it stands, and what cannot rise far
        // enough before the page ends is lit by the time it can go no further,
        // so nothing at either end of the page is left dark for good.
        const outLit = Math.min(f.outLit * vh, tail)
        const inLit = Math.max(f.inLit * vh, lead - maxScroll)
        const old = pieces.find((p) => p.el === el)
        return {
          el,
          lead,
          tail,
          inLit,
          outLit,
          inGone: inLit + (f.inGone - f.inLit) * vh,
          outGone: outLit - (f.outLit - f.outGone) * vh,
          shown: old ? old.shown : -1,
        }
      })
      update()
    }

    const update = () => {
      raf = 0
      const focused = document.activeElement
      for (const p of pieces) {
        const rising = clamp01((p.inGone - (p.lead - window.scrollY)) / (p.inGone - p.inLit))
        const leaving = clamp01((p.tail - window.scrollY - p.outGone) / (p.outLit - p.outGone))
        // A block someone is typing in stays lit wherever it stands: the
        // phone's keyboard can push the field high in the window.
        const o =
          focused && focused !== document.body && p.el.contains(focused)
            ? 1
            : Math.round(smooth(Math.min(rising, leaving)) * 100) / 100
        if (o === p.shown) continue
        p.shown = o
        p.el.style.opacity = String(o)
        // Out of sight, out of reach: a dark link or field takes no click.
        p.el.style.pointerEvents = o < 0.05 ? "none" : ""
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.documentElement)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("focusin", onScroll)
    window.addEventListener("focusout", onScroll)
    // The faces change the height of the lines once they have loaded, and
    // with them every edge measured above.
    document.fonts?.ready.then(measure)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("focusin", onScroll)
      window.removeEventListener("focusout", onScroll)
      if (raf) cancelAnimationFrame(raf)
      for (const p of pieces) {
        p.el.style.opacity = ""
        p.el.style.pointerEvents = ""
      }
    }
  }, [selector])

  return null
}
