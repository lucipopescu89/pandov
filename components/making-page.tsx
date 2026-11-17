import { readFileSync } from "node:fs"
import path from "node:path"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { CenterFade } from "@/components/center-fade"
import { MakingScroll } from "@/components/making-scroll"
import { MakingVideo } from "@/components/making-video"
import { MakingModel } from "@/components/making-model"
import { TEXT_FONT, TEXT_SIZE, TEXT_TRACK } from "@/lib/type"

/**
 * /making, after the author's Figma frame "Making Page - MAIN" (node 4158:180,
 * 1920 × 5267), built on 2026-11-17. The frame gives the composition; the
 * motion is the author's brief of that day, in ten points:
 *
 *  1. The site's type: Manrope for every line here, since each is read.
 *  2. Words and pictures move softly, at the reader's pace (`pandov-glide.js`
 *     already eases the wheel site-wide; everything here follows the scroll).
 *  3. The first line's dots run left, like something still loading: a search.
 *  4. The found wood comes up out of transparency and is held; the frame
 *     travels down it. In turns: the top words, then its drawing
 *     (`drawing-wood.svg`) traced and untraced, line by line, then the bottom
 *     words. The drawing never moves against the photograph.
 *  5. The words come and go with the scroll, slowly (`CenterFade`).
 *  6. The fire video rises over the photograph, which holds still beneath it. The video loops, each loop
 *     opening and closing on a quick dip to black (`MakingVideo`).
 *  7. Scrolling on, the video goes to white.
 *  8. Under it, the 3D scan of the log end with the lamp made to fit it, turning
 *     slowly by itself and left to the visitor to turn and zoom (`MakingModel`).
 *  9. The sketches come up out of the white; Siluet 2 rises out of the paper,
 *     from its foot to its head.
 * 10. The sketches go down into #202020 until only the last words are left.
 *
 * Every position is the frame's, in vw of its 1920 (`vw()`); the phone has its
 * own (under 768px), since the frame has none.
 *
 * Scroll: two passages hold a picture still while the page moves over it
 * (`position: sticky`). The rest of the motion is `MakingScroll`, which reads
 * where each passage stands and writes opacities and masks, nothing else.
 */

const FRAME_W = 1920
const vw = (px: number) => `${+((px / FRAME_W) * 100).toFixed(3)}vw`

/**
 * The ground from the very top, behind the top menu, down to under the fire
 * (the author's asking, 2026-11-17: the site's dark, #202020); it goes white
 * with the fire.
 */
const GROUND = "#202020"

/** The frame's boxes, px. */
const WOOD = { top: 571, h: 957 } // image 30, the found wood
const SKETCH = { top: 3378, h: 1201 } // image 31, the sketches
/** The found wood's photograph (4752 × 3168), in the drawing's units: 1920 × 1280. */
const WOOD_FULL_H = 1280
/** The sketches (3565 × 2344) drawn 1920 wide: 1262 tall, cropped to 1201. */
const SKETCH_FULL_H = 1262
const SKETCH_CROP = (SKETCH_FULL_H - SKETCH.h) / 2
/**
 * The drawing on the found wood, in the photograph's own coordinates (1920 ×
 * 1280), at its own size: its circle stands in the hollow under the knot. Set
 * from the author's screenshot of 2026-11-17 (matched against the photograph:
 * the circle's centre at 746, 908); it is the frame's place for it too, with
 * the photograph aligned to its bottom.
 */
const DRAWING_AT = { x: 662, y: 374 }
/** Where the frame places Siluet 2, px, frame coordinates. */
const SILUET_AT = { x: 886.26, y: 3753.21 }

/* Text: Manrope at the site's one size and tracking (`TEXT_SIZE`, `TEXT_TRACK` in `lib/type.ts`). */
const INK = {
  /** On white. */
  paper: "#6e6a65",
  /** The first line, on the dark ground (the author's colour, 2026-11-17). */
  search: "#888888",
  /** On the found wood (the author's asking, 2026-11-17: white). */
  onWood: "#ffffff",
  /** On the light, blurred forest of the found wood. */
  wood: "#3b3835",
  /** On the fire. */
  fire: "#e6e0d8",
  /** On #202020. */
  night: "#a7a29b",
}

/** Inline an SVG from `public/images/making/`, its outer <svg> dropped. */
function svgInner(file: string): string {
  const raw = readFileSync(path.join(process.cwd(), "public/images/making", file), "utf8")
  return raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")
}

