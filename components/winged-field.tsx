import { WING_CLASS, WING_KEYFRAMES, type WingSpec } from "@/lib/wings"

/**
 * An artwork whose wings beat. `splitWings` has already lifted the plumage into
 * banded groups; this gives those bands the beat itself.
 *
 * The downstroke takes a little under half the cycle and the recovery the rest,
 * each with its own easing, because a bird does not swing like a pendulum: it
 * drives down and drifts back. With the bands' own lag on top, no two parts of
 * the wing turn through the same angle at the same moment, which is what stops
 * the eye reading a hinge.
 */

/** Share of the cycle spent on the downstroke; the rest is the recovery. */
const DOWN = 0.44

export function WingedField({
  html,
  spec,
  label,
  className,
  style,
}: {
  html: string
  spec: WingSpec
  label?: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div aria-label={label} className={className} style={style}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .${WING_CLASS} {
          transform-box: view-box;
          animation: ${WING_KEYFRAMES} ${spec.cycle}s infinite;
          will-change: transform;
        }
        @keyframes ${WING_KEYFRAMES} {
          0% {
            transform: rotate(0deg);
            animation-timing-function: cubic-bezier(0.36, 0, 0.22, 1);
          }
          ${DOWN * 100}% {
            transform: rotate(var(--swing));
            animation-timing-function: cubic-bezier(0.4, 0, 0.35, 1);
          }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
