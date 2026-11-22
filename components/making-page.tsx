import { readFileSync } from "node:fs"
import path from "node:path"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { CenterFade } from "@/components/center-fade"
import { MakingScroll } from "@/components/making-scroll"
import { MakingVideo } from "@/components/making-video"
import { MakingScan } from "@/components/making-scan"
import { MakingHarag } from "@/components/making-harag"
import { MakingHeavy } from "@/components/making-heavy"
import { FIRE_SECTION_EXTRA, FIRE_FROM_S1, PHONE_FIRE_Z, PHONE_FIRE_FROM_S1, HEAVY_LEAN } from "@/lib/making-rhythm"
import { TEXT_FONT, TEXT_SIZE, TEXT_TRACK, JULIUS, TRACK } from "@/lib/type"

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
 *  6. The fire video rises over the photograph, which holds still beneath it. The video loops with
 *     no seam, its end dissolving into its start (`MakingVideo`, `scripts/making-burn.py`).
 *  7. Scrolling on, the video goes into the dark (#202020; it went to white
 *     until 2026-11-18), and the piece on its branch turns once round with the
 *     scroll (`MakingHarag`, the render "Secvente Harag"); the white comes
 *     over it at its end.
 *  8. Under it, the scan of the log end with the figure in it (`MakingScan`):
 *     the photograph and its 3D scan either side of a line the visitor moves
 *     (before and after), large on the left and moving faster than the page. (Until the author's asking
 *     later the same day it was the 3D model itself, `making-model.tsx`, now
 *     unused.)
 *  9. The sketches come up out of the white; Siluet 2 rises out of the paper,
 *     from its foot to its head.
 * 10. Heavy Light (2026-11-19, `MakingHeavy`): the wooden piece and its four
 *     3D models turning beside it, then the page goes into white until only
 *     the last words are left (they came over the sketches until that day; the
 *     white was #202020 until later that day).
 *
 * **One rhythm** (2026-11-19, the author's asking: the page seemed chaotic):
 * every passage now follows `lib/making-rhythm.ts`. Every picture is held in
 * the found wood's frame (`--h1`; the turning piece alone keeps the window's
 * height), comes out of transparency with a small glide, and has its words
 * only once it has come, fading over the same length of scroll. The ground is
 * the site's dark from the top to the foot (2026-11-21, the author's asking;
 * from the scan to the foot it was white until then). On
 * the dark the passages follow each other with no empty scroll between them:
 * the turning piece begins under the fire's end, the scan under the turning
 * piece's.
 *
 * **The fire is no longer held** (later that day, the author's asking: it
 * lacked fluency): it has its own passage (`.mk-fs`), beginning as the found
 * wood is nearly gone, and goes up the window all the way, out of
 * transparency and into it again, only slower about the middle, where its
 * words are (`fireTravel` in `lib/making-rhythm.ts`). **The last words** stand
 * with the bottom menu on one last screen (`.mk-end`, a little above the
 * middle), coming up together over Heavy Light's white.
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
 * (the author's asking, 2026-11-17: the site's dark, #202020), and on under
 * the turning piece; it goes white at the end of that (since 2026-11-18; with
 * the fire before).
 */
const GROUND = "#202020"

/** The frame's boxes, px. */
const WOOD = { top: 571, h: 957 } // image 30, the found wood
/**
 * The found wood's photograph (the author's Found_RawWood.jpg, 4752 × 3168,
 * retouched on 2026-11-18), in the drawing's units: 1920 × 1280 whole. Its
 * top `WOOD_CROP` is cut off (the author's asking, 2026-11-18: only blurred
 * forest there, and the knot's circle came into view too late), so the plate
 * is 1920 × 1190 and everything on it is measured from the cut.
 */
const WOOD_CROP = 90
const WOOD_FULL_H = 1280 - WOOD_CROP
/**
 * The drawing on the found wood, in the photograph's own coordinates (1920 ×
 * 1280), at its own size: its circle stands in the hollow under the knot. Set
 * from the author's screenshot of 2026-11-17 (matched against the photograph:
 * the circle's centre at 746.5, 908 of the whole photograph); it is the
 * frame's place for it too, with the photograph aligned to its bottom. The
 * author's redrawing of 2026-11-18 ("desen pe lemn gasit.svg", 716 × 949, its
 * circle at 139.5, 587.5) is placed by its circle on the same spot, less the
 * crop.
 */
const DRAWING_AT = { x: 746.5 - 139.5, y: 908 - 587.5 - WOOD_CROP }

/* Text: Manrope at the site's one size and tracking (`TEXT_SIZE`, `TEXT_TRACK` in `lib/type.ts`). */
const INK = {
  /** On white. */
  paper: "#6e6a65",
  /** The first line, on the dark ground (the author's colour, 2026-11-17). */
  search: "#888888",
  /** On the found wood (the author's asking, 2026-11-17: white; greyer since 2026-11-19, "too strident"). */
  onWood: "#d9d5cf",
  /** On the light, blurred forest of the found wood. */
  wood: "#3b3835",
  /** On the fire (greyer since 2026-11-19, with the found wood's). */
  fire: "#cdc8c0",
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
      `<mask id="mk-tr-${i}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="820" height="1050">` +
      `<path d="${d}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="0 1" data-trace="mask" data-i="${i}"/>` +
      `</mask>` +
      s.replace("<path", `<path mask="url(#mk-tr-${i})"`)
    )
  }).join("")
}

