"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * The scan on /making (2026-11-17, the author's brief, in place of the 3D
 * model): the burnt log end with the white figure in its hollow, as two
 * pictures made to the same size and place in Photoshop, one over the other.
 *
 *  - **Before and after, either side of a line** (the author's second brief
 *    the same afternoon, over the waves of the first: "a vertical line with two
 *    small arrows, left and right, that can be moved to show the scanned against
 *    the original, as is often done in the digital field"): left of the line the
 *    photograph ("Scaning original", the burnt wood's texture), right of it the
 *    scan ("Scaning Edges", the same rendered from the 3D scan with its mesh
 *    drawn). The line runs the window's height; its two arrows stand at the
 *    window's middle, held there as the words are, while the picture goes by.
 *    It stands towards the words (`LINE_AT`, a share of the picture's width) so
 *    it is seen, and sways a little left and right as the page is scrolled
 *    (`SWAY`, one way and back every `SWAY_EVERY` of a screen), to invite a
 *    hand; once moved it stays where it was put. It is moved by dragging the
 *    line (on a phone only the line, so the picture still scrolls the page),
 *    by a press anywhere on the picture with a mouse, or by the arrow keys once
 *    it has the focus.
 *  - **It is large, for the wood's detail**, on the left of the screen
 *    (`--scan-w`, its right edge at `RIGHT`); on a narrower screen it keeps its
 *    size and is cut on the left. On a phone it is wider than the screen,
 *    cut on both sides round the figure.
 *  - **It moves faster than the page**, being long: held in a window the
 *    height of the screen (`position: sticky`), it goes through it at
 *    `SPEED` times the page's pace on average, eased from and back to the
 *    page's own pace where it comes and goes, so it never jumps.
 *
 * The pictures are written by `scripts/making-scan.py` (their grey ground
 * made the page's white, cropped to the trunk, the foot faded into white,
 * AVIF at three widths). Both carry the same `srcset` and `sizes`, so the
 * browser takes the same width of both and they meet exactly.
 */

/** The pictures' height / width (printed by the script). */
const SCAN_RATIO = 2.0729
/** The files' widths. */
const WIDTHS = [1100, 1600, 2000] as const
/** The picture's width on a computer, and where its right edge stands (the words begin at 58.8vw). */
const SCAN_W = "clamp(1000px, 58vw, 1400px)"
const RIGHT = "56vw"
/** On a phone: its width, and how far it stands off the screen's left. */
const PHONE_W = "150vw"
const PHONE_LEFT = "-40vw"
/** Its average pace through the window, as a share of the page's. */
const SPEED = 1.6

/** Where the line stands at first, as a share of the picture's width (the trunk runs 0.07 … 0.93; the figure 0.39 … 0.59). */
const LINE_AT = 0.74
/** Its sway with the scroll, until it is moved: as a share of the picture's width, and one way and back every this many screens scrolled. */
const SWAY = 0.035
const SWAY_EVERY = 0.9
/** It keeps this far, px, inside what is seen of the picture. */
const LINE_INSET = 14
/** An arrow key moves it this share of the picture's width. */
const KEY_STEP = 0.025

const FRAME_W = 1920
const vw = (px: number) => `${+((px / FRAME_W) * 100).toFixed(3)}vw`

const CSS = `
.mk-scan{--vh:100vh;--vh:100svh;--scan-w:${SCAN_W};--scan-h:calc(var(--scan-w) * ${SCAN_RATIO});
  position:relative;background:#fff;height:calc(var(--vh) + max(0px, (var(--scan-h) - var(--vh)) / ${SPEED}))}
.mk-scan-win{position:sticky;top:0;height:var(--vh);overflow:hidden;-webkit-user-select:none;user-select:none}
.mk-scan-x{position:absolute;top:0;bottom:0;left:calc(${RIGHT} - var(--scan-w));width:var(--scan-w)}
.mk-scan-img{position:absolute;left:0;top:0;width:100%;height:var(--scan-h);will-change:transform}
.mk-scan-img img{position:absolute;inset:0;display:block;width:100%;height:100%;-webkit-user-drag:none}
.mk-scan-after{clip-path:inset(0 0 0 ${LINE_AT * 100}%)}
/* The line: a wide band to take a finger, a hair of a line in it, and the two
   arrows at the window's middle. White, in difference with what is under it,
   so it reads dark on the white and light on the burnt wood. */
.mk-scan-line{position:absolute;top:0;bottom:0;left:0;width:44px;margin-left:-22px;cursor:ew-resize;touch-action:pan-y;
  mix-blend-mode:difference;outline:none;will-change:transform}
.mk-scan-line::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;margin-left:-.5px;background:rgba(255,255,255,.8)}
.mk-scan-line svg{position:absolute;top:50%;left:50%;width:32px;height:12px;margin:-6px 0 0 -16px;overflow:visible}
.mk-scan-line:focus-visible::before{width:2px;margin-left:-1px}
.mk-scan-words{position:absolute;z-index:2;left:${vw(1129)};top:50%;max-width:${vw(470)};transform:translateY(-50%);opacity:0}
/* On a phone the words come after the passage, on white of their own: inside it the held window would cover them. */
.mk-scan-words-p{display:none;background:#fff;padding:6vw 8vw 16vw}
@media (max-width:767px){
  .mk-scan{--scan-w:${PHONE_W}}
  .mk-scan-x{left:${PHONE_LEFT}}
  .mk-scan-words{display:none}
  .mk-scan-words-p{display:block}
}
`

const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
const smooth = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

export function MakingScan({ words, color }: { words: ReactNode; color: string }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const win = section.querySelector<HTMLElement>(".mk-scan-win")
    const x = section.querySelector<HTMLElement>(".mk-scan-x")
    const box = section.querySelector<HTMLElement>(".mk-scan-img")
    const after = section.querySelector<HTMLElement>(".mk-scan-after")
    const line = section.querySelector<HTMLElement>(".mk-scan-line")
    const wordsEl = section.querySelector<HTMLElement>(".mk-scan-words")
    if (!win || !x || !box || !after || !line) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let winH = 0
    let winW = 0
    let boxW = 0
    let boxH = 0
    let boxLeft = 0 // the picture's left edge in its window, px
    const measure = () => {
      winH = win.offsetHeight
      winW = win.offsetWidth
      boxW = x.offsetWidth
      boxH = box.offsetHeight
      boxLeft = x.offsetLeft
    }

    // ── The line ──
    let at = LINE_AT // where it was put, a share of the picture's width
    let moved = false // once moved by a hand it no longer sways
    let shownAt = -1
    const place = () => {
      const sway = moved || still ? 0 : SWAY * Math.sin((2 * Math.PI * window.scrollY) / (SWAY_EVERY * window.innerHeight))
      // inside what is seen of the picture
      const lo = Math.max(0, -boxLeft) + LINE_INSET
      const hi = Math.min(boxW, winW - boxLeft) - LINE_INSET
      const px = Math.min(hi, Math.max(lo, (at + sway) * boxW))
      if (Math.abs(px - shownAt) < 0.05) return
      shownAt = px
      line.style.transform = `translate3d(${px.toFixed(1)}px, 0, 0)`
      after.style.clipPath = `inset(0 0 0 ${px.toFixed(1)}px)`
      line.setAttribute("aria-valuenow", String(Math.round((px / boxW) * 100)))
    }
    const moveTo = (clientX: number) => {
      const r = x.getBoundingClientRect()
      at = (clientX - r.left) / Math.max(1, r.width)
      moved = true
      place()
    }

    // ── The scroll ──
    let raf = 0
    const frame = () => {
      raf = 0
      const vh = window.innerHeight
      const r = section.getBoundingClientRect()
      const s = -r.top // how far the page has gone into the passage
      const H = r.height - winH // how far it is held
      const D = boxH - winH // how far the picture goes through its window
      // eased from and back to the page's pace (a cubic whose slope is 1 at
      // both ends, `SPEED` on average), so it moves faster in the middle
      let p = 0
      if (D > 0 && H > 0) {
        if (s >= H) p = D
        else if (s > 0) {
          const t = s / H
          p = H * (t - 2 * t * t + t * t * t) + D * (3 * t * t - 2 * t * t * t) + H * (t * t * t - t * t)
        }
      }
      box.style.transform = `translate3d(0, ${(-p).toFixed(1)}px, 0)`
      if (wordsEl) {
        const o = smooth((s + 0.35 * vh) / (0.35 * vh)) * (1 - smooth((s - H) / (0.35 * vh)))
        wordsEl.style.opacity = o.toFixed(3)
      }
      if (r.top < vh && r.bottom > 0) place()
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const onResize = () => {
      measure()
      shownAt = -1
      kick()
    }

    // ── A hand on it ──
    let dragging = -1
    const onDown = (e: PointerEvent) => {
      const onLine = e.target instanceof Node && line.contains(e.target)
      // a finger moves it only from the line, so the picture still scrolls the page
      if (!onLine && e.pointerType !== "mouse") return
      if (e.pointerType === "mouse" && e.button !== 0) return
      dragging = e.pointerId
      x.setPointerCapture(e.pointerId)
      moveTo(e.clientX)
      e.preventDefault()
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === dragging) moveTo(e.clientX)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return
      dragging = -1
      if (x.hasPointerCapture(e.pointerId)) x.releasePointerCapture(e.pointerId)
    }
    // a tap on the picture puts the line there
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && line.contains(e.target)) return
      moveTo(e.clientX)
    }
    const onKey = (e: KeyboardEvent) => {
      const d = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0
      if (!d) return
      e.preventDefault()
      at = Math.min(1, Math.max(0, (shownAt >= 0 ? shownAt / boxW : at) + d * KEY_STEP))
      moved = true
      place()
    }

    measure()
    kick()
    window.addEventListener("scroll", kick, { passive: true })
    window.addEventListener("resize", onResize)
    x.addEventListener("pointerdown", onDown)
    x.addEventListener("pointermove", onMove)
    x.addEventListener("pointerup", onUp)
    x.addEventListener("pointercancel", onUp)
    x.addEventListener("click", onClick)
    line.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("scroll", kick)
      window.removeEventListener("resize", onResize)
      x.removeEventListener("pointerdown", onDown)
      x.removeEventListener("pointermove", onMove)
      x.removeEventListener("pointerup", onUp)
      x.removeEventListener("pointercancel", onUp)
      x.removeEventListener("click", onClick)
      line.removeEventListener("keydown", onKey)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const set = (name: string) => WIDTHS.map((w) => `/images/making/scan-${name}-${w}.avif ${w}w`).join(", ")
  /*
   * `sizes` tells a phone 120vw though the picture is 150vw wide there: so a
   * phone takes the 1600 files (about 900KB the two) and not the 2000
   * (1.35MB), a difference no one sees at that size.
   */
  const sizes = "(max-width: 767px) 120vw, (max-width: 1724px) 1000px, (max-width: 2413px) 58vw, 1400px"
  return (
    <>
      <section ref={sectionRef} className="mk-scan" data-mk="scan">
        <style>{CSS}</style>
        <div className="mk-scan-win">
          <div className="mk-scan-x">
            <div className="mk-scan-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/making/scan-original-${WIDTHS[1]}.avif`}
                srcSet={set("original")}
                sizes={sizes}
                alt="The burnt log end with the white figure standing in its hollow, photographed"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="mk-scan-after"
                src={`/images/making/scan-edges-${WIDTHS[1]}.avif`}
                srcSet={set("edges")}
                sizes={sizes}
                alt="The same, from its 3D scan, the mesh drawn"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
            <div
              className="mk-scan-line"
              role="slider"
              tabIndex={0}
              aria-label="Photograph and 3D scan: move the line"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(LINE_AT * 100)}
              style={{ transform: `translate3d(calc(var(--scan-w) * ${LINE_AT}), 0, 0)` }}
            >
              <svg viewBox="0 0 32 12" aria-hidden="true" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1">
                <path d="M8 1 3 6l5 5M24 1l5 5-5 5" />
              </svg>
            </div>
          </div>
          <p className="mk-scan-words" style={{ color }}>
            {words}
          </p>
        </div>
      </section>
      <div className="mk-scan-words-p">
        <p style={{ color }}>{words}</p>
      </div>
    </>
  )
}
