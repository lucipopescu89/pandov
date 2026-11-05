import Image from "next/image"
import { Assistant } from "next/font/google"
import { MakingDrawing } from "@/components/making-drawing"

/**
 * MAKING — laid out after the author's Figma frame "Making" of 2026-11-05
 * (`public/images/home/Making.svg`, 1893 × 1806): the heading and four lines
 * at the top left, on white; the author's line drawings of figures rising
 * from the left towards the burnt trunk with the white vase on the right; the
 * dark wood the trunk stands on across the foot, with the eye drawn in it.
 * Every place is a share of the frame, so the composition holds at any width.
 *
 * It is three layers, all from that one export:
 *  - the photograph, `making-sculpture.jpg` (2400 × 2287): the frame's image
 *    fill cut to the frame (the image overhung it by 16 units on the left)
 *    and run through `scripts/making-ungrade.py --foot 0.745`, which took the
 *    white wash out of the trunk again (the wood's deepest shadows read 57 at
 *    the top and 31 at the foot) and left the dark wood under it untouched.
 *    Its top-left pixel is 255,255,255;
 *  - the line drawings and the eye, `making-drawing.svg`, written from the
 *    export by `scripts/making-drawing.py` and drawn by `MakingDrawing`
 *    (`components/making-drawing.tsx`), which draws Fum and the Siluets as if
 *    by hand: on the way down, and out of The Creator's tulnic on a click anywhere on the section;
 *  - the words, set as text, not as the export's outlines.
 *
 * The gold motes (`public/pandov-grain.js`) still rise in the trunk's
 * crevices and a click still sends a wave. The script finds the photograph by
 * its alt text and lays its canvas over the photograph's box, so the alt text
 * must keep starting "A white vase". The crevices are the author's lines in
 * the same export (the paths in #FDA76A at 10%, not drawn on the page), read
 * by `scripts/grain-lines/from-figma.py public/images/home/Making.svg`: 110
 * lines. The drawings lie over the motes. One click on the section plays both:
 * the motes' wave up the trunk and the figures breathed out of the tulnic.
 *
 * Until 2026-11-05 the photograph rose up behind Selected (a negative top
 * margin). Since that day the two stand one after the other, Making first
 * (the author's asking): its dark wood runs on into Selected's #202020.
 *
 * On a phone (under 768px) it is the author's frame "Making - Mobile" (974 ×
 * 2046, the same day; `Making - Mobile.svg`): a tall, narrow window onto the
 * same photograph, which stands 728 units off the frame's left edge and 242
 * down, so the burnt trunk and the white vase fill its right side; the words
 * over the figures at the top left; fewer figures (no Siluet 2, no Vector 89,
 * six of Fum's nine lines), each at its own place, drawn from their own file
 * (`making-drawing-mobile.svg`). Under the plank's front edge (y 1611) the
 * author laid the photograph again, 616 units further right (`PHONE_FOOT`),
 * so the eye lies on the same stretch of dark wood as on the computer. One
 * photograph box serves both layouts, so the gold motes, which lay their
 * canvas over the photograph's box, find the trunk where it is on either.
 * The two layouts' differences are in the stylesheet at the foot, since only
 * a stylesheet holds a media query. The words follow the other sections'
 * phone type (the frame's sizes were rough, the author said): Julius 11px
 * tracked 0.2em, like "Selected" under it, and Assistant 12.5px at 1.5.
 */

/**
 * How wide the composition may grow, as a multiple of the screen's height
 * (2026-11-05, the author's asking: on a wide screen it grew with the width
 * and the drawing went far taller than the screen). Up to a 16:9 screen it
 * fills the page's width as before; on a wider one it stops at 16/9 of the
 * screen's height and stands in the middle (at first it stood at the right,
 * and the author found it all too heavy on that side), so the drawing, the
 * trunk and the white vase keep their places to one another (the figure by
 * the vase stays the vase's height). Either side the photograph goes on:
 *  - to the left in a mirrored copy of itself, white above the ground and the
 *    dark wood below, meeting the photograph's own left edge exactly;
 *  - to the right its own last column drawn wide (`making-edge.png`, 1 × 2287,
 *    the mean of making-sculpture.jpg's last three columns): the trunk stands
 *    close to that edge, so a mirror there would show a second trunk, but the
 *    edge itself is only white over the plank (255 above, 32 below), so drawn
 *    wide it meets the photograph without a seam.
 * Past even those (a screen five times as wide as it is tall) the section's
 * own ground carries on.
 */
const MAX_ASPECT = 16 / 9
const BOX_W = `min(100%, ${+(MAX_ASPECT * 100).toFixed(3)}vh)`
/** Where the white ends and the dark wood begins, as shares of the photograph's height. */
const GROUND = (1347.6 - 2) / 1804
const BLACK = (1370.5 - 2) / 1804

/** The frame, in its own units (the photograph's box: y 2 to 1806). */
const FW = 1893
const FH = 1804
const FY = 2
const pctX = (x: number) => `${(x / FW) * 100}%`
const pctY = (y: number) => `${((y - FY) / FH) * 100}%`
/**
 * Type follows the composition's width (the page's, up to MAX_ASPECT of the
 * screen's height); `px` is the size at 1893.
 */
