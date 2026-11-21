/*
 * TEST ONLY — the whole site on #202020 (2026-11-20, the author's asking:
 * "tot backgroundul #202020 peste tot absolut", and every photograph shot on
 * white shown inside a #202020 frame, as if laid on a dark ground). A trial to
 * decide on, not a change to the site: no component was touched.
 *
 * This one script, loaded by one line in app/layout.tsx, repaints the page
 * after React has drawn it, and keeps repainting what scrolls into view:
 *   - every light, neutral background becomes its mirror around #202020:
 *     what stood N steps from white now stands N steps from #202020, so white
 *     becomes #202020 exactly and a pale rule a faint light rule;
 *   - dark text, dark SVG lines, pale gradients and borders are mirrored the
 *     same way, but only where what lies under them was light. That is read
 *     from the page itself (what is under the element's centre on screen), not
 *     from the code, because many layers are positioned over one another;
 *   - a photograph (img, video) whose edges are white gets a #202020 frame:
 *     it is drawn smaller inside its own box. The frame is CSS, so it is the
 *     page's #202020 exactly, on any monitor and any colour profile; a
 *     picture wider than its container is pulled in until the frame shows.
 *     A pale fade laid over such a photograph (it melted the photo into the
 *     white page) is taken away, so the photograph stands clean on the dark;
 *   - a drawing (SVG file, GIF, canvas) that is dark lines on a light ground,
 *     or a canvas painted on white, is mirrored with a filter.
 *
 * It runs only on localhost and the home network, never on the published
 * site, so a publish made before deciding changes nothing for visitors.
 * http://localhost:3000 shows the site as it is; http://127.0.0.1:3000 shows
 * it dark. Key "D" flips the version of the open tab for a moment (a reload
 * brings back the address's own version).
 * To remove the test: delete the <Script src="/pandov-dark-test.js"> line in
 * app/layout.tsx and this file. The site is then exactly as it was.
 */
