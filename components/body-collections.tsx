import Link from "next/link"
import { Assistant } from "next/font/google"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { BODY_PIECES, type BodyPiece } from "@/lib/body-collections"
import { HEART_S, heartKeyframes } from "@/lib/heartbeat"

/**
 * The Body page, after the author's Figma frame "Body" (node 4269-2, 1920 ×
 * 3249, on #202020), redrawn on 2026-09-26: a line of intent, Second Wind under
 * a filled diamond, then a note that what follows is work in progress but can
 * be ordered, a rule, and every other piece under an outlined diamond of its
 * own, one under the next.
 *
 * The page between the menus is laid out on a design canvas 1920 units wide,
 * as it always was: every length is a Figma number in canvas units, drawn in
 * `cqw` so the composition scales with the page and keeps its proportions. Its
 * height is no longer the frame's. The frame shows three pieces and the author
 * asked for all eighteen (`BODY_PIECES`), so the frame's own top section is
 * placed by its numbers and the pieces after it by the frame's rhythm, one
 * piece at a time; the canvas ends where the last one does. Everything under
 * Second Wind stands further apart than the frame has it (`AIR`), and each
 * mark is the outlined diamond without the frame's two small ones (`MARK_BIG`).
 *
 * The photographs are drawn with no blend. Their ground is made exactly the
 * page's by `scripts/body-thumb.mjs`, so they meet it with no edge, and a
 * blend would only lift their shadows. (The page used `lighten` until then,
 * which needed a #202020 layer inside the canvas to blend against.)
 *
 * A phone sees it cropped rather than shrunk (see `PHONE_WINDOW`).
 */
const CANVAS_W = 1920

/**
 * Where the canvas begins in the frame: the foot of the top menu's band. Every
 * height below is read off the frame and has this taken off it, so the frame's
 * numbers stay as they were measured.
 */
const FRAME_TOP = 243

/**
 * Mobile framing, as on Second Wind (`body-presentation.tsx`): cropped, not
 * shrunk. Fitted whole into a 390px phone, the canvas is drawn at a fifth of
 * its size, the words at 2px and the Second Wind pendant 22px wide, which the
 * author found far too small on 2026-09-25. Everything on the canvas stands in
 * a band down its middle, the widest piece about 300 units, so a phone sees a
 * centred window of `PHONE_WINDOW` units: the band at nearly its full size, and
 * the words at 11.7px, next to the menu's 12. A narrower phone sees the same
 * framing, drawn smaller.
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
const PARAGRAPH_COLOR = "#888888"
/** The diamonds and the rule. */
const GOLD = "#C69B5C"
/** Work in progress is written at this strength of `TITLE_COLOR`, names and note alike. */
const WIP_OPACITY = 0.3

/**
 * The frame's own top section, in its own coordinates: tops of text boxes,
 * centres of marks. The intro is Julius Sans One at 12 on a 13.092 line.
 */
const INTRO_TOP = 338.9
const INTRO_LINE = 13.092
const HEART_Y = 504
const TITLE_TOP = 539
/** Second Wind's photograph: Emperor, as the frame has it, in a 110 × 382 box. */
const EMPEROR = { left: 905, top: 619, w: 110, h: 382 }
/** The foot of Emperor's metal, 20 above its box's: where the list under it starts. */
const EMPEROR_FOOT = 981
const NOTE_TOP = 1103
/** The rule under the note: 420 long, its centre line. */
const RULE_Y = 1161.5
const RULE_W = 420
/** The first piece's mark, Satori's: its centre. */
const FIRST_MARK_Y = 1189.7

/**
 * The frame's rhythm for a piece, measured off its three. From the centre of
 * the mark to the top of the name is the same 39.3 for all three. From the name
 * to the top of the metal is Satori's 79.3; Seeds and Protection sit 6 above
 * and 5 below it. From the foot of the metal to the next mark's centre the
 * frame gives 108 and 82, and 95 is between them.
 */
const MARK_TO_NAME = 39.3
const NAME_TO_PIECE = 79.3
const PIECE_TO_MARK = 95

