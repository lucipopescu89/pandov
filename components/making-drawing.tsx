"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { FROM_EYE_KEY, RETURN_KEY } from "@/lib/seen-key"
import { still } from "@/lib/still"

/**
 * The Making section's line drawings, drawn as if by hand (2026-11-05, the
 * author's brief; the composition re-exported 2026-11-14 and 2026-11-17).
 *
 * Since 2026-11-17 (the author's ten-point brief, with the frame re-exported
 * as Making_Homepage.svg):
 *
 *  - **A click no longer breathes the drawing out.** Until then a click
 *    anywhere on the section faded what was drawn and breathed every line out
 *    at once (the creators' pens filled first), held the whole drawing five
 *    seconds and erased it. Now a click there plays the gold motes up the
 *    trunk (`public/pandov-grain.js`), the sun's storm
 *    (`components/making-sun.tsx`) and the sea's big wave
 *    (`components/making-sea.tsx`); of the drawing only SILUET answers it
 *    (2026-11-17, later, the author's asking): its lines are drawn whole
 *    (`SILUET_DRAW_SPEED`), stay so a few seconds (`SILUET_HOLD_MS`; another
 *    click keeps them longer) and are erased the way they came, and the
 *    travelling strokes take them up again. The eye keeps its own click.
 *  - **The lines are never whole.** While the section is on screen, a stroke
 *    two thirds of a line's length (`LOOP_SEGMENT`) glides slowly along one
 *    line after another, at random: it comes in at the line's start, glides
 *    its whole length (`LOOP_SPEED`) and goes out at its end, so nothing of
 *    the line is left behind. A new one starts every `LOOP_EVERY_MS`, never
 *    more than `LOOP_MAX` at once, and never on a line already in play; more
 *    run down the upper halves of the figures (`UPPER_*`, 2026-11-10).
 *  - **CREATOR2, the trumpet player, and its three melodies are gone**
 *    (2026-11-17, evening, the author's asking; `scripts/making-drawing.py`
 *    skips them now). They had a window of their own in the scroll, and a
 *    stroke down all three melodies on the click.
 *  - **Scrolling down hurries SILUET** (the same day, later, the author's
 *    asking): while the page goes down its strokes run `HURRY_RATE` times as
 *    fast, easing back after (`HURRY_MS`, `HURRY_EASE_S`), and a scroll down
 *    starts a stroke on one of its lines that is free.
 *  - Of CREATOR1 only the head stands fixed; it still draws its four lines
 *    as a plotter (`PLOT_SPEED`), the paper running under its pen.
 *  - **The figures go as the reader goes on down** (`FADE_*`): once the words'
 *    middle is up past the middle of the screen, every figure fades with the
 *    scroll, gone when the words are near the top; scrolling back brings them
 *    back. The eye in the dark wood stays. The figures are the file's
 *    `mk-figures` group (a file without one has its figures gathered into
 *    one here). Only the computer's words carry `data-mk-words`: on a phone
 *    the words stand over the picture, not on it, and nothing fades there;
 *    the figures stay.
 *
 * The eye in the dark wood opens and shuts (2026-11-05, the author's asking).
 * It is shut at first; as the reader scrolls down and it comes up past
 * `EYE_OPEN_AT` of the screen it opens, its upper lid rising off the lower
 * one (`EYE_OPEN_MS`); once it is below the screen again it shuts, unseen,
 * to open anew on the next way down. The upper lid and the author's #202020
 * shape over the eyeball are polygons whose points are eased between their
 * shut and open places (data-closed, data-open in the file: see
 * `scripts/making-drawing.py`).
 *
 * The eye also follows the mouse (the author's asking, the same day): the
 * whole eyeball, gold ring and all, within the lids, which cut whatever goes
 * under them (`BALL_LAG_S`; more across than up and down); within it the
 * rhombi, more softly, within the gold ring; and the pupil within the empty
 * middle of the rhombi (the limits are measured by the script and written on
 * the eye's <g>). The nearer the pointer, the less they lean
 * (`LOOK_REACH_PX`); each follows with its own lag (`PUPIL_LAG_S`,
 * `IRIS_LAG_S`), and both go back to the middle when the pointer leaves the
 * page. A touch screen has no pointer to follow, so there it looks ahead.
 *
 * Open, it blinks now and then, at random (`BLINK_EVERY_MS`), sometimes twice
 * (`BLINK_TWICE`): quick down, a little slower up, as an eye does. A click
 * on the eye blinks it and takes the reader to /seen, the hidden page of
 * every photograph on the site at once (2026-11-08, the author's asking); that
 * click is the eye's alone, so it plays neither the motes' wave nor the sun.
 *
 * Since 2026-11-17 the eye is the author's flipped and smaller one, and far
 * fainter, for the attentive only: at the strength the author gave it in Figma
 * (`data-rest` on the eye's <g>, 20%; `EYE_REST` where the file has none), and
 * under the pointer it comes up slowly to `EYE_HOVER`.
 *
 * How a line is drawn: the lines are Figma's outlined strokes, so each is
 * revealed through a mask holding its centre line, whose `stroke-dashoffset`
 * moves the stroke along it (pathLength 1). All of it is prepared in the file,
 * `public/images/home/making-drawing.svg`, by `scripts/making-drawing.py`: see
 * its header. The file is fetched and set inline, so its groups can be
 * reached; it is 95KB, and inlined by the server it would travel twice (HTML
 * and the RSC payload).
 *
 * Under reduced motion every line is shown, drawn, and nothing moves.
 */

/**
 * Bumped whenever the script writes the drawings anew, so no browser keeps an
 * old copy (2026-11-14: the old drawing stayed in the browser after the
 * re-export, even after a reload). Both files are fetched with it.
 */
const SVG_VERSION = "2026-11-17b"
const SRC = `/images/home/making-drawing.svg?v=${SVG_VERSION}`
/**
 * The phone had its own drawing until 2026-11-18 (the author's frame "Making
 * - Mobile" of 2026-11-05, `making-drawing-mobile.svg`, written by the script
 * with `--mobile`); since then it shows the computer's, through its window
 * onto the frame (`P_CROP` in `making-section.tsx`).
 */

/** The travelling stroke's length, as a share of its line's (a third until the author's asking, 2026-11-05). */
const LOOP_SEGMENT = 2 / 3
/**
 * …how fast it goes, frame units a second, and its shortest and longest
 * journey (110, 3s and 12s until 2026-11-14, when the author found the moving
 * lines drew the eye from the words: now far slower).
 */
