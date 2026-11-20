/**
 * The site's public address, for what has to name it whole: the shared
 * picture's URL (`metadataBase` in `app/layout.tsx`), `app/sitemap.ts` and
 * `app/robots.ts` (2026-11-20).
 *
 * On Vercel it is read from the project's production domain, so connecting
 * pandov.studio (or any other domain) changes it with no edit here. Elsewhere,
 * on this computer, it falls back to the Vercel address the site has today.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://v0-pandov.vercel.app"
