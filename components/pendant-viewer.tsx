"use client"

import { useEffect, useRef, useState } from "react"
import type { DataTexture, Material, Mesh, MeshStandardMaterial, Object3D, Texture, WebGLRenderer } from "three"

/* --------------------------------------------------------------------------
   A pendant in three dimensions, in the metal chosen beside it, turning slowly
   on the page's own ground until it is taken in hand.

   The model is the collection's 3ds Max export, converted to a compressed GLB
   (positions and the exported normals only, in metres, centred on the origin;
   the recipe is in CLAUDE.md). Its material is not the export's: the metal is
   set here, because metal in real time is almost entirely what it reflects,
   and what it reflects is chosen here too.

   What it reflects is the author's own studio, a 360° photograph of softboxes
   over a floor, given on 2026-09-25 so that the metals would read as they do
   in Sculpteo's previews. It is used for reflections only; it is never drawn
   behind the pendant, which stands on the page's ground. It replaced a studio
   built here out of seven softbox panels on near-black walls, which suited a
   single satin gold but left polished silver dull.

   three.js is loaded only once the page is up (a dynamic import inside the
   effect), so it is not in the way of the page's first paint or its
   hydration, and it is only ever fetched on a page that shows a model.
   -------------------------------------------------------------------------- */

/*
 * The looks below are the pendants' metals, one for each metal and finish or
 * karat the order panel offers, and the author has made them a brand rule
 * (CLAUDE.md, "Brand rules"): every pendant wears the same ones, and they are
 * changed only for all of them and only by the author. Colours are the
 * metal's reflectance at normal incidence, in linear RGB — what a metal
 * multiplies the room by — so a lighter colour is a more reflective metal,
 * not a paler paint.
 */

export type Look = {
  /** Reflectance at normal incidence, linear RGB. */
  color: [number, number, number]
  /** How rough the surface is, 0 a mirror. */
  roughness: number
  /** How much of the satin grain is on it: 1 all of it, 0 none, as polished. */
  grain: number
  /** How much of the printed surface is on it: 1 as it leaves the printer; none if left out. */
  printed?: number
}

/**
 * Each metal, by its name in `lib/second-wind.ts` and then by its finish or
 * karat ("" for a metal that comes one way only). The references were the
 * author's screenshots of Sculpteo's previews, and the author's word where
 * there was none:
 *
 * - Brass, Natural is Sculpteo's Raw: satin, olive, a good deal deeper than
 *   gold. Taken first from brass's measured reflectance, it came out a pale
 *   clean yellow beside their dull olive, and was darkened and greened.
 *   Polished is their Mirror Polished, which reads almost as gold.
 * - Silver's two finishes carry Sculpteo's names. Their Polished looked flat
 *   and grey to the author, who asked to have it nearer their Mirror Polished;
 *   it keeps a little grain and a little blur, so that the two still differ.
 *   Mirror Polished is the room seen in it, sharp.
 * - Gold-plated brass is their Gold Plated (3µm) over mirror-polished brass:
 *   the measured reflectance of pure gold.
 * - The two golds follow it, on the author's asking, as there is no preview of
 *   them. 18 karat is the author's own gold of 2026-09-22, (0.83, 0.65, 0.32),
 *   without the 15% it was darkened by then: that darkening was for a satin
 *   gold in a near-black room, and beside the plated gold in this brighter one
 *   it read as tarnished. Its hue, a tenth of the way from pure gold toward
 *   grey, is the author's and is kept. 14 karat is 18 a quarter of the way
 *   further toward grey, as the lower karat is paler.
 * - Black rhodium-plated brass is Sculpteo's Black Rhodium: dark, and still
 *   mirror-bright at the edges of its reflections.
 * - Platinum had no reference and was left to judgement: its measured
 *   reflectance, a grey darker and warmer than silver, polished like the golds.
 * - Stainless steel is printed in the metal itself, by selective laser
 *   melting at in3dtec, and left as it comes from the printer. The reference
 *   was the author's photograph of such parts, on 2026-09-25: a plain grey,
 *   matt, sandy with the powder fused into it and finely lined by the
 *   laser's passes. The sand, its hollows and the lines are the printed
 *   surface, `printedSurface`, not the satin grain. The grey is darker than
 *   steel's measured reflectance (0.56), since at that the metal read as
 *   silver gone matt. It keeps the photograph's faint warmth, which the
 *   author noticed on 2026-09-25 after a cooler, neutral grey: measured against
 *   the photograph's white ground, which is neutral, the metal's blue is 7%
 *   under its red and green. That warmth is real in the metal: steel's nickel
 *   and iron reflect a little less blue than red, and a printed part can
 *   carry a faint straw tint from the laser. Matched to it first, the
 *   pendant rendered with red = green and blue at 0.927 of them, as the
 *   photograph has it; the author then asked for it a little warmer, and
 *   the blue is at 0.89, half as warm again as the photograph.
 */
