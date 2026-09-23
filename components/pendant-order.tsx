"use client"

import { useState } from "react"
import type { Material } from "@/lib/second-wind"
import { u } from "@/lib/canvas-length"

/*
 * The colours of the order panel, read off the author's Figma design ("Varianta
 * D"): a warm ivory for what is chosen, a warm grey for what may be, a darker
 * one for labels and prices, and the pendants' gold for the one thing to press.
 */
const INK = "#E9E4DC"
const TEXT = "#8E8982"
const MUTED = "#7C7770"
const RULE = "#343230"
const GOLD = "#C6A36B"
/** The dots: a yellow metal and a white one. */
const DOT = { gold: "#B8904A", white: "#979799" }

/** A length that follows the canvas down to a floor, for type that must stay legible. */
const fit = (n: number, floor: number) => `clamp(${floor}px, ${((n / 1920) * 100).toFixed(4)}vw, ${n}px)`

type Choice = { title: "Finish" | "Karat"; options: Record<string, number> }

/** A metal's finish or karat, if it is priced by one. */
const choiceOf = (m: Material): Choice | null =>
  "finish" in m ? { title: "Finish", options: m.finish } : "karat" in m ? { title: "Karat", options: m.karat } : null

const firstOf = (c: Choice | null) => (c ? Object.keys(c.options)[0] : null)

const priceOf = (m: Material, option: string | null) => {
  const c = choiceOf(m)
  return c && option ? c.options[option] : "price" in m ? m.price : 0
}

/** Every price a row of metals can come to, as the panel prints it beside the row: "85 – 180 €". */
const spanOf = (row: Material[]) => {
  const all = row.flatMap((m) => ("price" in m ? [m.price] : Object.values(choiceOf(m)!.options)))
  const lo = Math.min(...all), hi = Math.max(...all)
  return lo === hi ? `${lo} €` : `${lo} – ${hi} €`
}

const mailto = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

/**
 * The metals a pendant is made in, the finish or karat of the chosen one, its
 * price, and the two ways to act on it: ORDER, and a question.
 *
 * One metal is chosen at a time, Brass at first. Brass and Silver come in a
 * natural or a polished finish, Gold in 14 or 18 karat; the others come one
 * way only. The row for the finish or the karat opens under the metals when
 * the chosen metal has one, and closes when it has none, fading as it goes and
 * easing the price below it up or down rather than letting it jump; changing
 * the metal sets it back to its first option. The price follows the choice at
 * once, with a short fade, and beside it the choice in words.
 *
 * There is no shop behind the site. ORDER and "Ask a question" open the
 * visitor's own mail program on a message to the studio already written: the
 * pendant, the metal, its finish or karat and the price, or the pendant alone.
 */
