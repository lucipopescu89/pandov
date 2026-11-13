"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type React from "react"

/** Brand grey used for the logo and the menu links on every page. */
const BRAND_GRAY = "#888888"

/**
 * The logo SVGs ship with a hard-coded `fill="#202020"` and are rendered through
 * `next/image` (an <img>), so `currentColor` can't reach them. `brightness(0)`
 * flattens the artwork to pure black and `invert()` lifts it back to a flat grey:
 * CSS `invert(a)` maps black to `a * 255`, so 136/255 = 53.33% lands on #888888.
 */
const LOGO_FILTER = "brightness(0) invert(53.33%)"

/**
 * A word and its submenu read apart, subtly (2026-11-13, the author's asking):
 * over a word, or while its submenu is open, the word is whiter on a dark
 * ground (darker on a light one) and keeps the gold line under it
 * (`pandov-fx.js`); the collections are set smaller (10px against the word's
 * 12), a little greyer (further from the ground than the word) and with no gold
 * line, and lift a little when the pointer is on one. Until then both were #888
 * and faded to half on a hover.
 */
const MENU_TONES = {
  dark: { word: BRAND_GRAY, wordLit: "#e6e6e6", sub: "#6f6f6f", subLit: "#a8a8a8" },
  light: { word: BRAND_GRAY, wordLit: "#333333", sub: "#a2a2a2", subLit: "#666666" },
}
const SUB_FONT_SIZE = "10px"

/** Whether a band colour is dark, read from a #rgb or #rrggbb value; anything else counts as light. */
function isDark(color: string) {
  const hex = color.trim().replace(/^#/, "")
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return false
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
}

/**
 * The three words and, under each, its collections (2026-11-12, the author's
 * asking): a hover over a word opens them, a submenu under it. Mind has the
 * Chess Set, Body Second Wind and Satori, Space nothing yet. A collection
 * added to a page goes here too.
 */
const menuItems: { name: string; href: string; collections: { name: string; href: string }[] }[] = [
  { name: "Mind", href: "/mind", collections: [{ name: "Chess Set", href: "/mind/chess-set" }] },
  {
    name: "Body",
    href: "/body",
    collections: [
      { name: "Second Wind", href: "/body/second-wind" },
      { name: "Satori", href: "/body/satori" },
    ],
  },
  { name: "Space", href: "/space", collections: [] },
]

/**
 * The top menu. `bgColor` is the band behind it — the page's own ground, the
 * only thing a page may vary. The logo, the links, their colour, size, tracking
 * and spacing are the component's and are the same on every route; there is
 * deliberately no prop to override them.
 *
 * Since 2026-11-12 a phone shows the three words as a computer does (they were
 * behind three lines; the author's asking), a little closer together. With a
 * mouse, a hover over a word opens its collections under it; on a touch screen
 * the first tap on a word with collections opens them, a second tap on it goes
 * to its page, and a tap anywhere else closes them. A word with none (Space)
 * goes to its page at once. The submenu lies over the page, on the page's own
 * ground. `public/pandov-fx.js` finds the words by `.nv-word`.
 */
export function Navigation({ bgColor = "white" }: { bgColor?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const tones = MENU_TONES[isDark(bgColor) ? "dark" : "light"]

  // A tap or click outside the menu closes an open submenu.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [open])

  const onWord = (item: (typeof menuItems)[number]) => (e: React.MouseEvent) => {
    if (!item.collections.length) return
    const touch = window.matchMedia("(hover: none)").matches
    if (touch && open !== item.name) {
      e.preventDefault()
      setOpen(item.name)
    }
  }

  return (
    <header
      style={
        {
          width: "100%",
          backgroundColor: bgColor,
          "--nv-word": tones.word,
          "--nv-word-lit": tones.wordLit,
          "--nv-sub": tones.sub,
          "--nv-sub-lit": tones.subLit,
        } as React.CSSProperties
      }
    >
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

      {/* Menu: the same row on every screen */}
      <nav ref={navRef} className="pb-6 md:pb-8 lg:pb-10">
        <div className="nv-row flex justify-center gap-12 md:gap-20">
          {menuItems.map((item) => (
            <div key={item.name} className={`nv-item${open === item.name ? " nv-open" : ""}`}>
              <Link
                href={item.href}
                className="nv-word font-heading text-sm tracking-[0.2em] uppercase"
                style={{ fontSize: "12px" }}
                onClick={onWord(item)}
                aria-haspopup={item.collections.length ? "true" : undefined}
                aria-expanded={item.collections.length ? open === item.name : undefined}
              >
                {item.name}
              </Link>
              {item.collections.length > 0 && (
                <div className="nv-sub" style={{ backgroundColor: bgColor }}>
                  {item.collections.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="nv-link font-heading uppercase tracking-[0.2em]"
                      style={{ fontSize: SUB_FONT_SIZE }}
                      onClick={() => setOpen(null)}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
      <style>{`
        .nv-item { position: relative; display: flex; justify-content: center; }
        .nv-word { color: var(--nv-word); transition: color 0.35s ease; }
        .nv-open > .nv-word, .nv-item:has(:focus-visible) > .nv-word { color: var(--nv-word-lit); }
        .nv-link { color: var(--nv-sub); transition: color 0.35s ease; }
        .nv-link:focus-visible { color: var(--nv-sub-lit); }
        .nv-sub { position: absolute; top: 100%; left: 50%; z-index: 60; display: flex; flex-direction: column; align-items: center;
          gap: 14px; margin-top: 12px; padding: 12px 20px 14px; white-space: nowrap;
          opacity: 0; visibility: hidden; transform: translate(-50%, -4px);
          transition: opacity 0.35s ease, transform 0.35s ease, visibility 0s linear 0.35s; }
        /* the gap between the word and its submenu still counts as over it */
        .nv-sub::before { content: ""; position: absolute; left: 0; right: 0; top: -12px; height: 12px; }
        .nv-open > .nv-sub, .nv-item:has(:focus-visible) > .nv-sub { opacity: 1; visibility: visible; transform: translate(-50%, 0);
          transition: opacity 0.35s ease, transform 0.35s ease, visibility 0s; }
        @media (hover: hover) {
          .nv-item:hover > .nv-word { color: var(--nv-word-lit); }
          .nv-link:hover { color: var(--nv-sub-lit); }
          .nv-item:hover > .nv-sub { opacity: 1; visibility: visible; transform: translate(-50%, 0);
            transition: opacity 0.35s ease, transform 0.35s ease, visibility 0s; }
        }
      `}</style>
    </header>
  )
}
