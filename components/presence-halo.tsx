import { RadiantRings } from "@/components/radiant-rings"

/**
 * Presence: the sculpture's outline, set radiating.
 *
 * The Figma export drew a single ellipse around the pendant. It has been taken
 * out of the SVG so the shape lives in one place: this places `RadiantRings`
 * behind the artwork, where copies of that ellipse swell outward and fade as
 * they go, so the pendant sits at the centre of a standing ripple — the
 * concentric field of the reference composition, made to breathe.
 *
 * What is left here is the measurement: where the ellipse sits in the
 * artwork's own units, and how much room the section has to give the rings.
 * The motion is `RadiantRings`, shared with the homepage hero.
 */

/** presence.svg's own viewBox. */
const ART_W = 886
const ART_H = 1288

/**
 * The artwork's ellipse, measured from presence.svg, set lower in the section.
 *
 * The export drew its ellipse around (442.5, 485.5). The field no longer
 * follows the pendant's group: it holds its place here, and presence.svg sets
 * the caption and the pendant photo inside it, the pair centred in the
 * innermost ring so neither touches the rings as they leave it.
 */
const CX = 442.5
const CY = 983.5
const RX = 263.5
const RY = 383.5

/**
 * Rings are drawn at this fraction of the export's ellipse, drawn in so the
 * innermost one sits close around the pendant rather than well clear of it.
 */
const SCALE = 0.748

/**
 * Room around the section for the rings to grow into. The overlay keeps the
 * artwork's aspect so its viewBox stays in the artwork's own units — a ring at
 * full reach spans ±365 x ±531 around the centre, well inside this.
 */
const SPREAD_X = 0.5
const SPREAD_Y = 0.2

const VIEW_BOX = [
  -SPREAD_X * ART_W,
  -SPREAD_Y * ART_H,
  ART_W * (1 + 2 * SPREAD_X),
  ART_H * (1 + 2 * SPREAD_Y),
].join(" ")

type Props = {
  label: string
  html: string
  className?: string
  style?: React.CSSProperties
}

export function PresenceHalo({ label, html, className, style }: Props) {
  return (
    <div className={className} style={style} aria-label={label}>
      {/* The rings sit behind the artwork, so the pendant keeps the field's
          centre and the innermost ring reads as its outline. */}
      <div
        style={{
          position: "absolute",
          top: `${-SPREAD_Y * 100}%`,
          bottom: `${-SPREAD_Y * 100}%`,
          left: `${-SPREAD_X * 100}%`,
          right: `${-SPREAD_X * 100}%`,
          pointerEvents: "none",
        }}
      >
        <RadiantRings
          cx={CX}
          cy={CY}
          rx={RX * SCALE}
          ry={RY * SCALE}
          viewBox={VIEW_BOX}
        />
      </div>

      <div style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
