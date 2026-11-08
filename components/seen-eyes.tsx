"use client"

import { useEffect, useId, useRef } from "react"
import { useRouter } from "next/navigation"
import { EYE_SVG, EYE_VIEWBOX } from "@/lib/seen-eye"
import { FROM_EYE_KEY, RETURN_KEY } from "@/lib/seen-key"

/**
 * The way out of /seen (2026-11-08, the author's asking): in place of the top
 * and bottom menus, a pair of small eyes, the homepage's Making eye and its
 * mirror image, as a face has them. A click takes the reader back where they
 * came from: back in the browser's history when they came in through the eye,
 * to the homepage when they came in by a link (`FROM_EYE_KEY` in
 * `lib/seen-key.ts`, set by `making-drawing.tsx`). Going back, they leave
 * `RETURN_KEY`, and the homepage opens on the Making eye where it was.
 *
 * - They open as the page opens and blink now and then, both together,
 *   sometimes twice, as the homepage's eye does (the same timings).
 * - They follow the pointer, but look straight ahead when it comes near them
 *   (`NEAR_PX`): the author's worry was a pointer between the two eyes, where
 *   following it would turn them inward, cross-eyed. A touch screen has no
 *   pointer, so there they look ahead.
 * - Under reduced motion they stand open and still.
 */


/** One eye's width on the page, px. */
const EYE_W = 96
/** The space between the two eyes, px. */
const EYE_GAP = 18
/** Within this distance of the pair's middle the eyes look straight ahead. */
const NEAR_PX = 110
/** How far the eyeball may move within the lids, frame units (the homepage's `data-ball-max`). */
const BALL_MAX_X = 45
const BALL_MAX_Y = 14
/** At this distance (px) the eyes lean ~63% of the way toward the pointer. */
const LEAN_PX = 260
/** How quickly the eyeballs catch up, per frame. */
const FOLLOW = 0.12
/** Opening on arrival, and a blink: down fast, up a little slower. */
const OPEN_MS = 1400
const BLINK_DOWN_MS = 110
const BLINK_UP_MS = 190
const BLINK_EVERY_MS: [number, number] = [2600, 7500]
const BLINK_TWICE = 0.18

const nums = (s: string | null) => (s ? s.trim().split(/\s+/).map(Number) : [])
const pathOf = (p: number[]) => {
  let d = ""
  for (let i = 0; i + 1 < p.length; i += 2) d += `${i ? " L" : "M"}${p[i].toFixed(1)} ${p[i + 1].toFixed(1)}`
  return d + "Z"
}
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

/**
 * `place` sets the wrapper: a <header> above the grid, a <footer> below it.
 * Besides being what they are, that keeps them out of the soft entrance in
 * `public/pandov-fx.js`, which leaves headers and footers alone: the eyes at
 * the foot of the page sit inside the last 10% of the screen, where that
 * entrance never fires, and they stayed hidden (the author's report).
 */
export function SeenEyes({ place }: { place: "header" | "footer" }) {
  const Wrap = place
  const router = useRouter()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const hostRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const svgs = Array.from(host.querySelectorAll("svg"))
    // The drawing goes in once, here, not through React: React re-wrote it on
    // every render of the page around it, and the eyes it was animating were
    // no longer the ones on screen.
    svgs.forEach((svg, k) => {
      svg.innerHTML = EYE_SVG.split("__S__").join(`-${uid}-${k}`)
    })

    // The lid and the cover of each eye, eased between shut (1) and open (0).
    const parts = svgs.flatMap((svg) =>
      Array.from(svg.querySelectorAll<SVGPathElement>("[data-open][data-closed]")).map((el) => ({
        el,
        open: nums(el.getAttribute("data-open")),
        shut: nums(el.getAttribute("data-closed")),
      })),
    )
    const setEye = (t: number) => {
      for (const p of parts) {
        if (p.open.length !== p.shut.length) continue
        p.el.setAttribute("d", pathOf(p.open.map((v, i) => v + (p.shut[i] - v) * t)))
      }
    }
    const balls = svgs.map((svg) => svg.querySelector<SVGGElement>("[id^='eye-ball']"))

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEye(0)
      return
    }

    let t = 1
    let raf = 0
    let timer = 0
    let blinking = false
    const move = (to: number, ms: number, done?: () => void) => {
      const from = t
      const start = performance.now()
      const dur = Math.max(1, ms * Math.abs(to - from))
      cancelAnimationFrame(raf)
      const step = (now: number) => {
        const u = Math.min(1, (now - start) / dur)
        t = from + (to - from) * ease(u)
        setEye(t)
        if (u < 1) raf = requestAnimationFrame(step)
        else done?.()
      }
      raf = requestAnimationFrame(step)
    }
    const blink = (twice: boolean) => {
      if (blinking) return
      blinking = true
      move(1, BLINK_DOWN_MS, () =>
        move(0, BLINK_UP_MS, () => {
          blinking = false
          if (twice) window.setTimeout(() => blink(false), 140)
        }),
      )
    }
    const nextBlink = () => {
      const [a, b] = BLINK_EVERY_MS
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") blink(Math.random() < BLINK_TWICE)
        nextBlink()
      }, a + Math.random() * (b - a))
    }
    move(0, OPEN_MS, nextBlink)

    // Following the pointer, or looking ahead when it is near or gone.
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    let follow = 0
    const aim = (px: number, py: number) => {
      const r = host.getBoundingClientRect()
      const dx = px - (r.left + r.width / 2)
      const dy = py - (r.top + r.height / 2)
      const d = Math.hypot(dx, dy)
      if (d < NEAR_PX) {
        tx = 0
        ty = 0
      } else {
        const lean = 1 - Math.exp(-d / LEAN_PX)
        tx = (dx / d) * lean
        ty = (dy / d) * lean
      }
      if (!follow) follow = requestAnimationFrame(glide)
    }
    const glide = () => {
      x += (tx - x) * FOLLOW
      y += (ty - y) * FOLLOW
      balls.forEach((b, k) => {
        // The second eye is the first drawn mirrored, so its x runs the other way.
        const sx = k === 1 ? -1 : 1
        b?.setAttribute("transform", `translate(${(sx * x * BALL_MAX_X).toFixed(2)} ${(y * BALL_MAX_Y).toFixed(2)})`)
      })
      follow = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(glide) : 0
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") aim(e.clientX, e.clientY)
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      if (!follow) follow = requestAnimationFrame(glide)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(follow)
      window.clearTimeout(timer)
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [uid])

  const goBack = () => {
    let fromEye = false
    try {
      const y = sessionStorage.getItem(FROM_EYE_KEY)
      sessionStorage.removeItem(FROM_EYE_KEY)
      if (y !== null) {
        fromEye = true
        sessionStorage.setItem(RETURN_KEY, y)
      }
    } catch {}
    if (fromEye && window.history.length > 1) router.back()
    else router.push("/")
  }

  return (
    <Wrap className="flex w-full justify-center" style={{ padding: "40px 0" }}>
      <button
        ref={hostRef}
        type="button"
        onClick={goBack}
        aria-label="Back"
        className="flex cursor-pointer items-center border-none bg-transparent p-0"
        style={{ gap: EYE_GAP }}
      >
        {[0, 1].map((k) => (
          <svg
            key={k}
            viewBox={EYE_VIEWBOX}
            width={EYE_W}
            height={(EYE_W * 210) / 500}
            fill="none"
            aria-hidden="true"
            style={{ display: "block", overflow: "visible", transform: k === 1 ? "scaleX(-1)" : undefined }}
          />
        ))}
      </button>
    </Wrap>
  )
}
