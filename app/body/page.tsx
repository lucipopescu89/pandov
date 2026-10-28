import { BodyCollections } from "@/components/body-collections"
import { BODY_INTRO, introText } from "@/components/collection-intro"

export const metadata = {
  title: "Body — PANDOV",
  description: introText(BODY_INTRO),
}

export default function BodyPage() {
  return <BodyCollections />
}
