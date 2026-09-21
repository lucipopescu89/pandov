import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { FadeInVideo } from "@/components/fade-in-video"

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
          the full footage's 829KB. */}
      <FadeInVideo
        className="absolute inset-0 w-full h-full"
        src="/videos/making.mp4?v=1"
        phone={{ src: "/videos/making-phone.mp4?v=1", media: "(max-width: 767px)" }}
        poster="/videos/making-poster.jpg?v=1"
        opacity={0.2}
        rate={MAKING_RATE}
        loopFade
      />

      {/* Top menu — fixed and transparent so the video scrolls behind it */}
      <div className="fixed inset-x-0 top-0 z-20">
        <Navigation bgColor="transparent" />
      </div>

      {/* Title — fixed at the center of the screen. Font size matches the
          menu links (~12px on the master canvas). */}
      <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-6">
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
      <div className="fixed inset-x-0 bottom-0 z-20">
        <BodyFooter activeLabel="making" />
      </div>
    </main>
  )
}
