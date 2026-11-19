"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { clamp01, smooth, words as wordsAt, ARRIVE, arriveOpacity, arriveLeft, ARRIVE_GLIDE_VW } from "@/lib/making-rhythm"

/**
 * The turning piece on /making (2026-11-18, the author's asking): the render
 * "Secvente Harag", the piece on its branch turning once round, played by the
 * scroll. For now it stands under the fire, on the site's dark (#202020), and
 * the white that used to come over the fire comes after it instead.
 *
 *  - **Held the window's height** (`position: sticky`, the frame drawn the
 *    window's full height, the branch running off its top and foot as it does
 *    in the render), in the middle of the page.
 *  - **It turns only while it is held** (the author's asking, the same
 *    morning): it comes up out of the dark on frame 0 (`ARRIVE`, until 2026-11-19, see below), still; once
 *    it is fixed in the window it turns once round (frames 0 … 40, the last
 *    the first again) and on into the next turn, `MORE` frames, the first
 *    `MORE_CLEAN` of them clear and the rest as the window goes white over it,
 *    as the fire's did before; only then does the page move on, and the scan
 *    comes on white. One even pace throughout the held stretch.
 *  - **Smooth between frames**: 41 frames for a whole turn is 9° a frame, so
 *    the canvas lays the next frame over the one before by how far the scroll
 *    has gone between them (eased, so each frame is seen clean for a moment).
 *    Every frame is decoded once into a bitmap before it is used, and the
 *    canvas draws at the files' own size, scaled by the GPU; a scroll that
 *    lands on the same picture draws nothing.
 *  - **At rest it is one frame** (the author's asking, the same morning: the
 *    laying over is for the movement only): the picture follows the scroll a
 *    touch behind (`FOLLOW_MS`), and once the scroll has been still for
 *    `REST_MS` it glides on to the nearest whole frame, so two frames are
 *    never left one over the other.
 *  - **Light**: the frames are AVIF on the page's ground, 578 × 1200 on a
 *    computer (670KB in all), 384 × 800 on a phone (320KB), written by
 *    `scripts/making-harag.py`. They are fetched only when the passage is two
 *    windows away, the first frame first.
 *
 * **Since 2026-11-19** (the author's asking, with a screenshot): it no longer
 * comes up with the page from below. Its stage rises in still empty (the dark
 * of the fire's veil before it, so nothing is seen to move), and once it is
 * held the piece comes in **from the right, out of transparency**, on frame
 * 0, still (`ENTER` of a window of scroll), to stand right of the middle
 * (`--hg-x`, the branch at about two thirds of the width, as in the
 * screenshot); only then does it turn. `--s4` was lengthened by the same
 * `ENTER`, so the turn keeps its pace. On the left, on the line of the words
 * above (`left` 489 of the frame's 1920), its words (`words`) come **only
 * while the lamp is out, frames 12–21** (`WORDS_IN`, `WORDS_OUT`), by opacity
 * alone, and go before it lights again.
 *
 * **Later the same morning** (the author's second asking, and the page's one
 * rhythm, `lib/making-rhythm.ts`):
 *  - it comes in from much nearer (`ARRIVE_GLIDE_VW`, 8vw, not from the
 *    screen's edge), so it comes slowly, and it is **already turning as it
 *    settles** (`TURN_FROM`, a few frames by then);
 *  - **its words fade as the others do** (`FADE`): so that they still come
 *    and go only while the lamp is out, **the turn slows through frames
 *    12–21** (`SLOW_SPAN` of a window for those nine frames, 0.6 at the even
 *    pace), the words in its middle;
 *  - **it begins under the fire's end**: its section starts as the fire's
 *    veil is done (a negative margin, its grounds transparent over the page's
 *    dark), so there is no empty scroll between them;
 *  - **it stays on the dark** and leaves by fading (`LEAVE`) while it turns on
 *    (`MORE` frames); the scan comes in where it was, and the white comes at
 *    the scan's end. The white that came over it here is gone.
 *
 * Later again (the author's asking): **nearer the middle** (`--hg-x` 9vw, 16
 * before: there is room), and it begins 0.3 of a window before the fire's
 * passage ends, the fire going out at the top (the fire is no longer held).
 * And **it drifts from right to left the whole time it is held**, slowly, at
 * one pace, from 9vw right of the middle as it comes in to the middle as it
 * fades out (`--hg-drift`), its glide in unchanged.
 *
 * **Later still** (the author's asking): **no drift**. It comes in from the
 * right as before and stays where it comes to, near its words and the middle
 * (`--hg-x` 4vw: about where the drift had brought it while the words were
 * read).
 */

