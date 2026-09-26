import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { FadeInVideo } from "@/components/fade-in-video"
import { AmbientMode } from "@/components/ambient-mode"

/**
 * Making landing page — same dark shell as the Body/Mind pages
 * (background #202020, `Navigation`, `BodyFooter`).
 *
 * The hero is the Nujaad process video, full-bleed across the page width and
 * dropped to 20% opacity; it comes up out of the dark ground as it starts to
 * play, and goes back down and comes up again at every loop (`FadeInVideo`).
 * As on the Contact page, the top and bottom menus are pinned to the viewport,
 * and so is the line "Making is still in the making", centered on screen in
 * white Julius Sans One. Only the video scrolls.
 */

/**
 * The pace the footage plays at: 80% of its own, at the author's request —
 * 90% first, then 80% to see whether it holds up that slow. It does: the
 * footage is 30 frames a second, so this shows 24, a film's rate.
 */
const MAKING_RATE = 0.8

const julius = {
  fontFamily: "'Julius Sans One', sans-serif",
  textTransform: "uppercase" as const,
}

/**
 * On a computer the film is drawn at `FILM_SCALE` of the page, centred, the
 * author's asking on 2026-09-26. It stays the same crop, only smaller. Full
 * width, a portrait film on a landscape screen came up very close. The page
 * is left around it, and the film's edges melt into the ground over
 * `FILM_EDGE` of its width and height, so no rectangle shows. A phone keeps
 * the film to the edges, where it was always the right size.
 */
const FILM_SCALE = 0.7
const FILM_EDGE = "20%"
const FILM_INSET = `${+(((1 - FILM_SCALE) / 2) * 100).toFixed(2)}%`
const FILM_MASK = `linear-gradient(to right, transparent, #000 ${FILM_EDGE}, #000 calc(100% - ${FILM_EDGE}), transparent), linear-gradient(to bottom, transparent, #000 ${FILM_EDGE}, #000 calc(100% - ${FILM_EDGE}), transparent)`
const FILM_CSS = `@media (min-width: 768px) {
  .making-film { inset: ${FILM_INSET}; -webkit-mask-image: ${FILM_MASK}; -webkit-mask-composite: source-in; mask-image: ${FILM_MASK}; mask-composite: intersect; }
}`

export function MakingCollections() {
  return (
    <main
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: "#202020",
        // Tall page. The (portrait) video is displayed full page width with
        // object-cover, so a height of 90vw shows the centre ~50% of the
        // video's height (full width height would be ~180vw), cropped top and
        // bottom from the centre. This height is what the page scrolls through.
        height: "90vw",
        minHeight: "100vh",
      }}
    >
      {/* Page-sized video — scrolls with the page behind the fixed menus and
          title, at 20% opacity.

          A phone used to get the whole frame with a 1.5× zoom on top, so it
          downloaded all 1000 × 1800 and showed at most the middle 667 × 1200.
          Its cut is that middle, 680 × 1200, at three quarters of the size;
          shown with object-fit: cover and no zoom it frames the same, to
          within 2% on any screen under 768px wide, and it weighs 449KB against
          the full footage's 829KB.

          On a computer it is drawn smaller, inside the page. See FILM_SCALE. */}
      <style>{FILM_CSS}</style>
      <div className="making-film absolute inset-0">
        <FadeInVideo
          className="absolute inset-0 w-full h-full"
          src="/videos/making.mp4?v=1"
          phone={{
            src: "/videos/making-phone.mp4?v=1",
            poster: "/videos/making-phone-poster.jpg?v=1",
            media: "(max-width: 767px)",
          }}
          poster="/videos/making-poster.jpg?v=1"
          opacity={0.2}
          rate={MAKING_RATE}
          loopFade
        />
      </div>

      {/* Top menu — fixed and transparent so the video scrolls behind it */}
      <div className="ambient-fade fixed inset-x-0 top-0 z-20">
        <Navigation bgColor="transparent" />
      </div>

      {/* Title — fixed at the center of the screen. Font size matches the
          menu links (~12px on the master canvas). */}
      <div className="ambient-fade pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-6">
        <h1
          className="text-center text-balance"
          style={{
            color: "#ffffff",
            opacity: 0.5,
            fontSize: "clamp(10px, 0.62vw, 12px)",
            letterSpacing: "0.14em",
            lineHeight: 1.3,
            ...julius,
          }}
        >
          Making is still in the making
        </h1>
      </div>

      {/* Bottom menu — fixed and transparent so the video scrolls behind it */}
      <div className="ambient-fade fixed inset-x-0 bottom-0 z-20">
        <BodyFooter activeLabel="making" mark={false} />
      </div>

      {/* After a few quiet seconds the menus and the line fade and the film is
          left alone; any movement brings them back. See AmbientMode. */}
      <AmbientMode />
    </main>
  )
}
