import Image from "next/image"
import { JULIUS, JULIUS_MIN, TEXT_FONT, TEXT_MIN, TEXT_TRACK, TRACK } from "@/lib/type"
import SCENE from "@/lib/making-scene.json"
import { MakingDrawing } from "@/components/making-drawing"
import { MakingSun } from "@/components/making-sun"
import { MakingSea } from "@/components/making-sea"

/**
 * MAKING — laid out after the author's Figma frame "Making" of 2026-11-17
 * (Making_Homepage.svg, copied over `public/images/home/Making.svg`, 1893 ×
 * 1850), and the author's ten-point brief of the same day. Every place is a
 * share of the frame, so the composition holds at any width. Back to front:
 *
 *  - the white of the section;
 *  - **the sun**, Satori 4's, scaled and grey, rising out of a white
 *    gradient over the horizon as the reader comes down, a solar storm on a
 *    click (`components/making-sun.tsx`);
 *  - **the sea of drawings**, the author's five lines just above the plank,
 *    moving as a calm sea, never crossing (`components/making-sea.tsx`);
 *  - **the trunk**, `making-trunk.webp`: the burnt trunk and the white vase
 *    cut out of their white ground by the author, with the plank they stand
 *    on, so the sun and the sea pass behind them; the gold motes rise in its
 *    crevices (`public/pandov-grain.js`, which finds it by its alt text, so the
 *    alt text must keep starting "A white vase", and lays its canvas over the
 *    photograph's box, `.mk-trunk`);
 *  - **the dark wood** under the plank, `making-wood.avif`, a second
 *    photograph since this frame, flipped by the author together with the eye
 *    on it; its foot is #202020 and runs on into Selected;
 *  - **the line drawings and the eye**, `making-drawing.svg`, drawn by
 *    `MakingDrawing`: the creator by the trunk, drawing as a plotter (the one
 *    on the left with the trumpet and its melodies was taken off the same
 *    evening, the author's asking), SILUET right of the trunk, and the eye,
 *    flipped, smaller and far fainter; the figures fade out as the words go
 *    up past the middle of the screen;
 *  - **the words**, set as text, not as the export's outlines, under the
 *    heading, the creator's lines halfway between the two.
 *
 * A click anywhere on the section (`data-grain-click`) sends the gold motes'
 * wave up the trunk and raises the sun's storm; nothing else answers it (the
 * figures were breathed out on it until 2026-11-17). The eye keeps its own.
 *
 * The scripts that read the export: `scripts/making-split.py` (the two
 * photographs, the sea, the sun → `lib/making-scene.json`),
 * `scripts/making-drawing.py` (the figures and the eye) and
 * `scripts/grain-lines/from-figma.py` (the crevices). Run all three on a new
 * export of the frame, and bump `SVG_VERSION` in `making-drawing.tsx`.
 *
 * On a phone (under 768px), since 2026-11-18, the same frame seen through a
 * window round the trunk (`P_CROP`), the heading and the words centred over
 * it as For Space's are; the sun smaller and nearer the trunk there
 * (`PHONE_*` in `making-sun.tsx`). The two layouts' differences are in the
 * stylesheet at the foot, since only a stylesheet holds a media query.
 */

/**
 * How wide the composition may grow, as a multiple of the screen's height
 * (2026-11-05, the author's asking: on a wide screen it grew with the width
 * and the drawing went far taller than the screen). Up to a 16:9 screen it
 * fills the page's width; on a wider one it stops at 16/9 of the screen's
 * height and stands in the middle, so the drawing, the trunk and the sun keep
 * their places to one another. Either side, past the frame, the plank goes on
 * as its own ends laid beside their mirror images (`making-plank-left.webp`,
 * `making-plank-right.webp`, by `scripts/making-split.py`), the dark wood as
 * its mirror image, and the sea as its own mirror (in `MakingSea`); above
 * them, the white.
 */
const MAX_ASPECT = 16 / 9
const BOX_W = `min(100%, ${+(MAX_ASPECT * 100).toFixed(3)}vh)`

