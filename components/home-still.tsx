import Link from "next/link"
import { JULIUS, JULIUS_MIN, TRACK } from "@/lib/type"

/*
 * The homepage's top, still (2026-11-22, the author's asking, after visitors
 * said the pages did not flow on their phones; see lib/still.ts): the doors,
 * Presence and the three categories as pictures in the page, scrolled past
 * like any page, nothing held and nothing tied to the scroll.
 *
 * What they replace, kept unchanged in their own files: the doors played on
 * the first scroll with the page held while they opened, then Presence and the
 * dark washing over them, For Mind coming up with the scroll
 * (`hero-animation.tsx`, `categories-section.tsx`), the menu hidden until the
 * reader scrolled up (`reveal-on-scroll-up.tsx`) and the hint to scroll
 * (`scroll-hint.tsx`). `app/page.tsx` says which are used.
 *
 * The pictures are the moving version's own: the doors' first frame (the
 * phone's narrow crop under 768px), Presence, and the three categories'
 * photographs in their white bands. Heights are in `svh`, the screen's height
 * with the phone's bars shown, which does not change as they come and go, so
 * nothing shifts under a scrolling finger.
 */

const DARK = "#202020"
const GREY = "#888"
/** The categories' photographs sit slightly back, as they did. */
const PHOTO_OPACITY = 0.85

/** The dark between one passage and the next. */
const GAP = "clamp(96px, 20svh, 220px)"

const heading: React.CSSProperties = {
  fontFamily: JULIUS,
  textTransform: "uppercase",
  letterSpacing: TRACK,
  fontSize: "clamp(11px, 2vw, 20px)",
  lineHeight: 1.8,
  color: GREY,
  fontWeight: 400,
  textAlign: "center",
  margin: 0,
  // the letter-spacing after the last letter, given back so the line is centred
  marginRight: `-${TRACK}`,
}

/** A category's two lines, the name and "→ Explore", both a link. */
function Label({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="hs-label">
      <span style={{ ...heading, lineHeight: 1 }}>{title}</span>
      <span style={{ ...heading, lineHeight: 1, fontSize: `clamp(${JULIUS_MIN}px, 1vw, 12px)` }}>&rarr; Explore</span>
    </Link>
  )
}

export function HomeStill() {
  return (
    <div style={{ background: DARK, width: "100%" }}>
      {/* The doors, shut, their handles in the middle. */}
      <picture>
        <source media="(max-width: 767px)" srcSet="/frames/doors-phone/door-00.jpg" width={780} height={1300} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/frames/doors/door-00.jpg"
          alt="Two dark wooden doors, their sculpted brass handles side by side"
          width={2667}
          height={1500}
          fetchPriority="high"
          className="hs-doors"
        />
      </picture>
      <p style={{ ...heading, padding: `clamp(40px, 7svh, 72px) 24px 0` }}>We Open The Doors Of Perception</p>

      {/* Presence, and its line. */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: GAP }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/presence.webp" alt="Presence, a slender standing sculpture" width={309} height={1089} className="hs-presence" />
        <p style={{ ...heading, marginTop: "clamp(28px, 5svh, 48px)" }}>
          We Give Form
          <br />
          To Presence
        </p>
      </div>

      {/* For Mind: the chess set across its white band. */}
      <section className="hs-row">
        <Label title="For Mind" href="/mind" />
        <Link href="/mind" aria-label="For Mind" className="hs-band hs-band-mind">
          <picture>
            <source media="(max-width: 767px)" srcSet="/images/cat-mind-mobile.jpg?v=4" width={1000} height={1195} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cat-mind.jpg" alt="Chess set — For Mind" width={2968} height={900} loading="lazy" decoding="async" />
          </picture>
        </Link>
      </section>

      {/* For Body: the pendant standing in its band. */}
      <section className="hs-row">
        <Label title="For Body" href="/body" />
        <Link href="/body" aria-label="For Body" className="hs-band hs-band-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cat-body.jpg" alt="Body sculpture — For Body" width={1026} height={1868} loading="lazy" decoding="async" />
        </Link>
      </section>

      {/* For Space: the room, its sculpture on the centre line, at the band's foot. */}
      <section className="hs-row">
        <Label title="For Space" href="/space" />
        <Link href="/space" aria-label="For Space" className="hs-band hs-band-space">
          <span className="hs-space-room">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cat-space.avif" alt="For Space sculpture" width={2294} height={1600} loading="lazy" decoding="async" />
            {/* Its left edge, nearly white in the file, taken the rest of the way into the band's white. */}
            <span aria-hidden="true" className="hs-space-edge" />
          </span>
        </Link>
      </section>

      <style>{`
        .hs-doors { display: block; width: 100%; height: auto; max-height: calc(100svh - 88px); object-fit: cover; }
        .hs-presence { display: block; width: auto; height: clamp(300px, 52svh, 560px); }
        .hs-row { display: flex; flex-direction: column; align-items: center; padding-top: ${GAP}; }
        .hs-label { display: flex; flex-direction: column; align-items: center; gap: 18px; margin-bottom: 48px; text-decoration: none; }
        .hs-band { position: relative; display: flex; justify-content: center; align-items: flex-end; width: 100%; background: #fff; overflow: hidden; }
        .hs-band img { display: block; opacity: ${PHOTO_OPACITY}; }
        .hs-band-mind img { width: min(100%, 1800px); height: auto; }
        .hs-band-body { padding-top: 2svh; }
        .hs-band-body img { width: auto; height: clamp(320px, 52svh, 620px); }
        /* The room drawn by its height, the sculpture's axis (44.8% across the photograph) on the centre line. */
        .hs-band-space { height: clamp(380px, 86svh, 900px); display: block; }
        .hs-space-room { position: absolute; bottom: 0; left: 50%; height: 88%; aspect-ratio: 2294 / 1600; transform: translateX(-44.8%); }
        .hs-space-room img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; }
        .hs-space-edge { position: absolute; top: 0; bottom: 0; left: 0; width: 6%; background: linear-gradient(to right, #fff, transparent); pointer-events: none; }
        @media (max-width: 767px) {
          .hs-label { margin-bottom: 36px; }
          .hs-band-mind img { width: 100%; }
          .hs-band-space { height: clamp(340px, 78svh, 700px); }
          .hs-space-room { height: 90%; }
        }
      `}</style>
    </div>
  )
}
