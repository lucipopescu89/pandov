import Image from "next/image"

/** Side of the square the circles were measured in. */
const BOX = 357
/** Side of the bird GIF's box inside that square. */
const BIRD = 156

/**
 * The dashed circles were drawn as six, 204, 216, 234, 260, 300 and 357
 * across, and their spacing is not arbitrary: each gap is about 1.48 times the
 * one inside it — 12, 18, 26, 40, 57. That is how a row of equal rings looks
 * seen down its own length, crowding towards a far opening, here some 179
 * across. So one expression draws all six — circle `s` is
 * OPENING + SPREAD · RATIO^s across, s running from 0 innermost to 5 at the
 * rim — and it holds between the whole numbers too, which is what lets them
 * move.
 */
const INNER = 204
const RATIO = 1.48
const SPREAD = (BOX - INNER) / (RATIO ** 5 - 1)
const OPENING = INNER - SPREAD

/** Circle `s` of the series, across, as a fraction of the square. */
function across(s: number): number {
  return (OPENING + SPREAD * RATIO ** s) / BOX
}

/**
 * The circles travel inward: the field that swells out around Presence in the
 * hero (`RadiantRings`) run the other way, so the bird seems to fly on through
 * a tunnel of them. A ring is born at the rim, takes the place of the one
 * inside it every STEP_S — quick at the rim, slowing as it nears the opening —
 * and is gone a step inside the innermost circle, 196 across, still clear of
 * the wingtips, which reach 162 across at their widest.
 *
 * GLOW is how bright it is at each whole step, from the rim to gone: the
 * opacities the six were drawn at, with the rim's own 0.05 taken to 0, because
 * that is where a ring appears. With one ring to each step, at every whole
 * step the six stand exactly where they were drawn and as bright as they were
 * drawn. The mark is still its drawing, only carried inward.
 */
const GLOW = [0, 0.2, 0.5, 0.7, 0.7, 0.3, 0]
const TRAVEL = GLOW.length - 1

/**
 * Seconds for a ring to take the place of the one inside it. Slow on purpose —
 * the travel is meant to be felt more than watched: at 1440px the brightest
 * rings close in by under 1px a second. It was 3 at first; the author slowed
 * the travel to 70% of that pace, found it still too quick, and took it down
 * to 30%. The turn keeps its own pace whatever this is: it goes by the size of
 * the ring, not by the step.
 */
const STEP_S = 10

/**
 * Every ring turns the same way, clockwise, and slows as it closes in. Its
 * pace is in proportion to its size: a turn that would take TURN_S at the rim
 * takes about 86s where the field is brightest and 95s at the innermost
 * circle. The dashes, which are what the eye follows, slow by more than that,
 * because a smaller ring also carries them a shorter way round each turn.
 *
 * Until 2026-09-21 each ring kept one pace of its own the whole way in, and
 * neighbours turned opposite ways; the author asked for one direction, and for
 * the turn to wind down as the ring closes in. TURN_S was 27 then, and the
 * author halved the pace when the travel was slowed to 30%.
 */
const TURN_S = 54

/**
 * Degrees a ring has turned, `step` steps in from the rim: its pace summed
 * over the way it has come. That sum is why the turn is written into the
 * travel below rather than run as an animation of its own — a steady spin
 * beside the travel can only ever have the one pace.
 */
function turned(step: number): number {
  const rim = TRAVEL - 1
  const swept = OPENING * step + (SPREAD * (RATIO ** rim - RATIO ** (rim - step))) / Math.log(RATIO)
  return (360 / TURN_S) * STEP_S * (swept / BOX)
}

/**
 * A ring is drawn once, at the size it is born at, and travels by being scaled
 * down — a transform the GPU carries, so nothing is repainted as it goes.
 * Drawn smaller and scaled up instead, it would go soft.
 *
 * Scaling a ring scales its line and its dashes with it, so the weight is set
 * where the field is brightest, halfway between the two 0.7 circles: there the
 * ring is exactly the circle as drawn, a 1px line in 2px dashes and 2px gaps.
 * Towards the rim it is a little heavier and its dashes a little longer,
 * towards the bird a little finer, as nearer and further rings are. The dashes
 * come to a whole number, so none is cut short where the circle closes — the
 * turning would carry a short one round where everyone could see it.
 */
