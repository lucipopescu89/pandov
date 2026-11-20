import { MakingPage } from "@/components/making-page"

export const metadata = {
  title: "Making — PANDOV",
  description:
    "Every Pandov piece begins with a search: in nature, in discarded objects, or on a blank sheet of paper. How the forms are found, scanned, drawn and made.",
}

export default function Making() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Making — how Pandov pieces are made</h1>
      <MakingPage />
    </>
  )
}
