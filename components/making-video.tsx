"use client"

import { useEffect, useRef } from "react"

/**
 * The fire on /making (`making-page.tsx`): the torch passing over the plank,
 * looping, each loop opening out of black and closing into it, quickly
 * (`DIP_S`), the author's asking on 2026-11-17.
 *
 * The dip is a black veil over the footage, worked out on every frame from the
 * footage's own clock: a loop gives no event to start a transition on, and
 * "timeupdate" comes only four times a second (as in `fade-in-video.tsx`).
 *
 * As there, the footage is not shown until it plays, so an iPhone that will
 * not play it by itself (Low Power Mode) shows the still rather than its own
 * play button, and the first touch on the page starts it. It plays only while
 * it is on screen.
 *
 * A phone gets its own cut: the middle of the frame, 4:5, 640 × 800, which is
 * all a phone's tall box shows of the 1920 × 810 landscape.
 */

/** Seconds of each dip to black, at either end of the loop. */
const DIP_S = 0.35
const PHONE = "(max-width: 767px)"
/**
 * The footage is shown mirrored about its vertical axis, left for right (the
 * author's asking, 2026-11-17). Done here rather than in the file, so the
 * cuts stay as shot; the still is mirrored with it.
 */
const MIRROR = "scaleX(-1)"

export function MakingVideo({
  src,
  poster,
  phone,
}: {
  src: string
  poster: string
  phone: { src: string; poster: string }
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stillRef = useRef<HTMLImageElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const still = stillRef.current
    const veil = veilRef.current
    if (!video || !still || !veil) return
    const small = window.matchMedia(PHONE).matches
    still.src = small ? phone.poster : poster
    video.src = small ? phone.src : src

    let frame = 0
    let visible = false
    const tick = () => {
      frame = 0
      const d = video.duration
      const t = video.currentTime
      let dark = 1
      if (Number.isFinite(d) && d > 0 && !video.paused) {
        dark = Math.max(1 - t / DIP_S, 1 - (d - t) / DIP_S, 0)
      }
      veil.style.opacity = Math.min(1, dark).toFixed(3)
      if (!video.paused) frame = requestAnimationFrame(tick)
    }
    const onPlaying = () => {
      video.style.opacity = "1"
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const tryPlay = () => {
      if (visible) video.play().catch(() => {})
    }
    const onGesture = () => tryPlay()
    video.addEventListener("playing", onPlaying)
    // Refused (Low Power Mode), the still shows through until a touch starts it.
    const showStill = window.setTimeout(() => {
      if (video.paused) veil.style.opacity = "0"
    }, 1500)

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) tryPlay()
        else video.pause()
      },
      { rootMargin: "100px 0px" },
    )
    io.observe(video)
    window.addEventListener("touchend", onGesture, { passive: true })
    window.addEventListener("click", onGesture)

    return () => {
      io.disconnect()
      window.clearTimeout(showStill)
      video.removeEventListener("playing", onPlaying)
      window.removeEventListener("touchend", onGesture)
      window.removeEventListener("click", onGesture)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [src, poster, phone.src, phone.poster])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={stillRef} alt="" aria-hidden="true" className="mk-cover" style={{ transform: MIRROR }} />
      <video
        ref={videoRef}
        className="mk-cover"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="A torch passing over a plank of wood, burning its surface"
        style={{ opacity: 0, transition: "opacity 0.6s ease", transform: MIRROR }}
      />
      <div ref={veilRef} aria-hidden="true" className="mk-cover" style={{ background: "#000", opacity: 1 }} />
    </>
  )
}
