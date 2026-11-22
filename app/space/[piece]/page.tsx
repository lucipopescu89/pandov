import { notFound } from "next/navigation"
import { SpacePiecePage } from "@/components/space-piece-page"
import { SPACE_PIECES } from "@/lib/space"

type Params = { params: Promise<{ piece: string }> }

/** One page per piece in `SPACE_PIECES`, built ahead; any other name is a 404. */
export const dynamicParams = false
export const generateStaticParams = () => Object.keys(SPACE_PIECES).map((piece) => ({ piece }))

export async function generateMetadata({ params }: Params) {
  const piece = SPACE_PIECES[(await params).piece]
  if (!piece) return {}
  return {
    title: `${piece.name} — Space — PANDOV`,
    description: `${piece.name}, from Space by Pandov. ${piece.line}`,
  }
}

export default async function SpacePiece({ params }: Params) {
  const piece = SPACE_PIECES[(await params).piece]
  if (!piece) notFound()
  return <SpacePiecePage piece={piece} />
}