/** The frame, in its own units. */
const FW = SCENE.frame.w
const FH = SCENE.frame.h
const pctX = (x: number) => `${+((x / FW) * 100).toFixed(4)}%`
const pctY = (y: number) => `${+((y / FH) * 100).toFixed(4)}%`
/**
 * Type follows the composition's width (the page's, up to MAX_ASPECT of the
 * screen's height); `px` is the size at 1893.
 */
const BOX_VW = `min(100vw, ${+(MAX_ASPECT * 100).toFixed(3)}vh)`
const vw = (px: number) => `calc(${BOX_VW} * ${+(px / FW).toFixed(6)})`

/** The trunk (its photograph's box) and the dark wood, frame units: as the export lays them. */
const TRUNK = SCENE.trunk
/**
 * The dark wood is laid across the whole frame: the export has it from x 1
 * to 1892, which would leave a white hairline at either edge of the page.
 * It starts a unit higher than the export has it, over the foot of the
 * plank's dark face, and the band from that face down is #202020 behind
 * everything (`.mk-dark`): where the two photographs meet at a fraction of a
 * pixel, a light seam showed between them.
 */
const WOOD = { x: 0, y: SCENE.wood.y - 1, w: FW, h: FH - SCENE.wood.y + 1 }
const PLANK = SCENE.plank.tile

/**
 * The words. Measured off the export's outlined text (2026-11-17): the
 * heading in Julius at 27.1 (cap top 603.2, its M from x 583.6), the two
 * lines in Assistant 15, their cap tops 40 apart from 711.2, their E from x
 * 583.4; on the page the lines are Manrope at `TEXT_MIN`. **Moved the same
 * day, the author's asking**: the heading up over the lines CREATOR1 draws
 * (`HEADING_CAP`, its foot well clear of their highest wave at about 175),
 * the first line where the heading was, and the second lower, apart from it
 * (770; it was 40 under the first), its foot clear of the risen sun. (Since
 * the fourth brief: three lines, below.)
 * Each stands where its cap top is, the left edge of all of them the
 * frame's x 582.6. A line box's top is set above the cap top by the face's
 * own room: 0.085em for Julius at line-height 1; for the lines the
 * half-leading and 0.135em (`lineTop`). The first line, about 370px long at
 * 12px Manrope tracked, could not stay whole on a laptop without running into
 * the trunk; it wrapped balanced at first, and is now broken by hand (below).
 * `WORDS_RIGHT` still bounds the lines' boxes, short of the trunk. The lines
 * carry `data-mk-words`: the figures fade as their middle goes up the screen
 * (`MakingDrawing`).
 */
/*
 * The same afternoon, the author's third brief: MAKING higher still
 * (`HEADING_CAP` 50; it was 120), with "→ Explore" under it as under For Body
 * (`CategoryLabel` in `categories-section.tsx`: Julius at clamp(…, 1vw, 12px),
 * #888, 18px under the title), the two a link to /making; and the first line
 * broken where it broke on a laptop, "Every Pandov piece is born from / raw
 * nature, reclaimed objects", on every screen, at the Making page's spacing
 * (`.mk-lines` in `making-page.tsx`: line-height 1.9).
 */
const TEXT_X = 582.6
const HEADING_PX = 27.1
const HEADING_CAP = 50
/*
 * The fourth brief, the same afternoon (the author's screenshot of the frame
 * with the words set as wanted): three lines, "Every Pandov piece is born
 * from raw nature," / "reclaimed objects," / "and an endless sea of
 * drawings.", their cap tops `LINE_PITCH` apart from `LINE_1_CAP` (read off
 * the screenshot against the trumpet's bell and the vase: about 611 and 40,
 * the frame's own pitch), the gap growing and shrinking with the
 * composition, as the frame's. Each line is its own paragraph, so on a
 * narrow computer screen (under about 1250px, where the first line would
 * run into the trunk) it wraps, balanced, within `WORDS_RIGHT`, and the
 * lines under it go down with it. This replaces the line-height 1.9 and the
 * second line far under the first of the hours before.
 */
