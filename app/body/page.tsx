import { BodyCollections } from "@/components/body-collections"
import { BODY_INTRO, introText } from "@/components/collection-intro"

export const metadata = {
  title: "Body — PANDOV",
  description: introText(BODY_INTRO),
}

export default function BodyPage() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Body — jewellery by Pandov</h1>
      <BodyCollections />
    </>
  )
}