const LOOKS: Record<string, Record<string, Look>> = {
  Brass: {
    Natural: { color: [0.66, 0.57, 0.26], roughness: 0.42, grain: 1 },
    Polished: { color: [0.9, 0.78, 0.38], roughness: 0.07, grain: 0 },
  },
  Silver: {
    Polished: { color: [0.95, 0.94, 0.91], roughness: 0.1, grain: 0.2 },
    "Mirror Polished": { color: [0.97, 0.96, 0.92], roughness: 0.05, grain: 0 },
  },
  "Gold-plated brass": { "": { color: [1, 0.77, 0.34], roughness: 0.07, grain: 0 } },
  "Black rhodium-plated brass": { "": { color: [0.3, 0.3, 0.31], roughness: 0.07, grain: 0 } },
  Gold: {
    "14K": { color: [0.93, 0.77, 0.48], roughness: 0.07, grain: 0 },
    "18K": { color: [0.98, 0.76, 0.38], roughness: 0.07, grain: 0 },
  },
  Platinum: { "": { color: [0.67, 0.64, 0.59], roughness: 0.08, grain: 0 } },
  "Stainless steel": { "": { color: [0.5, 0.5, 0.46], roughness: 0.55, grain: 0, printed: 1 } },
}

/** The look of a metal and its finish or karat; 18 karat gold for anything unknown. */
export function lookOf(metal: string, option: string | null): Look {
  const looks = LOOKS[metal]
  if (!looks) return LOOKS.Gold["18K"]
  return looks[option ?? ""] ?? Object.values(looks)[0]
}

/** Seconds for a change of metal to settle: it eases over about three times this. */
const CHANGE = 0.14

/**
 * The satin grain, in the metal's own scale: one tile of it spans this much of
 * the pendant, in metres. The grain inside it is a few hundredths of a
 * millimetre to a few tenths — a pixel or two on screen with the pendant
 * filling the stage — and the scratches are hairlines a few millimetres long.
 * It was 8mm while the grain was being calmed down (see GRAIN_STRENGTH); the
 * author then asked for the grain a little larger, and it is half as big
 * again.
 */
const GRAIN_TILE = 0.012

/**
 * How far the grain tips the surface, as a factor on the tilt baked into it,
 * at a look's full grain. It is what breaks the softboxes' long highlights
 * into the fine, broken light of a satin finish, instead of the smooth bands
 * of a polished one.
 *
 * The first grain was a 12mm tile at full strength, with a coarser relief
 * under the fine one and the roughness swinging by 30% across it. Up close it
 * was hammered metal, or crumpled foil, not satin, and the roughness showed as
 * clouds on the flat of the stem. What made it foil was the strength of the
 * relief, not its size: the coarse relief is now a third of what it was, the
 * tilt a third and the swing 7%, and at those the same 12mm tile is satin.
 */
const GRAIN_STRENGTH = 0.35

/**
 * The printed surface, as the satin grain is measured: one tile of it spans
 * this much of the pendant, in metres. In it the fused powder is a few
 * hundredths of a millimetre to a tenth, and the laser's lines are a third of
 * a millimetre apart, as they are in the author's photograph of printed steel.
 */
const PRINTED_TILE = 0.014

/** How far the printed surface tips the metal, as GRAIN_STRENGTH does the grain. */
const PRINTED_STRENGTH = 1.2

/** The author's studio, prepared by `scripts/env-360.mjs`, which records how it is stored. */
const STUDIO = "/models/studio.webp"