const FRAMES = 41
const PHONE = "(max-width: 767px)"
/**
 * The frames. A phone (2026-11-19, the author's asking: lighter, smoother)
 * takes every other frame (`step` 2: 21 of the 41), from `harag/1000`
 * (480 × 997, AVIF q60, 167KB in all: sharp on a phone's screen; the first
 * try, `harag/620` at 300 × 623, q38, was too soft, the author's word), and
 * goes from one to the next by the same laying over.
 */
const SETS = {
  computer: { dir: "/images/making/harag/1200", w: 578, h: 1200, step: 1 },
  phone: { dir: "/images/making/harag/1000", w: 480, h: 997, step: 2 },
}
/** Bump with a new export, so browsers fetch the new frames. */
const VERSION = 1
/** Held, it begins to turn this far into its way in, windows of scroll (it comes in over `ARRIVE`). */
const TURN_FROM = 0.3
/** Frames in one turn (frame 40 is frame 0 again). */
const TURN = FRAMES - 1
/**
 * Where the turn begins and ends (2026-11-19, the author's asking: "the lamp
 * goes on and off too often"): from frame 35 round to frame 34, one turn less
 * one frame, so the lamp is on, goes out once (frames 12–21), comes on, and is
 * going out again as it leaves; until then it went from frame 0 on into the
 * next turn (`MORE` 10). A phone, which has the even frames only, from 36.
 */
const START = { computer: 35, phone: 36 }
/** The lamp is out over these frames (of the render's own numbering): the turn slows through them, and the words come and go there. */
const DARK_FRAMES = [12, 21] as const
/** The slow stretch, windows; a phone's is longer, its words coming later in it, once the piece has gone dark. */
const SLOW_SPAN = { computer: 1.0, phone: 1.4 }
const PHONE_WORDS_LATE = 0.6
/** It fades out over the last this-many windows of its held stretch (`--s4`). */
const LEAVE = 0.35
/** On a phone it begins to come in when its window's top is this share of the window from the top (the page flows there). */
const PHONE_LEAD = 0.65
/** The picture follows the scroll with this time constant, ms (so it can glide to rest without a jump). */
const FOLLOW_MS = 70
/** Still this long, ms, and it settles on the nearest whole frame. */
const REST_MS = 140


type Frame = ImageBitmap | HTMLImageElement

async function loadFrame(url: string): Promise<Frame> {
  const img = new Image()
  img.decoding = "async"
  img.src = url
  await img.decode()
  // A bitmap stays decoded; an <img> off the page may be decoded again on a later draw.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(img)
    } catch {
      /* fall back to the image itself */
    }
  }
  return img
}

/**
 * Where the turn is, in steps from its first frame (0 … `length`), `y`
 * windows of scroll into the held stretch: still until `TURN_FROM`, then at
 * the even pace `P` (windows a step), slower through the dark steps `d0` …
 * `d1` (over `slow` windows), and at `P` again.
 */
function frameAt(y: number, P: number, d0: number, d1: number, slow: number, length: number) {
  const z = y - TURN_FROM
  if (z <= 0) return 0
  const a = d0 * P
  if (z < a) return z / P
  if (z < a + slow) return d0 + ((z - a) / slow) * (d1 - d0)
  return Math.min(length, d1 + (z - a - slow) / P)
}

