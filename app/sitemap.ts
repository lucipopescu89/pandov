import type { MetadataRoute } from "next"
import { SATORI } from "@/lib/satori"
import { SECOND_WIND } from "@/lib/second-wind"
import { SITE_URL } from "@/lib/site"

/**
 * /sitemap.xml (2026-11-20, the audit: it was a 404), so Google finds every
 * page, the pendants included. The pendant pages come from the same lists
 * their routes are built from, so a new pendant is listed with no edit here.
 * A new page of the site's own (a Space collection, say) is added below.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "/",
    "/mind",
    "/mind/chess-set",
    "/body",
    "/body/second-wind",
    ...Object.keys(SECOND_WIND).map((slug) => `/body/second-wind/${slug}`),
    "/body/satori",
    ...Object.keys(SATORI).map((slug) => `/body/satori/${slug}`),
    "/space",
    "/making",
    "/contact",
  ]
  return pages.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }))
}
