"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { clamp01, smooth, words as wordsAt, ARRIVE, ARRIVE_GLIDE_VW, arriveOpacity, arriveLeft } from "@/lib/making-rhythm"

/**
 * The scan on /making: the burnt log end with the white figure in its hollow,
 * as two pictures made to the same size and place, one over the other, either
 * side of a line the visitor moves (before and after: left of it the
 * photograph, right of it the scan with its mesh drawn).
 *
 * Rebuilt on 2026-11-19 (the author's asking, with a screenshot), in the
 * page's one rhythm (`lib/making-rhythm.ts`):
 *
 *  - **The author's new crop** (the pictures were too long): "Scaning Edges_
 *    alb" (the mesh drawn light) and the photograph cut to its frame
 *    (`scripts/making-scan.py`), 3168 × 3352.
 *  - **On the page's dark**: the picture stands on the left in the found
 *    wood's frame (`--h1` tall, in the window's middle), as a white panel
 *    (`PANEL`, its own white ground), and the dark goes on to its right, where
 *    the words are. The picture is larger than its panel (`SCAN_W`, cut on the
 *    left at `SCAN_LEFT`, as in the screenshot) and travels down through it
 *    once it has come (`PAN`), as the found wood does.
 *  - **It comes in from the left, out of transparency** (`ARRIVE`, gliding
 *    `ARRIVE_GLIDE_VW`); it begins under the turning piece's end (a negative
 *    margin, its grounds transparent), so the one comes as the other goes.
 *  - **The line has inertia**: once the picture has stopped, the line goes on a
 *    little to the right by itself (`INERTIA` of the picture's width) and
 *    comes to rest, slowing (`INERTIA_MS`), as if it had been carried in with
 *    the picture. Scrolled back, it goes back. Once a hand has moved it, it
 *    stays where it was put. (Until that day it swayed with the scroll.) It is
 *    moved by dragging the line (on a phone only the line, so the picture
 *    still scrolls the page), by a press anywhere on the picture with a mouse,
 *    or by the arrow keys once it has the focus.
 *  - **Its words** come once it has come and go before it goes (`WORDS`), by
 *    opacity, as all the words on the page; on airy lines, the author's.
 *  - **Then the white**: a veil of white comes over it all (`VEIL`), into
 *    which the picture's own white goes, and the page is white from there to
 *    its foot.
 *
 * Both pictures carry the same `srcset` and `sizes`, so the browser takes the
 * same width of both and they meet exactly.
 */

/** The pictures' height / width (printed by the script). */
const SCAN_RATIO = 1.0581
const WIDTHS = [1100, 1600, 2000] as const
/** Bump with a new export, so browsers fetch the new pictures. */
const VERSION = 2
/** The screenshot's layout (1464 wide, the frame the window's height), in vw. */
const PANEL = "46.45vw"
const SCAN_W = "62.3vw"
const SCAN_LEFT = "-9.2vw"
const WORDS_LEFT = "51.37vw"
/** The words' top, as a share of the frame from its top. */
const WORDS_TOP = 0.16
/** A phone: the picture covers the frame, the full width, and the words stand on its white foot. */
const PHONE = "(max-width: 767px)"

/** In windows of scroll since its window was held. */
const PAN = [0.75, 2.1] as const
const WORDS = [0.6, 1.9] as const
const VEIL = [2.1, 2.5] as const
/** How long it is held, windows: the section is this many windows taller than the window. */
const HELD = 2.5

/** Where the line stands as it comes in, a share of the picture's width (the trunk runs 0.20 … 0.75, the figure 0.42 … 0.62). */
const LINE_AT = 0.5
/** How far it goes on by itself once the picture has stopped, and how slowly it comes to rest (ms, its time constant). */
const INERTIA = 0.06
const INERTIA_MS = 420
/** It keeps this far, px, inside what is seen of the picture. */
const LINE_INSET = 14
/** An arrow key moves it this share of the picture's width. */
const KEY_STEP = 0.025

