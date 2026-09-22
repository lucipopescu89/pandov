/**
 * A length on the 1920-unit design canvas, as a page draws it: the Figma
 * number on a 1920 screen, shrinking with a narrower one and never growing
 * past it on a wider one.
 *
 * Its own module because both a server component and a client component use
 * it, and a function exported from a "use client" file reaches the server only
 * as a reference that cannot be called.
 */
export const u = (n: number) => `min(${n}px, ${((n / 1920) * 100).toFixed(4)}vw)`
