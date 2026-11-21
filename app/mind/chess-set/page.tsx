import { readFile } from "node:fs/promises"
import path from "node:path"
import Image from "next/image"
import { fluidSvg, splitRadiant } from "@/lib/radiant"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { ChessSetGallery } from "@/components/chess-set-gallery"
import { ChessSetOrnament } from "@/components/chess-set-ornament"
import { ChessSetStatement } from "@/components/chess-set-statement"
import { ChessPieces } from "@/components/chess-pieces"
import { MoonMandala } from "@/components/moon-mandala"
import { ScrollFade } from "@/components/scroll-fade"
import { SeamDrops } from "@/components/seam-drops"
import type { MoonRing } from "@/lib/moon-mandala"

export const metadata = {
  title: "Chess Set — PANDOV",
  description: "Chess Set — For Mind collection",
}

/**
 * Whether the bank of cloud is drawn at the moon's foot. Taken off on
 * 2026-10-02, on the author's asking, to see the moon without it; everything
 * that makes the bank is left as it was, so `true` brings it back exactly. The
 * white veil under the bank stays either way: without it the mandala would
 * end on the hard line where it is cut. The veil and the poem stand where the
 * clouds call for, below.
 */
const SHOW_CLOUDS = false

/**
 * The moon and its mandala at a fixed size, whole on the screen (2026-11-21,
 * the author's asking, with the page turned into a chessboard: dark, white,
 * dark, white, dark, white, from the hero down).
 *
 * Until that day both were drawn the page's width, so the mandala grew with
 * the screen, ran up under the hero's foot and down under a white veil that
 * cut it (from 2026-11-07 at 124% of the moon's canvas, before that at 92%),
 * and the poem stood in that white. Now the mandala, its outermost chevrons
 * 181 of its units from the centre, is `MANDALA_D` across and never more:
 * at most a fixed size, and less where the screen is shorter (a share of its
 * height, so it is always seen whole) or narrower (a share of its width, a
 * phone). The moon's canvas is sized from it (`MOON_PER_MANDALA`), and every
 * place on the canvas is a share of it as before. Nothing covers the mandala
 * any more; the poem has gone down into a dark section of its own.
 *
 * The same morning, seen, the author found it too small (760px at most, 82%
 * of the screen's height) and asked for it larger: now 1040px at most, and
 * 96% of the screen's height, so it all but fills the screen from top to foot
 * and is still seen whole. On a phone, 96% of the width.
 *
 * Then 150% of that for a moment, the same day, and then, the author's
 * choice, 120%: 1248px at most and 115% of the screen's height, so it runs a
 * little past the screen's top and foot as it passes and is seen whole by
 * scrolling, never cut or covered. The width's share stays 96%, since past it
 * the page's edges would cut its sides: on a phone it is no larger.
 *
 * The geometry, in widths of the moon's canvas (`--moon-w`): the canvas is
 * 0.44419 tall, the mandala's square 1.0059 wide and its top 67.92% of the
 * canvas's height above it, so the outermost chevrons stand 0.24066 above
 * the canvas's top and 0.64316 below it, 0.19897 below its foot.
 */
const MANDALA_D = "min(1248px, 115vh, 96vw)"
const MOON_PER_MANDALA = 1.13144
const MANDALA_ABOVE = 0.24066
const MANDALA_BELOW_FOOT = 0.19897
/**
 * The white from the seam to the mandala's top, px: FALL IN HEAVEN stands
 * 170px under the seam, as RISE IN HELL stands over it, and the mandala begins
 * some 70px under that line. And the white left under the mandala before the
 * poem's dark.
 */
const MANDALA_TOP_PX = 250
const MANDALA_FOOT_PX = 120
/**
 * The white veil the clouds stood in, in shares of the moon's canvas: from
 * their shoulders (66) to solid just under the disc (82), on an ease. Only
 * with the clouds (SHOW_CLOUDS); without them nothing covers the mandala.
 */
const CLOUD_VEIL_FROM = 66
const CLOUD_VEIL_SOLID = 82
/**
 * The veil's ease, as the clouds' veil had it: strengths at shares of the way
 * from where it begins to where it is solid. A straight ramp read as a band.
 */
