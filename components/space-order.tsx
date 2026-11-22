"use client"

import { createContext, useCallback, useContext, useState } from "react"
import type { SpaceFinish } from "@/lib/space"
import { u } from "@/lib/canvas-length"
import { JULIUS_MIN, TEXT_MIN, TEXT_TRACK, TRACK } from "@/lib/type"

/*
 * The order panel of a piece of Space, after the pendants' (`pendant-order.tsx`):
 * the same colours, type and lengths, so the two pages read as one. Where a
 * pendant chooses a metal, a piece of Space chooses its wood's finish; there
 * is one price for every finish, so the row prints it once, and there is no
 * second row to open under it.
 */
const INK = "#E9E4DC"
const TEXT = "#8E8982"
const MUTED = "#7C7770"
const RULE = "#343230"
const GOLD = "#C6A36B"

/** A length that follows the canvas down to a floor, for type that must stay legible. */
const fit = (n: number, floor: number) => `clamp(${floor}px, ${((n / 1920) * 100).toFixed(4)}vw, ${n}px)`

const mailto = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

/**
 * The finish chosen, by its place in the piece's list. `picks` counts the
 * visitor's own choices, so the gallery can tell a choice from the one the
 * page opens on.
 */
export type SpacePicked = { finish: number; picks: number }

const FinishContext = createContext<{ picked: SpacePicked; choose: (finish: number) => void } | null>(null)

/** Holds the finish above the panel and the gallery, which are siblings on the page. */
export function SpaceChoice({ children }: { children: React.ReactNode }) {
  const [picked, setPicked] = useState<SpacePicked>({ finish: 0, picks: 0 })
  const choose = useCallback(
    (finish: number) => setPicked((p) => (p.finish === finish ? p : { finish, picks: p.picks + 1 })),
    [],
  )
  return <FinishContext value={{ picked, choose }}>{children}</FinishContext>
}

export function useFinish() {
  const context = useContext(FinishContext)
  if (!context) throw new Error("useFinish needs a SpaceChoice around it")
  return context
}

/** Lines of the details that follow the finish chosen: a line the two share stays put, a new one fades in. */
export function SpaceFinishLines({ finishes, of }: { finishes: SpaceFinish[]; of: "wood" | "made" }) {
  const { picked } = useFinish()
  return finishes[picked.finish][of].map((line) => (
    <span key={line} className="so-fade">
      {line}
    </span>
  ))
}

/**
 * The finishes, the price, and ORDER and "Ask a question", which open the
 * visitor's own mail program on a message to the studio already written, as
 * the pendants' do.
 */
