import { readFile } from "node:fs/promises"
import path from "node:path"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { ParticleField, type DripSpec, type RainSpec } from "@/components/particle-field"
import { MechanismField } from "@/components/mechanism-field"
import { PresenceHalo } from "@/components/presence-halo"
import { CaptionFade } from "@/components/caption-fade"
import { splitMechanism, type Motion, type RingSpec, type Vignette } from "@/lib/mechanism"
import { splitReveal, type RevealLayer, type RevealSpec } from "@/lib/reveal"

/**
 * Master design canvas (matches the Figma export / Body.jpg reference).
 * Every section is positioned as a percentage of this canvas so the whole
 * page scales fluidly while preserving the exact Figma layout.
 */
const CANVAS_W = 1920
/** The page's ground, behind every section. */
const GROUND = "#202020"
/**
 * The canvas ends 300px under the foot of the last pendant, Emperor's, which
 * ends at 7311; the export left over 700px there. The bottom menu follows it in
 * the page's own flow rather than being placed on the canvas, so it carries the
 * same spacing as every other page. It used to sit at a percentage of the
 * canvas with the export's 225px tail beneath it — but the menu is drawn in
 * pixels and the tail scales with the page, so the room under it was right at
 * one width only.
 */
const CANVAS_H = 7610

/**
 * Mobile framing.
 *
 * The composition is drawn wide: every section's line work reaches far out
 * past its pendant, and the pendants and captions themselves sit in a narrow
 * band down the middle. Fitting the whole 1920-unit canvas into a phone puts
 * that band at a fifth of its size — 12px captions land at 2px and the
 * sculptures at a thumbnail — so the page is cropped instead of shrunk: a
 * phone sees a centred window onto the canvas, the ornament running off both
 * edges.
 *
 * `PHONE_WINDOW` is how much of the canvas, in its own units, a phone up to
 * `PHONE_W` wide sees; a narrower phone sees the same framing, drawn smaller.
 * It is set by the widest thing the frame has to keep whole: the outstretched
 * hands of the figure over Waterfall, which reach from x 665 to x 1257 on the
 * canvas. 620 units, 650 to 1270, holds them with 8-10px to spare either side
 * on a 390px phone. Every caption on the page lives between x 850 and x 1135,
 * and the pendants are centred on x 960 to within a couple of units.
 */
const PHONE_W = 390
const PHONE_WINDOW = 620
/** The canvas's drawn width on a `PHONE_W` phone, in CSS pixels. */
const PHONE_CANVAS_W = (CANVAS_W * PHONE_W) / PHONE_WINDOW

/**
 * Where the crop has opened out completely. From `PHONE_W` up to here the
 * canvas eases back down to the width of the page, and at this width the two
 * are the same number — so the canvas is simply the page from here on, exactly
 * as it was, and nothing jumps on the way there. There is no breakpoint: the
 * layout is one expression that meets the desktop one.
 */
const CROP_MEETS = 720
/** Pixels of canvas width lost per pixel of page width, over that stretch. */
const CROP_EASE = (PHONE_CANVAS_W - CROP_MEETS) / (CROP_MEETS - PHONE_W)
/** Canvas width over that stretch: `CROP_BASE - CROP_EASE * page width`. */
const CROP_BASE = PHONE_CANVAS_W + CROP_EASE * PHONE_W

/**
 * Widest page the mobile framing applies to. Under it the pendant photos are
 * lifted to `PENDANT_SCALE` — the sculpture is what the page is about, and the
 * crop brings the line work in close around it, so the pendant is given the
 * room to stay the largest thing in the frame.
 */
const PENDANT_MAX_W = 640
const PENDANT_SCALE = 1.2

type Section = {
  /** file name in /public/images/body */
  file: string
  /** native artwork width (px on the master canvas) */
  w: number
  /** left offset on the master canvas (px) */
  left: number
  /** top offset on the master canvas (px) */
  top: number
  label: string
}

/**
 * Positions were measured 1:1 against the Figma export (Body.jpg) so each
 * sculpture + its text land exactly where the designer placed them.
 */
