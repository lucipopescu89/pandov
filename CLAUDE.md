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

On 2026-09-19 each one was decoded into a sibling file and the `<image xlink:href>` repointed at it (`icarus.svg` → `/images/body/icarus-pendant.avif`), leaving the export otherwise byte-for-byte as Figma wrote it. The document went from 15MB to 1.6MB, and the photographs became ordinary cacheable files like every other image on the site — 4.05MB of PNG re-encoded to 0.76MB of AVIF on the way. They went out as WebP that day and came back as AVIF the next; the paragraph on the format below is why, and it is the one of the three that cost something to find.

**A fresh export from Figma will arrive with the photograph embedded again.** Lift it out before committing: decode the one `data:image/png;base64` value, save it as `<name>-pendant.avif` beside the SVG, and leave `/images/body/<name>-pendant.avif` in its place.

Three things about that photograph, each of which has caught someone already:

**Keep its pixel dimensions.** The `<image width/height>` in the SVG is the photograph's own size and the two are expected to match. It is tempting to read 415–659px wide as oversized for a phone, but the opposite is true here: under `PENDANT_MAX_W` the pendant is scaled to `PENDANT_SCALE` (1.2×) and the mobile crop draws the canvas wider than the page — about 1207px on a 390px phone — so the photograph is drawn *larger* there, not smaller. On a 2× desktop screen it lands at roughly its native width. There is nothing to gain by resizing and detail to lose.

**Encode it as AVIF, not WebP.** These pendants are shot on the site's own ground, so a photograph's background *is* `#202020`, and it has to meet the page invisibly. Lossy WebP cannot hold that one value. It converts to YUV and back, and of every grey from 28 to 36, 32 — `#202020` exactly — is the only one that does not survive the trip: it returns as 31. Quality 100 does not help, because the loss is in the colour conversion and not in the quantiser. The seven went out as WebP on 2026-09-19 and left a pendant-shaped rectangle one step darker than the page around it — faint, but visible on a good screen and unmistakable once seen — and were re-encoded to AVIF on 2026-09-20. **Read the top-left pixel of whatever you produce before you commit it: it must be exactly 32,32,32.** Two alternatives were rejected. Near-lossless WebP is equally exact but costs 0.99MB against AVIF's 0.76MB and buys nothing else. A `mix-blend-mode: lighten` on the photograph is free, and is what the artwork was drawn around in Figma, but it would do nothing on `emperor.svg`: that pendant floats inside `.bp-float`, whose animated `transform` puts it on its own layer, and a blend there no longer sees the page behind it. It would also lift every shadow darker than the ground — between 1.4% and 3.6% of each photograph — flat up to `#202020`.

**Encode it at quality 90.** These are gold on a near-black ground. The ground survives heavy compression untouched, but the metal's grain is the first thing to go, and it is the whole subject. Retained grain, measured as high-frequency energy over the lit pixels and read across Icarus, Chaos and Emperor: 89.7–97.4% at AVIF q60, 94.5–98.3% at q70, 96.0–99.1% at q80, 98.7–99.3% at q90. Ninety holds what WebP q93 held before it and halves the mean error against the PNG on the way, the curve is flat above it, and the file is a fifth of the PNG, so there is no reason to economise past it. The alpha channel in all seven is fully opaque; the encoder drops it, and that is correct — it is an empty channel going, not a cut-out.

That weight is not only a bandwidth question. React begins hydrating before the page has settled, and if it has to block on data part-way in it re-runs the render with its hydration cursor already inside `<main>` — which it then reports as "Hydration failed because the server rendered HTML didn't match the client", pointing at `<main>` although nothing in the markup differs. On a 15MB page that happened on roughly three quarters of production loads; at 1.6MB it stopped. Keep this page small.

### Pendants in three dimensions (a trial, 2026-09-22)

`/body/second-wind/icarus` shows Icarus's model alone, turning in gold on Second Wind's ground. Clicking Icarus's photograph on Second Wind opens it; the pages are listed in `PENDANT_PAGES` in `body-presentation.tsx`, and the link is laid over the photograph by reading the export's own pattern rect. The viewer, `components/pendant-viewer.tsx`, is three.js, imported inside its effect so it never touches another page or the first paint. The gold is set in code, not taken from the export, and so is the dark studio it reflects, which turns with the camera. So is the satin finish: a grain generated at load from a fixed seed, so nothing is downloaded. The model has no texture coordinates, so the grain is projected onto it from three axes. The first grain was far too coarse and read as hammered foil; the file records both the old settings and the ones that replaced them. The file header gives the reasons, including the first room, which left the gold dark olive.

The models are `public/models/<name>.glb`, made from the collection's 3ds Max OBJ exports (`D:\PANDOV\2_BODY\1_SECOND_WIND\Export OBJ\`) with `node scripts/obj-to-glb.mjs "<in.obj>" public/models/<name>.glb`. The script records what it keeps and drops; Icarus came out at 269KB from a 4.2MB OBJ. The OBJs stay out of the repo.

