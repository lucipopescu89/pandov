import Image from "next/image"
import Link from "next/link"
import { MIND_INTRO, introText } from "@/components/collection-intro"
import { CollectionName, CollectionPage, Heart, SPACE } from "@/components/collection-page"

export const metadata = {
  title: "Mind — PANDOV",
  description: introText(MIND_INTRO),
}

/** Mind, in the Body page's composition (`CollectionPage`, 2026-10-28). */
export default function MindPage() {
  return (
    <CollectionPage theme="light" intro={MIND_INTRO}>
      <Heart />
      <CollectionName theme="light" href="/mind/chess-set" style={{ marginTop: SPACE.name }}>
        Chess Set
      </CollectionName>
      <Link href="/mind/chess-set" style={{ display: "block", width: "100%", maxWidth: 621, marginTop: SPACE.picture }}>
        <Image
          src="/images/mind-chess-set.jpg"
          alt="Chess Set — For Mind"
          width={621}
          height={422}
          style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }}
          priority
        />
      </Link>
    </CollectionPage>
  )
}
