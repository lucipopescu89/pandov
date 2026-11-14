"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { FROM_EYE_KEY, RETURN_KEY } from "@/lib/seen-key"

/**
 * The Making section's line drawings, drawn as if by hand (2026-11-05, the
 * author's brief):
 *
 *  - The Creator, the figure with the tulnic on the left, stands as drawn, and
 *    so does the eye in the dark wood.
 *  - Fum and the Siluets (and Vector 89, a line of theirs outside any named
 *    figure) are never whole until the section is clicked. While it is
 *    on screen, a stroke two thirds of a line's length (`LOOP_SEGMENT`) travels
 *    slowly along one line after another, at random: it comes in at the line's
 *    start, glides its whole length (`LOOP_SPEED`) and goes out at its end,
 *    so nothing of the line is left behind. A new one starts every
 *    `LOOP_EVERY_MS`, never more than `LOOP_MAX` at once, and never on a line
 *    already in play. Off screen, no new one starts. (The author's asking the
 *    same day; before, each line was drawn whole, held and erased, and before
 *    that they stayed drawn, as many as the section had
 *    come up the screen.)
 *  - A click anywhere on the section (the author's asking, 2026-11-05: one
 *    click for all of Making, the same click that sends the gold motes' wave
 *    up the trunk; at first it was a click on The Creator alone) breathes them
 *    all out of The Creator's tulnic: whatever is
 *    already drawn fades away (`CLEAR_MS`), then every line is drawn from the
 *    tulnic's mouth outward. Fum first, the Siluets after it
 *    (`SILUET_AFTER_MS`); each line starts at its end nearer the mouth, and the
 *    further it lies from the mouth the later it starts (`FRONT_SPEED`), so the
 *    drawing travels from the smoke up into the figures.
 *    They stay whole for a few seconds (`FULL_HOLD_MS`), then are erased the
 *    way they came, from the smoke outward (`ERASE_FRONT_SPEED`,
 *    `ERASE_SPEED`), and the drawing and erasing at random begins again (the
 *    author's asking the same day).
 *  - Scrolled back up until the section is below the screen, it all goes
 *    again, and the drawing and erasing begins anew on the way down.
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
 * every photograph on the site at once (2026-11-08, the author's asking; it
 * went to /making, the page of the film, until then, and /making is still in
 * the bottom menu); that click is the eye's alone, so it neither breathes the
 * figures out nor sends the motes' wave.
 *
 * Nothing levitates (2026-11-14, the author's asking; until then The Creator
 * floated 9 units up and down, a breath every 7s). On the phone's drawing The
 * Creator still trembles a little for under a second on the click
 * (`CREATOR_SHAKE`, `CREATOR_SHAKE_MS`), as the smoke leaves the tulnic.
 *
 * On the computer's drawing (the author's frame of 2026-11-14) each creator
 * holds a pen and draws, as a plotter: the upper one the four short lines
 * across the words (`PLOT_SPEED`), the lower one the line that winds down to
 * Siluet2 (`WAVE_SPEED`). Of each creator only the head, arm and pen stand
 * fixed; its other lines, and Siluet2's and SILUET's, are travelled by
 * strokes and drawn whole on the click, from where the lower creator's line
 * reaches Siluet2.
 *
 * How a line is drawn: the lines are Figma's outlined strokes, so each is
 * revealed through a mask holding its centre line, whose `stroke-dashoffset`
 * runs from 1 to 0 (pathLength 1); the mask is dropped once the line is
 * drawn, so a finished line costs nothing. All of it is prepared in the file,
 * `public/images/home/making-drawing.svg`, by `scripts/making-drawing.py`: see
 * its header. The file is fetched and set inline, so its groups can be
 * reached; it is 70KB, and inlined by the server it would travel twice (HTML
 * and the RSC payload).
 *
 * The section's photograph box takes a click for the gold motes' wave
 * (`public/pandov-grain.js`); this listens on the same box, so one click
 * plays both.
 * Under reduced motion every line is shown, drawn, and nothing moves.
 */

/**
 * Bumped whenever the script writes the drawings anew, so no browser keeps an
 * old copy (2026-11-14: the old drawing stayed in the browser after the
 * re-export, even after a reload). Both files are fetched with it.
 */