/**
 * Which way the studio faces the pendant, in radians round the vertical, on
 * top of following the camera. Left as the photograph was taken, the camera
 * stood in front of the one stretch of bare black wall, and every face turned
 * toward the viewer mirrored it: silver read as dark steel. Tried every eighth
 * of a turn, and between 1.4 and 2.4 rad the softboxes and the floor fall on
 * the front of the pendant; this is the middle of that.
 */
const STUDIO_TURN = 1.9

/**
 * How bright the studio is in the metal. At 1 the metals were a stop darker
 * than Sculpteo's; lifting the darkest parts of the room instead, to brighten
 * it, turned gold to yellow plastic, because it was the dark in the reflections
 * that made it read as metal. Brighter all through keeps that.
 */
const STUDIO_INTENSITY = 2.2

/** Vertical field of view: long, like a product lens, so the form is not bent. */
const FOV = 26

/** Room around the pendant when it is fitted to the stage, as a factor. */
const MARGIN = 1.2

/** Seconds of stillness in the hand before the pendant turns again by itself. */
const RESUME_AFTER = 2.5

/** OrbitControls' own unit: 2 is a turn every 30 seconds; this is one every 45. */
const TURN_SPEED = 1.33

type Props = {
  src: string
  label: string
  /** The metal it is shown in; a change eases from one to the other. */
  look: Look
  className?: string
  style?: React.CSSProperties
  /**
   * How large the pendant is drawn, as a share of the size that fits it to
   * the stage. 1 fills the stage but for MARGIN; a page that frames the model
   * among photographs may want it smaller, standing in room of its own.
   */
  size?: number
  /**
   * How far above the stage's middle the pendant is drawn, as a share of the
   * stage's height. It moves the picture, not the pendant, so the pendant
   * still turns about its own axis.
   */
  lift?: number
}

