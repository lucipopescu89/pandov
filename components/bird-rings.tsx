import Image from "next/image"

// Circle sizes and opacities from the provided SVGs (innermost to outermost)
// Ellipse 6: r=101.786 (~204px), opacity 0.3
// Ellipse 1: r=107.803 (~216px), opacity 0.7
// Ellipse 2: r=116.828 (~234px), opacity 0.7
// Ellipse 3: r=130.366 (~260px), opacity 0.5
// Ellipse 4: r=149.92  (~300px), opacity 0.2
// Ellipse 5: r=178.5   (~357px), opacity 0.05
const CIRCLES = [
  { d: 204, opacity: 0.3,  dir: 1  }, // CW
  { d: 216, opacity: 0.7,  dir: -1 }, // CCW
  { d: 234, opacity: 0.7,  dir: 1  }, // CW
  { d: 260, opacity: 0.5,  dir: -1 }, // CCW
  { d: 300, opacity: 0.2,  dir: 1  }, // CW
  { d: 357, opacity: 0.05, dir: -1 }, // CCW
]

/** Side of the square the circles above were measured in. */
const BOX = 357
/** Side of the bird GIF's box inside that square. */
const BIRD = 156

/**
 * The Pandov bird GIF inside its dashed circles, each turning at its own pace.
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
      {/* Animated rotating circles */}
      {CIRCLES.map((c, i) => {
        const inset = `${((BOX - c.d) / 2 / BOX) * 100}%`
        const duration = 18 + i * 6 // each ring slightly different speed
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset,
              animation: `${c.dir === 1 ? "spin-cw" : "spin-ccw"} ${duration}s linear infinite`,
            }}
          >
            <svg width="100%" height="100%" viewBox={`0 0 ${c.d} ${c.d}`} fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx={c.d / 2}
                cy={c.d / 2}
                r={c.d / 2 - 0.5}
                stroke="black"
                strokeOpacity={c.opacity}
                strokeDasharray="2 2"
              />
            </svg>
          </div>
        )
      })}

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
        @keyframes spin-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spin-ccw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  )
}
