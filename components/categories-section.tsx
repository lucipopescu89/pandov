"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { NUDGE_PX, ease, heroUp, playBeat, ramp } from "@/lib/played-beat"
import { JULIUS_MIN, TRACK } from "@/lib/type"

/** Chess (Mind), figure (Body) and lamp (Space) all sit slightly back. */
const CATEGORY_IMAGE_OPACITY = 0.85

/**
 * The homepage on #202020 (2026-11-21, the author's asking), each category's
 * photograph shot on white in a white band the screen's whole width, the
 * photograph centred in it and its words above it on the dark.
 *
 * The bands stand at about the same height, but not the same: the chess set
 * and the Space sculpture are larger objects than a pendant, so their bands
 * are a little taller (`*_BAND_VH`, `*_PHONE_BAND_VH`). The objects keep about
 * the size they had before.
 *
 * Until that day the three rows stood on white, For Body and For Space crossed
 * on two columns either side of the centre line (`COLUMN_*`, `onColumn`, kept
 * below for the record), and For Space washed into Making's white
 * (`useWhiteOut`). The file before that day is in git history and in
 * `D:\PANDOV\Claude outputs\backup homepage negru`.
 */
const DARK = "#202020"
/** The words on the dark: the hero's grey, as "We give form to presence". */
const WORDS_GREY = "#888"
/** From the foot of "→ Explore" to the top of the white band, px. */
const LABEL_GAP = 48
/**
 * The dark between the rows, so the page breathes (the author's asking, the
 * same day), and the same everywhere (asked again the same morning): from the
 * foot of one white band to the top of the next row's words, and from the
 * doors to "For Mind", `ROW_GAP` (`ROW_GAP_PHONE` on a phone). Each row after
 * For Mind opens with it.
 */
const ROW_GAP = "28vh"
const ROW_GAP_PHONE = "18vh"
/**
 * For Mind's row is the screen it is played on, right under the doors, so it
 * cannot move down the page. Its words stand `ROW_GAP` down that screen
 * instead (they were centred with it, and sat high and close under the doors,
 * the author's report), and For Body's row opens with what `ROW_GAP` still
 * needs after the dark left under For Mind's band on its screen: worked out
 * in CSS from the band's height and the words' (`LABEL_H*`, measured roughly:
 * the two lines and `LABEL_GAP`).
 */
const LABEL_H = 104
const LABEL_H_PHONE = 96
const MIND_BAND_VH = 52
/** The computer's chess photograph is this share of the page's width tall. */
const MIND_PHOTO_VW = +((900 / 2968) * 100).toFixed(3)
/**
 * The band whole on the screen, always, with dark under it (2026-11-21, the
 * author's asking, twice the same morning). On a wide screen the photograph,
 * drawn the page's width, grew taller than the screen had room for and was cut
 * at its foot. First the band was let grow with it and run a little below the
 * screen; seen, the author asked instead for the band to be seen whole, the
 * dark showing under it, and the photograph scaled to fit.
 *
 * So the band is never less than `MIND_BAND_WHITE` times the photograph, white
 * above and below the board (the photograph itself leaves only 4–5% of its
 * height white either side), not less than `MIND_BAND_VH`, and never more
 * than `MIND_BAND_MAX`, which wins over both: the screen less the dark above
 * the words (`ROW_GAP`),
 * the words (`LABEL_H`) and `MIND_DARK_UNDER` of dark under it. Where that
 * limit holds, the photograph is drawn narrower than the page, centred in the
 * band's white (`MIND_PHOTO_W`; its own edges are white, so it reads as one
 * white). On a laptop of 1440 × 900 and smaller screens the limit is what
 * sizes it; on a 1920 monitor too unless the window is nearly full height.
 */
const MIND_BAND_WHITE = 1.15
const MIND_DARK_UNDER = "8vh"
const MIND_BAND_MAX = `calc(100vh - ${ROW_GAP} - ${LABEL_H}px - ${MIND_DARK_UNDER})`
const MIND_BAND = `min(${MIND_BAND_MAX}, max(${MIND_BAND_VH}vh, ${+(MIND_PHOTO_VW * MIND_BAND_WHITE).toFixed(3)}vw))`
/** The photograph's width on a computer: the page's, or less where the band's limit holds. */
const MIND_PHOTO_W = `min(100%, calc(${MIND_BAND_MAX} * ${+(2968 / 900 / MIND_BAND_WHITE).toFixed(4)}))`
/**
 * For Body's row opens with this, so the dark under For Mind's band is
 * `ROW_GAP` too: what `ROW_GAP` still needs after the dark left under the band
 * on For Mind's screen, and `ROW_GAP` whole where the row is taller than the
 * screen and leaves none.
 */