const LINE = +(1 / across(1.5)).toFixed(4)
const RADIUS = BOX / 2 - LINE / 2
const DASHES = Math.round((Math.PI * RADIUS) / (2 * LINE))
const DASH = +((Math.PI * RADIUS) / DASHES).toFixed(4)

const TUNNEL = "bird-tunnel"
const RING_CLASS = "bird-ring"

/** Stops the travel is written out over, to each step. */
const STOPS = 8

/**
 * The travel as keyframes: the series read continuously rather than a timing
 * function laid over it, so the pace is the tunnel's own — every step takes the
 * same time and covers RATIO times less ground than the one before it — with
 * the turn carried on it. Straight lines between eight stops to a step are not
 * lines anyone can see. The turn starts again from nothing each time a ring is
 * born, which no one sees either: at both ends of the travel the ring is gone.
 */
function tunnelKeyframes(): string {
  const n = TRAVEL * STOPS
  const body = Array.from({ length: n + 1 }, (_, i) => {
    const step = i / STOPS
    const lo = Math.min(Math.floor(step), TRAVEL - 1)
    const glow = GLOW[lo] + (GLOW[lo + 1] - GLOW[lo]) * (step - lo)
    const scale = across(TRAVEL - 1 - step)
    // Positive, which on screen is clockwise.
    const turn = turned(step)
    return `          ${+((i * 100) / n).toFixed(3)}% { transform: rotate(${+turn.toFixed(2)}deg) scale(${+scale.toFixed(4)}); opacity: ${+glow.toFixed(3)}; }`
  })
  return `@keyframes ${TUNNEL} {\n${body.join("\n")}\n        }`
}

/**
 * The Pandov bird GIF inside its dashed circles, which travel inward, turning
 * as they go.
 *
 * Everything is laid out in fractions of the 357px square the circles were
 * measured in, so `size` scales the whole mark — rings, dashes and bird — and
 * at the default it renders exactly as first drawn for the footer.
 */
export function BirdRings({
  size = `${BOX}px`,
  style,
}: {
  size?: string
  style?: React.CSSProperties
}) {
  return (
    <div style={{ position: "relative", width: size, aspectRatio: "1", ...style }}>
      {Array.from({ length: TRAVEL }, (_, c) => (
        <div
          key={c}
          className={RING_CLASS}
          style={{
            position: "absolute",
            inset: 0,
            // Negative, so ring c is already circle c of the drawing on
            // arrival, rather than the field filling in from the rim.
            animationDelay: `${+(-(TRAVEL - 1 - c) * STEP_S).toFixed(3)}s`,
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${BOX} ${BOX}`} fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx={BOX / 2}
              cy={BOX / 2}
              r={RADIUS}
              stroke="black"
              strokeWidth={LINE}
              strokeDasharray={`${DASH} ${DASH}`}
            />
          </svg>
        </div>
      ))}

      {/* Bird GIF centered, 70% opacity */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${(BIRD / BOX) * 100}%`,
          aspectRatio: "1",
          transform: "translate(-50%, -50%)",
          opacity: 0.7,
        }}
      >
        <Image
          src="/images/gif-pasare.gif"
          alt="Pandov bird"
          width={600}
          height={600}
          unoptimized
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      <style>{`
        .${RING_CLASS} {
          animation: ${TUNNEL} ${+(TRAVEL * STEP_S).toFixed(3)}s linear infinite;
        }
        ${tunnelKeyframes()}
        @media (prefers-reduced-motion: reduce) {
          /* Held where each ring's delay puts it, which is the drawing. The
             turn rides on the travel, so it holds as well. */
          .${RING_CLASS} { animation-play-state: paused; }
        }
      `}</style>
    </div>
  )
}
