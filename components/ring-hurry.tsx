"use client"

import { useEffect, useRef } from "react"
import { listenHurry } from "@/lib/hurry"

/**
 * Presence's ellipses radiate faster while its pendant hurries them: the
 * pointer over the photograph, or a tap on it on a phone, before its page
 * opens (2026-11-13, the author's asking; `lib/hurry.ts`).
 *
 * The rings are CSS animations (`RadiantRings`), so this reads them off the
 * section with `getAnimations()` and eases their playback rate up to `MAX_RATE`
 * and back to 1, at the same lazy pace as the other Second Wind fields
 * (`RESPONSE`). Changing a running animation's rate keeps it where it is, so
 * the field never jumps: it only quickens. Placed inside the section, it reads
 * the rings of its parent element. Reduced motion: nothing.
 */

/** The ellipses' speed at a full hurry, as a multiple of their own. */
const MAX_RATE = 3
/** Fraction of the remaining gap closed each 60fps frame, as in `particle-field.tsx`. */
const RESPONSE = 0.025

export function RingHurry({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = ref.current?.parentElement
    if (!section || typeof section.getAnimations !== "function") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let hurried = false
    let rate = 1
    let raf = 0
    let last = 0

    const rings = () =>
      section
        .getAnimations({ subtree: true })
        .filter((a) => (a.effect as KeyframeEffect | null)?.target instanceof SVGEllipseElement)

    const setRate = (r: number) => {
      for (const a of rings()) {
        if (typeof a.updatePlaybackRate === "function") a.updatePlaybackRate(r)
        else a.playbackRate = r
      }
    }

    const frame = (now: number) => {
      const dt = last ? Math.max(0, Math.min(0.1, (now - last) / 1000)) : 1 / 60
      last = now
      const target = hurried ? MAX_RATE : 1
      let next = rate + (target - rate) * (1 - Math.pow(1 - RESPONSE, dt * 60))
      if (Math.abs(next - target) < 0.005) next = target
      if (Math.abs(next - rate) > 0.005 || next === target) {
        rate = next
        setRate(rate)
      }
      raf = rate === target ? 0 : requestAnimationFrame(frame)
    }

    const stop = listenHurry(label, (on) => {
      hurried = on
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    })

    return () => {
      stop()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [label])

  return <span ref={ref} hidden />
}
