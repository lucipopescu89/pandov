"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BirdRings } from "@/components/bird-rings"
import { BodyFooter } from "@/components/body-footer"
import { JULIUS_MIN, TRACK } from "@/lib/type"

/**
 * The homepage's footer, on #202020 since 2026-11-21 (the author's asking, to
 * simplify the site's look): "Get in touch" and the bird in its rings, then the
 * bottom menu, straight on from Selected's dark.
 *
 * Until that day it was white, and opened on the white sculptural hand wearing
 * the golden ring (`public/images/home/footer-banner.jpg`, kept), which rose
 * with the page, slowed and sank into a white that came up over it, with a
 * composition of its own on a phone. All of that was the hand's, and went with
 * it; the file before that day is in git history. The bird is the GIF as it
 * was; its rings are the words' grey (`RING_COLOR`).
 */

/** The words: the menus' grey, as on Selected above. */
const WORDS_COLOR = "#888888"

/**
 * The rings are the words' grey (2026-11-21, the author's asking; gold was
 * tried first), at full strength: they keep their own fading from the rim in.
 */
const RING_COLOR = WORDS_COLOR
const RING_STRENGTH = 1

/**
 * The bird on the dark (2026-11-21, the author's asking: more contrast, but
 * with its dark parts darker, blending softly into the ground, not lit up): at
 * full strength where it was at 70%, its contrast raised so its shadows
 * (about #2d2d2d) fall to about the ground's #202020 and its lights stay.
 */
const BIRD_OPACITY = 1
const BIRD_CONTRAST = 1.2
/** And most of its colour taken out: it read reddish on the grey (the author's asking, the same day). */
const BIRD_SATURATION = 0.25
/**
 * The ground the bird is lightened onto, the footer's own: its dark parts are
 * lost in it altogether (the author's asking, the same day).
 */
const GROUND = "#202020"

/**
 * The words and the bird fade in as they come up the screen, each from when
 * its middle is `IN_FROM` of the way down the screen to `IN_TO`, and are
 * always fully there at the end of the page. Read off the scroll, never
 * holding it up; only their strength is written, which a frame late does not
 * show.
 */
const IN_FROM = 0.95
const IN_TO = 0.65

/**
 * Lengths are drawn on the old 1600-wide canvas: they grow with the page up to
 * 1600px and then hold (`held`). On a phone they are hundredths of the page's
 * width, the old phone composition's words-to-bird spacing kept.
 */
const CANVAS_W = 1600
function held(px: number): string {
  return `min(${(px / CANVAS_W) * 100}cqw, ${px}px)`
}

const PHONE = "(max-width: 767.98px)"
const LAYOUT = `
.ft-col { padding: ${held(200)} 0 ${held(32)}; }
.ft-words { font-size: clamp(${JULIUS_MIN}px, 0.75vw, 12px); }
.ft-bird { margin-top: ${held(96)}; width: ${held(360)}; }
@media ${PHONE} {
  .ft-col { padding: 24cqw 0 4cqw; }
  .ft-words { font-size: 12px; }
  .ft-bird { margin-top: 16cqw; width: 74cqw; }
}
`

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
}

export function Footer() {
  const wordsRef = useRef<HTMLAnchorElement>(null)
  const birdRef = useRef<HTMLAnchorElement>(null)
  const [ctaIn, setCtaIn] = useState(0)
  const [birdIn, setBirdIn] = useState(0)

  useEffect(() => {
    let raf = 0
    const strength = (el: HTMLElement | null, vh: number, atEnd: boolean) => {
      if (!el) return 0
      if (atEnd) return 1
      const r = el.getBoundingClientRect()
      const mid = r.top + r.height / 2
      return clamp01((IN_FROM * vh - mid) / ((IN_FROM - IN_TO) * vh))
    }
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const atEnd = document.documentElement.scrollHeight - vh - window.scrollY < 2
      setCtaIn(strength(wordsRef.current, vh, atEnd))
      setBirdIn(strength(birdRef.current, vh, atEnd))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    // A tab that loaded in the background only gets a real viewport once it is looked at.
    window.addEventListener("pageshow", onScroll)
    document.addEventListener("visibilitychange", onScroll)
    update()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("pageshow", onScroll)
      document.removeEventListener("visibilitychange", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: GROUND,
        fontFamily: "'Julius Sans One', sans-serif",
        // A pixel up over Selected, so no hairline can show between the two.
        marginTop: "-1px",
      }}
    >
      <style>{LAYOUT}</style>
      <div style={{ containerType: "inline-size", width: "100%" }}>
        <div className="ft-col flex w-full flex-col items-center">
          {/* The words, a way to Contact. The scroll's fade is on the words
              inside, not on the link, whose own opacity is its hover; and the
              link takes no click until they have begun to show. The padding
              only enlarges the tap target. */}
          <Link
            ref={wordsRef}
            href="/contact"
            prefetch={false}
            className="ft-words transition-opacity hover:opacity-50"
            style={{
              pointerEvents: ctaIn > 0 ? "auto" : "none",
              padding: "12px 16px",
              letterSpacing: TRACK,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              color: WORDS_COLOR,
              textDecoration: "none",
            }}
          >
            <span style={{ opacity: ctaIn }}>&rarr; Get in touch</span>
          </Link>

          {/* The bird in its rings, a way to Contact too. Round, because the
              mark is: the link's own rounded box takes the click, so the
              corners of the square the rings are drawn in are not a link. */}
          <Link
            ref={birdRef}
            href="/contact"
            prefetch={false}
            aria-label="Get in touch"
            className="ft-bird transition-opacity hover:opacity-50"
            style={{
              pointerEvents: birdIn > 0 ? "auto" : "none",
              display: "block",
              aspectRatio: "1",
              borderRadius: "50%",
            }}
          >
            <BirdRings
              size="100%"
              ringColor={RING_COLOR}
              ringStrength={RING_STRENGTH}
              birdOpacity={BIRD_OPACITY}
              birdContrast={BIRD_CONTRAST}
              birdSaturation={BIRD_SATURATION}
              ground={GROUND}
              style={{ opacity: birdIn, pointerEvents: "none" }}
            />
          </Link>
        </div>
      </div>

      {/* Bottom menu — the shared `BodyFooter`, exactly as every other page
          renders it. */}
      <BodyFooter activeLabel={null} />
    </footer>
  )
}
