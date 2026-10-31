import Image from "next/image"

/**
 * How far the photograph rises up behind Selected, as % of the page width:
 * Selected's cards are 29.6% tall (26.4% wide at 507×568), and the
 * photograph's top sits 8.1% under their top, as in the mock-up.
 */
const RISE = 29.6 - 8.1

/**
 * MAKING section — laid out after the author's mock-up of 2026-10-30. The
 * photograph (the white vase in the burnt trunk, on white) runs the page's
 * full width, whole: the white beyond the trunk's foot on the right shows
 * too. It rises up behind Selected, under that section's heading; its ground
 * is pure white (255), so it meets the page with no edge. The heading and the
 * manifesto stand on the left, under Selected's cards.
 *
 * The source is `D:\PANDOV\MARKETING\ELEMENTE WEBSITE\1 HOMEPAGE\Homepage_making.jpg`
 * (7667 × 5652), exported whole at 2400 wide (2400 × 1769), JPEG q86 4:4:4.
 * It was first cut at 7300 wide, at the trunk's right edge, so the trunk met
 * the page's edge; the author asked for the whole width the same evening.
 * Read its top-left pixel after a re-export: it must be 255,255,255. The
 * export came out with a soft white wash baked in, thinning from the top
 * down (the wood's deepest shadows read 72 at the top and 21 at the foot);
 * `scripts/making-ungrade.py` takes it out, and must be run on a fresh
 * export (2026-10-31, the author's asking). The gold motes in its crevices
 * (`public/pandov-grain.js`) are drawn in this file's pixels: a recrop moves
 * them too (see CLAUDE.md).
 *
 * The old satori photograph's white washes and the band pinned to the middle
 * of the screen went with it: the new photograph is shown as it is.
 *
 * Since 2026-10-31, the author's asking, the photograph stays in full view
 * as the footer's hand comes up under it. It used to dissolve to the white
 * page by the time the whole hand was on screen, timed off the hand's box.
 *
 * And it is no longer a link to /making: a click on it sends the gold motes
 * up every crevice at once (`public/pandov-grain.js`, which finds the
 * photograph by its alt text). The /making page itself is unchanged and is
 * reached from the bottom menu.
 */
export function MakingSection() {
  return (
    <section
      style={{
        position: "relative",
        background: "#fff",
        width: "100%",
        marginTop: `-${RISE}%`,
        paddingBottom: "120px",
      }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "2400 / 1769" }}>
          <Image
            src="/images/home/making-sculpture.jpg"
            alt="A white vase in a burnt trunk — the making process"
            fill
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>

        {/* Heading + manifesto — on the left, under Selected's cards */}
        <div style={{ position: "absolute", left: "15%", top: "35.6%", maxWidth: "40%" }}>
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              textTransform: "uppercase",
              fontSize: "clamp(11px, 1.6vw, 32px)",
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: "#444",
              margin: 0,
            }}
          >
            Making
          </p>
          {/* Lines broken as in the design; a narrow screen still wraps them. */}
          <p
            style={{
              fontSize: "clamp(9px, 0.75vw, 15px)",
              lineHeight: 1.35,
              color: "#888",
              margin: "clamp(8px, 1.1vw, 22px) 0 0",
            }}
          >
            Every object begins with the search for a form.
            <br />
            Some are discovered. Some are imagined.
            <br />
            All are shaped through a dialogue between
            <br />
            material, intuition and technology.
          </p>
        </div>
      </div>
    </section>
  )
}