const SECTIONS: Section[] = [
  { file: "icarus.svg", w: 1020, left: 450, top: 175, label: "Icarus" },
  { file: "waterfall.svg", w: 1099, left: 411, top: 1184, label: "Waterfall" },
  // Chaos sits 150px above where the export put it, artwork and pendant
  // together, closing most of the gap left under Waterfall.
  { file: "chaos.svg", w: 1206, left: 357, top: 2045, label: "Chaos" },
  { file: "silence.svg", w: 1302, left: 309, top: 3251, label: "Silence" },
  { file: "mnature.svg", w: 958, left: 481, top: 4440, label: "Mother Nature" },
  // Presence sits 100px above where the export put it, artwork and caption
  // together — the section is placed as one piece, so the halo follows.
  { file: "presence.svg", w: 886, left: 517, top: 5126, label: "Presence" },
  { file: "emperor.svg", w: 916, left: 502, top: 6273, label: "Emperor of Nothingness" },
]

/**
 * Sections whose line work carries travelling particles, and which of their
 * strokes the dots ride. `ParticleField` measures those in the browser and
 * draws the dots on a canvas over the artwork, so nothing needs adding to the
 * SVG here. Chaos hands over every stroked path; Waterfall only its ten
 * sweeping streams, since dots creeping along the sculpture's two-pixel
 * details would read as dirt on the photo. Icarus hands over its plain
 * hairlines, tagged `ic-line` in the file: the long strokes opening out of the
 * bird's centre and the aura loops, not the short strokes about its face —
 * and the unseen tracks of its fall, `ic-fall`, written in from `WRITTEN_TRACKS`.
 * Silence has no line work of its own, only the unseen rays, `si-ray`, written
 * in from the same place.
 */
const PARTICLE_TRACKS: Record<string, string> = {
  "chaos.svg": "path[stroke]",
  "waterfall.svg": ".wf-stream",
  "icarus.svg": ".ic-line, .ic-fall",
  "silence.svg": ".si-ray",
}

/**
 * Sections whose dots all run down the artwork at one shared speed, so the
 * strokes read as one body of falling water. Chaos is left drifting: its dots
 * each take their own pace and run whichever way the stroke was drawn, which
 * is what makes the field churn instead of pour.
 */
const FALLING = new Set(["waterfall.svg"])

/**
 * Sections whose dots all climb the artwork at that same shared speed, each
 * from the bottom of its stroke. Icarus's strokes open out of the bird's centre
 * line, so its dots leave the middle and rise outward.
 */
const RISING = new Set(["icarus.svg"])

/**
 * Sections whose dots all run their tracks the way they were written, at that
 * same shared speed. Silence's rays are written from the pendant's aura ring
 * outward, so its dots leave the ring and run out to both edges of the page.
 */
const OUTWARD = new Set(["silence.svg"])

/**
 * Sections whose dots are spaced along a stroke rather than counted per
 * stroke, in artwork units. Icarus's strokes run a fifth of the length of
 * Waterfall's streams, and 36 dots apiece would crowd them; this is the
 * spacing Waterfall's 36 dots have along its 2483-unit streams. Silence's rays
 * take the same spacing, so its dots read as the ones above carried on out.
 */
const SPACING: Record<string, number> = { "icarus.svg": 69, "silence.svg": 69 }

/**
 * Sections drawn symmetrically about a vertical axis, in artwork units. Each
 * stroke's dots are mirrored onto its reflection, so a pair leaves the centre
 * together, one heading left and one right. Silence's axis is its ring's centre.
 */
const MIRROR: Record<string, number> = { "icarus.svg": 510, "silence.svg": 650 }

/**
 * Icarus's feathers — the rhythmed hatching of its four wings, tagged
 * `ic-feather` in the file — sit all but dark, and a band of light climbs them
 * from under the lowest feather at the dots' pace, bringing each row up to the
 * export's full light as it passes and letting it sink back behind. One band
 * is on the wings at a time: the next arrives from below as the last clears
 * the top, about every 28 seconds at rest.
 */
const ICARUS_REVEAL: RevealSpec = {
  className: "ic-feather",
  period: 1100,
  head: 90,
  tail: 380,
  floor: 0.12,
  start: 1030,
}

/** Sections whose strokes are lit by a climbing band. See `splitReveal`. */
const REVEAL: Record<string, RevealSpec> = { "icarus.svg": ICARUS_REVEAL }

