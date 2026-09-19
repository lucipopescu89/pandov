# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # dev server on :3000 (also the "dev" config in .claude/launch.json)
pnpm build      # next build — type-checks as it goes
pnpm start      # serve the production build
pnpm typecheck  # tsc --noEmit, on its own
```

There is no test suite and no linter. The build is the gate: `typescript.ignoreBuildErrors` was removed on 2026-09-18, so a build that passes is a build whose types are sound. Don't put it back.

`images.unoptimized: true` remains, so `next/image` serves files exactly as they sit in `public/` — a 3MB photo is 3MB on the wire. Export images at the width they are drawn at, or a little over for finer screens.

## Architecture

Next.js App Router (Next 16, React 19, Tailwind 4, `@/*` → repo root). Server Components by default; only components that need scroll, canvas or state carry `"use client"`.

### Figma SVG exports are treated as data, not as assets

This is the core idea of the codebase and it is not visible from the file tree. Artwork exported from Figma lands in `public/images/` as raw SVG. Server components read that SVG off disk at render time and run it through **pure string transforms in `lib/`** that cut it into layers a browser can composite cheaply. The output is injected with `dangerouslySetInnerHTML`; a client component then drives the motion.

The reason for all of it: animating `<g>` groups inside a single SVG makes the browser repaint every path in that SVG on every frame. Cut into separate small `<svg>`s or masked layers, each piece is rasterised once and moved on the GPU.

| Module | Transform | Driven by |
|---|---|---|
| `lib/mechanism.ts` | `splitMechanism` — cuts a concentric artwork into rings by radius, each into its own cropped `<svg>` | `components/mechanism-field.tsx` |
| `lib/reveal.ts` | `splitReveal` — lifts a class of strokes onto their own layer under a repeating gradient mask, so a band of light climbs them by moving only `mask-position` | `components/particle-field.tsx` |
| `lib/wings.ts` | `splitWings` — reads a bird out of 199 ungrouped sibling paths and bands the plumage by distance from the shoulder, so bands lag outward | (no consumer at present) |
| `lib/radiant.ts` | `splitRadiant` — measures the closing ornament's fifteen contours and ranks them from the centre out, each carrying the room it has to its neighbour | `components/chess-set-statement.tsx` |

Motion is declarative: a `RingSpec[]` / `RevealSpec` / `WingSpec` describes *what moves how*, and the field component turns that into transforms, keyframes or canvas sprites. Add a ring or a reveal by writing a spec, not by hand-editing the SVG.

**Read the file-header doc comments in `lib/` before changing any of this.** They record approaches that were tried and failed (an SVG mask inside the artwork that repainted 164 gradient strokes per frame; a ground-coloured shade that produced 8-bit banding stripes). The comments are the design record.

#### A Figma export's photograph is lifted out before it is committed

Because the SVG is inlined into the page, everything inside it is paid for twice on every visit: once in the HTML and once again in the React Server Components payload, which carries the same string so the browser can re-render the tree. Figma embeds the pendant photograph in the export as a `data:image/png;base64` URI, and on `/body/second-wind` those seven photographs came to 13MB of a 15MB document — 86% of the page, uncacheable, re-sent every time.

On 2026-09-19 each one was decoded into a sibling file and the `<image xlink:href>` repointed at it (`icarus.svg` → `/images/body/icarus-pendant.webp`), leaving the export otherwise byte-for-byte as Figma wrote it. The document went from 15MB to 1.6MB, and the photographs became ordinary cacheable files like every other image on the site — 4.05MB of PNG re-encoded to 0.63MB of WebP on the way.

**A fresh export from Figma will arrive with the photograph embedded again.** Lift it out before committing: decode the one `data:image/png;base64` value, save it as `<name>-pendant.webp` beside the SVG, and leave `/images/body/<name>-pendant.webp` in its place.

Two things about that photograph, both of which have caught someone already:

**Keep its pixel dimensions.** The `<image width/height>` in the SVG is the photograph's own size and the two are expected to match. It is tempting to read 415–659px wide as oversized for a phone, but the opposite is true here: under `PENDANT_MAX_W` the pendant is scaled to `PENDANT_SCALE` (1.2×) and the mobile crop draws the canvas wider than the page — about 1207px on a 390px phone — so the photograph is drawn *larger* there, not smaller. On a 2× desktop screen it lands at roughly its native width. There is nothing to gain by resizing and detail to lose.

**Encode it at WebP quality 93, not the default 80.** These are gold on a near-black ground. The dark ground survives heavy compression untouched — no banding down to q70 — but the metal's grain is the first thing to go, and it is the whole subject. Retained grain, measured as high-frequency energy over the lit pixels of Emperor: 92.8% at q70, 95.8% at q78, 98.2% at q82, 98.9% at q90, 99.3% at q93. The curve is flat above 90 and the file is a sixth of the PNG either way, so there is no reason to economise past it. The alpha channel in all seven is fully opaque; the encoder drops it, and that is correct — it is an empty channel going, not a cut-out.

That weight is not only a bandwidth question. React begins hydrating before the page has settled, and if it has to block on data part-way in it re-runs the render with its hydration cursor already inside `<main>` — which it then reports as "Hydration failed because the server rendered HTML didn't match the client", pointing at `<main>` although nothing in the markup differs. On a 15MB page that happened on roughly three quarters of production loads; at 1.6MB it stopped. Keep this page small.

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

One exception the author has set, deliberately: `/mind/chess-set` ends on the six dots of the pieces gallery and gives the bottom menu 44px more room above it than the rest of the site — 130px from the dots to the logo on a desktop, 106 on a phone — because a row of small marks needs more air under it than a photograph's edge does. It lives as a `margin-bottom` on `.chess-pieces-section`. Don't "correct" it back.

## Conventions

- **Julius Sans One is the display face for everything.** `app/layout.tsx` adds an explicit Google Fonts `<link>` for it, because inline Figma SVG `<text>` elements reference the literal family name and can't see a `next/font` alias — that `<link>` is what makes the SVG captions render correctly. The `next/font` instances in the same file are assigned to `_`-prefixed variables and never applied to an element; `app/globals.css` reaches the families by literal name through `--font-sans` / `--font-heading` instead.
- **Brand values:** `#888888` for logo and menu links, `#202020` for the dark ground, `#fff` for the light pages. The logo SVGs ship with a baked-in `fill="#202020"` and render through `next/image` (an `<img>`), so they're recoloured with `filter: brightness(0) invert(53.33%)` — see the comment in `components/navigation.tsx` before touching it.
- **Inline `style` objects carry the Figma-exact numbers** (`clamp()` sizes, letter-spacing, px offsets); Tailwind is used for coarse layout and responsive visibility. Don't convert one into the other while doing something else.
- **There is one top menu and one bottom menu, and pages may not restyle them.** `Navigation` and `BodyFooter` carry their own padding, logo scale, colour, type and spacing; a page renders `<BodyFooter />` bare and passes `Navigation` nothing but `bgColor`, the band behind it. There is deliberately no `compact`, `dark` or `linkColor` prop any more — each existed, each was used on exactly one page, and together they are why the bottom of the site changed voice when you left the homepage. Don't reintroduce per-page padding wrappers either. `html` carries `scrollbar-gutter: stable` so the centre line doesn't move between a page that scrolls and one that doesn't.
- `--radius: 0rem` in `app/globals.css` — square corners are deliberate.
- Comments here are long, explain *why*, and name the alternative that was rejected. Match that register rather than annotating syntax.

## Known state of the tree

The v0 scaffolding was cleared out on 2026-09-18: `components/ui/` (57 shadcn files), `hooks/`, `styles/globals.css`, `lib/utils.ts`, six unused components, the `zz-*` verification routes, `components.json`, `scripts/`, and 43 npm packages nothing imported. Every component in `components/` is now live, and `package.json` lists only what the code actually uses. If something looks unused now, it probably is — check before assuming otherwise.

- **Every image the site shows is a file in `public/`.** The last seven external Vercel Blob URLs were brought in on 2026-09-18. Don't reintroduce one: that storage belongs to an abandoned v0 project, and an image that lives there has no copy in this repo to restore from. On 2026-09-19 the last seven that were not files — the pendant photographs Figma had embedded in the body SVGs as base64 — were lifted out into `public/images/body/*-pendant.webp`; see the note under the Figma section above before re-exporting any of them, it records the encoding settings and why they are what they are.
- The nav links to `/space`, but `app/space/` does not exist — that link still 404s. It is the one known defect left, waiting on a decision about the Space collection.
- `public/logo-pandov.{svg,png}`, `public/logo-pandov-icon.png`, `public/images/home/product-{1,a}.png`, `public/images/body/meditation.svg` and `public/images/second-wind-presentation.svg` are the author's own artwork and brand files that no page currently renders. They are kept deliberately. The live logos are `/logo-icon.svg` and `/logo-text.svg`.
- `BACKUP_SNAPSHOT_2026-04-11.md` is a historical snapshot; parts of its TODO list are already done. Treat it as a record, not as a spec.