/**
 * Everything under Second Wind stands `AIR` times further apart than the frame
 * has it, the author's asking on 2026-09-26, "so it looks airier". What grows
 * is the empty space, measured from one thing's edge to the next's: the note,
 * the rule, each mark, name and piece. Nothing is enlarged, and Second Wind's
 * own diamond, name and photograph keep the frame's spacing.
 *
 * The heights that space is measured past: two lines of Assistant at 12, a name
 * in Julius at 12, half an outlined diamond.
 */
const AIR = 1.5
const NOTE_H = 31.4
const LABEL_H = 13.1
const MARK_R = 24.8728 / 2
/** The frame's empty spaces, in the order the list runs. */
const GAP = {
  /** Emperor's foot to the note. */
  note: NOTE_TOP - EMPEROR_FOOT,
  /** The note to the rule. */
  rule: RULE_Y - NOTE_TOP - NOTE_H,
  /** The rule to the first mark. */
  mark: FIRST_MARK_Y - MARK_R - RULE_Y,
  /** A mark to its name. */
  name: MARK_TO_NAME - MARK_R,
  /** A name to its piece. */
  piece: NAME_TO_PIECE - LABEL_H,
  /** A piece to the next mark. */
  next: PIECE_TO_MARK - MARK_R,
}
/** The list's own positions, in the frame's coordinates, once `AIR` is let in. */
const NOTE_AT = EMPEROR_FOOT + AIR * GAP.note
const RULE_AT = NOTE_AT + NOTE_H + AIR * GAP.rule
const FIRST_MARK_AT = RULE_AT + AIR * GAP.mark + MARK_R
/**
 * From the foot of the last piece to the foot of the canvas: the frame's 506 to
 * the footer's mark, less the 80 of its own that `BodyFooter` keeps above it on
 * a computer.
 */
const END_PAD = 426

/**
 * How large a piece is drawn. The photographs frame their pieces at every size,
 * a ring as large as a bracelet in one and a pendant a fifth of the frame in
 * another, so a piece is sized by its metal alone: every piece is given the
 * same area, the square of `PIECE_AREA`, so a narrow pendant stands taller than
 * a round bracelet and neither looks the heavier. Within `PIECE_MAX_H` ×
 * `PIECE_MAX_W`, so the narrowest do not run on. Seeds and Satori come out at
 * the frame's own sizes, within a few units.
 */
const PIECE_AREA = 235
const PIECE_MAX_H = 320
const PIECE_MAX_W = 300

/**
 * The filled diamond over Second Wind beats with Mother Nature's heart
 * (`lib/heartbeat.ts`), in size and in light, as the author asked on
 * 2026-09-26. It swells by `HEART_GROW` at the beat, gently: a diamond 16 units
 * across grows by under 3. Between beats it sinks to `HEART_DIM`, the share of
 * its light Mother Nature's filigree keeps; drawn at `HEART_INK`, that rest is
 * the frame's own 0.5, so the beat is light added to the design, not taken
 * from it.
 */
const HEART_GROW = 0.16
const HEART_DIM = 0.62
const HEART_INK = 0.8

/**
 * A piece's mark is the outlined diamond alone. The frame draws a small diamond
 * either side of it. On 2026-09-26 the author had them drift away, then turned
 * them into drifting dots, and then took them out the same day: eighteen marks,
 * each shedding dots both ways, drew the eye from the pieces. The one thing
 * that moves on the page is the heart over Second Wind.
 */
const MARK_BIG = { box: 24.8728, d: "M0.707107 12.4364L12.4364 0.707107L24.1657 12.4364L12.4364 24.1657L0.707107 12.4364Z" }
const MARK_FILLED = { box: 17.4142, d: "M0.707107 8.70711L8.70711 0.707107L16.7071 8.70711L8.70711 16.7071L0.707107 8.70711Z" }

/**
 * Assistant, the brand's face for text read rather than glanced at, sets the
 * note, Regular as the frame has it (the pendant pages set 300).
 */
