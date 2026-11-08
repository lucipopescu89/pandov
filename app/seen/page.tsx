import { SeenMosaic } from "@/components/seen-mosaic"

/**
 * The hidden page behind the eye (2026-11-08, an experiment): every
 * photograph on the site in one Mondrian-like division of the screen. No menu
 * links here; only a click on the eye in the homepage's Making section does.
 * See `components/seen-mosaic.tsx`.
 */
export const metadata = {
  title: "PANDOV",
  robots: { index: false, follow: false },
}

export default function SeenPage() {
  return <SeenMosaic />
}
