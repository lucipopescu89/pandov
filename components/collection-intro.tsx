import type { CSSProperties } from "react"
import { Assistant } from "next/font/google"

/**
 * The line of intent at the head of Mind, Body and Space (2026-10-28, the
 * author's asking): centred, in Assistant Light, the face the pendant pages
 * give a piece's own line (`.pp-line` in `pendant-page.tsx`), not Julius.
 *
 * Each paragraph is a list of lines, broken where the author's text breaks.
 * The first is the statement, standing a short pause above the rest.
 */
const assistant = Assistant({ weight: "300", subsets: ["latin"], display: "swap" })

/** The same size on all three pages: 13 on a 1920 screen, never under 12.5px. */
export const INTRO_FONT_SIZE = "max(12.5px, 0.677vw)"
export const INTRO_LINE_HEIGHT = 1.5
/** The pause between paragraphs, in lines. */
export const INTRO_PAUSE = 0.75

export function CollectionIntro({
  paragraphs,
  color,
  fontSize = INTRO_FONT_SIZE,
  className,
  style,
}: {
  paragraphs: string[][]
  color: string
  fontSize?: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={className}
      style={{
        fontFamily: assistant.style.fontFamily,
        fontWeight: 300,
        fontSize,
        lineHeight: INTRO_LINE_HEIGHT,
        letterSpacing: "0.025em",
        textAlign: "center",
        color,
        ...style,
      }}
    >
      {paragraphs.map((lines, i) => (
        <p key={i} style={{ margin: 0, marginTop: i ? `${INTRO_PAUSE}em` : 0 }}>
          {lines.map((line, j) => (
            <span key={j} style={{ display: "block" }}>
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

export const MIND_INTRO = [
  ["Objects that invite curiosity."],
  ["Not every object needs to solve a problem.", "Some exist to slow us down.", "To ask questions.", "To reward attention."],
]

export const BODY_INTRO = [
  ["Jewellery worn with intention."],
  ["Designed not just as accessories,", "but as companions."],
  ["They become part of the person who wears them."],
]

export const SPACE_INTRO = [
  ["Objects that shape atmosphere."],
  ["Exploring the relationship between function and sculpture,", "these works become quiet presences", "within everyday spaces."],
]

/** The page's description for search and sharing, from its intro. */
export const introText = (paragraphs: string[][]) => paragraphs.flat().join(" ")