export function PendantOrder({ name, materials, email }: { name: string; materials: Material[][]; email: string }) {
  const all = materials.flat()
  const [metal, setMetal] = useState(all[0].metal)
  const chosen = all.find((m) => m.metal === metal) ?? all[0]
  const choice = choiceOf(chosen)
  const [option, setOption] = useState<string | null>(firstOf(choice))

  // What the finish-or-karat row shows while it closes: the last one it had,
  // so it fades out with its words still in it instead of emptying first.
  const [lastChoice, setLastChoice] = useState<Choice | null>(choice)
  if (choice && choice !== lastChoice && choice.title !== lastChoice?.title) setLastChoice(choice)
  const shownChoice = choice ?? lastChoice

  const pick = (m: Material) => {
    setMetal(m.metal)
    setOption(firstOf(choiceOf(m)))
  }

  const price = priceOf(chosen, option)
  const words = option ? `${chosen.metal} · ${option}` : chosen.metal

  const order = mailto(
    email,
    `Order: ${name}, ${words.replace(" · ", ", ")}`,
    [
      "Hello,",
      "",
      `I would like to order ${name}, from Second Wind:`,
      "",
      `Metal: ${chosen.metal}`,
      ...(choice && option ? [`${choice.title}: ${option}`] : []),
      `Price: ${price} €`,
      "",
      "",
    ].join("\r\n"),
  )
  const ask = mailto(email, `A question about ${name}`, `Hello,\r\n\r\nI have a question about ${name}, from Second Wind.\r\n\r\n`)

  return (
    <div className="po">
      <p className="po-label">Metal</p>
      {materials.map((row, i) => (
        <div key={i} className="po-row">
          {row.map((m) => (
            <button
              key={m.metal}
              type="button"
              className="po-option po-metal"
              aria-pressed={m.metal === metal}
              onClick={() => pick(m)}
            >
              <span className="po-dot" style={{ backgroundColor: DOT[m.tone] }} />
              <span>{m.label ?? m.metal}</span>
            </button>
          ))}
          <span className="po-span">{spanOf(row)}</span>
        </div>
      ))}

      <div className="po-choice" data-open={choice ? "" : undefined} inert={!choice}>
        <div>
          {shownChoice && (
            <div key={shownChoice.title} className="po-choice-row">
              <p className="po-label">{shownChoice.title}</p>
              {Object.keys(shownChoice.options).map((o) => (
                <button
                  key={o}
                  type="button"
                  className="po-option"
                  aria-pressed={choice?.title === shownChoice.title && o === option}
                  onClick={() => setOption(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="po-price" aria-live="polite">
        <span key={`${price}-${words}`} className="po-fade">
          <span className="po-amount">{price} €</span>
          <span className="po-words">{words}</span>
        </span>
      </p>

      <a className="po-order" href={order}>
        <span>Order</span>
      </a>
      <a className="po-ask" href={ask}>
        <span className="po-arrow" aria-hidden="true">
          {"→"}
        </span>
        <span>Ask a question</span>
      </a>

      {/* Figma lengths at 1920, through u(); type through fit(), which follows
          the canvas down to a floor. Line boxes are 1em tall throughout, so
          each margin below is the distance between two boxes in the design. */}
      <style>{`
        .po { border-top: 1px solid ${RULE}; }
        .po-label { font-family: var(--font-heading); font-size: 10px; letter-spacing: 0.3em; line-height: 1; text-transform: uppercase; color: ${MUTED}; }
        .po > .po-label { margin: 28px 0 4px; }
        .po-row { display: flex; align-items: flex-end; height: 52px; padding-bottom: 18px; border-bottom: 1px solid ${RULE}; }
        .po-option { position: relative; display: flex; align-items: flex-end; background: none; border: 0; padding: 0; margin: 0 22px 0 0; cursor: pointer;
          font-family: var(--font-body); font-weight: 300; font-size: 15px; line-height: 1; color: ${TEXT}; transition: opacity 150ms, color 250ms; }
        .po-option:hover:not([aria-pressed="true"]) { opacity: 0.5; }
        .po-option[aria-pressed="true"] { color: ${INK}; cursor: default; }
        .po-option::after { content: ""; position: absolute; left: 0; right: 0; top: calc(100% + 8px); height: 1px; background: ${GOLD}; opacity: 0; transition: opacity 250ms; }
        .po-option[aria-pressed="true"]::after { opacity: 1; }
        .po-dot { flex: none; width: 6px; height: 6px; border-radius: 50%; margin: 0 8px 4px 0; }
        .po-span { margin: 0 0 -2px auto; font-family: var(--font-body); font-weight: 300; font-size: 13px; line-height: 1; color: ${MUTED}; white-space: nowrap; }

        .po-choice { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 450ms ease, opacity 450ms ease; }
        .po-choice[data-open] { grid-template-rows: 1fr; opacity: 1; }
        .po-choice > div { overflow: hidden; min-height: 0; }
        .po-choice-row { display: flex; align-items: flex-end; padding: 30px 0 18px; animation: po-fade 450ms ease; }
        .po-choice-row > .po-label { flex: none; width: 76px; margin: 0; }

        .po-price { margin-top: 28px; }
        .po-fade { display: inline-flex; align-items: baseline; animation: po-fade 260ms ease; }
        .po-amount { font-family: var(--font-body); font-weight: 300; font-size: 32px; line-height: 1; color: ${INK}; }
        .po-words { margin-left: 14px; font-family: var(--font-body); font-weight: 300; font-size: 13px; line-height: 1; color: ${MUTED}; }
        @keyframes po-fade { from { opacity: 0; } to { opacity: 1; } }

        .po-order { display: flex; align-items: center; justify-content: center; height: 50px; margin-top: 24px; border: 1px solid rgba(198, 163, 107, 0.8);
          font-family: var(--font-heading); font-size: 11px; letter-spacing: 0.48em; text-transform: uppercase; color: ${GOLD};
          background-color: rgba(198, 163, 107, 0); transition: background-color 700ms ease; }
        .po-order:hover { background-color: rgba(198, 163, 107, 0.14); }
        .po-order > span { margin-right: -0.48em; }
        .po-ask { display: flex; align-items: center; justify-content: center; margin-top: 20px;
          font-family: var(--font-heading); font-size: 10px; letter-spacing: 0.3em; line-height: 1; text-transform: uppercase; color: ${TEXT}; transition: opacity 150ms; }
        .po-ask > span:last-child { margin-right: -0.3em; }
        .po-ask:hover { opacity: 0.5; }
        .po-arrow { letter-spacing: 0; margin-right: 1.45em; }

        @media (min-width: 1024px) {
          .po-label { font-size: ${fit(11, 10)}; }
          .po > .po-label { margin: ${u(44)} 0 ${u(1)}; }
          .po-row { height: ${u(65)}; padding-bottom: ${u(23.3)}; }
          .po-option { font-size: ${fit(16, 14)}; margin-right: ${u(36)}; }
          .po-option::after { top: calc(100% + ${u(8.3)}); }
          .po-dot { width: max(5px, ${u(7)}); height: max(5px, ${u(7)}); margin: 0 ${u(10)} ${u(4.7)} 0; }
          .po-span { font-size: ${fit(14, 12)}; margin-bottom: calc(-1 * ${u(2.7)}); }
          .po-choice-row { padding: ${u(46.7)} 0 ${u(23.3)}; }
          .po-choice-row > .po-label { width: max(${u(91.5)}, 8em); }
          .po-price { margin-top: ${u(36.9)}; }
          .po-amount { font-size: ${fit(40, 30)}; }
          .po-words { font-size: ${fit(14, 12)}; margin-left: ${u(20)}; }
          .po-order { height: max(44px, ${u(54)}); margin-top: ${u(27.1)}; font-size: ${fit(12, 11)}; }
          .po-ask { margin-top: ${u(24.5)}; font-size: ${fit(11, 10)}; }
        }
      `}</style>
    </div>
  )
}
