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
 * The field: eleven rings, the last reaching 2.17 times the ellipse. It was
 * eight reaching 1.85 until 2026-09-23, when the author asked for three more on
 * the outside. The reach grew with the count, 0.85 × 11/8, so the rings keep
 * the spacing they had and the three are simply added beyond the eighth.
 */
const RINGS = 11
const REACH = 2.17

/**
 * Brightest a ring gets. The shared default, 0.22, left the field barely there
 * on the dark ground; the author asked for it to be more visible (2026-09-23).
 */
const PEAK = 0.45

/**
 * Room around the section for the rings to grow into. The overlay keeps the
 * artwork's aspect so its viewBox stays in the artwork's own units — a ring at
 * full reach spans ±428 x ±623 around the centre, and reaches down to 1607;
 * 0.25 of the artwork's height below it is 1610.
 */
const SPREAD_X = 0.5
const SPREAD_Y = 0.25

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
          rings={RINGS}
          reach={REACH}
          peak={PEAK}
        />
      </div>

      <div style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