const BOX_VW = `min(100vw, ${+(MAX_ASPECT * 100).toFixed(3)}vh)`
const vw = (px: number) => `calc(${BOX_VW} * ${+(px / FW).toFixed(6)})`

/**
 * The words, measured off the export's outlined text: the heading in Julius
 * at 27.1 (cap top 52.2), the four lines in Assistant 15, their cap tops 40
 * apart from 120.2; all from x 200. A line box's top is set above the cap top
 * by the face's own room: 0.085em for Julius at line-height 1, 0.31em for
 * Assistant at 1.35. Each of the four is its own paragraph, 1.35 high with
 * the rest of the 40 as a gap under it, so a line that wraps on a narrow
 * screen wraps tight and the gap stays between the paragraphs.
 */
const TEXT_X = 200
const HEADING_PX = 27.1
const HEADING_TOP = 52.2 - 0.085 * HEADING_PX
const LINE_PX = 15
const LINE_PITCH = 40
const LINE_HEIGHT = 1.35
const LINES_TOP = 120.2 - 0.31 * LINE_PX
const LINES = [
  "Every Pandov object begins with a search.",
  "It can start in nature, among forms shaped by time, or in the quiet potential of discarded materials.",
  "It can also begin on a blank sheet of paper, where an imagined silhouette gradually takes shape.",
  "The two paths often converge, as new forms build upon discovered ones.",
]

/**
 * The phone's frame, in its own units. The photograph's box there (the same
 * box the computer's frame is): 1893 × 1804 from (-728, 242), read from the
 * export's image fill. Below `FOOT_Y` the author's second copy of the
 * photograph, whose box stands at (-112, 242).
 */
const PW = 974
const PH = 2046
const P_PHOTO = { x: -728, y: 242 }
const PHONE_FOOT = { y: 1611, x: -112 }
const pw = (v: number) => `${+((v / PW) * 100).toFixed(4)}%`
const ph = (v: number) => `${+((v / PH) * 100).toFixed(4)}%`
/**
 * The phone's words, broken into lines where the author broke them: short
 * lines, each a phrase (the author's second setting, 2026-11-05, which
 * replaced the frame's own longer lines the same day). Each line is held
 * whole.
 *
 * They stand at the top of the composition, and the section has `P_AIR_PX` of
 * white over it, so For Space stands further up and the words further from
 * The Creator's head (the author's asking, the same day: at first they started
 * 118 units down and their last line was some 25px over his head). Held to
 * these lines the column is wider than the frame's, up to x 603 on a 360px
 * phone, and it fits only because the words stand this high: the longest line
 * (the fourth) is above the trunk, which reaches x 600 from y 300, and the
 * ninth is above Siluet 1's head (y 607). The type is the other sections'
 * 12.5px from a 368px phone up, and a little smaller under it (`P_LINE_FIT`),
 * so the fourth line keeps clear of the trunk on a 360 and stays in the
 * window on a 320.
 */
const P_TEXT_X = 56
const P_AIR_PX = 56
const P_HEADING_PX = 11
const P_LINE_FIT = "clamp(11px, 3.4vw, 12.5px)"
const P_LINE_HEIGHT = 1.5
const P_HEADING_GAP_PX = 14
const P_PARAGRAPH_GAP_EM = 1
const P_LINES = [
  ["Every Pandov object", "begins with a search."],
  ["It can start in nature,", "among forms shaped by time,", "or in the quiet potential", "of discarded materials."],
  ["It can also begin", "on a blank sheet of paper,", "where an imagined silhouette", "gradually takes shape."],
  ["The two paths often converge,", "as new forms build upon", "discovered ones."],
]

/**
 * White over the composition on a computer, so For Space stands further up
 * and the heading has air above it (the author's asking, 2026-11-05, after the
 * phone got its own): it was 24px at 950 wide and 50 at 1893, the frame's own
 * top margin only. Grows with the composition, as the rest of it does.
 */
const AIR = 120

/** The lines' face: Assistant, Regular, as the frame has it. */
const assistant = Assistant({ weight: "400", subsets: ["latin"], display: "swap" })

