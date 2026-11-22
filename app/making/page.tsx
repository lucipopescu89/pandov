// The still page since 2026-11-22 (lib/still.ts); the moving one is `MakingPage`
// from "@/components/making-page", kept unchanged: put it back here to bring it back.
import { MakingStill } from "@/components/making-still"

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
      <MakingStill />
    </>
  )
}
