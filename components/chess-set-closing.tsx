import { STUDIO_EMAIL } from "@/lib/second-wind"
import { TEXT_SIZE, TEXT_TRACK, TRACK } from "@/lib/type"

/*
 * The end of the Chess Set page (2026-11-23, the author's asking): how the set
 * is made, that it is made to order and its price is given on request, and one
 * way to ask for it.
 *
 * The author weighed giving the set an order page with a price, as the
 * pendants and Heavy Light have, and chose to keep it apart: it is the studio's
 * iconic piece, a set in gold or platinum comes to a sum that moves with the
 * metal's price, and those who commission one write first in any case. Until
 * that day the same note ("Pricing is available upon request") and a CONTACT
 * link to /contact stood in the middle of the page, in the statement beside the
 * ornament, and the page ended on the pieces' six dots with nothing after them.
 * The statement now keeps only its line, and this closes the page instead,
 * under the pieces, in their white: the board's last square stays the last.
 *
 * ENQUIRE opens the visitor's own mail program on a message to the studio
 * already written, as ORDER and "Ask a question" do on the order pages (the
 * author's choice of 2026-09-23 over a form or a cart; see `STUDIO_EMAIL`). It
 * wears the ORDER button's frame, in a deeper gold: the order pages' #C6A36B is
 * drawn for the dark and is 2.4 : 1 on white, too faint for 12px type; this is
 * about 4 : 1.
 *
 * The words are Manrope, being read rather than glanced at (the brand rule:
 * the details and the price are Manrope), at the one size and tracking; only
 * the button is Julius, as ORDER is.
 */

const MAKING =
  "Each piece is 3D printed directly in metal (steel, titanium) or lost-wax cast (brass, bronze, silver, gold), depending on the commission. A bespoke board can be crafted to match the edition."
const TERMS = "Made to order. Price on request."

/** The paragraph's grey on white, a step darker than the page's #888 so 12px reads easily. */
const TEXT = "#7a7a7a"
/** The terms, read as the price is read on the order pages: the strongest ink of the block. */
const INK = "#4a4a4a"
/** The ORDER button's gold, deepened for white. */
const GOLD = "#9c7c48"

const enquire = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent("Enquiry: Chess Set")}&body=${encodeURIComponent(
  ["Hello,", "", "I would like to know more about the Chess Set, from Mind.", "", "Metal:", "Board:", "", ""].join("\r\n"),
)}`

export function ChessSetClosing() {
  return (
    <div className="cs-close">
      <p className="cs-close-making">{MAKING}</p>
      <p className="cs-close-terms">{TERMS}</p>
      <a className="cs-close-enquire" href={enquire}>
        <span>Enquire</span>
      </a>

      <style>{`
        /* Under the six dots, with room enough that it reads as the page's
           close and not as a caption to the pair above it. */
        .cs-close {
          max-width: 460px;
          margin: 120px auto 0;
          padding: 0 24px;
          box-sizing: content-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .cs-close-making,
        .cs-close-terms {
          margin: 0;
          font-family: var(--font-text), sans-serif;
          font-weight: 400;
          font-size: ${TEXT_SIZE}px;
          letter-spacing: ${TEXT_TRACK};
          line-height: 1.8;
        }
        .cs-close-making { color: ${TEXT}; }
        .cs-close-terms { margin-top: 28px; color: ${INK}; }
        .cs-close-enquire {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 220px;
          height: 46px;
          margin-top: 36px;
          border: 1px solid ${GOLD};
          font-family: var(--font-heading);
          font-size: 12px; /* the menus' size */
          letter-spacing: ${TRACK};
          text-transform: uppercase;
          color: ${GOLD};
          text-decoration: none;
          background-color: rgba(156, 124, 72, 0);
          transition: background-color 700ms ease;
        }
        .cs-close-enquire:hover { background-color: rgba(156, 124, 72, 0.08); }
        /* The tracking's last 0.2em given back, so the word sits on the centre. */
        .cs-close-enquire > span { margin-right: -${TRACK}; }
        @media (max-width: 768px) {
          .cs-close { margin-top: 88px; }
        }
      `}</style>
    </div>
  )
}
