"use client"

import type React from "react"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { FadeInVideo } from "@/components/fade-in-video"
import { AmbientMode } from "@/components/ambient-mode"
import { CenterFade } from "@/components/center-fade"
import { STUDIO_EMAIL } from "@/lib/second-wind"
import { JULIUS_MIN, TEXT_MIN, TEXT_SIZE, TEXT_TRACK, TRACK } from "@/lib/type"

/** The studio on Instagram, the author's own address (2026-09-26). */
const INSTAGRAM_URL = "https://www.instagram.com/pandov.studio/"

/**
 * The Contact page, redrawn on 2026-11-16 from the author's canvas
 * "Pandov — Contact (redesign)": three blocks over the contact film, one under
 * the other, each centred, parted by hairlines that run the whole width of the
 * screen. Get in Touch came first and Studio & Shipping second from the
 * same day's afternoon, the author's asking: drawn the other way round, the
 * page opened on shipping rather than on the address.
 *
 *   1. Get in Touch: the address, Instagram, and a form.
 *   2. Studio & Shipping: where the studio is, where it ships, and how soon a
 *      piece leaves it (in stock, or made to order).
 *   3. Stay in the Loop: the subscribe form, quieter.
 *
 * The three titles are the same size, the author's asking: Get in Touch and
 * the address were drawn larger first and brought down to Stay in the Loop's.
 *
 * Until that day the page was one screen tall with only the subscribe form, the
 * address and Instagram over the film. It now scrolls; the film stays fixed
 * behind it as before, and the bottom menu has its mark back, since there is
 * now a top to go back to (see BodyFooter).
 *
 * Julius Sans One is kept for the three titles alone, the author's asking the
 * same day; everything else on the page is Manrope, the labels, the address and
 * the buttons included. The type keeps to the site's scale (lib/type.ts): the
 * titles in Julius at 11px; Manrope at 12px (TEXT_SIZE) for what is read, the address and
 * the send button, and 13px for the labels, the notes and Subscribe. No other
 * size. (The menus are the shared ones, in Julius as on every page.)
 *
 * Each of the three blocks is lit only while it stands about the middle of
 * the window and fades toward its edges, whole, scrolling down or up, as the
 * captions on Second Wind: the author's asking, the same day (first piece by
 * piece, then, asked again, a block at a time). The hairlines between them
 * fade on their own. See CenterFade. The menus are not faded.
 *
 * The form writes the message into the visitor's own mail app, addressed to
 * the studio, as ORDER does on the pendant pages: the author chose mailto over
 * a form service on 2026-09-23, and nothing here needs a server. The subscribe
 * form is still not connected to a list, as before.
 */

/** Greys on the dark ground: titles and labels, the text that is read, the notes. */
const MUTED = "#9a9a9a"
const TEXT = "rgba(255,255,255,0.7)"
const NOTE = "rgba(255,255,255,0.55)"
const INK = "#f0f0f0"
const RULE = "rgba(255,255,255,0.14)"

/** What a message can be about; the first words of its subject line. */
const TOPICS = [
  "Commission",
  "Object enquiry",
  "Collaboration",
  "Wholesale",
  "Gallery representation",
  "Something else",
]

