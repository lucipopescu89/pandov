import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { HeroAnimation } from "@/components/hero-animation"
import { CategoriesSection } from "@/components/categories-section"
import { SelectedSection } from "@/components/selected-section"
import { MakingSection } from "@/components/making-section"

export default function Home() {
  return (
    <>
      {/* Top menu — grey #888888 logo and links on a dark band. The band is the
          header's own background, so it stops where the hero image sequence
          begins rather than tinting the rest of the page. */}
      <Navigation bgColor="#202020" />

      {/* Extra breathing room between the menu and the hero sequence. Carries the
          same #202020 as the header so the band reads as one continuous block. */}
      <div style={{ height: 120, backgroundColor: "#202020" }} aria-hidden="true" />

      <HeroAnimation />

      <CategoriesSection />

      <SelectedSection />

      <MakingSection />

      <Footer />
    </>
  )
}
