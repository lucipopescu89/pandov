"use client"

import { useEffect, useRef, useState } from "react"
import { SpaceViewer } from "@/components/space-viewer"
import { useFinish } from "@/components/space-order"
import type { SpaceFinish } from "@/lib/space"
import { u } from "@/lib/canvas-length"
import { JULIUS_MIN, TRACK } from "@/lib/type"

/*
 * The gallery of a piece of Space: the pendants' gallery (`pendant-gallery.tsx`)
 * at the same sizes, with two things of its own.
 *
 * The photographs are the finish's: choosing Ebonised in the panel swaps the
 * thumbnails for the ebonised piece's and, if a photograph is shown, fades the
 * frame to the first of them; if the model is shown, it stays, and its wood
 * darkens. And a lamp is shown lit: on the model, a switch turns its light on
 * and off.
 *
 * Every photograph of every finish has its place in one list, so a fade from a
 * natural photograph to an ebonised one is the same fade as between two of the
 * same finish; only the finish's own are offered as thumbnails.
 */

const PHONE_MEDIA = "(max-width: 640px)"

/** The lamp drawn at this share of the size that would fill the frame. */
const MODEL_SIZE = 0.78

/** The frame's proportion, the pendants' 1440 × 1968. */
const FRAME = "30 / 41"
const FADE_MS = 700
const DIM = 0.45
const EDGE = "#8E8982"
const TEXT = "#8E8982"
const GOLD = "#C6A36B"