const LOOP_SPEED = 40
const LOOP_MIN_MS = 8000
const LOOP_MAX_MS = 32000
/** A new line starts this often… */
const LOOP_EVERY_MS = 650
/** …while fewer than this many are in play. */
const LOOP_MAX = 5

/**
 * The upper part of the figures is busier (2026-11-10, the author's asking):
 * besides the strokes above, which go anywhere, more travelling strokes run on
 * the lines that start in the upper half of the figures' height
 * (`UPPER_SHARE`), coming down them from their upper end, so that the figures
 * up there seem to be being drawn. A new one starts every `UPPER_EVERY_MS`
 * while fewer than `UPPER_MAX` are in play there, and scrolling down starts
 * one at once (at most every `UPPER_SCROLL_MS`). Nothing of them stays.
 */
const UPPER_GROUPS = ["siluet-1", "siluet-2", "siluet-3", "creator-1"]
const UPPER_SHARE = 0.5
const UPPER_EVERY_MS = 420
const UPPER_MAX = 5
const UPPER_SCROLL_MS = 260

/**
 * Scrolling down hurries SILUET (2026-11-17, later, the author's asking; the
 * melodies too, while there were any): its strokes run `HURRY_RATE` times as
 * fast while the page goes down, and for `HURRY_MS` after the last step of
 * it, easing in and out over about `HURRY_EASE_S`; a scroll down also starts
 * a stroke on one of its free lines (at most every `UPPER_SCROLL_MS`, while
 * fewer than `HURRY_MAX` of them are in play).
 */
const HURRY_GROUPS = ["siluet-3"]
const HURRY_RATE = 3.5
const HURRY_MS = 380
const HURRY_EASE_S = 0.18
const HURRY_MAX = 6

/**
 * A click draws SILUET whole (2026-11-17, later, the author's asking: "we
 * leave it whole a few seconds after the click"): every line drawn along at
 * `SILUET_DRAW_SPEED` units a second (never quicker than `SILUET_DRAW_MIN_MS`),
 * held `SILUET_HOLD_MS`, then erased the way it came.
 */
const SILUET_GROUP = "siluet-3"
const SILUET_DRAW_SPEED = 420
const SILUET_DRAW_MIN_MS = 700
const SILUET_HOLD_MS = 4000
const EASE_DRAW = "cubic-bezier(.3,0,.2,1)"

/**
 * The figures fade out as the reader goes on down (2026-11-17, the author's
 * asking: "the fade-out begins when the text is about halfway"): from the
 * words' middle at `FADE_FROM` of the screen's height to `FADE_TO`, eased.
 * Below `FADE_FROM` they are whole; the scroll alone sets it, either way.
 * Quicker since the same afternoon (the author's asking): gone over 18% of
 * the screen's height of scrolling, where it took 38% (`FADE_TO` was 0.12).
 */
const FADE_FROM = 0.5
const FADE_TO = 0.32
/**
 * The words go too, once the trumpet player has gone and the sun is out (the
 * author's sixth brief, the same afternoon: "you can take the text out with a
 * fade-out and a movement up"): as their middle goes up from `WORDS_OUT_FROM`
 * to `WORDS_OUT_TO` of the screen's height they fade and rise `WORDS_RISE_PX`
 * over the page's own movement. Sooner and quicker at the author's asking
 * ("make the text disappear faster"): 0.32 → 0.14 at first, 0.4 → 0.3 now,
 * just after the trumpet player has gone at 0.42; and minutes later ("let it
 * disappear together with the trumpet player") with CREATOR2 exactly, on the
 * same window (0.5 → 0.42; CREATOR2 has since gone, the window stays). The
 * box measured stays put (the inner `[data-mk-words-out]` is what moves), so
 * nothing that reads the words' place is moved by it.
 */
const WORDS_OUT_FROM = 0.5
const WORDS_OUT_TO = 0.42
/**
 * The point of the frame the scroll's fades are read off (frame units, y):
 * where the words' middle stood until the same evening, when CREATOR2 was
 * taken off and the words went up under the heading (the author's asking).
 * The figures' fade (`FADE_*`), the words' going (`WORDS_OUT_*`) and the
 * sun's rise (`making-sun.tsx`) are still read off it, so each keeps its
 * time against the picture; read off the words where they stand now, the
 * figures would be gone before the section was on screen. It is the same on
 * every screen (measured: 666.3 at 1280, 1440, 1920 and 2560 wide).
 */
export const WORDS_MARK = 666.3
const WORDS_RISE_PX = 60

/** The eye opens as its middle comes up past this share of the screen… */
const EYE_OPEN_AT = 0.85
/** …over this long, and shuts (out of sight) over this long. */
const EYE_OPEN_MS = 1800
const EYE_SHUT_MS = 500

/** The eye follows the pointer: at this distance (screen px) it leans ~63% of the way… */
const LOOK_REACH_PX = 280
/** …the pupil catching up in about this long, the rhombi more slowly. */
const PUPIL_LAG_S = 0.18
const IRIS_LAG_S = 0.45
const BALL_LAG_S = 0.3

/** A blink: the lid comes down in this long and goes up in this long… */
const BLINK_DOWN_MS = 110
const BLINK_UP_MS = 190
/** …one every so often (a random wait between the two), sometimes twice running. */
const BLINK_EVERY_MS: [number, number] = [2600, 7500]
const BLINK_TWICE = 0.18
/** Where a click on the eye takes the reader, once it has blinked. */
const EYE_HREF = "/seen"
/**
 * The eye's strength (2026-11-17, the author's asking: "much more
 * transparent, visible only to the attentive"): at rest, the file's
 * `data-rest` (the author's 20% in Figma), or this; under the pointer it comes
 * up slowly to `EYE_HOVER`, fading back when the pointer leaves. On a touch
 * screen there is no hover, so it stays at rest there. (2026-11-14 to 17: 30%
 * at rest, 80% under the pointer.)
 */
const EYE_REST = 0.2
const EYE_HOVER = 0.55
const EYE_FADE_IN_MS = 1600
const EYE_FADE_OUT_MS = 1000