const CSS = `
.mk-scan{--vh:100vh;--vh:100svh;--scan-w:${SCAN_W};--scan-h:calc(var(--scan-w) * ${SCAN_RATIO});
  position:relative;z-index:3;margin-top:calc(-1 * var(--vh));height:calc(var(--vh) * ${1 + HELD});background:transparent}
.mk-scan-win{position:sticky;top:0;height:var(--vh);overflow:hidden;-webkit-user-select:none;user-select:none}
.mk-scan-frame{position:absolute;left:0;top:var(--t1);height:var(--h1);width:${PANEL};overflow:hidden;background:#fff;
  opacity:0;transform:translateX(-${ARRIVE_GLIDE_VW}vw);will-change:opacity,transform}
.mk-scan-x{position:absolute;top:0;bottom:0;left:${SCAN_LEFT};width:var(--scan-w)}
.mk-scan-img{position:absolute;left:0;top:0;width:100%;height:var(--scan-h);will-change:transform}
.mk-scan-img img{position:absolute;inset:0;display:block;width:100%;height:100%;-webkit-user-drag:none}
.mk-scan-after{clip-path:inset(0 0 0 ${LINE_AT * 100}%)}
/* The line: a wide band to take a finger, a hair of a line in it, and the two
   arrows at the frame's middle. White, in difference with what is under it,
   so it reads dark on the white and light on the burnt wood. */
.mk-scan-line{position:absolute;top:0;bottom:0;left:0;width:44px;margin-left:-22px;cursor:ew-resize;touch-action:pan-y;
  mix-blend-mode:difference;outline:none;will-change:transform}
.mk-scan-line::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;margin-left:-.5px;background:rgba(255,255,255,.8)}
.mk-scan-line svg{position:absolute;top:50%;left:50%;width:32px;height:12px;margin:-6px 0 0 -16px;overflow:visible}
.mk-scan-line:focus-visible::before{width:2px;margin-left:-1px}
.mk-scan-words{position:absolute;z-index:2;left:${WORDS_LEFT};top:calc(var(--t1) + var(--h1) * ${WORDS_TOP});margin:0;line-height:3;opacity:0}
.mk-scan-words>span{display:block;white-space:nowrap}
@media (max-width:1299px){.mk-scan-words{max-width:calc(100vw - ${WORDS_LEFT} - 5vw)}.mk-scan-words>span{white-space:normal;line-height:2;margin-bottom:1em}}
.mk-scan-veil{position:absolute;inset:0;z-index:5;background:#fff;opacity:0;pointer-events:none}
/* A phone (2026-11-19, the author's asking: the words not over the picture): the words above, on the dark, and the
   picture under them, the screen's width, a little shorter than the frame. */
/* And, to try (later that day): not held on a phone; it goes up with the page, the words above the picture, and the
   white comes after it (the sketches' passage). */
/* The page flowing on a computer (.mk-flow, 2026-11-19): not held; the same composition in a window of its own,
   the frame's height and some room, going up with the page; the white comes behind it (.mk-bg-veil). */
@media (min-width:768px){
  /* Later the same day (the author's asking: "it moves up in its frame as well, I don't like it"): as on a phone, the
     picture its whole height, going up with the page and nothing more, coming in out of transparency from below;
     cut close to the wood's edges (0.18 … 0.77 of the picture's width, the trunk running 0.20 … 0.75) so it shows
     larger, half the window's width, never drawn wider than the largest file (2000px), so it never blurs. */
  /* It begins to come up as the turning piece above fades out (a negative margin, 2026-11-19, the author's asking:
     too many scrolls between them). */
  .mk-flow .mk-scan{--scan-w:min(85vw, 2000px);height:auto;margin-top:calc(-0.45 * var(--vh))}
  .mk-flow .mk-scan-win{position:relative;height:auto;padding:12vh 0 8vh}
  .mk-flow .mk-scan-frame{position:relative;top:auto;height:var(--scan-h);width:calc(var(--scan-w) * .59)}
  .mk-flow .mk-scan-x{left:calc(var(--scan-w) * -.18)}
  .mk-flow .mk-scan-words{top:calc(12vh + var(--scan-h) * .08);left:calc(var(--scan-w) * .59 + 5vw);max-width:none}
  .mk-flow .mk-scan-veil{display:none}
}
@media (max-width:767px){
  /* Larger than the screen (the author's asking: bigger rather than whole), cut on both sides round the figure
     (0.52 of the picture's width), and going down through its frame as the page goes; room above and under the words. */
  /* It begins under the turning piece's last half window, so its words come as the piece fades (no empty dark). */
  .mk-scan{--scan-frame-h:calc(var(--vh) * .64);--scan-w:165vw;height:auto;margin-top:calc(-0.45 * var(--vh))}
  .mk-scan-win{position:relative;height:auto;padding:10vh 0 4vh;overflow:hidden;display:flex;flex-direction:column}
  .mk-scan-words{order:-1}
  /* Its whole height, not cut into a frame (2026-11-19, the author's asking: "leave it free"); so it does not pan. */
  .mk-scan-frame{position:relative;width:100vw;top:auto;height:var(--scan-h)}
  .mk-scan-x{left:calc(50vw - var(--scan-w) * .52)}
  /* .mk-scan .mk-scan-words, not .mk-scan-words: the page's .mk p{margin:0} outranked it, and the room under the
     words never came (2026-11-19). */
  .mk-scan .mk-scan-words{position:relative;left:auto;top:auto;margin:0 8vw clamp(48px, 9vh, 80px);max-width:84vw}
  .mk-scan-words>span{white-space:normal;line-height:2;margin-bottom:.6em}
  .mk-scan-veil{display:none}
}
`