const CSS = `
.mk{--h1:min(${vw(WOOD.h)},100vh);--h1:min(${vw(WOOD.h)},100svh);--vh:100vh;--vh:100svh;
  --t1:calc((var(--vh) - var(--h1)) / 2);--zoom:1.3;--s1:210vh;--s2:165vh;--s3:230vh;--s4:330vh;--s5:420vh;
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
/* The found wood, held until it has gone (its leaving is written by MakingScroll). */
.mk-c1{position:relative;height:calc(var(--h1) + var(--s1) * 1.25);background:${GROUND}}
.mk-hold{position:sticky;top:var(--t1);height:var(--h1);overflow:hidden}
.mk-c1>.mk-hold:first-child{opacity:0;will-change:opacity,transform}
/* The found wood's plate: the photograph drawn as large as its whole (3:2) would cover the frame, then --zoom larger, so it has
   room to travel; its top is cropped (WOOD_CROP), so it is a little less tall than that. */
.mk-plate{position:absolute;left:0;top:0;width:calc(var(--zoom) * max(100%, var(--h1) * 1.5));aspect-ratio:${FRAME_W}/${WOOD_FULL_H};will-change:transform}
.mk-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.mk-draw{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
/* The fire's passage (2026-11-19): it begins ${FIRE_FROM_S1} of --s1 into the found wood's (2.2 windows, as the wood is nearly gone), over
   it, its window held, and the fire going up through it (MakingScroll). */
.mk-fs{position:relative;z-index:2;height:calc(2 * var(--vh) + var(--h1) + ${FIRE_SECTION_EXTRA} * var(--vh));
  margin-top:calc(${(FIRE_FROM_S1 - 1.25).toFixed(4)} * var(--s1) - var(--t1) - var(--h1));background:transparent}
.mk-fs-stage{position:sticky;top:0;height:var(--vh);overflow:hidden}
.mk-fire{position:absolute;left:0;right:0;top:0;height:var(--h1);overflow:hidden;background:${GROUND};opacity:0;
  transform:translate3d(0,100vh,0);will-change:transform,opacity}
/* 8. The scan: its own styles, in making-scan.tsx. */
/* 9–10. The sketches, and the dark they go into. */
/* The sketches (2026-11-19): they begin under the scan's end, as its white is done (z-index above it, a negative
   margin, transparent until their window is held; then white), and come out of transparency in the found wood's
   frame (--h1, .mk-band), so there is no empty white between the two. */
.mk-c3{position:relative;z-index:4;margin-top:calc(-1 * var(--vh));height:calc(var(--vh) + var(--s3));background:transparent}
.mk-stage{position:sticky;top:0;height:var(--vh);overflow:hidden;background:transparent}
/* Nothing in it takes a hand, and it lies over the scan's end (whose line does). */
.mk-c3,.mk-c3 *{pointer-events:none}
.mk-band{position:absolute;left:0;right:0;top:var(--t1);height:var(--h1);overflow:hidden}
.mk-stage .mk-cover,.mk-stage svg{opacity:0}
.mk-staged{position:absolute;z-index:3;opacity:0;will-change:opacity}
/* 4. The drawings (2026-11-21): two sheets, white on the page's dark, the screen's width and whole, one under the
   other with the words between them, going up with the page (the page flows; MakingScroll writes their opacity). */
.mk-drs{display:flex;flex-direction:column;align-items:center}
.mk-dr{display:block;width:100%;height:auto;opacity:0;will-change:opacity}
/* Later that day (the author's asking): the words on sheet 1, in the clear band at its foot (below 0.88 of its height,
   where nothing is drawn right of its middle), aligned with the scan's words above (their left edge); sheet 2 close
   under sheet 1. */
.mk-dr-1w{position:relative;width:100%}
.mk-dr-2{margin-top:2vh}
/* Its words on two lines, a sentence each (the author's asking); on a narrow screen they may wrap. */
.mk-dr-words{position:absolute;z-index:2;left:calc(min(85vw, 2000px) * .59 + 5vw);top:88%;margin:0 !important;text-align:left;line-height:2;opacity:0;will-change:opacity}
.mk-dr-words>span{display:block;white-space:nowrap}
/* A phone: the sheet is too small to carry them; under it, at the scan's words' margin. */
@media (max-width:767px){
  .mk-dr-words{position:relative;left:auto;top:auto;margin:3vh 8vw 0 !important;max-width:84vw}
  .mk-dr-words>span{white-space:normal}.mk-dr-words>span+span{margin-top:.6em}
  .mk-dr-2{margin-top:3vh}
}
/* 6. The print (2026-11-21): in the found wood's frame (--h1), the whole width, on white, going up with the page. */
.mk-pr{position:relative;z-index:3;padding:6vh 0 24vh;background:transparent}
.mk-pr-box{position:relative;height:var(--h1);overflow:hidden;background:${GROUND}}
.mk-flow .mk-pr-box{opacity:0;will-change:opacity}
/* The last screen: the last words, a little above the middle, and the bottom menu at its foot, coming up
   together over Heavy Light's white (its last window, under them). */
.mk-end{position:relative;z-index:3;margin-top:calc(-1 * var(--vh));background:transparent}
/* The words and the menu as one, moved and faded as one by MakingScroll: they come out of transparency with the
   words about the middle of the window, and rise together, slower than the page, to their places. */
.mk-end-in{min-height:var(--vh);display:flex;flex-direction:column;opacity:0;will-change:opacity,transform}
.mk-end-fill{flex:1}
/* The last words: set as the others (airy lines, line-height 3, each line whole), 30% down the last screen, or
   higher on a short window so the bottom menu stays clear of them; MakingScroll brings them from about the middle. */
.mk-last{margin:0;padding:clamp(40px, calc(var(--vh) - 450px), 30vh) 0 0 ${vw(805)};line-height:3}
.mk-last>span{display:block;white-space:nowrap}
.mk-last a{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.25em;text-decoration-color:rgba(167,162,155,.4);transition:text-decoration-color .3s}
.mk-last a:hover{text-decoration-color:rgba(167,162,155,1)}

.mk-on-wood{text-shadow:0 0 14px rgba(0,0,0,.35)}
.mk-held-words{opacity:0}
/* The top words on the wood: airy, a blank line between the sentences, each line kept whole. */
.mk-lines{display:block;line-height:1.9}
.mk-lines>span{display:block;white-space:nowrap}
.mk-wrap>span{white-space:normal}
.mk-pbr{display:none}
/* The page's white behind everything after the scan: gone (2026-11-21, the author's asking: the page dark to its foot;
   the display:block below it is overruled by !important). */
.mk-bg-veil{display:none !important;position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:0}
.mk-lines>.mk-gap{height:1.9em}
.mk-short{display:none}
@media (max-width:1399px){.mk-long{display:none}.mk-short{display:block}}
.mk-hint-p{display:none}
@media (hover:none){.mk-hint-d{display:none}.mk-hint-p{display:inline}}
@keyframes mk-in{from{opacity:0}to{opacity:1}}
/* The page flowing: Heavy Light is held only while its models turn and then goes up with the page, and the last
   screen comes after it (2026-11-19, the author's asking, to see). */
.mk-flow{--s5:275vh}
.mk-flow .mk-end{margin-top:0}
/* The flow on a computer (on a phone it is set below, and wins there). */
@media (min-width:768px){
  .mk-flow .mk-c1{height:auto;padding:0 0 12vh}
  .mk-flow .mk-c1>.mk-hold{position:relative;top:auto}
  .mk-flow .mk-c1 .mk-plate{animation:mk-in 1.6s ease-out .15s both}
  .mk-flow .mk-fs{height:auto;margin-top:0;padding:6vh 0 12vh}
  .mk-flow .mk-fs-stage{position:relative;height:var(--h1)}
  .mk-flow .mk-fire{transform:none}
  .mk-flow .mk-c3{margin-top:0;height:auto;padding:12vh 0;background:transparent}
  .mk-flow .mk-stage{position:relative;height:auto;overflow:visible;background:transparent}
  .mk-flow .mk-band{position:relative;top:auto}
  .mk-flow .mk-bg-veil{display:block}
}
@media (max-width:767px){
  /* --zoom 1.6 on a phone since 2026-11-19 (1.35 before): the found wood has more to travel, so its passage can be
     geared to a pace like a computer's (MakingScroll). --s5 shorter: Heavy Light has two models here. */
  .mk{--h1:78vh;--h1:78svh;--s1:210vh;--s2:150vh;--s3:230vh;--s4:290vh;--s5:280vh;--zoom:1.6}
  .mk-flow{--s5:170vh}
  /* A phone, to try (2026-11-19, the author's asking: "take off all the holding to the screen"): the found wood, the
     fire and the sketches go up with the page (MakingScroll's phoneFlow); only the turning piece and Heavy Light are
     held. */
  /* More room round the first line, and the found wood comes in out of transparency as the page opens. */
  .mk-search{padding:14vh 0 12vh !important}
  /* The first line in the middle, its dots on a line of their own under it (2026-11-19, the author's asking). */
  .mk-search>p{left:0 !important;max-width:none !important;width:100%;text-align:center;white-space:normal !important}
  .mk-search .mk-dots{display:block;margin:1.4em auto 0}
  .mk-c1{height:auto;padding:0 0 8vh}
  .mk-c1 .mk-plate{animation:mk-in 1.6s ease-out .15s both}
  /* The fire's words higher, gone before it fills the screen (MakingScroll). */
  [data-mk="fire-words"]{top:9% !important}
  .mk-pbr{display:inline}
  [data-mk="fire-words"] .mk-wrap>span{white-space:nowrap}
  .mk-bg-veil{display:block}
  .mk-c1>.mk-hold{position:relative;top:auto}
  .mk-fs{height:auto;margin-top:0;padding:4vh 0 8vh}
  .mk-pr{padding:4vh 0 20vh;background:transparent}
  .mk-pr-box{opacity:0;will-change:opacity}
  .mk-fs-stage{position:relative;height:var(--h1)}
  .mk-fire{transform:none}
  /* The sketches come straight in on the dark, as the pictures above (no gradient); Heavy Light's window then goes
     from the dark to white as it comes (making-heavy.tsx). */
  .mk-c3{margin-top:0;height:auto;padding:6vh 0 10vh;background:transparent}
  .mk-stage{position:relative;height:auto;overflow:visible;background:transparent}
  .mk-band{position:relative;top:auto}
  .mk-text{max-width:84vw !important;left:8vw !important}
  /* On a phone the bottom words on the wood stand at the foot of the picture (2026-11-19, the author's asking). */
  .mk-words-low{top:auto !important;bottom:9%}
  .mk-staged{left:8vw !important;max-width:84vw !important}
  /* The last words centred, in the middle of what the menu leaves, "Subscribe for more." two lines lower. */
  .mk-end-in::before{content:"";flex:1}
  .mk-last{padding:0 8vw;text-align:center}
  .mk-last>span{white-space:normal;line-height:2;margin-bottom:.6em}
  .mk-last>span:last-child{margin-top:2.4em}
}
/* ── Editorial (2026-11-21, the author's asking; tried first as a test on 127.0.0.1, then kept): .mk-ed on <main>.
   Two axes for all the words (A, a quarter in, where most stood; B, the scan's), one line-height (2) and a
   half-line between sentences, a measure for the longest lines, chapter marks in Julius over each passage's first
   words, and the opening and closing lines in Julius, larger. Manrope stays 12px. ── */
.mk{--ax-a:${vw(489)};--ax-b:calc(min(85vw, 2000px) * .59 + 5vw)}
.mk .mk-ch{display:none}
.mk.mk-ed .mk-ch{display:block;font-family:${JULIUS};font-size:13px;letter-spacing:${TRACK};line-height:1.4;margin:0 0 2em;opacity:.62;white-space:nowrap}
.mk.mk-ed .mk-pr-ch{position:absolute;z-index:2;left:var(--ax-a);bottom:7%;margin:0;color:#cdc8c0;opacity:.75}
/* The first line set as "We don't follow a fixed formula." is (the author's asking, later that day): Julius 13px,
   tracked, the same tone (#a7a29b at 0.62 on #202020); centred on the page, as the last words are, its dots on a
   line of their own under it; the tracking given back on the left so the letters, not the box, stand centred. */
.mk.mk-ed .mk-title{left:0 !important;max-width:none !important;text-align:center;white-space:normal !important;font-family:${JULIUS};font-size:13px;letter-spacing:${TRACK};line-height:1.4;padding-left:${TRACK};color:#74716c !important}
.mk.mk-ed .mk-title .mk-dots{display:block;margin:1.6em auto 0;font-family:${TEXT_FONT};font-size:${TEXT_SIZE}px;letter-spacing:${TEXT_TRACK}}
/* The last words' first line as a chapter mark (the author's asking: not large), a space under it and over
   "Subscribe for more.", which is white. */
.mk.mk-ed .mk-last>.mk-last-lead{margin-bottom:2em;white-space:normal;padding-left:${TRACK}}
/* The last words centred on the page (the author's asking: with the first line, as on Contact). */
.mk.mk-ed .mk-last{padding-left:0 !important;padding-right:0 !important;text-align:center}
.mk.mk-ed .mk-last>span:last-child{margin-top:2em}
.mk.mk-ed .mk-last a{color:#fff;text-decoration-color:rgba(255,255,255,.45)}
.mk.mk-ed .mk-last a:hover{text-decoration-color:#fff}
.mk.mk-ed .mk-lines,.mk.mk-ed .mk-hg-words,.mk.mk-ed .mk-scan-words,.mk.mk-ed .mk-dr-words,.mk.mk-ed .mk-hl-words,.mk.mk-ed .mk-last{line-height:2 !important}
.mk.mk-ed .mk-lines>.mk-gap{height:1em}
.mk.mk-ed .mk-last>span{margin-bottom:0}
@media (min-width:768px){
  /* "Or anywhere there is a quiet potential." stays where it was: on axis B it stood on the trunk. */
  /* The axis less the scene's own distance from the left: HEAVY_LEAN of the free room (2026-11-22; it was half of it,
     the scene centred, and on a very wide screen the words came over the wooden piece). */
  .mk.mk-ed .mk-hl-words{left:calc(var(--ax-a) - (100vw - 100%) * ${HEAVY_LEAN.toFixed(6)}) !important}
  .mk.mk-ed .mk-scan-words{max-width:32em !important}
  .mk.mk-ed .mk-scan-words>span{white-space:normal}
}
@media (max-width:767px){
  .mk.mk-ed .mk-pr-ch{left:8vw}
  .mk.mk-ed .mk-last{padding-left:8vw !important;padding-right:8vw !important}
}
`

