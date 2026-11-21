"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { clamp01, smooth, ramp, words as wordsAt, arriveOpacity } from "@/lib/making-rhythm"

/**
 * Heavy Light, from drawing to model, on /making (2026-11-19, the author's
 * asking, in eight points). It comes after the sketches and before the last
 * words: the photograph "Heavy Light WIP steps" (the wooden piece on its
 * table) held still, and the piece's four 3D models turning a quarter round
 * beside it, each from the front to the side, played by the scroll.
 *
 *  1. **1_Model first, slowly** (`SEQ[0]`, fewer frames per scroll, so the turn
 *     reads smooth), while the words come and go.
 *  2. Once the words are gone, **2_Model, 3_Model and 4_Model one after the
 *     other**, each faster than 1_Model (`SEQ[1..3]`), overlapping, so the
 *     passage does not grow long; each comes up out of full transparency.
 *  3. **Their opacities**: each starts invisible and reaches its own by the end
 *     of its turn: 1 → 30%, 2 → 50%, 3 → 65%, 4 → 100% (`SEQ[].opacity`), a soft
 *     gradient from the photograph outwards.
 *  4. **Grouped**: the four stand in one group (`.mk-hl-group`) that can be
 *     moved and scaled as one (`GROUP`).
 *  5. **Fixed to the photograph by their bases**: every place is in the
 *     photograph's own pixels (4326 × 2214); the models stand on the wooden
 *     piece's base line (`BASE_Y`), at its height (`K`: 4_Model is the same
 *     piece, so it is drawn as tall as the photographed one). The group scales
 *     about that line, so the bases stay on the table, and moves only
 *     sideways (`GROUP.dx`); never up or down.
 *  6. They come in from right to left: 1 is the farthest right, 4 the nearest
 *     the photograph. Their places are the author's mock-up "Heavy Light
 *     Secvente Making.jpg", brought onto the photograph by the wooden piece
 *     (the same piece is in both).
 *  7. The page's dark comes over it all at its end, and the last words come up
 *     out of it (as they did over the sketches until this day).
 *  8. The passage will be laid out again with the others for the page as a
 *     whole: what to change is in `FILL`, `GROUP` and `SEQ`.
 *
 * **Later the same day** (the author's asking, the page's one rhythm,
 * `lib/making-rhythm.ts`): the scene stands in the found wood's frame (`--h1`
 * tall at most, not the window's height); its words fade as all the words do,
 * by opacity alone (they rose 18px as they came until then); and **the end
 * stays white**: the scene goes into the page's white, not its dark, and the
 * last words come on white (point 7 above no longer holds). And **1_Model comes
 * in with the photograph**, at its own opacity, and stands still a moment
 * before it turns (`SEQ[0].from` 0.3, 0.1 before; it came up with its turn
 * until then).
 *
 * The frames are light rather than sharp, the author's asking (a smooth turn
 * matters more): AVIF at a low quality, 800 px tall on a computer, 540 on a
 * phone, transparent so their shadows fall on the photograph
 * (`scripts/making-heavy.py`). Each model is a canvas; between two frames the
 * next is laid over the last by how far the scroll has gone (a true
 * cross-fade, `lighter`, so the figure never thickens), and at rest each
 * glides to a whole frame, as the turning piece does (`making-harag.tsx`).
 *
 * The phone (2026-11-19, the author's asking) will have only two of the
 * sequences, laid out later; for now it shows the same scene, fitted to the
 * width.
 */

/* ── The photograph, and what of it is shown ─────────────────────────────── */

/** The photograph, px. */
const STILL = { w: 4326, h: 2214 }
/**
 * The ensemble, centred on the screen (2026-11-19, the author's asking): from
 * the left edge of the wooden piece on the photograph (1211) to the right edge
 * of 1_Model at the end of its turn (4664), in the photograph's px. It takes
 * `FILL` of the scene's width, and the scene is centred in the window, so the
 * middle of the ensemble is the middle of the screen. The photograph runs on
 * to the left of it as far as the window goes (its own left edge, near white
 * already, fades into the page's white, should a wide window reach it); right
 * of the photograph is the page's white. (Until then the scene began at 330
 * of the photograph, held to the window's left edge.)
 */
