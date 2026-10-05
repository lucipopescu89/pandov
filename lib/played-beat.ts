/**
 * A beat played at its own pace, rather than scrolled.
 *
 * The homepage's opening is a few pictures, and the scroll moves from one to
 * the next: each move is played in its own time, whatever the hand does,
 * while the page is held (`holdScroll` in `components/hero-animation.tsx`).
 * The author asked for it a beat at a time on 2026-10-02: the doors, then
 * Presence, then For Mind.
 *
 * A beat stands at a place on the page. It plays forward once the page is
 * past that place and backward once it is back before it, from wherever it
 * stood, at the same pace both ways. `on` says which side of its place the
 * page is; it is read again on every scroll. `paint` is given the time into
 * the beat, 0 → `length` seconds, and writes the styles itself, outside
 * React: a beat changes every frame for a couple of seconds, and nothing else
 * on the page needs to hear of it.
 *
 * The doors keep their own player, because they also wait on their frames
 * being decoded. This is the same loop without that.
 */

/**
 * How far the scroll that starts a beat moves the page past the beat's place:
 * an arrow key's step. Where it moves the page, nothing on the screen follows
 * the scroll, so the move is never seen.
 */
export const NUDGE_PX = 40

/** easeInOutCubic. */
export function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Linear 0 → 1 across [from, to], flat outside it, and 0 for a non-finite value. */
export function ramp(v: number, from: number, to: number): number {
  const r = to <= from ? (v >= to ? 1 : 0) : (v - from) / (to - from)
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0
}

export type PlayedBeat = {
  /** How far it has played, 0 → 1. */
  done: () => number
  dispose: () => void
}

/**
 * Every beat on the page by its name, so that one place can send a beat back
 * to its start at once. For Mind's is played by two players, the hero's wash
 * and the row's rise, under one name.
 */
const beats = new Map<string, Set<() => void>>()

/**
 * Sends the beats of that name straight back to their start, without playing
 * them backward (2026-10-02, the author's asking).
 *
 * Played backward one at a time, as a single turn of the wheel up plays one,
 * a beat is the way back. But a scroll back up past several beats set all of
 * them playing backward together, each at its own pace. For Mind's wash comes
 * first going forward, so it comes last going back: the screen stayed white
 * for some two seconds before anything else could be seen. Back at the top of
 * the page that read as the handles still loading. So the hero
 * (`components/hero-animation.tsx`) sends a beat back to its start once the
 * page is back before an earlier beat's place too, and sends all of them back
 * once the page is above the pin.
 */
export function rewind(name: string): void {
  beats.get(name)?.forEach((snap) => snap())
}

export function playBeat(
  length: number,
  on: () => boolean,
  paint: (t: number) => void,
  name?: string,
): PlayedBeat {
  let t = 0
  let going = false
  let primed = false
  let raf = 0
  let last = 0

  const moving = () => (going ? t < length : t > 0)

  const tick = (now: number) => {
    raf = 0
    // Held to a twentieth of a second, so a tab coming back from the
    // background carries on where it was rather than leaping to the end.
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    t = going ? Math.min(length, t + dt) : Math.max(0, t - dt)
    paint(t)
    if (moving()) raf = requestAnimationFrame(tick)
  }

  const measure = () => {
    going = on()
    if (!primed) {
      // A page that opens past the beat, restored or followed from a link,
      // finds it already played rather than playing it out of sight.
      primed = true
      t = going ? length : 0
      paint(t)
    }
    if (!raf && moving()) {
      last = 0
      raf = requestAnimationFrame(tick)
    }
  }

  // Back to the start at once. Only ever asked of a beat that is off: one
  // that is on would start forward again on the next scroll.
  const snap = () => {
    if (t === 0 && !raf) return
    cancelAnimationFrame(raf)
    raf = 0
    t = 0
    paint(0)
  }
  if (name) {
    if (!beats.has(name)) beats.set(name, new Set())
    beats.get(name)!.add(snap)
  }

  measure()
  window.addEventListener("scroll", measure, { passive: true })
  window.addEventListener("resize", measure)
  window.addEventListener("pageshow", measure)
  return {
    done: () => t / length,
    dispose: () => {
      cancelAnimationFrame(raf)
      if (name) beats.get(name)?.delete(snap)
      window.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      window.removeEventListener("pageshow", measure)
    },
  }
}
