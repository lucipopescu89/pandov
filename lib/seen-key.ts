/**
 * The way into /seen and back out, through the homepage's Making eye.
 *
 * `FROM_EYE_KEY` is set in sessionStorage by the Making eye just before it
 * takes the reader to /seen, holding how far down the screen the eye stood
 * (px), so the eyes there know to take them back (browser history) rather
 * than to the top of the homepage.
 *
 * `RETURN_KEY` is set by the eyes of /seen as they take the reader back, with
 * the same number, so that the Making section can put its eye where it was on
 * the screen, out of sight until the photograph and the drawing are ready
 * (`MakingDrawing`).
 *
 * Their own module so the homepage does not load the /seen eyes' drawing to
 * read two strings.
 */
export const FROM_EYE_KEY = "pandov:seen-from-eye"
export const RETURN_KEY = "pandov:seen-return"
