import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { Assistant } from "next/font/google"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { CollectionIntro, INTRO_FONT_SIZE } from "@/components/collection-intro"
import { HEART_S, heartKeyframes } from "@/lib/heartbeat"

/**
 * One layout for Mind, Body and Space (2026-10-28, the author's asking): the
 * Body page's composition, after the Figma frame "Body" (node 4269-2), set in
 * real pixels on all three, so its text is the size of the rest of the site
 * rather than shrinking with a 1920-wide canvas as it did until then.
 *
 * From the top: the line of intent (`CollectionIntro`), the filled diamond
 * beating with Mother Nature's heart, the collection's name, its picture.
 * Then, where a page has them, the note on work in progress, the gold rule,
 * and each further piece under an outlined diamond.
 *
 * The spacing is the frame's, which is drawn at 1920, so its units are pixels:
 * the gaps below are its numbers, edge to edge. Text is the Space page's size:
 * the intro and the note `INTRO_FONT_SIZE`, the names the size of Mind's
 * "Chess Set" before (`NAME_FONT_SIZE`).
 */

export type Theme = "dark" | "light"

const COLORS: Record<Theme, { ground: string; intro: string; name: string }> = {
  // Body, on the frame's #202020.
  dark: { ground: "#202020", intro: "#888888", name: "#d9d9d9" },
  // Mind and Space, on white: the intro in a pendant line's colour, the name
  // in Mind's.
  light: { ground: "#ffffff", intro: "#8e8982", name: "#333333" },
}

/** The diamonds and the rule. */
export const GOLD = "#C69B5C"
/** Work in progress is written at this strength, names and note alike. */
export const WIP_OPACITY = 0.3
export const NAME_FONT_SIZE = "clamp(11px, 1.2vw, 15px)"

/** The frame's gaps, px, edge to edge. */
export const SPACE = {
  /** The foot of the top menu's band to the intro. */
  intro: 96,
  /** The intro to the heart. */
  heart: 91,
  /** The heart to the name. */
  name: 26,
  /** The name to the picture. */
  picture: 67,
  /** The last thing on the page to the bottom menu (which keeps 80 of its own above it). */
  end: 426,
}

/**
 * Everything under the first collection stands `AIR` times further apart than
 * the frame has it, the author's asking on 2026-09-26, "so it looks airier".
 */
const AIR = 1.5
export const LIST_SPACE = {
  /** The first picture's metal to the note. */
  note: AIR * 122,
  /** The note to the rule. */
  rule: AIR * 27.1,
  /** The rule to the first mark. */
  mark: AIR * 15.8,
  /** A mark to its name. */
  name: AIR * 26.9,
  /** A name to its piece's metal. */
  piece: AIR * 66.2,
  /** A piece's metal to the next mark. */
  next: AIR * 82.6,
}

const MARK_BIG = { box: 24.8728, d: "M0.707107 12.4364L12.4364 0.707107L24.1657 12.4364L12.4364 24.1657L0.707107 12.4364Z" }
const MARK_FILLED = { box: 17.4142, d: "M0.707107 8.70711L8.70711 0.707107L16.7071 8.70711L8.70711 16.7071L0.707107 8.70711Z" }

/**
 * The filled diamond beats with Mother Nature's heart (`lib/heartbeat.ts`), in
 * size and in light. It swells by `HEART_GROW` at the beat; between beats it
 * sinks to `HEART_DIM`; drawn at `HEART_INK`, that rest is the frame's 0.5.
 */
const HEART_GROW = 0.16
const HEART_DIM = 0.62
const HEART_INK = 0.8

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
  keyframesCss("cp-heart", heartKeyframes({ grow: HEART_GROW, dim: HEART_DIM })),
  `.cp-heart{display:block;overflow:visible;opacity:${HEART_DIM};animation:cp-heart ${HEART_S}s linear infinite}`,
  // Without motion the heart stands at rest, which is the frame.
  `@media (prefers-reduced-motion: reduce){.cp-heart{animation:none}}`,
  // A piece wider than PHONE_PIECE_W is drawn down to it on a phone, margins
  // and all, so it keeps its distance from the screen's edges (see `--fit`).
  `@media (max-width: 767px){.cp-fit{zoom:var(--fit)}}`,
].join("\n")