/**
 * The drawing on the found wood, as separate strokes the page can trace. The
 * export draws each line as a thin filled outline (out along one side, back
 * along the other) and the knot as a circle; `MakingScroll` reveals each one
 * along its own path through a mask (`data-trace`).
 */
function woodDrawing() {
  const inner = svgInner("drawing-wood.svg")
  const shapes = [...inner.matchAll(/<(circle|path)\b[^>]*\/>/g)].map((m) => m[0])
  return shapes.map((s, i) => {
    if (s.startsWith("<circle")) {
      // The knot is a stroke already: it is traced by its own dash.
      return s.replace("<circle", `<circle data-trace="stroke" data-i="${i}" pathLength="1" stroke-dasharray="0 1"`)
    }
    const d = s.match(/\sd="([^"]+)"/)?.[1] ?? ""
    return (
      `<mask id="mk-tr-${i}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="740" height="880">` +
      `<path d="${d}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="0 1" data-trace="mask" data-i="${i}"/>` +
      `</mask>` +
      s.replace("<path", `<path mask="url(#mk-tr-${i})"`)
    )
  }).join("")
}

const CSS = `
.mk{--h1:min(${vw(WOOD.h)},100vh);--h1:min(${vw(WOOD.h)},100svh);--vh:100vh;--vh:100svh;
  --t1:calc((var(--vh) - var(--h1)) / 2);--zoom:1.3;--s1:200vh;--s2:165vh;--s3:260vh;
  background:${GROUND};overflow-x:clip;font-family:${TEXT_FONT};font-size:${TEXT_SIZE}px;letter-spacing:${TEXT_TRACK};line-height:1.7;font-weight:400}
.mk p{margin:0}
.mk-text{position:absolute;z-index:4;max-width:${vw(837)}}
/* 3. The search: dots on the baseline, never wrapped under the words (on a
   narrow screen they run on past its edge), well apart, running from left to right,
   a loading bar that never finishes. The mask, not overflow, keeps them to
   their stretch: an inline-block that hides its overflow drops its baseline
   to its foot, and the dots would stand off the line of the words. */
.mk-dots{display:inline-block;width:14em;margin-left:1.4em;white-space:nowrap;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12%,#000 60%,transparent);mask-image:linear-gradient(90deg,transparent 0,#000 12%,#000 60%,transparent);
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.mk-dots i{font-style:normal;display:inline-block;width:1.1em}
.mk-dots span{display:inline-block;animation:mk-dots 1s linear infinite}
@keyframes mk-dots{from{transform:translateX(-1.1em)}to{transform:none}}
@media (prefers-reduced-motion:reduce){.mk-dots span{animation:none}}
/* 4–7. The found wood, held still while the fire rises over it. */
.mk-c1{position:relative;height:calc(var(--h1) * 2 + var(--s1) + var(--s2));background:${GROUND}}
.mk-hold{position:sticky;top:var(--t1);height:var(--h1);overflow:hidden}
.mk-c1>.mk-hold:first-child{opacity:0;will-change:opacity,transform}
/* The found wood's plate: the photograph (3:2) covering its frame, then --zoom larger, so it has room to travel. */
.mk-plate{position:absolute;left:0;top:0;width:calc(var(--zoom) * max(100%, var(--h1) * 1.5));aspect-ratio:3/2;will-change:transform}
.mk-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.mk-draw{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
.mk-fire{z-index:2;background:#000}
.mk-white{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
/* 8. The scan. */
.mk-c2{position:relative;height:${vw(1040)};background:#fff}
.mk-model{position:absolute;left:${vw(150)};top:${vw(40)};width:${vw(900)};height:${vw(960)}}
/* 9–10. The sketches, and the dark they go into. */
.mk-c3{position:relative;height:calc(var(--vh) + var(--s3));background:#fff}
.mk-stage{position:sticky;top:0;height:var(--vh);overflow:hidden;background:#fff}
.mk-stage .mk-cover,.mk-stage svg{opacity:0}
.mk-staged{position:absolute;z-index:3;opacity:0;will-change:opacity,transform}
.mk-last a{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.25em;text-decoration-color:rgba(167,162,155,.45);transition:text-decoration-color .3s}
.mk-last a:hover{text-decoration-color:rgba(167,162,155,1)}
.mk-end{background:#202020}
.mk-on-wood{text-shadow:0 0 14px rgba(0,0,0,.35)}
.mk-held-words{opacity:0}
/* The top words on the wood: airy, a blank line between the sentences, each line kept whole. */
.mk-lines{display:block;line-height:1.9}
.mk-lines>span{display:block;white-space:nowrap}
.mk-wrap>span{white-space:normal}
.mk-lines>.mk-gap{height:1.9em}
.mk-short{display:none}
@media (max-width:1399px){.mk-long{display:none}.mk-short{display:block}}
.mk-hint-p{display:none}
@media (hover:none){.mk-hint-d{display:none}.mk-hint-p{display:inline}}
@media (max-width:767px){
  .mk{--h1:78vh;--h1:78svh;--s1:200vh;--s2:150vh;--s3:240vh;--zoom:1.35}
  .mk-text{max-width:84vw !important;left:8vw !important}
  /* On a phone the bottom words on the wood stand where the top words stood, at the top, clear of the knot's circle (the author's asking). */
  .mk-words-low{top:${((658 - WOOD.top) / WOOD.h * 100).toFixed(2)}% !important}
  .mk-c2{height:auto;padding:12vw 0 16vw}
  .mk-model{position:relative;left:0;top:0;width:100vw;height:118vw}
  .mk-c2 .mk-text{position:relative;top:auto !important;margin:6vw 8vw 0}
  .mk-staged{left:8vw !important;max-width:84vw !important}
}
`

