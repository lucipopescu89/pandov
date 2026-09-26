/**
 * Mother Nature's heartbeat, the site's one pulse.
 *
 * It began inside `components/mechanism-field.tsx`, where it beats the rings of
 * Mother Nature's mandala. On 2026-09-26 the author asked for the filled
 * diamond over Second Wind on `/body` to pulse "like Mother Nature's pulse", in
 * scale and in light alike, so it lives here and both read it: the mandala
 * through the Web Animations API, the Body page as CSS keyframes written on the
 * server. One rhythm, not a copy of it that could drift.
 *
 * Its own module because a server component uses it as well as a client one,
 * and a function exported from a "use client" file reaches the server only as
 * a reference that cannot be called.
 */

/** Seconds for one heartbeat at rest. */
export const HEART_S = 2.2
/** Samples taken along the heartbeat curve to build its keyframes. */
const HEART_SAMPLES = 32
/**
 * Seconds the light a beat leaves behind takes to fall to half. Long enough
 * that the ripple running outward is a band of light crossing the mandala, not
 * a ring flashing on its own.
 */
const GLOW_FALL_S = 0.75

/** Lub-dub: a strong beat, a softer echo, then rest. 0 → 1 → 0 over a period. */
function heartbeat(t: number): number {
  const lub = Math.exp(-(((t - 0.15) / 0.055) ** 2))
  const dub = 0.55 * Math.exp(-(((t - 0.33) / 0.07) ** 2))
  return Math.min(1, lub + dub)
}

/**
 * The beat again, with the light of every beat before it still draining away.
 * A ring snaps back to its own size the moment a beat has passed, but the
 * brightness it left behind leaves slowly, so rings lagged one behind the next
 * read as a single band of light travelling outward rather than as rings
 * blinking in turn.
 */
function afterglow(beats: number[]): number[] {
  const decay = Math.pow(0.5, HEART_S / beats.length / GLOW_FALL_S)
  const light = beats.slice()
  // Twice around the cycle, so the tail of the last beat is already lighting
  // the ring as the next one arrives.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < light.length; i++) {
      light[i] = Math.max(light[i], light[(i + light.length - 1) % light.length] * decay)
    }
  }
  return light
}

const BEATS = Array.from({ length: HEART_SAMPLES }, (_, i) => heartbeat(i / HEART_SAMPLES))
const LIGHT = afterglow(BEATS)

/**
 * One heartbeat as keyframes, `HEART_S` long: `grow` is how much larger the
 * beat makes it, `dim` the opacity it sinks to between beats (it is at 1 at the
 * peak). Either may be left out.
 */
export function heartKeyframes({ grow = 0, dim }: { grow?: number; dim?: number }): Keyframe[] {
  return Array.from({ length: HEART_SAMPLES + 1 }, (_, i) => {
    // The last frame repeats the first, so the cycle closes on itself.
    const at = i % HEART_SAMPLES
    const frame: Keyframe = { offset: i / HEART_SAMPLES }
    if (grow) frame.transform = `scale(${1 + grow * BEATS[at]})`
    if (dim !== undefined) frame.opacity = dim + (1 - dim) * LIGHT[at]
    return frame
  })
}
