"use client"

import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"

/** Brand grey used for the logo and the menu links on every page. */
const BRAND_GRAY = "#888888"

/**
 * The logo SVGs ship with a hard-coded `fill="#202020"` and are rendered through
 * `next/image` (an <img>), so `currentColor` can't reach them. `brightness(0)`
 * flattens the artwork to pure black and `invert()` lifts it back to a flat grey:
 * CSS `invert(a)` maps black to `a * 255`, so 136/255 = 53.33% lands on #888888.
 */
const LOGO_FILTER = "brightness(0) invert(53.33%)"

const menuItems = [
  { name: "Mind", href: "/mind" },
  { name: "Body", href: "/body" },
  { name: "Space", href: "/space" },
]

export function Navigation({
  dark = false,
  bgColor: customBgColor,
  linkColor,
}: {
  dark?: boolean
  bgColor?: string
  linkColor?: string
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const textColor = linkColor || BRAND_GRAY
  const bgColor = customBgColor || (dark ? "#202020" : "white")

  return (
    <header style={{ width: "100%", backgroundColor: bgColor }}>
      {/* Logo */}
      <div className="py-6 md:py-8 lg:py-10">
        <Link href="/" className="flex flex-col items-center gap-2">
          <Image
            src="/logo-icon.svg"
            alt=""
            width={44}
            height={44}
            className="h-10 md:h-12 lg:h-14 w-auto"
            style={{ filter: LOGO_FILTER }}
            priority
          />
          <Image
            src="/logo-text.svg"
            alt="Pandov"
            width={84}
            height={17}
            className="h-4 md:h-5 lg:h-6 w-auto"
            style={{ filter: LOGO_FILTER }}
            priority
          />
        </Link>
      </div>

      {/* Menu */}
      <nav className="pb-6 md:pb-8 lg:pb-10">
        {/* Desktop Menu */}
        <div className="hidden md:flex justify-center gap-20">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="font-heading text-sm tracking-[0.2em] uppercase hover:opacity-50 transition-opacity"
              style={{ fontSize: "12px", color: textColor }}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex justify-center">
          <button
            className="cursor-pointer bg-transparent border-none p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" style={{ color: textColor }} />
            ) : (
              <Menu className="w-6 h-6" style={{ color: textColor }} />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden flex flex-col items-center gap-6 pt-6 pb-4">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="font-heading text-sm tracking-[0.2em] uppercase hover:opacity-50 transition-opacity"
                style={{ fontSize: "12px", color: textColor }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  )
}