const MIND_AFTER = `max(0px, min(${ROW_GAP}, calc(${MIND_BAND} - 44vh + ${LABEL_H}px)))`
/** On a phone the photograph (1000 × 1195) is the band: 119.5vw tall. */
const MIND_AFTER_PHONE = `max(0px, min(${ROW_GAP_PHONE}, calc(119.5vw - 64vh + ${LABEL_H_PHONE}px)))`
const BODY_BAND_VH = 56
/** The pendant inside its band (60 before, without a band). */
const BODY_IN_BAND_VH = 52
/**
 * Space larger than Mind's chess set, which read the largest (the author's
 * asking, the same day), and white above the sculpture's head, which stood
 * close to the top of the photograph: the room is `SPACE_ROOM_VH` high, at the
 * foot of a band `SPACE_BAND_VH` high, the white of its top running on into
 * the band's.
 */
const SPACE_BAND_VH = 86
const SPACE_ROOM_VH = 76
const BODY_PHONE_BAND_VH = 56
const BODY_PHONE_IN_BAND_VH = 52
const SPACE_PHONE_BAND_VH = 78
const SPACE_PHONE_ROOM_VH = 70
/** A band is a link to its category's page too (the author's asking, the same day). */
const BAND_LINK: React.CSSProperties = { textDecoration: "none", cursor: "pointer" }
const BAND: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
}

/**
 * Where each object's own axis falls across its photograph, read off the
 * pixels: the midpoint of the dark shape, row by row, through the figure. The
 * pendant's is a hair left of the frame's centre and steady from the ring to
 * the tip. The sculpture's is 0.448. It runs from 0.446 through the body to
 * 0.454 at the head, in the author's photograph of 2026-09-26, which replaced
 * one where it stood at 0.456. It is these lines, not the middle of each image,
 * that stand on the columns. BODY_RING is the left edge of the pendant's ring,
 * the part of it that reaches furthest towards the words. Re-measure if either
 * photograph is replaced.
 */
const BODY_ASPECT = 1026 / 1868
const BODY_AXIS = 0.495
const BODY_RING = 0.203
const SPACE_W = 2294
const SPACE_H = 1600
const SPACE_ASPECT = SPACE_W / SPACE_H
const SPACE_AXIS = 0.448

/** The pendant is drawn 60vh high; this is its width at that height. */
const BODY_H_VH = 60
const BODY_W_VH = +(BODY_H_VH * BODY_ASPECT).toFixed(3)

/**
 * On a wide screen For Body and For Space share two verticals, a twelfth of
 * the page either side of the centre line the menus sit on. "For Body" stands
 * on the left one with the Space sculpture under it; the pendant hangs on the
 * right one with "For Space" under it. The two rows read as one composition,
 * crossed. They stood a sixth out at first, on the thirds; that left the words
 * and the pendant too far apart to read as a pair, and the distance was
 * halved.
 *
 * A fraction of the page rather than pixels, so it holds at any width. Before
 * this the four were placed independently — the words by fixed offsets from
 * the centre, the sculpture by a cover crop that shifts with the shape of the
 * screen — and they drifted apart differently on every monitor: at 1440px the
 * sculpture stood 169px off the line of the words above it, at 1920px 106px.
 * Percentages of the row, not vw, because vw counts the scrollbar gutter and
 * the centre line does not.
 *
 * The twelfth has a floor. The pendant is sized by the height of the screen
 * and the columns by its width, so on a squarer or smaller screen the ring
 * closes on the words, and on an upright tablet it would run over them. The
 * floor keeps COLUMN_GAP_PX between the ring and the end of "For Body" at its
 * largest, LABEL_HALF_PX either side of its line. Both columns move out
 * together, so the words stay on their objects and the pair stays centred; only
 * the fraction gives. On the common desktop sizes, 1280×720 to 2560×1440, the
 * twelfth is the larger and the floor never applies.
 */
