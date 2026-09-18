# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # dev server on :3000 (also available as the "dev" config in .claude/launch.json)
pnpm build    # next build
pnpm start    # serve the production build
```

There is no test suite. `pnpm lint` is declared in package.json but **eslint is not installed and no eslint config exists** — the script fails; don't rely on it.

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so a successful build proves nothing about types. Type-check explicitly:

```bash
pnpm exec tsc --noEmit
```

`images.unoptimized: true` is also set, so `next/image` serves files as-is — sizing and file weight are the author's responsibility.

## Architecture

Next.js App Router (Next 16, React 19, Tailwind 4, `@/*` → repo root). Server Components by default; only components that need scroll, canvas or state carry `"use client"`.

### Figma SVG exports are treated as data, not as assets

This is the core idea of the codebase and it is not visible from the file tree. Artwork exported from Figma lands in `public/images/` as raw SVG. Server components read that SVG off disk at render time and run it through **pure string transforms in `lib/`** that cut it into layers a browser can composite cheaply. The output is injected with `dangerouslySetInnerHTML`; a client component then drives the motion.

The reason for all of it: animating `<g>` groups inside a single SVG makes the browser repaint every path in that SVG on every frame. Cut into separate small `<svg>`s or masked layers, each piece is rasterised once and moved on the GPU.

| Module | Transform | Driven by |
|---|---|---|
| `lib/mechanism.ts` | `splitMechanism` — cuts a concentric artwork into rings by radius, each into its own cropped `<svg>` | `components/mechanism-field.tsx` |
| `lib/reveal.ts` | `splitReveal` — lifts a class of strokes onto their own layer under a repeating gradient mask, so a band of light climbs them by moving only `mask-position` | `components/particle-field.tsx` |
| `lib/wings.ts` | `splitWings` — reads a bird out of 199 ungrouped sibling paths and bands the plumage by distance from the shoulder, so bands lag outward | `components/winged-field.tsx` |

Motion is declarative: a `RingSpec[]` / `RevealSpec` / `WingSpec` describes *what moves how*, and the field component turns that into transforms, keyframes or canvas sprites. Add a ring or a reveal by writing a spec, not by hand-editing the SVG.

**Read the file-header doc comments in `lib/` before changing any of this.** They record approaches that were tried and failed (an SVG mask inside the artwork that repainted 164 gradient strokes per frame; a ground-coloured shade that produced 8-bit banding stripes). The comments are the design record.

### `components/body-presentation.tsx`

The whole `/body/second-wind` page in one ~650-line server component, and the most involved thing here. Two conventions govern it:

- **Everything is positioned as a percentage of a 1920-unit design canvas** (`CANVAS_W`), matching the Figma export, so the page scales fluidly while keeping the exact composition.
- **Mobile is a crop, not a shrink.** A phone sees a centred 620-unit window onto the canvas with the ornament running off both edges; from `PHONE_W` (390) up to `CROP_MEETS` (720) the canvas eases back down until it equals the page width and the desktop layout simply continues. There is no breakpoint — it is one expression.

### Scroll choreography

`hero-animation.tsx`, `making-section.tsx`, `categories-section.tsx` and friends drive animation from scroll position. Two conventions worth keeping:

- Beats are expressed as **durations in vh** (`DOORS_VH`, `TEXT1_OUT_VH`), not as absolute boundaries, so a beat can be lengthened without retuning every number after it.
- Progress is always passed through a local `clamp01` that maps non-finite to 0. `scrolled / total` is `NaN` when the container and viewport measure equal (background tab, bfcache restore, prerender), `Math.max/min` propagate `NaN`, and every `<` against `NaN` is false — an unguarded `NaN` falls through to the last branch and reveals overlays that should be hidden.

### Page shape

`app/*/page.tsx` files are thin: export `metadata`, render one section component from `components/`. Put the work in the component.

## Brand rules

These are the author's rules, not inferences from the code. Where the code disagrees with them, the code is wrong.

**Two faces, by length of text.** Julius Sans One is the display face — logo, menus, titles, captions, any short line. **Assistant** is the face for longer running text — paragraphs, descriptions, anything that is read rather than glanced at. Never set a paragraph in Julius Sans One. *(As of 2026-09-18 Assistant is not loaded or referenced anywhere in the codebase; the rule is recorded ahead of its implementation.)*

**The top menu and the bottom menu are centred, and they hold still between pages.** Logo and menu are centred on the page on every route, and a visitor moving from one page to another must not see them shift, resize or re-space. Anything that changes the centre line (a scrollbar appearing on one page and not another) or the rhythm (different padding above and below the bottom menu, a different logo size, different type) is a bug, not a per-page choice.

## Conventions

- **Julius Sans One is the display face for everything.** `app/layout.tsx` adds an explicit Google Fonts `<link>` for it, because inline Figma SVG `<text>` elements reference the literal family name and can't see a `next/font` alias — that `<link>` is what makes the SVG captions render correctly. The `next/font` instances in the same file are assigned to `_`-prefixed variables and never applied to an element; `app/globals.css` reaches the families by literal name through `--font-sans` / `--font-heading` instead.
- **Brand values:** `#888888` for logo and menu links, `#202020` for the dark ground, `#fff` for the light pages. The logo SVGs ship with a baked-in `fill="#202020"` and render through `next/image` (an `<img>`), so they're recoloured with `filter: brightness(0) invert(53.33%)` — see the comment in `components/navigation.tsx` before touching it.
- **Inline `style` objects carry the Figma-exact numbers** (`clamp()` sizes, letter-spacing, px offsets); Tailwind is used for coarse layout and responsive visibility. Don't convert one into the other while doing something else.
- **There is one top menu and one bottom menu, and pages may not restyle them.** `Navigation` and `BodyFooter` carry their own padding, logo scale, colour, type and spacing; a page renders `<BodyFooter />` bare and passes `Navigation` nothing but `bgColor`, the band behind it. There is deliberately no `compact`, `dark` or `linkColor` prop any more — each existed, each was used on exactly one page, and together they are why the bottom of the site changed voice when you left the homepage. Don't reintroduce per-page padding wrappers either. `html` carries `scrollbar-gutter: stable` so the centre line doesn't move between a page that scrolls and one that doesn't.
- `--radius: 0rem` in `app/globals.css` — square corners are deliberate.
- Comments here are long, explain *why*, and name the alternative that was rejected. Match that register rather than annotating syntax.

## Known state of the tree

- `components/ui/` holds 57 shadcn components and **nothing in the site imports any of them.** Same for `product-grid.tsx`, `collections.tsx`, `newsletter.tsx`, `theme-provider.tsx`, `winged-field.tsx`, and `chess-pieces-gallery.tsx` (kept only as a reference pointed at from a comment in `app/mind/chess-set/page.tsx`). Scaffolding from the v0 origin — don't assume a component is live because it exists.
- `styles/globals.css` is dead; nothing imports it. `app/globals.css` is the real stylesheet and the two have drifted.
- The nav links to `/space`, but `app/space/` does not exist — that link 404s.
- `app/zz-making-only/` and `app/zz-making-test/` are temporary verification routes, marked in-file for deletion.
- Roughly 20 image sources are external Vercel Blob URLs rather than files in `public/`.
- `scripts/backup-frames.sh` hardcodes `/vercel/share/v0-project` paths and only ran inside v0.
- `BACKUP_SNAPSHOT_2026-04-11.md` is a historical snapshot; parts of its TODO list are already done. Treat it as a record, not as a spec.
