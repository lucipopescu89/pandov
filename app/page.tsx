import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { HeroAnimation } from "@/components/hero-animation"
import { ScrollHint } from "@/components/scroll-hint"
import { CategoriesSection } from "@/components/categories-section"
import { SelectedSection } from "@/components/selected-section"
import { MakingSection } from "@/components/making-section"
import { RevealOnScrollUp } from "@/components/reveal-on-scroll-up"

export default function Home() {
  return (
    <>
      {/* Top menu — grey #888888 logo and links on a dark band. On the homepage
          it lies over the page, hidden, and slides down only when the reader
          scrolls up (2026-11-02), so the page opens on the handles filling the
          screen. See `RevealOnScrollUp`. */}
      <RevealOnScrollUp>
        <Navigation bgColor="#202020" />
      </RevealOnScrollUp>

      <HeroAnimation />

      <CategoriesSection />

      {/* Making, then Selected (2026-11-05, the author's asking): Making's
          dark wood at its foot runs straight on into Selected's #202020. */}
      <MakingSection />

      <SelectedSection />

      <Footer />

      {/* The hint to scroll: the doors come ajar and a line of light runs
          down their seam (2026-11-10; the words "Scroll down" of 2026-11-09
          now only under reduced motion). See `ScrollHint`. It is fixed, so where it stands in
          the page does not matter, but it must NOT go between the hero and
          For Mind's section: the hero takes its next sibling to be For Mind's
          section (`section` in `HeroAnimation`), and with the hint there For
          Mind's chess board came up over the handles on the way back up. */}
      <ScrollHint />
    </>
  )
}