const LABEL_HALF_PX = 68
const COLUMN_GAP_PX = 60
const COLUMN_FLOOR = `${(LABEL_HALF_PX + COLUMN_GAP_PX) / 2}px + ${+(((BODY_AXIS - BODY_RING) * BODY_W_VH) / 2).toFixed(3)}vh`
const COLUMN_OFFSET = `max(${+(100 / 12).toFixed(4)}%, ${COLUMN_FLOOR})`
const COLUMN_LEFT = `calc(50% - ${COLUMN_OFFSET})`
const COLUMN_RIGHT = `calc(50% + ${COLUMN_OFFSET})`

/**
 * The room is drawn the full height of its row, at its own proportions and
 * whole, placed so the sculpture's axis stands on the left column. Placing it
 * by that axis replaced a box cropped with object-fit: cover, which is what
 * let the sculpture wander — a cover crop recentres on the box, and the box
 * was the shape of the screen.
 *
 * Until 2026-09-28 it was shown through a window that opened an eighth of the
 * way into the photograph, under a white fade a fifth of that window wide.
 * Between them they took away the curtain at the left of the room, and the
 * author asked for the photograph whole. Its left edge is already faded
 * nearly to white in the file (240–255, against the page's 255), so
 * SPACE_EDGE_FADE only takes the last of that grey off the edge and leaves
 * the curtain alone. The fade on the right covers the same part of the room
 * it always did, SPACE_RIGHT_FADE of it.
 *
 * Inside a browser window squarer than about 3:2, the left edge runs past the
 * page's own and the page crops it there. The axis on the column is the rule
 * that holds.
 */
const SPACE_W_VH = 100 * SPACE_ASPECT
const SPACE_EDGE_FADE = 0.06
const SPACE_RIGHT_FADE = 0.394

/**
 * On a phone, For Body and For Space stand over their objects, as For Mind
 * always has. The author asked for it on 2026-09-26, after For Body had sat
 * beside its pendant and For Space over the right of its room. The words are
 * centred, and the object is centred under them.
 *
 * `PHONE_GAP` runs from the foot of "→ Explore" to the top of the object
 * itself, not of its photograph. The photographs leave different white above
 * their objects, so each margin takes off its own: the pendant starts
 * `BODY_TOP` down its photograph, the sculpture `SPACE_TOP`.
 *
 * The pendant keeps the 55vh it had beside its words. The room is shown
 * `SPACE_PHONE_H_VH` high, through a window as wide as the phone, with the
 * sculpture's axis on the centre line. There it stands about 69vh tall, near
 * the 86vh it had when the room filled the screen and the words sat on it.
 */
const PHONE_GAP = 60
const BODY_TOP = 0.048
const BODY_PHONE_H_VH = 55
const SPACE_TOP = 0.024
const SPACE_PHONE_H_VH = 80
const SPACE_PHONE_W_VH = SPACE_PHONE_H_VH * SPACE_ASPECT

/**
 * On a phone the three rows stand the same distance apart, the author's asking
 * on 2026-09-26. The distance is measured from the foot of one row's object to
 * the top of the next row's words, once each row has finished rising into place.
 *
 * The distance is the one from the pendant to "For Space": the white under the
 * pendant (`BODY_FOOT` down its photograph) and the 100px Space's row opens
 * with. That came to 131–144px on phones.
 *
 * From For Mind to "For Body" it was 195–297px, and not one number. For Mind
 * is held on screen while it arrives, centred in a frame the height of the
 * screen, so the white under it grows with the phone's height. Its photograph
 * is `MIND_PHONE_ASPECT` as tall as the page is wide, its chess set ends
 * `MIND_FOOT` down it, and its words take `MIND_LABEL_H` above it.
 *
 * `BODY_PHONE_PULL` draws For Body's row up by the difference, worked out for
 * whatever the screen is. On a tall phone it is pulled up into the bottom of
 * For Mind's frame while For Mind is still held, into white: 35px of it on a
 * 390 × 844 screen, where the chess set ends 150px above.
 */
const MIND_PHONE_ASPECT = 1195 / 1000
const MIND_FOOT = 0.953
const MIND_LABEL_H = 72
const BODY_FOOT = 0.915

