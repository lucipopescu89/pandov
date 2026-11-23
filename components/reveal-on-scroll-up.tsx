"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { HERO_MENU_EVENT, TO_TOP_EVENT, heroDoors, heroSteps, stepsDevice } from "@/lib/played-beat"

/**
 * Homepage only (2026-11-02, the author's asking; since 2026-11-16 it opens
 * with the menu down, over the handles, and a page opened at the top shows
 * it). Before that day the page opened on the handles with no menu above them. The menu lies over
 * the page, out of the flow, hidden above the top edge, and slides down only
 * when the reader scrolls up at the very top of the page (not on every scroll
 * up: the author's correction, the same day). A scroll down, or the page
 * leaving the top, sends it away again.
 *
 * It listens to the reader's hand (wheel, keys, finger), not to the scroll
 * position: the hero moves the page by itself (the glide to the pin, the
 * held beats, the way back up), and those moves must not flash the menu.
 * The bottom logo's trip to the top (TO_TOP_EVENT) brings it down too.
 *
 * Not while the doors are closing (2026-11-03, the author's asking). A scroll
 * up from text 1 or Presence puts the page at the pin, at the top, at once,
 * and the doors then close by their frames: the menu used to come down with
 * that same scroll. Now a scroll up brings it only once the doors are fully
 * shut and Presence is off (`heroDoors`), so the doors close first and the
 * next scroll up brings the menu. From For Mind or below the doors are shut
 * at once on the way up, so arriving at the top still brings it as before.
 *
 * The menu itself is the shared `Navigation`, unchanged: only where it sits
 * and when it shows is decided here.
 *
 * On a phone, where the opening goes in steps (2026-11-23, `stepsDevice`):
 * while the steps hold the page (`heroSteps.locked`) the hand is theirs, and
 * they say when the menu goes and comes (`HERO_MENU_EVENT`). Past them a
 * finger is only listened to, never held: the touch listener is passive, so
 * the browser never waits on the page's script before it scrolls. Until that
 * day it was a blocking listener on the whole homepage, and on a phone busy
 * decoding the doors' frames every swipe waited on it.
 */
export function RevealOnScrollUp({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false)
  // No slide on the way in: a page opened at the top has the menu there from
  // the first frame; the slide is for the hand moving it after.
  const [moving, setMoving] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    // A phone's opening in steps: see the note above.
    const steps = stepsDevice()
    // At the top of the page: the hero's pin is there too, and its beats
    // move the page at least NUDGE_PX (40) past it.
    const TOP_PX = 4
    const atTop = () => window.scrollY <= TOP_PX
    // The reader's last direction: true for up.
    let up = false
    const apply = () => {
      const v = up && atTop()
      if (shownRef.current === v) return
      shownRef.current = v
      setShown(v)
      // The hero's text 1 stands in the menu's place while it is away.
      document.documentElement.dataset.heroMenu = v ? "shown" : "away"
    }
    const set = (v: boolean) => {
      up = v
      apply()
    }
    // A hand going up: it counts only once the doors are shut. Until then it
    // is as if it were not going up at all, so the page reaching the top on
    // it shows nothing.
    const goingUp = () => set(heroDoors.shut())
    // A scroll up that ends at the top shows it once the page gets there;
    // the page leaving the top hides it.
    const onScroll = () => apply()

    // While the menu is down, the scroll down that sends it away does only
    // that: the hero never hears of it, so the doors wait for the next one
    // (the author's asking, 2026-11-02). These listeners are on the window's
    // capture phase, ahead of the hero's own (bubble phase), so stopping the
    // event there keeps it from them. The rest of that same hand (several
    // notches, a trackpad's momentum) is absorbed too, until GAP_MS of quiet,
    // the hero's own GESTURE_GAP_MS.
    const GAP_MS = 250
    let absorbing = false
    let lastWheel = -Infinity
    const swallow = (e: Event) => {
      if (e.cancelable) e.preventDefault()
      e.stopImmediatePropagation()
    }

    const onWheel = (e: WheelEvent) => {
      if (heroSteps.locked) return
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const gap = e.timeStamp - lastWheel
      lastWheel = e.timeStamp
      if (e.deltaY < 0) {
        absorbing = false
        goingUp()
        return
      }
      if (e.deltaY === 0) return
      if (absorbing && gap < GAP_MS) return swallow(e)
      absorbing = false
      if (shownRef.current) {
        absorbing = true
        set(false)
        return swallow(e)
      }
      set(false)
    }

    const UP = new Set(["ArrowUp", "PageUp", "Home"])
    const DOWN = new Set(["ArrowDown", "PageDown", "End", " "])
    const onKey = (e: KeyboardEvent) => {
      if (heroSteps.locked) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (UP.has(e.key) || (e.key === " " && e.shiftKey)) return goingUp()
      if (!DOWN.has(e.key)) return
      // A key held down repeats: the repeats belong to the same hand.
      if (absorbing && e.repeat) return swallow(e)
      absorbing = false
      if (shownRef.current) {
        absorbing = true
        set(false)
        return swallow(e)
      }
      set(false)
    }

    // A finger moving down the glass scrolls the page up. A drag that sends
    // the menu away is held whole, until the finger lifts.
    let touchY: number | null = null
    let touchHeld = false
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
      touchHeld = false
    }
    const onTouchMove = (e: TouchEvent) => {
      if (heroSteps.locked) return
      if (touchHeld) return swallow(e)
      const y = e.touches[0]?.clientY
      if (touchY === null || y === undefined) return
      const d = y - touchY
      if (Math.abs(d) < 8) return
      touchY = y
      if (d > 0) return goingUp()
      // A phone's finger is never held (see the note above).
      if (shownRef.current && !steps) {
        touchHeld = true
        set(false)
        return swallow(e)
      }
      set(false)
    }
    const onTouchEnd = () => {
      touchY = null
    }

    const onToTop = () => set(true)
    // The opening's steps, on a phone: the menu down, or away.
    const onSteps = (e: Event) => set(!!(e as CustomEvent<boolean>).detail)

    // The page opens with the menu down, over the handles (2026-11-16, the
    // author's asking): a page opened at its top counts as a hand come up.
    // The first scroll down sends it away, as before, and text 1 takes its
    // place (see HeroAnimation).
    document.documentElement.dataset.heroMenu = atTop() ? "shown" : "away"
    set(atTop())
    const settle = requestAnimationFrame(() => requestAnimationFrame(() => setMoving(true)))

    const opts = { passive: false, capture: true } as const
    window.addEventListener("wheel", onWheel, opts)
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true })
    window.addEventListener("touchmove", onTouchMove, steps ? { passive: true, capture: true } : opts)
    window.addEventListener("touchend", onTouchEnd, true)
    window.addEventListener(TO_TOP_EVENT, onToTop)
    window.addEventListener(HERO_MENU_EVENT, onSteps)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("wheel", onWheel, opts)
      window.removeEventListener("keydown", onKey, true)
      window.removeEventListener("touchstart", onTouchStart, true)
      window.removeEventListener("touchmove", onTouchMove, true)
      window.removeEventListener("touchend", onTouchEnd, true)
      window.removeEventListener(TO_TOP_EVENT, onToTop)
      window.removeEventListener(HERO_MENU_EVENT, onSteps)
      cancelAnimationFrame(settle)
      delete document.documentElement.dataset.heroMenu
    }
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transform: shown ? "translateY(0)" : "translateY(-100%)",
        transition: moving ? "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        pointerEvents: shown ? "auto" : "none",
      }}
      inert={!shown}
    >
      {children}
    </div>
  )
}
