import { SPACE_INTRO, introText } from "@/components/collection-intro"
import { CollectionPage } from "@/components/collection-page"

export const metadata = {
  title: "Space — PANDOV",
  description: introText(SPACE_INTRO),
}

/**
 * Space (2026-10-28): its line of intent, in the Body page's composition
 * (`CollectionPage`), until the collection is shown. Its pieces go under it
 * as on Mind and Body: `Heart`, `CollectionName`, the picture. On Body's
 * #202020 since 2026-11-21 (the author's asking), like Mind.
 */
export default function SpacePage() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Space — lighting and interior objects by Pandov</h1>
      <CollectionPage theme="dark" intro={SPACE_INTRO} />
    </>
  )
}