const CSS = `
  .ct-j { font-family: var(--font-heading); font-weight: 400; text-transform: uppercase; letter-spacing: ${TRACK}; }
  /* a centred tracked line gives its tracking back on the left, so its letters sit on the centre */
  .ct-c { padding-left: ${TRACK}; }
  .ct-t { font-family: var(--font-text); font-weight: 400; letter-spacing: ${TEXT_TRACK}; }
  .ct-title { margin: 0; font-size: ${JULIUS_MIN}px; line-height: 1.5; color: ${MUTED}; }
  .ct-label { font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; letter-spacing: ${TEXT_TRACK}; line-height: 1.5; color: ${MUTED}; }
  .ct-read { font-size: ${TEXT_SIZE}px; line-height: 1.8; color: ${TEXT}; }
  .ct-note { font-size: ${TEXT_MIN}px; line-height: 1.7; color: ${NOTE}; }

  .ct-section { width: 100%; box-sizing: border-box; padding: 96px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .ct-rule { width: 100%; height: 1px; background: ${RULE}; }

  .ct-link { transition: opacity 0.35s ease; }
  .ct-link:hover { opacity: 0.5; }

  .ct-in { width: 100%; box-sizing: border-box; border: none; border-bottom: 1px solid rgba(255,255,255,0.28); border-radius: 0;
    background: transparent; color: #fff; font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_SIZE}px; letter-spacing: ${TEXT_TRACK}; padding: 10px 0; outline: none;
    transition: border-color 0.35s ease; }
  .ct-in:focus { border-bottom-color: rgba(255,255,255,0.75); }
  select.ct-in { appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 24px; }
  select.ct-in option { background: #202020; color: #e6e6e6; }
  textarea.ct-in { resize: vertical; min-height: 120px; line-height: 1.7; }
  .ct-loop .ct-in { font-size: ${TEXT_MIN}px; padding: 8px 0; }

  .ct-send { background: transparent; border: 1px solid rgba(255,255,255,0.45); color: ${INK};
    font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_SIZE}px; letter-spacing: ${TEXT_TRACK}; line-height: 1;
    padding: 16px 44px; min-height: 48px; cursor: pointer;
    transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease; }
  .ct-send:hover { background: #e6e6e6; color: #202020; border-color: #e6e6e6; }

  .ct-2col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; row-gap: 28px; }
  .ct-loop { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; column-gap: 24px; align-items: end; }

  @media (max-width: 767px) {
    .ct-section { padding: 72px 28px; }
  }
  @media (max-width: 600px) {
    .ct-2col { grid-template-columns: minmax(0, 1fr); }
    .ct-loop { grid-template-columns: minmax(0, 1fr); row-gap: 18px; }
    .ct-loop-btn { justify-self: center; }
  }
`

