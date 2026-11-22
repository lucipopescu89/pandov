"use client"

import { useState } from "react"

/*
 * The scan on the still Making page (2026-11-22, `making-still.tsx`): the
 * photograph of the log's end and its 3D scan, one over the other, the scan
 * shown up to a line the visitor moves with a slider under the picture.
 *
 * The slider is under the picture, not on it, so a finger scrolling the page
 * over the picture only scrolls the page. (The moving page's version,
 * `making-scan.tsx`, put the line on the picture and held the picture while
 * the page went on; a drag that started at the screen's edge was taken by the
 * phone as "back".)
 */
export function MakingCompare({ original, scan, alt }: { original: string; scan: string; alt: string }) {
  const [at, setAt] = useState(50)
  return (
    <div className="mc">
      <div className="mc-pic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={original} alt={alt} loading="lazy" decoding="async" width={1600} height={1905} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scan}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          width={1600}
          height={1905}
          style={{ clipPath: `inset(0 0 0 ${at}%)` }}
        />
        <span aria-hidden="true" className="mc-line" style={{ left: `${at}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={at}
        onChange={(e) => setAt(+e.target.value)}
        aria-label="Move between the photograph and its 3D scan"
        className="mc-range"
      />
      <style>{`
        .mc { width: 100%; }
        .mc-pic { position: relative; width: 100%; aspect-ratio: 1600 / 1905; overflow: hidden; background: #202020; }
        .mc-pic img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .mc-line { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(233, 228, 220, 0.55); pointer-events: none; }
        .mc-range { display: block; width: 100%; margin: 18px 0 0; accent-color: #a7a29b; height: 28px; cursor: ew-resize; }
      `}</style>
    </div>
  )
}