/**
 * Icarus falling. Nothing in the export is drawn here: these are unseen tracks
 * for dots to climb past the pendant, so against the still sculpture the air
 * reads as rushing up and the pendant as dropping through it. Artwork units,
 * each written bottom to top.
 *
 * Seven loose streaks over the pendant, at scattered heights and lengths so
 * they never line up into a pattern; the two longest carry on up through the
 * "sick and tired" lines and fade out above them. Then one U hugging the
 * pendant a little way off its outline: the rising field cuts it at its lowest
 * point, so the dots there leave from under the tip and part up both sides.
 */
const ICARUS_FALL = [
  "M428 300 C 426 210, 423 110, 424 18",
  "M620 230 C 619 160, 616 80, 617 12",
  "M458 425 C 459 370, 461 320, 463 268",
  "M486 476 C 480 470, 480 440, 481 392",
  "M550 488 C 553 420, 554 350, 555 292",
  "M583 350 C 582 310, 584 270, 583 236",
  "M648 476 C 646 420, 645 370, 644 318",
  "M418 340 C 418 460, 420 560, 440 640 C 455 700, 480 720, 510 722 " +
    "C 540 720, 565 700, 580 640 C 600 560, 602 460, 602 340",
]

/**
 * Silence's rays, out to both edges of the page. Nothing in the export is drawn
 * here either: two unseen tracks leaving the middle of the pendant's aura ring
 * straight out left and right. The ring's centre, (650, 532), was measured off
 * the pendant photo. The left ray ends at the page's left edge, 309 units out
 * past the artwork, and the right one at its reflection, so a dot has faded out
 * just as it gets there. Artwork units, each written from the ring outward.
 */
const SILENCE_RAYS = ["M650 532 L-309 532", "M650 532 L1609 532"]

/** Unseen tracks written into a section for its dots to ride. */
const WRITTEN_TRACKS: Record<string, { className: string; paths: string[] }> = {
  "icarus.svg": { className: "ic-fall", paths: ICARUS_FALL },
  "silence.svg": { className: "si-ray", paths: SILENCE_RAYS },
}

/**
 * Sections laid across the full width of the page rather than their own box, so
 * the canvas their dots are drawn on reaches both edges. See `toFullWidth`.
 */
const FULL_WIDTH = new Set(["silence.svg"])

/**
 * Waterfall's rain: the twelve drops the export drew standing still below the
 * sculpture, in two staggered groups of six columns. They now fall from just
 * under the "in a waterfall" caption to 1150, clear of the Chaos line work
 * that starts at 1192 in this band and faded out well before it. Riding the
 * section's canvas with the dots costs nothing per frame; as twelve
 * CSS-animated SVG nodes they had the artwork repainting around each one.
 */
const WATERFALL_RAIN: RainSpec = {
  from: 390,
  to: 1150,
  columns: [
    { x: 426.5, len: 2.2 },
    { x: 482.6, len: 0.9 },
    { x: 503, len: 7.6 },
    { x: 599.9, len: 18.9 },
    { x: 600, len: 1.9 },
    { x: 675.8, len: 3 },
  ],
}

/** Sections whose canvas also carries falling drops. */
const RAIN: Record<string, RainSpec> = { "waterfall.svg": WATERFALL_RAIN }

/**
 * Water running off the figure over Waterfall: the fingertips of each
 * outstretched hand, the tip of each sleeve, and the end of the long fold of
 * the coat hanging under it. Each point is the lowest of that stroke, measured
 * from waterfall.svg — where water on it would gather. The figure is nearly
 * but not quite mirrored, so the two sides were measured apart. The hands and
 * sleeves drop past the tops of the streams; the folds hang lower and fall less.
 */
const WATERFALL_DRIPS: DripSpec = [
  // Fingertips.
  { x: 265.1, y: 402.8, to: 760 },
  { x: 836.5, y: 402.2, to: 760 },
  // Sleeve tips.
  { x: 327.2, y: 432.2, to: 800 },
  { x: 772.8, y: 431.8, to: 800 },
  // Hanging folds of the coat.
  { x: 356.5, y: 489.6, to: 730 },
  { x: 750.4, y: 497.5, to: 730 },
]

/** Sections whose canvas also carries water running off the artwork. */
const DRIPS: Record<string, DripSpec> = { "waterfall.svg": WATERFALL_DRIPS }

/**
 * Sections whose outline is set radiating: copies of it swell outward behind
 * the artwork. See `PresenceHalo`.
 */