const veilGradient = (from: number, solid: number, end: number) =>
  `linear-gradient(to bottom, ${[
    [0, 0],
    [10 / 47, 0.15],
    [20 / 47, 0.38],
    [30 / 47, 0.65],
    [40 / 47, 0.88],
    [1, 1],
  ]
    .map(([at, a]) => `rgba(255, 255, 255, ${a}) ${((100 * at * (solid - from)) / (end - from)).toFixed(2)}%`)
    .join(", ")})`
const CLOUD_VEIL = veilGradient(CLOUD_VEIL_FROM, CLOUD_VEIL_SOLID, 100)

/** The author's four clouds, at the pixel sizes `scripts/chess-clouds.mjs` cuts them to. */
const CLOUD_PX: Record<number, { w: number; h: number }> = {
  1: { w: 855, h: 419 },
  2: { w: 773, h: 411 },
  3: { w: 874, h: 378 },
  4: { w: 840, h: 372 },
}
/**
 * One turn of the bank, left to right: which cloud, how wide it is drawn and
 * where its top stands (shares of the moon's canvas), whether it is turned
 * over, and how far on the next one starts. Six clouds out of four, two of
 * them mirrored, none the same size, at uneven heights and spacings, so the
 * eye finds no row of equals and no beat in it. The author found the first
 * bank (four clouds, 16–19% across, evenly spaced) small and unnatural.
 *
 * Three were then made larger on the author's asking, each by its own
 * figure, read as the size it ends at: the second ×1.3 (29 → 37.7), the
 * third ×1.7 (21 → 35.7, the smallest made the tallest) and the fifth ×1.5
 * (22 → 33). Those three stand a little higher than the rest.
 *
 * Then the whole bank was raised 7% of the canvas, again on the author's
 * asking: the tops now stand at 57.5–60%, over the lowest third of the disc,
 * and the poem above was drawn up to keep clear of them.
 *
 * Then every cloud was made 2.5 times the size (CLOUD_SCALE): 60–94% of the
 * canvas across, each nearly as tall as it. The tops stay where they were; the
 * bodies run far on under the moon. The spacings did not grow with them but
 * shrank, to 0.8 of the first bank's (CLOUD_SPREAD). A cloud this size drops
 * steeply either side of its tower, and with towers far apart the moon's
 * lower rim showed in the valleys between them. Walking the rim through a
 * whole turn, it showed 16% of the time with the spacings at 1.5, 3% at 1,
 * and at 0.8 almost never (0.2%). The veil, raised to meet the clouds'
 * shoulders, fills what valleys are left with white.
 */
const CLOUD_TURN = [
  { n: 1, size: 24, top: 59.5, flip: false, next: 14 },
  { n: 3, size: 37.7, top: 57.5, flip: false, next: 19 },
  { n: 2, size: 35.7, top: 57.5, flip: false, next: 17 },
  { n: 4, size: 26, top: 60, flip: false, next: 15 },
  { n: 1, size: 33, top: 58, flip: true, next: 16 },
  { n: 3, size: 27, top: 58.5, flip: true, next: 16 },
]
const CLOUD_SCALE = 2.5
const CLOUD_SPREAD = 0.8
/**
 * The bank is the turn twice over. One turn is 97% × 0.8 = 77.6% of the
 * canvas, the distance the drift's keyframes carry it, so when it starts again
 * every cloud stands where its twin a turn ahead stood. It begins 85% left of
 * the frame, so at either end of the drift it still covers the canvas's whole
 * width.
 */
const CLOUD_BANK = (() => {
  const bank = []
  let left = -85
  for (let pass = 0; pass < 2; pass++)
    for (const cloud of CLOUD_TURN) {
      bank.push({ ...cloud, ...CLOUD_PX[cloud.n], size: cloud.size * CLOUD_SCALE, left })
      left += cloud.next * CLOUD_SPREAD
    }
  return bank
})()