/**
 * The widest a piece's metal is drawn on a phone, px (2026-10-28, the author's
 * asking: Duality's earrings, 354 wide at their `scale` 1.18, reached the edges
 * of a 375 phone). A computer keeps every piece at its own size.
 */
export const PHONE_PIECE_W = 300

/** The note's face: Assistant, Regular, as the frame has it. */
const assistant = Assistant({ weight: "400", subsets: ["latin"], display: "swap" })
const julius = { fontFamily: "'Julius Sans One', sans-serif" }

export function CollectionPage({
  theme,
  intro,
  activeLabel = null,
  children,
}: {
  theme: Theme
  intro: string[][]
  activeLabel?: string | null
  children?: ReactNode
}) {
  const c = COLORS[theme]
  return (
    <main className="w-full overflow-x-hidden min-h-screen" style={{ backgroundColor: c.ground }}>
      <style>{CSS}</style>
      <Navigation bgColor={c.ground} />
      <div
        className="mx-auto flex w-full flex-col items-center"
        style={{ padding: `${SPACE.intro}px 20px ${SPACE.end}px` }}
      >
        <CollectionIntro paragraphs={intro} color={c.intro} />
        {children}
      </div>
      <BodyFooter activeLabel={activeLabel} />
    </main>
  )
}

/** The beating diamond, with the gap above it. */
export function Heart() {
  return (
    <svg
      className="cp-heart"
      aria-hidden="true"
      viewBox={`0 0 ${MARK_FILLED.box} ${MARK_FILLED.box}`}
      fill="none"
      style={{ marginTop: SPACE.heart, width: MARK_FILLED.box, height: MARK_FILLED.box, flex: "none" }}
    >
      <path d={MARK_FILLED.d} fill={GOLD} stroke={GOLD} strokeOpacity={0.51} opacity={HEART_INK} />
    </svg>
  )
}

/** A piece's mark: the outlined diamond. */
export function Mark({ style }: { style?: CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${MARK_BIG.box} ${MARK_BIG.box}`}
      fill="none"
      style={{ display: "block", overflow: "visible", width: MARK_BIG.box, height: MARK_BIG.box, flex: "none", ...style }}
    >
      <path d={MARK_BIG.d} stroke={GOLD} strokeOpacity={0.51} />
    </svg>
  )
}

/** A collection's or a piece's name, in Julius, a link when it has somewhere to go. */
export function CollectionName({
  theme,
  href,
  wip = false,
  as = "p",
  style,
  children,
}: {
  theme: Theme
  href?: string
  wip?: boolean
  as?: "p" | "h2"
  style?: CSSProperties
  children: ReactNode
}) {
  const Tag = as
  const text = (
    <Tag
      style={{
        ...julius,
        margin: 0,
        fontWeight: 400,
        fontSize: NAME_FONT_SIZE,
        letterSpacing: "0.2em",
        lineHeight: 1.2,
        textAlign: "center",
        whiteSpace: "nowrap",
        color: COLORS[theme].name,
        opacity: wip ? WIP_OPACITY : 1,
      }}
    >
      {children}
    </Tag>
  )
  if (!href) return <div style={style}>{text}</div>
  return (
    <Link href={href} className="block transition-opacity hover:opacity-70" style={{ textDecoration: "none", ...style }}>
      {text}
    </Link>
  )
}

/** The note that what follows is work in progress, and the gold rule under it. */
export function WorkInProgress({ theme, style }: { theme: Theme; style?: CSSProperties }) {
  return (
    <>
      <p
        style={{
          fontFamily: assistant.style.fontFamily,
          fontWeight: 400,
          fontSize: INTRO_FONT_SIZE,
          lineHeight: 1.3,
          textAlign: "center",
          margin: 0,
          color: COLORS[theme].name,
          opacity: WIP_OPACITY,
          ...style,
        }}
      >
        the following are work in progress
        <br />
        but available for order
      </p>
      <div
        aria-hidden="true"
        style={{
          marginTop: LIST_SPACE.rule,
          width: "min(420px, 100%)",
          height: 1,
          backgroundColor: GOLD,
          opacity: 0.4,
          flex: "none",
        }}
      />
    </>
  )
}