export function MakingPage() {
  const draw = woodDrawing()
  const woodTop = (px: number) => `calc(var(--h1) * ${((px - WOOD.top) / WOOD.h).toFixed(4)})`
  return (
    <main className="mk mk-flow mk-ed w-full">
      {/* `mk-flow`: the page flows, held only for the turning piece and Heavy Light (2026-11-19, the author's asking,
          on a phone first, then on a computer to see). Without it, a computer has the held passages again. */}
      <style>{CSS}</style>
      {/* A phone: the white the page goes into after the scan, behind everything (MakingScroll). */}
      <div className="mk-bg-veil" data-mk="bg-veil" aria-hidden="true" />
      <Navigation bgColor={GROUND} />

      {/* 1. The search */}
      <div className="mk-search" style={{ position: "relative", padding: `${vw(135)} 0 ${vw(150)}`, background: GROUND }}>
        <p data-center-fade className="mk-text mk-title" style={{ position: "relative", left: vw(489), color: INK.search, whiteSpace: "nowrap" }}>
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
                src="/images/making/found-wood-plate.avif?v=2"
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
            <span className="mk-ch">I — Found</span>
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
            style={{ left: vw(1190), top: "77%", color: INK.onWood }}
          >
            Or anywhere there is a quiet potential.
          </p>
        </div>

      </section>

      {/* The fire: its own passage since 2026-11-19, going up the window all the way */}
      <section className="mk-fs" data-mk="fire-sec">
        <div className="mk-fs-stage">
        <div className="mk-fire" data-mk="fire">
          <MakingVideo
            src="/videos/making-burn.mp4?v=2"
            poster="/videos/making-burn-poster.jpg?v=2"
            phone={{ src: "/videos/making-burn-phone.mp4?v=3", poster: "/videos/making-burn-phone-poster.jpg?v=3" }}
          />
          {/* With the fire, as the words on the wood are with it (2026-11-17,
              the author's asking): it comes and goes in opacity alone, while
              the fire goes slowly about the middle (`MakingScroll`). */}
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
            <span className="mk-ch">II — Treat</span>
            {/* Set as the words on the wood are: airy, a blank line between the sentences. */}
            <span className="mk-lines mk-wrap">
              {/* On a phone in four lines, the author's breaks (2026-11-19). */}
              <span>
                Through careful cleaning <br className="mk-pbr" />
                and surface treatment.
              </span>
              <span className="mk-gap" />
              <span>
                The excess is stripped away <br className="mk-pbr" />
                to reveal its raw, organic beauty.
              </span>
            </span>
          </p>
        </div>
        </div>
      </section>

      {/* 2b. The piece on its branch, coming in from the right and turning with the scroll, on the dark; its
          words only while its lamp is out (2026-11-19); the white comes at its end */}
      <MakingHarag
        color={INK.night}
        words={
          <>
            <span className="mk-ch">III — Scan</span>
            <span>Most of the found pieces are 3D scanned.</span>
            <span>Hundreds of photographs are captured</span>
            <span>to digitally reconstruct every detail.</span>
          </>
        }
      />

      {/* 3. The scan: the photograph and its 3D scan, either side of a line */}
      <MakingScan
        color={INK.night}
        words={
          <>
            {/* "Most of the found pieces are 3D scanned." went to the turning piece's words (2026-11-19). */}
            {/* Broken by sense, a line each, as everywhere on the page (2026-11-22, the author's asking): the second
                sentence used to wrap where the width ran out, leaving "physical fit." alone (on a phone "visually,"
                too), set closer than the lines around it. On a phone the first sentence is two lines as well
                (`mk-pc` the computer's, `mk-ph` the phone's, MakingScan). */}
            <span className="mk-pc">Capturing their exact geometry reveals what works visually,</span>
            <span className="mk-ph">Capturing their exact geometry</span>
            <span className="mk-ph">reveals what works visually,</span>
            <span>while allowing new elements to be engineered</span>
            <span>for a precise physical fit.</span>
          </>
        }
      />

      {/* 4. The drawings (2026-11-21, the author's asking; the sketches photograph and Siluet 2 rising out of it
          until then): the first sheet of drawings under the scan, going up with the page and fading as it goes;
          the words come as it fades, and the second sheet with them (MakingScroll). */}
      <section className="mk-c3" data-mk="paper">
        <div className="mk-stage mk-drs" data-mk="stage">
          <div className="mk-dr-1w">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mk-dr mk-dr-1"
              data-mk="drawings-1"
              src="/images/making/drawings-1-2400.avif?v=1"
              srcSet="/images/making/drawings-1-1200.avif?v=1 1200w, /images/making/drawings-1-2400.avif?v=1 2400w"
              sizes="100vw"
              alt="Pencil drawings of hanging pieces and standing figures, white on dark"
              loading="lazy"
              decoding="async"
            />
            <p className="mk-dr-words" data-mk="paper-words" style={{ color: INK.night }}>
              <span className="mk-ch">IV — Drawing</span>
              <span>Another way to search for a form is on a blank sheet of paper.</span>
              <span>Here, an imagined silhouette gradually takes shape.</span>
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="mk-dr mk-dr-2"
            data-mk="drawings-2"
            src="/images/making/drawings-2-2400.avif?v=2"
            srcSet="/images/making/drawings-2-1200.avif?v=2 1200w, /images/making/drawings-2-2400.avif?v=2 2400w"
            sizes="100vw"
            alt="Pencil drawings of sculptures on plinths, white on dark"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      {/* 5. Heavy Light: the wooden piece and its four models turning beside it,
          then the dark and the last words (until 2026-11-19 they came over the
          sketches; the sentence on the models was the end of the words above). */}
      <MakingHeavy
        words={
          <>
            <span className="mk-ch">V — Modeling</span>
            Once drawn, the form is modeled digitally
            <br />
            and brought into the physical world
            <br />
            through 3D printing, CNC milling and hand finishing.
          </>
        }
      />

      {/* 6. The print (2026-11-21, the author's asking: "at the very bottom"): the 3D printer building the
          figure layer by layer, after Heavy Light and before the last words. It goes up with the page, as the
          fire does in the flow: out of transparency as it comes, into the white as the last screen comes up
          (MakingScroll), so the last words never stand over it. */}
      <section className="mk-pr" data-mk="print-sec">
        <div className="mk-pr-box" data-mk="print">
          <MakingVideo
            src="/videos/making-print.mp4?v=2"
            poster="/videos/making-print-poster.jpg?v=2"
            phone={{ src: "/videos/making-print-phone.mp4?v=2", poster: "/videos/making-print-phone-poster.jpg?v=2" }}
            mirror={false}
            label="A white figure growing layer by layer inside a 3D printer"
          />
          <p className="mk-ch mk-pr-ch" aria-hidden="true">VI — Print</p>
        </div>
      </section>

      {/* The last screen: the last words and the bottom menu, together */}
      <div className="mk-end" data-mk="end">
        <div className="mk-end-in" data-mk="end-in">
        <p className="mk-last" data-mk="last" style={{ color: INK.night }}>
          <span className="mk-ch mk-last-lead">We don&apos;t follow a fixed formula.</span>
          <span>Every project brings new questions,</span>
          <span>every process opens new possibilities,</span>
          <span>and every object teaches us something for the next.</span>
          <span>
            <Link href="/contact">Subscribe for more.</Link>
          </span>
        </p>
        <div className="mk-end-fill" />
        <BodyFooter activeLabel="making" />
        </div>
      </div>

      <CenterFade />
      <MakingScroll />
    </main>
  )
}
