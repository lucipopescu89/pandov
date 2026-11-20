import type React from "react"
import { notFound } from "next/navigation"

/**
 * The Satori workshop (`render`, `save`, `convert`) is a tool for this
 * computer, not a page of the site (2026-11-20, the audit: /dev-satori/render
 * was public, with the template's title). Its two routes already refuse
 * outside development; this does the same for the page. Deleting the folder,
 * as its own notes ask once the renders are made, is still the end of it;
 * `publica-site.bat` never deletes on GitHub, so this is what keeps it off
 * the live site meanwhile.
 */
export default function DevSatoriLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound()
  return <>{children}</>
}
