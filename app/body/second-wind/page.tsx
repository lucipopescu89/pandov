import { BodyPresentation } from "@/components/body-presentation"

export const metadata = {
  title: "Second Wind — Body — PANDOV",
  description: "Sick and tired, trapped in an eternal Icarus's fall. The body is matter in motion.",
}

export default function SecondWindPage() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Second Wind — pendants by Pandov</h1>
      <BodyPresentation />
    </>
  )
}