/**
 * On a wide screen For Body stands halfway between For Mind and For Space
 * (2026-11-03, the author's asking: it sat much nearer For Space). Measured
 * from the foot of the chess set to the top of the pendant, and from the foot
 * of the pendant to the top of the room: 335px and 59px at 1440 × 900, 262 and
 * 47 at 1280 × 720, 364 and 70 at 1920 × 1080. Half the difference is how far
 * the row is drawn up, and it is given back underneath, so For Space and
 * everything after it stay exactly where they were.
 *
 * The difference has three parts: For Mind's frame is a screen tall with its
 * photograph (30% of the width tall, the board ending 95% down it) centred in
 * it, the pendant's photograph is 60vh with white above and below it, and the
 * room starts at the top of its screen. Worked out, half of it is
 * 23.12vh − 6.765vw + 27px; measured, within 2px of that at every size above
 * and at 1536 × 864, 2560 × 1440 and 1280 × 1000. The phone has its own even
 * spacing (`BODY_PHONE_PULL`) and is left alone.
 */
const BODY_LIFT = "calc(23.12vh - 6.765vw + 27px - 40px)"
// The same day, seen on the page, the author asked for it 80px lower than
// halfway, then 40px back up: 40px below halfway, hence the − 40px above.
// For Space still stays where it was.
const BODY_PHONE_PULL = `calc(${+((1 - BODY_FOOT) * BODY_PHONE_H_VH - 50).toFixed(4)}vh + ${MIND_LABEL_H / 2}px + ${+((0.5 - (1 - MIND_FOOT)) * MIND_PHONE_ASPECT * 100).toFixed(4)}vw)`

/**
 * Puts a CategoryLabel on a column by its letters rather than by its box. The
 * title carries 0.2em of letter-spacing after its last letter as well as
 * between them, so the letters stand 0.1em left of the centre of their own
 * box. The wrapper takes the title's size so that 0.1em can be handed back
 * here. `lift` moves it up from the middle of the row.
 */
function onColumn(left: string, lift = 0): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    left,
    fontSize: "clamp(11px, 2vw, 20px)",
    transform: `translate(calc(-50% + 0.1em), calc(-50% - ${lift}px))`,
  }
}

/**
 * For Mind comes up out of the hero's white, played, not scrolled (2026-10-02,
 * the author's asking, after the hero's doors and Presence were played the
 * same day; see `lib/played-beat.ts`).
 *
 * The scroll after the Presence composition starts it, and the page is held
 * while it plays: the hero washes the screen to white (MIND_WASH_S, played by
 * `components/hero-animation.tsx`), a breath of empty white, then For Mind
 * fades in and rises from below into its place, where it comes to rest. The
 * scroll after that carries it on up the page with For Body and For Space
 * behind it. Scrolled back up, it sinks and fades and the white washes off
 * Presence again.
 *
 * It does not grow as it comes. Until 2026-09-21 it also eased forward from
 * 94% of its size over the fade; the author asked for that to go, and the
 * entrance is the fade and the rise alone.
 *
 * The proportions are those of the scrolled beat the author approved, a vh of
 * which a steady hand covered in about a thirtieth of a second: a wash of 24
 * vh, a breath of 12, a fade of 34 and a rise of 46. The breath is shorter
 * here, because still white held for a whole turn of the wheel read as a gap,
 * not a breath. 2.6s in all, as long as Presence's.
 *
 * Until then the row was pinned for 58 vh of scrolling and rose at the page's
 * own speed, so that it could hand over to the page without a seam at the
 * unpin. Played, it comes to rest before the page moves it on, so it eases in
 * and out instead. The fade leads the rise, so the picture is seen while it is
 * still low: at half strength it is still some 37 vh under its place, about
 * where the author asked for it to show on 2026-09-28.
 */
/*
 * Quicker and more direct (2026-10-27, the author's asking: For Mind should
 * come in sooner after the scroll past Presence, keeping the inertia but
 * lighter and smaller). The wash, the breath, the fade and the rise are all
 * shorter, the rise is a third of the way it was (46 vh before), and the rise
 * runs on an ease-out: it moves at once and only settles at the end, where it
 * used to gather speed first. 1.55s in all, from 2.6.
 */
export const MIND_WASH_S = 0.5
const MIND_BREATH_S = 0.1
const MIND_FROM_S = MIND_WASH_S + MIND_BREATH_S
const MIND_FADE_S = 0.7
const MIND_RISE_S = 0.95
/** The whole beat, s, wash included: the time the scroll is held for. */
export const MIND_BEAT_S = MIND_FROM_S + Math.max(MIND_FADE_S, MIND_RISE_S)
/** How far below its place the picture starts, vh. */
const MIND_RISE_VH = 16

