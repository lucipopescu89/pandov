"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { PLAY_EVENT } from "@/components/satori-sun"
import { DRAWN_MS } from "@/components/satori-core"
import { HAND_END } from "@/components/satori-breath"

/**
 * On a touch screen, a tap on a pendant on /body/satori plays its hover first
 * and then opens its page (2026-11-12, the author's asking: a phone has no
 * hover, so the drawings were never seen there). The tap is held back from the
 * link, `PLAY_EVENT` is sent on the frame (every part of it then plays as if a
 * mouse had come onto the pendant), and the page opens once the drawing is
 * whole and has stood a moment (`HOLD_MS`), at most `MAX_WAIT_MS` after the
 * tap. A second tap on the pendant while it plays opens the page at once. A
 * mouse is left alone: it has had the hover already, and its click opens the
 * page as before.
 */

/** How long each drawing takes to be whole, ms. Satori 2 draws nothing by hand: its line of pulses comes in and its wave widens. */
const PLAY_MS: Record<string, number> = {
  "satori-1": HAND_END,
  "satori-2": 1400,
  "satori-3": DRAWN_MS["satori-3"],
  "satori-4": DRAWN_MS["satori-4"],
}
const HOLD_MS = 700
const MAX_WAIT_MS = 4500

export function SatoriTap({ slug, href }: { slug: string; href: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const router = useRouter()

  useEffect(() => {
    const frame = ref.current?.parentElement
    const photo = frame?.querySelector<HTMLElement>(".sp-photo")
    if (!frame || !photo) return
    let timer = 0
    const tap = (e: MouseEvent) => {
      if (!window.matchMedia("(hover: none)").matches) return // a mouse: the link as ever
      if (timer) {
        // a second tap while it plays: open the page now
        window.clearTimeout(timer)
        timer = 0
        return
      }
      e.preventDefault()
      router.prefetch(href)
      frame.dispatchEvent(new Event(PLAY_EVENT))
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const wait = reduced ? 0 : Math.min(MAX_WAIT_MS, (PLAY_MS[slug] ?? 1500) + HOLD_MS)
      timer = window.setTimeout(() => {
        timer = 0
        router.push(href)
      }, wait)
    }
    photo.addEventListener("click", tap)
    return () => {
      photo.removeEventListener("click", tap)
      window.clearTimeout(timer)
    }
  }, [slug, href, router])

  return <span ref={ref} hidden />
}
