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
import { ScrollFade } from "@/components/scroll-fade"
import { SeamDrops } from "@/components/seam-drops"

export const metadata = {
  title: "Chess Set — PANDOV",
  description: "Chess Set — For Mind collection",
}

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
          margin-top: 40px;
        }
        .chess-moon-image {
          width: 100%;
          height: auto;
          display: block;
          opacity: 0.8;
        }
        /* The rest of the poem, after the seam's pair, read down the moon:
           LIFT AND GRAVITY; THE VIOLENCE OF THE IMPULSE / THE QUIET OF THE
           COMPOSURE; BETWEEN; A QUIET WAITING / FOR THE RIGHT STRIKE. The
           author's text of 2026-09-27, which replaced "Between / A quiet
           equilibrium" here and the claim and answer under the ornament.

           BETWEEN stands on the moon's own centre. The disc was measured off
           the photograph (top 10.5% down, centre 45.3%), and the couplet is
           set midway between BETWEEN and LIFT AND GRAVITY, so the three
           stanzas keep an equal breath between them at any width. The last
           stanza is under the pieces, in their reflection, where the marble
           is nearly white (84–94% down): the row of pieces stands between
           BETWEEN and the waiting, and is the waiting.

           A couplet's lines are 2.5em apart, baseline to baseline, and its
           stanza's neighbours a good deal further, so a pair is read as one
           thought. Every pair on the page but the seam's, which the edge of
           the photograph splits on purpose, keeps that figure. */
        .chess-moon-media .chess-line {
          position: absolute;
          left: 0;
          right: 0;
          color: #8a8a8a;
          line-height: 1;
        }
        .chess-moon-media .chess-line span {
          display: block;
        }
        .chess-moon-media .chess-line span + span {
          margin-top: 1.5em;
        }
        .chess-moon-media .moon-lift { top: 14%; }
        .chess-moon-media .moon-impulse { top: calc(29.65% - 1.5em); }
        .chess-moon-media .moon-between { top: calc(45.3% - 0.5em); }
        .chess-moon-media .moon-waiting { bottom: calc(11.5% - 1.75em); }

        /* --- Board ------------------------------------------------------ */
        .chess-board-section {
          width: 100%;
          background-color: #fff;
          /* 40px once. The moon's last stanza now stands in the photograph's
             lower edge, and at 40 WHITE REACHES UPWARD followed it like its
             third and fourth lines. */
          padding-top: 120px;
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
          /* Blow the moon up and pin it to the bottom so the pieces stay in
             frame. Held by its own middle rather than by a left offset: -60%
             centres a 220% image and nothing else, so every change of scale used
             to have to be paid for twice, and forgetting the second number left
             the moon sitting well off to the left. */
          .chess-moon-image {
            position: absolute;
            /* Tailwind's preflight caps every image at max-width 100%, which
               was quietly clamping these 220% back to the width of the page —
               the moon had never actually been enlarged here. */
            max-width: none;
            width: 220%;
            height: auto;
            left: 50%;
            transform: translateX(-50%);
            bottom: 0;
          }
          /* The moon is blown up here and there is room over it, so the three
             stanzas stand in the white above it rather than on it, and share
             that white evenly: four equal breaths from the foot of FALL IN
             HEAVEN (26px into this block) to the moon's top edge. That edge
             is worked out rather than guessed, because it moves with both the
             width and the height of the phone: the 220% photograph is 0.977
             of the page's width tall, pinned to the foot of this 78svh block,
             and its disc begins 10.5% of the way down it. The last stanza
             keeps its place in the pieces' reflection. */
          .chess-moon-media {
            --moon-top: calc(78svh - 87.4vw);
            --air: calc((var(--moon-top) - 26px - 5.5em) / 4);
          }
          .chess-moon-media .moon-lift { top: calc(26px + var(--air)); }
          .chess-moon-media .moon-impulse { top: calc(26px + 2 * var(--air) + 1em); }
          .chess-moon-media .moon-between { top: calc(26px + 3 * var(--air) + 4.5em); }
          .chess-moon-media .moon-waiting { bottom: calc(11.2vw - 1.75em); }
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
          <Image
            src="/images/chess-set/moon.jpg"
            alt="Chess pieces with moon — PANDOV"
            width={4957}
            height={2202}
            className="chess-moon-image"
          />
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