(() => {
  const host = location.hostname
  const local =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  if (!local || window.__pandovDarkTest) return
  window.__pandovDarkTest = true

  const G = 32 // #202020
  const root = document.documentElement
  // Two addresses, two versions, side by side (the author's asking, the same
  // evening): http://localhost:3000 is the site as it is, and
  // http://127.0.0.1:3000 (the same server under its other name) is the dark
  // test. Each tab keeps its version from page to page; the address says which.
  let on = host === "127.0.0.1"
  const setOn = (v) => {
    on = v
    if (v) root.setAttribute("data-dk", "")
    else root.removeAttribute("data-dk")
  }

  // invert(p) maps white to 1 - p: p = 1 - 32/255 lands white on #202020.
  const MIRROR = "invert(0.8745) hue-rotate(180deg)"
  const css = document.createElement("style")
  css.id = "pandov-dark-test"
  css.textContent = `
html[data-dk], html[data-dk] body { background-color: #202020 !important; }
html[data-dk] [data-dkg] { background-color: var(--dk-bg) !important; }
html[data-dk] [data-dkgi] { background-image: var(--dk-gi) !important; }
html[data-dk] [data-dkh] { opacity: 0 !important; }
html[data-dk] [data-dkt] { color: var(--dk-c) !important; }
html[data-dk] [data-dkt]::placeholder { color: var(--dk-c) !important; opacity: .6; }
html[data-dk] [data-dkb] { border-color: var(--dk-bc) !important; }
html[data-dk] [data-dkf] { fill: var(--dk-fill) !important; }
html[data-dk] [data-dks] { stroke: var(--dk-stroke) !important; }
html[data-dk] [data-dkm] { filter: ${MIRROR} !important; }
html[data-dk] [data-dkp] {
  box-sizing: border-box !important;
  padding: var(--dk-pt) var(--dk-pr) var(--dk-pt) var(--dk-pl) !important;
  background-color: #202020 !important;
}
html[data-dk] [data-dkp="fill"] { object-fit: contain !important; }
html[data-dk] [data-dkc] { clip-path: inset(0 var(--dk-cr) 0 var(--dk-cl)) !important; }
html[data-dk] [data-dko] { opacity: 1 !important; }
`
  document.head.appendChild(css)
  setOn(on)

  /* ---------- colour ---------- */
  const parse = (s) => {
    const m = s && s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const light = (c) => (Math.max(c.r, c.g, c.b) + Math.min(c.r, c.g, c.b)) / 2
  const chroma = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  const mirror = (c) => {
    const L = light(c)
    const d = Math.min(255, 255 + G - L) - L
    return { r: clamp(c.r + d), g: clamp(c.g + d), b: clamp(c.b + d), a: c.a }
  }
  const str = (c) => (c.a >= 1 ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`)
  const neutral = (c) => c && chroma(c) <= 40
  const isLightNeutral = (c) => c && light(c) >= 150 && chroma(c) <= 40
  const isDark = (c) => c && light(c) < 140

  /* ---------- what each element was ---------- */
  const seen = new WeakMap()
  // Raised whenever a photograph is newly framed: what was decided from the
  // ground under it is decided again.
  let epoch = 0
  const origBg = (el) => {
    const s = seen.get(el)
    if (s && s.bg !== undefined) return s.bg
    return parse(getComputedStyle(el).backgroundColor)
  }

  // What was under this element before the test: "light", "dark", "plate" (a
  // white-ground photograph, now framed) or null when it is not on screen yet
  // (it is decided when it scrolls into view).
  const groundUnder = (el, byLayout = false) => {
    const r = el.getBoundingClientRect()
    const vw = innerWidth, vh = innerHeight
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, vw)
    const y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, vh)
    if (x1 - x0 < 1 || y1 - y0 < 1) {
      if (r.width < 1 && r.height < 1) return "none"
      return null
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const stack = document.elementsFromPoint(cx, cy)
    const i = stack.indexOf(el)
    for (let k = i >= 0 ? i + 1 : 0; k < stack.length; k++) {
      const e = stack[k]
      if (e === el || el.contains(e)) continue
      if (e === root || e === document.body) break // the page's own ground
      const t = e.tagName
      if (t === "IMG" || t === "VIDEO" || t === "CANVAS") {
        const s = seen.get(e)
        if (s && s.pic === "frame") {
          plates.push(e)
          if (shown(e) && onPhoto(e, cx, cy)) return "plate"
          continue // over the frame, or the photograph is faded out: look under it
        }
        // A canvas moves (the doors, the sun): it never decides; look under it.
        if (t === "CANVAS") continue
        // Read the very pixel under the point; where the picture is clear,
        // look under it.
        const c = pixelAt(e, cx, cy)
        if (c && c.a >= 128) {
          const k = { r: c.r, g: c.g, b: c.b, a: 1 }
          return light(k) >= 150 ? "light" : "dark"
        }
        continue
      }
      const c = origBg(e)
      if (c && c.a >= 0.5) {
        if (byLayout) break
        return light(c) >= 150 ? "light" : "dark"
      }
    }
    if (byLayout) return groundByLayout(el)
    return "light" // the page's own ground, which was white
  }
  // For words: the ground is what holds them in the page (the nearest
  // ancestor with a background), unless a photograph lies under them. Read
  // from the screen alone, a word caught mid-scroll over the doors' dark
  // would be judged by a moment, not by where it rests.
  const groundByLayout = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== root; p = p.parentElement) {
      const c = origBg(p)
      if (c && c.a >= 0.5) return light(c) >= 150 ? "light" : "dark"
    }
    return "light"
  }

  /* ---------- pixels of a picture ---------- */
  const probe = document.createElement("canvas")
  probe.width = probe.height = 48
  const px = probe.getContext("2d", { willReadFrequently: true })
  // What a picture's edge is: "white", "clear" (transparent) or "other";
  // for a clear one, whether what it draws is dark.
  const edgeOf = (src, w, h) => {
    try {
      px.clearRect(0, 0, 48, 48)
      px.drawImage(src, 0, 0, w, h, 0, 0, 48, 48)
      const d = px.getImageData(0, 0, 48, 48).data
      let white = 0, clear = 0, n = 0
      for (let i = 1; i < 47; i += 3) {
        for (const [x, y] of [[i, 1], [i, 46], [1, i], [46, i]]) {
          const k = (y * 48 + x) * 4
          n++
          if (d[k + 3] < 30) clear++
          else if (d[k] >= 232 && d[k + 1] >= 232 && d[k + 2] >= 232) white++
        }
      }
      if (white / n >= 0.6) return { kind: "white" }
      if (clear / n >= 0.6) {
        let sum = 0, chr = 0, cnt = 0
        for (let k = 0; k < d.length; k += 4) {
          if (d[k + 3] < 20) continue
          sum += (d[k] + d[k + 1] + d[k + 2]) / 3
          chr += Math.max(d[k], d[k + 1], d[k + 2]) - Math.min(d[k], d[k + 1], d[k + 2])
          cnt++
        }
        return { kind: cnt ? "clear" : "empty", dark: cnt > 0 && sum / cnt < 110, grey: cnt > 0 && chr / cnt < 30 }
      }
      return { kind: "other" }
    } catch {
      return null // still loading, or from another origin
    }
  }
  const drawing = (el) => el.tagName === "CANVAS" || /\.(svg|gif)(\?|$)/i.test(el.currentSrc || el.src || "")

  // The box that cuts the picture: its nearest ancestor that clips, or the window.
  const clipBox = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== "visible") {
        const r = p.getBoundingClientRect()
        return { left: r.left + p.clientLeft, right: r.left + p.clientLeft + p.clientWidth, width: p.clientWidth }
      }
    }
    return { left: 0, right: root.clientWidth, width: root.clientWidth }
  }
  // The category photographs are set at a steady 0.85 (the moon at 0.8) so that, on white,
  // their white stayed pure while the piece softened. On the dark the same
  // 0.85 turns the whole plate grey, so a framed photograph held at a steady
  // part-opacity is shown whole. An opacity that is moving (a fade) is left.
  const steadyOpacity = (el, s) => {
    if (el.hasAttribute("data-dko")) return
    const o = getComputedStyle(el).opacity
    if (+o < 0.5 || +o >= 1) { s.op = null; s.opN = 0; return }
    if (s.op === o) s.opN++
    else { s.op = o; s.opN = 1 }
    if (s.opN >= 2) el.setAttribute("data-dko", "")
  }
  const frame = (el, s) => {
    const vw = root.clientWidth
    const w = el.offsetWidth || el.getBoundingClientRect().width
    if (!w) return
    const big = w >= vw * 0.55
    const m = big ? Math.max(16, Math.min(64, vw * 0.04)) : Math.max(6, Math.min(16, vw * 0.012))
    // A big picture that hangs out of what cuts it (the footer's hand, wider
    // than the window; Heavy Light's still, set half off the left edge) is
    // pulled in by what hangs out on each side, so that the frame is seen
    // whole. Only once it holds still for two passes: a slide crossing the
    // edge of a carousel is moving, and is left as it is.
    let ol = 0, or = 0
    if (big) {
      const c = clipBox(el)
      const r = el.getBoundingClientRect()
      const still = s.lastLeft !== undefined && Math.abs(s.lastLeft - r.left) < 1
      s.lastLeft = r.left
      const hang = Math.max(0, c.left - r.left) + Math.max(0, r.right - c.right)
      const seenPart = Math.min(r.right, c.right) - Math.max(r.left, c.left)
      if (hang > 0 && seenPart > c.width * 0.3) { // not a slide waiting off to the side
        if (!still) return
        ol = Math.max(0, c.left - r.left); or = Math.max(0, r.right - c.right)
        const t = getComputedStyle(el).transform
        if (t.startsWith("matrix(") && parseFloat(t.slice(7)) < 0) [ol, or] = [or, ol] // drawn mirrored
      }
    }
    // What hangs out is cut away, with the frame's width more, rather than
    // squeezed in: the photograph keeps its place, so the words set beside the
    // piece stay beside it. Where the site already cuts the picture itself
    // (the scan's edges, revealed by its moving line, lying exactly over the
    // scan), it is left at its place too, with the plain frame only.
    if (s.ownClip === undefined) s.ownClip = getComputedStyle(el).clipPath !== "none"
    const cut = !!(ol || or) && !s.ownClip
    const px = (v) => `${v.toFixed(1)}px`
    const vars = {
      "--dk-pt": px(m),
      "--dk-pl": px(m),
      "--dk-pr": px(m),
      "--dk-cl": px(cut && ol ? ol + m : 0),
      "--dk-cr": px(cut && or ? or + m : 0),
    }
    for (const k in vars) if (el.style.getPropertyValue(k) !== vars[k]) el.style.setProperty(k, vars[k])
    const v = s.fit === "fill" ? "fill" : "on"
    if (el.getAttribute("data-dkp") !== v) el.setAttribute("data-dkp", v)
    if (cut && !el.hasAttribute("data-dkc")) el.setAttribute("data-dkc", "")
    else if (!cut && el.hasAttribute("data-dkc")) el.removeAttribute("data-dkc")
  }

  // Where a picture's own pixels are drawn inside its box (object-fit).
  const drawnRect = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight)
    const pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom)
    let L = r.left + pl, T = r.top + pt, W = r.width - pl - pr, H = r.height - pt - pb
    const nw = el.naturalWidth || el.videoWidth || el.width, nh = el.naturalHeight || el.videoHeight || el.height
    const fit = el.tagName === "CANVAS" ? "fill" : cs.objectFit
    if (nw && nh && fit !== "fill" && fit !== "none") {
      let k = fit === "cover" ? Math.max(W / nw, H / nh) : Math.min(W / nw, H / nh)
      if (fit === "scale-down") k = Math.min(k, 1)
      const dw = nw * k, dh = nh * k
      L += (W - dw) / 2; T += (H - dh) / 2; W = dw; H = dh
    }
    return { L, T, W, H, nw, nh }
  }
  const dot = document.createElement("canvas")
  dot.width = dot.height = 1
  const dx = dot.getContext("2d", { willReadFrequently: true })
  const pixelAt = (el, x, y) => {
    try {
      const { L, T, W, H, nw, nh } = drawnRect(el)
      if (!nw || !nh || x < L || y < T || x > L + W || y > T + H) return { a: 0 }
      const u = ((x - L) / W) * nw, v = ((y - T) / H) * nh
      dx.clearRect(0, 0, 1, 1)
      dx.drawImage(el, Math.min(nw - 1, u), Math.min(nh - 1, v), 1, 1, 0, 0, 1, 1)
      const d = dx.getImageData(0, 0, 1, 1).data
      return { r: d[0], g: d[1], b: d[2], a: d[3] }
    } catch {
      return null
    }
  }

  // Is the photograph seen at the moment, or faded out (the footer's hand
  // rises and fades with the scroll)?
  const shown = (el) => {
    let o = 1
    for (let p = el, i = 0; p && p !== document.body && i < 8; p = p.parentElement, i++) o *= +getComputedStyle(p).opacity
    return o >= 0.35
  }
  let plates = [] // the framed photographs met while reading a ground

  // Is this point on the photograph itself, or on the #202020 frame round it?
  const onPhoto = (el, x, y) => {
    const { L, T, W, H } = drawnRect(el)
    return x >= L && x <= L + W && y >= T && y <= T + H
  }

  const picture = (el, s) => {
    if (s.pic === "frame") { steadyOpacity(el, s); return frame(el, s) }
    if (s.pic === "mirror") { if (!el.hasAttribute("data-dkm")) el.setAttribute("data-dkm", ""); return }
    if (s.pic === "skip") return
    let w, h
    if (el.tagName === "IMG") {
      if (!el.complete || !el.naturalWidth) return
      w = el.naturalWidth; h = el.naturalHeight
    } else if (el.tagName === "VIDEO") {
      if (el.readyState < 2) return
      w = el.videoWidth; h = el.videoHeight
    } else {
      w = el.width; h = el.height
    }
    if (!w || !h) return
    const e = edgeOf(el, w, h)
    s.tries = (s.tries || 0) + 1
    if (!e) { if (s.tries > 30) s.pic = "skip"; return }
    const cs = getComputedStyle(el)
    s.edge = e.kind
    if (e.kind === "white") {
      if (el.tagName === "CANVAS") { s.pic = "mirror"; return picture(el, s) } // a drawing on white
      s.pic = "frame"; s.fit = cs.objectFit
      epoch++
      return frame(el, s)
    }
    // A see-through drawing in greys, on what was a light ground: dark lines,
    // or pale ones (the sea, the sun's rays) that were faint on the white and
    // would glare on the dark. Coloured ones (the gold motes) are left alone.
    if (e.kind === "clear" && e.grey && drawing(el) && cs.filter === "none") {
      const g = groundUnder(el)
      if (g === null) return // decide when it is on screen
      if (g === "light") { s.pic = "mirror"; return picture(el, s) }
      s.pic = "skip"
      return
    }
    // A canvas may not have drawn yet.
    if (el.tagName === "CANVAS" && e.kind === "empty" && s.tries < 30) return
    s.pic = "skip"
  }

  /* ---------- deciding, element by element ---------- */
  const NOT_PAINT = "mask, clipPath, pattern, defs, linearGradient, radialGradient, filter, symbol, marker"
  const ATTRS = ["data-dkg", "data-dkgi", "data-dkh", "data-dkt", "data-dkb", "data-dkf", "data-dks"]

  // Read the element as the site drew it. Some decisions need to know what is
  // under it; those wait (s.wait) until it is on screen.
  const decide = (el, s, cs) => {
    s.dkBg = s.dkGi = s.dkH = s.dkC = s.dkBc = s.dkFill = s.dkStroke = null
    s.wait = false
    plates = []
    let g // the ground, read once and only if needed
    const ground = () => (g === undefined ? (g = groundUnder(el)) : g)
    let gt
    const textGround = () => (gt === undefined ? (gt = groundUnder(el, true)) : gt)
    s.epoch = epoch
    const tag = el.tagName
    if (!(el instanceof SVGElement)) {
      const bg = parse(cs.backgroundColor)
      s.bg = bg
      if (bg && bg.a > 0 && isLightNeutral(bg)) {
        if (bg.a >= 0.5) s.dkBg = str(mirror(bg))
        else if (ground() === "light") s.dkBg = str(mirror(bg))
      }
      if (cs.backgroundImage.includes("gradient")) {
        const stops = cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []
        const pale = stops.some((m) => isLightNeutral(parse(m)))
        if (pale) {
          const gr = ground()
          const allPale = stops.every((m) => { const c = parse(m); return !c || c.a === 0 || isLightNeutral(c) })
          if (gr === "plate" && allPale) s.dkH = true
          else if (gr === "light" || gr === "plate") {
            s.dkGi = cs.backgroundImage.replace(/rgba?\([^)]+\)/g, (m) => {
              const c = parse(m)
              return c && isLightNeutral(c) ? str(mirror(c)) : m
            })
          }
        }
      }
      const hasText = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (hasText) {
        const c = parse(cs.color)
        if (c && c.a > 0 && isDark(c) && textGround() === "light") s.dkC = str(mirror(c))
      }
      const bw = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) +
        parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
      if (bw > 0) {
        const c = parse(cs.borderTopColor)
        if (c && c.a > 0 && neutral(c) && ground() === "light") s.dkBc = str(mirror(c))
      }
    } else if (tag !== "svg" && !el.closest(NOT_PAINT)) {
      const f = parse(cs.fill), k = parse(cs.stroke)
      const fOk = f && f.a > 0 && neutral(f) && (isDark(f) || light(f) >= 235)
      const kOk = k && k.a > 0 && neutral(k) && isDark(k)
      if ((fOk || kOk) && ground() === "light") {
        if (fOk) s.dkFill = str(mirror(f))
        if (kOk) s.dkStroke = str(mirror(k))
      }
    }
    if (g === null || gt === null) s.wait = true
    s.usedGround = g !== undefined || gt !== undefined
    // Words over a photograph that fades in and out are read again when it does.
    s.plates = plates.length ? plates.map((p) => [p, shown(p)]) : null
  }
  const apply = (el, s) => {
    const put = (attr, v, prop) => {
      if (v) {
        if (prop && el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v)
        if (!el.hasAttribute(attr)) el.setAttribute(attr, "")
      } else if (el.hasAttribute(attr)) el.removeAttribute(attr)
    }
    put("data-dkg", s.dkBg, "--dk-bg")
    put("data-dkgi", s.dkGi, "--dk-gi")
    put("data-dkh", s.dkH)
    put("data-dkt", s.dkC, "--dk-c")
    put("data-dkb", s.dkBc, "--dk-bc")
    put("data-dkf", s.dkFill, "--dk-fill")
    put("data-dks", s.dkStroke, "--dk-stroke")
  }
  // Elements the site animates through their own style attribute are read
  // again on every pass, with the test's marks lifted for the reading.
  const animated = (el) => {
    const st = el.style
    return st && (st.backgroundColor || st.background || st.backgroundImage || st.color || st.fill || st.stroke)
  }
  const visit = (el) => {
    let s = seen.get(el)
    if (!s || s.bg === undefined && !s.decided) {
      s = s || {}
      seen.set(el, s)
      s.decided = true
      decide(el, s, getComputedStyle(el))
    } else if (s.wait) {
      decide(el, s, getComputedStyle(el))
    } else if (animated(el) || (s.usedGround && s.epoch !== epoch) ||
      (s.plates && s.plates.some(([p, v]) => shown(p) !== v))) {
      for (const a of ATTRS) if (el.hasAttribute(a)) el.removeAttribute(a)
      decide(el, s, getComputedStyle(el))
    }
    apply(el, s)
  }

  const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE", "BR"])
  let queued = false
  const pass = () => {
    queued = false
    if (!document.body) return
    // Pictures first, so that what stands over a framed photograph knows it.
    for (const el of document.body.querySelectorAll("img, video, canvas")) {
      let s = seen.get(el)
      if (!s) { s = {}; seen.set(el, s) }
      picture(el, s)
    }
    visit(document.body)
    const all = document.body.getElementsByTagName("*")
    for (let i = 0; i < all.length; i++) if (!SKIP.has(all[i].tagName)) visit(all[i])
  }
  const soon = (ms = 60) => { if (!queued) { queued = true; setTimeout(pass, ms) } }

  addEventListener("scroll", () => soon(120), { passive: true, capture: true })
  addEventListener("resize", () => {
    for (const el of document.querySelectorAll("[data-dkp]")) {
      const s = seen.get(el)
      if (s && s.pic === "frame") { s.lastLeft = undefined; frame(el, s) }
    }
    soon()
  })
  new MutationObserver(() => soon()).observe(root, { childList: true, subtree: true })
  addEventListener("load", () => soon(), true) // images finishing, in capture
  addEventListener("loadeddata", () => soon(), true)
  setInterval(pass, 1000)
  pass()

  addEventListener("keydown", (e) => {
    if (e.key !== "d" && e.key !== "D") return
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
    const t = e.target
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
    setOn(!on)
  })
})()
