/**
 * Second Wind's fields hurry when a pendant asks them to, not when the page is
 * scrolled (2026-11-13, the author's asking). On a computer a field hurries
 * while the pointer is over its pendant's photograph; on a touch screen a tap
 * on the photograph hurries it for `HURRY_TAP_MS` and then opens the pendant's
 * page (`components/pendant-link.tsx`).
 *
 * The photograph's link and the field are siblings in the page, so they speak
 * through one window event, matched by the section's label ("Icarus",
 * "Silence", …). `public/pandov-fx.js` listens for it too, for Silence's dust.
 */
export const HURRY_EVENT = "pandov:hurry"

/** How long a tap hurries a field before the pendant's page opens, ms. */
export const HURRY_TAP_MS = 1500

export type HurryDetail = { label: string; on: boolean }

export function sendHurry(label: string, on: boolean) {
  window.dispatchEvent(new CustomEvent<HurryDetail>(HURRY_EVENT, { detail: { label, on } }))
}

/** Calls `set` whenever the pendant labelled `label` starts or stops hurrying its field. */
export function listenHurry(label: string | undefined, set: (on: boolean) => void) {
  const listen = (e: Event) => {
    const detail = (e as CustomEvent<HurryDetail>).detail
    if (label && detail?.label === label) set(detail.on)
  }
  window.addEventListener(HURRY_EVENT, listen)
  return () => window.removeEventListener(HURRY_EVENT, listen)
}
