"use client"

import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { FadeInVideo } from "@/components/fade-in-video"
import { AmbientMode } from "@/components/ambient-mode"
import { STUDIO_EMAIL } from "@/lib/second-wind"

/** The studio on Instagram, the author's own address (2026-09-26). */
const INSTAGRAM_URL = "https://www.instagram.com/pandov.studio/"

/**
 * Contact landing page — an exact copy of the Making page shell (full-page
 * Nujaad process video at 40% opacity behind transparent top/bottom menus),
 * but with the studio message and the homepage subscribe form overlaid in
 * white Julius Sans One instead of the "Making" line.
 */
const julius = {
  fontFamily: "'Julius Sans One', sans-serif",
}

export function ContactCollections() {
  const inputStyle: React.CSSProperties = {
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.4)",
    outline: "none",
    background: "transparent",
    textAlign: "center",
    fontSize: "clamp(10px, 0.62vw, 12px)",
    letterSpacing: "0.15em",
    color: "#fff",
    padding: "6px 0",
    width: "240px",
    fontFamily: "inherit",
  }

  return (
    <main
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: "#202020",
        // The page is exactly one viewport tall so the whole layout (menus +
        // content) fits without scrolling.
        height: "100dvh",
      }}
    >
      {/* Fixed full-screen background video — pinned to the viewport, filling
          the whole screen (cropped as needed) behind the transparent top and
          bottom menus, at 80% opacity, coming up out of the dark ground as it
          starts to play.

          The footage is landscape, 1280 × 720, and a portrait screen covered
          by it shows only the middle of it: 720 tall and as wide as the
          screen's proportion allows, on a phone a quarter to a third. The
          phone's cut is the middle 540 × 720, all that any screen up to 3:4
          shows, so up to 3:4 it frames exactly as before; it weighs 306KB
          against 713KB. 3:4 rather than a phone's own 9:16, because a phone's
          browser takes some of the height for its bars and the page is then
          wider than 9:16 — an iPhone SE's Safari opens at about 375 × 548. */}
      <FadeInVideo
        className="fixed inset-0 h-screen w-screen"
        src="/videos/contact-bg.mp4?v=1"
        phone={{
          src: "/videos/contact-bg-phone.mp4?v=1",
          poster: "/videos/contact-bg-phone-poster.jpg?v=1",
          media: "(max-aspect-ratio: 3/4)",
        }}
        poster="/videos/contact-bg-poster.jpg?v=1"
        opacity={0.8}
      />

      {/* Content layer on top of the video: menus + message + subscribe form */}
      <div className="ambient-fade relative z-10 flex h-full flex-col">
        {/* Top menu — transparent so the video shows through behind it */}
        <Navigation bgColor="transparent" />

        {/* Overlaid message + subscribe form, vertically centered */}
        <div className="pointer-events-none flex-1 flex flex-col items-center justify-center px-6">
          <p
            className="text-center text-balance"
            style={{
              ...julius,
              color: "#ffffff",
              opacity: 0.5,
              fontSize: "clamp(10px, 0.62vw, 12px)",
              letterSpacing: "0.14em",
              lineHeight: 1.9,
              margin: 0,
            }}
          >
            The work continues.
            <br />
            Subscribe to receive occasional updates from the studio.
          </p>

          {/* Subscribe form — same fields as the homepage, styled for the
              dark video background. */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="pointer-events-auto"
            style={{
              ...julius,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              marginTop: "40px",
            }}
          >
            <input type="text" placeholder="[Your Name]" style={inputStyle} />
            <input type="email" placeholder="[Your Email Address]" style={inputStyle} />
            <button
              type="submit"
              style={{
                border: "none",
                background: "transparent",
                fontSize: "clamp(10px, 0.62vw, 12px)",
                letterSpacing: "0.2em",
                color: "#fff",
                cursor: "pointer",
                padding: "4px 0",
                fontFamily: "inherit",
                textTransform: "uppercase",
                marginTop: "8px",
                opacity: 0.85,
              }}
            >
              Subscribe
            </button>
          </form>

          {/* The studio's address and its Instagram, under the form, one over
              the other as the author drew them on 2026-09-26. The address opens
              the visitor's own mail app, as ORDER does on the pendant pages.

              The page is one screen tall and hides what does not fit, so on a
              short screen the two stand side by side, closer under the form.
              An iPhone 8's Safari opens at about 375 × 553. Stacked, they
              would push the bottom menu 70px off such a screen. Below 680px
              high they share a line, and the menu keeps its place. */}
          <div className="mt-[clamp(40px,11vh,104px)] flex flex-col items-center [@media(max-height:680px)]:mt-4 [@media(max-height:680px)]:flex-row [@media(max-height:680px)]:gap-3">
          <a
            href={`mailto:${STUDIO_EMAIL}`}
            className="pointer-events-auto transition-opacity hover:opacity-50"
            style={{
              ...julius,
              padding: "8px 12px",
              fontSize: "clamp(10px, 0.62vw, 12px)",
              letterSpacing: "0.1em",
              color: "#fff",
              opacity: 0.75,
              textDecoration: "none",
            }}
          >
            {STUDIO_EMAIL}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pandov on Instagram"
            className="pointer-events-auto mt-[clamp(20px,6vh,56px)] transition-opacity hover:opacity-50 [@media(max-height:680px)]:mt-0"
            style={{ padding: 8, color: "#fff", opacity: 0.75, lineHeight: 0 }}
          >
            {/* Instagram's glyph, solid, with the lens and the flash cut out
                of it so the video shows through them. */}
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M7 1h10a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H7a6 6 0 0 1-6-6V7a6 6 0 0 1 6-6Zm5 5.3a5.7 5.7 0 1 0 0 11.4 5.7 5.7 0 0 0 0-11.4Zm0 1.9a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Zm5.9-3.1a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z"
              />
            </svg>
          </a>
          </div>
        </div>

        {/* Bottom menu — transparent so the video shows through behind it */}
        <BodyFooter activeLabel="contact" mark={false} />
      </div>

      {/* After a few quiet seconds everything over the film fades and the film
          is left alone; any movement brings it back. Never while someone is in
          the form. See AmbientMode. */}
      <AmbientMode />
    </main>
  )
}
