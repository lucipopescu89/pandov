import { SatoriPresentation } from "@/components/satori-presentation"

export const metadata = {
  title: "Satori — Body — PANDOV",
  description: "Satori, a collection of four pendants by PANDOV.",
}

export default function SatoriPage() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Satori — pendants by Pandov</h1>
      <SatoriPresentation />
    </>
  )
}