const LINE_PITCH = 40
/*
 * The same evening (the author's asking, with CREATOR2 gone): the words up,
 * so that the lines CREATOR1 draws stand halfway between the foot of "→
 * Explore" and the words' first cap top: that cap top is twice the lines'
 * middle (`DRAWN_MID`, y 187.9: they run 174.3 … 201.5) less the foot of the
 * heading. The heading's size, its gap and Explore are in px, not frame
 * units, so the words' top is worked out in CSS (`WORDS_TOP`), for every
 * screen. The first cap top was at 611 before (`LINE_1_CAP`); the sun's rise
 * still reads the words' middle as it stood then (`RISE_MARK` in
 * `making-sun.tsx`).
 */
const DRAWN_MID = 187.9
/** Of Explore's line box (line-height 1), the share under its capitals' foot (Julius). */
const EXPLORE_FOOT = 0.33
const HEADING_TOP = HEADING_CAP - 0.085 * HEADING_PX
const LINE_HEIGHT = 1.35
/** As under For Body: the gap from the title to "→ Explore", px, and its size. */
const EXPLORE_GAP_PX = 18
const EXPLORE_SIZE = `clamp(${JULIUS_MIN}px, 1vw, 12px)`
const MAKING_HREF = "/making"
const WORDS_RIGHT = 1040
/** The words' box top, so that their first cap top is `2 × DRAWN_MID` less the foot of Explore. */
const HEADING_SIZE = `clamp(${JULIUS_MIN}px, ${vw(HEADING_PX)}, 30px)`
const WORDS_TOP =
  `calc(${pctY(2 * DRAWN_MID - HEADING_TOP)} - ${HEADING_SIZE} - ${EXPLORE_GAP_PX}px` +
  ` - ${EXPLORE_SIZE} * ${1 - EXPLORE_FOOT} - ${+((LINE_HEIGHT - 1) / 2 + 0.135).toFixed(3)} * ${TEXT_MIN}px)`
/*
 * 2026-11-18, the author's new words, five lines broken as the author broke
 * them, standing where the three stood (the same first cap top, the same
 * pitch); the lines under the first go down with them.
 */
const LINES = [
  "Pandov pieces are born from",
  "reimagining reclaimed objects,",
  "treating found natural forms,",
  "and an endless sea of drawings",
  "brought to life through technology.",
]

/**
 * The phone (2026-11-18, the author's brief: "let's make this version of
 * Making for the phone too; it should be simpler now the drawing is
 * narrower"). It is the computer's frame, the same trunk, sun, sea, figures
 * and eye, seen through a window cut out of it (`P_CROP`, frame units: from
 * x, that wide, from y down to the frame's foot), as wide as the phone: the
 * trunk large, CREATOR1 at its left and SILUET at its right. The frame is
 * laid out whole, only larger and moved, so everything on it keeps its place
 * on it (the gold motes' crevices, the sun's and the sea's frame units, the
 * eye). Until then the phone had the author's older frame "Making - Mobile"
 * of 2026-11-05, its own drawing (`making-drawing-mobile.svg`, no longer
 * used) and no sun or sea.
 *
 * The heading and the words are no longer on the picture: they stand over
 * it, centred, as For Space's do (`CategoryLabel` in
 * `categories-section.tsx`: Julius at clamp(11px, 2vw, 20px), #555, "→
 * Explore" 18px under it, #888), the words `P_WORDS_GAP_PX` under Explore,
 * near as Selected's are under its heading, and the picture
 * `P_PICTURE_GAP_PX` under the words.
 */
const P_CROP = { x: 700, w: 880, y: 20 }
const P_TOP_PX = 100
const P_WORDS_GAP_PX = 22
const P_LINE_HEIGHT = 2
const P_PICTURE_GAP_PX = 36
/** The phone's composition box: the whole frame, `FW / P_CROP.w` of the phone's width, moved so the window shows. */
const P_COMP_W = `${+((FW / P_CROP.w) * 100).toFixed(4)}%`
const P_COMP_LEFT = `${+((-P_CROP.x / P_CROP.w) * 100).toFixed(4)}%`
const P_COMP_TOP = `${+((-P_CROP.y / P_CROP.w) * 100).toFixed(4)}%`

/**
 * White over the composition on a computer, so For Space stands further up
 * (the author's asking, 2026-11-05). Grows with the composition, as the rest
 * of it does. The frame of 2026-11-17 has its own white over the figures, and
 * its words stand in the middle, so this is kept as it was.
 */