export function SpaceOrder({
  name,
  collection,
  finishes,
  price,
  email,
}: {
  name: string
  collection: string
  finishes: SpaceFinish[]
  price: number
  email: string
}) {
  const { picked, choose } = useFinish()
  const chosen = finishes[picked.finish]

  const order = mailto(
    email,
    `Order: ${name}, ${chosen.name}`,
    ["Hello,", "", `I would like to order ${name}, from ${collection}:`, "", `Finish: ${chosen.name}`, `Price: ${price} €`, "", ""].join(
      "\r\n",
    ),
  )
  const ask = mailto(email, `A question about ${name}`, `Hello,\r\n\r\nI have a question about ${name}, from ${collection}.\r\n\r\n`)

  return (
    <div className="so">
      <p className="so-label">Finish</p>
      <div className="so-row">
        {finishes.map((f, i) => (
          <button key={f.name} type="button" className="so-option" aria-pressed={i === picked.finish} onClick={() => choose(i)}>
            <span className="so-dot" style={{ backgroundColor: f.dot }} />
            <span>{f.name}</span>
          </button>
        ))}
        <span className="so-span">{price} €</span>
      </div>

      <p className="so-price" aria-live="polite">
        <span key={chosen.name} className="so-fade">
          <span className="so-amount">{price} €</span>
          <span className="so-words">{chosen.name}</span>
        </span>
      </p>

      <a className="so-order" href={order}>
        <span>Order</span>
      </a>
      <a className="so-ask" href={ask}>
        <span className="so-arrow" aria-hidden="true">
          {"→"}
        </span>
        <span>Ask a question</span>
      </a>

      <style>{`
        .so { border-top: 1px solid ${RULE}; }
        .so-label { margin: 28px 0 4px; font-family: var(--font-heading); font-size: ${JULIUS_MIN}px; letter-spacing: ${TRACK}; line-height: 1; text-transform: uppercase; color: ${MUTED}; }
        .so-row { display: flex; align-items: flex-end; height: 52px; padding-bottom: 18px; border-bottom: 1px solid ${RULE}; }
        .so-option { position: relative; display: flex; align-items: flex-end; background: none; border: 0; padding: 0; margin: 0 22px 0 0; cursor: pointer;
          font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; letter-spacing: ${TEXT_TRACK}; line-height: 1; color: ${TEXT}; transition: opacity 150ms, color 250ms; }
        .so-option:hover:not([aria-pressed="true"]) { opacity: 0.5; }
        .so-option[aria-pressed="true"] { color: ${INK}; cursor: default; }
        .so-option::after { content: ""; position: absolute; left: 0; right: 0; top: calc(100% + 8px); height: 1px; background: ${GOLD}; opacity: 0; transition: opacity 250ms; }
        .so-option[aria-pressed="true"]::after { opacity: 1; }
        .so-dot { flex: none; width: 6px; height: 6px; border-radius: 50%; margin: 0 8px 4px 0; }
        .so-span { margin: 0 0 -2px auto; font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; letter-spacing: ${TEXT_TRACK}; line-height: 1; color: ${MUTED}; white-space: nowrap; }
        .so-price { margin-top: 28px; }
        .so-fade { display: inline-flex; align-items: baseline; animation: so-fade 260ms ease; }
        .so-amount { font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; letter-spacing: ${TEXT_TRACK}; line-height: 1; color: ${INK}; }
        .so-words { margin-left: 14px; font-family: var(--font-text); font-weight: 400; font-size: ${TEXT_MIN}px; letter-spacing: ${TEXT_TRACK}; line-height: 1; color: ${MUTED}; }
        @keyframes so-fade { from { opacity: 0; } to { opacity: 1; } }
        .so-order { display: flex; align-items: center; justify-content: center; height: 50px; margin-top: 24px; border: 1px solid rgba(198, 163, 107, 0.8);
          font-family: var(--font-heading); font-size: ${JULIUS_MIN}px; letter-spacing: ${TRACK}; text-transform: uppercase; color: ${GOLD};
          background-color: rgba(198, 163, 107, 0); transition: background-color 700ms ease; }
        .so-order:hover { background-color: rgba(198, 163, 107, 0.14); }
        .so-order > span { margin-right: -${TRACK}; }
        .so-ask { display: flex; align-items: center; justify-content: center; margin-top: 20px;
          font-family: var(--font-heading); font-size: ${JULIUS_MIN}px; letter-spacing: ${TRACK}; line-height: 1; text-transform: uppercase; color: ${TEXT}; transition: opacity 150ms; }
        .so-ask > span:last-child { margin-right: -${TRACK}; }
        .so-ask:hover { opacity: 0.5; }
        .so-arrow { letter-spacing: 0; margin-right: 1.45em; }

        @media (min-width: 1024px) {
          .so-label { margin: ${u(44)} 0 ${u(1)}; font-size: ${fit(11, JULIUS_MIN)}; }
          .so-row { height: ${u(65)}; padding-bottom: ${u(23.3)}; }
          .so-option { margin-right: ${u(36)}; }
          .so-option::after { top: calc(100% + ${u(8.3)}); }
          .so-dot { width: max(5px, ${u(7)}); height: max(5px, ${u(7)}); margin: 0 ${u(10)} ${u(4.7)} 0; }
          .so-span { margin-bottom: calc(-1 * ${u(2.7)}); }
          .so-price { margin-top: ${u(36.9)}; }
          .so-words { margin-left: ${u(20)}; }
          .so-order { height: max(44px, ${u(54)}); margin-top: ${u(27.1)}; font-size: ${fit(12, 11)}; }
          .so-ask { margin-top: ${u(24.5)}; font-size: ${fit(11, JULIUS_MIN)}; }
        }
      `}</style>
    </div>
  )
}