export function PendantViewer({ src, label, look, className, style, size = 1, lift = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef(look)
  const [shown, setShown] = useState(false)

  // Read every frame by the loop below, which is set up once per model.
  useEffect(() => {
    lookRef.current = look
  }, [look])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }, { MeshoptDecoder }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/controls/OrbitControls.js"),
        import("three/addons/libs/meshopt_decoder.module.js"),
      ])
      if (disposed) return

      let renderer: WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
      } catch {
        return // no WebGL: the stage stays empty ground
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      // Khronos PBR Neutral: keeps each metal's own colour through to the
      // screen. ACES, the usual choice, pushes yellow toward orange as it
      // brightens.
      renderer.toneMapping = THREE.NeutralToneMapping
      renderer.toneMappingExposure = 1
      const canvas = renderer.domElement
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      host.appendChild(canvas)

      const scene = new THREE.Scene()
      scene.environmentIntensity = STUDIO_INTENSITY

      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.001, 10)
      // A three-quarter view to begin with, a little from above, the way the
      // pendant is seen worn. Only the direction counts; `fit` sets the distance.
      camera.position.set(0.55, 0.18, 1)
      const controls = new OrbitControls(camera, canvas)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.rotateSpeed = 0.7
      // No zoom and no pan: the wheel and two fingers stay with the page.
      controls.enableZoom = false
      controls.enablePan = false
      controls.minPolarAngle = Math.PI * 0.18
      controls.maxPolarAngle = Math.PI * 0.82
      controls.autoRotate = true
      controls.autoRotateSpeed = TURN_SPEED
      // OrbitControls claims every touch on the canvas. Vertical ones are given
      // back to the page, so a phone can still scroll past the pendant; it is
      // turned with a sideways drag.
      canvas.style.touchAction = "pan-y"

      let resume = 0
      controls.addEventListener("start", () => {
        window.clearTimeout(resume)
        controls.autoRotate = false
      })
      controls.addEventListener("end", () => {
        resume = window.setTimeout(() => (controls.autoRotate = true), RESUME_AFTER * 1000)
      })

      const material = new THREE.MeshStandardMaterial({ metalness: 1 })
      const grain = satinGrain(THREE)
      const printed = printedSurface(THREE)
      grain.anisotropy = printed.anisotropy = renderer.capabilities.getMaxAnisotropy()
      const grainAmount = { value: 0 }
      const printedAmount = { value: 0 }
      withFinish(material, grain, grainAmount, printed, printedAmount)

      // The look the metal is easing toward, and a way to jump straight to it.
      const target = new THREE.Color()
      const wear = (look: Look, ease: number) => {
        target.setRGB(...look.color)
        material.color.lerp(target, ease)
        material.roughness += (look.roughness - material.roughness) * ease
        grainAmount.value += (look.grain - grainAmount.value) * ease
        printedAmount.value += ((look.printed ?? 0) - printedAmount.value) * ease
      }

      // Half the pendant's height, and the farthest it reaches from its axis as
      // it turns, so it can be fitted to the stage one way and the other.
      let halfHeight = 0.02
      let reach = 0.005
      const fit = () => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        // Its height fitted to the stage's height and its reach to the stage's
        // width, whichever needs the camera farther off, plus the reach again
        // for the parts that come round toward the lens. Fitted instead to the
        // sphere it turns in, as at first, a pendant this tall and thin came
        // out small on a phone: the sphere is as wide as the pendant is high,
        // and a portrait stage has little width to fit it in.
        const vHalf = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
        const hHalf = vHalf * camera.aspect
        const distance = (Math.max(halfHeight / vHalf, reach / hHalf) * MARGIN) / size + reach
        camera.position.setLength(distance)
        camera.near = distance / 100
        camera.far = distance * 10
        // The lift: the frame taken from lower down on the same picture, so
        // the pendant sits higher in it. setViewOffset updates the projection.
        if (lift) camera.setViewOffset(w, h, 0, lift * h, w, h)
        else camera.updateProjectionMatrix()
      }

      let model: Object3D | null = null
      let environment: Texture | null = null
      let frame = 0
      let last = 0
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick)
        const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
        last = now
        controls.update(dt)
        wear(lookRef.current, 1 - Math.exp(-dt / CHANGE))
        // The studio turns with the camera, so the pendant turns under lights
        // that stay where the viewer is — as it would in the hand, or on a
        // turntable in front of a photographer — instead of the viewer walking
        // round it into the dark side of the room.
        scene.environmentRotation.y = Math.atan2(camera.position.x, camera.position.z) + STUDIO_TURN
        renderer.render(scene, camera)
      }
      const start = () => {
        if (!frame && model && visible) frame = requestAnimationFrame(tick)
      }
      const stop = () => {
        cancelAnimationFrame(frame)
        frame = 0
        last = 0
      }

      // Drawn only while it is on screen.
      let visible = true
      const io = new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting
        if (visible) start()
        else stop()
      })
      io.observe(host)
      const ro = new ResizeObserver(fit)
      ro.observe(host)

      cleanup = () => {
        stop()
        io.disconnect()
        ro.disconnect()
        window.clearTimeout(resume)
        controls.dispose()
        model?.traverse((o) => (o as Mesh).isMesh && (o as Mesh).geometry.dispose())
        material.dispose()
        grain.dispose()
        printed.dispose()
        environment?.dispose()
        renderer.dispose()
        canvas.remove()
      }

      // The studio and the model come down together, and the pendant appears
      // only once it has both: gold with nothing to reflect is black.
      let studioMap: DataTexture
      let loaded: Object3D
      try {
        ;[studioMap, { scene: loaded }] = await Promise.all([
          studioTexture(THREE),
          new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(src),
        ])
      } catch {
        return // the stage stays empty ground
      }
      if (disposed) {
        loaded.traverse((o) => (o as Mesh).isMesh && (o as Mesh).geometry.dispose())
        return
      }
      const pmrem = new THREE.PMREMGenerator(renderer)
      environment = pmrem.fromEquirectangular(studioMap).texture
      pmrem.dispose()
      studioMap.dispose()
      scene.environment = environment

      model = loaded
      model.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        ;(mesh.material as Material).dispose()
        mesh.material = material
      })
      const box = new THREE.Box3().setFromObject(model)
      model.position.sub(box.getCenter(new THREE.Vector3()))
      const extent = box.getSize(new THREE.Vector3())
      halfHeight = extent.y / 2
      reach = Math.hypot(extent.x, extent.z) / 2
      scene.add(model)
      wear(lookRef.current, 1)
      fit()
      start()
      setShown(true)
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [src])

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      className={className}
      style={{ ...style, opacity: shown ? 1 : 0, transition: "opacity 1.2s ease-out" }}
    />
  )
}