export function MakingHarag({ words, color }: { words?: ReactNode; color?: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wordsRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const wordsEl = wordsRef.current
    if (!section || !stage || !canvas) return
    const phone = window.matchMedia(PHONE).matches
    const set = phone ? SETS.phone : SETS.computer
    // A phone (2026-11-19, the author's asking: a whole empty screen under the
    // fire): the page flows there, so it comes in as its window rises, from
    // when its top is `PHONE_LEAD` of the window from the top, right under
    // the fire going out, and is fully there as it is held.
    // So too on a computer while the page flows (`.mk-flow`).
    const lead = phone || section.closest(".mk-flow") ? PHONE_LEAD : 0
    canvas.width = set.w
    canvas.height = set.h
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return
    ctx.imageSmoothingQuality = "high"
    // The page's dark until the first frame is in (a canvas without alpha starts black).
    ctx.fillStyle = "#202020"
    ctx.fillRect(0, 0, set.w, set.h)

    const frames: (Frame | undefined)[] = new Array(FRAMES)
    let pos = 0
    /** Where the scroll puts the turn (frames, 0 … TURN + MORE, not wrapped), and where the picture is. */
    let target = 0
    let shown = -1
    let lastMove = 0
    let tick = 0
    let prevT = 0
    let drawn = ""
    let raf = 0
    let alive = true

    /** The loaded frame nearest to `i`, looking back first. */
    const near = (i: number): Frame | undefined => {
      for (let d = 0; d < FRAMES; d++) {
        const a = frames[i - d]
        if (a) return a
        const b = frames[i + d]
        if (b) return b
      }
      return undefined
    }

    const step = set.step
    // The turn in steps from its first frame; the frame each step shows.
    const first = phone ? START.phone : START.computer
    const length = TURN - step // to the frame before the first: 35 … 40/0 … 34
    const frameOf = (t: number) => (first + t) % TURN
    const d0 = (DARK_FRAMES[0] - first + TURN) % TURN
    const d1 = d0 + (DARK_FRAMES[1] - DARK_FRAMES[0])
    const slow = phone ? SLOW_SPAN.phone : SLOW_SPAN.computer
    const even = length - (d1 - d0)
    const draw = () => {
      const i = Math.min(length, Math.floor(pos / step) * step)
      const f = (pos - i) / step
      const fi = frameOf(i)
      const a = frames[fi] ?? near(fi)
      if (!a) return
      const b = f > 0.002 && i < length ? frames[frameOf(i + step)] : undefined
      const mix = b ? smooth(f) : 0
      const key = `${i}:${frames[fi] ? 1 : 0}:${b ? mix.toFixed(3) : "-"}`
      if (key === drawn) return
      drawn = key
      ctx.globalAlpha = 1
      ctx.drawImage(a, 0, 0, set.w, set.h)
      if (b && mix > 0.002) {
        ctx.globalAlpha = mix
        ctx.drawImage(b, 0, 0, set.w, set.h)
        ctx.globalAlpha = 1
      }
    }

    // What was last written, so a scroll that changes nothing writes nothing.
    const last: Record<string, string> = {}
    const style = (el: HTMLElement, key: string, prop: string, value: string) => {
      if (last[key] === value) return
      last[key] = value
      el.style.setProperty(prop, value)
    }

    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const r = section.getBoundingClientRect()
      // Windows of scroll since it was held, and of its whole held stretch.
      const y = -r.top / vh
      const S = Math.max(1, (r.height - vh) / vh)
      // The even pace, so that the turn fills the stretch.
      const P = Math.max(0.01, (S - TURN_FROM - slow) / even)
      const enter = clamp01((y + lead) / (ARRIVE + lead))
      const turned = frameAt(y, P, d0, d1, slow, length)
      if (shown < 0) shown = Math.round(turned)
      if (turned !== target) {
        target = turned
        lastMove = performance.now()
      }
      // From the right: what is left of its glide (1 → 0), eased out; out of
      // transparency; and out again over its last `LEAVE`.
      style(canvas, "x", "--hg-in", arriveLeft(enter).toFixed(4))
      const leave = 1 - smooth((y - (S - LEAVE)) / LEAVE)
      style(canvas, "o", "opacity", (arriveOpacity(enter) * leave).toFixed(3))
      // In the slow stretch of the dark frames, fading as all the words do.
      const y0 = TURN_FROM + d0 * P
      // A phone: later, once the piece has gone dark, its words lying over it there.
      if (wordsEl) style(wordsEl, "t", "opacity", wordsAt(y, y0 + (phone ? PHONE_WORDS_LATE : 0), y0 + slow).toFixed(3))
      if (!tick) {
        prevT = 0
        tick = requestAnimationFrame(follow)
      }
    }
    // The picture after the scroll: a touch behind it while it moves, and
    // onto the nearest whole frame once it rests. Past frame 40 the frames
    // begin again from 0.
    const follow = (t: number) => {
      tick = 0
      const dt = prevT ? Math.min(64, t - prevT) : 16
      prevT = t
      const resting = t - lastMove > REST_MS
      const goal = resting ? Math.round(target / step) * step : target
      shown += (goal - shown) * (1 - Math.exp(-dt / FOLLOW_MS))
      if (Math.abs(goal - shown) < 0.004) shown = goal
      pos = shown
      draw()
      if (!resting || shown !== goal) tick = requestAnimationFrame(follow)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    // Fetch the frames once the passage is near: the first, then the rest in order, a few at a time.
    let started = false
    const start = () => {
      if (started) return
      started = true
      const url = (i: number) => `${set.dir}/${String(i).padStart(2, "0")}.avif?v=${VERSION}`
      const got = (i: number) => (fr: Frame) => {
        if (!alive) return
        frames[i] = fr
        drawn = ""
        onScroll()
      }
      // In the turn's order, from its first frame.
      let next = step
      const pump = async () => {
        while (alive && next <= length) {
          const i = frameOf(next)
          next += step
          await loadFrame(url(i)).then(got(i), () => {})
        }
      }
      loadFrame(url(frameOf(0)))
        .then(got(frameOf(0)), () => {})
        .finally(() => {
          for (let k = 0; k < 4; k++) pump()
        })
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          start()
          io.disconnect()
        }
      },
      { rootMargin: "200% 0px" },
    )
    io.observe(section)

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      alive = false
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (tick) cancelAnimationFrame(tick)
      frames.forEach((f) => {
        if (f && "close" in f) f.close()
      })
    }
  }, [])

  return (
    <section ref={sectionRef} className="mk-hg" data-mk="harag" aria-label="The piece on its branch, turning once round">
      <style>{CSS}</style>
      <div ref={stageRef} className="mk-hg-stage">
        <canvas ref={canvasRef} className="mk-hg-canvas" width={SETS.computer.w} height={SETS.computer.h} />
        {words ? (
          <p ref={wordsRef} className="mk-hg-words" style={{ color }}>
            {words}
          </p>
        ) : null}
      </div>
    </section>
  )
}