const ENSEMBLE = { x0: 1211, x1: 4664 }
const FILL = 0.775
const VIEW = (() => {
  const w = (ENSEMBLE.x1 - ENSEMBLE.x0) / FILL
  const x0 = (ENSEMBLE.x0 + ENSEMBLE.x1) / 2 - w / 2
  return { x0, x1: x0 + w }
})()
/** The wooden piece's base on the photograph, px from its top. */
const BASE_Y = 1955
/** Rendered px to the photograph's px: 4_Model (the same piece) as tall as the photographed piece. */
const K = 1.92

/**
 * The group of four, moved and scaled as one, about the bases: `dx` in the
 * photograph's px (sideways only), `scale` 1 as the mock-up.
 */
const GROUP = { dx: 0, scale: 1 }

/* ── The four turns ──────────────────────────────────────────────────────── */

const FRAMES = 28
const SOURCE_H = 1084
/**
 * Each model: where its frame stands (`left`, px on the photograph; its
 * rendered base row `base`, px of the 1084-tall render), when it turns
 * (`from` → `to`, in windows of scroll since the passage was fixed in the
 * window) and the opacity it reaches. `base` is the last row where the object
 * itself is fully opaque (2026-11-19, the author's asking: set first to the
 * last row of the render's soft reflection under it, ~10 px lower, the models
 * stood ~20 px of the photograph above the table, and the perspective looked
 * wrong). 1_Model takes 1.5 windows for its 28 frames, the others 0.9, each
 * starting 0.4 after the one before (2026-11-19, the author's asking: the
 * passage took too much scrolling; it was 2.5 and 1.5, held 7 windows in
 * all, now 4.2).
 */
const SEQ = [
  { id: "1", w: 373, left: 4004, base: 1003, from: 0.3, to: 1.7, opacity: 0.3, phone: null },
  { id: "2", w: 374, left: 3277, base: 1011, from: 1.3, to: 2.2, opacity: 0.5, phone: null },
  { id: "3", w: 374, left: 2570, base: 1006, from: 1.5, to: 2.4, opacity: 0.65, phone: { left: 1816, from: 0.3, to: 1.5 } },
  { id: "4", w: 373, left: 1816, base: 1001, from: 1.7, to: 2.6, opacity: 1, phone: null },
] as const
/**
 * 2026-11-19, later (the author's asking: "they should be opaque much sooner,
 * so many more of their frames turn while they are"): 2_Model, 3_Model and
 * 4_Model come in one after the other from right to left, closer together
 * (0.2 of a window apart, 0.4 until then, so the leftmost is there much
 * sooner), and each is at its own opacity `APPEAR` windows after it begins to
 * come, `APPEAR_LEAD` before its turn begins: its whole turn is seen at its
 * opacity but the first few frames. (Until then each reached it only at the
 * end of its turn.)
 */
const APPEAR_LEAD = 0.1
const APPEAR = 0.25

/**
 * A phone (2026-11-19, the author's asking, twice that morning): only
 * 3_Model, where 4_Model stands on a computer, with its own turn (`phone`
 * above), and the scene scaled up so that the sculpture and it fill the
 * width, as far from the right edge as the sculpture is from the left
 * (`PHONE_VIEW`, `PHONE_FILL`), as tall as leaves room for the words above it
 * (`.72` of the window, standing low in it). The words stand high in the
 * window and come sooner, as the scene comes. On white: the page goes white
 * behind it after the scan (`.mk-bg-veil`, making-page.tsx). The passage is
 * shorter (`--s5` 280vh), and the white comes sooner (`PHONE_DUSK`).
 */
const PHONE_FILL = 0.94
const PHONE_VIEW = (() => {
  const x0e = ENSEMBLE.x0
  // The model's own right edge, not its frame's: 0.81 of the render's width
  // (measured on 3_Model's frames, opaque past half; 2026-11-19, the author's
  // asking: as far from the right edge as the sculpture, whose left edge is
  // 1211, is from the left).
  const x1e = 1816 + 0.81 * 374 * K
  const w = (x1e - x0e) / PHONE_FILL
  const x0 = (x0e + x1e) / 2 - w / 2
  return { x0, x1: x0 + w }
})()
const PHONE_DUSK = [1.55, 1.95] as const

/** The words: in and out, in windows of scroll. They are gone before 2_Model begins. */
const WORDS = { in: [0.05, 0.3], out: [0.95, 1.25] } as const
/**
 * The page's white over it all, in windows: done before the last screen
 * (`.mk-end` in making-page.tsx, the last words and the bottom menu) comes up
 * over its last window. The last words were this passage's own until later on
 * 2026-11-19.
 */