/**
 * The studio, read back into its true brightness: the stored eight bits are
 * unfolded by the curve `scripts/env-360.mjs` folded them with, into half
 * floats, which keep a softbox eight times brighter than white as eight times
 * brighter. The rows are turned bottom first, as WebGL reads a data texture.
 */
async function studioTexture(THREE: typeof import("three")): Promise<DataTexture> {
  const blob = await (await fetch(STUDIO)).blob()
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" })
  const { width: w, height: h } = bitmap
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext("2d", { willReadFrequently: true })!
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const pixels = context.getImageData(0, 0, w, h).data

  const unfold = new Uint16Array(256)
  for (let i = 0; i < 256; i++) {
    const s = Math.min(Math.pow(i / 255, 2.2), 0.999)
    unfold[i] = THREE.DataUtils.toHalfFloat(s / (1 - s))
  }
  const one = THREE.DataUtils.toHalfFloat(1)
  const data = new Uint16Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const from = (h - 1 - y) * w * 4
    const to = y * w * 4
    for (let x = 0; x < w * 4; x += 4) {
      data[to + x] = unfold[pixels[from + x]]
      data[to + x + 1] = unfold[pixels[from + x + 1]]
      data[to + x + 2] = unfold[pixels[from + x + 2]]
      data[to + x + 3] = one
    }
  }

  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

/** The side of a generated surface's tile, in texels. */
const TEXELS = 512

/** A texel's row or column, wrapped round the tile's edges. */
const wrap = (i: number) => ((i % TEXELS) + TEXELS) % TEXELS

/** Random numbers from a fixed seed (mulberry32), so every visit sees the same metal. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Value noise that tiles: a lattice of `cells` × `cells` random heights,
 * smoothly interpolated, with the lattice wrapping at the edges.
 */
function tileNoise(rand: () => number, cells: number) {
  const N = TEXELS
  const lattice = Float32Array.from({ length: cells * cells }, () => rand() * 2 - 1)
  const at = (i: number, j: number) => lattice[(j % cells) * cells + (i % cells)]
  const out = new Float32Array(N * N)
  for (let y = 0; y < N; y++) {
    const fy = (y / N) * cells
    const y0 = Math.floor(fy)
    const ty = fy - y0
    const sy = ty * ty * (3 - 2 * ty)
    for (let x = 0; x < N; x++) {
      const fx = (x / N) * cells
      const x0 = Math.floor(fx)
      const tx = fx - x0
      const sx = tx * tx * (3 - 2 * tx)
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
      const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
      out[y * N + x] = top + (bottom - top) * sy
    }
  }
  return out
}

/**
 * A relief read out as the texture the shader lays on the metal: the tilt of
 * its surface (red, green), how much light it keeps in its hollows (blue, 1 in
 * the open, less down among the grains) and a roughness factor (alpha, 0–2 as
 * 0–255, held between 0.5 and 1.9). Nothing is downloaded for it.
 */
function surfaceTexture(
  THREE: typeof import("three"),
  height: Float32Array,
  rough: (i: number) => number,
  kept: (i: number) => number = () => 1,
): DataTexture {
  const N = TEXELS
  const data = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      const gx = height[y * N + wrap(x + 1)] - height[y * N + wrap(x - 1)]
      const gy = height[wrap(y + 1) * N + x] - height[wrap(y - 1) * N + x]
      const len = Math.hypot(gx, gy, 2)
      data[i * 4] = Math.round((-gx / len) * 127.5 + 127.5)
      data[i * 4 + 1] = Math.round((-gy / len) * 127.5 + 127.5)
      data[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, kept(i))) * 255)
      data[i * 4 + 3] = Math.round((Math.min(1.9, Math.max(0.5, rough(i))) / 2) * 255)
    }
  }
  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/**
 * The satin finish, made here rather than photographed: a tileable relief of
 * fine grain, a faint mottling and a few hundred hairline scratches running
 * every way. Made from a fixed seed, so every visit sees the same metal.
 */
