"use client"

import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HURRY_TAP_MS, sendHurry } from "@/lib/hurry"

/**
 * The link over a pendant's photograph on /body/second-wind, which opens the
 * pendant's page (2026-11-13, the author's asking: the fields used to hurry
 * with scrolling).
 *
 * With `hurries`, a mouse over the photograph hurries the section's field and
 * leaving it lets the field ease back. A phone has no hover, so there a tap is
 * held back from the link: the field hurries for `HURRY_TAP_MS` and then the
 * page opens. A second tap while it hurries opens the page at once, and with
 * reduced motion asked for the tap opens it straight away, as it does on a
 * pendant whose section has nothing to hurry (Emperor). A mouse's
 * click is as ever. The same hold as Satori's (`components/satori-tap.tsx`).
 *
 * A mouse over it also dims the photograph under it to `HOVER_OPACITY`, as
 * Satori's photographs are on /body/satori, and brings it forward a little,
 * grown to `HOVER_SCALE` about its own middle (2026-11-14, the author's
 * asking). Both ride one way forward (0 → 1) that moves as a critically
 * damped spring (`SPRING_W`, back `SPRING_W_BACK`), as Satori's pendants come
 * forward: it sets off at once, settles softly and turns round from its own
 * pace if the pointer leaves mid-way (the first try that morning, CSS
 * transitions of 200 and 500ms, felt abrupt).
 *
 * The photograph is a pattern fill inside its section's artwork, which the
 * browser painted anew at every step of the growth, resampling its pixels a
 * little differently each time: it shimmered (the author's report, the same
 * morning). So with a mouse each photograph is laid over the artwork as a
 * plain image, as Satori's are (`layerFor`): the same file, placed exactly as
 * the pattern places it, in a box the size of the rect that cuts it back to
 * the rect (`div.bp-pendant-layer`, `overflow: hidden`), the box kept on a
 * layer of its own from the start (`will-change`), the original hidden where
 * it is. The growth and the dimming then only move that box. (A copy of the
 * rect on an SVG of its own, tried first, still trembled a little; the image
 * cut by a `clip-path` grew but, on the author's computer, no longer dimmed.)
 * Silence's dust reads the box (`public/pandov-fx.js`).
 */
const HOVER_OPACITY = 0.8
const HOVER_SCALE = 1.04
const SPRING_W = 3.2
const SPRING_W_BACK = 4

type Way = { p: number; v: number; target: number }
const ways = new WeakMap<Element, Way>()
const moving = new Set<HTMLElement | SVGElement>()
let raf = 0
let last = 0
/** Steps every moving photograph's spring and places it; runs while any moves. */
const tick = (now: number) => {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  for (const el of moving) {
    const w = ways.get(el)
    if (!w) {
      moving.delete(el)
      continue
    }
    const k = w.target ? SPRING_W : SPRING_W_BACK
    // in small steps, so it holds at any frame rate
    const steps = Math.max(1, Math.ceil(dt / 0.008))
    const h = dt / steps
    for (let q = 0; q < steps; q++) {
      w.v += (k * k * (w.target - w.p) - 2 * k * w.v) * h
      w.p += w.v * h
    }
    if (Math.abs(w.target - w.p) < 0.0005 && Math.abs(w.v) < 0.003) {
      w.p = w.target
      w.v = 0
      moving.delete(el)
    }
    if (w.p <= 0) {
      el.style.opacity = ""
      el.style.transform = ""
    } else {
      el.style.opacity = (1 - (1 - HOVER_OPACITY) * w.p).toFixed(4)
      el.style.transform = `scale(${(1 + (HOVER_SCALE - 1) * w.p).toFixed(5)})`
    }
  }
  raf = moving.size ? requestAnimationFrame(tick) : 0
}

const XLINK = "http://www.w3.org/1999/xlink"
const layers = new WeakMap<Element, HTMLDivElement>()
/** A `matrix(a b c d e f)` or `scale(x y)` as [sx, sy, tx, ty] (no rotation in these exports). */
const readTransform = (t: string | null): [number, number, number, number] => {
  const m = t?.match(/matrix\(([^)]+)\)/)
  if (m) {
    const [a, , , d, e, f] = m[1].split(/[\s,]+/).map(Number)
    return [a, d, e, f]
  }
  const sc = t?.match(/scale\(([^)]+)\)/)
  if (sc) {
    const [x, y = x] = sc[1].split(/[\s,]+/).map(Number)
    return [x, y, 0, 0]
  }
  return [1, 1, 0, 0]
}
/**
 * The photograph as an image of its own over the artwork, in its section's
 * box, the original rect hidden. Made once. The pattern fills the rect's box
 * (`objectBoundingBox`) with the image through its `<use>`'s transform, a
 * little larger than the box, so the image is placed in a box the size of the
 * rect by that transform, and the box cuts it back.
 */
