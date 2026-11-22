import { SeenMosaic } from "@/components/seen-mosaic"

/**
 * The hidden page behind the eye (2026-11-08, an experiment): since
 * 2026-11-22 the author's own folder for it, in one Mondrian-like division
 * of the screen, each picture whole, after a line
 * on the dark. No menu links here; only a click on the eye in the homepage's
 * Making section does. See `components/seen-mosaic.tsx`.
 */
export const metadata = {
  title: "PANDOV",
  robots: { index: false, follow: false },
}

export default function SeenPage() {
  return <SeenMosaic />
}