export function MakingPage() {
  const draw = woodDrawing()
  const siluet = svgInner("siluet-2.svg")
  const woodTop = (px: number) => `calc(var(--h1) * ${((px - WOOD.top) / WOOD.h).toFixed(4)})`
  return (
    <main className="mk w-full">
      <style>{CSS}</style>
      <Navigation bgColor={GROUND} />

      {/* 1. The search */}
      <div style={{ position: "relative", padding: `${vw(135)} 0 ${vw(150)}`, background: GROUND }}>
        <p data-center-fade className="mk-text" style={{ position: "relative", left: vw(489), color: INK.search, whiteSpace: "nowrap" }}>
          Every Pandov piece begins with a search
          <span className="mk-dots" aria-hidden="true">
            <span>
              {Array.from({ length: 24 }, (_, i) => (
                <i key={i}>.</i>
              ))}
            </span>
          </span>
        </p>
      </div>

      {/* 2. The found wood, and the fire over it */}
      <section className="mk-c1" data-mk="wood">
        <div className="mk-hold">
          {/* The plate: the photograph, larger than its frame, and its
              drawing on it in its own coordinates (1920 × 1280), so the two
              never move against each other. `MakingScroll` moves the plate
              through the frame, top to bottom, as the page is scrolled. The
              circle of the drawing stands in the hollow under the knot
              (`DRAWING_AT`, set from the author's screenshot). */}
          <div className="mk-plate" data-mk="plate">
            <picture>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="mk-cover"
                src="/images/making/found-wood-plate.avif"
                alt="A weathered branch standing in a bare autumn wood"
              />
            </picture>
            <svg className="mk-draw" viewBox={`0 0 ${FRAME_W} ${WOOD_FULL_H}`} aria-hidden="true" data-mk="drawing">
              <g transform={`translate(${DRAWING_AT.x} ${DRAWING_AT.y})`} fill="none" dangerouslySetInnerHTML={{ __html: draw }} />
            </svg>
          </div>
          {/* The words on the wood are held with it too (the author's asking,
              2026-11-17): they never move against the photograph, only come
              and go in opacity with the scroll (`MakingScroll`). */}
          <p
            className="mk-text mk-on-wood mk-held-words"
            data-mk="wood-words-1"
            style={{ left: vw(489), top: woodTop(658), maxWidth: "none", color: INK.onWood }}
          >
            {/* The author's own line breaks, two settings (2026-11-17): the
                long where it stands clear of the wood, the short on narrower
                screens. Never broken anywhere else; a blank line between the
                two sentences. */}
            <span className="mk-lines mk-long">
              <span>It can be discovered in nature, among forms shaped by time.</span>
              <span className="mk-gap" />
              <span>Or in discarded objects, waiting to be reimagined.</span>
            </span>
            <span className="mk-lines mk-short">
              <span>It can be discovered in nature,</span>
              <span>among forms shaped by time.</span>
              <span className="mk-gap" />
              <span>Or in discarded objects,</span>
              <span>waiting to be reimagined.</span>
            </span>
          </p>
          <p
            className="mk-text mk-on-wood mk-held-words mk-words-low"
            data-mk="wood-words-2"
            style={{ left: vw(1190), top: "65%", color: INK.onWood }}
          >
            Or anywhere there is a quiet potential.
          </p>
        </div>

        <div style={{ height: "var(--s1)" }} />
        <div className="mk-hold mk-fire" data-mk="fire">
          <MakingVideo
            src="/videos/making-burn.mp4?v=1"
            poster="/videos/making-burn-poster.jpg?v=1"
            phone={{ src: "/videos/making-burn-phone.mp4?v=2", poster: "/videos/making-burn-phone-poster.jpg?v=2" }}
          />
          {/* Held with the fire, as the words on the wood are with it
              (2026-11-17, the author's asking): it comes and goes in opacity
              alone, while the fire is held (`MakingScroll`). */}
          <p
            className="mk-text mk-held-words"
            data-mk="fire-words"
            style={{
              left: vw(489),
              maxWidth: vw(640),
              top: "30.6%",
              color: INK.fire,
              textShadow: "0 0 18px rgba(0,0,0,0.55)",
            }}
          >
            {/* Set as the words on the wood are: airy, a blank line between the sentences. */}
            <span className="mk-lines mk-wrap">
              <span>Through careful cleaning and surface treatment.</span>
              <span className="mk-gap" />
              <span>The excess is stripped away to reveal its raw, organic beauty.</span>
            </span>
          </p>
          <div className="mk-white" data-mk="white" />
        </div>
      </section>

      {/* 3. The scan */}
      <section className="mk-c2">
        <MakingModel src="/models/making-scan.glb?v=1" className="mk-model" />
        <p data-center-fade className="mk-text" style={{ left: vw(1129), top: vw(2669 - 2338), maxWidth: vw(470), color: INK.paper }}>
          Most of the found pieces are 3D scanned.
          <br />
          Capturing their exact geometry reveals what works visually, while allowing new elements to be engineered for a
          precise physical fit.
        </p>
      </section>

      {/* 4. The sketches, Siluet 2 rising out of the paper, and the dark */}
      <section className="mk-c3" data-mk="paper">
        <div className="mk-stage" data-mk="stage">
          <picture>
            <source media="(max-width: 767px)" srcSet="/images/making/sketches-phone.avif" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mk-cover"
              data-mk="sketches"
              src="/images/making/sketches.avif"
              alt="Pencil sketches in open notebooks, a white sculpture standing on them"
              loading="lazy"
            />
          </picture>
          <svg
            className="mk-cover"
            viewBox={`0 0 ${FRAME_W} ${SKETCH_FULL_H}`}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            data-mk="siluet"
          >
            <defs>
              <linearGradient id="mk-rise-edge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#000" />
                <stop offset="0.12" stopColor="#fff" />
                <stop offset="1" stopColor="#fff" />
              </linearGradient>
              <mask id="mk-rise" maskUnits="userSpaceOnUse" x="-300" y="-100" width="900" height="1000">
                {/* Moved up by `MakingScroll`: the silhouette shows from its foot up. */}
                <rect data-mk="rise" x="-300" y="868" width="900" height="900" fill="url(#mk-rise-edge)" />
              </mask>
            </defs>
            <g transform={`translate(${SILUET_AT.x} ${SILUET_AT.y - SKETCH.top + SKETCH_CROP})`}>
              <g mask="url(#mk-rise)" fill="none" dangerouslySetInnerHTML={{ __html: siluet }} />
            </g>
          </svg>
          <p
            className="mk-staged"
            data-mk="paper-words"
            style={{ left: vw(805), top: "11%", maxWidth: vw(600), color: INK.wood }}
          >
            Another way to search for a form is on a blank sheet of paper. Here, an imagined silhouette gradually takes
            shape. Once drawn, the form is modeled digitally and brought into the physical world through 3D printing, CNC
            milling and hand finishing.
          </p>
          <p
            className="mk-staged mk-last"
            data-mk="last-words"
            style={{ left: vw(805), top: "50%", maxWidth: vw(462), color: INK.night }}
          >
            We don&apos;t follow a fixed formula. Every material brings its own questions, every process opens new
            possibilities, and every object teaches us something for the next.
            <br />
            <Link href="/contact">Subscribe for more.</Link>
          </p>
        </div>
      </section>

      <div className="mk-end">
        <BodyFooter activeLabel="making" />
      </div>

      <CenterFade />
      <MakingScroll />
    </main>
  )
}
