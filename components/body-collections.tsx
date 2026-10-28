import type React from "react"
import Link from "next/link"
import { BODY_PIECES } from "@/lib/body-collections"
import { BODY_INTRO } from "@/components/collection-intro"
import {
  CollectionName,
  CollectionPage,
  Heart,
  LIST_SPACE,
  Mark,
  PHONE_PIECE_W,
  SPACE,
  WorkInProgress,
} from "@/components/collection-page"

/**
 * The Body page, after the author's Figma frame "Body" (node 4269-2, 1920 ×
 * 3249, on #202020), redrawn on 2026-09-26: a line of intent, Second Wind under
 * a filled diamond, then a note that what follows is work in progress but can
 * be ordered, a rule, and every other piece under an outlined diamond of its
 * own, one under the next.
 *
 * Until 2026-10-28 it was laid out on a canvas 1920 units wide, drawn in `cqw`,
 * so on a laptop everything on it, text and names included, came out at half
 * the size of the rest of the site. The author asked for it in real pixels, as
 * Mind is, and for Mind and Space to share its composition, so the layout is
 * now `CollectionPage` (`components/collection-page.tsx`), and the frame's
 * numbers are pixels.
 *
 * The photographs are drawn with no blend. Their ground is made exactly the
 * page's by `scripts/body-thumb.mjs`, so they meet it with no edge.
 */

/** Second Wind's photograph: Emperor, as the frame has it, in a 110 × 382 box. */
const EMPEROR = { w: 110, h: 382 }
/** The foot of Emperor's metal is 20 above its box's: the list is measured from there. */
const EMPEROR_FOOT_INSET = 20

/**
 * How large a piece is drawn. The photographs frame their pieces at every size,
 * so a piece is sized by its metal alone: every piece is given the same area,
 * the square of `PIECE_AREA`, so a narrow pendant stands taller than a round
 * bracelet and neither looks the heavier. Within `PIECE_MAX_H` × `PIECE_MAX_W`.
 * `scale` in `BODY_PIECES` is the author's knob for one that reads wrong.
 */
const PIECE_AREA = 235
const PIECE_MAX_H = 320
const PIECE_MAX_W = 300

/** A piece's drawn size: px per pixel of its file. */
function sizeOf(piece: (typeof BODY_PIECES)[number]): number {
  const inkW = piece.w - 2 * piece.pad
  const inkH = piece.h - 2 * piece.pad
  const aspect = inkW / inkH
  const h = PIECE_AREA / Math.sqrt(aspect)
  const w = PIECE_AREA * Math.sqrt(aspect)
  const fit = Math.min(1, PIECE_MAX_H / h, PIECE_MAX_W / w)
  return (h * fit * (piece.scale ?? 1)) / inkH
}

export function BodyCollections() {
  return (
    <CollectionPage theme="dark" intro={BODY_INTRO} activeLabel="body">
      {/* ── Second Wind, under the diamond that beats ── */}
      <Heart />
      <CollectionName theme="dark" href="/body/second-wind" style={{ marginTop: SPACE.name }}>
        Second Wind
      </CollectionName>
      <Link
        href="/body/second-wind"
        aria-label="Second Wind collection"
        className="block transition-opacity hover:opacity-80"
        style={{ marginTop: SPACE.picture, width: EMPEROR.w, height: EMPEROR.h, flex: "none" }}
      >
        {/* Emperor at the size of the pieces below (278 × 840), not the
            Second Wind page's 493 × 1489 cutout (the author's note, 2026-10-27). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/body-collections/emperor.avif"
          alt="Emperor of Nothingness, a pendant from Second Wind"
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Link>

      {/* ── Work in progress ── */}
      <WorkInProgress theme="dark" style={{ marginTop: LIST_SPACE.note - EMPEROR_FOOT_INSET }} />

      {BODY_PIECES.map((piece, i) => {
        const k = sizeOf(piece)
        const pad = piece.pad * k
        const metal = (piece.w - 2 * piece.pad) * k
        const fit = metal > PHONE_PIECE_W ? PHONE_PIECE_W / metal : 0
        return (
          <div key={piece.file} className="flex flex-col items-center">
            <Mark style={{ marginTop: i === 0 ? LIST_SPACE.mark : LIST_SPACE.next }} />
            <CollectionName theme="dark" as="h2" wip style={{ marginTop: LIST_SPACE.name }}>
              {piece.name}
            </CollectionName>
            {/* The photograph's margin of ground overlaps the gaps either side,
                so the gaps are measured to its metal. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/body-collections/${piece.file}`}
              alt={`${piece.name}, ${piece.kind}`}
              width={piece.w}
              height={piece.h}
              loading="lazy"
              decoding="async"
              className={fit ? "cp-fit" : undefined}
              style={{
                ...(fit ? ({ "--fit": fit.toFixed(4) } as React.CSSProperties) : {}),
                display: "block",
                width: piece.w * k,
                maxWidth: "none",
                height: "auto",
                marginTop: LIST_SPACE.piece - pad,
                marginBottom: -pad,
              }}
            />
          </div>
        )
      })}
    </CollectionPage>
  )
}
