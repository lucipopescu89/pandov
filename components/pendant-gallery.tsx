"use client"

import { useRef, useState } from "react"
import { PendantViewer } from "@/components/pendant-viewer"
import { u } from "@/lib/canvas-length"

/**
 * A photograph of the pendant, as three files: one for a computer, a narrower
 * cut for a phone, which downloads only what a phone can show, and a thumbnail
 * for the gallery's column, a few kilobytes each.
 */
export type PendantPhoto = { src: string; phone: string; thumb: string; alt: string }

/** Screens this narrow and narrower get a photograph's phone file. */
const PHONE_MEDIA = "(max-width: 640px)"

/**
 * The model, drawn at 35% of the size that would fill the frame: the author
 * found it overbearing at full size beside the photographs, where the pendant
 * is a small thing in a large picture.
 */
const MODEL_SIZE = 0.35

/**
 * The frame's proportion, width to height: the author's own crop, 1440 × 1968,
 * which every photograph was recropped to on 2026-09-23 but the ones worn,
 * which stay 2:3 and lose a little top and bottom here. The author's design
 * draws the frame 640 wide, so 875 tall.
 */
const FRAME = "30 / 41"

/** How long one photograph takes to give way to the next. */
const FADE_MS = 700

/** The thumbnails not shown, as the design dims them. */
const DIM = 0.45

/** The active thumbnail's hairline: one device pixel on a 2× screen, as drawn. */
const EDGE = "#8E8982"

/**
 * The gallery of a pendant's page: its photographs one at a time in a frame,
 * and a column of thumbnails beside it that choose between them — the one
 * shown at full strength inside a hairline, the rest dimmed. The last
 * thumbnail is the pendant itself, small on the collection's ground, marked
 * 3D: it puts the model in the frame, to be turned by hand.
 *
 * A thumbnail crossfades the frame to its photograph; so does a click on the
 * photograph, to the next one, and after the last back to the first. On the
 * model a click cannot mean "next", because a drag there turns the pendant,
 * so the way back to the photographs is the thumbnails.
 *
 * A photograph is fetched only when it is shown or next in line, or when the
 * pointer comes to its thumbnail, and the frame changes to it only once it has
 * arrived, so a fade never passes through an empty frame. The model's viewer,
 * and three.js with it, is mounted only while the model is shown, so it is not
 * drawing sixty frames a second under a photograph, and a visitor who never
 * asks for it never downloads it.
 *
 * On a computer the thumbnails stand in a column to the left of the frame; on
 * a phone they run in a row under it.
 */
export function PendantGallery({
  name,
  model,
  cutout,
  photos,
}: {
  name: string
  model: string
  cutout: string
  photos: PendantPhoto[]
}) {
  const MODEL = photos.length
  // What the frame shows, and what was last asked for: they differ only while
  // a photograph asked for is still on its way.
  const [shown, setShown] = useState(0)
  const [wanted, setWanted] = useState(0)
  const wantedRef = useRef(0)
  const [fetched, setFetched] = useState(() => new Set([0, 1 % MODEL]))
  const loaded = useRef(new Set<number>())

  const request = (i: number) => {
    if (i < MODEL) setFetched((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  }

  const arrive = (i: number) => {
    setShown(i)
    request((i + 1) % MODEL)
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

  return (
    <div className="pg">
      <div className="pg-thumbs">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className="pg-thumb"
            aria-label={`Photograph ${i + 1} of ${MODEL}`}
            aria-pressed={wanted === i}
            onClick={() => ask(i)}
            onPointerEnter={() => request(i)}
            onFocus={() => request(i)}
          >
            <img src={photo.thumb} alt="" decoding="async" />
          </button>
        ))}
        <button
          type="button"
          className="pg-thumb pg-thumb-model"
          aria-label={`${name} in three dimensions`}
          aria-pressed={wanted === MODEL}
          onClick={() => ask(MODEL)}
        >
          <img src={cutout.replace(/\.avif$/, "-thumb.avif")} alt="" decoding="async" />
          <span aria-hidden="true">3D</span>
        </button>
      </div>

      <div className="pg-stage">
        {photos.map((photo, i) =>
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
                onClick={() => ask((i + 1) % MODEL)}
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
              />
            </picture>
          ) : null,
        )}
        {shown === MODEL && (
          <PendantViewer
            src={model}
            label={`${name}, in three dimensions — drag to turn it`}
            className="absolute inset-0"
            style={{ width: "100%", height: "100%", cursor: "grab" }}
            size={MODEL_SIZE}
          />
        )}
      </div>

      {/* The column and the frame at the design's own sizes on a computer:
          thumbnails 64 × 86, 18 apart, the frame 60 to their right. On a phone
          the frame is the page's width, or 560 at most on a tablet, and the
          thumbnails a row under it. */}
      <style>{`
        .pg { display: flex; flex-direction: column-reverse; }
        .pg-stage { position: relative; width: min(100%, 560px); margin: 0 auto; aspect-ratio: ${FRAME}; overflow: hidden; }
        .pg-thumbs { display: flex; justify-content: center; gap: 10px; margin-top: 12px; }
        .pg-thumb { position: relative; flex: none; width: 44px; aspect-ratio: 64 / 86; padding: 0; border: 0; background: none; cursor: pointer;
          opacity: ${DIM}; transition: opacity 300ms ease; }
        .pg-thumb:hover { opacity: 0.75; }
        .pg-thumb[aria-pressed="true"] { opacity: 1; cursor: default; }
        .pg-thumb::after { content: ""; position: absolute; inset: 0; border: 0.5px solid ${EDGE}; opacity: 0; transition: opacity 300ms ease; pointer-events: none; }
        .pg-thumb[aria-pressed="true"]::after { opacity: 1; }
        .pg-thumb > img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
        .pg-thumb-model > img { object-fit: contain; padding: 10% 0 26%; }
        .pg-thumb-model > span { position: absolute; left: 0; right: 0; bottom: 9%; text-align: center;
          font-family: var(--font-heading); font-size: 8px; letter-spacing: 0.2em; line-height: 1; color: #E9E4DC; }
        @media (min-width: 1024px) {
          .pg { flex-direction: row; align-items: flex-start; }
          .pg-thumbs { flex-direction: column; justify-content: flex-start; gap: ${u(18)}; margin: 0; width: max(40px, ${u(64)}); }
          .pg-thumb { width: 100%; }
          .pg-thumb-model > span { font-size: max(8px, ${u(9)}); }
          .pg-stage { width: ${u(640)}; margin: 0 0 0 ${u(60)}; }
        }
      `}</style>
    </div>
  )
}
