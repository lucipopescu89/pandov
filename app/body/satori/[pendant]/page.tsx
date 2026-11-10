import { notFound } from "next/navigation"
import { PendantPage } from "@/components/pendant-page"
import { SATORI } from "@/lib/satori"

type Params = { params: Promise<{ pendant: string }> }

const COLLECTION = { name: "Satori", path: "/body/satori", pendants: SATORI }

/** One page per pendant in `SATORI`, built ahead; any other name is a 404. */
export const dynamicParams = false
export const generateStaticParams = () => Object.keys(SATORI).map((pendant) => ({ pendant }))

export async function generateMetadata({ params }: Params) {
  const pendant = SATORI[(await params).pendant]
  if (!pendant) return {}
  return {
    title: `${pendant.name} — Satori — PANDOV`,
    description: `${pendant.name}, a pendant from the Satori collection.`,
  }
}

export default async function SatoriPendantPage({ params }: Params) {
  const slug = (await params).pendant
  const pendant = SATORI[slug]
  if (!pendant) notFound()
  return <PendantPage slug={slug} pendant={pendant} collection={COLLECTION} />
}
