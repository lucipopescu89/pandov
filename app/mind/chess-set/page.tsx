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
import { ChessHeroLines } from "@/components/chess-hero-lines"
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
        .chess-hero-claim {
          color: #7d7d7d;
          /* 262px once, when this line stood alone in the middle of the dark
             and the answer to it was set over the photograph below. The two
             are now read one after the other under the ornament — see the
             ChessHeroLines component — so the claim stands on its own under
             the drawing rather than adrift in the middle of the dark. Chosen
             against 110 and 210 seen side by side: at 110 the line still hangs
             off the ornament, at 210 the block comes apart. */
          margin-top: 160px;
        }
        .chess-hero-media {
          position: relative;
          margin-top: 48px;
          line-height: 0;
        }
        .chess-hero-image {
          width: 100%;
          height: auto;
          display: block;
        }
        .chess-hero-answer {
          /* It was set over the bottom of the photograph, 156px up from its
             edge. It now follows the claim it answers, and it no longer needs
             a place of its own above the water at the seam. The gap is wider
             than the claim's own 160, and deliberately so: the two lines are
             a claim and its answer, and the pause between them is the joke. */
          color: #6e6e6e;
          line-height: 1;
          margin-top: 250px;
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
        .chess-moon-media .chess-line {
          position: absolute;
          left: 0;
          right: 0;
          color: #8a8a8a;
        }
        .chess-moon-media .moon-lift { top: 14%; }
        .chess-moon-media .moon-between { top: calc(40% - 50px); }
        .chess-moon-media .moon-equilibrium { top: calc(58% - 100px); }

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
        }
        .chess-board-captions .chess-line + .chess-line {
          margin-top: 34px;
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
          /* The claim's 48px here was the phone's share of a 262px gap. The
             phone now keeps the desktop's own 160 and 250: the pair reads as
             one block at either size, and the ornament above it is already
             smaller on a phone. */
          .chess-hero-media {
            margin-top: 32px;
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
          .chess-moon-media .moon-lift { top: 8%; }
          .chess-moon-media .moon-between { top: 24%; }
          .chess-moon-media .moon-equilibrium { top: 38%; }
          .chess-board-captions {
            margin-bottom: 24px;
          }
          .chess-board-captions .chess-line + .chess-line {
            margin-top: 24px;
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
          {/* The claim and its answer, read one after the other: the second
              comes up out of the space the first leaves. */}
          <ChessHeroLines />
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
          Fall into Heaven
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
          <p className="chess-line moon-between">Between</p>
          <p className="chess-line moon-equilibrium">A quiet equilibrium</p>
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
