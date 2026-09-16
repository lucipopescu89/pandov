"use client"

import Link from "next/link"

const NAV = [
  { label: "making", href: "/making" },
  { label: "contact", href: "/contact" },
]

/** Same grey as the top navigation. */
const NAV_COLOR = "#888888"

/** Gap between the logo button and the menu row. */
const LOGO_GAP = 50
/** The same gap in the compact form. */
const COMPACT_LOGO_GAP = 32

/**
 * Bottom menu — centered, and deliberately styled to match the top navigation
 * in `components/navigation.tsx`: #888888, 12px, uppercase, 0.2em tracking,
 * 80px between items. The simplified logo above it scrolls back to the top.
 *
 * `compact` is the homepage's quieter form from its design: a smaller logo set
 * closer to the menu, and 11px labels with only the first letter capitalised,
 * which Julius Sans One draws as small capitals, instead of tracked uppercase.
 */
export function BodyFooter({
  activeLabel = "body",
  compact = false,
}: {
  activeLabel?: string | null
  compact?: boolean
}) {
  const scrollToTop = () => {
    // Honour the OS "reduce motion" setting rather than always animating.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  }

  return (
    <footer className="flex flex-col items-center">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className="cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-60"
        style={{ marginBottom: compact ? COMPACT_LOGO_GAP : LOGO_GAP }}
      >
        <svg width={compact ? 35 : 44} height={compact ? 37 : 46} viewBox="0 0 44 46" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M44 46H43.1334C41.9852 46 40.902 45.4295 40.2738 44.4998C34.1211 35.5195 27.9685 26.5393 21.7942 17.559C20.386 15.5094 17.2014 15.7418 16.1398 17.9816C11.677 27.3211 7.21418 36.6605 2.72969 46H0C5.97932 33.491 11.9803 21.0032 22.0108 0C27.0586 10.5227 35.5293 28.2508 44 46ZM20.646 13.3542C20.646 12.4456 19.8877 11.706 18.9562 11.706C18.0246 11.706 17.2664 12.4456 17.2664 13.3542C17.2664 14.2627 18.0246 15.0023 18.9562 15.0023C19.8877 15.0023 20.646 14.2627 20.646 13.3542Z"
            fill={NAV_COLOR}
          />
        </svg>
      </button>

      <nav className={`flex items-center justify-center ${compact ? "gap-[38px]" : "gap-20"}`}>
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`font-heading transition-opacity hover:opacity-50 ${compact ? "capitalize" : "uppercase tracking-[0.2em]"}`}
            style={{ fontSize: compact ? "11px" : "12px", color: NAV_COLOR }}
            aria-current={item.label === activeLabel ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