// easeOutCubic: the rise leaves at speed and settles into its place.
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

const textStyle = {
  fontFamily: "'Julius Sans One', sans-serif",
  letterSpacing: TRACK,
  textTransform: "uppercase" as const,
}

function CategoryLabel({
  title,
  align = "center",
  dark = false,
  href,
}: {
  title: string
  align?: "center" | "right"
  dark?: boolean
  href?: string
}) {
  // On the homepage's dark since 2026-11-21: both lines in the hero's grey.
  // (`dark` was for words set on a photograph; none are now.)
  void dark
  const color = WORDS_GREY
  const exploreColor = WORDS_GREY

  const content = (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        cursor: href ? "pointer" : "default",
      }}
    >
      <p style={{ ...textStyle, fontSize: "clamp(11px, 2vw, 20px)", color, fontWeight: 400, margin: 0 }}>
        {title}
      </p>
      <p style={{ ...textStyle, fontSize: `clamp(${JULIUS_MIN}px, 1vw, 12px)`, color: exploreColor, fontWeight: 400, margin: 0 }}>
        &rarr; Explore
      </p>
    </div>
  )

  if (href) {
    return <a href={href} style={{ textDecoration: "none" }}>{content}</a>
  }

  return content
}

// Reusable hook: returns a value 0→1 as the element scrolls into the viewport center
function useScrollFadeIn(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Start fading in when top of element is 80% down the screen, fully in at 30%
      const start = vh * 0.85
      const end = vh * 0.3
      const top = rect.top
      const raw = (start - top) / (start - end)
      setProgress(Math.min(1, Math.max(0, raw)))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [ref])

  return progress
}

/**
 * For Space washes to white as Making comes up under it (2026-11-05, the
 * author's asking: "lin și elegant"). A white veil over the whole row, the
 * room and the words alike, rises from nothing as Making's top enters the
 * bottom of the screen (the row's foot at 100% of the screen) to full as the
 * row's foot reaches `SPACE_OUT_END` of the screen, on a smootherstep, so it
 * starts and settles without a jolt. Making's own ground is white, so by then
 * the page reads as one white from Space's place down to Making's words. It
 * is written straight to the veil's style on each frame of scroll, not through
 * React state, so it follows the page without a render in between. Going back
 * up it lifts the same way.
 */
const SPACE_OUT_END = 0.35

function useWhiteOut(row: React.RefObject<HTMLElement | null>, veil: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = row.current
      const v = veil.current
      if (!el || !v) return
      const vh = window.innerHeight
      const foot = el.getBoundingClientRect().bottom
      const t = (vh - foot) / (vh * (1 - SPACE_OUT_END))
      const u = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
      v.style.opacity = String(u * u * u * (u * (u * 6 - 15) + 10))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    update()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [row, veil])
}

/** The veil itself: white over the whole row, above the room and the words. */
const WHITE_VEIL: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#fff",
  opacity: 0,
  pointerEvents: "none",
  zIndex: 5,
  willChange: "opacity",
}

