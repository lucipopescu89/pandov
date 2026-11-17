import Link from "next/link"
import { BODY_PIECES, SATORI_PIECE, type BodyPiece } from "@/lib/body-collections"
import { BODY_INTRO } from "@/components/collection-intro"
import { BodyWipGallery } from "@/components/body-wip-gallery"
import {
  CollectionName,
  CollectionPage,
  Heart,
  LIST_SPACE,
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
/** The pieces under the rule, work in progress, are drawn faint, as if not yet active (2026-11-12, the author's asking: 50%, then 35%; then 30%, 20% and 10% for the gallery's side pieces on 2026-11-17). */
const WIP_PIECE_OPACITY = 0.1

const PIECE_AREA = 235
const PIECE_MAX_H = 320
const PIECE_MAX_W = 300

/** A piece's drawn size: px per pixel of its file. */
function sizeOf(piece: BodyPiece): number {
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

      {/* ── Satori, finished (2026-11-10, the author's asking): above the rule,
          under a beating diamond of its own, as Second Wind is. It stands as
          far under Emperor as the list's pieces stand under one another. ── */}
      <Heart style={{ marginTop: LIST_SPACE.next - EMPEROR_FOOT_INSET }} />
      <CollectionName theme="dark" href="/body/satori" style={{ marginTop: SPACE.name }}>
        Satori
      </CollectionName>
      {(() => {
        const k = sizeOf(SATORI_PIECE)
        const pad = SATORI_PIECE.pad * k
        return (
          <Link
            href="/body/satori"
            aria-label="Satori collection"
            className="block transition-opacity hover:opacity-80"
            style={{ marginTop: SPACE.picture - pad, marginBottom: -pad, flex: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/body-collections/${SATORI_PIECE.file}`}
              alt={`${SATORI_PIECE.name}, a ${SATORI_PIECE.kind}`}
              width={SATORI_PIECE.w}
              height={SATORI_PIECE.h}
              decoding="async"
              style={{ display: "block", width: SATORI_PIECE.w * k, maxWidth: "none", height: "auto" }}
            />
          </Link>
        )
      })()}

      {/* ── Work in progress ── */}
      <WorkInProgress theme="dark" style={{ marginTop: LIST_SPACE.note }} />

      {/* ── The rest, in one horizontal gallery that goes round (2026-11-17,
          the author's asking): no diamonds, the piece in the middle at full
          strength, the two beside it at 10% (the list had 35%). Until then they stood
          one under the next, each under an outlined diamond (`Mark`). The
          name keeps the gap the first mark and its name had under the rule,
          and the stage the gap from a name to its piece. ── */}
      {(() => {
        const sized = BODY_PIECES.map((piece) => {
          const k = sizeOf(piece)
          return { piece, k, metalH: (piece.h - 2 * piece.pad) * k }
        })
        return (
          <BodyWipGallery
            items={sized.map(({ piece, k }) => ({
              src: `/images/body-collections/${piece.file}`,
              alt: `${piece.name}, ${piece.kind}`,
              w: piece.w * k,
              h: piece.h * k,
            }))}
            names={BODY_PIECES.map((piece) => (
              <CollectionName key={piece.file} theme="dark" as="h2">
                {piece.name}
              </CollectionName>
            ))}
            stageH={Math.max(...sized.map((s) => s.metalH))}
            sideOpacity={WIP_PIECE_OPACITY}
            nameTop={LIST_SPACE.mark + LIST_SPACE.name}
            stageTop={LIST_SPACE.piece}
          />
        )
      })()}
    </CollectionPage>
  )
}
