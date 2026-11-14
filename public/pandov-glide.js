/*
 * Pandov — a calm, subtle inertia on the wheel (2026-11-03, the author's
 * asking: "a little inertia on every scroll up or down, fluid, calm, subtle").
 *
 * First version (same day) let the browser scroll each notch and then added
 * a drift once the wheel was quiet. The author felt the seam: a tiny stop,
 * a tension, and only then the flow. So now the page's wheel motion is one
 * single movement: each notch moves the destination, and the page follows
 * it on a soft spring. It never stops between notches, and when the wheel
 * stops it carries on a little and settles. Each notch goes CARRY (15%)
 * further than the browser's own (the author asked for a very little more).
 *
 * The Chess Set carries its own wheel (lib/geared-scroll.ts); it reads the
 * same spring and carry from window.__pandovGlideFeel, so it feels the same
 * there, and its slowed stretch by the moon is still slowed exactly as it
 * was. The homepage's doors, Presence and For Mind are played beats, not
 * scrolled, and stay as they are.
 *
 * It stays out of the way of everything the site already choreographs:
 *  - a wheel event any part of the site has already taken over (the hero's
 *    doors, the Chess Set's own wheel) is left to it: the glide
 *    looks only after every other listener has heard the event;
 *  - if anything else moves the page (a played beat, a link, the keys, the
 *    scrollbar), the glide lets go at once;
 *  - a wheel over a panel that scrolls on its own, trackpads (they glide by
 *    themselves), pinch-zoom and "reduce motion" are left to the browser.
 *
 * One plain script outside React: delete its <Script> line in
 * app/layout.tsx and the site is exactly as it was.
 */
