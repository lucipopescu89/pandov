import { notFound } from "next/navigation"
import { PendantPage } from "@/components/pendant-page"
import { SECOND_WIND } from "@/lib/second-wind"

type Params = { params: Promise<{ pendant: string }> }

/** One page per pendant in `SECOND_WIND`, built ahead; any other name is a 404. */
export const dynamicParams = false
export const generateStaticParams = () => Object.keys(SECOND_WIND).map((pendant) => ({ pendant }))

export async function generateMetadata({ params }: Params) {
  const pendant = SECOND_WIND[(await params).pendant]
  if (!pendant) return {}
  return {
    title: `${pendant.name} — Second Wind — PANDOV`,
    description: `${pendant.name}, from the Second Wind collection: ${pendant.lines[0].toLowerCase()}`,
  }
}

export default async function SecondWindPendantPage({ params }: Params) {
  const pendant = SECOND_WIND[(await params).pendant]
  if (!pendant) notFound()
  return <PendantPage pendant={pendant} />
}