const HALO_FILES = new Set(["presence.svg"])

/**
 * Sections whose pendant levitates: the photo is lifted onto a layer of its own
 * and rises and sinks on the spot while its caption holds still. See
 * `splitFloat`.
 */
const FLOATING = new Set(["emperor.svg"])

/**
 * Pendants whose photograph opens a page of their own. Icarus is the first,
 * opening onto its model in three dimensions as a trial of the idea.
 */
const PENDANT_PAGES: Record<string, string> = { "icarus.svg": "/body/second-wind/icarus" }

/**
 * How far the pendant rises above its place and sinks below it, in canvas
 * units — a breath, not a bounce, on a photo 486 tall. Given to CSS in `cqw`, so
 * it scales with the canvas like everything else on it.
 */
const FLOAT_REACH = 9
/** Seconds for one breath, up and back down. */
const FLOAT_CYCLE = 7

/**
 * Mother Nature's mandala, read as a mechanism: each ring is lifted onto its
 * own layer and turns independently. Radius bands are in the artwork's units,
 * measured from mnature.svg.
 *
 * Neighbouring rings counter-rotate like meshed gears, and each chevron row
 * turns the way its arrows point — outer row clockwise, inner row counter.
 * Spin is degrees per second, positive clockwise.
 */
/**
 * How far the outer dots travel into the void, in the artwork's units — about
 * their own radius again, which carries them well past the mandala's edge.
 */
const VOID_REACH = 380

/**
 * How individually the outer dots move, 0 → 1. Each sets off up to this share
 * of a cycle behind its ring and some travel less far, so a ring breaks up
 * into single dots as it goes. At 1 the rings dissolve into a steady drift.
 */
const VOID_SCATTER = 0.5

/**
 * Radii of the six ovals along every spoke, inner to outer, and of the
 * triangles beyond them, measured from mnature.svg.
 */
const OVAL_RADII = [95, 106, 118, 131, 146, 162]
const TRIANGLE_RADIUS = 207

/**
 * The heartbeat ripples out from the centre rather than landing everywhere at
 * once: a ring beats this share of a beat later for every unit of radius it
 * sits beyond the innermost ovals. Along a spoke the ovals swell one after
 * another, about a tenth of a second apart, and the triangles follow.
 */
const RIPPLE = 0.0035

const rippleLag = (radius: number) => (radius - OVAL_RADII[0]) * RIPPLE

/**
 * How much the ovals swell at the peak of a beat: every row swings well out,
 * the outermost reaching toward the triangles. The rows sit end to end along a
 * spoke, so as the ripple passes each one briefly runs into the next.
 */
const OVAL_GROW = 0.05

/**
 * The beat carries light as well as movement: every ring is lifted toward
 * solid and then held at a share of that brightness between beats, so the
 * ripple crossing the mandala is a band of light widening out of its centre.
 * Only the outermost dots are left out — they have a pulse of their own, out
 * into the void.
 *
 * Two liftings, because the file dims the mandala in two different ways.
 *
 * The filigree — the ovals, the triangles and the spokes — is drawn in
 * hairline strokes whose glow fades to 0.4 at the edge of every stroke.
 * Flooring that leaves a stroke all but solid at the peak; a line this thin
 * has no more room than that, so the filigree holds most of its light between
 * beats and swings what is left.
 */
const FILIGREE = { floor: 0.9, rest: 0.62 }

/**
 * The outer bands — the zigzag, the rhombus and the two rows of arrows — sit
 * at a quarter group opacity over a glow that is barely a tenth there where
 * they are drawn, which is why they all but vanish against the page. Lifting
 * the group and flooring the glow gives them room to come up to the filigree
 * at the peak of a beat and sink back to about where the file left them.
 */
const BAND = { floor: 0.5, brighten: 2.6, rest: 0.4 }

/**
 * One circular gradient over the whole mechanism, on top of everything above:
 * the mandala carries its full light through the band where its pattern is
 * densest — the spokes out to the arrows — and falls away toward the centre and
 * past the rim, so the rings read as one thing gathered around the sculpture
 * rather than as a diagram drawn to the edge of the page.
 *
 * It stops short of taking anything away: `floor` is what is left where the
 * gradient is at its thinnest, so the innermost ovals and the outermost arrows
 * are shaped by it, never put out. `edge` sits past the arrows, where the dots
 * begin — they keep their own light, and the seam falls between two patterns
 * that already read differently.
 *
 * Dropping this from `VIGNETTES` puts the mandala back exactly as it was.
 */
