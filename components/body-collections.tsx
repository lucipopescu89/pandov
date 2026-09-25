import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"

/**
 * Body collections landing page — faithful recreation of the Figma "Body"
 * frame (1920 x 2323, background #202020).
 *
 * The middle region (between the top menu and the footer) is laid out on a
 * fixed design canvas (1920 x 1913) so every title and product image lands
 * exactly where the designer placed it. Everything is expressed as a
 * percentage of that canvas, and font sizes use `cqw` (container-query
 * width) units, so the whole page scales fluidly while preserving the
 * exact Figma composition. A phone sees it cropped rather than shrunk (see
 * `PHONE_WINDOW`). All product images use the `lighten` blend mode
 * (as in Figma) so their dark photographic backgrounds drop out against the
 * #202020 canvas.
 */
const CANVAS_W = 1920
const CANVAS_H = 1913

/**
 * Mobile framing, as on Second Wind (`body-presentation.tsx`): cropped, not
 * shrunk. Fitted whole into a 390px phone, the canvas is drawn at a fifth of
 * its size, the words at 2px and the Second Wind pendant 22px wide, which the
 * author found far too small on 2026-09-25. Everything on the canvas stands
 * in a band down its middle, the widest Seed's box at 353 units (x 784 to
 * 1137), so a phone sees a centred window of `PHONE_WINDOW` units: the band at
 * nearly its full size, 22px of ground either side of the widest box on a
 * 390px phone, and the words at 11.7px, next to the menu's 12. A narrower
 * phone sees the same framing, drawn smaller.
 */
const PHONE_W = 390
const PHONE_WINDOW = 400
/** The canvas's drawn width on a `PHONE_W` phone, in CSS pixels. */
const PHONE_CANVAS_W = (CANVAS_W * PHONE_W) / PHONE_WINDOW

/**
 * Where the crop has opened out completely: the width the desktop layout
 * starts at, so a computer sees the page exactly as before. From `PHONE_W` up
 * to here the canvas eases down to the page's width and meets it, so nothing
 * jumps on the way; there is no breakpoint.
 */
const CROP_MEETS = 1024
/** Pixels of canvas width lost per pixel of page width, over that stretch. */
const CROP_EASE = (PHONE_CANVAS_W - CROP_MEETS) / (CROP_MEETS - PHONE_W)
/** Canvas width over that stretch: `CROP_BASE - CROP_EASE * page width`. */
const CROP_BASE = PHONE_CANVAS_W + CROP_EASE * PHONE_W

const TITLE_COLOR = "#d9d9d9"
const WIP_COLOR = "#7d7d7d"
const PARAGRAPH_COLOR = "#888888"

const julius = {
  fontFamily: "'Julius Sans One', sans-serif",
  textTransform: "uppercase" as const,
}

/** left/top/width are px on the 1920 x 1913 design canvas */
function pct(px: number, axis: "w" | "h") {
  return `${(px / (axis === "w" ? CANVAS_W : CANVAS_H)) * 100}%`
}

