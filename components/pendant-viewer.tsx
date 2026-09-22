"use client"

import { useEffect, useRef, useState } from "react"
import type { DataTexture, Material, Mesh, MeshStandardMaterial, Object3D, Texture, WebGLRenderer } from "three"

/* --------------------------------------------------------------------------
   A pendant in three dimensions, in gold, turning slowly on the page's own
   ground until it is taken in hand.

   The model is the collection's 3ds Max export, converted to a compressed GLB
   (positions and the exported normals only, in metres, centred on the origin;
   the recipe is in CLAUDE.md). Its material is not the export's: gold is set
   here, because gold in real time is almost entirely what it reflects, and the
   reflections are made here too.

   What it reflects is a dark studio: a room close to black, lit by a few long
   softboxes. That is how metal is photographed on a dark ground, and it is
   what the pendants' own photographs look like — gold against near-black, the
   form drawn by bright streaks running along it. A light room, which is what
   three.js supplies ready-made, turns gold pale and flat on a dark page.

   three.js is loaded only once the page is up (a dynamic import inside the
   effect), so it is not in the way of the page's first paint or its
   hydration, and it is only ever fetched on a page that shows a model.
   -------------------------------------------------------------------------- */

/*
 * The four constants below and `darkStudio` are the pendants' gold, and the
 * author has made it a brand rule (CLAUDE.md, "Brand rules"): one material for
 * every pendant, changed only for all of them and only by the author.
 */

/**
 * Yellow gold as metal reflects it: its reflectance at normal incidence, in
 * linear RGB. It began as the measured value for pure gold (1.00, 0.77, 0.34)
 * taken a shade deeper, (1.00, 0.76, 0.33), after a lighter one went cream on
 * the flat of the stem. Taken a fifth of the way toward grey, and made more
 * matte with it, it went pale, and the author asked for the first one back —
 * only a tenth of the way toward a grey of its own brightness, and 15%
 * darker.
 */
const GOLD: [number, number, number] = [0.83, 0.65, 0.32]

/**
 * How rough the surface is, 0 a mirror. The pendants are finished satin, not
 * polished — in the photographs the light lies along them as soft bands with
 * a grain in it, not as sharp reflections — so the softboxes are blurred into
 * bands rather than mirrored. Tried at 0.37, more matte, together with a
 * paler gold, and taken back to this with the gold.
 */
const ROUGHNESS = 0.3

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
 * How far the grain tips the surface, as a factor on the tilt baked into it.
 * It is what breaks the softboxes' long highlights into the fine, broken
 * light the photographs show, instead of the smooth bands of a polished
 * surface.
 *
 * The first grain was a 12mm tile at full strength, with a coarser relief
 * under the fine one and the roughness swinging by 30% across it. Up close it
 * was hammered metal, or crumpled foil, not satin, and the roughness showed as
 * clouds on the flat of the stem. What made it foil was the strength of the
 * relief, not its size: the coarse relief is now a third of what it was, the
 * tilt a third and the swing 7%, and at those the same 12mm tile is satin.
 */
const GRAIN_STRENGTH = 0.35

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
  className?: string
  style?: React.CSSProperties
}

export function PendantViewer({ src, label, className, style }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

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
      // Khronos PBR Neutral: keeps the gold's own colour through to the screen.
      // ACES, the usual choice, pushes yellow toward orange as it brightens.
      renderer.toneMapping = THREE.NeutralToneMapping
      renderer.toneMappingExposure = 1
      const canvas = renderer.domElement
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      host.appendChild(canvas)

      const scene = new THREE.Scene()
      const environment = darkStudio(THREE, renderer)
      scene.environment = environment

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

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(...GOLD),
        metalness: 1,
        roughness: ROUGHNESS,
      })
      const grain = satinGrain(THREE)
      grain.anisotropy = renderer.capabilities.getMaxAnisotropy()
      withSatin(material, grain)

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
        const distance = Math.max(halfHeight / vHalf, reach / hHalf) * MARGIN + reach
        camera.position.setLength(distance)
        camera.near = distance / 100
        camera.far = distance * 10
        camera.updateProjectionMatrix()
      }

      let model: Object3D | null = null
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      loader.load(src, (gltf) => {
        if (disposed) return
        model = gltf.scene
        model.traverse((o) => {
          const mesh = o as Mesh
          if (!mesh.isMesh) return
          ;(mesh.material as Material).dispose()
          mesh.material = material
        })
        const box = new THREE.Box3().setFromObject(model)
        model.position.sub(box.getCenter(new THREE.Vector3()))
        const size = box.getSize(new THREE.Vector3())
        halfHeight = size.y / 2
        reach = Math.hypot(size.x, size.z) / 2
        scene.add(model)
        fit()
        start()
        setShown(true)
      })

      let frame = 0
      let last = 0
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick)
        const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
        last = now
        controls.update(dt)
        // The studio turns with the camera, so the pendant turns under lights
        // that stay where the viewer is — as it would in the hand, or on a
        // turntable in front of a photographer — instead of the viewer walking
        // round it into the dark side of the room.
        scene.environmentRotation.y = Math.atan2(camera.position.x, camera.position.z)
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
        environment.dispose()
        renderer.dispose()
        canvas.remove()
      }
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
 * The room the gold reflects, rendered once into an environment map and laid
 * out as seen from the camera, which looks in from +z: walls close to black; a
 * broad softbox front left for the key and a narrower one front right; a large
 * dim diffuser behind the camera, which is what the faces turned toward the
 * viewer reflect; a bank overhead; two thin strips behind for the edges; a
 * faint floor. The values above 1 are light, not colour; the map is kept in
 * half floats, so they survive as brightness.
 *
 * The first room had only the strips, on walls at 1% grey. Every face turned
 * to the viewer then mirrored the black behind the camera, and the gold read
 * as dark olive on the page, not as gold.
 */