const MNATURE_VIGNETTE: Vignette = { peak: 295, edge: 430, floor: 0.25 }

/** Sections whose mechanism is gathered by a circular gradient. */
const VIGNETTES: Record<string, Vignette> = { "mnature.svg": MNATURE_VIGNETTE }

type Lift = { floor: number; rest: number; brighten?: number }

/**
 * A ring that beats: lifted out of the file's dimming, dimmed again between
 * beats, and running as far behind the centre as the ripple takes to reach the
 * middle of its band. Everything that beats quickens alike with scrolling, so
 * the ripple keeps its shape however fast the page is moving.
 */
function beating(
  key: string,
  from: number,
  to: number,
  spin: number,
  lift: Lift,
  motion?: Partial<Motion>,
): RingSpec {
  return {
    key,
    from,
    to,
    gradientFloor: lift.floor,
    brighten: lift.brighten,
    vignette: true,
    motion: {
      spin,
      pulse: "heart",
      dim: lift.rest,
      lag: rippleLag((from + to) / 2),
      scrollPulse: true,
      ...motion,
    },
  }
}

const MNATURE_RINGS: RingSpec[] = [
  // The heart rings share one beat, rippling outward through them. Every row
  // of ovals is a ring of its own, banded halfway to its neighbours; the rows
  // share a start, so they turn as one. Each row lags by its own radius rather
  // than by the middle of its band, so the light climbs the spoke oval by oval.
  // At its peak the outermost row stops a few units short of the triangles.
  ...OVAL_RADII.map((radius, i): RingSpec => {
    const outermost = i === OVAL_RADII.length - 1
    return beating(
      `ovals-${i + 1}`,
      i === 0 ? 0 : (OVAL_RADII[i - 1] + radius) / 2,
      outermost ? 185 : (radius + OVAL_RADII[i + 1]) / 2,
      1.2,
      FILIGREE,
      { grow: OVAL_GROW, lag: rippleLag(radius) },
    )
  }),
  beating("triangles", 185, 225, -1.6, FILIGREE, { grow: 0.02, lag: rippleLag(TRIANGLE_RADIUS) }),
  beating("lines", 225, 265, -2.2, FILIGREE),
  beating("zigzag", 265, 300, -1.8, BAND, { scrollSpin: true }),
  beating("rhombus", 300, 320, 1.5, BAND),
  beating("arrows-in", 320, 338, -2.4, BAND),
  beating("arrows-out", 338, 356, 2.4, BAND),
  // The dots pulse out into the void. Each brightens where it sits, then
  // travels straight out on its own, fading in step with the distance until it
  // is gone. The rings take turns, each a third of a cycle behind the one
  // inside it, and VOID_SCATTER loosens every dot from its ring. The file fades
  // these rings almost to nothing where they sit — a quarter group opacity over
  // a glow that is ~18% there — so they are lifted to stay visible, though a
  // tenth short of triple so they set off softly.
  { key: "dots-in", from: 356, to: 375, brighten: 2.7, gradientFloor: 0.45, motion: { spin: -0.6, pulse: "wave", reach: VOID_REACH, scatter: VOID_SCATTER, lag: 0 } },
  { key: "dots-mid", from: 375, to: 395, brighten: 2.7, gradientFloor: 0.45, motion: { spin: -0.6, pulse: "wave", reach: VOID_REACH, scatter: VOID_SCATTER, lag: 1 / 3 } },
  { key: "dots-out", from: 395, to: Infinity, brighten: 2.7, gradientFloor: 0.45, motion: { spin: -0.6, pulse: "wave", reach: VOID_REACH, scatter: VOID_SCATTER, lag: 2 / 3 } },
]

/** Sections split into independently animated rings. */
const MECHANISMS: Record<string, RingSpec[]> = { "mnature.svg": MNATURE_RINGS }