const CSS = `
/* It begins under the fire's end: 0.3 of a window before the fire's passage ends (the fire going out at the top,
   nearly gone), on the page's dark, its grounds transparent, above the fire. */
.mk-hg{position:relative;z-index:3;height:calc(var(--vh) + var(--s4));margin-top:calc(-1.3 * var(--vh));background:transparent}
.mk-hg-stage{position:sticky;top:0;height:var(--vh);overflow:hidden;display:flex;justify-content:center}
/* Where it stands, a little right of the middle, near its words (--hg-x), and the rest of its glide in from the
   right (--hg-in, 1 → 0); once in, it stays there. */
.mk-hg-canvas{--hg-x:4vw;--hg-in:1;--hg-glide:${ARRIVE_GLIDE_VW}vw;display:block;flex:none;align-self:center;
  height:100%;width:auto;aspect-ratio:578/1200;max-width:none;opacity:0;
  transform:translateX(calc(var(--hg-x) + var(--hg-in) * var(--hg-glide)));will-change:opacity,transform}
/* Its words: on the line of the words above, airy, each line whole. */
.mk-hg-words{position:absolute;z-index:2;left:${+((489 / 1920) * 100).toFixed(3)}vw;top:25%;margin:0;line-height:3;opacity:0;pointer-events:none}
.mk-hg-words>span{display:block;white-space:nowrap}
/* The page flowing on a computer (.mk-flow): right after the fire, coming in as its window rises (PHONE_LEAD), as on a phone. */
@media (min-width:768px){.mk-flow .mk-hg{margin-top:0}}
@media (max-width:767px){
  /* Centred, a shorter glide, and never as wide as to bring the piece (8% … 94% of the frame's width) within 24px
     of the screen's sides; its width from its height, never from the canvas's own size (Safari). */
  /* A phone: right after the fire (not held there); it comes in as its window rises (PHONE_LEAD). */
  .mk-hg{margin-top:0}
  .mk-hg-canvas{--hg-x:0px;--hg-glide:5vw;height:min(100%, calc((100vw - 48px) / .88 * 1200 / 578))}
  /* A phone has no room beside it: the words stand low, over the dark branch (the lamp is out while they are read). */
  .mk-hg-words{left:8vw;top:auto;bottom:9%;text-shadow:0 0 14px rgba(0,0,0,.7)}
}
`
