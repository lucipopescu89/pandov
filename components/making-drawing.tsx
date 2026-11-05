"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

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
 * middle of the rhombi, but to the side away from the pointer, like a
 * reflection (`PUPIL_SIDE`; the limits are measured by the script and
 * written on the eye's <g>). The nearer the pointer, the less they lean
 * (`LOOK_REACH_PX`); each follows with its own lag (`PUPIL_LAG_S`,
 * `IRIS_LAG_S`), and both go back to the middle when the pointer leaves the
 * page. A touch screen has no pointer to follow, so there it looks ahead.
 *
 * Open, it blinks now and then, at random (`BLINK_EVERY_MS`), sometimes twice
 * (`BLINK_TWICE`): quick down, a little slower up, as an eye does. A click
 * on the eye blinks it and takes the reader to /making, the page of the film
 * (the author's asking, the same day); that click is the eye's alone, so it
 * neither breathes the figures out nor sends the motes' wave.
 *
 * The Creator levitates as Emperor does on Second Wind (`.bp-float`: 9 units
 * up and down, a breath every 7s; `CREATOR_REACH`, `CREATOR_CYCLE_S`). On the
 * click it comes to rest in its place (`CREATOR_SETTLE_MS`), so the smoke
 * leaves the tulnic where the drawing has it, trembles a little for under a
 * second (`CREATOR_SHAKE`, `CREATOR_SHAKE_MS`; at first it trembled all
 * through the birth, and the author asked for it shorter) and stays still
 * while the figures are breathed out; once they are all drawn it floats on
 * (the author's asking, 2026-11-05). Written to the group's transform each frame while the section
 * is on screen.
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

const SRC = "/images/home/making-drawing.svg"
/**
 * The phone's drawing (2026-11-05, the author's frame "Making - Mobile"): its
 * own figures, fewer lines and the eye moved, written by the same script with
 * `--mobile`. Its viewBox is the photograph's box in the phone frame's units,
 * so the page lays it over the photograph's box exactly as it lays the
 * computer's. Chosen by the same query as the phone's layout in
 * `making-section.tsx`, and swapped when the screen crosses it.
 */
const SRC_PHONE = "/images/home/making-drawing-mobile.svg"
const PHONE = "(max-width: 767px)"

/** The figures that are drawn; the rest stand still. */
const DRAWN = ["fum", "siluet-1", "siluet-2", "siluet-3", "vector-89"]

/** Before the click: the travelling stroke's length, as a share of its line's (a third until the author's asking, the same day). */
const LOOP_SEGMENT = 2 / 3
/** …how fast it goes, frame units a second, and its shortest and longest journey. */
const LOOP_SPEED = 110
const LOOP_MIN_MS = 3000
const LOOP_MAX_MS = 12000
/** A new line starts this often… */
const LOOP_EVERY_MS = 650
/** …while fewer than this many are in play. */
const LOOP_MAX = 5

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
/**
 * The pupil goes the other way (2026-11-05, the author's asking): within the
 * rhombi's empty middle it stands on the side away from the pointer, as a
 * glint of light would, reflected, while the eyeball and the rhombi still turn
 * towards it. 1 sends it with them, as it went at first.
 */
const PUPIL_SIDE = -1
const IRIS_LAG_S = 0.45
const BALL_LAG_S = 0.3

/** A blink: the lid comes down in this long and goes up in this long… */
const BLINK_DOWN_MS = 110
const BLINK_UP_MS = 190
/** …one every so often (a random wait between the two), sometimes twice running. */
const BLINK_EVERY_MS: [number, number] = [2600, 7500]
const BLINK_TWICE = 0.18
/** Where a click on the eye takes the reader, once it has blinked. */
const EYE_HREF = "/making"

/** The Creator's levitation: how far up and down (frame units), one breath in seconds. */
const CREATOR_REACH = 9
const CREATOR_CYCLE_S = 7
/** On the click: how long it takes to come to rest, and how far it trembles (frame units). */
const CREATOR_SETTLE_MS = 300
const CREATOR_SHAKE = 1.1
/** The trembling lasts this long from the click, swelling as it comes to rest and dying away after. */
const CREATOR_SHAKE_MS = 800

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
  const groups = DRAWN.map((id) => svg.getElementById(id)).filter(Boolean) as SVGGElement[]

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
  let onEye = () => go(EYE_HREF)
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

  // Under reduced motion: everything shown, drawn, at once, and the eye open.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lines.forEach((l) => l.path.removeAttribute("mask"))
    setEye(0)
    return () => hit.removeEventListener("click", onEyeClick)
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
    px += (PUPIL_SIDE * aimX * pupilMax - px) * kp
    py += (PUPIL_SIDE * aimY * pupilMax - py) * kp
    irisEl?.setAttribute("transform", `translate(${ix.toFixed(2)} ${iy.toFixed(2)})`)
    pupilEl?.setAttribute("transform", `translate(${(ix + px).toFixed(2)} ${(iy + py).toFixed(2)})`)
    const left = Math.abs(aimX * ballMaxX - bx) + Math.abs(aimY * ballMaxY - by) + Math.abs(aimX * irisMax - ix) + Math.abs(aimY * irisMax - iy) + Math.abs(PUPIL_SIDE * aimX * pupilMax - px) + Math.abs(PUPIL_SIDE * aimY * pupilMax - py)
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
  onEye = () => blink(() => go(EYE_HREF))

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

  // The Creator: floating, or held still and trembling during the birth.
  const creatorG = svg.getElementById("the-creator")
  let held = false
  let floatT0 = performance.now()
  let baseY = 0 // the float alone, without the trembling
  let holdAt = 0
  let holdFromY = 0
  let creatorRaf = 0
  const ph = [0, 1, 2, 3].map(() => Math.random() * Math.PI * 2)
  const creatorFrame = (now: number) => {
    creatorRaf = 0
    if (!creatorG) return
    let shake: number
    if (held) {
      const t = now - holdAt
      const u = Math.min(1, t / CREATOR_SETTLE_MS)
      baseY = holdFromY * Math.pow(1 - u, 3)
      shake = t < CREATOR_SETTLE_MS ? u : Math.max(0, 1 - (t - CREATOR_SETTLE_MS) / (CREATOR_SHAKE_MS - CREATOR_SETTLE_MS))
    } else {
      baseY = -CREATOR_REACH * Math.sin((2 * Math.PI * (now - floatT0)) / (CREATOR_CYCLE_S * 1000))
      shake = 0
    }
    let x = 0
    let y = baseY
    if (shake > 0) {
      const t = now / 1000
      const a = CREATOR_SHAKE * shake
      x += a * (0.6 * Math.sin(t * 71 + ph[0]) + 0.4 * Math.sin(t * 112 + ph[1]))
      y += a * (0.6 * Math.sin(t * 86 + ph[2]) + 0.4 * Math.sin(t * 45 + ph[3]))
    }
    creatorG.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
    // Held and done trembling, it stands still: no need to draw it again.
    const still = held && now - holdAt > CREATOR_SHAKE_MS
    if (onScreen && !still) creatorRaf = requestAnimationFrame(creatorFrame)
  }
  const wakeCreator = () => {
    if (!creatorRaf && onScreen && creatorG) creatorRaf = requestAnimationFrame(creatorFrame)
  }
  const holdCreator = () => {
    if (held) return
    held = true
    holdAt = performance.now()
    holdFromY = baseY
    wakeCreator()
  }
  const releaseCreator = () => {
    if (!held) return
    held = false
    floatT0 = performance.now() // from its place, rising, as it left it
    wakeCreator()
  }

  /**
   * Before the click: a stroke two thirds of the line long glides along it, from
   * just before its start to just past its end. Dashes of LOOP_SEGMENT with a
   * gap of 2 (longer than the line, so the next dash never shows): at offset
   * LOOP_SEGMENT the dash ends where the line starts, at -1 it begins where
   * the line ends.
   */
  const cycle = (l: Line) => {
    hide(l)
    l.state = 1
    l.anims = l.strokes.map((s) => {
      s.el.style.strokeDasharray = `${LOOP_SEGMENT} 2`
      const d = Math.min(LOOP_MAX_MS, Math.max(LOOP_MIN_MS, ((s.len * (1 + LOOP_SEGMENT)) / LOOP_SPEED) * 1000))
      return s.el.animate([{ strokeDashoffset: String(LOOP_SEGMENT) }, { strokeDashoffset: "-1" }], {
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

  const reset = () => {
    window.clearTimeout(timer)
    window.clearTimeout(holdTimer)
    fades.forEach((f) => f.cancel())
    fades = []
    lines.forEach(hide)
    mode = "loop"
    releaseCreator()
  }

  const onScroll = () => {
    const r = host.getBoundingClientRect()
    const vh = window.innerHeight
    if (!r.height) return
    onScreen = r.top < vh && r.bottom > 0
    wakeCreator()
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
    // Back up above the section: whatever the click drew goes, and the
    // drawing and erasing begins again.
    if (r.top > vh && mode !== "loop") reset()
  }

  /** After the hold: every line erased as it was born, from the smoke outward. */
  const erase = () => {
    if (mode !== "full") return
    mode = "erasing"
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
    lines.forEach((l) =>
      draw(
        l,
        (s) => (l.group === "fum" ? 0 : SILUET_AFTER_MS) + (s.from / FRONT_SPEED) * 1000,
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
      fades = groups.map((g) =>
        g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLEAR_MS, easing: "ease", fill: "forwards" }),
      )
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
  onScroll()
  tick()

  return () => {
    if (creatorRaf) cancelAnimationFrame(creatorRaf)
    window.clearTimeout(blinkTimer)
    hit.removeEventListener("click", onEyeClick)
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

export function MakingDrawing() {
  const hostRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router

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
