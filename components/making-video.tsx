"use client"

import { useEffect, useRef } from "react"

/**
 * The fire on /making (`making-page.tsx`): the torch passing over the plank,
 * looping with no seam. Since the author's asking on 2026-11-17, evening,
 * the loop is in the files themselves (`scripts/making-burn.py`): the clip's
 * last 1.2s dissolve into its first, so it runs on round and round on the
 * browser's own `loop`, never through black. (Until then each loop opened out
 * of black and closed into it, a black veil worked out on every frame from
 * the footage's clock, `DIP_S` 0.35s.)
 *
 * The footage is not shown until it plays, so an iPhone that will not play it
 * by itself (Low Power Mode) shows the still rather than its own play button,
 * and the first touch on the page starts it; the still is the files' first
 * frame, so the footage comes in over it without a change. It plays only
 * while it is on screen.
 *
 * A phone gets its own cut: the middle of the frame, 4:5, 640 × 800, which is
 * all a phone's tall box shows of the 1920 × 810 landscape.
 */

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
  mirror = true,
  label = "A torch passing over a plank of wood, burning its surface",
}: {
  src: string
  poster: string
  phone: { src: string; poster: string }
  /** Left for right (the fire's, above). The print at the page's foot (2026-11-21) is shown as shot. */
  mirror?: boolean
  label?: string
}) {
  const flip = mirror ? MIRROR : undefined
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

    let visible = false
    // playing: the black goes, and the footage comes in over its still
    const onPlaying = () => {
      veil.style.opacity = "0"
      video.style.opacity = "1"
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
    }
  }, [src, poster, phone.src, phone.poster])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={stillRef} alt="" aria-hidden="true" className="mk-cover" style={{ transform: flip }} />
      <video
        ref={videoRef}
        className="mk-cover"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        style={{ opacity: 0, transition: "opacity 0.6s ease", transform: flip }}
      />
      <div ref={veilRef} aria-hidden="true" className="mk-cover" style={{ background: "#000", opacity: 1 }} />
    </>
  )
}
