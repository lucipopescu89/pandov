import { Manrope } from "next/font/google"

/**
 * The site's type, in one place (2026-11-16, the author's asking).
 *
 * Two faces, by length of text, as before: Julius Sans One for what is
 * glanced at (logo, menus, names, labels, verses, short lines) and Manrope for
 * what is read (the lines of intent, a pendant's line, the order panel, the
 * details, the price). Manrope took Assistant's place that day, at one weight,
 * 400, everywhere; until then Assistant was loaded by five components at 300
 * or 400 for the same kind of text.
 *
 * Manrope is loaded once, here, and `app/layout.tsx` puts its variable on
 * <html>, so any component or stylesheet reaches it as `var(--font-text)`.
 */
export const manrope = Manrope({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-text" })

/** Julius Sans One, by its literal name (the SVG captions need the same name). */
export const JULIUS = "'Julius Sans One', sans-serif"
/** Manrope, through the variable `app/layout.tsx` sets. */
export const TEXT_FONT = "var(--font-text), sans-serif"

/**
 * One letter-spacing for Julius, wherever it is set: 0.2em, the menu's. Until
 * 2026-11-16 there were twelve, from 0.05em to 0.48em. A centred line that
 * carries it gives `TRACK_BACK` back on its right, so its letters, not its box,
 * stand on the centre line.
 */
export const TRACK = "0.2em"
export const TRACK_BACK = "-0.2em"
/**
 * Manrope is tracked airily, 0.04em, on every line of it (2026-11-17, the
 * author's asking; until then it was set as drawn, with none).
 */
export const TEXT_TRACK = "0.04em"

/**
 * Manrope's one size, px: 12, everywhere, on every screen (2026-11-17, the
 * author's asking: "nici mai mult nici mai puțin"). It does not grow or shrink
 * with the screen. Until then each page set its own (Contact 15px, the order
 * panel 15–17px, Making 13–20px with the screen) above a 13px floor.
 */
export const TEXT_SIZE = 12

/**
 * The floor under which Julius does not go, on any screen; a size that follows
 * the screen keeps it as its lower bound.
 */
export const JULIUS_MIN = 11
/** Manrope's size, under its older name: it is `TEXT_SIZE`, no longer a floor. */
export const TEXT_MIN = TEXT_SIZE