async function loadSvg(file: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "images", "body", file)
  let svg = await readFile(filePath, "utf8")
  // Make each inline SVG scale to its wrapper: strip the root fixed
  // width/height, keep the viewBox so it stays perfectly vectorial.
  svg = svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1")
  svg = svg.replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1")
  svg = svg.replace(/<svg /, '<svg style="display:block;width:100%;height:auto" ')
  // The pendant photo is the one rect filled from an image pattern. Tagged so
  // the mobile framing can lift it; see `PENDANT_SCALE`.
  svg = svg.replace(/<rect\b([^>]*?)fill="url\(#pattern/, '<rect class="bp-pendant"$1fill="url(#pattern')
  return svg
}

/**
 * Writes unseen strokes into an artwork. The root is `fill="none"` and these
 * carry no stroke, so they paint nothing; they are there to be measured.
 */
function withTracks(svg: string, { className, paths }: { className: string; paths: string[] }) {
  const tags = paths.map((d) => `<path class="${className}" d="${d}"/>`).join("\n")
  return svg.replace("</svg>", `${tags}\n</svg>`)
}

/**
 * Opens an artwork's viewBox out to the full width of the canvas, in its own
 * units, so laid across the whole page everything in it lands where it was.
 */
function toFullWidth(svg: string, section: Section) {
  return svg.replace(/(<svg\b[^>]*\sviewBox=")([^"]+)"/, (_, open: string, box: string) => {
    const [x, y, w, h] = box.split(/[\s,]+/).map(Number)
    const unit = w / section.w
    return `${open}${x - section.left * unit} ${y} ${CANVAS_W * unit} ${h}"`
  })
}

/**
 * Splits an artwork into its pendant photo and its captions, one SVG each in
 * the same viewBox, so the photo can move on a composited layer without the
 * captions or the page being painted again. Only for an artwork drawn as
 * nothing but a photo and its captions, as Emperor's is: the photo keeps the
 * defs, where its image lives, and the captions need none.
 */
function splitFloat(svg: string) {
  return {
    pendant: svg.replace(/<text\b[\s\S]*?<\/text>/g, ""),
    captions: svg.replace(/<defs>[\s\S]*<\/defs>/, "").replace(/<rect class="bp-pendant"[^>]*\/>/, ""),
  }
}

/**
 * Where an artwork's pendant photograph lands on the canvas, as percentages of
 * it, read off the export's own pattern rect — so a fresh export carries the
 * link over the picture with it. `left` and `width` are the artwork's place on
 * the canvas in canvas units, which with the viewBox gives the artwork's scale.
 */
function pendantBox(svg: string, left: number, width: number) {
  const box = svg.match(/<svg\b[^>]*\sviewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number)
  const rect = svg.match(/<rect class="bp-pendant"([^>]*)>/)?.[1]
  if (!box || !rect) return null
  const read = (name: string) => Number(rect.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1])
  const unit = box[2] / width
  const [x, y, w, h] = [read("x"), read("y"), read("width"), read("height")]
  if (![x, y, w, h].every(Number.isFinite)) return null
  return {
    left: `${((left + (x - box[0]) / unit) / CANVAS_W) * 100}%`,
    width: `${(w / unit / CANVAS_W) * 100}%`,
    // `top` joins the section's own offset, which the caller knows.
    y: (y - box[1]) / unit,
    height: `${(h / unit / CANVAS_H) * 100}%`,
  }
}