export function BodyCollections() {
  return (
    <main
      className="w-full overflow-x-hidden"
      style={{ backgroundColor: "#202020" }}
    >
      {/* Top menu with logo — same component as the rest of the site */}
      <Navigation bgColor="#202020" />

      {/* The window the canvas is seen through. On a phone the canvas is drawn
          wider than the page and centred in it, so the crop takes equally off
          both sides. See `PHONE_WINDOW`. */}
      <div className="mx-auto flex w-full justify-center" style={{ maxWidth: CANVAS_W, overflowX: "clip" }}>
      {/* Design canvas for the middle content */}
      <div
        className="relative flex-none"
        style={{
          width: `max(100%, min(${(CANVAS_W / PHONE_WINDOW) * 100}%, ${CROP_BASE}px - ${CROP_EASE * 100}vw))`,
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          containerType: "inline-size",
        }}
      >
        {/*
          `container-type` establishes an isolated blending group whose
          initial backdrop is transparent, so the container's own background
          can't serve as the backdrop for the images' `mixBlendMode: lighten`.
          Painting this #202020 layer as the first child (lowest in z-order)
          gives the images something to blend against inside the same group,
          so their dark photo backgrounds drop out.
        */}
        <div className="absolute inset-0" style={{ backgroundColor: "#202020" }} />
        {/* Intro paragraph — Figma node 3979:2905: Julius Sans One 12px,
            lineHeight 13.092 (≈1.091), color #888888, center, box 350px wide,
            with a blank line between each of the three sentences. */}
        <p
          className="absolute -translate-x-1/2 text-center"
          style={{
            left: "50%",
            top: pct(116, "h"),
            width: pct(350, "w"),
            color: PARAGRAPH_COLOR,
            fontSize: `${(12 / CANVAS_W) * 100}cqw`,
            lineHeight: 13.092 / 12,
            letterSpacing: "normal",
            whiteSpace: "pre-line",
            ...julius,
          }}
        >
          {"Objects worn with intention.\n\nDesigned not as accessories, but as companions.\n\nThey become part of the person who wears them."}
        </p>

        {/* ── Collection 1: Second Wind (links to the presentation page) ── */}
        <Link
          href="/body/second-wind"
          className="absolute -translate-x-1/2 text-center transition-opacity hover:opacity-70"
          style={{
            left: "50%",
            top: pct(290, "h"),
            color: TITLE_COLOR,
            fontSize: `${(12 / CANVAS_W) * 100}cqw`,
            letterSpacing: "0.22em",
            ...julius,
          }}
        >
          Second Wind
        </Link>
        <Link
          href="/body/second-wind"
          aria-label="Second Wind collection"
          className="absolute block transition-opacity hover:opacity-80"
          style={{ left: "50%", marginLeft: `-${(110 / CANVAS_W) * 50}%`, top: pct(342, "h"), width: pct(110, "w") }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/body-collections/second-wind.png"
            alt="Second Wind — gold pendant"
            style={{ display: "block", width: "100%", height: "auto", mixBlendMode: "lighten" }}
          />
        </Link>

        {/* ── Collection 2: Satori (wip) ── */}
        <div
          className="absolute -translate-x-1/2 text-center"
          style={{ left: "50%", top: pct(824, "h") }}
        >
          <div style={{ color: TITLE_COLOR, fontSize: `${(12 / CANVAS_W) * 100}cqw`, letterSpacing: "0.22em", ...julius }}>
            Satori
          </div>
          <div style={{ color: WIP_COLOR, fontSize: `${(9 / CANVAS_W) * 100}cqw`, letterSpacing: "0.12em", marginTop: "0.3cqw", ...julius }}>
            (wip)
          </div>
        </div>
        <div
          className="absolute"
          style={{
            left: "50%",
            marginLeft: `-${(347 / CANVAS_W) * 50}%`,
            top: pct(876, "h"),
            width: pct(347, "w"),
            height: pct(341, "h"),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/body-collections/satori.png"
            alt="Satori — sunburst pendant"
            /* The source photo is 3242×2500 (wide) while the box is nearly
               square, so object-fit: fill squished the round sunburst into an
               oval. Use `cover` to preserve the image's aspect ratio and fill
               the box; the cropped side margins are just the (lighten-removed)
               black background. */
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", mixBlendMode: "lighten" }}
          />
        </div>

        {/* ── Collection 3: Seed (wip) ── */}
        <div
          className="absolute -translate-x-1/2 text-center"
          style={{ left: "50%", top: pct(1315, "h") }}
        >
          <div style={{ color: TITLE_COLOR, fontSize: `${(12 / CANVAS_W) * 100}cqw`, letterSpacing: "0.22em", ...julius }}>
            Seed
          </div>
          <div style={{ color: WIP_COLOR, fontSize: `${(9 / CANVAS_W) * 100}cqw`, letterSpacing: "0.12em", marginTop: "0.3cqw", ...julius }}>
            (wip)
          </div>
        </div>
        <div
          className="absolute"
          style={{
            left: "50%",
            marginLeft: `-${(353 / CANVAS_W) * 50}%`,
            top: pct(1367, "h"),
            width: pct(353, "w"),
            height: pct(342, "h"),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/body-collections/seed.png"
            alt="Seed — earrings"
            /* Figma scaleMode: FILL → object-fit: cover inside the 353×342 box */
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "lighten" }}
          />
        </div>
      </div>
      </div>

      {/* Bottom menu — spacing is the component's own, shared with every page */}
      <BodyFooter />
    </main>
  )
}
