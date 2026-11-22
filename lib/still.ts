/**
 * The site without motion (2026-11-22, the author's asking, after visitors
 * said the pages did not flow on their phones): plain scrolling everywhere,
 * on a phone and a computer, the homepage's played passages become pictures,
 * and of the movement only the soft appearances and the 3D on a click remain.
 *
 * Most of the site's animations already had a still version, for a visitor
 * whose phone or computer asks for less motion (`prefers-reduced-motion`):
 * the sun and the sea of the homepage's Making drawn once, the drawing there
 * whole, the moon and its mandala on the Chess Set without the drop and the
 * slowed scroll, Satori's and Second Wind's fields drawn once. With `STILL`
 * on, every visitor gets that version, whatever their device asks.
 *
 * To bring the motion back, set `STILL` to false: each of those parts goes
 * back to asking the device. The passages rebuilt for the still site (the
 * homepage's doors and categories, `home-still.tsx`; the Making page,
 * `making-still.tsx`) are separate files; their moving versions are kept
 * unchanged beside them (`hero-animation.tsx`, `categories-section.tsx`,
 * `making-page.tsx`), and `app/page.tsx` and `app/making/page.tsx` say which
 * is used.
 */
export const STILL = true

/** For a stylesheet: the media query under which the still version applies. */
export const STILL_MEDIA = STILL ? "all" : "(prefers-reduced-motion: reduce)"

/** Whether to show the still version: always while `STILL` is on, else as the device asks. */
export function still(): boolean {
  if (STILL) return true
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
