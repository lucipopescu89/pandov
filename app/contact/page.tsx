import type { Viewport } from "next"
import { ContactCollections } from "@/components/contact-collections"

export const metadata = {
  title: "Contact — PANDOV",
  description:
    "Pandov is based in Padeș, Gorj, Romania, and ships throughout the European Union. For commissions, object enquiries, collaborations, wholesale and gallery representation: contact@pandov.studio.",
}

/**
 * The page's fields are set in Manrope at 15px and 13px, the site's sizes, and
 * Safari on an iPhone zooms into any field under 16px when it takes the focus,
 * and stays zoomed. `maximumScale: 1` stops that zoom; Safari still lets a
 * visitor pinch to zoom. Only on this page, the one with forms.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function ContactPage() {
  return <ContactCollections />
}