const assistant = Assistant({ weight: "400", subsets: ["latin"], display: "swap" })

const julius = { fontFamily: "'Julius Sans One', sans-serif" }

/** A length in canvas units. */
const cq = (n: number) => `${+((n / CANVAS_W) * 100).toFixed(4)}cqw`

/** Web Animations keyframes as a CSS rule. */
function keyframesCss(name: string, frames: Keyframe[]): string {
  const steps = frames.map((f) => {
    const props: string[] = []
    if (f.transform) props.push(`transform:${f.transform}`)
    if (f.opacity !== undefined && f.opacity !== null) props.push(`opacity:${(+f.opacity).toFixed(4)}`)
    return `${+((f.offset ?? 0) * 100).toFixed(3)}%{${props.join(";")}}`
  })
  return `@keyframes ${name}{${steps.join("")}}`
}

const CSS = [
  keyframesCss("bc-heart", heartKeyframes({ grow: HEART_GROW, dim: HEART_DIM })),
  `.bc-heart{position:absolute;overflow:visible;opacity:${HEART_DIM};animation:bc-heart ${HEART_S}s linear infinite}`,
  // Without motion the heart stands at rest, which is the frame.
  `@media (prefers-reduced-motion: reduce){.bc-heart{animation:none}}`,
].join("\n")

type Placed = {
  piece: BodyPiece
  mark: number
  name: number
  /** The photograph's box, in canvas units. */
  left: number
  top: number
  width: number
}

/** The pieces, placed one under the next from the first mark down. */
function place(pieces: BodyPiece[]): { placed: Placed[]; height: number } {
  const placed: Placed[] = []
  let mark = FIRST_MARK_AT - FRAME_TOP
  let foot = mark
  for (const piece of pieces) {
    const inkW = piece.w - 2 * piece.pad
    const inkH = piece.h - 2 * piece.pad
    const aspect = inkW / inkH
    const h = PIECE_AREA / Math.sqrt(aspect)
    const w = PIECE_AREA * Math.sqrt(aspect)
    const fit = Math.min(1, PIECE_MAX_H / h, PIECE_MAX_W / w)
    /** Canvas units per pixel of the file. */
    const k = (h * fit * (piece.scale ?? 1)) / inkH
    const name = mark + MARK_R + AIR * GAP.name
    const inkTop = name + LABEL_H + AIR * GAP.piece
    placed.push({ piece, mark, name, left: CANVAS_W / 2 - (piece.w * k) / 2, top: inkTop - piece.pad * k, width: piece.w * k })
    foot = inkTop + inkH * k
    mark = foot + AIR * GAP.next + MARK_R
  }
  return { placed, height: foot + END_PAD }
}

const { placed: PLACED, height: CANVAS_H } = place(BODY_PIECES)

/** A piece's mark: the outlined diamond, centred on `y`. */
function Mark({ y }: { y: number }) {
  return (
    <svg
      className="absolute"
      aria-hidden="true"
      viewBox={`0 0 ${MARK_BIG.box} ${MARK_BIG.box}`}
      fill="none"
      style={{
        overflow: "visible",
        left: cq(CANVAS_W / 2 - MARK_BIG.box / 2),
        top: cq(y - MARK_BIG.box / 2),
        width: cq(MARK_BIG.box),
        height: cq(MARK_BIG.box),
      }}
    >
      <path d={MARK_BIG.d} stroke={GOLD} strokeOpacity={0.51} />
    </svg>
  )
}