export function MakingScan({ words, color }: { words: ReactNode; color: string }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const frameEl = section.querySelector<HTMLElement>(".mk-scan-frame")
    const x = section.querySelector<HTMLElement>(".mk-scan-x")
    const box = section.querySelector<HTMLElement>(".mk-scan-img")
    const after = section.querySelector<HTMLElement>(".mk-scan-after")
    const line = section.querySelector<HTMLElement>(".mk-scan-line")
    const wordsEl = section.querySelector<HTMLElement>(".mk-scan-words")
    const veil = section.querySelector<HTMLElement>(".mk-scan-veil")
    if (!frameEl || !x || !box || !after || !line) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const flowing = !!section.closest(".mk-flow")

    let frameH = 0
    let frameW = 0
    let boxW = 0
    let boxH = 0
    let boxLeft = 0 // the picture's left edge in its frame, px
    const measure = () => {
      frameH = frameEl.offsetHeight
      frameW = frameEl.offsetWidth
      boxW = x.offsetWidth
      boxH = box.offsetHeight
      boxLeft = x.offsetLeft
    }

    // What was last written, so a scroll that changes nothing writes nothing.
    const written: Record<string, string> = {}
    const style = (el: HTMLElement, key: string, prop: string, value: string) => {
      if (written[key] === value) return
      written[key] = value
      el.style.setProperty(prop, value)
    }

    // ── The line ──
    let at = LINE_AT // where it stands, a share of the picture's width
    let goal = LINE_AT // where it is going (by itself, until a hand moves it)
    let moved = false
    let shownAt = -1
    const place = () => {
      // inside what is seen of the picture
      const lo = Math.max(0, -boxLeft) + LINE_INSET
      const hi = Math.min(boxW, frameW - boxLeft) - LINE_INSET
      const px = Math.min(hi, Math.max(lo, at * boxW))
      if (Math.abs(px - shownAt) < 0.05) return
      shownAt = px
      line.style.transform = `translate3d(${px.toFixed(1)}px, 0, 0)`
      after.style.clipPath = `inset(0 0 0 ${px.toFixed(1)}px)`
      line.setAttribute("aria-valuenow", String(Math.round((px / Math.max(1, boxW)) * 100)))
    }
    // Its inertia: it goes on to `goal` by itself, slowing as it comes.
    let glide = 0
    let prevT = 0
    const coast = (t: number) => {
      glide = 0
      const dt = prevT ? Math.min(64, t - prevT) : 16
      prevT = t
      at += (goal - at) * (1 - Math.exp(-dt / INERTIA_MS))
      if (Math.abs(goal - at) < 0.0005) at = goal
      place()
      if (at !== goal) glide = requestAnimationFrame(coast)
    }
    const coastTo = (g: number) => {
      if (moved || g === goal) return
      goal = g
      if (still) {
        at = goal
        place()
        return
      }
      if (!glide) {
        prevT = 0
        glide = requestAnimationFrame(coast)
      }
    }
    const moveTo = (clientX: number) => {
      const r = x.getBoundingClientRect()
      at = goal = (clientX - r.left) / Math.max(1, r.width)
      moved = true
      if (glide) cancelAnimationFrame(glide)
      glide = 0
      place()
    }

    // ── The scroll ──
    let raf = 0
    const frame = () => {
      raf = 0
      const vh = window.innerHeight
      const r = section.getBoundingClientRect()
      const phoneNow = window.matchMedia(PHONE).matches
      if (phoneNow || flowing) {
        // Not held (a phone; a computer while the page flows): read off how
        // far it has come through the window.
        const p = clamp01((vh - r.top) / Math.max(1, vh + r.height))
        const e = clamp01((p - 0.1) / 0.22)
        style(frameEl, "o", "opacity", arriveOpacity(e).toFixed(3))
        // A phone glides in from the left; a computer only comes up from below (the author's asking).
        style(frameEl, "x", "transform", phoneNow ? `translateX(${(-ARRIVE_GLIDE_VW * arriveLeft(e)).toFixed(3)}vw)` : "none")
        coastTo(e >= 1 ? LINE_AT + INERTIA : LINE_AT)
        const Dp = Math.max(0, boxH - frameH)
        style(box, "p", "transform", `translate3d(0, ${(-Dp * smooth((p - 0.2) / 0.6)).toFixed(1)}px, 0)`)
        // Its words go as the page goes white behind it (`.mk-bg-veil`).
        const wIn = phoneNow ? 0.05 : 0.1
        if (wordsEl) style(wordsEl, "w", "opacity", (smooth((p - wIn) / 0.13) * (1 - smooth((p - 0.4) / 0.13))).toFixed(3))
        if (r.top < vh && r.bottom > 0) place()
        return
      }
      const y = -r.top / vh // windows since its window was held
      const enter = clamp01(y / ARRIVE)
      // From the left, out of transparency.
      style(frameEl, "o", "opacity", arriveOpacity(enter).toFixed(3))
      style(frameEl, "x", "transform", `translateX(${(-ARRIVE_GLIDE_VW * arriveLeft(enter)).toFixed(3)}vw)`)
      // Once it has stopped, the line goes on a little by itself.
      coastTo(enter >= 1 ? LINE_AT + INERTIA : LINE_AT)
      // Down through its frame, eased from rest and back to it.
      const D = Math.max(0, boxH - frameH)
      const p = smooth((y - PAN[0]) / (PAN[1] - PAN[0])) * D
      style(box, "p", "transform", `translate3d(0, ${(-p).toFixed(1)}px, 0)`)
      if (wordsEl) style(wordsEl, "w", "opacity", wordsAt(y, WORDS[0], WORDS[1]).toFixed(3))
      if (veil) style(veil, "v", "opacity", smooth((y - VEIL[0]) / (VEIL[1] - VEIL[0])).toFixed(3))
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
      at = goal = Math.min(1, Math.max(0, (shownAt >= 0 ? shownAt / Math.max(1, boxW) : at) + d * KEY_STEP))
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
    // The pictures may come after the first measure: measure again when they do.
    const imgs = Array.from(box.querySelectorAll("img"))
    imgs.forEach((im) => im.addEventListener("load", onResize))
    return () => {
      window.removeEventListener("scroll", kick)
      window.removeEventListener("resize", onResize)
      x.removeEventListener("pointerdown", onDown)
      x.removeEventListener("pointermove", onMove)
      x.removeEventListener("pointerup", onUp)
      x.removeEventListener("pointercancel", onUp)
      x.removeEventListener("click", onClick)
      line.removeEventListener("keydown", onKey)
      imgs.forEach((im) => im.removeEventListener("load", onResize))
      if (raf) cancelAnimationFrame(raf)
      if (glide) cancelAnimationFrame(glide)
    }
  }, [])

  const set = (name: string) => WIDTHS.map((w) => `/images/making/scan-${name}-${w}.avif?v=${VERSION} ${w}w`).join(", ")
  const sizes = `(max-width: 767px) 165vw, min(85vw, 2000px)`
  return (
    <section ref={sectionRef} className="mk-scan" data-mk="scan">
      <style>{CSS}</style>
      <div className="mk-scan-win">
        <div className="mk-scan-frame">
          <div className="mk-scan-x">
            <div className="mk-scan-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/making/scan-original-${WIDTHS[1]}.avif?v=${VERSION}`}
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
                src={`/images/making/scan-edges-${WIDTHS[1]}.avif?v=${VERSION}`}
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
        </div>
        <p className="mk-scan-words" style={{ color }}>
          {words}
        </p>
        <div className="mk-scan-veil" aria-hidden="true" />
      </div>
    </section>
  )
}
