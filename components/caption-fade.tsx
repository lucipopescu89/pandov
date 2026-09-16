"use client"

import { useEffect, useRef } from "react"

/**
 * Captions fade in as they come up to the middle of the window and out as they
 * carry on past it, so only the words beside the pendant in view are lit and
 * the page reads as one sculpture at a time.
 *
 * Every caption on the page is set inside its artwork's SVG, as <text>, and a
 * single caption is split across several of them — the grey words and the
 * white name are separate elements, set line into line. Those are gathered
 * back together first, so a caption fades as one.
 *
 * The fade follows the scroll rather than playing on a timer: where a caption
 * sits in the window is how lit it is. Positions are measured on mount and on
 * resize, so a scroll only sets opacities.
 */

/**
 * Where a caption's middle stands in the window, as a share of its height from
 * the top. A caption is lit only about the middle of the window: rising from
 * the bottom it is out until `IN_GONE` and fully lit by `IN_LIT`; carrying on up
 * past the middle it starts to go at `OUT_LIT` and is gone by `OUT_GONE`.
 */
const IN_GONE = 0.72
const IN_LIT = 0.56
const OUT_LIT = 0.44
const OUT_GONE = 0.28

/**
 * Text elements of one artwork closer than this, in the artwork's own units,
 * are one caption. Lines are set 13 apart; the captions of an artwork sit
 * hundreds apart.
 */
const GATHER = 40

type Caption = {
  els: SVGTextElement[]
  /** The caption's middle, from the top of the document. */
  middle: number
  /** Window positions, in px: fully out at `inGone` and `outGone`, lit between `inLit` and `outLit`. */
  inGone: number
  inLit: number
  outLit: number
  outGone: number
  opacity: number
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smooth = (t: number) => t * t * (3 - 2 * t)

type Props = {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export function CaptionFade({ className, style, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    let captions: Caption[] = []
    let raf = 0

    const gather = () => {
      const found: { els: SVGTextElement[]; top: number; bottom: number }[] = []
      for (const svg of wrap.querySelectorAll("svg")) {
        const texts = [...svg.querySelectorAll("text")]
        if (texts.length === 0) continue
        const boxWidth = svg.viewBox.baseVal?.width
        const unit = boxWidth ? svg.getBoundingClientRect().width / boxWidth : 1
        const boxes = texts
          .map((el) => {
            const r = el.getBoundingClientRect()
            return { els: [el], top: r.top, bottom: r.bottom }
          })
          .sort((a, b) => a.top - b.top)
        let open = boxes[0]
        found.push(open)
        for (const box of boxes.slice(1)) {
          if (box.top - open.bottom < GATHER * unit) {
            open.els.push(...box.els)
            open.bottom = Math.max(open.bottom, box.bottom)
          } else {
            open = box
            found.push(open)
          }
        }
      }
      return found
    }

    const measure = () => {
      const vh = window.innerHeight
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - vh
      const previous = new Map(captions.flatMap((c) => c.els.map((el) => [el, c.opacity])))
      captions = gather().map(({ els, top, bottom }) => {
        const middle = (top + bottom) / 2 + scrollY
        // A caption already in the window at the top of the page stays lit
        // until the page moves, and one still low in it at the very bottom is
        // lit by the time the page can go no further.
        const outLit = Math.min(OUT_LIT * vh, middle)
        const inLit = Math.max(IN_LIT * vh, middle - maxScroll)
        return {
          els,
          middle,
          inLit,
          inGone: inLit + (IN_GONE - IN_LIT) * vh,
          outLit,
          outGone: outLit - (OUT_LIT - OUT_GONE) * vh,
          opacity: previous.get(els[0]) ?? 1,
        }
      })
      update()
    }

    const update = () => {
      raf = 0
      const scrollY = window.scrollY
      for (const c of captions) {
        const at = c.middle - scrollY
        const rising = clamp01((c.inGone - at) / (c.inGone - c.inLit))
        const leaving = clamp01((at - c.outGone) / (c.outLit - c.outGone))
        const opacity = Math.round(smooth(Math.min(rising, leaving)) * 100) / 100
        if (opacity === c.opacity) continue
        c.opacity = opacity
        for (const el of c.els) el.style.opacity = String(opacity)
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(wrap)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", onScroll, { passive: true })
    // The caption face changes the size of every line once it has loaded.
    document.fonts?.ready.then(measure)

    return () => {
      resize.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
      for (const c of captions) for (const el of c.els) el.style.opacity = ""
      captions = []
    }
  }, [])

  return (
    <div ref={wrapRef} className={className} style={style}>
      {children}
    </div>
  )
}