function darkStudio(THREE: typeof import("three"), renderer: WebGLRenderer): Texture {
  const room = new THREE.Scene()
  const geometries: { dispose(): void }[] = []
  const materials: { dispose(): void }[] = []

  const wallGeometry = new THREE.SphereGeometry(10, 32, 16)
  const wallMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(0.035), side: THREE.BackSide })
  room.add(new THREE.Mesh(wallGeometry, wallMaterial))
  geometries.push(wallGeometry)
  materials.push(wallMaterial)

  const softbox = (w: number, h: number, light: number, at: [number, number, number]) => {
    const geometry = new THREE.PlaneGeometry(w, h)
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(light), side: THREE.DoubleSide })
    const panel = new THREE.Mesh(geometry, material)
    panel.position.set(...at)
    panel.lookAt(0, 0, 0)
    room.add(panel)
    geometries.push(geometry)
    materials.push(material)
  }
  softbox(2.2, 8, 9, [-4, 1, 3.5]) // key
  softbox(1.6, 8, 4.5, [4.2, 0, 3]) // fill
  softbox(6, 6, 1, [0, 0.5, 6]) // diffuser behind the camera
  softbox(8, 3, 5, [0, 6, 0.5]) // overhead
  softbox(0.8, 7, 5, [-2.5, 0, -5]) // edge strips, behind
  softbox(0.8, 7, 5, [2.5, 0, -5])
  softbox(10, 10, 0.35, [0, -6, 0]) // floor

  const pmrem = new THREE.PMREMGenerator(renderer)
  const map = pmrem.fromScene(room, 0.03).texture
  pmrem.dispose()
  for (const g of geometries) g.dispose()
  for (const m of materials) m.dispose()
  return map
}

/**
 * The satin finish, made here rather than photographed: a tileable relief of
 * fine grain, a faint mottling and a few hundred hairline scratches running
 * every way, read out as a normal map (red, green, blue) with a roughness
 * factor beside it (alpha, 0–2 as 0–255). Made from a fixed seed, so every
 * visit sees the same metal. Nothing is downloaded for it.
 */
function satinGrain(THREE: typeof import("three")): DataTexture {
  const N = 512
  let seed = 0x1ca7a5
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const wrap = (i: number) => ((i % N) + N) % N

  // Value noise that tiles: a lattice of `cells` × `cells` random heights,
  // smoothly interpolated, with the lattice wrapping at the edges.
  const noise = (cells: number) => {
    const lattice = Float32Array.from({ length: cells * cells }, () => rand() * 2 - 1)
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
        const at = (i: number, j: number) => lattice[(j % cells) * cells + (i % cells)]
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
        out[y * N + x] = top + (bottom - top) * sy
      }
    }
    return out
  }

  const fine = noise(128)
  const mid = noise(48)
  const mottle = noise(12)
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

  const data = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      const gx = height[y * N + wrap(x + 1)] - height[y * N + wrap(x - 1)]
      const gy = height[wrap(y + 1) * N + x] - height[wrap(y - 1) * N + x]
      const len = Math.hypot(gx, gy, 2)
      data[i * 4] = Math.round((-gx / len) * 127.5 + 127.5)
      data[i * 4 + 1] = Math.round((-gy / len) * 127.5 + 127.5)
      data[i * 4 + 2] = Math.round((2 / len) * 127.5 + 127.5)
      // A little rougher in the scratches and across the mottling's peaks.
      const rough = Math.min(1.9, Math.max(0.5, 1 + 0.07 * mottle[i] + 0.3 * scratched[i]))
      data[i * 4 + 3] = Math.round((rough / 2) * 255)
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
 * Lays the grain on the gold by projecting it from the three axes and blending
 * by which way the surface faces. The model carries no texture coordinates —
 * the export's own were dropped, since an unwrap made for 3ds Max would seam
 * and stretch a grain this fine — and a projection needs none. It is done in
 * world space, where the pendant stands still while the camera goes round, so
 * the grain stays on the metal.
 */
function withSatin(material: MeshStandardMaterial, grain: DataTexture) {
  material.customProgramCacheKey = () => "pandov-satin"
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrain = { value: grain }
    shader.uniforms.uGrainScale = { value: 1 / GRAIN_TILE }
    shader.uniforms.uGrainStrength = { value: GRAIN_STRENGTH }
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
        roughnessFactor *= 2.0 * (grainX.a * grainW.x + grainY.a * grainW.y + grainZ.a * grainW.z);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 tiltX = (grainX.xy * 2.0 - 1.0) * uGrainStrength;
        vec2 tiltY = (grainY.xy * 2.0 - 1.0) * uGrainStrength;
        vec2 tiltZ = (grainZ.xy * 2.0 - 1.0) * uGrainStrength;
        vec3 grained = normalize(grainN
          + vec3(0.0, tiltX.y, tiltX.x) * grainW.x
          + vec3(tiltY.x, 0.0, tiltY.y) * grainW.y
          + vec3(tiltZ.x, tiltZ.y, 0.0) * grainW.z);
        normal = normalize((viewMatrix * vec4(grained, 0.0)).xyz);`,
      )
  }
}