/** Opens the visitor's mail app with the form's message written out, addressed to the studio. */
function sendByMail(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  const data = new FormData(e.currentTarget)
  const field = (k: string) => String(data.get(k) ?? "").trim()
  const name = field("name")
  const email = field("email")
  const topic = field("topic")
  const message = field("message")
  const subject = name ? `${topic} — ${name}` : topic
  const body = [message, "", "—", name, email].filter((line, i) => i < 3 || line).join("\n")
  window.location.href = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function ContactCollections() {
  return (
    <main className="relative w-full" style={{ backgroundColor: "#202020", minHeight: "100dvh" }}>
      {/* The contact film, fixed to the screen behind the page and filling it
          (cropped as needed), at 80% opacity, coming up out of the dark ground
          as it starts to play. The page scrolls over it.

          The footage is landscape, 1280 × 720, and a portrait screen covered
          by it shows only the middle of it. The phone's cut is the middle
          540 × 720, all that any screen up to 3:4 shows; it weighs 306KB
          against 713KB. 3:4 rather than a phone's own 9:16, because a phone's
          browser takes some of the height for its bars. */}
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

      <div className="ambient-fade relative z-10 flex flex-col items-center" style={{ color: "#e6e6e6" }}>
        <Navigation bgColor="transparent" />

        {/* 1 · Get in Touch */}
        <section data-center-fade="block" className="ct-section" aria-labelledby="ct-touch">
          <h2 id="ct-touch" className="ct-j ct-c ct-title">
            Get in Touch
          </h2>
          <p className="ct-t ct-read" style={{ margin: "28px 0 0", maxWidth: 420 }}>
            For commissions, object enquiries, collaborations, wholesale and gallery representation:
          </p>
          <a
            href={`mailto:${STUDIO_EMAIL}`}
            className="ct-t ct-link"
            style={{
              marginTop: 24,
              fontSize: TEXT_SIZE,
              color: "#fff",
              textDecoration: "none",
              paddingTop: 6,
              paddingBottom: 8,
              borderBottom: "1px solid rgba(255,255,255,0.4)",
            }}
          >
            {STUDIO_EMAIL}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pandov on Instagram"
            className="ct-link"
            style={{ marginTop: 20, padding: 10, color: "#bdbdbd", lineHeight: 0 }}
          >
            {/* Instagram's glyph, solid, with the lens and the flash cut out of
                it so the film shows through them. */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M7 1h10a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H7a6 6 0 0 1-6-6V7a6 6 0 0 1 6-6Zm5 5.3a5.7 5.7 0 1 0 0 11.4 5.7 5.7 0 0 0 0-11.4Zm0 1.9a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Zm5.9-3.1a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z"
              />
            </svg>
          </a>
          <p className="ct-t ct-note" style={{ margin: "32px 0 0" }}>
            Or use the contact form below.
          </p>

          <form
            onSubmit={sendByMail}
            className="flex flex-col"
            style={{ width: "100%", maxWidth: 512, marginTop: 44, gap: 30, textAlign: "left" }}
          >
            <div className="ct-2col">
              <label className="flex flex-col" style={{ gap: 6 }}>
                <span className="ct-label">Name</span>
                <input className="ct-in" type="text" name="name" autoComplete="name" required />
              </label>
              <label className="flex flex-col" style={{ gap: 6 }}>
                <span className="ct-label">Email</span>
                <input className="ct-in" type="email" name="email" autoComplete="email" required />
              </label>
            </div>
            <label className="relative flex flex-col" style={{ gap: 6 }}>
              <span className="ct-label">Regarding</span>
              <select className="ct-in" name="topic" defaultValue={TOPICS[0]}>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
                style={{ position: "absolute", right: 2, bottom: 16, pointerEvents: "none" }}
              >
                <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke={MUTED} strokeWidth="1" />
              </svg>
            </label>
            <label className="flex flex-col" style={{ gap: 6 }}>
              <span className="ct-label">Message</span>
              <textarea className="ct-in" name="message" rows={5} required />
            </label>
            <div className="flex justify-center" style={{ marginTop: 10 }}>
              <button type="submit" className="ct-send">
                Send message
              </button>
            </div>
          </form>
        </section>

        <div className="ct-rule" aria-hidden="true" data-center-fade />

        {/* 2 · Studio & Shipping */}
        <section data-center-fade="block" className="ct-section" aria-labelledby="ct-studio">
          <h2 id="ct-studio" className="ct-j ct-c ct-title">
            Studio &amp; Shipping
          </h2>
          <p className="ct-t ct-read" style={{ margin: "28px 0 0", maxWidth: 440 }}>
            We are based in Padeș, Gorj, Romania, and ship throughout the European Union. For destinations outside
            the EU, please contact us to discuss individual shipping options.
          </p>
          <div className="ct-2col" style={{ width: "100%", maxWidth: 440, marginTop: 40 }}>
            <div className="flex flex-col items-center" style={{ gap: 10 }}>
              <span className="ct-label">In stock</span>
              <span className="ct-t" style={{ fontSize: TEXT_SIZE, color: "#e6e6e6" }}>
                Dispatched within 1 business day
              </span>
            </div>
            <div className="flex flex-col items-center" style={{ gap: 10 }}>
              <span className="ct-label">Made to order</span>
              <span className="ct-t" style={{ fontSize: TEXT_SIZE, color: "#e6e6e6" }}>
                Approximately 2–4 weeks
              </span>
            </div>
          </div>
          <p className="ct-t ct-note" style={{ margin: "28px 0 0" }}>
            Times refer to dispatch from the studio, not delivery.
          </p>
        </section>

        <div className="ct-rule" aria-hidden="true" data-center-fade />

        {/* 3 · Stay in the Loop */}
        <section data-center-fade="block" className="ct-section" aria-labelledby="ct-loop">
          <h2 id="ct-loop" className="ct-j ct-c ct-title">
            Stay in the Loop
          </h2>
          <p className="ct-t ct-note" style={{ margin: "20px 0 0", maxWidth: 380 }}>
            Occasional updates on new objects, collections and ongoing explorations.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="ct-loop"
            style={{ width: "100%", maxWidth: 480, marginTop: 28, textAlign: "left" }}
          >
            <label className="flex flex-col" style={{ gap: 4 }}>
              <span className="ct-label">Name</span>
              <input className="ct-in" type="text" name="sub-name" autoComplete="name" />
            </label>
            <label className="flex flex-col" style={{ gap: 4 }}>
              <span className="ct-label">Email</span>
              <input className="ct-in" type="email" name="sub-email" autoComplete="email" />
            </label>
            <button
              type="submit"
              className="ct-t ct-link ct-loop-btn"
              style={{
                background: "transparent",
                border: "none",
                color: "#d0d0d0",
                fontSize: TEXT_MIN,
                paddingTop: 12,
                paddingBottom: 12,
                paddingRight: 0,
                minHeight: 44,
                cursor: "pointer",
              }}
            >
              Subscribe
            </button>
          </form>
        </section>

        {/* The bottom menu as on every other page, with its mark back: the page
            scrolls now, so the mark has a top to go back to. */}
        <BodyFooter activeLabel="contact" />
      </div>

      {/* After a few quiet seconds everything over the film fades and the film
          is left alone; any movement, a scroll included, brings it back. Never
          while someone is in a form. See AmbientMode. */}
      <AmbientMode />

      {/* Only the block about the middle of the window is lit, as the
          captions on Second Wind: every element marked data-center-fade. */}
      <CenterFade />

      <style>{CSS}</style>
    </main>
  )
}