### `components/body-presentation.tsx`

The whole `/body/second-wind` page in one ~650-line server component, and the most involved thing here. Two conventions govern it:

- **Everything is positioned as a percentage of a 1920-unit design canvas** (`CANVAS_W`), matching the Figma export, so the page scales fluidly while keeping the exact composition.
- **Mobile is a crop, not a shrink.** A phone sees a centred 620-unit window onto the canvas with the ornament running off both edges; from `PHONE_W` (390) up to `CROP_MEETS` (720) the canvas eases back down until it equals the page width and the desktop layout simply continues. There is no breakpoint — it is one expression.

### Scroll choreography

`hero-animation.tsx`, `making-section.tsx`, `categories-section.tsx` and friends drive animation from scroll position. Two conventions worth keeping:

- Beats are expressed as **durations in vh** (`DOORS_VH`, `TEXT1_OUT_VH`), not as absolute boundaries, so a beat can be lengthened without retuning every number after it.
- **A position that parts from the page's own motion is played by the browser, not written from a scroll handler.** The page moves the instant the wheel turns and a scroll listener only hears of it afterwards, so anything it moves is drawn one frame at the old place. When the element moves with the page that error is nearly nothing. When it is held back against the page, the error is the whole scroll step. The footer hand's settling jumped up and dropped back 44–91px per wheel notch that way, measured in Chrome. It is now a Web Animations `ScrollTimeline` animation (`components/footer.tsx`), exact to the frame. Never put `!important` on a property such an animation drives: Chrome then quietly stops running it in step with the scroll, and the jump comes back. Fades are fine from a handler; a frame late in strength does not show.
- Progress is always passed through a local `clamp01` that maps non-finite to 0. `scrolled / total` is `NaN` when the container and viewport measure equal (background tab, bfcache restore, prerender), `Math.max/min` propagate `NaN`, and every `<` against `NaN` is false — an unguarded `NaN` falls through to the last branch and reveals overlays that should be hidden.

### Page shape

`app/*/page.tsx` files are thin: export `metadata`, render one section component from `components/`. Put the work in the component.

## Brand rules

These are the author's rules, not inferences from the code. Where the code disagrees with them, the code is wrong.

**Two faces, by length of text.** Julius Sans One is the display face — logo, menus, titles, captions, any short line. **Assistant** is the face for longer running text — paragraphs, descriptions, anything that is read rather than glanced at. Never set a paragraph in Julius Sans One. *(As of 2026-09-18 Assistant is not loaded or referenced anywhere in the codebase; the rule is recorded ahead of its implementation.)*

**The top menu and the bottom menu are centred, and they hold still between pages.** Logo and menu are centred on the page on every route, and a visitor moving from one page to another must not see them shift, resize or re-space. Anything that changes the centre line (a scrollbar appearing on one page and not another) or the rhythm (different padding above and below the bottom menu, a different logo size, different type) is a bug, not a per-page choice.

One exception the author has set, deliberately: `/mind/chess-set` ends on the six dots of the pieces gallery and gives the bottom menu 44px more room above it than the rest of the site — 130px from the dots to the logo on a desktop, 106 on a phone — because a row of small marks needs more air under it than a photograph's edge does. It lives as a `margin-bottom` on `.chess-pieces-section`. Don't "correct" it back.

**The gold of the pendants in three dimensions is one material, set by the author on 2026-09-22, and every pendant wears it.** It was arrived at on Icarus over several rounds, and the author asked for it to be kept as the standard:

- **Colour:** yellow gold, base colour `#EBD399` (linear 0.83, 0.65, 0.32). That is the metal's reflectance: on screen it reads deeper and warmer, because a metal shows the colour of what it reflects. It is the measured colour of pure gold, a tenth of the way toward grey and 15% darker. A paler gold a fifth of the way toward grey was tried and turned down.
- **Finish:** satin, roughness 0.3, with a fine grain and hairline scratches (a 12mm tile, tilt 0.35). A more matte 0.37 was tried and turned down.
- **Light:** reflections of a dark studio that turns with the viewer, shown with Khronos PBR Neutral tone mapping, on `#202020`.

All of it lives in the constants at the top of `components/pendant-viewer.tsx` (`GOLD`, `ROUGHNESS`, `GRAIN_TILE`, `GRAIN_STRENGTH`, `darkStudio`). Every pendant page renders through that one viewer, so a new pendant gets the gold without anything being set for it. Don't tune the material for one pendant; a change is a change to all seven, and it is the author's to make.

## Conventions

