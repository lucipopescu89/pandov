import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

/**
 * /robots.txt (2026-11-20, the audit: it was a 404). Everything may be read
 * except the hidden page behind the eye, which carries its own noindex too,
 * and the temporary Satori workshop, which is a 404 outside development.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/seen", "/dev-satori"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
