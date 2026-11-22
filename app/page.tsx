import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { HomeStill } from "@/components/home-still"
import { SelectedSection } from "@/components/selected-section"
import { MakingSection } from "@/components/making-section"

/*
 * The homepage, still (2026-11-22, the author's asking, after visitors said
 * the pages did not flow on their phones; see lib/still.ts): one page scrolled
 * like any other, top to bottom, with nothing held and nothing tied to the
 * scroll. The menu at the top as on every page; the doors, Presence and the
 * three categories as pictures (`HomeStill`); then Making, Selected and the
 * footer as they were, Making's sun, sea and drawing drawn once.
 *
 * The moving homepage, as it stood until that evening, is this file's
 * previous version (D:\PANDOV\Claude outputs\page.inainte-2026-11-22-still.tsx):
 * the menu hidden until the reader scrolled up (`RevealOnScrollUp`), the doors
 * played and Presence and For Mind after them (`HeroAnimation`,
 * `CategoriesSection`), the hint to scroll (`ScrollHint`). Their files are
 * kept unchanged.
 */
export default function Home() {
  return (
    <>
      {/* The page's title for Google and screen readers, not drawn (2026-11-20, the audit). */}
      <h1 className="sr-only">Pandov — sculptural objects, jewellery and lighting</h1>

      <Navigation bgColor="#202020" />

      <HomeStill />

      {/* Making, then Selected (2026-11-05, the author's asking): Making's
          dark wood at its foot runs straight on into Selected's #202020. */}
      <MakingSection />

      <SelectedSection />

      <Footer />
    </>
  )
}
