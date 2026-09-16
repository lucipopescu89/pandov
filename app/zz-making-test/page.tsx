import { MakingSection } from "@/components/making-section"
import { Footer } from "@/components/footer"

// TEMPORARY verification route — delete after checking the Making section.
export default function Page() {
  return (
    <>
      <div style={{ height: "150vh", background: "#202020" }} />
      <MakingSection />
      <Footer />
    </>
  )
}