export function SpaceGallery({ name, model, finishes }: { name: string; model: string; finishes: SpaceFinish[] }) {
  // Every finish's photographs in one list; each finish's places in it.
  const all = finishes.flatMap((f) => f.photos)
  const places = finishes.map((_, i) => {
    const from = finishes.slice(0, i).reduce((n, f) => n + f.photos.length, 0)
    return finishes[i].photos.map((__, k) => from + k)
  })
  const MODEL = all.length

  const { picked } = useFinish()
  const finish = finishes[picked.finish]
  const own = places[picked.finish]

  const [shown, setShown] = useState(0)
  const [wanted, setWanted] = useState(0)
  const wantedRef = useRef(0)
  const [fetched, setFetched] = useState(() => new Set(own.slice(0, 2)))
  const loaded = useRef(new Set<number>())
  const [lit, setLit] = useState(false)

  const request = (i: number) => {
    if (i < MODEL) setFetched((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  }
  /** The photograph after `i` among its own finish's, round to the first. */
  const after = (i: number) => {
    const list = places.find((p) => p.includes(i)) ?? own
    return list[(list.indexOf(i) + 1) % list.length]
  }
  const arrive = (i: number) => {
    setShown(i)
    if (i < MODEL) request(after(i))
  }
  const ask = (i: number) => {
    setWanted(i)
    wantedRef.current = i
    if (i === MODEL || loaded.current.has(i)) arrive(i)
    else request(i)
  }
  const onLoad = (i: number) => {
    loaded.current.add(i)
    if (wantedRef.current === i) arrive(i)
  }

  // A new finish: its first photograph, unless the model is shown, which
  // stays and changes its wood. Only the count is watched (see PendantGallery).
  useEffect(() => {
    if (picked.picks && wantedRef.current !== MODEL) ask(own[0])
  }, [picked.picks])

  return (
    <div className="sg">
      <div className="sg-thumbs">
        {own.map((i, k) => (
          <button
            key={all[i].src}
            type="button"
            className="sg-thumb"
            aria-label={`Photograph ${k + 1} of ${own.length}, ${finish.name}`}
            aria-pressed={wanted === i}
            onClick={() => ask(i)}
            onPointerEnter={() => request(i)}
            onFocus={() => request(i)}
          >
            <img src={all[i].thumb} alt="" decoding="async" />
          </button>
        ))}
        <button
          type="button"
          className="sg-thumb sg-thumb-model"
          aria-label={`${name} in three dimensions`}
          aria-pressed={wanted === MODEL}
          onClick={() => ask(MODEL)}
        >
          <img src={finish.modelThumb} alt="" decoding="async" />
          <span aria-hidden="true">3D</span>
        </button>
      </div>

      <div className="sg-stage">
        {all.map((photo, i) =>
          fetched.has(i) ? (
            <picture
              key={photo.src}
              className="absolute inset-0 block"
              style={{
                opacity: shown === i ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease`,
                pointerEvents: shown === i ? "auto" : "none",
              }}
            >
              <source srcSet={photo.phone} media={PHONE_MEDIA} />
              <img
                ref={(img) => {
                  if (img?.complete && img.naturalWidth) loaded.current.add(i)
                }}
                src={photo.src}
                alt={photo.alt}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "low"}
                onLoad={() => onLoad(i)}
                onClick={() => ask(after(i))}
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
              />
            </picture>
          ) : null,
        )}
        {shown === MODEL && (
          <>
            <SpaceViewer
              src={model}
              label={`${name}, ${finish.name.toLowerCase()}, in three dimensions — drag to turn it`}
              className="absolute inset-0"
              style={{ width: "100%", height: "100%", cursor: "grab" }}
              size={MODEL_SIZE}
              wood={finish.look}
              lit={lit}
            />
            {/* The lamp's switch, under it in the frame. */}
            <button type="button" className="sg-light" aria-pressed={lit} onClick={() => setLit((on) => !on)}>
              <span className="sg-light-dot" aria-hidden="true" />
              <span>{lit ? "Light on" : "Light off"}</span>
            </button>
          </>
        )}
      </div>

      <style>{`
        .sg { display: flex; flex-direction: column-reverse; }
        .sg-stage { position: relative; width: min(100%, 560px); margin: 0 auto; aspect-ratio: ${FRAME}; overflow: hidden; }
        .sg-thumbs { display: flex; justify-content: center; gap: 10px; margin-top: 12px; }
        .sg-thumb { position: relative; flex: none; width: 44px; aspect-ratio: 64 / 86; padding: 0; border: 0; background: none; cursor: pointer;
          opacity: ${DIM}; transition: opacity 300ms ease; animation: sg-in 400ms ease; }
        .sg-thumb:hover { opacity: 0.75; }
        .sg-thumb[aria-pressed="true"] { opacity: 1; cursor: default; }
        .sg-thumb::after { content: ""; position: absolute; inset: 0; border: 0.5px solid ${EDGE}; opacity: 0; transition: opacity 300ms ease; pointer-events: none; }
        .sg-thumb[aria-pressed="true"]::after { opacity: 1; }
        .sg-thumb > img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
        .sg-thumb-model { animation: none; }
        .sg-thumb-model > img { object-fit: contain; padding: 8% 0 24%; }
        .sg-thumb-model > span { position: absolute; left: 0; right: 0; bottom: 9%; text-align: center;
          font-family: var(--font-heading); font-size: ${JULIUS_MIN}px; letter-spacing: ${TRACK}; line-height: 1; color: #E9E4DC; }
        @keyframes sg-in { from { opacity: 0; } }

        .sg-light { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px;
          padding: 10px 14px 10px calc(14px + ${TRACK}); border: 0; background: none; cursor: pointer; white-space: nowrap;
          font-family: var(--font-heading); font-size: ${JULIUS_MIN}px; letter-spacing: ${TRACK}; line-height: 1; text-transform: uppercase; color: ${TEXT};
          transition: opacity 150ms, color 400ms; animation: sg-in 1.2s ease; }
        .sg-light:hover { opacity: 0.6; }
        .sg-light[aria-pressed="true"] { color: #E9E4DC; }
        .sg-light-dot { flex: none; width: 7px; height: 7px; border-radius: 50%; border: 1px solid ${GOLD}; background: transparent;
          transition: background-color 400ms, box-shadow 400ms; }
        .sg-light[aria-pressed="true"] .sg-light-dot { background: ${GOLD}; box-shadow: 0 0 8px 2px rgba(255, 190, 110, 0.55); }

        @media (min-width: 1024px) {
          .sg { flex-direction: row; align-items: flex-start; }
          .sg-thumbs { flex-direction: column; justify-content: flex-start; gap: ${u(18)}; margin: 0; width: max(40px, ${u(64)}); }
          .sg-thumb { width: 100%; }
          .sg-stage { width: ${u(640)}; margin: 0 0 0 ${u(60)}; }
          .sg-light { bottom: ${u(30)}; }
        }
      `}</style>
    </div>
  )
}