// FOR SPACE row — its words, then the room in its white band, fading in
function SpaceRow() {
  const rowRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const fadeProgress = useScrollFadeIn(rowRef as React.RefObject<HTMLElement>)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const bandVh = isMobile ? SPACE_PHONE_BAND_VH : SPACE_BAND_VH
  const roomVh = isMobile ? SPACE_PHONE_ROOM_VH : SPACE_ROOM_VH
  const roomW = roomVh * SPACE_ASPECT

  return (
    <div
      ref={rowRef}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: isMobile ? ROW_GAP_PHONE : ROW_GAP,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: fadeProgress,
        transform: `translateY(${(1 - fadeProgress) * 30}px)`,
        transition: "opacity 0.1s, transform 0.1s",
      }}
    >
      <div style={{ marginBottom: `${LABEL_GAP}px` }}>
        <CategoryLabel title="For Space" align="center" href="/space" />
      </div>
      {/* The room, its sculpture's axis on the centre line, at the foot of
          the band, white above its head. */}
      <a href="/space" aria-label="For Space" style={{ ...BAND, ...BAND_LINK, height: `${bandVh}vh` }}>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: `calc(50% - ${+(SPACE_AXIS * roomW).toFixed(3)}vh)`,
            height: `${roomVh}vh`,
            width: `${+roomW.toFixed(3)}vh`,
          }}
        >
          <Image
            src="/images/cat-space.avif"
            alt="For Space sculpture"
            width={SPACE_W}
            height={SPACE_H}
            sizes={`${+roomW.toFixed(3)}vh`}
            style={{ position: "absolute", inset: 0, height: "100%", width: "100%", maxWidth: "none", opacity: CATEGORY_IMAGE_OPACITY }}
          />
          {/* Its left edge, nearly white in the file, taken the rest of the
              way into the band's white; its right is white in the file. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${+(SPACE_EDGE_FADE * 100).toFixed(2)}%`,
              background: "linear-gradient(to right, #fff, transparent)",
              pointerEvents: "none",
            }}
          />
        </div>
      </a>
    </div>
  )
}

// FOR MIND — comes up out of the hero's white, played
function MindRow() {
  const ref = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Its place is the hero's last: the row stands exactly on the screen when
  // the hero lets go, and the scroll that starts the beat nudges the page
  // NUDGE_PX past it, so on is the row's top within that of the screen's.
  useEffect(() => {
    const el = ref.current
    const content = contentRef.current
    if (!el || !content) return
    const beat = playBeat(
      MIND_BEAT_S,
      // On the way back up it stays in its place and scrolls away with the
      // page, rather than sinking (see `heroUp`).
      () => heroUp.on || el.getBoundingClientRect().top < NUDGE_PX,
      (t) => {
        const fade = ease(ramp(t, MIND_FROM_S, MIND_FROM_S + MIND_FADE_S))
        const rise = MIND_RISE_VH * (1 - easeOut(ramp(t, MIND_FROM_S, MIND_FROM_S + MIND_RISE_S)))
        content.style.opacity = String(fade)
        content.style.transform = `translateY(${rise.toFixed(3)}vh)`
        content.style.pointerEvents = fade > 0 ? "auto" : "none"
      },
      // One beat with the hero's wash, so that the hero can send both back
      // to the start together (see `rewind`).
      "mind",
    )
    return beat.dispose
  }, [])

  return (
    /* One screen, and no longer pinned: the beat is played where the row
       stands, and the scroll after it carries the row on with the page.
       Deliberately transparent, not white. This section is pulled up over the
       hero's last screen, and a white ground here would cover the hero while
       it is still washing. Left clear, the white under all of this is the
       section's own background, which paints below the hero, so the hero
       washes out over it and then slides away against it without a seam. The
       overflow keeps the rising picture inside the screen it rises on. */
    <div
      ref={ref}
      style={{
        position: "relative",
        // At least a screen rather than exactly one (2026-11-21): the band is
        // sized to fit it (`MIND_BAND_MAX`), but should the words come out
        // taller than `LABEL_H`, the row grows instead of cutting the band.
        minHeight: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        // Its words ROW_GAP down the screen, as far under the doors as each
        // row stands under the one before.
        paddingTop: isMobile ? ROW_GAP_PHONE : ROW_GAP,
      }}
    >
      {/* Not clickable until it has begun to appear. This row is pulled up
          over the hero's last screen, so for the whole Presence beat it is
          already there at opacity 0, behind "We give form to presence", and
          an invisible link still takes the click, which sent people to /mind
          from what looked like empty ground. Its player writes the fade, the
          rise and the clicks; React sets them once, unseen, and never again. */}
      <div
        ref={contentRef}
        style={{
          width: "100%",
          opacity: 0,
          transform: `translateY(${MIND_RISE_VH}vh)`,
          willChange: "opacity, transform",
          pointerEvents: "none",
        }}
      >
        {/* Centred by flex rather than by text-align, so the link is only as
            wide as its two lines. Under text-align the <a> wrapped a block
            that ran the full width of the page, and the whole band either
            side of the words was a link too.

            On a wide screen it is set 60px below where the flow puts it,
            down onto the white at the top of the photograph, which leaves it
            some 45px clear of the board on a laptop and more on anything
            wider. Moved by `top` rather than by
            changing the padding, so the photograph stays where it was and
            the pair stays centred on the screen as it was drawn. The z-index
            is what keeps the words visible: the photograph's opacity makes it
            a layer of its own, painted after this one, and its white would
            otherwise cover them.

            Not on a phone. The mobile photograph is a closer crop and its
            tallest gold piece stands almost to the top edge, straight under
            the words: 60px down puts the arrow of "→ Explore" on its tip. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: `${LABEL_GAP}px`,
          }}
        >
          <CategoryLabel title="For Mind" align="center" href="/mind" />
        </div>
        {/* The band: at least MIND_BAND_VH, and on a wide screen growing with
            the photograph (`MIND_BAND`), the photograph across it, centred in
            its white (2026-11-21). On a phone the photograph is the band. */}
        <a href="/mind" aria-label="For Mind" style={{ ...BAND, ...BAND_LINK, minHeight: isMobile ? 0 : MIND_BAND }}>
          {/* One <picture> for both screens, the browser choosing the file
              (2026-11-20, the audit). Until then the page chose it in script:
              the server sent the computer's photograph, and a phone swapped it
              for its own once the script ran, so a phone downloaded both, 1.1MB,
              each marked to come before everything else. The section sits under
              the doors, so neither needs to jump the queue any more. The phone's
              file was re-encoded the same day, 645KB to 376KB. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* The computer's photograph at `MIND_PHOTO_W`, the phone's at the
              page's width, by a media query rather than `isMobile`, so the
              first paint already has the right one. */}
          <style>{`.mind-photo{width:${MIND_PHOTO_W}}@media (max-width:767px){.mind-photo{width:100%}}`}</style>
          <picture style={{ display: "block", width: "100%" }}>
            <source media="(max-width: 767px)" srcSet="/images/cat-mind-mobile.jpg?v=4" width={1000} height={1195} />
            <img
              src="/images/cat-mind.jpg"
              alt="Chess set — For Mind"
              width={2968}
              height={900}
              decoding="async"
              className="mind-photo"
              style={{ height: "auto", display: "block", margin: "0 auto", opacity: CATEGORY_IMAGE_OPACITY }}
            />
          </picture>
        </a>
      </div>
    </div>
  )
}