export async function BodyPresentation() {
  const svgs = await Promise.all(
    SECTIONS.map(async (s) => {
      const svg = await loadSvg(s.file)
      return FULL_WIDTH.has(s.file) ? toFullWidth(svg, s) : svg
    }),
  )

  return (
    <main
      className="w-full overflow-x-hidden text-foreground"
      style={{ backgroundColor: GROUND }}
    >
      {/* Top menu with logo — same as the other pages, on this page's ground */}
      <Navigation bgColor={GROUND} />

      {/* The window the canvas is seen through. On a phone the canvas is drawn
          wider than the page and centred in it, so the crop takes equally off
          both sides. See `PHONE_WINDOW`. */}
      <div
        className="mx-auto flex w-full justify-center"
        style={{ maxWidth: CANVAS_W, overflowX: "clip" }}
      >
      <CaptionFade
        className="relative flex-none"
        style={{
          width: `max(100%, min(${(CANVAS_W / PHONE_WINDOW) * 100}%, ${CROP_BASE}px - ${CROP_EASE * 100}vw))`,
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          containerType: "inline-size",
        }}
      >
        {SECTIONS.map((section, i) => {
          const wide = FULL_WIDTH.has(section.file)
          const placement = {
            left: wide ? "0%" : `${(section.left / CANVAS_W) * 100}%`,
            top: `${(section.top / CANVAS_H) * 100}%`,
            width: wide ? "100%" : `${(section.w / CANVAS_W) * 100}%`,
          }
          const rings = MECHANISMS[section.file]
          if (rings) {
            return (
              <MechanismField
                key={section.file}
                label={section.label}
                className="absolute"
                style={placement}
                {...splitMechanism(svgs[i], rings, VIGNETTES[section.file])}
              />
            )
          }
          if (FLOATING.has(section.file)) {
            const { pendant, captions } = splitFloat(svgs[i])
            return (
              <div key={section.file} aria-label={section.label} className="absolute" style={placement}>
                <div className="bp-float" dangerouslySetInnerHTML={{ __html: pendant }} />
                <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: captions }} />
              </div>
            )
          }
          if (HALO_FILES.has(section.file)) {
            return (
              <PresenceHalo
                key={section.file}
                label={section.label}
                className="absolute"
                style={placement}
                html={svgs[i]}
              />
            )
          }
          // Sections with particles draw them on a canvas in a client wrapper.
          const tracks = PARTICLE_TRACKS[section.file]
          const reveal = REVEAL[section.file]
          const written = WRITTEN_TRACKS[section.file]
          let html = svgs[i]
          let revealed: RevealLayer | undefined
          if (written) html = withTracks(html, written)
          if (reveal) ({ html, layer: revealed } = splitReveal(html, reveal))
          return tracks ? (
            <ParticleField
              key={section.file}
              label={section.label}
              className="absolute"
              style={placement}
              html={html}
              tracks={tracks}
              flow={
                FALLING.has(section.file)
                  ? "fall"
                  : RISING.has(section.file)
                    ? "rise"
                    : OUTWARD.has(section.file)
                      ? "along"
                      : "drift"
              }
              rain={RAIN[section.file]}
              drips={DRIPS[section.file]}
              spacing={SPACING[section.file]}
              mirror={MIRROR[section.file]}
              reveal={revealed}
            />
          ) : (
            <div
              key={section.file}
              aria-label={section.label}
              className="absolute"
              style={placement}
              dangerouslySetInnerHTML={{ __html: svgs[i] }}
            />
          )
        })}

        {/* Links over the photographs that open a page of their own, laid on
            top of every section so neither particles nor line work take the
            click. Scaled with the photograph under the phone framing. */}
        {SECTIONS.map((section, i) => {
          const href = PENDANT_PAGES[section.file]
          if (!href) return null
          const wide = FULL_WIDTH.has(section.file)
          const box = pendantBox(svgs[i], wide ? 0 : section.left, wide ? CANVAS_W : section.w)
          if (!box) return null
          return (
            <Link
              key={`${section.file}-page`}
              href={href}
              aria-label={`${section.label}, in three dimensions`}
              className="bp-pendant-link absolute block"
              style={{
                left: box.left,
                top: `${((section.top + box.y) / CANVAS_H) * 100}%`,
                width: box.width,
                height: box.height,
              }}
            />
          )
        })}

      </CaptionFade>
      </div>

      {/* Bottom menu — in the page's flow under the canvas, so it is spaced and
          centred on the page exactly as it is everywhere else, and is not
          carried by the phone's crop. */}
      <BodyFooter />

      <style>{`
        /* Starts a quarter of the way in, so it leaves its place rising. */
        .bp-float {
          animation: bp-float ${FLOAT_CYCLE}s ease-in-out ${-FLOAT_CYCLE / 4}s infinite;
          will-change: transform;
        }
        @keyframes bp-float {
          0%, 100% { transform: translateY(${(FLOAT_REACH / CANVAS_W) * 100}cqw); }
          50% { transform: translateY(${(-FLOAT_REACH / CANVAS_W) * 100}cqw); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bp-float { animation: none; }
        }
        @media (max-width: ${PENDANT_MAX_W}px) {
          .bp-pendant {
            transform-box: fill-box;
            transform-origin: center;
            transform: scale(${PENDANT_SCALE});
          }
          .bp-pendant-link { transform: scale(${PENDANT_SCALE}); }
        }
      `}</style>
    </main>
  )
}
