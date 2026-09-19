/**
 * A radiating field: copies of one ellipse swelling outward from a centre and
 * fading as they go, so whatever stands at that centre stands in a standing
 * ripple.
 *
 * The shape was measured off the Figma export of Presence, which drew a single
 * ellipse around the pendant. The motion was written for `PresenceHalo` and
 * lifted out here when the homepage hero asked for the same field around the
 * same sculpture. The geometry stays with the caller — each one measures its
 * own ellipse, in its own units — but the motion belongs here, so the two
 * fields can't drift into being two different ornaments.
 *
 * Brightness stays out of the keyframes — they run the ring at full strength
 * and how bright that is comes from an opacity on the group. The travel can't
 * be kept out, so the keyframes are named after the curve they carry: two
 * fields on the same page that travel alike share one block, and two that
 * don't get one each instead of silently standing in for one another.
 *
 * The rings are plain CSS transforms on eight hairline strokes, composited on
 * the GPU, so the field costs nothing per frame. Both of its callers are
 * already asking for real work elsewhere on the page — a mechanism and a
 * particle canvas on one, twenty door frames redrawn per scroll event on the
 * other.
 */

/** Seconds a ring takes to travel from the outline to its reach. */
const CYCLE = 18
/** How far a ring swells before it is gone, as a multiple of the ellipse. */
const DEFAULT_REACH = 1.85

/** The export's gold. */
const GOLD = "#C69B5C"

/**
 * Stops the travel is written out over. The curve below is smooth, so the
 * straight lines between twenty of them are not a curve anyone can see.
 */
const STEPS = 20

/**
 * The ring's travel, written out as keyframes rather than handed to a CSS
 * timing function, so the shape of it is a number in this file and not a
 * bezier nobody can read back.
 *
 * Scale follows `f ** growth` across the cycle. At 1 the ring travels at a
 * constant speed and the field sits evenly spaced; above 1 it accelerates, and
 * since the gap between two rings is only the distance one of them covers in
 * the time between them, an accelerating ring opens the field out as it goes —
 * tight around the outline, wide by the time it leaves.
 *
 * Opacity is left at three stops, so it goes on fading evenly however the
 * travel is paced: a property interpolates between the keyframes that name it
 * and ignores the ones that don't.
 */
function rippleKeyframes(name: string, reach: number, growth: number): string {
  const fade: Record<number, number> = { 0: 0, 14: 1, 100: 0 }
  const grid = Array.from({ length: STEPS + 1 }, (_, i) => (i * 100) / STEPS)
  const stops = [...new Set([...grid, ...Object.keys(fade).map(Number)])].sort((a, b) => a - b)
  const body = stops
    .map((p) => {
      const scale = +(1 + (reach - 1) * Math.pow(p / 100, growth)).toFixed(4)
      const o = fade[p] === undefined ? "" : ` opacity: ${fade[p]};`
      return `          ${p}% { transform: scale(${scale});${o} }`
    })
    .join("\n")
  return `@keyframes ${name} {\n${body}\n        }`
}

type Props = {
  /** The ellipse the rings grow from, in the units of `viewBox`. */
  cx: number
  cy: number
  rx: number
  ry: number
  /** The box those units are read in — give the last ring room to finish. */
  viewBox: string
  /**
   * The hairline, in those same units. A ring's stroke is scaled along with
   * the ring, so this is the weight of the innermost one; the outermost draws
   * at `RADIANT_REACH` times it. The default is what the export carried.
   */
  strokeWidth?: number
  /**
   * Rings in flight at once, evenly spread over one cycle — so this is the
   * density of the field, not its speed. More of them means less room between
   * one ring and the next, the cycle being what it is.
   */
  rings?: number
  /**
   * Brightest a ring gets, just after it leaves the outline it grew from.
   * Carried as an opacity on the whole group rather than in the keyframes,
   * which is what lets two fields on one page differ. The rings never cross,
   * so flattening them together costs nothing.
   */
  peak?: number
  /**
   * How far a ring swells before it is gone, as a multiple of the ellipse.
   * Whoever raises it owns the box the field finishes in: the last ring lands
   * exactly `reach` times the ellipse out from the centre. Defaults to 1.85,
   * the distance the export's own field travels.
   */
  reach?: number
  /**
   * The pacing of that travel. 1 is a constant speed and an evenly spaced
   * field; above 1 the ring accelerates and the gaps open outward. Smooth
   * either way — it is a power curve, not a step.
   */
  growth?: number
  /**
   * Held still while the field is out of sight. A ripple nobody can see still
   * costs a frame, and a paused animation resumes exactly where it stopped, so
   * the field is still spread out when it comes back.
   */
  paused?: boolean
}

export function RadiantRings({
  cx,
  cy,
  rx,
  ry,
  viewBox,
  strokeWidth = 0.5,
  rings = 8,
  peak = 0.22,
  reach = DEFAULT_REACH,
  growth = 1,
  paused,
}: Props) {
  // Named after the curve, so two fields that travel differently can't each
  // emit a block under one name and overwrite the other.
  const ripple = `presence-ripple-${Math.round(reach * 100)}-${Math.round(growth * 100)}`

  return (
    <>
      <svg
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%", height: "100%", opacity: peak }}
      >
        <defs>
          {/* The export faded its ellipse from gold at the top to half that at
              the bottom, kept here. Held in the ellipse's own box, so every
              ring fades alike however far out it has travelled. */}
          <linearGradient id="radiant-ring" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop stopColor={GOLD} />
            <stop offset="1" stopColor={GOLD} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {Array.from({ length: rings }, (_, i) => (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            stroke="url(#radiant-ring)"
            strokeWidth={strokeWidth}
            strokeMiterlimit="10"
            style={{
              transformBox: "view-box",
              transformOrigin: `${cx}px ${cy}px`,
              // Spelled out longhand rather than as one `animation`: React
              // warns when a shorthand and a property it covers are both set
              // and one of them later goes away, and `paused` does exactly
              // that when the field comes and goes.
              animationName: ripple,
              animationDuration: `${CYCLE}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              // Negative, so the field is already spread out on arrival
              // instead of building up ring by ring.
              animationDelay: `${+((-i * CYCLE) / rings).toFixed(3)}s`,
              animationPlayState: paused ? "paused" : "running",
              willChange: "transform, opacity",
            }}
          />
        ))}
      </svg>

      <style>{`
        ${rippleKeyframes(ripple, reach, growth)}
      `}</style>
    </>
  )
}
