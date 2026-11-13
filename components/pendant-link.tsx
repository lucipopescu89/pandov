"use client"

import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HURRY_TAP_MS, sendHurry } from "@/lib/hurry"

/**
 * The link over a pendant's photograph on /body/second-wind, which opens the
 * pendant's page (2026-11-13, the author's asking: the fields used to hurry
 * with scrolling).
 *
 * With `hurries`, a mouse over the photograph hurries the section's field and
 * leaving it lets the field ease back. A phone has no hover, so there a tap is
 * held back from the link: the field hurries for `HURRY_TAP_MS` and then the
 * page opens. A second tap while it hurries opens the page at once, and with
 * reduced motion asked for the tap opens it straight away, as it does on a
 * pendant whose section has nothing to hurry (Emperor). A mouse's
 * click is as ever. The same hold as Satori's (`components/satori-tap.tsx`).
 */
export function PendantLink({
  href,
  label,
  hurries,
  className,
  style,
}: {
  href: string
  label: string
  hurries: boolean
  className?: string
  style?: CSSProperties
}) {
  const router = useRouter()
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const enter = (e: PointerEvent) => {
    if (hurries && e.pointerType !== "touch") sendHurry(label, true)
  }
  const leave = (e: PointerEvent) => {
    if (hurries && e.pointerType !== "touch") sendHurry(label, false)
  }

  const tap = (e: MouseEvent) => {
    if (!hurries) return
    if (!window.matchMedia("(hover: none)").matches) return // a mouse: the link as ever
    if (timer.current) {
      // a second tap while it hurries: let the link open the page now
      window.clearTimeout(timer.current)
      timer.current = 0
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    e.preventDefault()
    sendHurry(label, true)
    timer.current = window.setTimeout(() => {
      timer.current = 0
      router.push(href)
    }, HURRY_TAP_MS)
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={className}
      style={style}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onClick={tap}
    />
  )
}