const DUSK = [3.0, 3.45] as const
/**
 * While the page flows (`.mk-flow`): once the models have turned it goes up
 * with the page and into the white at once, over this many windows of its
 * way up (2026-11-19, the author's asking); the last words come only when the
 * white is nearly done (`LAST_IN_FLOW`, making-scroll.tsx).
 */
const RISE_WHITE = 0.4
/** How long it is held, in windows (the section is this many windows taller than the window: `--s5`). */
export const HEAVY_HELD = 4.2

const PHONE = "(max-width: 767px)"
const SETS = {
  computer: { dir: "/images/making/heavy/800", h: 800 },
  phone: { dir: "/images/making/heavy/540", h: 540 },
}
/** Bump with a new export, so browsers fetch the new frames. */
const VERSION = 6
/** The picture follows the scroll with this time constant, ms; still this long, ms, and it settles on whole frames. */
const FOLLOW_MS = 70
const REST_MS = 140

/* Places as shares of the view, %; and of a phone's view. */
const VW = VIEW.x1 - VIEW.x0
const px = (x: number) => `${(((x - VIEW.x0) / VW) * 100).toFixed(4)}%`
const PVW = PHONE_VIEW.x1 - PHONE_VIEW.x0
const ppx = (x: number) => `${(((x - PHONE_VIEW.x0) / PVW) * 100).toFixed(4)}%`
const py = (y: number) => `${((y / STILL.h) * 100).toFixed(4)}%`
const GROUP_X = (SEQ[3].left + SEQ[0].left + SEQ[0].w * K) / 2

type Frame = ImageBitmap | HTMLImageElement

async function loadFrame(url: string): Promise<Frame> {
  const img = new Image()
  img.decoding = "async"
  img.src = url
  await img.decode()
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(img)
    } catch {
      /* fall back to the image itself */
    }
  }
  return img
}