/**
 * The mandala's rings and how each moves at rest, from the author's marked
 * copy of it (D:\PANDOV\1_MIND\0_PANDOV CHESS\Explicativ Moon Mandala.jpg,
 * 2026-09-27). The colour each was marked in is in the comment. A band is a
 * distance from the centre in the mandala's units, taken to the middle of each
 * outline; the moon's rim is at 63.5, the outermost chevron at 181. Rings the
 * author did not mark hold still, and all of them take part in what the drop
 * sets off (`components/moon-mandala.tsx`).
 *
 * Spin is degrees a second, positive clockwise. They began at Mother Nature's
 * paces, a turn in four to six minutes, and were made half as fast again when
 * the author found them slow (the same evening); the dark blue ticks were then
 * quickened once more on their own. The yellow dashes turn as the red chevrons
 * do, a little slower, as asked.
 *
 * Everything else that moves breathes: copies of the ring come up where it
 * sits and leave it, fading, every `breath` seconds, each ring at its own
 * pace so that they come apart and meet again. The white rings on the moon
 * breathe too, the author's second asking: the rays and the outer rhombi
 * grow out of themselves, the inner rhombi shrink into themselves, and the
 * pink teardrops drift in, all toward and away from the moon's centre in
 * turn. The orange and light blue lines lengthen at both ends as they breathe;
 * they did so with the scroll at first, and the author asked for a breath.
 * Asked the next time for more of both, the white rings now go twice as far
 * and a third faster, and the lines three times as far, faster, so that the
 * breathing reads from across a room and not only up close.
 */
const MOON_RINGS: MoonRing[] = [
  // The sun of rays at the centre, breathing out.
  { key: "rays", bands: [[0, 20]], motion: { scale: 0.4, breath: 3.4 } },
  // The two rings of rhombi round it: the inner breathing in, the outer out.
  { key: "rhombi-in", bands: [[20, 31]], motion: { scale: -0.26, breath: 3.8 } },
  { key: "rhombi-out", bands: [[31, 45]], motion: { scale: 0.26, breath: 4.2 } },
  // Pink: the inner row of teardrops, on the moon, breathing in toward its centre.
  { key: "tears-in", bands: [[45, 63.5]], motion: { drift: -6, breath: 5 } },
  // Purple: the outer row, just off the moon, breathing out away from it.
  { key: "tears-out", bands: [[63.5, 75]], motion: { drift: 6, breath: 5.6 } },
  // Dark blue: the fine ticks, anticlockwise, the quickest of the turning rings.
  // A full 180 since the cross came out and the four it displaced were put back.
  { key: "ticks", bands: [[80, 95]], motion: { spin: -4.5 } },
  { key: "spokes", bands: [[95, 110]], motion: {} },
  { key: "squares", bands: [[110, 119]], motion: {} },
  // Light blue: the long lines, lengthening at both ends, less than the orange.
  // Thirty-six of them, one every 10°: the four at the cardinal points stand
  // where the cross's bars stood until the author took the cross out
  // (scripts/chess-mandala.mjs), and breathe with the rest.
  { key: "long-lines", bands: [[119, 127]], motion: { stretch: 1.1, breath: 3.6 } },
  // Orange: the dense ring of lines, lengthening at both ends. The one short
  // line out at 143, where a line of this ring and a dash are both missing,
  // holds its place with them.
  { key: "lines", bands: [[127, 146]], motion: { stretch: 2.2, breath: 3.2 } },
  // Yellow: the short dashes, anticlockwise, a little slower than the red.
  { key: "dashes", bands: [[146, 152]], motion: { spin: -1.35 } },
  { key: "studs", bands: [[152, 160]], motion: {} },
  // Red: both rows of chevrons, anticlockwise, with the small dots that sit in
  // their crooks, which go where their chevrons go.
  { key: "chevrons", bands: [[160, 168], [175, 999]], motion: { spin: -1.8 } },
  // Green: the ring of dots between them, clockwise.
  { key: "dots", bands: [[168, 175]], motion: { spin: 2.25 } },
]