function layerFor(rect: SVGRectElement): HTMLDivElement | null {
  const had = layers.get(rect)
  if (had?.isConnected) return had
  const svg = rect.ownerSVGElement
  const parent = svg?.parentElement
  const vb = svg?.viewBox.baseVal
  const id = rect.getAttribute("fill")?.match(/url\(#([^)]+)\)/)?.[1]
  const pattern = id ? document.getElementById(id) : null
  const use = pattern?.querySelector("use")
  const ref = (use?.getAttribute("href") || use?.getAttributeNS(XLINK, "href") || "").replace(/^#/, "")
  const image = ref ? document.getElementById(ref) : null
  const src = image?.getAttribute("href") || image?.getAttributeNS(XLINK, "href")
  if (!svg || !parent || !vb || !vb.width || !vb.height || !use || !image || !src) return null
  // Presence and Emperor move their photograph with a `<g transform="translate(…)">`
  const g = rect.parentElement
  const move = g && g.tagName.toLowerCase() === "g" ? g.getAttribute("transform") : null
  const t = move?.match(/translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/)
  const rx = rect.x.baseVal.value + (t ? +t[1] : 0)
  const ry = rect.y.baseVal.value + (t ? +t[2] : 0)
  const rw = rect.width.baseVal.value
  const rh = rect.height.baseVal.value
  const iw = Number(image.getAttribute("width"))
  const ih = Number(image.getAttribute("height"))
  if (!rw || !rh || !iw || !ih) return null
  // the image's place in the rect's box, as shares of it (from the pattern's transform)
  const [sx, sy, tx, ty] = readTransform(use.getAttribute("transform"))
  const pc = (v: number) => `${(v * 100).toFixed(4)}%`

  const box = document.createElement("div")
  box.className = "bp-pendant-layer"
  box.setAttribute("aria-hidden", "true")
  Object.assign(box.style, {
    position: "absolute",
    left: pc((rx - vb.x) / vb.width),
    top: pc((ry - vb.y) / vb.height),
    width: pc(rw / vb.width),
    height: pc(rh / vb.height),
    overflow: "hidden",
    pointerEvents: "none",
    willChange: "transform",
    transformOrigin: "50% 50%",
  })
  const img = document.createElement("img")
  img.src = src
  img.alt = ""
  img.decoding = "async"
  img.draggable = false
  Object.assign(img.style, {
    position: "absolute",
    left: pc(tx),
    top: pc(ty),
    width: pc(sx * iw),
    height: pc(sy * ih),
    maxWidth: "none",
    display: "block",
  })
  box.appendChild(img)
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative"
  svg.after(box)
  rect.style.visibility = "hidden"
  layers.set(rect, box)
  return box
}

/** The photographs (`rect.bp-pendant`) under the link's middle. */
function photosUnder(link: Element) {
  const canvas = link.closest(".bp-canvas")
  if (!canvas) return []
  const r = link.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  return [...canvas.querySelectorAll<SVGRectElement>("rect.bp-pendant")].filter((p) => {
    const b = p.getBoundingClientRect()
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
  })
}
const dim = (link: Element, on: boolean) => {
  for (const rect of photosUnder(link)) {
    // its own image; failing that, the rect itself (painted anew as it grows)
    const p: HTMLElement | SVGElement = layerFor(rect) ?? rect
    let w = ways.get(p)
    if (!w) {
      w = { p: 0, v: 0, target: 0 }
      ways.set(p, w)
      if (p === rect) {
        p.style.transformBox = "fill-box"
        p.style.transformOrigin = "center"
      }
    }
    w.target = on ? 1 : 0
    moving.add(p)
  }
  if (!raf && moving.size) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

export function PendantLink({
  href,
  label,
  hurries,
  className,
  style,
}: {
  href: string
  label: string
  hurries: boolean
  className?: string
  style?: CSSProperties
}) {
  const router = useRouter()
  const timer = useRef(0)
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // With a mouse, the photograph's own layer is made before the pointer comes
  // to it (made on the hover, it could move the photograph by a pixel as it
  // came): on the mouse's first move over the page, once the page has long
  // been put together by React (changed during that, the section's markup
  // would not match what the server sent).
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return
    const make = () => {
      const link = ref.current
      if (link) for (const rect of photosUnder(link)) layerFor(rect)
    }
    window.addEventListener("pointermove", make, { once: true, passive: true })
    return () => window.removeEventListener("pointermove", make)
  }, [])

  const enter = (e: PointerEvent) => {
    if (e.pointerType === "touch") return
    if (hurries) sendHurry(label, true)
    dim(e.currentTarget, true)
  }
  const leave = (e: PointerEvent) => {
    if (e.pointerType === "touch") return
    if (hurries) sendHurry(label, false)
    dim(e.currentTarget, false)
  }

  const tap = (e: MouseEvent) => {
    if (!hurries) return
    if (!window.matchMedia("(hover: none)").matches) return // a mouse: the link as ever
    if (timer.current) {
      // a second tap while it hurries: let the link open the page now
      window.clearTimeout(timer.current)
      timer.current = 0
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    e.preventDefault()
    sendHurry(label, true)
    timer.current = window.setTimeout(() => {
      timer.current = 0
      router.push(href)
    }, HURRY_TAP_MS)
  }

  return (
    <Link
      ref={ref}
      href={href}
      aria-label={label}
      className={className}
      style={style}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onClick={tap}
    />
  )
}
