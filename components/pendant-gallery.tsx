"use client"

import { useState, type ReactNode } from "react"
import { PendantViewer } from "@/components/pendant-viewer"
import { u } from "@/lib/canvas-length"

/**
 * A photograph of the pendant, as two files: one for a computer and a
 * narrower cut for a phone, which downloads only what a phone can show.
 */
export type PendantPhoto = { src: string; phone: string; alt: string }

/** Screens this narrow and narrower get a photograph's phone file. */
const PHONE_MEDIA = "(max-width: 640px)"

/**
 * The model, drawn at 35% of the size that would fill the frame: the author
 * found it overbearing at full size beside the photographs, where the pendant
 * is a small thing in a large picture.
 */
const MODEL_SIZE = 0.35

/** How long one photograph takes to give way to the next. */
const FADE_MS = 700

/** The marks' grey, the site's own, and the gold of the one that means the model. */
const MARK = "#888888"
const MARK_GOLD = "#C9A461"

/**
 * The stage of a pendant's page: its photographs, one at a time, and its
 * model in three dimensions in the same frame, with a column of marks beside
 * them — a grey ring for each photograph, filled for the one shown, and a
 * gold one below for the model.
 *
 * A click on a photograph fades to the next, and after the last back to the
 * first; the model is reached only from its mark. On the model a click cannot
 * mean "next", because a drag there turns the pendant, so the way back to the
 * photographs is the marks too.
 *
 * Only the photograph shown and the one after it are fetched: a page of six
 * would otherwise download all six for a visitor who looks at one. The model's
 * viewer, and three.js with it, is mounted only while the model is shown, so
 * it is not drawing sixty frames a second under a photograph, and a visitor
 * who never asks for it never downloads it.
 *
 * `children` is the text column, laid beside the marks on a computer and
 * under them on a phone. On a phone the marks run in a row under the stage.
 */
export function PendantGallery({
  name,
  model,
  photos,
  children,
}: {
  name: string
  model: string
  photos: PendantPhoto[]
  children: ReactNode
}) {
  const MODEL = photos.length
  const [shown, setShown] = useState(0)
  const [fetched, setFetched] = useState(() => new Set([0, 1 % MODEL]))

  const show = (i: number) => {
    setShown(i)
    if (i < MODEL) setFetched((prev) => new Set(prev).add(i).add((i + 1) % MODEL))
  }

  return (
    <div className="pg flex w-full flex-col lg:flex-row lg:items-start lg:justify-center">
      <div className="pg-stage relative w-full shrink-0 overflow-hidden" style={{ aspectRatio: "2 / 3" }}>
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
                src={photo.src}
                alt={photo.alt}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "low"}
                onClick={() => show((i + 1) % MODEL)}
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

      <div className="pg-marks flex flex-row items-center justify-center">
        {photos.map((photo, i) => (
          <Mark key={photo.src} label={`Photograph ${i + 1} of ${MODEL}`} on={shown === i} onClick={() => show(i)} />
        ))}
        <Mark label={`${name} in three dimensions`} on={shown === MODEL} gold onClick={() => show(MODEL)} />
      </div>

      {children}

      {/* The stage and the marks at the design's own sizes on a computer; on a
          phone the stage is the page's width and the marks a row under it.
          The gold mark stands apart from the grey ones by four of their own
          steps, at the author's asking, so the model reads as another kind of
          thing than a photograph. On a computer the marks, like the text
          beside them, stay on screen while the photograph scrolls by. */}
      <style>{`
        .pg-marks { gap: 16px; padding: 24px 0; }
        .pg-marks > button { margin: -6px; }
        .pg-marks > button:last-child { margin-left: calc(4 * 24px - 6px); }
        @media (min-width: 1024px) {
          .pg-stage { width: ${u(753)}; }
          .pg-marks { flex-direction: column; gap: ${u(13)}; padding: 0; margin: ${u(192)} 0 0 ${u(97)}; position: sticky; top: ${u(192)}; }
          .pg-marks > button:last-child { margin: calc(4 * (${u(13)} + 8px) - 6px) -6px -6px; }
        }
      `}</style>
    </div>
  )
}

/**
 * One mark: a small ring, filled when what it stands for is shown. The gold one
 * is always filled, as the design draws it, and is marked when shown by the grey
 * ones all standing empty. The button is larger than the ring, so a finger can
 * find it.
 */
function Mark({ label, on, gold = false, onClick }: { label: string; on: boolean; gold?: boolean; onClick: () => void }) {
  const color = gold ? MARK_GOLD : MARK
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className="flex items-center justify-center"
      style={{ width: 20, height: 20, padding: 0, background: "none", border: 0, cursor: "pointer" }}
    >
      <span
        style={{
          display: "block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          backgroundColor: on || gold ? color : "transparent",
          transition: "background-color 300ms ease",
        }}
      />
    </button>
  )
}
