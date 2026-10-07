/**
 * A scroll the page carries itself, so that it can go less far than the hand
 * asks.
 *
 * On the Chess Set, from the moment the dark drop is sent on to the moon until
 * the mandala lets go, a scroll down moves the page less and less
 * (`components/moon-mandala.tsx`, the author's asking of 2026-10-07). A
 * browser cannot be asked to scroll by less than it was told. So the page
 * takes the scroll from it, the wheel and a trackpad, the keys that scroll
 * down, and a finger, and moves itself: as far as the hand asked where the
 * scroll is free, and as far as `gear.pull` says where it is not.
 *
 * It has to take the wheel long before the slow stretch begins, and that is
 * the one thing here that is not obvious. Chrome lets a page cancel only the
 * first wheel event of a turn of the wheel. Once one has gone by uncancelled,
 * every one after it in the same turn arrives already scrolled, and a turn
 * lasts until the wheel has been quiet for half a second. A listener that came
 * on as the slow stretch began would be handed a turn it can no longer stop,
 * by exactly the reader it is there for, the one scrolling steadily down the
 * page. Measured with Chrome's own gesture (2,400px at 800px a second, the
 * listener added 0.7s in): 140 events after it, none cancellable, and the page
 * went the whole way. So `hold` is asked for from the top of the page, every
 * turn is taken from its first event, and until the slow stretch the page is
 * simply carried as far as the wheel asked. Going up is carried too, at full
 * length: a turn that began upward and came back down would otherwise be the
 * browser's all the way through.
 *
 * Carried, a notch of the wheel has to feel as it does everywhere else on the
 * site. The page follows where it has been asked to go on a critically damped
 * spring: it starts from rest, gathers and settles, as Chrome's own wheel
 * animation does, and a new notch arriving mid-way is taken up at the speed
 * the page already has. An exponential ease was the simpler choice and was
 * turned down: it moves a fifth of the notch in its first frame, which reads
 * as a jolt. A trackpad sends small steps sixty times a second and has its own
 * momentum, so its steps are followed almost directly (FINE_HZ).
 *
 * A finger is different, and is not taken from the top of the page. A page
 * that scrolls itself under a finger never feels like the phone's own
 * scrolling, and the hero above the moon would pay for that on every visit.
 * So a finger is the page's only where `gear.finger` says so, in the slow
 * stretch itself, and only if the browser still lets the touch be cancelled
 * (it does not while its own fling is running). What a fling does there is the
 * mandala's to settle, not this module's: see the page's end, in
 * `moon-mandala.tsx`.
 *
 * The scrollbar is left alone, as on the homepage, and so are the keys that
 * scroll up. Whatever else moves the page, this stops and lets it.
 */

export type Gear = {
  /**
   * A hand asks the page, standing at `y` px of scroll, to go `px` further
   * down. Returns where the page goes: `y + px` where the scroll is free, and
   * less where it is slowed. It is also told of a finger's travel that the
   * browser is scrolling by itself, with the answer left unused, so that the
   * pull of a hand counts whoever moves the page.
   */
  pull: (y: number, px: number) => number
  /** Whether a finger put down now is the page's to follow. */
  finger: () => boolean
}

export type GearedScroll = {
  /**
   * Whether the wheel and the keys are the page's now, and whether a finger
   * may be. Given back, they stay the page's until the hand has been quiet,
   * so that no turn of the wheel changes hands half-way.
   */
  hold: (wheel: boolean, finger: boolean) => void
  dispose: () => void
}

/**
 * How stiffly the page follows a notch of the wheel or a key, as the spring's
 * angular frequency, per second. At 24 a notch is half done in 70ms and nine
 * tenths done in 160ms, which is Chrome's own 200ms wheel animation to within
 * a frame at either mark.
 */