;(function () {
  if (typeof window === "undefined" || window.__pandovGlide) return
  window.__pandovGlide = true

  // ── The two numbers to tune ───────────────────────────────────────────
  // How long the page takes to settle after the last notch, roughly, in ms.
  // 450 is subtle; 700 is softer and longer; 300 is barely there.
  var SETTLE_MS = 640
  // How much further each notch carries the page than the browser would
  // (2026-11-03, the author's asking: "a very little more distance").
  // 0 = the browser's own distance; 0.15 = 15% further.
  var CARRY = 0.15
  // ─────────────────────────────────────────────────────────────────────

  // The page follows its destination on a critically damped spring (as the
  // Chess Set's own wheel does, lib/geared-scroll.ts): it starts from rest,
  // gathers, and settles without overshoot. An exponential ease was tried
  // first; it moves a tenth of the notch in its first frame, which reads as
  // a small jolt. The spring's frequency is set so ~98% of a notch is done
  // in SETTLE_MS.
  var OMEGA = 5.8 / (SETTLE_MS / 1000)

  // The last few pixels at an even pace (2026-11-14, the author's report: a
  // very small hitch at the end of every scroll, on a desktop and a laptop).
  // The browser puts the page on whole pixels, and the spring's tail moved it
  // by fractions of one a frame, so the last pixels came at uneven moments,
  // 1, 0, 1, 0, 0, 0, 1, … over a third of a second (measured in Chrome). Once
  // the spring would go slower than TAIL_SPEED within TAIL_PX of where it is
  // heading, the page goes on at TAIL_SPEED, a pixel a frame at 60 frames a
  // second, and stops there: the tail is a few even steps.
  var TAIL_PX = 12
  var TAIL_SPEED = 60 // px/s

  // The Chess Set carries the wheel itself; it takes the same feel from here
  // (and goes back to its own 24 Hz, full-length notch if this script is gone).
  window.__pandovGlideFeel = { hz: OMEGA, carry: CARRY }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)")

  var target = 0 // where the page is heading
  var pos = 0 // where the glide last put it (sub-pixel)
  var vel = 0 // px/s
  var raf = 0
  var last = 0

  function maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }

  function px(e) {
    if (e.deltaMode === 1) return e.deltaY * 40
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight
    return e.deltaY
  }

  // A mouse's notch is big (100px, or 80, 66.7… with Windows display
  // scaling, so not always a whole number); a trackpad sends many small
  // steps and has its own momentum. (The first check also wanted a whole
  // number, and so took a mouse at 150% scaling for a trackpad: the author
  // saw no inertia anywhere, 2026-11-03.)
  function looksLikeTrackpad(e) {
    if (e.deltaMode !== 0) return false
    return Math.abs(e.deltaY) < 40 || Math.abs(e.deltaX) > Math.abs(e.deltaY)
  }

  // A scrollable panel under the pointer scrolls itself, not the page.
  function insideScroller(node) {
    for (var el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.nodeType !== 1) continue
      var oy = getComputedStyle(el).overflowY
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return true
    }
    return false
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function frame(now) {
    // Something else moved the page: it is theirs now.
    if (Math.abs(window.scrollY - Math.round(pos)) > 2) return stop()
    var dt = Math.min(0.05, (now - last) / 1000)
    last = now
    // The critically damped spring, solved exactly for the step, so that it
    // holds at any frame rate.
    var before = pos
    var decay = Math.exp(-OMEGA * dt)
    var off = pos - target
    var push = (vel + OMEGA * off) * dt
    vel = (vel - OMEGA * push) * decay
    pos = target + (off + push) * decay
    // the tail, at an even pace (see TAIL_SPEED)
    var left = target - before
    var step = pos - before
    if (left !== 0 && Math.abs(left) <= TAIL_PX && step * left >= 0 && Math.abs(step) < TAIL_SPEED * dt) {
      var even = Math.min(Math.abs(left), TAIL_SPEED * dt)
      pos = before + (left > 0 ? even : -even)
      vel = (pos - before) / (dt || 1)
    }
    if (Math.abs(target - pos) < 0.3 && Math.abs(vel) < 8 || pos === target) {
      pos = target
      vel = 0
      window.scrollTo(0, target)
      return stop()
    }
    window.scrollTo(0, pos)
    raf = requestAnimationFrame(frame)
  }

  // Who took the last turn of the wheel ("glide", "site" or "browser"), for
  // checking in the console: window.__pandovGlideLast
  function note(who) {
    window.__pandovGlideLast = who
  }

  // The last word on each wheel event: added during the capture phase, so it
  // runs after every other wheel listener the page has, and can see whether
  // one of them took the event over.
  function lastWord(e) {
    window.__pandovGlideWheel = { dy: e.deltaY, dx: e.deltaX, mode: e.deltaMode, cancelable: e.cancelable }
    if (e.defaultPrevented) return note("site", stop()) // the site's own choreography
    if (!e.cancelable || e.ctrlKey || (reduce && reduce.matches)) return note("browser", stop())
    if (looksLikeTrackpad(e) || insideScroller(e.target)) return note("browser", stop())
    e.preventDefault()
    note("glide")
    if (!raf) {
      // Starting fresh: from wherever the page is now.
      pos = target = window.scrollY
      vel = 0
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    target = Math.max(0, Math.min(maxY(), target + px(e) * (1 + CARRY)))
  }

  // This first listener must not be passive, though it cancels nothing
  // itself: Chrome decides before a turn of the wheel whether the page may
  // cancel it, by whether the page has any wheel listener that is not
  // passive. With only passive ones, every event arrives already the
  // browser's (cancelable false), and the glide never ran for a real wheel
  // (2026-11-03, the author's report; a synthetic event did not show it).
  window.addEventListener(
    "wheel",
    function () {
      window.addEventListener("wheel", lastWord, { passive: false, once: true })
    },
    { capture: true, passive: false }
  )

  // Any other intention ends the glide where the page is.
  window.addEventListener("keydown", stop, true)
  window.addEventListener("mousedown", stop, true)
  window.addEventListener("touchstart", stop, { capture: true, passive: true })
  window.addEventListener("pagehide", stop)
})()