// FOR BODY — its words, then the pendant in its white band, fading in
function BodyRow() {
  const ref = useRef<HTMLDivElement>(null)
  const fade = useScrollFadeIn(ref as React.RefObject<HTMLElement>)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const bandVh = isMobile ? BODY_PHONE_BAND_VH : BODY_BAND_VH
  const pendantVh = isMobile ? BODY_PHONE_IN_BAND_VH : BODY_IN_BAND_VH

  return (
    <div
      ref={ref}
      style={{
        paddingTop: isMobile ? MIND_AFTER_PHONE : MIND_AFTER,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: fade,
        transform: `translateY(${(1 - fade) * 30}px)`,
        transition: "opacity 0.1s, transform 0.1s",
      }}
    >
      <div style={{ marginBottom: `${LABEL_GAP}px` }}>
        <CategoryLabel title="For Body" align="center" href="/body" />
      </div>
      <a href="/body" aria-label="For Body" style={{ ...BAND, ...BAND_LINK, height: `${bandVh}vh` }}>
        <Image
          src="/images/cat-body.jpg"
          alt="Body sculpture — For Body"
          width={1026}
          height={1868}
          style={{ display: "block", width: "auto", height: `${pendantVh}vh`, opacity: CATEGORY_IMAGE_OPACITY }}
        />
      </a>
    </div>
  )
}

export function CategoriesSection() {
  return (
    /**
     * Pulled up by one screen, deliberately.
     *
     * A sticky section stops being pinned one viewport before its container
     * ends — the last screen is the room its pinned child needs to travel up
     * through. The hero has finished washing to white by the time it gets
     * there, so that screen is a blank white scroll: some 900px of nothing
     * between the wash and For Mind arriving.
     *
     * Overlapping this section onto it by exactly that one screen puts For
     * Mind's row exactly on the screen at the moment the hero's pin releases,
     * which is where For Mind's beat is played. The hero then slides away,
     * washed white, against this section's own white, so nothing of it is ever
     * seen leaving and the two beats read as one dissolve.
     */
    <section style={{ background: DARK, width: "100%", marginTop: "-100vh" }}>
      <MindRow />
      <BodyRow />
      <SpaceRow />
    </section>
  )
}