const NOTCH_HZ = 24
/** And a trackpad's step, which is already smooth: about 20ms behind the fingers. */
const FINE_HZ = 90
/** A step under this many px is a trackpad's. A mouse's notch is 100, or 80 at 125% zoom. */
const FINE_PX = 40
/** A wheel that reports lines: three to a notch, so a third of a notch each. */
const LINE_PX = 100 / 3
/** What the arrow key and the page keys scroll by: px, and a share of the window. */
const ARROW_PX = 40
const PAGE = 0.875
/** Quiet that ends a turn of the hand, ms, as on the homepage. */
const GESTURE_GAP_MS = 250
/**
 * A finger's throw once it is lifted: seconds for its speed to fall by e, so
 * the page is asked for that many seconds of the finger's last speed. The
 * speed under which the throw is over, px/s, and how long a finger may rest
 * before it is lifted and still throw, ms.
 */
const FLING_S = 0.4
const FLING_MIN = 30
const FLICK_MS = 80

export function gearScroll(gear: Gear): GearedScroll {
  let wheelHeld = false
  let fingerHeld = false
  let wheelOn = false
  let fingerOn = false
  let lastTaken = -Infinity
  let timer = 0

  /* Where the page is, as written, and where it is being taken. */
  let pos = 0
  let vel = 0
  let target = 0
  let omega = NOTCH_HZ
  let wrote = 0
  let raf = 0
  let last = 0

  const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  /** Something else has moved the page since it was last written: the scrollbar, a key that scrolls up. */
  const theirs = () => Math.abs(window.scrollY - wrote) > 2

  const write = (y: number) => {
    window.scrollTo({ top: y, behavior: "instant" })
    wrote = window.scrollY
    pos = y
    // Against an end of the page there is nowhere further to be taken.
    if (Math.abs(wrote - y) > 1) {
      pos = wrote
      target = wrote
      vel = 0
    }
  }

  const halt = () => {
    cancelAnimationFrame(raf)
    raf = 0
    vel = 0
    settle()
  }

  const step = (now: number) => {
    raf = 0
    if (theirs()) return halt()
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    // The critically damped spring, solved exactly for the step, so that it
    // holds at any frame rate.
    const decay = Math.exp(-omega * dt)
    const off = pos - target
    const push = (vel + omega * off) * dt
    vel = (vel - omega * push) * decay
    let y = target + (off + push) * decay
    if (Math.abs(target - y) < 0.3 && Math.abs(vel) < 8) {
      y = target
      vel = 0
    }
    write(y)
    if (pos !== target) raf = requestAnimationFrame(step)
    else settle()
  }

  /** Takes the page `px` further, down or up, from where it is already being taken. */
  const carry = (px: number, hz: number) => {
    if (!raf || theirs()) {
      pos = target = wrote = window.scrollY
      vel = 0
    }
    const to = px > 0 ? gear.pull(target, px) : target + px
    target = Math.max(0, Math.min(limit(), to))
    omega = hz
    if (!raf && target !== pos) {
      last = performance.now()
      raf = requestAnimationFrame(step)
    }
  }

  // The wheel, and a trackpad, which the browser sends as one.
  const onWheel = (e: WheelEvent) => {
    // A pinch on a trackpad arrives as a wheel with ctrl held: the browser's zoom.
    if (e.ctrlKey) return
    // A turn the browser began before this was listening is the browser's to
    // its end.
    if (!e.cancelable) return
    // Every one of them, sideways ones too: one let through would make the
    // rest of the turn the browser's.
    e.preventDefault()
    lastTaken = e.timeStamp
    const px = e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? window.innerHeight : 1)
    if (px) carry(px, Math.abs(px) < FINE_PX ? FINE_HZ : NOTCH_HZ)
  }

  // The keys that scroll down. The ones that scroll up are the browser's.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    const px =
      e.key === "ArrowDown"
        ? ARROW_PX
        : e.key === "PageDown" || (e.key === " " && !e.shiftKey)
          ? window.innerHeight * PAGE
          : 0
    if (!px) return
    const t = e.target
    if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input, textarea, select, button"))) return
    e.preventDefault()
    lastTaken = e.timeStamp
    carry(px, NOTCH_HZ)
  }

  // A finger. What the touch is is settled on its first move, the only one the
  // browser lets the page cancel. Going down where the scroll is slowed, the
  // page follows it at the gear, and once it is lifted is thrown on from the
  // finger's own speed, through the gear again. Any other touch is the
  // browser's, and its travel is only reported.
  type Touching = { x: number; y: number; at: number; v: number; mode: "ours" | "native" | null }
  let touch: Touching | null = null
  let flingRaf = 0
  let flingV = 0

  const stopFling = () => {
    cancelAnimationFrame(flingRaf)
    flingRaf = 0
  }

  const drag = (px: number) => {
    const to = px > 0 ? gear.pull(pos, px) : pos + px
    write(Math.max(0, Math.min(limit(), to)))
  }

  const fling = (now: number) => {
    flingRaf = 0
    if (theirs()) return settle()
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    drag(flingV * dt)
    flingV *= Math.exp(-dt / FLING_S)
    if (Math.abs(flingV) > FLING_MIN) flingRaf = requestAnimationFrame(fling)
    else settle()
  }

  const onTouchStart = (e: TouchEvent) => {
    // A finger put down stops the page under it, as it does a fling of the
    // browser's own.
    stopFling()
    if (raf) halt()
    touch = null
    if (e.touches.length !== 1) return
    const p = e.touches[0]
    touch = { x: p.clientX, y: p.clientY, at: e.timeStamp, v: 0, mode: null }
  }
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      touch = null
      return
    }
    const p = e.touches[0]
    // A touch that began before this was listening is the browser's.
    if (!touch) touch = { x: p.clientX, y: p.clientY, at: e.timeStamp, v: 0, mode: "native" }
    const dy = touch.y - p.clientY
    if (touch.mode === null) {
      const ours = e.cancelable && dy > 0 && dy >= Math.abs(p.clientX - touch.x) && gear.finger()
      touch.mode = ours ? "ours" : "native"
      if (ours) pos = target = wrote = window.scrollY
    }
    if (touch.mode === "ours") {
      e.preventDefault()
      drag(dy)
      const dt = e.timeStamp - touch.at
      if (dt > 0) touch.v = 0.75 * ((dy / dt) * 1000) + 0.25 * touch.v
    } else if (dy > 0) {
      gear.pull(window.scrollY, dy)
    }
    touch.x = p.clientX
    touch.y = p.clientY
    touch.at = e.timeStamp
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch
    touch = null
    if (t?.mode !== "ours") return
    // A finger that stopped before it was lifted throws nothing.
    flingV = e.timeStamp - t.at > FLICK_MS ? 0 : t.v
    if (Math.abs(flingV) > FLING_MIN) {
      last = performance.now()
      flingRaf = requestAnimationFrame(fling)
    } else settle()
  }

  // The listeners that can cancel a scroll are on the page only while it is
  // held: a wheel listener that may cancel makes the browser wait for the
  // page's script before every scroll it starts.
  const listen = () => {
    if (wheelHeld && !wheelOn) {
      wheelOn = true
      window.addEventListener("wheel", onWheel, { passive: false })
      window.addEventListener("keydown", onKeyDown)
    }
    if (fingerHeld && !fingerOn) {
      fingerOn = true
      window.addEventListener("touchstart", onTouchStart, { passive: true })
      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", onTouchEnd, { passive: true })
      window.addEventListener("touchcancel", onTouchEnd, { passive: true })
    }
  }

  /** Gives back what is no longer held, once the hand that had it is quiet. */
  function settle() {
    window.clearTimeout(timer)
    if (!wheelHeld && wheelOn) {
      const quiet = performance.now() - lastTaken
      if (raf) {
        // The glide's own end comes back here.
      } else if (quiet < GESTURE_GAP_MS) {
        timer = window.setTimeout(settle, GESTURE_GAP_MS - quiet + 10)
      } else {
        wheelOn = false
        window.removeEventListener("wheel", onWheel)
        window.removeEventListener("keydown", onKeyDown)
      }
    }
    if (!fingerHeld && fingerOn && !flingRaf && touch?.mode !== "ours") {
      fingerOn = false
      touch = null
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }

  return {
    hold: (wheel, finger) => {
      if (wheel === wheelHeld && finger === fingerHeld) return
      wheelHeld = wheel
      fingerHeld = finger
      listen()
      settle()
    },
    dispose: () => {
      wheelHeld = fingerHeld = false
      cancelAnimationFrame(raf)
      raf = 0
      stopFling()
      touch = null
      lastTaken = -Infinity
      settle()
    },
  }
}
