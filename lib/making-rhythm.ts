/**
 * One rhythm for the whole of /making (2026-11-19, the author's asking: "let us
 * correlate the coming and going of the words and of the pictures, so the page
 * reads as one; now it seems chaotic"). Every passage follows the same few
 * rules, measured in windows of scroll:
 *
 *  1. **A picture is held still in its frame** while the page moves over it
 *     (`position: sticky`). The frame is the found wood's: the window's width,
 *     `--h1` tall (957 of the frame's 1920, the window's height at most; a
 *     phone 78svh), in the window's middle, so every picture is cut the same
 *     way on every screen. The one exception is the turning piece, which keeps
 *     the window's whole height (the author's word).
 *  2. **It comes out of transparency** over `ARRIVE` of a window, opaque by
 *     `ARRIVE_OPAQUE` of that, gliding a little as it comes: the found wood
 *     and the fire up from below, the turning piece from the right, the scan
 *     from the left; each glide eases out, so it comes to rest without a stop.
 *  3. **Its words come only once it has come**, by opacity alone (they never
 *     move against the picture), over `FADE` of a window, and go over `FADE`
 *     before it goes (`words`). They are Manrope at the site's one size; the
 *     ones the author set in 2026-11-19 stand on airy lines (line-height 3).
 *  4. **One ground, then the other**: the site's dark (#202020) from the top
 *     through the scan, a veil of white over the scan's end, and white from
 *     there to the foot of the page (it went back to the dark for the last
 *     words until that day).
 *  5. **No empty scroll between passages**: on the dark, each passage's
 *     section begins under the end of the one before (a negative margin, the
 *     section's ground transparent), so the next one comes as the last one
 *     goes.
 */

export const clamp01 = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
export const smooth = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}
/** 0 before `a`, 1 after `b`, eased between. */
export const ramp = (x: number, a: number, b: number) => smooth((x - a) / (b - a))

/** Words fade in and out over this many windows of scroll. */
export const FADE = 0.25
/** Words: 0 before `from`, 1 from `from + FADE` to `to - FADE`, 0 after `to`. */
export const words = (x: number, from: number, to: number) => ramp(x, from, from + FADE) * (1 - ramp(x, to - FADE, to))

/** A picture comes in over this many windows of scroll, */
export const ARRIVE = 0.5
/** opaque by this share of it. */
export const ARRIVE_OPAQUE = 0.7
/** How far it glides sideways as it comes, vw (the turning piece, the scan). */
export const ARRIVE_GLIDE_VW = 8
/** Its opacity at `e` (0 → 1) of its way in. */
export const arriveOpacity = (e: number) => smooth(clamp01(e) / ARRIVE_OPAQUE)
/** What is left of its glide at `e`, 1 → 0, eased out so it comes to rest smoothly. */
export const arriveLeft = (e: number) => {
  const a = 1 - clamp01(e)
  return a * a * a
}

/**
 * The fire (2026-11-19, later, the author's asking: held, it lacked fluency).
 * It is not held: it goes up the window all the way, from below its foot to
 * above its top, at the page's pace, **slower about the middle** where its
 * words are: easing over `FIRE_EASE` windows of scroll down to `FIRE_SLOW` of
 * the page's pace, keeping that for `FIRE_HOLD` windows, and easing back. The
 * slow stretch is centred on the fire standing in the middle of the window
 * (the found wood's frame, `--h1`). It begins `FIRE_FROM` windows into the
 * found wood's held stretch (as the wood is nearly gone), which is
 * `FIRE_FROM_S1` of `--s1` (2.1 windows).
 */
export const FIRE_EASE = 0.35
export const FIRE_SLOW = 0.45
export const FIRE_HOLD = 0.9
export const FIRE_FROM = 2.2
export const FIRE_FROM_S1 = +(FIRE_FROM / 2.1).toFixed(4)
/** Its passage is the window, plus the window and the frame it travels, plus what the slowing adds, in windows (CSS). */
export const FIRE_SECTION_EXTRA = +((FIRE_EASE + FIRE_HOLD) * (1 - FIRE_SLOW)).toFixed(4)

/** Where the slowing begins, windows into the fire's passage, for a frame `h` windows tall. */
export const fireSlowFrom = (h: number) =>
  Math.max(0, (1 + h) / 2 - (FIRE_EASE * (1 + FIRE_SLOW)) / 2 - (FIRE_HOLD * FIRE_SLOW) / 2)

/**
 * How far the fire has gone up, in windows, `z` windows of scroll into its
 * passage (for a frame `h` windows tall): the integral of its pace, which
 * eases by a smoothstep (whose integral is t³ − t⁴/2).
 */
export function fireTravel(z: number, h: number) {
  if (z <= 0) return 0
  const z1 = fireSlowFrom(h)
  const K = FIRE_EASE
  const G = FIRE_SLOW
  const S = (t: number) => t * t * t - (t * t * t * t) / 2
  if (z <= z1) return z
  const d1 = z1 + (K * (1 + G)) / 2
  if (z <= z1 + K) {
    const t = (z - z1) / K
    return z1 + K * (t - (1 - G) * S(t))
  }
  const z2 = z1 + K + FIRE_HOLD
  const d2 = d1 + G * FIRE_HOLD
  if (z <= z2) return d1 + G * (z - z1 - K)
  if (z <= z2 + K) {
    const t = (z - z2) / K
    return d2 + K * (G * t + (1 - G) * S(t))
  }
  return d2 + (K * (1 + G)) / 2 + (z - z2 - K)
}

/**
 * The fire on a phone (2026-11-19, the author's asking: "it should come where
 * the first picture comes, and the same way, and go the same way"). It comes
 * in where the found wood stands, out of transparency, rising a little
 * (`PHONE_FIRE_ARRIVE`), drifts up slowly (`PHONE_FIRE_DRIFT` of the page's
 * pace) while its words come and go and it is watched, and from
 * `PHONE_FIRE_EXIT` goes up and out of transparency as the found wood does
 * (gathering to the page's pace). Its passage is `PHONE_FIRE_Z` windows, and
 * it begins `PHONE_FIRE_FROM` windows into the found wood's held stretch
 * (`PHONE_FIRE_FROM_S1` of `--s1`), a little later than on a computer, since
 * here the two stand in the same place.
 */
export const PHONE_FIRE_ARRIVE = 0.5
export const PHONE_FIRE_DRIFT = 0.05
export const PHONE_FIRE_EXIT = 1.3
export const PHONE_FIRE_Z = 2.0
export const PHONE_FIRE_FROM = 2.4
export const PHONE_FIRE_FROM_S1 = +(PHONE_FIRE_FROM / 2.1).toFixed(4)
