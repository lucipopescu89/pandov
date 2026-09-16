import Image from "next/image"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { ChessSetGallery } from "@/components/chess-set-gallery"
import { ChessSetOrnament } from "@/components/chess-set-ornament"
import { ChessSetStatement } from "@/components/chess-set-statement"

export const metadata = {
  title: "Chess Set — PANDOV",
  description: "Chess Set — For Mind collection",
}

export default function ChessSetPage() {
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
          background-color: #1a1a1a;
        }
        .chess-hero-intro {
          padding: 280px 24px 0;
        }
        .chess-hero-eyebrow {
          color: #5f5f5f;
          margin-bottom: 26px;
        }
        .chess-hero-claim {
          color: #7d7d7d;
          margin-top: 322px;
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
          position: absolute;
          left: 0;
          right: 0;
          bottom: 156px;
          color: #6e6e6e;
          line-height: 1;
        }

        /* --- Moon ------------------------------------------------------ */
        .chess-moon-section {
          width: 100%;
          background-color: #fff;
          padding-top: 106px;
          overflow: hidden;
        }
        .chess-moon-intro .chess-line {
          color: #999;
        }
        .chess-moon-intro .chess-line + .chess-line {
          margin-top: 34px;
        }
        .chess-moon-media {
          position: relative;
          margin-top: 40px;
        }
        .chess-moon-image {
          width: 100%;
          height: auto;
          display: block;
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

        /* --- Pieces (reserved) ------------------------------------------ */
        .chess-pieces-section {
          width: 100%;
          background-color: #fff;
          min-height: 120px;
        }

        .chess-footer {
          width: 100%;
          background-color: #fff;
          padding: 80px 0 64px;
        }

        @media (max-width: 768px) {
          .chess-hero-intro {
            padding-top: 30px;
          }
          .chess-hero-claim {
            margin-top: 48px;
          }
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
          .chess-hero-answer {
            bottom: 32px;
          }
          .chess-moon-section {
            padding-top: 40px;
          }
          .chess-moon-intro .chess-line + .chess-line {
            margin-top: 24px;
          }
          .chess-moon-media {
            height: 78svh;
            margin-top: 24px;
          }
          /* Blow the moon up and pin it to the bottom so the pieces stay in frame */
          .chess-moon-image {
            position: absolute;
            width: 220%;
            height: auto;
            left: -60%;
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
          .chess-footer {
            padding: 56px 0 48px;
          }
        }
      `}</style>

      {/* ================= Hero ================= */}
      <section className="chess-hero">
        <Navigation dark bgColor="#1a1a1a" />

        <div className="chess-hero-intro">
          <p className="chess-line chess-hero-eyebrow">Chess Set</p>
          {/* Square ornament — the golden band travels across it on scroll */}
          <ChessSetOrnament />
          <p className="chess-line chess-hero-claim">Remember you are unique</p>
        </div>

        <div className="chess-hero-media">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Imagine%20headline-1gFGmN8gTyudB3LusnNvyBx8exNcr8.png"
            alt="Chess Set — PANDOV"
            width={2400}
            height={1350}
            className="chess-hero-image"
            priority
          />
          <p className="chess-line chess-hero-answer">Just like everybody else</p>
        </div>
      </section>

      {/* ================= Moon ================= */}
      <section className="chess-moon-section">
        <div className="chess-moon-intro">
          <p className="chess-line">Rise and descend</p>
          <p className="chess-line">Light and weight</p>
        </div>

        <div className="chess-moon-media">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-8FGGyC1sARx2W54iCHYqLGqHOs34Kx.jpg"
            alt="Chess pieces with moon — PANDOV"
            width={3200}
            height={1800}
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
      <ChessSetStatement />

      {/* ================= Pieces — black and white, face to face =================
          Left intentionally empty: the full set of piece photographs will be
          added here. See components/chess-pieces-gallery.tsx for the previous
          side-by-side galleries. */}
      <section className="chess-pieces-section" />

      <div className="chess-footer">
        <BodyFooter activeLabel={null} />
      </div>
    </main>
  )
}