export function BodyCollections() {
  const label = {
    ...julius,
    position: "absolute" as const,
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap" as const,
    fontSize: cq(12),
    lineHeight: "normal",
    color: TITLE_COLOR,
  }

  return (
    <main className="w-full overflow-x-hidden" style={{ backgroundColor: "#202020" }}>
      <style>{CSS}</style>

      {/* Top menu with logo — same component as the rest of the site */}
      <Navigation bgColor="#202020" />

      {/* The window the canvas is seen through. On a phone the canvas is drawn
          wider than the page and centred in it, so the crop takes equally off
          both sides. See `PHONE_WINDOW`. */}
      <div className="mx-auto flex w-full justify-center" style={{ maxWidth: CANVAS_W, overflowX: "clip" }}>
        <div
          className="relative flex-none"
          style={{
            width: `max(100%, min(${(CANVAS_W / PHONE_WINDOW) * 100}%, ${CROP_BASE}px - ${CROP_EASE * 100}vw))`,
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
            containerType: "inline-size",
          }}
        >
          <p
            className="absolute -translate-x-1/2 text-center"
            style={{
              ...julius,
              left: "50%",
              top: cq(INTRO_TOP - FRAME_TOP),
              width: cq(350),
              color: PARAGRAPH_COLOR,
              fontSize: cq(12),
              lineHeight: INTRO_LINE / 12,
              whiteSpace: "pre-line",
            }}
          >
            {"Jewellery worn with intention.\n\nDesigned not only as accessories\nbut also as companions.\n\nThey become part of the person who wears them."}
          </p>

          {/* ── Second Wind, under the diamond that beats ── */}
          <svg
            className="bc-heart"
            aria-hidden="true"
            viewBox={`0 0 ${MARK_FILLED.box} ${MARK_FILLED.box}`}
            fill="none"
            style={{
              left: cq(CANVAS_W / 2 - MARK_FILLED.box / 2),
              top: cq(HEART_Y - FRAME_TOP - MARK_FILLED.box / 2),
              width: cq(MARK_FILLED.box),
              height: cq(MARK_FILLED.box),
            }}
          >
            <path d={MARK_FILLED.d} fill={GOLD} stroke={GOLD} strokeOpacity={0.51} opacity={HEART_INK} />
          </svg>
          <Link href="/body/second-wind" className="transition-opacity hover:opacity-70" style={{ ...label, top: cq(TITLE_TOP - FRAME_TOP) }}>
            Second Wind
          </Link>
          <Link
            href="/body/second-wind"
            aria-label="Second Wind collection"
            className="absolute block transition-opacity hover:opacity-80"
            style={{ left: cq(EMPEROR.left), top: cq(EMPEROR.top - FRAME_TOP), width: cq(EMPEROR.w), height: cq(EMPEROR.h) }}
          >
            {/* The Emperor photograph the Second Wind page already sends, so a
                visitor who has been there has it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/body/emperor-pendant.avif"
              alt="Emperor of Nothingness, a pendant from Second Wind"
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Link>

          {/* ── Work in progress ── */}
          <p
            className="absolute -translate-x-1/2 text-center"
            style={{
              fontFamily: assistant.style.fontFamily,
              fontWeight: 400,
              left: "50%",
              top: cq(NOTE_AT - FRAME_TOP),
              whiteSpace: "nowrap",
              fontSize: cq(12),
              lineHeight: "normal",
              color: TITLE_COLOR,
              opacity: WIP_OPACITY,
            }}
          >
            the following are work in progress
            <br />
            but available for order
          </p>
          <div
            className="absolute"
            aria-hidden="true"
            style={{
              left: cq(CANVAS_W / 2 - RULE_W / 2),
              top: cq(RULE_AT - FRAME_TOP),
              width: cq(RULE_W),
              height: 1,
              marginTop: -0.5,
              backgroundColor: GOLD,
              opacity: 0.4,
            }}
          />

          {PLACED.map(({ piece, mark, name, left, top, width }) => (
            <div key={piece.file}>
              <Mark y={mark} />
              <h2 style={{ ...label, top: cq(name), margin: 0, fontWeight: 400, opacity: WIP_OPACITY }}>{piece.name}</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/body-collections/${piece.file}`}
                alt={`${piece.name}, ${piece.kind}`}
                width={piece.w}
                height={piece.h}
                loading="lazy"
                decoding="async"
                className="absolute"
                style={{ display: "block", left: cq(left), top: cq(top), width: cq(width), height: "auto" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom menu — spacing is the component's own, shared with every page */}
      <BodyFooter />
    </main>
  )
}
