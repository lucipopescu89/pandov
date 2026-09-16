/**
 * Presence: the sculpture's outline, set radiating.
 *
 * The Figma export drew a single ellipse around the pendant. It has been taken
 * out of the SVG so the shape lives in one place: this draws copies of it
 * behind the artwork, each one swelling outward and fading as it goes, so the
 * pendant sits at the centre of a standing ripple — the concentric field of the
 * reference composition, made to breathe.
 *
 * The rings are plain CSS transforms, composited on the GPU, so the field costs
 * nothing per frame — this page already asks for real work from the mechanism
 * and particle sections.
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

/** Rings in flight at once. They are evenly spread over one cycle. */
const RINGS = 8
/** Seconds a ring takes to travel from the innermost ring to its reach. */
const CYCLE = 18
/** How far a ring swells before it is gone, as a multiple of the ellipse. */
const REACH = 1.85
/** Brightest a ring gets, just after it leaves the outline it grew from. */
const PEAK = 0.22

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
        <svg
          viewBox={VIEW_BOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          <defs>
            {/* The export faded its ellipse from gold at the top to half that
                at the bottom, kept here. Held in the ellipse's own box so every
                ring fades alike however far out it has travelled. */}
            <linearGradient id="presence-halo" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop stopColor="#C69B5C" />
              <stop offset="1" stopColor="#C69B5C" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          {Array.from({ length: RINGS }, (_, i) => (
            <ellipse
              key={i}
              cx={CX}
              cy={CY}
              rx={RX * SCALE}
              ry={RY * SCALE}
              stroke="url(#presence-halo)"
              strokeWidth="0.5"
              strokeMiterlimit="10"
              style={{
                transformBox: "view-box",
                transformOrigin: `${CX}px ${CY}px`,
                animation: `presence-ripple ${CYCLE}s linear infinite`,
                // Negative, so the field is already spread out on arrival
                // instead of building up ring by ring.
                animationDelay: `${(-i * CYCLE) / RINGS}s`,
                willChange: "transform, opacity",
              }}
            />
          ))}
        </svg>
      </div>

      <div style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: html }} />

      <style>{`
        @keyframes presence-ripple {
          0%   { transform: scale(1); opacity: 0; }
          14%  { opacity: ${PEAK}; }
          100% { transform: scale(${REACH}); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
