import Image from "next/image"
import Link from "next/link"
import { SPACE_INTRO, introText } from "@/components/collection-intro"
import { CollectionName, CollectionPage, Heart, SPACE } from "@/components/collection-page"

export const metadata = {
  title: "Space — PANDOV",
  description: introText(SPACE_INTRO),
}

/**
 * Space (2026-10-28): its line of intent, in the Body page's composition
 * (`CollectionPage`). On Body's #202020 since 2026-11-21 (the author's
 * asking), like Mind. Its first piece, Heavy Light, since 2026-11-22, shown
 * as Mind shows the Chess Set: `Heart`, the name, the picture, both leading
 * to the piece's page (`lib/space.ts`). The picture is the lamp lit, from the
 * author's render, at twice the 621 × 422 it is drawn at.
 */
export default function SpacePage() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Space — lighting and interior objects by Pandov</h1>
      <CollectionPage theme="dark" intro={SPACE_INTRO}>
        <Heart />
        <CollectionName theme="dark" href="/space/heavy-light" style={{ marginTop: SPACE.name }}>
          Heavy Light
        </CollectionName>
        <Link href="/space/heavy-light" style={{ display: "block", width: "100%", maxWidth: 621, marginTop: SPACE.picture }}>
          <Image
            src="/images/space/heavy-light-card.avif"
            alt="Heavy Light, lit, in a dark room — For Space"
            width={621}
            height={422}
            style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }}
            priority
          />
        </Link>
      </CollectionPage>
    </>
  )
}
