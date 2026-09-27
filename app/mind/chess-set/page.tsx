import { readFile } from "node:fs/promises"
import path from "node:path"
import Image from "next/image"
import { splitRadiant } from "@/lib/radiant"
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

  return (
    <main style={{ width: "100%", backgroundColor: "#fff", minHeight: "100vh" }}>
      <style>{`
        /* ---------------------------------------------------------------
           Shared type — the page speaks in one voice: Julius Sans One,
           small, widely tracked, uppercase, in the site grey.
           --------------------------------------------------------------- */
        .chess-line {
          font-family: 'Julius Sans One', sans-serif;
          font-size: clamp(10px, 0.85vw, 12px);
          letter-spacing: 0.3em;
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
           ---------------------------------------------------------------- */
        .chess-seam-above {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 170px;
          color: #6e6e6e;
          line-height: 1;
          z-index: 2;
        }
        .chess-seam-below {
          position: relative;
          top: 50px;
          color: #999;
          line-height: 1;
          z-index: 2;
        }

        /* --- Moon ------------------------------------------------------ */
        .chess-moon-section {
          width: 100%;
          background-color: #fff;
          /* 106px once, under two lines since removed. It is now the lower
             half of the seam's pair: the line below it begins exactly 120px
             under the edge, as its twin ends 120px above. */
          padding-top: 120px;
          overflow: hidden;
        }
        .chess-moon-media {
          position: relative;
          /* 40px once. The author asked for 250px more between the moon and
             the dark photograph above it (2026-09-27). FALL IN HEAVEN keeps
             its place 170px under the edge, so the room opens between that
             line and the moon, where the mandala's upper half now shows. The
             phone keeps its own 24px: there the stanzas stand in this room.

             Then the author asked that the mandala not touch the photograph.
             It is drawn to the moon's scale, so the higher it reaches grows
             with the page's width: its topmost dots stand 24.1% of the width
             above the moon's canvas, which starts 132px plus this margin
             under the edge. 290px keeps them clear up to about 1600px wide;
             past that the margin grows with the page, so the dots always
             stop 60px short of the edge. */
          margin-top: max(290px, calc(24.2vw - 72px));
        }
        /* NASA's full moon, alone, pale and grey as the moon it replaced
           (the author's, with the row of pieces and a dial drawn over it,
           which the author took out on 2026-09-27). It is made by
           scripts/chess-moon.mjs, which records the source and why it is
           toned and sized as it is. It stands where the old moon stood, in a
           canvas of the old one's shape, so the positions below are the old
           disc's: top 10.5% down, centre 45.3%, bottom 80.2%.

           The frame holds the moon and the clouds that cross it, so the
           clouds are placed on the moon itself, in shares of its canvas,
           however the phone blows it up. */
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

           Upward it runs until the page cuts it: the section's top edge,
           where the dark photograph ends. Downward the clouds are its limit:
           it is cut off at 82% of the canvas, where the veil under the
           clouds turns solid white, so on a phone it never shows under the
           bank. 82% is 33.8% of the way up its own box.

           Its grey lines are as fine as Second Wind's, at every width: the
           author asked for them to match. The white ones on the moon are a
           little over twice that, which the author asked for too, so they
           hold against the pale disc. The figures are in the script.

           It moves (2026-09-27): components/moon-mandala.tsx draws it on a
           canvas laid over the same square and sets its rings going, and the
           file is shown as a plain picture only until the canvas has read it,
           or for good where the reader has asked for less motion. The canvas
           covers the square down to the cut, and no further. */
        .chess-mandala {
          position: absolute;
          left: -0.29%;
          top: -67.92%;
          width: 100.59%;
          aspect-ratio: 1 / 1;
          clip-path: inset(0 0 33.8% 0);
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
          height: 66.2%;
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
           them out). The bank hides the lowest third of the disc: its tops
           stand at 57.5–60% of the canvas and the disc ends at 80.2%, and
           its bodies and the veil under them hide the rest, so the moon's
           lower rim is never seen.

           One turn of the bank (CLOUD_TURN, above the page) is laid out
           twice in a row; the row moves right by one turn, 77.6%, and
           starts again, where it looks exactly as it did. The keyframes'
           77.6% and the turn's spacings are one figure and change together.
           The duration keeps the pace the author approved, about 7px a
           second on a 1440 screen, so a turn takes two and a half minutes. Only
           the track's transform moves, which the browser does on its own
           layer without repainting anything.

           The bank runs the canvas's whole width and is solid white: the
           author asked for clouds that are not see-through. It had been faded
           out by a mask a little beyond the disc on either side, and at its
           ends it read as mist. It is clipped to the canvas, which on a phone
           keeps the clouds' bodies from showing under it.

           Under the bank, a veil of white (the author's asking, the same
           day) takes the clouds into the white of the page below, so the
           bank has no underside and the moon's section runs on into the
           board's without a seam. It begins at 66%, at the shoulders of the
           clouds, and is solid white by 82%, just under the disc, so that
           where two towers part, the moon's foot goes down into white mist
           rather than showing its edge; eased, not straight: a straight ramp
           read as a band. It stands still over the moving clouds, and
           nothing under it is repainted as they pass.

           The words stay on top of it all. */
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
          top: 66%;
          bottom: 0;
          pointer-events: none;
          /* Solid at 47% of its height: 82% of the canvas. */
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.15) 10%,
            rgba(255, 255, 255, 0.38) 20%,
            rgba(255, 255, 255, 0.65) 30%,
            rgba(255, 255, 255, 0.88) 40%,
            #fff 47%
          );
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
        /* The rest of the poem, after the seam's pair: LIFT AND GRAVITY; THE
           VIOLENCE OF THE IMPULSE / THE QUIET OF THE COMPOSURE; BETWEEN; A
           QUIET WAITING / FOR THE RIGHT STRIKE. The author's text of
           2026-09-27, which replaced "Between / A quiet equilibrium" here and
           the claim and answer under the ornament.

           It stood on the moon, the four stanzas an equal breath apart down
           the part the clouds leave showing, until the mandala began to move
           there and be inked black over it. The same evening the author asked
           for it to come off the moon and go down into the white of the
           clouds, drawn closer together to fit. So the poem follows the moon
           in the flow of the page, pulled up by its margin until its first
           line stands 77% of the way down the moon's canvas: under the disc,
           which the clouds hide from 57.5%, and in the white of their bodies
           and the veil (the canvas is 44.42% of the width tall, and the 23%
           of it left below 77% is 10.2% of the width). Being in the flow, it
           takes the room it needs under the canvas on a narrow screen, where
           a line is a larger share of the moon. It is positioned only so that
           it paints over the clouds and the veil.

           Drawn together: a couplet's lines are 2.1em apart, baseline to
           baseline, where every other pair on the page keeps 2.5, and the
           stanzas 3.4em. Its padding keeps the board's pair 120px away, as
           far as the phone keeps it. A phone still sets the poem round its
           blown-up moon, below. */
        .chess-moon-media .chess-line {
          color: #8a8a8a;
          line-height: 1;
        }
        .chess-moon-media .chess-line span {
          display: block;
        }
        .moon-poem {
          position: relative;
          margin-top: -10.2%;
          padding-bottom: 80px;
        }
        .moon-poem .chess-line + .chess-line {
          margin-top: 2.4em;
        }
        .moon-poem .chess-line span + span {
          margin-top: 1.1em;
        }

        /* --- Board ------------------------------------------------------ */
        .chess-board-section {
          width: 100%;
          background-color: #fff;
          padding-top: 40px;
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
          padding-top: 40px;
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
          /* The phone's 40px here was the top of a block of two lines. The
             seam's pair is a measured distance from an edge rather than a
             heading over a section, so it keeps its 120 at either size — as
             the line above the edge keeps its own. */
          .chess-moon-media {
            height: 78svh;
            margin-top: 24px;
          }
          /* Blow the moon up and set it at the foot of the block. Held by its
             own middle rather than by a left offset: -60% centres a 220% image
             and nothing else, so every change of scale used to have to be paid
             for twice, and forgetting the second number left the moon sitting
             well off to the left. */
          .chess-moon-frame {
            position: absolute;
            /* It is the frame that is blown up, not the image: Tailwind's
               preflight caps every image at max-width 100%, which once
               quietly clamped a 220% moon back to the width of the page. The
               image fills the frame, and the frame has no such cap. */
            width: 220%;
            left: 50%;
            transform: translateX(-50%);
            bottom: var(--moon-lift);
          }
          /* The moon is blown up here, too large to write on, so the poem is
             set round it instead: three stanzas in the white above it, the
             last under its cloud bank, and five equal breaths (--air) from
             the foot of FALL IN HEAVEN (26px into this block) to the foot of
             the block: LIFT, couplet, BETWEEN, the moon and its clouds, the
             waiting.

             The breath is worked out rather than guessed, because the moon
             moves with both the width and the height of the phone. The 220%
             frame is 0.977 of the page's width tall, the disc begins 10.5% of
             the way down it and the clouds have gone into the veil's white by
             82%, and the frame is lifted off the foot of this 78svh block by
             just enough (--moon-lift) to leave the last stanza one breath
             under the clouds. Solved together, the five breaths come to
             (78svh − 69.9vw − 116px) / 5: 54px on a 390 × 844 phone, 62 on a
             430 × 932. On a short phone that runs out (28px on a 375 × 667),
             so a breath is never less than 32px and the block grows past
             78svh to hold it: five of them, the 116px of type and the 69.9vw
             from the moon's top to the clouds' feet. The type is in px here
             because it is 10px on every phone (the clamp never leaves its
             floor under 768) and the lift is read by the frame, whose own em
             is not the type's. */
          .chess-moon-media {
            height: max(78svh, calc(276px + 69.9vw));
            --air: max(32px, calc((78svh - 69.9vw - 116px) / 5));
            --moon-lift: calc(var(--air) + 35px - 17.59vw);
          }
          /* Here the stanzas are placed one by one in the moon's block, not
             stacked under the moon as a computer has them, and keep the 2.5em
             couplets the breaths above were worked out with. */
          .moon-poem {
            position: static;
            margin-top: 0;
            padding-bottom: 0;
          }
          .chess-moon-media .chess-line {
            position: absolute;
            left: 0;
            right: 0;
          }
          .moon-poem .chess-line + .chess-line {
            margin-top: 0;
          }
          .moon-poem .chess-line span + span {
            margin-top: 1.5em;
          }
          .chess-moon-media .moon-lift { top: calc(26px + var(--air)); }
          .chess-moon-media .moon-impulse { top: calc(26px + 2 * var(--air) + 10px); }
          .chess-moon-media .moon-between { top: calc(26px + 3 * var(--air) + 45px); }
          .chess-moon-media .moon-waiting { top: auto; bottom: 0; }
          /* The last stanza ends the moon's block here, so the board's pair
             is given room of its own after it: about two breaths. */
          .chess-board-section {
            padding-top: 120px;
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
              white drops are climbing — and rising into place as they do. */}
          <ScrollFade className="chess-line chess-seam-above" from="below">
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
            falling — and dropping into place as they do. */}
        <ScrollFade className="chess-line chess-seam-below" from="above">
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
            <MoonMandala rings={MOON_RINGS} />
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
            <div className="chess-cloud-veil" aria-hidden="true" />
          </div>
          <div className="moon-poem">
            <p className="chess-line moon-lift">Lift and gravity</p>
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
      <ChessSetStatement radiant={radiant} />

      {/* ================= Pieces — gold and dark, face to face ================= */}
      <section className="chess-pieces-section">
        <ChessPieces />
      </section>

      <BodyFooter activeLabel={null} />
    </main>
  )
}