function satinGrain(THREE: typeof import("three")): DataTexture {
  const N = TEXELS
  const rand = seeded(0x1ca7a5)
  const fine = tileNoise(rand, 128)
  const mid = tileNoise(rand, 48)
  const mottle = tileNoise(rand, 12)
  const height = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) height[i] = 0.5 * fine[i] + 0.1 * mid[i]

  // Hairlines: shallow grooves a texel wide, in every direction.
  const scratched = new Float32Array(N * N)
  for (let s = 0; s < 700; s++) {
    const x0 = rand() * N
    const y0 = rand() * N
    const angle = rand() * Math.PI
    const length = 12 + rand() * 110
    const depth = 0.15 + rand() * 0.35
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    for (let t = 0; t < length; t += 0.5) {
      const i = wrap(Math.round(y0 + dy * t)) * N + wrap(Math.round(x0 + dx * t))
      if (scratched[i] < depth) {
        height[i] -= depth - scratched[i]
        scratched[i] = depth
      }
    }
  }

  // A little rougher in the scratches and across the mottling's peaks.
  return surfaceTexture(THREE, height, (i) => 1 + 0.07 * mottle[i] + 0.3 * scratched[i])
}

/**
 * The surface of metal printed by laser and left as it comes out, after the
 * author's photograph of printed steel: sand, which is powder half melted
 * into the surface, over a fine unevenness, and crossed by shallow lines
 * where the laser passed, a third of a millimetre apart. In a tile of
 * PRINTED_TILE, 8mm: the powder is grains 50 to 125 microns across; the
 * unevenness is 80 microns to half a millimetre; the lines run on the
 * diagonal, 18 to the tile's side, and wander a little, as the photograph's do.
 */
function printedSurface(THREE: typeof import("three")): DataTexture {
  const N = TEXELS
  const rand = seeded(0x51a7ed)
  const fine = tileNoise(rand, 100)
  const mid = tileNoise(rand, 48)
  const coarse = tileNoise(rand, 16)
  const drift = tileNoise(rand, 6)
  const height = new Float32Array(N * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      const lines = Math.sin(((x + y) / N) * 2 * Math.PI * 18 + 1.5 * drift[i])
      height[i] = 0.4 * fine[i] + 0.3 * mid[i] + 0.1 * coarse[i] + 0.04 * lines
    }
  }

  // The powder: small domes standing out of the surface, where they meet
  // each other the higher one standing.
  const fused = new Float32Array(N * N)
  for (let s = 0; s < 4200; s++) {
    const cx = Math.round(rand() * N)
    const cy = Math.round(rand() * N)
    const r = 1.6 + rand() * 2.4
    const top = 0.35 + rand() * 0.6
    const R = Math.ceil(r)
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const d2 = (dx * dx + dy * dy) / (r * r)
        if (d2 >= 1) continue
        const i = wrap(cy + dy) * N + wrap(cx + dx)
        const dome = top * Math.sqrt(1 - d2)
        if (dome > fused[i]) {
          height[i] += dome - fused[i]
          fused[i] = dome
        }
      }
    }
  }

  // The hollows between the grains hold less of the light: whatever lies
  // below the surface around it, over a few grains, is darkened by how far.
  const around = blurred(blurred(height, 5), 5)
  return surfaceTexture(
    THREE,
    height,
    (i) => 1 + 0.12 * coarse[i] + 0.1 * mid[i],
    (i) => 1 - 1.4 * Math.max(0, around[i] - height[i]),
  )
}

/** A tile's heights averaged over a square `r` texels either side, wrapping at the edges. */
function blurred(src: Float32Array, r: number) {
  const N = TEXELS
  const across = new Float32Array(N * N)
  const out = new Float32Array(N * N)
  const span = 2 * r + 1
  for (let y = 0; y < N; y++) {
    let sum = 0
    for (let x = -r; x <= r; x++) sum += src[y * N + wrap(x)]
    for (let x = 0; x < N; x++) {
      across[y * N + x] = sum / span
      sum += src[y * N + wrap(x + r + 1)] - src[y * N + wrap(x - r)]
    }
  }
  for (let x = 0; x < N; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += across[wrap(y) * N + x]
    for (let y = 0; y < N; y++) {
      out[y * N + x] = sum / span
      sum += across[wrap(y + r + 1) * N + x] - across[wrap(y - r) * N + x]
    }
  }
  return out
}