/**
 * The upper creator draws as a pen on a plotter (2026-11-14, the author's
 * asking, with the frame re-exported: the long line across the words became
 * four shorter ones). The lines run from right to left as if the paper moved
 * under a still hand, and appear at the pen's point: what the pen has drawn is
 * the part of them that has passed under it. The hand rises and falls with
 * their waves: the arm turns at the shoulder so that the pen's point is always
 * at the line's height there, and the pen turns at the wrist `PLOT_WRIST` as
 * much the other way, so its slant stays steadier than the arm's, as a hand
 * that writes. Where the pen's point then stands across is where the paper is
 * put, so the ink leaves exactly from the point.
 *
 * The paper moves at one speed, `PLOT_SPEED` units a second from right to
 * left, always (the same evening, the author's asking: moved along the line
 * at one speed, it seemed to stop where the line rises steeply); the hand
 * keeps up with it, as fast as the line's waves need, abruptly if it must.
 * Where a line turns back on itself the turn is drawn at once.
 *
 * The way the point goes is in the file (`data-track` on `paper-1`, by
 * `scripts/making-drawing.py`): the four lines from their left ends, one after
 * another, with the pen lifted between them, and back round to the first,
 * which comes again `data-period` units further on. Each line, once drawn,
 * fades out while the next is being drawn, gone when that one is done (the
 * same evening): two at most on the paper, one fading, one coming.
 *
 * (The lower creator's pen, which drew its line down to Siluet2 as a plotter
 * too, became a trumpet on 2026-11-17, and its code went with it; and since
 * then a click no longer hurries the paper.)
 */
const PLOT_SPEED = 30
const PLOT_WRIST = -0.5

const EASE_LOOP = "cubic-bezier(.4,0,.6,1)"

type Stroke = { el: SVGPathElement; len: number }
type Line = { path: SVGPathElement; mask: string; group: string; strokes: Stroke[]; anims: Animation[]; busy: boolean }

