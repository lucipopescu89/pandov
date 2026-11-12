"use client"

import { useEffect, useRef } from "react"
import FLOW from "@/lib/satori-flow-3.json"
import { UNDRAWN_EVENT } from "@/components/satori-sun"

/**
 * Satori 3, "the one who sits / expands inside" (2026-11-12, the author's
 * brief: great circles radiating inward, one after another, concentric,
 * molding to the pendant's outline as they close, and never touching it).
 * At rest none of the author's drawing is shown (a first version that
 * morning set its own lines flowing, three at a time as drawn, then its two
 * great circles stood still round these; the author asked for this). On a
 * hover over the pendant these fade (`HIDE_MS`) while the author's drawing
 * is drawn by hand (`SatoriCore`), and come back once it has been drawn back
 * (`UNDRAWN_EVENT`, `SHOW_MS`).
 *
 * Each circle leaves far out (`FLOW.r0`, 560 from the ring's middle, short
 * of the verse), coming out of the dark (the gold's fade reaches a little past
 * it), and closes on the pendant, bending more and more into its shape until
 * it stands 4 units from the metal, in every hollow of it: under the bird's
 * wings, at the neck, round the tip (the author's asking, the same morning;
 * the first circles closed along rays from the ring's middle and bridged
 * those hollows). They are the level lines of one field
 * (`scripts/satori-flow.py`, from the photograph's outline), the distance to
 * the metal near it and to the ring's middle far from it, so they are
 * concentric and never cross; the page draws between the `LEVELS` taken.
 *
 * One leaves every `CYCLE_S / WAVES` seconds (2s, the pace of Satori 4's
 * rays), fades in as it leaves (`FADE_IN`), slows as it nears the pendant
 * (`EASE`) and fades out from `FADE_OUT_FROM` of the way, late, so the
 * closest, most detailed lines are seen, and is gone as it arrives. Drawn on a canvas over the first circle's box, one screen pixel
 * wide, in the drawing's gold, as the other drawings' lines are; it runs
 * only while the frame is on screen. Under reduced motion nothing is drawn
 * here: the author's drawing stands still instead (`SatoriCore`).
 */

const FRAME_W = 1275
const FRAME_H = 1380
const GOLD = "198, 155, 92" // #C69B5C

/** Seconds a circle takes from the great circle to the pendant, and how many are under way. */
const CYCLE_S = 20
const WAVES = 10
/** Over what share of the way a circle fades in, and from where it fades out. */
const FADE_IN = 0.1
const FADE_OUT_FROM = 0.78
/** It slows as it nears the pendant: the way in is `1 - (1 - u) ** EASE`. */
const EASE = 1.35
/** On a hover they fade out over this long, and back in over this long once the drawing has gone. */
const HIDE_MS = 700
const SHOW_MS = 1400

/** The level lines (`scripts/satori-flow.py`): `LEVELS[k]` is how far line k stands out from the pendant. */
const N = FLOW.points
const LEVELS = FLOW.levels
const LINES = (() => {
  const bin = atob(FLOW.lines)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const tenths = new Int16Array(bytes.buffer) // little-endian, as every browser runs
  return Float32Array.from(tenths, (v) => v / 10)
})()
/** The canvas: the first circle's box, with room for the stroke. */
const SIDE = Math.ceil(2 * FLOW.r0 + 8)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function SatoriFlow() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let scale = 1 // device pixels per frame unit
    let dpr = 1
    const size = () => {
      const cssW = canvas.getBoundingClientRect().width
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.max(1, Math.round(cssW * dpr))
      if (canvas.width !== px) {
        canvas.width = px
        canvas.height = px
      }
      scale = px / SIDE
    }
    size()
    // The canvas's origin, in the frame's units.
    const ox = FLOW.cx - SIDE / 2
    const oy = FLOW.cy - SIDE / 2

    /** The circle `e` of the way in (0 leaving, 1 at the pendant): between the two level lines round it. */
    const circle = (e: number) => {
      const level = FLOW.start + (LEVELS[0] - FLOW.start) * e
      let k = 0
      while (k < LEVELS.length - 2 && LEVELS[k + 1] < level) k++
      const f = Math.min(1, Math.max(0, (level - LEVELS[k]) / (LEVELS[k + 1] - LEVELS[k])))
      const a = k * N * 2
      const b = a + N * 2
      ctx.beginPath()
      for (let i = 0; i < N * 2; i += 2) {
        const x = LINES[a + i] + (LINES[b + i] - LINES[a + i]) * f
        const y = LINES[a + i + 1] + (LINES[b + i + 1] - LINES[a + i + 1]) * f
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }

    const draw = (t: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale)
      ctx.lineWidth = dpr / scale // one screen pixel
      ctx.lineJoin = "round"
      const g = ctx.createRadialGradient(FLOW.fade.cx, FLOW.fade.cy, 0, FLOW.fade.cx, FLOW.fade.cy, FLOW.fade.r)
      g.addColorStop(0, `rgba(${GOLD}, ${FLOW.fade.peak})`)
      g.addColorStop(1, `rgba(${GOLD}, 0)`)
      ctx.strokeStyle = g
      for (let w = 0; w < WAVES; w++) {
        const u = (((t / CYCLE_S + w / WAVES) % 1) + 1) % 1
        const alpha = smooth(0, FADE_IN, u) * (1 - smooth(FADE_OUT_FROM, 1, u))
        if (alpha <= 0.002) continue
        ctx.globalAlpha = alpha
        circle(1 - Math.pow(1 - u, EASE))
      }
      ctx.globalAlpha = 1
    }

    // Under reduced motion the author's drawing stands instead.
    if (still) return

    let on = false
    let t = 0
    const ro = new ResizeObserver(() => {
      size()
      if (!on) draw(t)
    })
    ro.observe(canvas)

    // A mouse over the pendant: they fade while the drawing is drawn, and
    // come back once it has been drawn back. (Circles closing inside the ring
    // on a hover, 2026-11-12, were taken out the same afternoon: they drew
    // the eye from the drawing.)
    const frame = canvas.parentElement
    const photo = frame?.querySelector<HTMLElement>(".sp-photo")
    let outerOn = true
    let outerOffAt = 0
    const hide = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      canvas.style.transition = `opacity ${HIDE_MS}ms ease`
      canvas.style.opacity = "0"
      outerOn = false
      outerOffAt = performance.now() + HIDE_MS
    }
    const show = () => {
      outerOn = true
      canvas.style.transition = `opacity ${SHOW_MS}ms ease`
      canvas.style.opacity = "1"
    }
    photo?.addEventListener("pointerenter", hide)
    frame?.addEventListener(UNDRAWN_EVENT, show)

    let raf = 0
    let last = 0
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      t += dt
      last = now
      // the great circles are not drawn while hidden
      if (outerOn || now < outerOffAt) draw(t)
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) {
        on = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      } else if (!e.isIntersecting && on) {
        on = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(canvas)
    draw(t)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      photo?.removeEventListener("pointerenter", hide)
      frame?.removeEventListener(UNDRAWN_EVENT, show)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        left: `${((FLOW.cx - SIDE / 2) / FRAME_W) * 100}%`,
        top: `${((FLOW.cy - SIDE / 2) / FRAME_H) * 100}%`,
        width: `${(SIDE / FRAME_W) * 100}%`,
        aspectRatio: "1 / 1",
        pointerEvents: "none",
      }}
    />
  )
}
