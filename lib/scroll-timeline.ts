/**
 * Whether the browser can play an animation on the scroll itself
 * (`ScrollTimeline`), the way the site's settling movements are meant to run.
 *
 * Chrome has it, and Safari from 26. Safari before 26 — every iPhone that
 * cannot update past iOS 18, the author's iPhone 8 among them — does not. There
 * a movement held against the page can only be written from a scroll handler,
 * a frame after the page has moved, and on a phone that reads as stutter. So
 * since 2026-11-20 (the audit, the author's choice "C with B") those browsers
 * get the calmer versions: the doors open by themselves while the page scrolls
 * on its own (`HeroAnimation`), and the footer's hand stands still and only
 * fades (`Footer`). Desktop Chrome and new iPhones are unchanged.
 *
 * `?safari16` in the address forces the calmer versions in any browser, to see
 * them on a computer.
 */
export function hasScrollTimeline(): boolean {
  if (typeof window === "undefined") return true
  if (new URLSearchParams(window.location.search).has("safari16")) return false
  return typeof (window as unknown as { ScrollTimeline?: unknown }).ScrollTimeline === "function"
}