function run(host: HTMLElement, svg: SVGSVGElement, go: (href: string) => void): () => void {
  const lines: Line[] = []
  svg.querySelectorAll<SVGPathElement>("path[data-line]").forEach((path) => {
    const mask = path.getAttribute("data-line") || ""
    const m = svg.getElementById(mask)
    if (!m) return
    const strokes = Array.from(m.querySelectorAll<SVGPathElement>("path")).map((el) => ({
      el,
      len: Number(el.getAttribute("data-len")) || 100,
    }))
    const group = path.closest("g[id]")?.id || ""
    lines.push({ path, mask, group, strokes, anims: [], busy: false })
  })

  // Every figure in one group, to fade them together: the computer's file
  // has it (`mk-figures`); the phone's older file does not, so its figures are
  // gathered here, everything but the eye and the definitions.
  let figures = svg.getElementById("mk-figures") as SVGGElement | null
  if (!figures) {
    figures = document.createElementNS("http://www.w3.org/2000/svg", "g")
    figures.id = "mk-figures"
    const eye = svg.getElementById("eye")
    svg.insertBefore(figures, svg.firstChild)
    Array.from(svg.children).forEach((c) => {
      if (c !== figures && c !== eye && c.tagName.toLowerCase() !== "defs") figures!.appendChild(c)
    })
  }

  // The eye: its lid and cover, each a polygon eased from shut (1) to open (0).
  const nums = (v: string | null) => (v || "").trim().split(/\s+/).map(Number)
  const eyeParts = ["eye-lid", "eye-cover"]
    .map((id) => svg.getElementById(id) as SVGPathElement | null)
    .filter((el): el is SVGPathElement => !!el)
    .map((el) => ({ el, open: nums(el.getAttribute("data-open")), shut: nums(el.getAttribute("data-closed")) }))
    .filter((p) => p.open.length === p.shut.length && p.open.length >= 6)
  const setEye = (t: number) => {
    for (const p of eyeParts) {
      let d = ""
      for (let i = 0; i < p.open.length; i += 2) {
        const x = p.open[i] + (p.shut[i] - p.open[i]) * t
        const y = p.open[i + 1] + (p.shut[i + 1] - p.open[i + 1]) * t
        d += `${i ? " L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
      }
      p.el.setAttribute("d", d + "Z")
    }
  }

  // A click on the eye: an unseen disc a little larger than the gold ring.
  // It blinks first (set below), except under reduced motion.
  // Tell /seen the reader came in through the eye, so that its own eyes take
  // them back here, to this section, rather than to the top of the homepage.
  const toSeen = () => {
    try {
      const top = eyeBox ? eyeBox.getBoundingClientRect().top : 0
      sessionStorage.setItem(FROM_EYE_KEY, String(Math.round(top)))
    } catch {}
    go(EYE_HREF)
  }
  let onEye = toSeen
  const eyeBox = svg.getElementById("eye")
  const [hcx, hcy] = nums(eyeBox ? eyeBox.getAttribute("data-iris") : null)
  const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  const onEyeClick = (e: Event) => {
    e.stopPropagation() // the eye's own click: no motes' wave, no storm
    onEye()
  }
  if (eyeBox && Number.isFinite(hcx)) {
    hit.setAttribute("cx", String(hcx))
    hit.setAttribute("cy", String(hcy))
    hit.setAttribute("r", String(Number(eyeBox.getAttribute("data-hit-r")) || 90))
    hit.setAttribute("fill", "none")
    hit.style.pointerEvents = "all"
    hit.style.cursor = "pointer"
    eyeBox.appendChild(hit)
    hit.addEventListener("click", onEyeClick)
  }
  // Faint at rest, coming up slowly under the pointer (`EYE_REST`, `EYE_HOVER`).
  const eyeRest = Number(eyeBox?.getAttribute("data-rest")) || EYE_REST
  const eyeStyle = (eyeBox as SVGGElement | null)?.style
  const fadeEye = (to: number, ms: number) => {
    if (!eyeStyle) return
    eyeStyle.transition = `opacity ${ms}ms cubic-bezier(0.4, 0, 0.2, 1)`
    eyeStyle.opacity = String(to)
  }
  const onEyeEnter = () => fadeEye(Math.max(eyeRest, EYE_HOVER), EYE_FADE_IN_MS)
  const onEyeLeave = () => fadeEye(eyeRest, EYE_FADE_OUT_MS)
  if (eyeStyle) {
    eyeStyle.opacity = String(eyeRest)
    hit.addEventListener("pointerenter", onEyeEnter)
    hit.addEventListener("pointerleave", onEyeLeave)
  }
  const unhookEye = () => {
    hit.removeEventListener("click", onEyeClick)
    hit.removeEventListener("pointerenter", onEyeEnter)
    hit.removeEventListener("pointerleave", onEyeLeave)
  }

  // Under reduced motion: everything shown, drawn, at once, and the eye open.
  if (still()) {
    lines.forEach((l) => l.path.removeAttribute("mask"))
    // the creator's lines too, whole (their masks would keep them hidden)
    svg.querySelectorAll('g[id^="paper-"] path[mask]').forEach((el) => el.removeAttribute("mask"))
    setEye(0)
    return unhookEye
  }

  // The eye follows the pointer: the rhombi within the gold ring, the pupil
  // within the rhombi's empty middle (limits on the eye's <g>, frame units).
  const eyeG = svg.getElementById("eye")
  const irisEl = svg.getElementById("eye-iris")
  const pupilEl = svg.getElementById("eye-pupil")
  const ballEl = svg.getElementById("eye-ball")
  const [ballMaxX, ballMaxY] = nums(eyeG ? eyeG.getAttribute("data-ball-max") : null).map((v) => v || 0)
  const [icx, icy] = nums(eyeG ? eyeG.getAttribute("data-iris") : null)
  // The file's own units to the screen: its viewBox fills the host.
  const vb = svg.viewBox.baseVal
  const toScreen = (r: DOMRect, x: number, y: number) => {
    const k = r.width / (vb.width || 1)
    return [r.left + (x - vb.x) * k, r.top + (y - vb.y) * k]
  }
  const irisMax = Number(eyeG?.getAttribute("data-iris-max")) || 0
  const pupilMax = Number(eyeG?.getAttribute("data-pupil-max")) || 0
  let aimX = 0
  let aimY = 0
  let mouse: { x: number; y: number } | null = null
  let ix = 0, iy = 0, px = 0, py = 0, bx = 0, by = 0
  let lookRaf = 0
  let lookT = 0
  const look = (now: number) => {
    const dt = lookT ? Math.min(0.05, (now - lookT) / 1000) : 1 / 60
    lookT = now
    const ki = 1 - Math.exp(-dt / IRIS_LAG_S)
    const kp = 1 - Math.exp(-dt / PUPIL_LAG_S)
    const kb = 1 - Math.exp(-dt / BALL_LAG_S)
    bx += (aimX * ballMaxX - bx) * kb
    by += (aimY * ballMaxY - by) * kb
    ballEl?.setAttribute("transform", `translate(${bx.toFixed(2)} ${by.toFixed(2)})`)
    ix += (aimX * irisMax - ix) * ki
    iy += (aimY * irisMax - iy) * ki
    px += (aimX * pupilMax - px) * kp
    py += (aimY * pupilMax - py) * kp
    irisEl?.setAttribute("transform", `translate(${ix.toFixed(2)} ${iy.toFixed(2)})`)
    pupilEl?.setAttribute("transform", `translate(${(ix + px).toFixed(2)} ${(iy + py).toFixed(2)})`)
    const left = Math.abs(aimX * ballMaxX - bx) + Math.abs(aimY * ballMaxY - by) + Math.abs(aimX * irisMax - ix) + Math.abs(aimY * irisMax - iy) + Math.abs(aimX * pupilMax - px) + Math.abs(aimY * pupilMax - py)
    if (left > 0.02) lookRaf = requestAnimationFrame(look)
    else {
      lookRaf = 0
      lookT = 0
    }
  }
  const aim = () => {
    if (mouse && Number.isFinite(icx)) {
      const r = host.getBoundingClientRect()
      const [ex, ey] = toScreen(r, icx, icy)
      const dx = mouse.x - ex
      const dy = mouse.y - ey
      const d = Math.hypot(dx, dy)
      const m = d ? (1 - Math.exp(-d / LOOK_REACH_PX)) / d : 0
      aimX = dx * m
      aimY = dy * m
    } else {
      aimX = aimY = 0
    }
    if (!lookRaf && (irisEl || pupilEl || ballEl)) lookRaf = requestAnimationFrame(look)
  }
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    mouse = { x: e.clientX, y: e.clientY }
    if (onScreen) aim()
  }
  const onLeave = () => {
    mouse = null
    aim()
  }
  window.addEventListener("pointermove", onPointer, { passive: true })
  document.documentElement.addEventListener("pointerleave", onLeave)

  let eyeT = 1
  let eyeFrom = 1
  let eyeTo = 1
  let eyeStart = 0
  let eyeDur = 0
  let eyeRaf = 0
  let eyeDone: (() => void) | null = null
  let eyeEase = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
  const stepEye = (now: number) => {
    const u = eyeDur > 0 ? Math.min(1, Math.max(0, (now - eyeStart) / eyeDur)) : 1
    eyeT = eyeFrom + (eyeTo - eyeFrom) * eyeEase(u)
    setEye(eyeT)
    if (u < 1) {
      eyeRaf = requestAnimationFrame(stepEye)
      return
    }
    eyeRaf = 0
    const done = eyeDone
    eyeDone = null
    done?.()
  }
  /** Ease the eye to `to` (1 shut, 0 open) over `ms` for the whole way, then `done`. */
  const moveEye = (to: number, ms: number, done: (() => void) | null = null, ease = eyeEase) => {
    if (to === eyeTo) {
      if (eyeRaf) eyeDone = done
      else done?.()
      return
    }
    eyeFrom = eyeT
    eyeTo = to
    eyeStart = performance.now()
    eyeDur = ms * Math.abs(to - eyeT)
    eyeDone = done
    eyeEase = ease
    if (eyeRaf) cancelAnimationFrame(eyeRaf)
    eyeRaf = requestAnimationFrame(stepEye)
  }
  const IN_OUT = eyeEase
  const DOWN = (u: number) => u * u // a lid falls, quickening
  const UP = (u: number) => 1 - (1 - u) * (1 - u) // and lifts, slowing

  // Blinking: only an eye that is open, on screen, and not already blinking.
  let eyeWanted = false // the scroll wants it open
  let blinking = false
  let blinkTimer = 0
  const blink = (then: (() => void) | null = null, twice = false) => {
    if (!eyeWanted || blinking) {
      then?.()
      return
    }
    blinking = true
    moveEye(1, BLINK_DOWN_MS, () =>
      moveEye(0, BLINK_UP_MS, () => {
        blinking = false
        if (twice) window.setTimeout(() => blink(then), 140)
        else then?.()
      }, UP),
    DOWN)
  }
  const nextBlink = () => {
    const [a, b] = BLINK_EVERY_MS
    blinkTimer = window.setTimeout(() => {
      if (eyeWanted && !eyeRaf && onScreen && document.visibilityState === "visible") blink(null, Math.random() < BLINK_TWICE)
      nextBlink()
    }, a + Math.random() * (b - a))
  }
  nextBlink()
  onEye = () => blink(toSeen)

  const hide = (l: Line) => {
    l.anims.forEach((a) => a.cancel())
    l.anims = []
    l.strokes.forEach((s) => {
      s.el.style.strokeDashoffset = "1"
      s.el.style.strokeDasharray = "" // the file's "1 2": a whole line
    })
    l.busy = false
  }

  let onScreen = false
  /** How much the figures are seen (1 whole, 0 gone): the scroll's fade. */
  let shown = 1

  // Scrolling down hurries SILUET (`HURRY_*`): the rate its
  // strokes run at, eased towards `HURRY_RATE` while the page goes down.
  const hurryLines = lines.filter((l) => HURRY_GROUPS.includes(l.group))
  const hurried = new Set(hurryLines)
  let rate = 1
  let hurryUntil = 0
  let hurryRaf = 0
  let hurryAt = 0
  const hurryFrame = (now: number) => {
    const dt = hurryAt ? Math.min(0.1, (now - hurryAt) / 1000) : 1 / 60
    hurryAt = now
    const goal = now < hurryUntil ? HURRY_RATE : 1
    rate += (goal - rate) * (1 - Math.exp(-dt / HURRY_EASE_S))
    if (goal === 1 && Math.abs(rate - 1) < 0.01) rate = 1
    for (const l of hurryLines) if (!siluetHeld.has(l)) l.anims.forEach((a) => (a.playbackRate = rate))
    if (rate !== 1 || now < hurryUntil) hurryRaf = requestAnimationFrame(hurryFrame)
    else {
      hurryRaf = 0
      hurryAt = 0
    }
  }
  const hurry = (now: number) => {
    hurryUntil = now + HURRY_MS
    if (!hurryRaf && hurryLines.length) hurryRaf = requestAnimationFrame(hurryFrame)
  }

  // A click draws SILUET whole, holds it, erases it (`SILUET_*`).
  const siluet = lines.filter((l) => l.group === SILUET_GROUP)
  const siluetHeld = new Set<Line>()
  let siluetState: "idle" | "drawing" | "whole" | "erasing" = "idle"
  let siluetTimer = 0
  const drawMs = (s: Stroke) => Math.max(SILUET_DRAW_MIN_MS, (s.len / SILUET_DRAW_SPEED) * 1000)
  const eraseSiluet = () => {
    siluetState = "erasing"
    const anims = siluet.flatMap((l) => {
      l.path.setAttribute("mask", `url(#${l.mask})`)
      l.anims = l.strokes.map((s) =>
        s.el.animate([{ strokeDashoffset: "0" }, { strokeDashoffset: "-1" }], { duration: drawMs(s), easing: EASE_DRAW, fill: "both" }),
      )
      return l.anims
    })
    Promise.all(anims.map((a) => a.finished))
      .then(() => {
        if (siluetState !== "erasing") return
        siluet.forEach((l) => {
          siluetHeld.delete(l)
          hide(l)
        })
        siluetState = "idle"
      })
      .catch(() => {})
  }
  const holdSiluet = () => {
    window.clearTimeout(siluetTimer)
    siluetTimer = window.setTimeout(eraseSiluet, SILUET_HOLD_MS)
  }
  const drawSiluet = () => {
    if (!siluet.length) return
    if (siluetState === "drawing") return // held once it is drawn
    if (siluetState === "whole") {
      holdSiluet()
      return
    }
    siluetState = "drawing"
    const anims = siluet.flatMap((l) => {
      hide(l)
      l.busy = true
      siluetHeld.add(l)
      l.path.setAttribute("mask", `url(#${l.mask})`)
      l.anims = l.strokes.map((s) => {
        s.el.style.strokeDasharray = "" // the file's "1 2": the whole line
        return s.el.animate([{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }], { duration: drawMs(s), easing: EASE_DRAW, fill: "both" })
      })
      return l.anims
    })
    Promise.all(anims.map((a) => a.finished))
      .then(() => {
        if (siluetState !== "drawing") return
        // drawn: the masks go, so the lines are whole to the last hair
        siluet.forEach((l) => l.path.removeAttribute("mask"))
        siluetState = "whole"
        holdSiluet()
      })
      .catch(() => {})
  }
  // the section's click (the eye's own stops before it gets here): SILUET drawn whole
  const onSectionClick = () => drawSiluet()
  const clickBox = host.closest<HTMLElement>("[data-grain-click]")
  clickBox?.addEventListener("click", onSectionClick)

  // The plotter (the upper creator; see `PLOT_SPEED`).
  type PlotLine = { el: SVGPathElement; u0: number; len: number; mask: string; dash: SVGPathElement | null; was: string }
  type Plot = {
    copies: SVGGElement[]
    lines: PlotLine[][] // per copy
    arm: SVGGElement
    pen: SVGGElement
    sh: number[]
    wr: number[]
    track: Float32Array // x y u
    cycle: number
    period: number
    ys: Float32Array // the pen's point's height for each of `angs`, ascending
    angsByY: Float32Array
    xs: Float32Array // …and where it stands across, for each of `angs`
    angs: Float32Array
    x: number // how far the paper has moved under the pen, units (in the track's own x)
    x0: number // where the track starts across
    upX: Float32Array // the track's x where it goes on to the right…
    upU: Float32Array // …and how far along it that is: the way along for a place across
    ends: number[] // where each line ends, along the track, in order
    a1: number // the arm's turn, last frame
    current: number
    was: string[]
  }
  const plots: Plot[] = []
  {
    const g = svg.getElementById("paper-1")
    const a = svg.getElementById("paper-1-a") as SVGGElement | null
    const arm = svg.getElementById("creator-1-arm") as SVGGElement | null
    const pen = svg.getElementById("creator-1-pen") as SVGGElement | null
    if (g && a && arm && pen) {
      const sh = nums(g.getAttribute("data-shoulder"))
      const wr = nums(g.getAttribute("data-wrist"))
      const tip = nums(g.getAttribute("data-tip"))
      const track = Float32Array.from(nums(g.getAttribute("data-track")))
      const cycle = Number(g.getAttribute("data-cycle")) || 0
      const period = Number(g.getAttribute("data-period")) || 0
      if (sh.length >= 2 && wr.length >= 2 && tip.length >= 2 && track.length >= 9 && cycle > 0 && period > 0) {
        // the copy before: whole, no masks
        const b = a.cloneNode(true) as SVGGElement
        b.id = "paper-1-b"
        b.querySelectorAll("path[mask]").forEach((el) => el.removeAttribute("mask"))
        g.appendChild(b)
        const read = (c: SVGGElement) =>
          Array.from(c.querySelectorAll<SVGPathElement>("path[data-u0]")).map((el) => {
            const mask = (a.querySelector(`path[data-u0="${el.getAttribute("data-u0")}"]`)?.getAttribute("mask") || "").replace(/^url\(#|\)$/g, "")
            return {
              el,
              u0: Number(el.getAttribute("data-u0")) || 0,
              len: Number(el.getAttribute("data-len")) || 1,
              mask,
              dash: svg.getElementById(mask)?.querySelector("path") as SVGPathElement | null,
              was: "",
            }
          })
        // where the pen's point goes as the arm turns (the pen turning PLOT_WRIST as much at the wrist)
        const n = 801
        const angs = new Float32Array(n)
        const xs = new Float32Array(n)
        const yv = new Float32Array(n)
        const k = Math.PI / 180
        for (let i = 0; i < n; i++) {
          const a1 = -40 + (80 * i) / (n - 1)
          const a2 = PLOT_WRIST * a1
          let x = wr[0] + (tip[0] - wr[0]) * Math.cos(a2 * k) - (tip[1] - wr[1]) * Math.sin(a2 * k)
          let y = wr[1] + (tip[0] - wr[0]) * Math.sin(a2 * k) + (tip[1] - wr[1]) * Math.cos(a2 * k)
          const rx = x - sh[0]
          const ry = y - sh[1]
          x = sh[0] + rx * Math.cos(a1 * k) - ry * Math.sin(a1 * k)
          y = sh[1] + rx * Math.sin(a1 * k) + ry * Math.cos(a1 * k)
          angs[i] = a1
          xs[i] = x
          yv[i] = y
        }
        const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => yv[i] - yv[j])
        // the track's way along by its place across: where it turns back, the
        // way back is skipped (drawn at once when the paper gets there)
        const upX: number[] = []
        const upU: number[] = []
        for (let i = 0; i < track.length; i += 3) {
          if (!upX.length || track[i] > upX[upX.length - 1] + 1e-3) {
            upX.push(track[i])
            upU.push(track[i + 2])
          }
        }
        const linesA = read(a)
        plots.push({
          copies: [a, b],
          lines: [linesA, read(b)],
          arm, pen, sh, wr, track, cycle, period,
          ys: Float32Array.from(order.map((i) => yv[i])),
          angsByY: Float32Array.from(order.map((i) => angs[i])),
          xs, angs,
          x: track[0],
          x0: track[0],
          upX: Float32Array.from(upX),
          upU: Float32Array.from(upU),
          ends: linesA.map((l) => l.u0 + l.len).sort((p, q) => p - q),
          a1: 0,
          current: -1,
          was: ["", "", "", ""],
        })
      }
    }
  }
  /** `ys` (ascending) to `out` at `y`, by straight lines between. */
  const lerpBy = (ys: Float32Array, out: Float32Array, y: number) => {
    let lo = 0
    let hi = ys.length - 1
    if (y <= ys[lo]) return out[lo]
    if (y >= ys[hi]) return out[hi]
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (ys[m] <= y) lo = m
      else hi = m
    }
    const t = (y - ys[lo]) / (ys[hi] - ys[lo] || 1)
    return out[lo] + (out[hi] - out[lo]) * t
  }
  /** Where the track is at `u` (within one way round): x, y. */
  const trackAt = (t: Float32Array, u: number) => {
    const n = t.length / 3
    let lo = 0
    let hi = n - 1
    if (u <= t[2]) return [t[0], t[1]]
    if (u >= t[3 * hi + 2]) return [t[3 * hi], t[3 * hi + 1]]
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (t[3 * m + 2] <= u) lo = m
      else hi = m
    }
    const w = (u - t[3 * lo + 2]) / (t[3 * hi + 2] - t[3 * lo + 2] || 1)
    return [t[3 * lo] + (t[3 * hi] - t[3 * lo]) * w, t[3 * lo + 1] + (t[3 * hi + 1] - t[3 * lo + 1]) * w]
  }
  /** Where the pen's point stands across for the arm turned `a1`. */
  const tipX = (p: Plot, a1: number) => {
    const i = ((a1 + 40) / 80) * (p.angs.length - 1)
    const i0 = Math.max(0, Math.min(p.angs.length - 2, Math.floor(i)))
    return p.xs[i0] + (p.xs[i0 + 1] - p.xs[i0]) * (i - i0)
  }
  const placePlot = (p: Plot) => {
    const round = Math.floor((p.x - p.x0) / p.period)
    const xx = p.x - round * p.period // the paper's place under the pen at rest, this round
    const cur = ((round % 2) + 2) % 2
    if (cur !== p.current) {
      // the one being drawn takes the masks; the one before is whole
      p.current = cur
      p.lines[1 - cur].forEach((l) => {
        l.el.removeAttribute("mask")
        l.was = ""
      })
      p.lines[cur].forEach((l) => {
        l.el.setAttribute("mask", `url(#${l.mask})`)
        l.was = ""
      })
    }
    // the paper is where it is; the pen's point is where the arm puts it, and
    // the line is drawn at the place under the point: settle the two together
    const rest = tipX(p, 0)
    let a1 = p.a1
    let uu = 0
    let qx = xx
    for (let k = 0; k < 3; k++) {
      qx = xx + (tipX(p, a1) - rest)
      uu = lerpBy(p.upX, p.upU, qx)
      a1 = lerpBy(p.ys, p.angsByY, trackAt(p.track, uu)[1])
    }
    p.a1 = a1
    const dx = rest - xx
    const w = [
      `rotate(${a1.toFixed(3)} ${p.sh[0]} ${p.sh[1]})`,
      `rotate(${(PLOT_WRIST * a1).toFixed(3)} ${p.wr[0]} ${p.wr[1]})`,
      `translate(${dx.toFixed(2)} 0)`,
      `translate(${(dx - p.period).toFixed(2)} 0)`,
    ]
    if (w[0] !== p.was[0]) p.arm.setAttribute("transform", w[0])
    if (w[1] !== p.was[1]) p.pen.setAttribute("transform", w[1])
    if (w[2] !== p.was[2]) p.copies[cur].setAttribute("transform", w[2])
    if (w[3] !== p.was[3]) p.copies[1 - cur].setAttribute("transform", w[3])
    p.was = w
    for (const l of p.lines[cur]) {
      const f = Math.min(1, Math.max(0, (uu - l.u0) / l.len))
      const d = f <= 0 ? "0 2" : `${f.toFixed(5)} 2`
      if (d !== l.was && l.dash) {
        l.dash.style.strokeDasharray = d
        l.dash.style.strokeDashoffset = "0"
        l.was = d
      }
    }
    // each line, once drawn, fades out while the next is drawn
    const at = round * p.cycle + uu
    const last = p.ends.length - 1
    for (let c = 0; c < 2; c++) {
      const r = c === cur ? round : round - 1
      for (const l of p.lines[c]) {
        const i = p.ends.indexOf(l.u0 + l.len)
        const end = r * p.cycle + p.ends[i]
        const next = i < last ? r * p.cycle + p.ends[i + 1] : (r + 1) * p.cycle + p.ends[0]
        const o = at <= end ? 1 : Math.max(0, 1 - (at - end) / (next - end))
        const op = o.toFixed(3)
        if (l.el.style.opacity !== op) l.el.style.opacity = op
      }
    }
  }
  let plotRaf = 0
  let plotAt = 0
  // The paper moves only while the figures are seen: time stands still while
  // the section is off screen, the page hidden, or the figures faded away.
  const live = () => onScreen && shown > 0.001 && document.visibilityState === "visible"
  const plotFrame = (now: number) => {
    plotRaf = 0
    const dt = plotAt ? Math.min(100, now - plotAt) : 0
    plotAt = now
    for (const p of plots) {
      p.x += PLOT_SPEED * (dt / 1000)
      placePlot(p)
    }
    if (live()) plotRaf = requestAnimationFrame(plotFrame)
    else plotAt = 0
  }
  const wakePlot = () => {
    if (!plotRaf && plots.length && live()) plotRaf = requestAnimationFrame(plotFrame)
  }

  /**
   * A stroke two thirds of the line long glides along it, from just before
   * its start to just past its end. Dashes of LOOP_SEGMENT with a gap of 2
   * (longer than the line, so the next dash never shows): at offset
   * LOOP_SEGMENT the dash ends where the line starts, at -1 it begins where
   * the line ends.
   */
  const cycle = (l: Line, fromTop = false) => {
    hide(l)
    l.busy = true
    l.anims = l.strokes.map((s) => {
      s.el.style.strokeDasharray = `${LOOP_SEGMENT} 2`
      const way = s.len * (1 + LOOP_SEGMENT)
      const d = Math.min(LOOP_MAX_MS, Math.max(LOOP_MIN_MS, (way / LOOP_SPEED) * 1000))
      const along = [{ strokeDashoffset: String(LOOP_SEGMENT) }, { strokeDashoffset: "-1" }]
      return s.el.animate(fromTop && goesUp.get(s.el) ? along.reverse() : along, {
        duration: d,
        easing: EASE_LOOP,
        fill: "both",
      })
    })
    if (hurried.has(l)) l.anims.forEach((a) => (a.playbackRate = rate))
    const mine = l.anims
    Promise.all(mine.map((a) => a.finished))
      .then(() => {
        if (l.anims === mine) hide(l)
      })
      .catch(() => {})
  }
  const lively = () => onScreen && shown > 0.05
  const startOne = (pool: Line[], max: number, fromTop = false) => {
    if (!lively()) return
    const busy = pool.filter((l) => l.busy).length
    const free = pool.filter((l) => !l.busy)
    if (busy >= max || !free.length) return
    cycle(free[Math.floor(Math.random() * free.length)], fromTop)
  }

  let loopTimer = 0
  const tick = () => {
    loopTimer = window.setTimeout(tick, LOOP_EVERY_MS * (0.7 + Math.random() * 0.6))
    startOne(lines, LOOP_MAX)
  }

  // The upper lines: which they are, and whether each stroke's path runs
  // upwards (so a stroke there travels it backwards, from its top down).
  const startY = new Map<SVGPathElement, number>()
  const goesUp = new Map<SVGPathElement, boolean>()
  let silTop = Infinity
  let silBottom = -Infinity
  const silLines = lines.filter((l) => UPPER_GROUPS.includes(l.group))
  silLines.forEach((l) =>
    l.strokes.forEach((s) => {
      const p = nums(s.el.getAttribute("d")?.replace(/[A-Za-z]/g, " ") || null)
      if (p.length < 4) return
      goesUp.set(s.el, p[1] > p[p.length - 1])
      const top = Math.min(p[1], p[p.length - 1])
      startY.set(s.el, top)
      for (let i = 1; i < p.length; i += 2) {
        silTop = Math.min(silTop, p[i])
        silBottom = Math.max(silBottom, p[i])
      }
    }),
  )
  const upperFloor = silTop + UPPER_SHARE * (silBottom - silTop)
  const upper = silLines.filter((l) => l.strokes.some((s) => (startY.get(s.el) ?? Infinity) < upperFloor))
  let upperTimer = 0
  const upperTick = () => {
    upperTimer = window.setTimeout(upperTick, UPPER_EVERY_MS * (0.7 + Math.random() * 0.6))
    startOne(upper, UPPER_MAX, true)
  }
  let lastY = window.scrollY
  let lastScrollStart = 0
  const onScrollDown = () => {
    const y = window.scrollY
    const down = y > lastY
    lastY = y
    const now = performance.now()
    if (down) hurry(now)
    if (down && now - lastScrollStart > UPPER_SCROLL_MS) {
      lastScrollStart = now
      startOne(upper, UPPER_MAX, true)
      startOne(hurryLines.filter((l) => !siluetHeld.has(l)), HURRY_MAX)
    }
  }

  // The words: the computer's, when they are shown (none on a phone, where
  // nothing fades); the fades are read off `WORDS_MARK`, a point of the frame.
  const section = host.closest("section")
  const words = () => {
    let top = Infinity
    let bottom = -Infinity
    section?.querySelectorAll<HTMLElement>("[data-mk-words]").forEach((el) => {
      if (!el.getClientRects().length) return
      const r = el.getBoundingClientRect()
      top = Math.min(top, r.top)
      bottom = Math.max(bottom, r.bottom)
    })
    return top < bottom ? { top, bottom } : null
  }
  let wasShown = ""
  const wordsOut = section?.querySelector<HTMLElement>("[data-mk-words-out]") ?? null
  let wasWords = "-"
  const fade = (vh: number) => {
    const w = words()
    if (!figures) return
    if (!w) {
      shown = 1
      if (wasShown) {
        figures.style.opacity = ""
        figures.style.visibility = ""
        wasShown = ""
      }
      return
    }
    const frame = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const mid = frame.top + ((WORDS_MARK - vb.y) * frame.height) / (vb.height || 1)
    const u = Math.min(1, Math.max(0, (FADE_FROM * vh - mid) / ((FADE_FROM - FADE_TO) * vh)))
    shown = 1 - u * u * (3 - 2 * u)
    // the words themselves, once the sun is out
    if (wordsOut) {
      const t = Math.min(1, Math.max(0, (WORDS_OUT_FROM * vh - mid) / ((WORDS_OUT_FROM - WORDS_OUT_TO) * vh)))
      const e = t * t * (3 - 2 * t)
      const key = e.toFixed(3)
      if (key !== wasWords) {
        wordsOut.style.opacity = e > 0.0005 ? (1 - e).toFixed(3) : ""
        wordsOut.style.transform = e > 0.0005 ? `translateY(${(-WORDS_RISE_PX * e).toFixed(1)}px)` : ""
        wasWords = key
      }
    }
    const op = shown > 0.999 ? "" : shown.toFixed(3)
    if (op !== wasShown) {
      figures.style.opacity = op
      // gone: not drawn at all, so the strokes still running cost nothing
      figures.style.visibility = shown < 0.001 ? "hidden" : ""
      wasShown = op
    }
  }

  const onScroll = () => {
    const r = host.getBoundingClientRect()
    const vh = window.innerHeight
    if (!r.height) return
    onScreen = r.top < vh && r.bottom > 0
    fade(vh)
    wakePlot()
    // The eye: open once its middle is up past EYE_OPEN_AT of the screen,
    // shut again once it is below the screen.
    const eyeY = Number.isFinite(icy) ? toScreen(r, icx, icy)[1] : r.bottom
    if (eyeY < vh * EYE_OPEN_AT) {
      if (!eyeWanted) {
        eyeWanted = true
        moveEye(0, EYE_OPEN_MS, null, IN_OUT)
      }
    } else if (eyeY > vh + 40 && eyeWanted) {
      eyeWanted = false
      blinking = false
      moveEye(1, EYE_SHUT_MS, null, IN_OUT)
    }
    if (mouse && onScreen) aim() // the page moved under a still pointer
    onScrollDown()
  }

  let raf = 0
  const onScrollRaf = () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        onScroll()
      })
  }
  window.addEventListener("scroll", onScrollRaf, { passive: true })
  window.addEventListener("resize", onScrollRaf)
  document.addEventListener("visibilitychange", wakePlot)
  onScroll()
  tick()
  upperTick()

  return () => {
    if (plotRaf) cancelAnimationFrame(plotRaf)
    document.removeEventListener("visibilitychange", wakePlot)
    window.clearTimeout(upperTimer)
    window.clearTimeout(siluetTimer)
    if (hurryRaf) cancelAnimationFrame(hurryRaf)
    clickBox?.removeEventListener("click", onSectionClick)
    window.clearTimeout(blinkTimer)
    unhookEye()
    if (eyeRaf) cancelAnimationFrame(eyeRaf)
    if (lookRaf) cancelAnimationFrame(lookRaf)
    window.removeEventListener("pointermove", onPointer)
    document.documentElement.removeEventListener("pointerleave", onLeave)
    window.removeEventListener("scroll", onScrollRaf)
    window.removeEventListener("resize", onScrollRaf)
    if (raf) cancelAnimationFrame(raf)
    window.clearTimeout(loopTimer)
    lines.forEach((l) => l.anims.forEach((a) => a.cancel()))
  }
}

