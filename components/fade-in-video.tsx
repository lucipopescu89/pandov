"use client"

import { useEffect, useRef } from "react"

/** Seconds the footage takes to come up out of the dark ground, or go back. */
const FADE_S = 2.4

/**
 * How long to wait for playback before bringing the picture up regardless. A
 * browser that refuses to autoplay — iOS in Low Power Mode does — never
 * reports it playing, and waiting on it would leave the page with no picture
 * at all where it used to show the poster.
 */
const FALLBACK_MS = 3000

/** Smoothstep — the S of CSS's ease-in-out, near enough, as a function. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

type Props = {
  /** The footage as shot, for anything wider than a phone. */
  src: string
  /**
   * A lighter cut for a phone, and the media query that chooses it. It is only
   * the part of the frame a phone ever shows, so a phone stops downloading a
   * picture it crops away: of Contact's landscape footage a phone showed a
   * quarter to a third of the width. See CLAUDE.md for how both were cut.
   */
  phone: { src: string; media: string }
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
 * any earlier it would show the poster first and then jump to the moving
 * picture partway through the fade. It also turns the wait for the video on a
 * slow phone connection into part of the page arriving, where before it was a
 * still frame that eventually began to move.
 *
 * On Making the author wanted every loop to arrive the same way, so there it
 * also dips to the ground over the footage's last FADE_S and comes back over
 * its first. That is why the fade is worked out on every frame, from the
 * footage's own clock, and not left to a CSS transition: a loop gives nothing
 * to start one on. With `loop` set the footage runs from its end straight back
 * to its start without an "ended", and "timeupdate" comes only four times a
 * second, so a fade hung on it would start up to a quarter of a second late —
 * a visible jump. Read off `currentTime`, the dip sits exactly on the loop.
 */
export function FadeInVideo({ src, phone, poster, opacity, rate = 1, loopFade = false, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    // Both: reloading the source resets the one to the other, so the default
    // is what keeps it.
    video.defaultPlaybackRate = rate
    video.playbackRate = rate

    /** When the arrival began; null until the footage is playing. */
    let since: number | null = null
    let written = -1
    let frame = 0

    const tick = (now: number) => {
      let level = since === null ? 0 : ease((now - since) / 1000 / FADE_S)
      const length = video.duration
      // Once it has played at all, not only while it plays: a browser pauses
      // the footage when the page goes out of sight, and a paused one halfway
      // down the dip must stay halfway down, not jump up to full. Before it has
      // ever played, what shows is the poster, which the dip must not hide.
      if (loopFade && video.played.length > 0 && Number.isFinite(length) && length > 0) {
        // FADE_S of the viewer's time, in the footage's seconds, which run
        // at the playback rate.
        const span = FADE_S * video.playbackRate
        const t = video.currentTime
        level = Math.min(level, ease(t / span), ease((length - t) / span))
      }
      const value = +(opacity * level).toFixed(4)
      if (value !== written) {
        video.style.opacity = String(value)
        written = value
      }
      // With no loop to follow, the work is done once the picture is in.
      if (!loopFade && level >= 1) return
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const show = () => {
      if (since === null) since = performance.now()
    }
    let fallback = 0
    // The element starts loading with the HTML, before this runs, so on a
    // quick or cached load it can already be playing by now; "playing" has
    // then been and gone.
    if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      show()
    } else {
      video.addEventListener("playing", show, { once: true })
      fallback = window.setTimeout(show, FALLBACK_MS)
    }
    return () => {
      cancelAnimationFrame(frame)
      video.removeEventListener("playing", show)
      window.clearTimeout(fallback)
    }
  }, [opacity, rate, loopFade])

  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      preload="auto"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      // Opacity starts at the ground; from there the frame loop above owns it.
      style={{ objectFit: "cover", objectPosition: "center", opacity: 0 }}
    >
      {/* The phone's cut first: a browser takes the first source it can play
          whose media query holds, and the full footage, having none, would
          otherwise always win. */}
      <source src={phone.src} media={phone.media} type="video/mp4" />
      <source src={src} type="video/mp4" />
    </video>
  )
}
