import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { manrope } from "@/lib/type"
import { SITE_URL } from "@/lib/site"
import "./globals.css"

/*
 * What Google, and a link shared on WhatsApp, Facebook or Instagram, show of
 * the site (2026-11-20, the audit). Until then the homepage carried the v0
 * template's "PANDOV - Modern E-Commerce Store" and its description, a
 * `generator: v0.app` tag, and the template's v0 icons, which had been saved
 * as base64 text and so showed nothing at all. The icons are now Pandov's mark,
 * #888888 on #202020 like the top menu (`public/icon.svg`, the PNGs beside it,
 * `favicon.ico`). The pages under it keep their own titles and descriptions;
 * the shared picture (`public/og.jpg`, the doors' first frame) is inherited by
 * every page that does not name its own. No og:title or og:description here on
 * purpose: set in the layout they would follow every page, and a shared link
 * to Second Wind would carry the homepage's words. Left out, Next fills them in
 * from each page's own title and description (checked on /body/second-wind).
 *
 * The Julius `next/font` instance that sat here was never applied to anything
 * (Julius is reached by name, through the Google Fonts <link> below), but it
 * was still downloaded and preloaded on every page: removed.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Pandov — Sculptural Objects, Jewellery & Lighting",
  description:
    "Independent art and design studio in Padeș, Romania. Sculptural objects, jewellery and lighting. Ships across the EU.",
  openGraph: {
    type: "website",
    siteName: "Pandov",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pandov — the doors with their sculpted handles" }],
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        {/* Register the literal "Julius Sans One" family so inline SVG <text> elements
            (exported from Figma) render in the correct font. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Julius+Sans+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
        {/* The still site (2026-11-22, the author's asking, after visitors said
            the pages did not flow on their phones; see lib/still.ts): the three
            scripts that ran over every page are no longer loaded. Each was one
            line here, and each comes back by putting its line back:
              <Script src="/pandov-fx.js" strategy="afterInteractive" />
                the gold dust, the soft entrances (blurred, which a phone
                redraws as it scrolls), a black veil fading on every load, the
                scroll line at the top;
              <Script src="/pandov-grain.js" strategy="afterInteractive" />
                the gold motes in the homepage's Making photograph;
              <Script src="/pandov-glide.js" strategy="afterInteractive" />
                the glide after each turn of the wheel, which took the scroll
                from the browser.
            The files are left in public/, unused. */}
        {/* The #202020 test of 2026-11-20 (public/pandov-dark-test.js, local
            addresses only) is no longer loaded (2026-11-21): the author decided
            that day, and on 127.0.0.1 it kept repainting what is now dark on
            purpose (two lines of the drawing on the found wood came out white).
            The file is left in public/, unused. */}
      </body>
    </html>
  )
}
