import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"

/**
 * Making landing page — same dark shell as the Body/Mind pages
 * (background #202020, `Navigation`, `BodyFooter`).
 *
 * The hero is the Nujaad process video, full-bleed across the page width and
 * dropped to 20% opacity. As on the Contact page, the top and bottom menus are
 * pinned to the viewport, and so is the line "Making is still in the making",
 * centered on screen in white Julius Sans One. Only the video scrolls.
 */
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
          title, at 20% opacity. */}
      <video
        className="absolute inset-0 w-full h-full scale-150 md:scale-100"
        src="/videos/making.mp4"
        poster="/videos/making-poster.jpg"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        style={{ objectFit: "cover", objectPosition: "center", opacity: 0.2 }}
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