export function MakingSection() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: `linear-gradient(#fff ${(GROUND * 100).toFixed(2)}%, #8a8a8a ${(GROUND * 100).toFixed(2)}% ${(BLACK * 100).toFixed(2)}%, #202020 ${(BLACK * 100).toFixed(2)}%)`,
      }}
    >
      {/* The composition: the page's width up to MAX_ASPECT of the screen's
          height, in the middle; on a phone the author's narrow frame. */}
      <div className="mk-comp">
        {/* The photograph mirrored, going on to its left on a wide screen. */}
        <div aria-hidden className="mk-side" style={{ position: "absolute", top: 0, right: "100%", width: "100%", height: "100%" }}>
          <Image
            src="/images/home/making-sculpture.jpg"
            alt=""
            fill
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center", transform: "scaleX(-1)" }}
          />
        </div>

        {/* …and its last column drawn wide, going on to its right. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/home/making-edge.png"
          alt=""
          aria-hidden
          className="mk-side"
          style={{ position: "absolute", top: 0, left: "100%", width: "100%", height: "100%", objectFit: "fill" }}
        />

        {/* The photograph's box: the whole composition on a computer, larger
            than the window and off to its left on a phone. */}
        <div className="mk-photo">
          <Image
            src="/images/home/making-sculpture.jpg"
            alt="A white vase in a burnt trunk — the making process"
            fill
            sizes="(max-width: 767px) 200vw, 100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />

          {/* The phone's foot: the photograph again under the plank's front
              edge, moved so the eye lies on the computer's stretch of wood. */}
          <div aria-hidden className="mk-foot">
            <div
              style={{
                position: "absolute",
                left: `${+(((PHONE_FOOT.x - 0) / PW) * 100).toFixed(4)}%`,
                top: `${+(((P_PHOTO.y - PHONE_FOOT.y) / (PH - PHONE_FOOT.y)) * 100).toFixed(4)}%`,
                width: `${+((FW / PW) * 100).toFixed(4)}%`,
                height: `${+((FH / (PH - PHONE_FOOT.y)) * 100).toFixed(4)}%`,
              }}
            >
              <Image src="/images/home/making-sculpture.jpg" alt="" fill sizes="200vw" style={{ objectFit: "cover", objectPosition: "center" }} />
            </div>
          </div>

          {/* The line drawings and the eye, over the photograph and the motes;
              Fum and the Siluets are drawn as the reader scrolls, and breathed
              out of the tulnic by the same click as the motes' wave. */}
          <MakingDrawing />
        </div>

        {/* The words, with the composition: on a wide screen they stay over
            The Creator's head, as in the frame (2026-11-05, the author's
            asking; for a while they kept the page's own left margin and went
            far off to the left of the drawing). */}
        <div className="mk-words-desk" style={{ position: "absolute", left: pctX(TEXT_X), top: pctY(HEADING_TOP), right: "45%", zIndex: 2 }}>
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              textTransform: "uppercase",
              fontSize: `clamp(11px, ${vw(HEADING_PX)}, 30px)`,
              lineHeight: 1,
              color: "#888",
              margin: 0,
            }}
          >
            Making
          </p>
          <div
            style={{
              fontFamily: assistant.style.fontFamily,
              fontWeight: 400,
              fontSize: `clamp(9px, ${vw(LINE_PX)}, 16px)`,
              lineHeight: LINE_HEIGHT,
              color: "#888",
              // from the heading's line box to the first line's, as in the frame
              marginTop: vw(LINES_TOP - HEADING_TOP - HEADING_PX),
            }}
          >
            {LINES.map((l) => (
              <p key={l} style={{ margin: `0 0 ${(LINE_PITCH - LINE_HEIGHT * LINE_PX) / LINE_PX}em` }}>
                {l}
              </p>
            ))}
          </div>
        </div>

        {/* The phone's words, the heading over them at Selected's distance. */}
        <div
          className="mk-words-phone"
          style={{
            position: "absolute",
            left: pw(P_TEXT_X),
            top: 0,
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: `${P_HEADING_PX}px`,
              lineHeight: 1,
              color: "#888",
              margin: 0,
            }}
          >
            Making
          </p>
          <div
            style={{
              fontFamily: assistant.style.fontFamily,
              fontWeight: 400,
              fontSize: P_LINE_FIT,
              lineHeight: P_LINE_HEIGHT,
              color: "#888",
              marginTop: `${P_HEADING_GAP_PX}px`,
            }}
          >
            {P_LINES.map((lines, i) => (
              <p key={i} style={{ margin: i ? `${P_PARAGRAPH_GAP_EM}em 0 0` : 0 }}>
                {lines.map((l, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {l}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .mk-comp { position: relative; width: ${BOX_W}; margin: ${vw(AIR)} auto 0; aspect-ratio: ${FW} / ${FH}; }
        .mk-photo { position: absolute; inset: 0; }
        .mk-foot, .mk-words-phone { display: none; }
        @media (max-width: 767px) {
          .mk-comp { width: 100%; aspect-ratio: ${PW} / ${PH}; margin-top: ${P_AIR_PX}px; }
          .mk-side, .mk-words-desk { display: none; }
          .mk-words-phone { display: block; }
          .mk-photo {
            inset: auto;
            left: ${pw(P_PHOTO.x)};
            top: ${ph(P_PHOTO.y)};
            width: ${pw(FW)};
            height: ${ph(FH)};
          }
          .mk-foot {
            display: block;
            position: absolute;
            overflow: hidden;
            left: ${+(((0 - P_PHOTO.x) / FW) * 100).toFixed(4)}%;
            top: ${+(((PHONE_FOOT.y - P_PHOTO.y) / FH) * 100).toFixed(4)}%;
            width: ${+((PW / FW) * 100).toFixed(4)}%;
            bottom: 0;
          }
        }
      `}</style>
    </section>
  )
}