/**
 * Lays the finishes on the metal by projecting them from the three axes and
 * blending by which way the surface faces. The model carries no texture
 * coordinates — the export's own were dropped, since an unwrap made for 3ds
 * Max would seam and stretch a grain this fine — and a projection needs none.
 * It is done in world space, where the pendant stands still while the camera
 * goes round, so the grain stays on the metal.
 *
 * There are two finishes, the satin grain and the printed surface, each with
 * its own amount: it scales both what the finish tilts and what it roughens,
 * so a polished metal (0 of each) is left smooth, and a change of metal eases
 * from one finish to another.
 */
function withFinish(
  material: MeshStandardMaterial,
  grain: DataTexture,
  grainAmount: { value: number },
  printed: DataTexture,
  printedAmount: { value: number },
) {
  material.customProgramCacheKey = () => "pandov-finish"
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrain = { value: grain }
    shader.uniforms.uGrainScale = { value: 1 / GRAIN_TILE }
    shader.uniforms.uGrainStrength = { value: GRAIN_STRENGTH }
    shader.uniforms.uGrainAmount = grainAmount
    shader.uniforms.uPrinted = { value: printed }
    shader.uniforms.uPrintedScale = { value: 1 / PRINTED_TILE }
    shader.uniforms.uPrintedStrength = { value: PRINTED_STRENGTH }
    shader.uniforms.uPrintedAmount = printedAmount
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGrainPos;\nvarying vec3 vGrainNormal;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vGrainPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vGrainNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uGrain;
        uniform float uGrainScale;
        uniform float uGrainStrength;
        uniform float uGrainAmount;
        uniform sampler2D uPrinted;
        uniform float uPrintedScale;
        uniform float uPrintedStrength;
        uniform float uPrintedAmount;
        varying vec3 vGrainPos;
        varying vec3 vGrainNormal;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        vec3 grainN = normalize(vGrainNormal);
        vec3 grainW = pow(abs(grainN), vec3(4.0));
        grainW /= grainW.x + grainW.y + grainW.z;
        vec4 grainX = texture2D(uGrain, vGrainPos.zy * uGrainScale);
        vec4 grainY = texture2D(uGrain, vGrainPos.xz * uGrainScale);
        vec4 grainZ = texture2D(uGrain, vGrainPos.xy * uGrainScale);
        vec4 printedX = texture2D(uPrinted, vGrainPos.zy * uPrintedScale);
        vec4 printedY = texture2D(uPrinted, vGrainPos.xz * uPrintedScale);
        vec4 printedZ = texture2D(uPrinted, vGrainPos.xy * uPrintedScale);
        roughnessFactor *= mix(1.0, 2.0 * (grainX.a * grainW.x + grainY.a * grainW.y + grainZ.a * grainW.z), uGrainAmount);
        roughnessFactor *= mix(1.0, 2.0 * (printedX.a * grainW.x + printedY.a * grainW.y + printedZ.a * grainW.z), uPrintedAmount);
        diffuseColor.rgb *= mix(1.0, printedX.b * grainW.x + printedY.b * grainW.y + printedZ.b * grainW.z, uPrintedAmount);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float grainTilt = uGrainStrength * uGrainAmount;
        float printedTilt = uPrintedStrength * uPrintedAmount;
        vec2 tiltX = (grainX.xy * 2.0 - 1.0) * grainTilt + (printedX.xy * 2.0 - 1.0) * printedTilt;
        vec2 tiltY = (grainY.xy * 2.0 - 1.0) * grainTilt + (printedY.xy * 2.0 - 1.0) * printedTilt;
        vec2 tiltZ = (grainZ.xy * 2.0 - 1.0) * grainTilt + (printedZ.xy * 2.0 - 1.0) * printedTilt;
        vec3 grained = normalize(grainN
          + vec3(0.0, tiltX.y, tiltX.x) * grainW.x
          + vec3(tiltY.x, 0.0, tiltY.y) * grainW.y
          + vec3(tiltZ.x, tiltZ.y, 0.0) * grainW.z);
        normal = normalize((viewMatrix * vec4(grained, 0.0)).xyz);`,
      )
  }
}
