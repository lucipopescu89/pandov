import { SPACE_INTRO, introText } from "@/components/collection-intro"
import { CollectionPage } from "@/components/collection-page"

export const metadata = {
  title: "Space — PANDOV",
  description: introText(SPACE_INTRO),
}

/**
 * Space (2026-10-28): its line of intent, in the Body page's composition
 * (`CollectionPage`), until the collection is shown. Its pieces go under it
 * as on Mind and Body: `Heart`, `CollectionName`, the picture.
 */
export default function SpacePage() {
  return <CollectionPage theme="light" intro={SPACE_INTRO} />
}