/**
 * Puts the eye `y` px down the screen, as it stood when the reader left
 * through it, once the homepage has laid itself out, and waits for the
 * photograph under it to be decoded; then once more, in case anything above
 * moved meanwhile.
 */
async function arrive(host: HTMLElement, svg: SVGSVGElement, y: number) {
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
  const place = () => {
    const eye = svg.getElementById("eye")
    if (!eye) return
    const top = eye.getBoundingClientRect().top
    window.scrollTo({ top: window.scrollY + top - y, behavior: "instant" as ScrollBehavior })
  }
  await frame()
  await frame()
  await new Promise((r) => window.setTimeout(r, 150))
  place()
  // the trunk's photograph (the gold motes find it by the same words)
  const img = host.closest("section")?.querySelector<HTMLImageElement>('img[alt^="A white vase"]')
  if (img) {
    if (!img.complete) {
      await new Promise<void>((r) => {
        img.addEventListener("load", () => r(), { once: true })
        img.addEventListener("error", () => r(), { once: true })
      })
    }
    try {
      await img.decode()
    } catch {}
  }
  await frame()
  place()
  await frame()
}

/** Coming back from /seen: the longest the veil may wait for the photograph and the drawing. */
const RETURN_WAIT_MS = 4000
/** …and how long it takes to lift. */
const RETURN_FADE_MS = 600

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export function MakingDrawing() {
  const hostRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  // Coming back from /seen through its eyes (2026-11-08, the author's report):
  // the page used to land wherever the browser's memory of the scroll put it,
  // often past the section, and the photograph and the drawing came in
  // piecemeal before the reader's eyes. Now a veil of the dark wood's own
  // #202020 covers the page before its first paint; the drawing is loaded,
  // the eye put back where it stood on the screen (`RETURN_KEY`), the
  // photograph decoded, and only then the veil lifts.
  const returning = useRef<{ y: number; veil: HTMLDivElement; reveal: () => void } | null>(null)
  useIsoLayoutEffect(() => {
    let y: number | null = null
    try {
      // Left in place until the veil lifts: in development React runs this
      // twice, and the second run must find it again.
      const v = sessionStorage.getItem(RETURN_KEY)
      if (v !== null && Number.isFinite(Number(v))) y = Number(v)
    } catch {}
    if (y === null) return
    const veil = document.createElement("div")
    veil.setAttribute("aria-hidden", "true")
    Object.assign(veil.style, {
      position: "fixed",
      inset: "0",
      background: "#202020",
      zIndex: "2147483000",
      transition: `opacity ${RETURN_FADE_MS}ms ease`,
      pointerEvents: "none",
    })
    document.body.appendChild(veil)
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      window.clearTimeout(safety)
      try {
        sessionStorage.removeItem(RETURN_KEY)
      } catch {}
      veil.style.opacity = "0"
      window.setTimeout(() => veil.remove(), RETURN_FADE_MS + 50)
    }
    const safety = window.setTimeout(reveal, RETURN_WAIT_MS)
    returning.current = { y, veil, reveal }
    return () => {
      window.clearTimeout(safety)
      veil.remove()
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let turn = 0 // which load is current: a swap while one is in flight drops it
    let stop = () => {}
    const load = () => {
      const mine = ++turn
      stop()
      stop = () => {}
      host.innerHTML = ""
      fetch(SRC)
        .then((r) => r.text())
        .then((text) => {
          if (mine !== turn) return
          host.innerHTML = text // the site's own file
          const svg = host.querySelector("svg")
          if (!svg) return
          svg.setAttribute("width", "100%")
          svg.setAttribute("height", "100%")
          svg.style.display = "block"
          stop = run(host, svg, (href) => routerRef.current?.push(href))
          const back = returning.current
          if (back) {
            returning.current = null
            arrive(host, svg, back.y).then(back.reveal, back.reveal)
          }
        })
        .catch(() => {})
    }
    load()
    return () => {
      turn++
      stop()
      host.innerHTML = ""
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
    />
  )
}