const AIR = 120

const ALT = "A white vase in a burnt trunk — the making process"

export function MakingSection() {
  return (
    <section
      data-grain-click
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* The phone's heading and words, centred over the picture, as For
          Space's (none on a computer, where they stand on the picture). */}
      <div className="mk-phone-words">
        <a href={MAKING_HREF} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: `${EXPLORE_GAP_PX}px`, textDecoration: "none" }}>
          <span style={{ fontFamily: JULIUS, textTransform: "uppercase", letterSpacing: TRACK, fontSize: `clamp(${JULIUS_MIN}px, 2vw, 20px)`, lineHeight: 1, color: "#555" }}>
            Making
          </span>
          <span style={{ fontFamily: JULIUS, textTransform: "uppercase", letterSpacing: TRACK, fontSize: EXPLORE_SIZE, lineHeight: 1, color: "#888" }}>
            &rarr; Explore
          </span>
        </a>
        <p
          style={{
            margin: `${P_WORDS_GAP_PX}px 0 0`,
            fontFamily: TEXT_FONT,
            fontWeight: 400,
            fontSize: `${TEXT_MIN}px`,
            lineHeight: P_LINE_HEIGHT,
            letterSpacing: TEXT_TRACK,
            color: "#888",
            textAlign: "center",
          }}
        >
          {LINES.map((l, i) => (
            <span key={l} style={{ whiteSpace: "nowrap" }}>
              {i > 0 && <br />}
              {l}
            </span>
          ))}
        </p>
      </div>

      {/* The composition: the page's width up to MAX_ASPECT of the screen's
          height, in the middle; on a phone the same frame, larger, seen
          through a window as wide as the phone (`P_CROP`). */}
      <div className="mk-comp">
        {/* Past the frame on a very wide screen: the plank's ends beside their
            mirrors, and the dark wood mirrored, either side. */}
        <div aria-hidden className="mk-side mk-side-l" style={{ right: "100%" }}>
          <div className="mk-plank" style={{ backgroundImage: "url(/images/home/making-plank-left.webp)", backgroundPosition: "right top", backgroundSize: `${pctX(PLANK.left)} 100%` }} />
          <div className="mk-side-wood">
            <Image src="/images/home/making-wood.avif" alt="" fill sizes="100vw" style={{ objectFit: "fill", transform: "scaleX(-1)" }} />
          </div>
        </div>
        <div aria-hidden className="mk-side mk-side-r" style={{ left: "100%" }}>
          <div className="mk-plank" style={{ backgroundImage: "url(/images/home/making-plank-right.webp)", backgroundPosition: "left top", backgroundSize: `${pctX(PLANK.right)} 100%` }} />
          <div className="mk-side-wood">
            <Image src="/images/home/making-wood.avif" alt="" fill sizes="100vw" style={{ objectFit: "fill", transform: "scaleX(-1)" }} />
          </div>
        </div>

        {/* The dark under the plank's face, the screen's whole width. */}
        <div aria-hidden className="mk-dark" />

        {/* The sun, then the sea, behind the trunk. */}
        <MakingSun className="mk-sun" />
        <MakingSea className="mk-sea" />

        {/* The trunk and the plank, cut out: its box is the gold motes' too. */}
        <div className="mk-trunk">
          <Image src="/images/home/making-trunk.webp" alt={ALT} fill sizes="(max-width: 767px) 240vw, 100vw" style={{ objectFit: "fill" }} />
        </div>

        {/* The dark wood under the plank, with the eye on it. */}
        <div aria-hidden className="mk-wood">
          <Image src="/images/home/making-wood.avif" alt="" fill sizes="(max-width: 767px) 240vw, 100vw" />
        </div>

        {/* The line drawings and the eye, over all of it. */}
        <div className="mk-draw">
          <MakingDrawing />
        </div>

        {/* The words: the heading over CREATOR1's lines, the three lines under
            them, the drawn lines halfway between. */}
        <a
          href={MAKING_HREF}
          className="mk-words-desk mk-head"
          style={{
            position: "absolute",
            left: pctX(TEXT_X),
            top: pctY(HEADING_TOP),
            zIndex: 3,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontFamily: JULIUS,
              textTransform: "uppercase",
              letterSpacing: TRACK,
              fontSize: HEADING_SIZE,
              lineHeight: 1,
              color: "#888",
            }}
          >
            Making
          </span>
          <span style={{ fontFamily: JULIUS, textTransform: "uppercase", letterSpacing: TRACK, fontSize: EXPLORE_SIZE, lineHeight: 1, color: "#888" }}>
            &rarr; Explore
          </span>
        </a>
        <div
          data-mk-words
          className="mk-words-desk"
          style={{
            position: "absolute",
            left: pctX(TEXT_X),
            right: `${+((1 - WORDS_RIGHT / FW) * 100).toFixed(3)}%`,
            top: WORDS_TOP,
            zIndex: 3,
            fontFamily: TEXT_FONT,
            fontWeight: 400,
            fontSize: `${TEXT_MIN}px`,
            lineHeight: LINE_HEIGHT,
            letterSpacing: TEXT_TRACK,
            color: "#888",
          }}
        >
          {/* moved and faded by `MakingDrawing` once the sun is out; the box
              round it keeps its place, so what is measured does not move */}
          <div data-mk-words-out style={{ willChange: "opacity, transform" }}>
            {LINES.map((l) => (
              <p key={l} style={{ margin: `0 0 max(4px, calc(${vw(LINE_PITCH)} - ${LINE_HEIGHT}em))`, textWrap: "balance" }}>
                {l}
              </p>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        .mk-comp { position: relative; width: ${BOX_W}; margin: ${vw(AIR)} auto 0; aspect-ratio: ${FW} / ${FH}; }
        .mk-side { position: absolute; top: 0; width: 100%; height: 100%; pointer-events: none; }
        .mk-plank { position: absolute; left: 0; width: 100%; top: ${pctY(PLANK.y)}; height: ${pctY(PLANK.h)}; background-repeat: repeat-x; }
        .mk-side-wood { position: absolute; left: 0; width: 100%; top: ${pctY(WOOD.y)}; height: ${pctY(WOOD.h)}; }
        /* the plank's ends reach 3px under the trunk's photograph, whose own
           edge column is not quite opaque: no light seam at the frame's edge */
        .mk-side-l .mk-plank { left: auto; right: -3px; width: calc(100% + 3px); }
        .mk-side-r .mk-plank { left: -3px; width: calc(100% + 3px); }
        .mk-dark { position: absolute; left: calc(50% - 50vw); width: 100vw; top: ${pctY(SCENE.plank.edge)}; bottom: 0; background: #202020; }
        .mk-sun, .mk-sea { z-index: 0; }
        .mk-trunk { position: absolute; z-index: 1; left: ${pctX(TRUNK.x)}; top: ${pctY(TRUNK.y)}; width: ${pctX(TRUNK.w)}; height: ${pctY(TRUNK.h)}; }
        .mk-wood { position: absolute; z-index: 1; left: ${pctX(WOOD.x)}; top: ${pctY(WOOD.y)}; width: ${pctX(WOOD.w)}; height: ${pctY(WOOD.h)}; }
        .mk-wood img { object-fit: fill; }
        .mk-draw { position: absolute; z-index: 2; inset: 0; pointer-events: none; }
        .mk-head { display: flex; flex-direction: column; gap: ${EXPLORE_GAP_PX}px; }
        .mk-phone-words { display: none; }
        @media (max-width: 767px) {
          .mk-phone-words { display: flex; flex-direction: column; align-items: center; padding: ${P_TOP_PX}px 24px 0; }
          .mk-comp { width: ${P_COMP_W}; aspect-ratio: ${FW} / ${FH}; margin: calc(${P_PICTURE_GAP_PX}px + ${P_COMP_TOP}) 0 0 ${P_COMP_LEFT}; }
          .mk-side, .mk-words-desk { display: none; }
          /* the band, the sea and the dark wood across the window, not the frame's middle */
          .mk-dark { left: ${pctX(P_CROP.x)}; width: ${pctX(P_CROP.w)}; }
          .mk-sea { left: ${pctX(P_CROP.x)} !important; width: ${pctX(P_CROP.w)} !important; }
        }
      `}</style>
    </section>
  )
}