export function MakingHeavy({ words }: { words: React.ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stillRef = useRef<HTMLImageElement>(null)
  const wordsRef = useRef<HTMLParagraphElement>(null)
  const duskRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const still = stillRef.current
    const wordsEl = wordsRef.current
    const dusk = duskRef.current
    const canvases = canvasRefs.current
    if (!section || !stage || !still || !wordsEl || !dusk || canvases.some((c) => !c)) return
    const phone = window.matchMedia(PHONE).matches
    const flowing = !!section.closest(".mk-flow")
    const set = phone ? SETS.phone : SETS.computer

    const models = SEQ.map((s, m) => {
      const canvas = canvases[m] as HTMLCanvasElement
      canvas.width = Math.round((s.w * set.h) / SOURCE_H)
      canvas.height = set.h
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.imageSmoothingQuality = "high"
      return {
        s,
        canvas,
        ctx,
        frames: new Array<Frame | undefined>(FRAMES),
        target: 0,
        shown: 0,
        drawn: "",
      }
    })

    let lastMove = 0
    let raf = 0
    let tick = 0
    let prevT = 0
    let alive = true

    const draw = (md: (typeof models)[number]) => {
      const { ctx, canvas, frames } = md
      if (!ctx) return
      const pos = Math.max(0, Math.min(FRAMES - 1, md.shown))
      const i = Math.floor(pos)
      const f = pos - i
      let a = frames[i]
      if (!a) for (let d = 1; d < FRAMES && !a; d++) a = frames[i - d] ?? frames[i + d]
      if (!a) return
      const b = f > 0.002 && i < FRAMES - 1 ? frames[i + 1] : undefined
      const mix = b ? smooth(f) : 0
      const key = `${i}:${frames[i] ? 1 : 0}:${b ? mix.toFixed(3) : "-"}`
      if (key === md.drawn) return
      md.drawn = key
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // A true cross-fade of two transparent frames: summed, each by its share.
      ctx.globalCompositeOperation = "lighter"
      ctx.globalAlpha = 1 - mix
      ctx.drawImage(a, 0, 0, canvas.width, canvas.height)
      if (b && mix > 0.002) {
        ctx.globalAlpha = mix
        ctx.drawImage(b, 0, 0, canvas.width, canvas.height)
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = "source-over"
    }

    // What was last written, so a scroll that changes nothing writes nothing.
    const written: Record<string, string> = {}
    const style = (el: HTMLElement, key: string, prop: string, value: string) => {
      if (written[key] === value) return
      written[key] = value
      el.style.setProperty(prop, value)
    }

    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const r = section.getBoundingClientRect()
      // Coming up into the window, as every picture on the page comes; then
      // held, in windows of scroll.
      const come = clamp01((vh * 0.92 - r.top) / (vh * 0.92))
      const u = Math.max(0, -r.top) / vh

      style(still, "still", "opacity", arriveOpacity(come).toFixed(3))
      models.forEach((md, m) => {
        if (phone && !md.s.phone) return
        const from = phone && md.s.phone ? md.s.phone.from : md.s.from
        const to = phone && md.s.phone ? md.s.phone.to : md.s.to
        const p = clamp01((u - from) / (to - from))
        const t = p * (FRAMES - 1)
        if (t !== md.target) {
          md.target = t
          lastMove = performance.now()
        }
        // Up out of full transparency, most of the way early in its turn, and its own opacity by its end.
        // 1_Model comes with the photograph instead, at its own opacity, and is
        // seen still before it turns (2026-11-19, the author's asking).
        // The others: at their opacity a little after they begin to turn (`APPEAR`).
        const o = m === 0 ? md.s.opacity * arriveOpacity(come) : md.s.opacity * smooth((u - (from - APPEAR_LEAD)) / APPEAR)
        style(md.canvas, `o${m}`, "opacity", o.toFixed(3))
      })

      // A phone: the words from before it is held, as the scene comes.
      style(wordsEl, "w", "opacity", (phone ? wordsAt(-r.top / vh, -0.2, 1.25) : wordsAt(u, WORDS.in[0], WORDS.out[1])).toFixed(3))


      // The white over the scene (the page's own ground here).
      // While the page flows (`.mk-flow`) it goes up with the page once its
      // models have turned, going into the white as it rises (`RISE_WHITE`).
      const dk = phone ? PHONE_DUSK : DUSK
      const held = Math.max(0, (r.height - vh) / vh)
      style(dusk, "d", "opacity", (flowing ? ramp(u - held, 0, RISE_WHITE) : ramp(u, dk[0], dk[1])).toFixed(3))

      if (!tick) {
        prevT = 0
        tick = requestAnimationFrame(follow)
      }
    }

    // Each turn after the scroll: a touch behind it while it moves, onto a whole frame once it rests.
    const follow = (t: number) => {
      tick = 0
      const dt = prevT ? Math.min(64, t - prevT) : 16
      prevT = t
      const resting = t - lastMove > REST_MS
      let moving = false
      for (const md of models) {
        const goal = resting ? Math.round(md.target) : md.target
        md.shown += (goal - md.shown) * (1 - Math.exp(-dt / FOLLOW_MS))
        if (Math.abs(goal - md.shown) < 0.004) md.shown = goal
        else moving = true
        draw(md)
      }
      if (!resting || moving) tick = requestAnimationFrame(follow)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    // Fetch the frames once the passage is near: each model's first frame, then 1_Model's turn, then the others', a few at a time.
    let started = false
    const start = () => {
      if (started) return
      started = true
      const order: [number, number][] = []
      // A phone fetches only the two it shows.
      const shown = models.map((md, m) => (phone && !md.s.phone ? -1 : m)).filter((m) => m >= 0)
      shown.forEach((m) => order.push([m, 0]))
      shown.forEach((m) => {
        for (let i = 1; i < FRAMES; i++) order.push([m, i])
      })
      let next = 0
      const pump = async () => {
        while (alive && next < order.length) {
          const [m, i] = order[next++]
          const md = models[m]
          const url = `${set.dir}/${md.s.id}-${String(i).padStart(2, "0")}.avif?v=${VERSION}`
          await loadFrame(url).then(
            (fr) => {
              if (!alive) return
              md.frames[i] = fr
              md.drawn = ""
              draw(md)
            },
            () => {},
          )
        }
      }
      for (let k = 0; k < 4; k++) pump()
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          start()
          io.disconnect()
        }
      },
      { rootMargin: "200% 0px" },
    )
    io.observe(section)

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      alive = false
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (tick) cancelAnimationFrame(tick)
      models.forEach((md) =>
        md.frames.forEach((f) => {
          if (f && "close" in f) f.close()
        }),
      )
    }
  }, [])

  const frameH = (SOURCE_H * K) / STILL.h
  return (
    <section ref={sectionRef} className="mk-hl" data-mk="heavy" aria-label="Heavy Light, from the wooden piece to its 3D models">
      <style>{CSS}</style>
      <div ref={stageRef} className="mk-hl-stage">
        <div className="mk-hl-scene">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={stillRef}
            className="mk-hl-still"
            src="/images/making/heavy/still-2400.avif?v=2"
            srcSet="/images/making/heavy/still-1400.avif?v=2 1400w, /images/making/heavy/still-2400.avif?v=2 2400w"
            sizes="100vw"
            alt="Heavy Light, a carved wooden figure with a brass sphere, standing on a stone table"
            loading="lazy"
            style={
              {
                "--l": px(0),
                "--w": `${((STILL.w / VW) * 100).toFixed(4)}%`,
                "--pl": ppx(0),
                "--pw": `${((STILL.w / PVW) * 100).toFixed(4)}%`,
              } as React.CSSProperties
            }
          />
          {/* The four models, one group, scaled about the bases and moved only sideways. */}
          <div
            className="mk-hl-group"
            style={{
              transform: `translateX(${((GROUP.dx / VW) * 100).toFixed(4)}%) scale(${GROUP.scale})`,
              transformOrigin: `${px(GROUP_X)} ${py(BASE_Y)}`,
            }}
          >
            {SEQ.map((s, m) => (
              <canvas
                key={s.id}
                ref={(el) => {
                  canvasRefs.current[m] = el
                }}
                className="mk-hl-model"
                data-phone={s.phone ? "1" : "0"}
                aria-hidden="true"
                style={
                  {
                    "--l": px(s.left),
                    "--w": `${(((s.w * K) / VW) * 100).toFixed(4)}%`,
                    "--pl": ppx(s.phone ? s.phone.left : s.left),
                    "--pw": `${(((s.w * K) / PVW) * 100).toFixed(4)}%`,
                    top: py(BASE_Y - s.base * K),
                    height: `${(frameH * 100).toFixed(4)}%`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <p ref={wordsRef} className="mk-hl-words" style={{ left: px(2057), top: py(373) }}>
            {words}
          </p>
        </div>
        <div ref={duskRef} className="mk-hl-dusk" aria-hidden="true" />
      </div>
    </section>
  )
}

const CSS = `
/* On the page's dark since 2026-11-21 (the author's asking; white until then), and later that day the author's
   photograph on the dark ("Heav Light _Black.jpg", scripts/making-heavy.py), the models' floors made dark shadows;
   the scene goes into the dark as it leaves (.mk-hl-dusk). The words light, on the dark. */
.mk-hl{position:relative;height:calc(var(--vh) + var(--s5));background:#202020}
.mk-hl-stage{position:sticky;top:0;height:var(--vh);overflow:hidden;background:#202020;display:flex;align-items:center;justify-content:center}
/* The scene: the ensemble and its margins, as large as the window allows, centred; the photograph runs on past its left side. */
.mk-hl-scene{position:relative;flex:none;width:min(100%, var(--h1) * ${(VW / STILL.h).toFixed(4)});aspect-ratio:${VW.toFixed(1)}/${STILL.h}}
.mk-hl-still{position:absolute;top:0;left:var(--l);width:var(--w);height:100%;max-width:none;display:block;opacity:0;will-change:opacity;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 7%);mask-image:linear-gradient(90deg,transparent 0,#000 7%)}
.mk-hl-group{position:absolute;inset:0;pointer-events:none}
.mk-hl-model{position:absolute;left:var(--l);width:var(--w);display:block;opacity:0;will-change:opacity}
.mk-hl-words{position:absolute;z-index:2;margin:0;color:#a7a29b;line-height:2.6;white-space:nowrap;opacity:0;will-change:opacity}
.mk-hl-dusk{position:absolute;inset:0;z-index:3;background:#202020;opacity:0;pointer-events:none}
@media (max-width:767px){
  .mk-hl{background:transparent}
  .mk-hl-stage{align-items:flex-end;padding-bottom:6vh;box-sizing:border-box}
  .mk-hl-scene{width:min(100%, var(--vh) * .68 * ${(PVW / STILL.h).toFixed(4)});aspect-ratio:${PVW.toFixed(1)}/${STILL.h}}
  .mk-hl-still,.mk-hl-model{left:var(--pl);width:var(--pw)}
  .mk-hl-model[data-phone="0"]{display:none}
  /* The words above the scene, as far above the sculpture's head (1.5% down the photograph) as the scan's words
     are above its picture (clamp(48px, 9vh, 80px), making-scan.tsx). */
  .mk-hl-words{position:absolute;left:calc(8vw - (100vw - 100%) / 2) !important;top:auto !important;bottom:calc(98.5% + clamp(48px, 9vh, 80px));
    white-space:normal;width:84vw;max-width:84vw;color:#a7a29b}
}
`
