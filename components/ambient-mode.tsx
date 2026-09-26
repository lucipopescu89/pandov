"use client"

import { useEffect } from "react"

/**
 * Making and Contact leave their footage alone on screen when nobody is doing
 * anything. After `IDLE_MS` without a movement, the menus and the words fade
 * away over `FADE_OUT_S`, slowly, and only the film is left. The first sign of
 * the visitor brings them back over `FADE_IN_S`: a mouse movement, a touch, a
 * scroll, a key. The author proposed it on 2026-09-26, as a new way of being
 * on those two pages.
 *
 * What fades is whatever carries the class `ambient-fade`. The pages mark
 * their own layers with it; the menus themselves are the shared components,
 * untouched, inside those layers. The state lives on <html> as
 * `data-ambient`, so one stylesheet here serves both pages, and it is cleared
 * when the page is left.
 *
 * Four guards, each against a way it would go wrong:
 *
 * - Only while the footage is playing. An iPhone in Low Power Mode never plays
 *   it by itself, and the page shows its still instead (`FadeInVideo`). With
 *   the words gone from over a still, the page would look empty, or broken.
 * - Never while a field has the focus. Contact's form is for typing into, and
 *   someone reading back what they typed is not idle.
 * - A touch that brings the page back does only that. The layers take no
 *   touches while they are faded, and for `LOCK_MS` after they return, so the
 *   finger that woke the page does not also open the mail app or Instagram,
 *   which were under it unseen.
 * - The keyboard. Tab moves the focus onto a faded link, and the focus brings
 *   the page back, so nothing is ever reached unseen.
 */
const IDLE_MS = 6000
const FADE_OUT_S = 2.5
const FADE_IN_S = 0.4
const LOCK_MS = 450
/** How soon to look again when the page was not ready to go quiet. */
const RETRY_MS = 1000

const CSS = `
.ambient-fade { transition: opacity ${FADE_IN_S}s ease-out; }
html[data-ambient="on"] .ambient-fade { opacity: 0; transition: opacity ${FADE_OUT_S}s ease-in-out; }
html[data-ambient-lock="on"] .ambient-fade, html[data-ambient-lock="on"] .ambient-fade * { pointer-events: none !important; }
`

/** Whether the page's footage is on screen and moving, not its still. */
function footagePlaying(): boolean {
  const video = document.querySelector("video")
  return (
    !!video &&
    !video.paused &&
    !video.ended &&
    video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA &&
    parseFloat(video.style.opacity || "0") > 0
  )
}

/** Whether someone is in a field: typing, or about to. */
function typing(): boolean {
  const el = document.activeElement
  return !!el && (el.matches("input, textarea, select") || (el as HTMLElement).isContentEditable)
}

export function AmbientMode() {
  useEffect(() => {
    const root = document.documentElement
    let idle = 0
    let unlock = 0

    const quiet = () => {
      if (document.hidden || !footagePlaying() || typing()) {
        idle = window.setTimeout(quiet, RETRY_MS)
        return
      }
      window.clearTimeout(unlock)
      root.dataset.ambient = "on"
      root.dataset.ambientLock = "on"
    }

    const wake = () => {
      window.clearTimeout(idle)
      idle = window.setTimeout(quiet, IDLE_MS)
      if (root.dataset.ambient !== "on") return
      delete root.dataset.ambient
      // The lock outlasts the fade back in by a touch's length, so the tap
      // that woke the page lands on nothing.
      window.clearTimeout(unlock)
      unlock = window.setTimeout(() => delete root.dataset.ambientLock, LOCK_MS)
    }

    const events = ["mousemove", "pointerdown", "touchstart", "keydown", "wheel", "scroll", "focusin"] as const
    for (const e of events) window.addEventListener(e, wake, { passive: true, capture: true })
    const onVisible = () => {
      if (!document.hidden) wake()
    }
    document.addEventListener("visibilitychange", onVisible)
    idle = window.setTimeout(quiet, IDLE_MS)

    return () => {
      for (const e of events) window.removeEventListener(e, wake, { capture: true })
      document.removeEventListener("visibilitychange", onVisible)
      window.clearTimeout(idle)
      window.clearTimeout(unlock)
      delete root.dataset.ambient
      delete root.dataset.ambientLock
    }
  }, [])

  return <style>{CSS}</style>
}