- **Julius Sans One is the display face for everything.** `app/layout.tsx` adds an explicit Google Fonts `<link>` for it, because inline Figma SVG `<text>` elements reference the literal family name and can't see a `next/font` alias — that `<link>` is what makes the SVG captions render correctly. The `next/font` instances in the same file are assigned to `_`-prefixed variables and never applied to an element; `app/globals.css` reaches the families by literal name through `--font-sans` / `--font-heading` instead.
- **Brand values:** `#888888` for logo and menu links, `#202020` for the dark ground, `#fff` for the light pages. The logo SVGs ship with a baked-in `fill="#202020"` and render through `next/image` (an `<img>`), so they're recoloured with `filter: brightness(0) invert(53.33%)` — see the comment in `components/navigation.tsx` before touching it.
- **Inline `style` objects carry the Figma-exact numbers** (`clamp()` sizes, letter-spacing, px offsets); Tailwind is used for coarse layout and responsive visibility. Don't convert one into the other while doing something else.
- **There is one top menu and one bottom menu, and pages may not restyle them.** `Navigation` and `BodyFooter` carry their own padding, logo scale, colour, type and spacing; a page renders `<BodyFooter />` bare and passes `Navigation` nothing but `bgColor`, the band behind it. There is deliberately no `compact`, `dark` or `linkColor` prop any more — each existed, each was used on exactly one page, and together they are why the bottom of the site changed voice when you left the homepage. Don't reintroduce per-page padding wrappers either. `html` carries `scrollbar-gutter: stable` so the centre line doesn't move between a page that scrolls and one that doesn't.
- `--radius: 0rem` in `app/globals.css` — square corners are deliberate.
- Comments here are long, explain *why*, and name the alternative that was rejected. Match that register rather than annotating syntax.

## Known state of the tree

The v0 scaffolding was cleared out on 2026-09-18: `components/ui/` (57 shadcn files), `hooks/`, `styles/globals.css`, `lib/utils.ts`, six unused components, the `zz-*` verification routes, `components.json`, `scripts/`, and 43 npm packages nothing imported. Every component in `components/` is now live, and `package.json` lists only what the code actually uses. If something looks unused now, it probably is — check before assuming otherwise.

- **Every image the site shows is a file in `public/`.** The last seven external Vercel Blob URLs were brought in on 2026-09-18. Don't reintroduce one: that storage belongs to an abandoned v0 project, and an image that lives there has no copy in this repo to restore from. On 2026-09-19 the last seven that were not files — the pendant photographs Figma had embedded in the body SVGs as base64 — were lifted out into `public/images/body/*-pendant.avif`; see the note under the Figma section above before re-exporting any of them, it records the encoding settings and why they are what they are.
- **Files in `public/videos/` are cached by browsers for a year** (`headers()` in `next.config.mjs`, added 2026-09-21: Vercel's default `max-age=0, must-revalidate` made phones check with the server before every play, piece by piece, so the Making and Contact videos started late even on a second visit). So a video or poster there is never replaced under the same URL: bump the `?v=` it is referenced with (`making-collections.tsx`, `contact-collections.tsx`), or returning visitors keep the old one.
- **Each background video has a phone cut beside it** (`*-phone.mp4`), chosen by a `<source media>` in `components/fade-in-video.tsx`: only the part of the frame a phone shows, so a phone stops downloading what it crops away. Replace a video, and cut its phone version again the same way (ffmpeg was installed with winget, Gyan.FFmpeg, on 2026-09-21):
  - Making: `-vf "crop=680:1200:160:300,scale=510:900:flags=lanczos"` — the middle the old 1.5× mobile zoom showed, at ¾ size. 449KB against 829KB.
  - Contact: `-vf "crop=540:720:370:0"` — the middle any screen up to 3:4 shows. 306KB against 713KB.
  - Both: `-c:v libx264 -preset veryslow -crf 30 -profile:v high -level:v 3.1 -pix_fmt yuv420p -fps_mode passthrough -movflags +faststart -an -map_metadata -1`. CRF 30 because the originals are x264 CRF 30 themselves (read from the settings string x264 writes into the file): encoded at 20–26 the cuts came out *larger* than the whole frames, spending bits on reproducing the originals' own compression. Leave the colour untagged, as the originals are, so a browser reads both alike; check the mean luma of cut and original agree (`signalstats`), as they did to within 0.05.
  - And each cut's still, `*-phone-poster.jpg`: its frame 15, 0.5s in, the moment every desktop poster was taken from — `-vf "select=eq(n\,15)" -frames:v 1 -q:v 3`. It is only shown where the iPhone refuses to play the video by itself (Low Power Mode, some apps' browsers); see `fade-in-video.tsx`, which also records why the footage was not turned into GIFs.
- The nav links to `/space`, but `app/space/` does not exist — that link still 404s. It is the one known defect left, waiting on a decision about the Space collection.
- `public/logo-pandov.{svg,png}`, `public/logo-pandov-icon.png`, `public/images/home/product-{1,a}.png`, `public/images/body/meditation.svg` and `public/images/second-wind-presentation.svg` are the author's own artwork and brand files that no page currently renders. They are kept deliberately. The live logos are `/logo-icon.svg` and `/logo-text.svg`.
- `BACKUP_SNAPSHOT_2026-04-11.md` is a historical snapshot; parts of its TODO list are already done. Treat it as a record, not as a spec.