const SVG_VERSION = "2026-11-14h"
const SRC = `/images/home/making-drawing.svg?v=${SVG_VERSION}`
/**
 * The phone's drawing (2026-11-05, the author's frame "Making - Mobile"): its
 * own figures, fewer lines and the eye moved, written by the same script with
 * `--mobile`. Its viewBox is the photograph's box in the phone frame's units,
 * so the page lays it over the photograph's box exactly as it lays the
 * computer's. Chosen by the same query as the phone's layout in
 * `making-section.tsx`, and swapped when the screen crosses it.
 */
const SRC_PHONE = `/images/home/making-drawing-mobile.svg?v=${SVG_VERSION}`
const PHONE = "(max-width: 767px)"

/** Before the click: the travelling stroke's length, as a share of its line's (a third until the author's asking, the same day). */
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
 * Before the click, the upper part of the Siluets is busier (2026-11-10, the
 * author's asking): besides the strokes above, which go anywhere, more
 * travelling strokes run on the Siluet lines that start in the upper half of
 * the Siluets' height (`UPPER_SHARE`), coming down them from their upper end,
 * so that the figures up there seem to be being drawn. A new one starts every
 * `UPPER_EVERY_MS` while fewer than `UPPER_MAX` are in play there, and
 * scrolling down starts one at once (at most every `UPPER_SCROLL_MS`), so they
 * seem drawn as the reader comes down the page. Nothing of them stays: like
 * the others, each comes in and goes out. (A first try the same day drew the
 * upper part and left it standing; the author wanted movement, not lines.)
 */
const UPPER_GROUPS = ["siluet-1", "siluet-2", "siluet-3", "creator-1", "creator-2"]
const UPPER_SHARE = 0.5
const UPPER_EVERY_MS = 420
const UPPER_MAX = 5
const UPPER_SCROLL_MS = 260

/** Click: how long what is drawn takes to fade before the birth. */
const CLEAR_MS = 450
/** Click: how fast the start of the drawing travels out from the mouth, units a second. */
const FRONT_SPEED = 520
/** Click: how fast each line is drawn, units a second, and its shortest time. */
const DRAW_SPEED = 400
const DRAW_MIN_MS = 500
/** Click: the Siluets wait this long after the smoke has begun. */
const SILUET_AFTER_MS = 500
/** After the click: how long the whole drawing stays before it is erased. */
const FULL_HOLD_MS = 5000
/** …and how fast the erasing travels out from the mouth, and erases a line. */
const ERASE_FRONT_SPEED = 700
const ERASE_SPEED = 520

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
 * The eye is subtler (2026-11-14, the author's asking): the whole of it at
 * 30% of its strength, and under the pointer it comes up slowly to 80% of
 * it, fading back when the pointer leaves. On a touch screen there is no
 * hover, so it stays at 30% there.
 */
const EYE_REST = 0.3
const EYE_HOVER = 0.8
const EYE_FADE_IN_MS = 1600
const EYE_FADE_OUT_MS = 1000

/** On the click (the phone's Creator): how long its trembling takes to swell, and how far it trembles (frame units). */
const CREATOR_SETTLE_MS = 300
const CREATOR_SHAKE = 1.1
/** The trembling lasts this long from the click, swelling as it comes to rest and dying away after. */
const CREATOR_SHAKE_MS = 800

/**
 * The lower creator draws its line as a plotter too (2026-11-14, the
 * author's asking, the same evening). Since the author redrew the line and
 * drew three more beside it (the same evening): each of the three leaves the
 * pen's point with the line's bends and meets the line lower down, its bends a
 * little further along than the last's. The line here passes from one of the
 * three to the next, round and round, smoothly (`WAVE_PERIOD` for the whole
 * round), so its bends move along it and new ones come from the pen, and
 * below where they meet it the line is the line as drawn, climbing to
 * Siluet2. How strong the bends are wanders slowly (`WAVE_STRENGTH`, a new
 * aim every `WAVE_DRIFT` seconds). The pen sways across the line with them
 * (`WAVE_SWAY`), the arm turning at the shoulder and the pen `PLOT_WRIST` as
 * much at the wrist, as the upper creator's; the line near the point is bent
 * to leave from where it really is (`WAVE_LEAD`). The three are in the file
 * as how far each is from the line along it (`data-keys`, by
 * `scripts/making-drawing.py`, in the order whose bends run down the line
 * most); the line is drawn here as one shape, its width read from the drawing.
 * At first the line grows out of the pen (`WAVE_SPEED`).
 *
 * On the click the bends die away over `PEN_FILL_MS` (and the line, if it
 * has not reached its end yet, is drawn on to it), so it stands as drawn
 * while the drawing stands; they come back when it is erased.
 */
const WAVE_SPEED = 45
const WAVE_PERIOD = 7
const WAVE_STRENGTH: [number, number] = [0.45, 1]
const WAVE_DRIFT: [number, number] = [3, 6]
const WAVE_SWAY = 4
/** Near the pen's point the line is bent to leave from where it really is (units). */
const WAVE_LEAD = 24
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
 * On the click the paper only moves `PLOT_CLICK` times as fast.
 */
const PLOT_SPEED = 30
const PLOT_CLICK = 1.5
const PLOT_WRIST = -0.5
const CLICK_BOOST = 2
const BOOST_EASE_S = 0.5
/**
 * On the click the pens' lines are made whole first (2026-11-14, the
 * author's asking), over `PEN_FILL_MS`, and only then are the other lines
 * drawn (their start waits as long); they stay so while the drawing stands.
 */
const PEN_FILL_MS = 1400

const EASE_LOOP = "cubic-bezier(.4,0,.6,1)"
const EASE_BIRTH = "cubic-bezier(.3,0,.2,1)"

type Stroke = { el: SVGPathElement; len: number; from: number }
type Line = { path: SVGPathElement; mask: string; group: string; strokes: Stroke[]; anims: Animation[]; state: 0 | 1 | 2 }

function run(host: HTMLElement, svg: SVGSVGElement, go: (href: string) => void): () => void {
  const lines: Line[] = []
  svg.querySelectorAll<SVGPathElement>("path[data-line]").forEach((path) => {
    const mask = path.getAttribute("data-line") || ""
    const m = svg.getElementById(mask)
    if (!m) return
    const strokes = Array.from(m.querySelectorAll<SVGPathElement>("path")).map((el) => ({
      el,
      len: Number(el.getAttribute("data-len")) || 100,
      from: Number(el.getAttribute("data-from")) || 0,
    }))
    const group = path.closest("g[id]")?.id || ""
    lines.push({ path, mask, group, strokes, anims: [], state: 0 })
  })

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
    e.stopPropagation() // the eye's own click: no birth, no motes' wave
    onEye()
  }
  if (eyeBox && Number.isFinite(hcx)) {
    hit.setAttribute("cx", String(hcx))
    hit.setAttribute("cy", String(hcy))
    hit.setAttribute("r", "90")
    hit.setAttribute("fill", "none")
    hit.style.pointerEvents = "all"
    hit.style.cursor = "pointer"
    eyeBox.appendChild(hit)
    hit.addEventListener("click", onEyeClick)
  }
  // Subtle at rest, coming up slowly under the pointer (`EYE_REST`, `EYE_HOVER`).
  const eyeStyle = (eyeBox as SVGGElement | null)?.style
  const fadeEye = (to: number, ms: number) => {
    if (!eyeStyle) return
    eyeStyle.transition = `opacity ${ms}ms cubic-bezier(0.4, 0, 0.2, 1)`
    eyeStyle.opacity = String(to)
  }
  const onEyeEnter = () => fadeEye(EYE_HOVER, EYE_FADE_IN_MS)
  const onEyeLeave = () => fadeEye(EYE_REST, EYE_FADE_OUT_MS)
  if (eyeStyle) {
    eyeStyle.opacity = String(EYE_REST)
    hit.addEventListener("pointerenter", onEyeEnter)
    hit.addEventListener("pointerleave", onEyeLeave)
  }
  const unhookEye = () => {
    hit.removeEventListener("click", onEyeClick)
    hit.removeEventListener("pointerenter", onEyeEnter)
    hit.removeEventListener("pointerleave", onEyeLeave)
  }

  // Under reduced motion: everything shown, drawn, at once, and the eye open.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lines.forEach((l) => l.path.removeAttribute("mask"))
    // the creators' lines too, whole (their masks would keep them hidden)
    svg.querySelectorAll('g[id^="paper-"] path[mask]').forEach((el) => el.removeAttribute("mask"))
    svg.querySelectorAll('[id^="wave-"][id$="-line"]').forEach((el) => el.removeAttribute("visibility"))
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
    l.path.setAttribute("mask", `url(#${l.mask})`)
    l.state = 0
  }

  /** Draw a line, each of its strokes after `delay(s)` ms over `dur(s)` ms. */
  const draw = (l: Line, delay: (s: Stroke) => number, dur: (s: Stroke) => number, easing: string) => {
    hide(l)
    l.state = 1
    l.anims = l.strokes.map((s) =>
      s.el.animate([{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }], {
        duration: dur(s),
        delay: delay(s),
        easing,
        fill: "both",
      }),
    )
    const mine = l.anims
    Promise.all(mine.map((a) => a.finished))
      .then(() => {
        if (l.anims !== mine) return
        l.path.removeAttribute("mask")
        l.state = 2
      })
      .catch(() => {})
  }

  let mode: "loop" | "clearing" | "birth" | "full" | "erasing" = "loop"
  let fades: Animation[] = []
  let timer = 0
  let loopTimer = 0
  let holdTimer = 0
  let onScreen = false

  // The phone's Creator: still, trembling a little as the click's birth begins.
  const creatorG = svg.getElementById("the-creator")
  let held = false
  let holdAt = 0
  let creatorRaf = 0
  const ph = [0, 1, 2, 3].map(() => Math.random() * Math.PI * 2)
  const creatorFrame = (now: number) => {
    creatorRaf = 0
    if (!creatorG) return
    let shake = 0
    if (held) {
      const t = now - holdAt
      const u = Math.min(1, t / CREATOR_SETTLE_MS)
      shake = t < CREATOR_SETTLE_MS ? u : Math.max(0, 1 - (t - CREATOR_SETTLE_MS) / (CREATOR_SHAKE_MS - CREATOR_SETTLE_MS))
    }
    let x = 0
    let y = 0
    if (shake > 0) {
      const t = now / 1000
      const a = CREATOR_SHAKE * shake
      x += a * (0.6 * Math.sin(t * 71 + ph[0]) + 0.4 * Math.sin(t * 112 + ph[1]))
      y += a * (0.6 * Math.sin(t * 86 + ph[2]) + 0.4 * Math.sin(t * 45 + ph[3]))
    }
    creatorG.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
    // Done trembling, it stands still: no need to draw it again.
    const still = !held || now - holdAt > CREATOR_SHAKE_MS
    if (onScreen && !still) creatorRaf = requestAnimationFrame(creatorFrame)
  }
  const wakeCreator = () => {
    if (!creatorRaf && onScreen && creatorG) creatorRaf = requestAnimationFrame(creatorFrame)
  }
  const holdCreator = () => {
    if (held) return
    held = true
    holdAt = performance.now()
    wakeCreator()
  }
  const releaseCreator = () => {
    if (!held) return
    held = false
  }

  const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo)

  // The lower creator's waves (see `WAVE_SPEED`).
  type Wave = {
    arm: SVGGElement
    pen: SVGGElement
    ink: SVGPathElement
    sh: number[]
    wr: number[]
    tip: number[]
    track: Float32Array // x y nx ny w, every `step` units from the pen's point
    step: number
    len: number
    bottom: number
    angs: Float32Array // the arm's turn…
    across: Float32Array // …and how far across the line it puts the pen's point, ascending
    angsByAcross: Float32Array
    tx: Float32Array // …and where that point is, by angle
    ty: Float32Array
    keys: Float32Array // the author's waves: how far each is from the line, x y at its first `span` points
    nk: number
    span: number
    written: number // how much ink has run out of the pen, units (only the line's first growth)
    phase: number // where in the round of waves, 0…nk
    strength: number
    aim: number
    drift: number // s until a new aim
    mode: "run" | "still" | "hold"
    gain: number // how strong what is on the line is, 1 but on the click
    still: number // ms into the click's stilling
    shownFrom: number // how much of the line was drawn when the click came
    was: string[]
  }
  const waves: Wave[] = []
  {
    const g = svg.getElementById("wave-2")
    const arm = svg.getElementById("creator-2-arm") as SVGGElement | null
    const pen = svg.getElementById("creator-2-pen") as SVGGElement | null
    const ink = svg.getElementById("wave-2-ink") as SVGPathElement | null
    if (g && arm && pen && ink) {
      const sh = nums(g.getAttribute("data-shoulder"))
      const wr = nums(g.getAttribute("data-wrist"))
      const tip = nums(g.getAttribute("data-tip"))
      const track = Float32Array.from(nums(g.getAttribute("data-track")))
      const step = Number(g.getAttribute("data-step")) || 2.5
      const len = Number(g.getAttribute("data-len")) || 0
      const bottom = Number(g.getAttribute("data-bottom")) || len
      const kv = nums(g.getAttribute("data-keys"))
      const nk = Math.max(0, Math.floor(kv[0] || 0))
      const span = Math.max(0, Math.floor(kv[1] || 0))
      const keys = Float32Array.from(kv.slice(2))
      if (sh.length >= 2 && wr.length >= 2 && tip.length >= 2 && track.length >= 10 && len > 0 && nk >= 2 && keys.length === nk * span * 2) {
        const n = 601
        const angs = new Float32Array(n)
        const across = new Float32Array(n)
        const tx = new Float32Array(n)
        const ty = new Float32Array(n)
        const k = Math.PI / 180
        for (let i = 0; i < n; i++) {
          const a1 = -30 + (60 * i) / (n - 1)
          const a2 = PLOT_WRIST * a1
          let x = wr[0] + (tip[0] - wr[0]) * Math.cos(a2 * k) - (tip[1] - wr[1]) * Math.sin(a2 * k)
          let y = wr[1] + (tip[0] - wr[0]) * Math.sin(a2 * k) + (tip[1] - wr[1]) * Math.cos(a2 * k)
          const rx = x - sh[0]
          const ry = y - sh[1]
          x = sh[0] + rx * Math.cos(a1 * k) - ry * Math.sin(a1 * k)
          y = sh[1] + rx * Math.sin(a1 * k) + ry * Math.cos(a1 * k)
          angs[i] = a1
          tx[i] = x
          ty[i] = y
          across[i] = (x - tip[0]) * track[2] + (y - tip[1]) * track[3]
        }
        const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => across[i] - across[j])
        waves.push({
          arm, pen, ink, sh, wr, tip, track, step, len, bottom, angs,
          across: Float32Array.from(order.map((i) => across[i])),
          angsByAcross: Float32Array.from(order.map((i) => angs[i])),
          tx, ty,
          keys, nk, span,
          written: 0,
          phase: Math.random() * nk,
          strength: between(WAVE_STRENGTH), aim: between(WAVE_STRENGTH), drift: between(WAVE_DRIFT),
          mode: "run", gain: 1, still: 0, shownFrom: 0,
          was: ["", "", ""],
        })
      }
    }
  }
  /** Catmull-Rom through the waves, round and round: how far from the line at point `i`, along x (c 0) or y (c 1). */
  const waveAt = (w: Wave, i: number, c: number) => {
    const f = w.phase
    const k1 = Math.floor(f) % w.nk
    const t = f - Math.floor(f)
    const k0 = (k1 + w.nk - 1) % w.nk
    const k2 = (k1 + 1) % w.nk
    const k3 = (k1 + 2) % w.nk
    const at = (k: number) => w.keys[(k * w.span + i) * 2 + c]
    const p0 = at(k0)
    const p1 = at(k1)
    const p2 = at(k2)
    const p3 = at(k3)
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  }
  const stepWave = (w: Wave, dt: number) => {
    const s = dt / 1000
    if (w.mode === "run") {
      w.phase = (w.phase + (w.nk * s) / WAVE_PERIOD) % w.nk
      w.drift -= s
      if (w.drift <= 0) {
        w.aim = between(WAVE_STRENGTH)
        w.drift = between(WAVE_DRIFT)
      }
      w.strength += (w.aim - w.strength) * (1 - Math.exp(-s / 1.5))
    }
    w.written += WAVE_SPEED * boost * s
    if (w.mode === "still") {
      w.still += dt
      const v = Math.min(1, w.still / PEN_FILL_MS)
      w.gain = 1 - v * v * (3 - 2 * v)
      if (v >= 1) {
        w.gain = 0
        w.written = Math.max(w.written, w.len)
        w.mode = "hold"
      }
    }
  }
  const placeWave = (w: Wave) => {
    const tr = w.track
    const n = tr.length / 5
    const amp = w.strength * w.gain
    // the arm, so that the pen's point sways with the waves
    const h = WAVE_SWAY * amp * Math.sin((2 * Math.PI * w.phase) / w.nk)
    const a1 = lerpBy(w.across, w.angsByAcross, h)
    const ai = ((a1 + 30) / 60) * (w.angs.length - 1)
    const i0 = Math.max(0, Math.min(w.angs.length - 2, Math.floor(ai)))
    const px = w.tx[i0] + (w.tx[i0 + 1] - w.tx[i0]) * (ai - i0)
    const py = w.ty[i0] + (w.ty[i0 + 1] - w.ty[i0]) * (ai - i0)
    // how far the real point is from the line's start
    const ex = px - w.tip[0]
    const ey = py - w.tip[1]
    // how much of the line is drawn
    let shown = Math.min(w.len, w.written)
    if (w.mode === "still") {
      const v = Math.min(1, w.still / PEN_FILL_MS)
      shown = w.shownFrom + (w.len - w.shownFrom) * (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2)
    } else if (w.mode === "hold") shown = w.len
    const left: string[] = []
    const right: string[] = []
    const last = Math.min(n - 1, Math.floor(shown / w.step))
    const put = (i: number, t: number) => {
      // point i, or between i and i+1 by t
      const j = Math.min(n - 1, i + 1)
      const lerp = (c: number) => tr[5 * i + c] + (tr[5 * j + c] - tr[5 * i + c]) * t
      let x = lerp(0)
      let y = lerp(1)
      const nx = lerp(2)
      const ny = lerp(3)
      const hw = lerp(4)
      if (amp > 0 && i < w.span) {
        const k = Math.min(w.span - 1, i + 1)
        x += (waveAt(w, i, 0) + (waveAt(w, k, 0) - waveAt(w, i, 0)) * t) * amp
        y += (waveAt(w, i, 1) + (waveAt(w, k, 1) - waveAt(w, i, 1)) * t) * amp
      }
      const sAt = (i + t) * w.step
      if (sAt < WAVE_LEAD) {
        const l = 1 - sAt / WAVE_LEAD
        x += ex * l
        y += ey * l
      }
      left.push(`${(x + nx * hw).toFixed(2)} ${(y + ny * hw).toFixed(2)}`)
      right.push(`${(x - nx * hw).toFixed(2)} ${(y - ny * hw).toFixed(2)}`)
    }
    if (shown > 0.5) {
      for (let i = 0; i <= last; i++) put(i, 0)
      const rem = shown / w.step - last
      if (rem > 0.01 && last < n - 1) put(last, rem)
    }
    const d = left.length > 1 ? `M${left.join(" L")} L${right.reverse().join(" L")}Z` : ""
    const wv = [`rotate(${a1.toFixed(3)} ${w.sh[0]} ${w.sh[1]})`, `rotate(${(PLOT_WRIST * a1).toFixed(3)} ${w.wr[0]} ${w.wr[1]})`, d]
    if (wv[0] !== w.was[0]) w.arm.setAttribute("transform", wv[0])
    if (wv[1] !== w.was[1]) w.pen.setAttribute("transform", wv[1])
    if (wv[2] !== w.was[2]) w.ink.setAttribute("d", wv[2])
    w.was = wv
  }

  let boost = 1
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
    restU: number
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
      const restU = Number(g.getAttribute("data-rest-u")) || 0
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
          arm, pen, sh, wr, track, cycle, period, restU,
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
  const stepPlot = (p: Plot, dt: number) => {
    const quick = 1 + ((boost - 1) / (CLICK_BOOST - 1)) * (PLOT_CLICK - 1)
    p.x += PLOT_SPEED * quick * (dt / 1000)
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
  /** The click: every pen's line made whole, the pen kept down. */
  const fillPens = () => {
    for (const w of waves) {
      if (w.mode !== "run") continue
      w.mode = "still"
      w.still = 0
      w.shownFrom = Math.min(w.len, w.written)
    }
    wakePens()
  }
  /** After it: each pen lifts again in its own time. */
  const releasePens = () => {
    for (const w of waves) {
      if (w.mode !== "run") w.written = Math.max(w.written, w.len)
      w.mode = "run"
      w.gain = 1
    }
  }
  let pensRaf = 0
  let pensAt = 0
  const pensFrame = (now: number) => {
    pensRaf = 0
    // time stands still while the section is off screen or the page hidden
    const dt = pensAt ? Math.min(100, now - pensAt) : 0
    pensAt = now
    const goal = mode === "clearing" || mode === "birth" ? CLICK_BOOST : 1
    boost += (goal - boost) * (1 - Math.exp(-dt / 1000 / BOOST_EASE_S))
    for (const w of waves) {
      stepWave(w, dt)
      placeWave(w)
    }
    for (const p of plots) {
      stepPlot(p, dt)
      placePlot(p)
    }
    if (onScreen && document.visibilityState === "visible") pensRaf = requestAnimationFrame(pensFrame)
    else pensAt = 0
  }
  const wakePens = () => {
    if (!pensRaf && (waves.length || plots.length) && onScreen && document.visibilityState === "visible") pensRaf = requestAnimationFrame(pensFrame)
  }

  /**
   * Before the click: a stroke two thirds of the line long glides along it, from
   * just before its start to just past its end. Dashes of LOOP_SEGMENT with a
   * gap of 2 (longer than the line, so the next dash never shows): at offset
   * LOOP_SEGMENT the dash ends where the line starts, at -1 it begins where
   * the line ends.
   */
  const cycle = (l: Line, fromTop = false) => {
    hide(l)
    l.state = 1
    l.anims = l.strokes.map((s) => {
      s.el.style.strokeDasharray = `${LOOP_SEGMENT} 2`
      const d = Math.min(LOOP_MAX_MS, Math.max(LOOP_MIN_MS, ((s.len * (1 + LOOP_SEGMENT)) / LOOP_SPEED) * 1000))
      const along = [{ strokeDashoffset: String(LOOP_SEGMENT) }, { strokeDashoffset: "-1" }]
      return s.el.animate(fromTop && goesUp.get(s.el) ? along.reverse() : along, {
        duration: d,
        easing: EASE_LOOP,
        fill: "both",
      })
    })
    const mine = l.anims
    Promise.all(mine.map((a) => a.finished))
      .then(() => {
        if (l.anims === mine) hide(l)
      })
      .catch(() => {})
  }

  const tick = () => {
    loopTimer = window.setTimeout(tick, LOOP_EVERY_MS * (0.7 + Math.random() * 0.6))
    if (mode !== "loop" || !onScreen) return
    const free = lines.filter((l) => l.state === 0)
    if (lines.length - free.length >= LOOP_MAX || !free.length) return
    cycle(free[Math.floor(Math.random() * free.length)])
  }

  // The upper Siluet lines: which they are, and whether each stroke's path
  // runs upwards (so a stroke there travels it backwards, from its top down).
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
  const upper = new Set(
    silLines.filter((l) => l.strokes.some((s) => (startY.get(s.el) ?? Infinity) < upperFloor)),
  )
  const startUpper = () => {
    if (mode !== "loop" || !onScreen) return
    const busy = [...upper].filter((l) => l.state !== 0).length
    const free = [...upper].filter((l) => l.state === 0)
    if (busy >= UPPER_MAX || !free.length) return
    cycle(free[Math.floor(Math.random() * free.length)], true)
  }
  let upperTimer = 0
  const upperTick = () => {
    upperTimer = window.setTimeout(upperTick, UPPER_EVERY_MS * (0.7 + Math.random() * 0.6))
    startUpper()
  }
  let lastY = window.scrollY
  let lastScrollStart = 0
  const onScrollDown = () => {
    const y = window.scrollY
    const down = y > lastY
    lastY = y
    const now = performance.now()
    if (down && now - lastScrollStart > UPPER_SCROLL_MS) {
      lastScrollStart = now
      startUpper()
    }
  }

  const reset = () => {
    window.clearTimeout(timer)
    window.clearTimeout(holdTimer)
    fades.forEach((f) => f.cancel())
    fades = []
    lines.forEach(hide)
    mode = "loop"
    releaseCreator()
    releasePens()
  }

  const onScroll = () => {
    const r = host.getBoundingClientRect()
    const vh = window.innerHeight
    if (!r.height) return
    onScreen = r.top < vh && r.bottom > 0
    wakeCreator()
    wakePens()
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
    // Back up above the section: whatever the click drew goes, and the
    // drawing and erasing begins again.
    if (r.top > vh && mode !== "loop") reset()
  }

  /** After the hold: every line erased as it was born, from the smoke outward. */
  const erase = () => {
    if (mode !== "full") return
    mode = "erasing"
    releasePens()
    lines.forEach((l) => {
      l.anims.forEach((a) => a.cancel())
      l.path.setAttribute("mask", `url(#${l.mask})`)
      l.state = 1
      l.anims = l.strokes.map((s) =>
        s.el.animate([{ strokeDashoffset: "0" }, { strokeDashoffset: "-1" }], {
          duration: Math.max(DRAW_MIN_MS, (s.len / ERASE_SPEED) * 1000),
          delay: (l.group === "fum" ? 0 : SILUET_AFTER_MS) + (s.from / ERASE_FRONT_SPEED) * 1000,
          easing: EASE_BIRTH,
          fill: "both",
        }),
      )
    })
    Promise.all(lines.flatMap((l) => l.anims.map((a) => a.finished)))
      .then(() => {
        if (mode !== "erasing") return
        lines.forEach(hide)
        mode = "loop"
      })
      .catch(() => {})
  }

  const birth = () => {
    mode = "birth"
    // the pens' lines first, then the rest from where the lower one ends
    fillPens()
    const first = waves.length || plots.length ? PEN_FILL_MS : 0
    lines.forEach((l) =>
      draw(
        l,
        (s) => first + (l.group === "fum" ? 0 : SILUET_AFTER_MS) + (s.from / FRONT_SPEED) * 1000,
        (s) => Math.max(DRAW_MIN_MS, (s.len / DRAW_SPEED) * 1000),
        EASE_BIRTH,
      ),
    )
    Promise.all(lines.flatMap((l) => l.anims.map((a) => a.finished)))
      .then(() => {
        if (mode !== "birth") return
        releaseCreator()
        mode = "full"
        holdTimer = window.setTimeout(erase, FULL_HOLD_MS)
      })
      .catch(() => {})
  }

  const onClick = () => {
    if (mode === "clearing" || mode === "birth") return
    window.clearTimeout(holdTimer)
    holdCreator()
    if (lines.some((l) => l.state !== 0)) {
      mode = "clearing"
      // the drawn lines alone fade (a creator's head, arm and pen stay)
      fades = lines
        .filter((l) => l.state !== 0)
        .map((l) => l.path.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLEAR_MS, easing: "ease", fill: "forwards" }))
      timer = window.setTimeout(() => {
        lines.forEach(hide)
        fades.forEach((f) => f.cancel())
        fades = []
        birth()
      }, CLEAR_MS)
    } else {
      birth()
    }
  }

  // The whole section takes the click: the photograph's box, which the gold
  // motes' script also listens on (and gives the pointer cursor).
  const box = host.parentElement
  box?.addEventListener("click", onClick)

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
  document.addEventListener("visibilitychange", wakePens)
  onScroll()
  tick()
  upperTick()

  return () => {
    if (creatorRaf) cancelAnimationFrame(creatorRaf)
    if (pensRaf) cancelAnimationFrame(pensRaf)
    document.removeEventListener("visibilitychange", wakePens)
    window.clearTimeout(upperTimer)
    window.clearTimeout(blinkTimer)
    unhookEye()
    if (eyeRaf) cancelAnimationFrame(eyeRaf)
    if (lookRaf) cancelAnimationFrame(lookRaf)
    window.removeEventListener("pointermove", onPointer)
    document.documentElement.removeEventListener("pointerleave", onLeave)
    window.removeEventListener("scroll", onScrollRaf)
    window.removeEventListener("resize", onScrollRaf)
    if (raf) cancelAnimationFrame(raf)
    window.clearTimeout(timer)
    window.clearTimeout(loopTimer)
    window.clearTimeout(holdTimer)
    box?.removeEventListener("click", onClick)
    fades.forEach((f) => f.cancel())
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
  const img = host.parentElement?.querySelector("img")
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
    const phone = matchMedia(PHONE)
    let turn = 0 // which load is current: a swap while one is in flight drops it
    let stop = () => {}
    const load = () => {
      const mine = ++turn
      stop()
      stop = () => {}
      host.innerHTML = ""
      fetch(phone.matches ? SRC_PHONE : SRC)
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
    phone.addEventListener("change", load)
    return () => {
      turn++
      phone.removeEventListener("change", load)
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
