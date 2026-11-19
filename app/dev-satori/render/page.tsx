"use client"

// TEMPORARY, development only — not part of the site. Draws each Satori model
// through the site's own PendantViewer (the same studio, metal and tone
// mapping as the pendant pages) on a large stage and saves a run of frames as
// it turns, so the renders match the 3D view exactly. Delete the whole
// app/dev-satori folder once the renders are made.
import { useEffect, useState } from "react"
import { PendantViewer, lookOf } from "@/components/pendant-viewer"

// Keep what WebGL drew, so the canvas can be read back after the frame.
if (typeof window !== "undefined" && !(window as unknown as { __keepGl?: boolean }).__keepGl) {
  ;(window as unknown as { __keepGl?: boolean }).__keepGl = true
  const get = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, attrs?: object) {
    if (type === "webgl2" || type === "webgl") attrs = { ...(attrs || {}), preserveDrawingBuffer: true }
    return (get as (t: string, a?: object) => RenderingContext | null).call(this, type, attrs)
  } as typeof HTMLCanvasElement.prototype.getContext
}

const W = 1440
const H = Math.round((W * 41) / 30)
const FRAMES = 24
const EVERY_MS = 250

export default function DevSatoriRender() {
  const [n, setN] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const only = params?.get("n")
  const list = only ? [Number(only)] : [1, 2, 3, 4]

  useEffect(() => {
    if (!list[n]) return
    let stop = false
    ;(async () => {
      // Wait for the model to appear.
      let canvas: HTMLCanvasElement | null = null
      for (let t = 0; t < 200 && !stop; t++) {
        await new Promise((r) => setTimeout(r, 100))
        canvas = document.querySelector("#stage canvas")
        const host = canvas?.parentElement
        if (canvas && host && getComputedStyle(host).opacity !== "0") break
      }
      await new Promise((r) => setTimeout(r, 600))
      for (let k = 0; k < FRAMES && !stop && canvas; k++) {
        const out = document.createElement("canvas")
        out.width = canvas.width
        out.height = canvas.height
        const ctx = out.getContext("2d")!
        ctx.fillStyle = "#202020"
        ctx.fillRect(0, 0, out.width, out.height)
        ctx.drawImage(canvas, 0, 0)
        const name = `satori-${list[n]}-${String(k).padStart(2, "0")}`
        await fetch("/dev-satori/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, png: out.toDataURL("image/png") }),
        })
        setLog((l) => [...l, `${name} ${out.width}x${out.height}`])
        await new Promise((r) => setTimeout(r, EVERY_MS))
      }
      if (!stop) setN((i) => i + 1)
    })()
    return () => {
      stop = true
    }
  }, [n])

  if (process.env.NODE_ENV !== "development") return null
  const current = list[n]
  return (
    <div style={{ background: "#202020", minHeight: "100vh", color: "#888", font: "12px monospace" }}>
      <div id="log" style={{ position: "fixed", top: 0, right: 0, zIndex: 9, padding: 8 }}>
        {current ? `rendering satori-${current}` : "done"} · {log.length} saved
      </div>
      {current ? (
        <div id="stage" style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
          <PendantViewer
            key={current}
            src={`/models/satori-${current}.glb`}
            label={`Satori ${current}`}
            look={lookOf("Gold-plated brass", null)}
            style={{ width: "100%", height: "100%" }}
            size={0.92}
          />
        </div>
      ) : null}
    </div>
  )
}
