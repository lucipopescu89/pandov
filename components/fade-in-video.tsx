"use client"

import { useEffect, useRef, useState } from "react"

/** Seconds the picture takes to come up out of the dark ground, or go back. */
const FADE_S = 2.4

/**
 * How long to wait for the footage before bringing up its still in its place.
 * On a slow connection the footage then takes over from the still when it
 * arrives, rather than the page standing empty until it does.
 */
const STILL_AFTER_MS = 3000

/** Smoothstep — the S of CSS's ease-in-out, near enough, as a function. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

type Props = {
  /** The footage as shot, for anything wider than a phone. */
  src: string
  /**
   * A lighter cut for a phone, its still, and the media query that chooses
   * them. The cut is only the part of the frame a phone ever shows, so a phone
   * stops downloading a picture it crops away: of Contact's landscape footage
   * a phone showed a quarter to a third of the width. See CLAUDE.md for how
   * both were cut.
   */
  phone: { src: string; poster: string; media: string }
  /** The still for anything wider than a phone. */
  poster: string
  /** How strongly the footage shows over the #202020 ground once it is in. */
  opacity: number
  /** The pace it plays at, as a fraction of the footage's own. */
  rate?: number
  /**
   * Go back down to the ground at the end of the footage and come up again at
   * its start, every loop, the way it arrived. Off, the loop runs on unbroken.
   */
  loopFade?: boolean
  className?: string
}

/**
 * The Making and Contact pages' background footage, which comes up out of the
 * dark ground rather than being there when the page opens.
 *
 * The fade waits for the footage to be playing, not for the page: brought up
 * any earlier it would show a still first and then jump to the moving picture
 * partway through the fade. It also turns the wait for the video on a slow
 * phone connection into part of the page arriving.
 *
 * On Making the author wanted every loop to arrive the same way, so there it
 * also dips to the ground over the footage's last FADE_S and comes back over
 * its first. That is why the fade is worked out on every frame, from the
 * footage's own clock, and not left to a CSS transition: a loop gives nothing
 * to start one on. With `loop` set the footage runs from its end straight back
 * to its start without an "ended", and "timeupdate" comes only four times a
 * second, so a fade hung on it would start up to a quarter of a second late.
 *
 * An iPhone does not always let a page play video by itself. In Low Power
 * Mode it refuses every one on every site, and so do some apps' built-in
 * browsers, and it then lays its own play button over the video — which is
 * what the author found on an iPhone 8. So the video is never shown until it
 * is actually playing, and its play button, being part of it, is never seen.
 * Refused, the page brings up the footage's still in its place instead, the
 * same way the footage would have come up, and the first touch anywhere on
 * the page — which the iPhone does count as permission — starts the footage,
 * which then takes over from the still. The still is the moment the desktop
 * poster was always taken from, 0.5s in, cut for a phone like the footage.
 *
 * Turning the footage into a GIF, which plays anywhere, was weighed and
 * rejected: the phone cuts come to 36MB and 39MB as GIFs, against 0.44MB and
 * 0.30MB, and a GIF's 256 colours band these near-black pictures visibly. Even
 * an animated WebP is 3.6MB and 2.5MB.
 */
export function FadeInVideo({ src, phone, poster, opacity, rate = 1, loopFade = false, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stillRef = useRef<HTMLImageElement>(null)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // Both: reloading the source resets the one to the other, so the default
    // is what keeps it.
    video.defaultPlaybackRate = rate
    video.playbackRate = rate

    /** When the footage began to come up; null until it is playing. */
    let footageFrom: number | null = null
    /** When the still began to come up in its place; null unless it had to. */
    let stillFrom: number | null = null
    let frame = 0
    let wroteFootage = -1
    let wroteStill = -1
    /** Set on cleanup, so a refusal that arrives afterwards changes nothing. */
    let disposed = false

    const up = (from: number | null, now: number) =>
      from === null ? 0 : ease((now - from) / 1000 / FADE_S)

    const tick = (now: number) => {
      frame = 0
      const arriving = up(footageFrom, now)
      let footage = arriving
      const length = video.duration
      if (loopFade && footageFrom !== null && Number.isFinite(length) && length > 0) {
        // FADE_S of the viewer's time, in the footage's seconds, which run
        // at the playback rate.
        const span = FADE_S * video.playbackRate
        const t = video.currentTime
        footage = Math.min(footage, ease(t / span), ease((length - t) / span))
      }
      const f = +(opacity * footage).toFixed(4)
      if (f !== wroteFootage) {
        video.style.opacity = String(f)
        wroteFootage = f
      }

      // The still gives way as the footage arrives over it, so the two
      // cross rather than stack.
      const img = stillRef.current
      const s = +(opacity * up(stillFrom, now) * (1 - arriving)).toFixed(4)
      if (img && s !== wroteStill) {
        img.style.opacity = String(s)
        wroteStill = s
      }
      if (stillFrom !== null && arriving >= 1) {
        stillFrom = null
        setStill(false)
      }

      const settling =
        (footageFrom !== null && arriving < 1) ||
        (stillFrom !== null && (!img || up(stillFrom, now) < 1))
      if (settling || (loopFade && footageFrom !== null)) frame = requestAnimationFrame(tick)
    }
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    // A touch on the page is permission to play, even where playing by itself
    // was refused.
    const gestures = ["touchend", "click", "keydown"] as const
    const onGesture = () => {
      video.play().catch(() => {})
    }
    const stopListening = () => {
      for (const g of gestures) document.removeEventListener(g, onGesture)
    }

    const startFootage = () => {
      stopListening()
      if (footageFrom !== null) return
      footageFrom = performance.now()
      kick()
    }
    // Whatever brought the still up — a refusal, or footage that is slow to
    // come — a touch may start the footage from here. If it is only slow, the
    // touch changes nothing; if it was refused without saying so, it is the
    // only thing that will.
    const showStill = () => {
      if (footageFrom !== null || stillFrom !== null) return
      stillFrom = performance.now()
      setStill(true)
      kick()
      for (const g of gestures) document.addEventListener(g, onGesture, { passive: true })
    }

    // The element starts loading with the HTML, before this runs, so on a
    // quick or cached load it can already be playing by now; "playing" has
    // then been and gone.
    if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startFootage()
    } else {
      video.addEventListener("playing", startFootage)
      // Asking outright is the only way to hear a refusal: the autoplay
      // attribute fails in silence.
      video.play().catch((error: DOMException) => {
        if (!disposed && error.name === "NotAllowedError") showStill()
      })
    }
    const timer = window.setTimeout(showStill, STILL_AFTER_MS)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      video.removeEventListener("playing", startFootage)
      window.clearTimeout(timer)
      stopListening()
    }
  }, [opacity, rate, loopFade])

  return (
    <>
      <video
        ref={videoRef}
        className={className}
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        // Opacity starts at the ground; from there the frame loop above owns
        // it. No poster: the video is never seen before it plays, and a still
        // that is needed comes from the picture below instead.
        style={{ objectFit: "cover", objectPosition: "center", opacity: 0 }}
      >
        {/* The phone's cut first: a browser takes the first source it can play
            whose media query holds, and the full footage, having none, would
            otherwise always win. */}
        <source src={phone.src} media={phone.media} type="video/mp4" />
        <source src={src} type="video/mp4" />
      </video>
      {still && (
        <picture>
          <source srcSet={phone.poster} media={phone.media} />
          <img
            ref={stillRef}
            className={className}
            src={poster}
            alt=""
            style={{ objectFit: "cover", objectPosition: "center", opacity: 0, pointerEvents: "none" }}
          />
        </picture>
      )}
    </>
  )
}