export default async function ChessSetPage() {
  // The closing ornament is read and ranked here, on the server, so the wave of
  // light has its order before the page is ever painted. See `lib/radiant.ts`.
  const radiant = splitRadiant(
    await readFile(path.join(process.cwd(), "public", "images", "desen-radiant.svg"), "utf8"),
  )
  // The rosette at its centre is inlined as well, so its lines can be held at
  // one device pixel like the contours'. See `fluidSvg`.
  const rosette = fluidSvg(
    await readFile(path.join(process.cwd(), "public", "images", "desen-rotita.svg"), "utf8"),
  )

  return (
    <main style={{ width: "100%", backgroundColor: "#fff", minHeight: "100vh" }}>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Chess Set — a sculptural chess set by Pandov</h1>
      <style>{`
        /* ---------------------------------------------------------------
           Shared type — the page speaks in one voice: Julius Sans One,
           small, widely tracked, uppercase, in the site grey.
           --------------------------------------------------------------- */
        .chess-line {
          font-family: 'Julius Sans One', sans-serif;
          font-size: clamp(11px, 0.85vw, 12px);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 400;
          margin: 0;
          text-align: center;
        }

        /* --- Hero ----------------------------------------------------- */
        .chess-hero {
          width: 100%;
          background-color: #202020;
        }
        .chess-hero-intro {
          /* 280px once; 60 of them taken back so the title and the ornament sit
             closer to the menu. The phone keeps its own 30px below. */
          padding: 220px 24px 0;
        }
        .chess-hero-eyebrow {
          color: #5f5f5f;
          margin-bottom: 26px;
        }
        .chess-hero-media {
          position: relative;
          /* The ornament now stands alone over the photograph: the claim and
             its answer that were set between them came out on 2026-09-27, at
             the author's asking. The photograph's top 18% is the ground itself,
             #202020 to the pixel, so the first heads come some 250px under the
             ornament and just below the fold, on the author's 1026 × 800 and
             on 1440 × 900 alike. The first screen is the title and the
             ornament, and the army rises into it as the page moves. */
          margin-top: 120px;
          line-height: 0;
        }
        .chess-hero-image {
          width: 100%;
          height: auto;
          display: block;
        }

        /* --- The seam ---------------------------------------------------
           Two lines, one either side of the line the photograph ends on, each
           170px from it — the same distance, so they are read as one pair
           split by the edge rather than as two captions that happen to be
           near it. The water that comes off that line reaches 240px each way,
           so both sit inside it and both are lifted over it: the type is read
           and the drops pass behind.

           They were 120px from it until 2026-09-23, when the author moved
           each 50px further out. The lower one is moved on its own (top:
           50px), not by the section's padding, so the moon stays where it
           was and the line comes to sit just over its upper edge.

           From 2026-11-07 to 2026-11-21 a computer had the lower one pinned
           among the mandala's rings instead. With the mandala at a fixed size
           (2026-11-21, above the page) the free band it stood in is about
           half as tall as it was on a wide screen, and the line ran over the
           studs and touched the chevrons, so it is back here on every screen,
           at the dark the author asked for it in (#202020, 2026-11-08).

           RISE IN HELL was #6e6e6e, a grey that sank into the dark ground. The
           author asked for it more visible and whiter (2026-11-07).
           ---------------------------------------------------------------- */
        .chess-seam-above {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 170px;
          color: #dcdcdc;
          line-height: 1;
          z-index: 2;
        }
        .chess-seam-below {
          display: block;
          position: relative;
          top: 50px;
          color: #202020;
          line-height: 1;
          z-index: 2;
        }

        /* --- Moon ------------------------------------------------------
           White, the board's second square. The moon's canvas is --moon-w
           wide, worked out from the mandala's fixed size (MANDALA_D, above
           the page), and centred; the mandala's top stands MANDALA_TOP_PX
           under the seam, and MANDALA_FOOT_PX of white is left under it. */
        .chess-moon-section {
          --moon-w: calc(${MANDALA_D} * ${MOON_PER_MANDALA});
          width: 100%;
          background-color: #fff;
          padding-top: 120px;
          padding-bottom: calc(${MANDALA_BELOW_FOOT} * var(--moon-w) + ${MANDALA_FOOT_PX}px);
          overflow: hidden;
        }
        .chess-moon-media {
          position: relative;
          width: var(--moon-w);
          /* Centred however its width compares with the page's (a block wider
             than its parent is not centred by auto margins). */
          margin-left: calc(50% - var(--moon-w) / 2);
          /* FALL IN HEAVEN's line box (the type's size at line-height 1) and
             the section's 120px are above this; the mandala's top is
             MANDALA_ABOVE of the canvas's width above the canvas. */
          margin-top: calc(${MANDALA_ABOVE} * var(--moon-w) + ${MANDALA_TOP_PX - 120}px - clamp(11px, 0.85vw, 12px));
        }
        /* NASA's full moon, alone, pale and grey as the moon it replaced
           (the author's, with the row of pieces and a dial drawn over it,
           which the author took out on 2026-09-27). It is made by
           scripts/chess-moon.mjs, which records the source and why it is
           toned and sized as it is. It stands where the old moon stood, in a
           canvas of the old one's shape, so the positions below are the old
           disc's: top 10.5% down, centre 45.3%, bottom 80.2%. The canvas is
           white round the disc, as the section is.

           The frame holds the moon and the clouds that cross it, so the
           clouds are placed on the moon itself, in shares of its canvas. */
        .chess-moon-frame {
          position: relative;
        }
        .chess-moon-image {
          width: 100%;
          height: auto;
          display: block;
          opacity: 0.8;
        }

        /* The author's mandala, over the moon and under the clouds
           (2026-09-27): white where it lies on the moon, a grey as light as
           the moon off it. scripts/chess-mandala.mjs makes it, and splits
           the colours at the rim.

           Its size is the author's picture of the two together: the moon's
           edge falls between its two rings of teardrops, at 63.5 of its
           units, so a unit is the moon's radius (15.5% of the canvas's
           width) over 63.5, and its 412-unit box is 100.59% of the canvas
           wide, centred on the moon's centre (50%, 45.3%).

           Whole since 2026-11-21: nothing cuts it or lies over it. (It was
           cut under a white veil, at 124% of the canvas on a computer and 92%
           on a phone, from 2026-10-02 to that day.)

           Its grey lines are as fine as Second Wind's, at every width: the
           author asked for them to match. The white ones on the moon are a
           little over twice that, which the author asked for too, so they
           hold against the pale disc. The figures are in the script.

           It moves (2026-09-27): components/moon-mandala.tsx draws it on a
           canvas laid over the same square and sets its rings going, and the
           file is shown as a plain picture only until the canvas has read it,
           or for good where the reader has asked for less motion. */
        .chess-mandala {
          position: absolute;
          left: -0.29%;
          top: -67.92%;
          width: 100.59%;
          aspect-ratio: 1 / 1;
          pointer-events: none;
        }
        .chess-mandala-image {
          display: block;
          width: 100%;
          height: 100%;
          max-width: none;
        }
        .chess-mandala-canvas {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          /* The burst after the strike throws the shapes out past the rim, and
             the canvas is the mandala's square: they were cut off on its four
             edges, so the burst ended in a square (the author's report,
             2026-11-21; until then the veil and the page's edge hid it). They
             now fade out on a circle instead, from just past the outermost
             chevrons (181 of the square's 206 units, 87.9%) to its edge.
             Nothing else of the mandala reaches that far. */
          -webkit-mask-image: radial-gradient(closest-side, #000 89%, transparent 100%);
          mask-image: radial-gradient(closest-side, #000 89%, transparent 100%);
        }
        /* The strip the dark drop falls down, from the seam to the moon's
           centre; the component sets its top and height, which are measured.
           It hangs in the frame after the mandala, so the drop passes over the
           mandala and under the words. */
        .chess-moon-drop {
          position: absolute;
          left: calc(50% - 20px);
          top: 0;
          width: 40px;
          height: 0;
          pointer-events: none;
        }

        /* A bank of cloud at the moon's foot, drifting left to right, so the
           moon seems to rise from behind it (the author's asking, and the
           author's four clouds, 2026-09-27; scripts/chess-clouds.mjs cuts
           them out). Switched off since 2026-10-02 (SHOW_CLOUDS). The bank
           hides the lowest third of the disc: its tops stand at 57.5–60% of
           the canvas and the disc ends at 80.2%, and its bodies and a white
           veil under them (66% to 82%, eased) hide the rest.

           One turn of the bank (CLOUD_TURN, above the page) is laid out
           twice in a row; the row moves right by one turn, 77.6%, and
           starts again, where it looks exactly as it did. The keyframes'
           77.6% and the turn's spacings are one figure and change together.
           The duration keeps the pace the author approved, about 7px a
           second on a 1440 screen. Only the track's transform moves.

           Should the clouds come back, mind that their veil lies over the
           mandala's lower half, which since 2026-11-21 is meant to be seen
           whole. */
        .chess-cloud-bank {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .chess-cloud-track {
          position: absolute;
          inset: 0;
          animation: chess-cloud-drift 152s linear infinite;
          will-change: transform;
        }
        .chess-cloud-veil {
          position: absolute;
          left: 0;
          right: 0;
          top: ${CLOUD_VEIL_FROM}%;
          height: ${100 - CLOUD_VEIL_FROM}%;
          pointer-events: none;
          background: ${CLOUD_VEIL};
        }
        .chess-cloud-track img {
          position: absolute;
          max-width: none;
          height: auto;
        }
        @keyframes chess-cloud-drift {
          from { transform: translateX(0); }
          to { transform: translateX(77.6%); }
        }
        /* Held still, where the reader has asked for less motion. */
        @media (prefers-reduced-motion: reduce) {
          .chess-cloud-track {
            animation: none;
          }
        }
        /* --- The poem -------------------------------------------------
           On the dark, the board's third square (2026-11-21, the author's
           asking): THE VIOLENCE OF THE IMPULSE / THE QUIET OF THE COMPOSURE;
           BETWEEN; A QUIET WAITING / FOR THE RIGHT STRIKE, the author's text
           of 2026-09-27 (LIFT AND GRAVITY, its first line, came out on
           2026-11-08).

           It stood on the moon at first, then under it in the white of the
           veil, and on a phone round the blown-up moon, five equal breaths
           apart; since the mandala is whole it has a section of its own, the
           same on every screen. A couplet's lines are 2.1em apart, baseline
           to baseline, and the stanzas 3.4em. */
        .chess-poem-section {
          width: 100%;
          background-color: #202020;
          padding: 150px 24px;
        }
        .moon-poem .chess-line {
          color: #8a8a8a;
          line-height: 1;
        }
        .moon-poem .chess-line span {
          display: block;
        }
        .moon-poem .chess-line + .chess-line {
          margin-top: 2.4em;
        }
        .moon-poem .chess-line span + span {
          margin-top: 1.1em;
        }

        /* --- Board ------------------------------------------------------ */
        /* White, the board's fourth square. Since the poem's dark ends
           straight above it (2026-11-21) it opens with room of its own: it
           followed the poem in the same white with 40px until then. */
        .chess-board-section {
          width: 100%;
          background-color: #fff;
          padding-top: 140px;
        }
        .chess-board-captions {
          margin-bottom: 40px;
        }
        .chess-board-captions .chess-line {
          color: #a5a5a5;
          line-height: 1;
        }
        /* A couplet, spaced as the moon's are. It was 34px between line boxes,
           twice the moon's pairs, and seen on one screen with them it read as
           two captions rather than one. */
        .chess-board-captions .chess-line + .chess-line {
          margin-top: 1.5em;
        }

        /* --- Pieces ----------------------------------------------------- */
        .chess-pieces-section {
          width: 100%;
          background-color: #fff;
          /* White, the board's last square, after the statement's dark
             (2026-11-21; 40px until then, in the same white as the
             statement). Its photographs leave a good deal of white above the
             pieces, which reads as part of this. */
          padding-top: 80px;
          /* The bottom menu brings its own room above it — 80px on a desktop,
             56 on a phone, the same on every page. This adds 44 more so the dots
             sit ~130px under the logo: the set ends on six small marks, and they
             need more air under them than a photograph's edge would. The
             author's call, and the one page on the site where that space is not
             the shared figure. */
          margin-bottom: 44px;
        }

        @media (max-width: 768px) {
          .chess-hero-intro {
            padding-top: 30px;
          }
          /* The desktop's 120 in proportion to the ornament, which is 113px
             tall here against 189. The phone sees the army under it on its
             first screen, which the tall window has room for. */
          .chess-hero-media {
            margin-top: 72px;
            height: 64svh;
            overflow: hidden;
          }
          .chess-hero-image {
            height: 100%;
            object-fit: cover;
            object-position: 80% center;
          }
          /* The moon and its mandala are the computer's here too, only
             narrower (MANDALA_D's share of the width), and the poem in its dark
             section after them (2026-11-21). Until then the moon was blown up
             to 220% of the page, cut at 92% under a veil, with the poem set
             round it in five equal breaths. */
          .chess-poem-section {
            padding: 110px 24px;
          }
          .chess-board-section {
            padding-top: 110px;
          }
          .chess-pieces-section {
            padding-top: 60px;
          }
          .chess-board-captions {
            margin-bottom: 24px;
          }
        }
      `}</style>

      {/* ================= Hero ================= */}
      <section className="chess-hero">
        <Navigation bgColor="#202020" />

        <div className="chess-hero-intro">
          <p className="chess-line chess-hero-eyebrow">Chess Set</p>
          {/* Square ornament — the golden band travels across it on scroll */}
          <ChessSetOrnament />
        </div>

        <div className="chess-hero-media">
          <Image
            src="/images/chess-set/hero.png"
            alt="Chess Set — PANDOV"
            width={2667}
            height={1861}
            className="chess-hero-image"
            priority
          />
          {/* The upper half of the seam's pair, 170px over the edge, where the
              white drops are climbing — and rising into place as they do.
              Since 2026-11-07 it rises from just over the seam, 150px, with
              the drops (the author's asking: it had come up only 40px), and
              then stays, and fades as the page goes on, as before. It climbs
              at its own calm pace, at most 45px a second, as the drops do,
              rather than as fast as the scroll (the author's asking, the
              same day). Since 2026-11-08 it sets off as soon as it comes into
              the window and climbs at that pace all the way, on its own, not
              stopping with the page (steady). */}
          <ScrollFade className="chess-line chess-seam-above" from="below" distance={150} pace={45} steady>
            Rise in Hell
          </ScrollFade>
        </div>
      </section>

      {/* The line the photograph ends on, coming apart in both directions:
          water rising white into the dark, descending dark into the page.
          It belongs to neither section, so it lives between them. */}
      <SeamDrops />

      {/* ================= Moon ================= */}
      <section className="chess-moon-section">
        {/* And its lower half, 170px under the edge, where the dark ones are
            falling, on every screen since 2026-11-21 (a computer had it pinned
            among the mandala's rings from 2026-11-07). It falls into place as
            RISE IN HELL rises, its mirror: from just under the seam, 150px, at
            the same calm, steady pace (the author's asking, 2026-11-08). */}
        <ScrollFade className="chess-line chess-seam-below" from="above" distance={150} pace={45} steady>
          Fall in Heaven
        </ScrollFade>

        <div className="chess-moon-media">
          <div className="chess-moon-frame">
            <Image
              src="/images/chess-set/moon.avif"
              alt="The full Moon"
              width={3870}
              height={1719}
              className="chess-moon-image"
            />
            <MoonMandala rings={MOON_RINGS} cover={1} />
            {SHOW_CLOUDS && (
              <div className="chess-cloud-bank" aria-hidden="true">
                <div className="chess-cloud-track">
                  {CLOUD_BANK.map(({ n, w, h, size, top, flip, left }) => (
                    <Image
                      key={left}
                      src={`/images/chess-set/cloud-${n}.avif`}
                      alt=""
                      width={w}
                      height={h}
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${size}%`,
                        transform: flip ? "scaleX(-1)" : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {SHOW_CLOUDS && <div className="chess-cloud-veil" aria-hidden="true" />}
          </div>
        </div>
      </section>

      {/* ================= Poem, on the dark ================= */}
      <section className="chess-poem-section">
        <div className="moon-poem">
          <p className="chess-line moon-impulse">
            <span>The violence of the impulse</span>
            <span>The quiet of the composure</span>
          </p>
          <p className="chess-line moon-between">Between</p>
          <p className="chess-line moon-waiting">
            <span>A quiet waiting</span>
            <span>For the right strike</span>
          </p>
        </div>
      </section>

      {/* ================= Board ================= */}
      <section className="chess-board-section">
        <div className="chess-board-captions">
          <p className="chess-line">White reaches upward</p>
          <p className="chess-line">Black sinks inward</p>
        </div>
        <ChessSetGallery />
      </section>

      {/* ================= Statement + ornament ================= */}
      <ChessSetStatement radiant={radiant} rosette={rosette} />

      {/* ================= Pieces — gold and dark, face to face ================= */}
      <section className="chess-pieces-section">
        <ChessPieces />
      </section>

      <BodyFooter activeLabel={null} />
    </main>
  )
}
