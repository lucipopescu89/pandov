"use client"

import { useEffect, useRef, useState } from "react"
import type { Mesh, MeshStandardMaterial, Object3D, PointLight, Sprite, Texture, WebGLRenderer } from "three"
import { studioTexture } from "@/components/pendant-viewer"

/* --------------------------------------------------------------------------
   A piece of Space in three dimensions, the pendants' viewer
   (`pendant-viewer.tsx`) made for wood and for a lamp: the same studio in its
   reflections, the same lens, the same slow turn until it is taken in hand,
   the same care to draw only while it is on screen.

   The wood. The export's own texture (a photograph of planks, laid on by 3ds
   Max's unwrap) is not used: the grain is drawn here, in the shader, out of
   the point's place in the piece, as if the piece had been carved out of a
   block of oak, which it was, near enough. The tree's rings are cylinders
   round an axis that runs up beside the piece, leaning a little, and the
   surface cuts through them as a carved surface does, in the arches and
   ovals of the author's renders; their edges wander, and fine fibres run up
   along them. Nothing is downloaded for it. The two finishes are two
   colourings of the one grain, and a change of finish eases from one to the
   other, as a change of metal does on a pendant.

   The light. The bulb is a crowned one: its front half is a gold mirror, so a
   lamp seen from the front shows a gold ball, and when it is on the light
   comes out behind the crown, into the hollow of the wood. On, the glass
   glows, a warm light inside the hollow lights its walls, a weaker one in
   front of it stands for what the hollow throws back out, a halo is laid over
   the bulb when it faces the viewer, and the studio dims, as a room does
   when the lamp is what is left on. All of it eases in and out.
   -------------------------------------------------------------------------- */

/** Linear RGB, as the shader mixes them: [the lighter wood of a ring, the darker]. */
const WOODS = {
  // Oiled white oak: a warm honey, its latewood and pores a deeper brown.
  natural: { light: [0.42, 0.25, 0.115], dark: [0.17, 0.088, 0.036], roughness: 0.58 },
  // Ebonised: near black, the rings a little lighter, as in the author's renders.
  ebonised: { light: [0.058, 0.053, 0.05], dark: [0.02, 0.0185, 0.0175], roughness: 0.5 },
} as const

/** Rings to the metre: about 4mm each. */
const RINGS = 250

/** The gold of the crown: the pendants' gold-plated brass. */
const CROWN = [1, 0.77, 0.34] as const

/** A warm white bulb, about 2700K, in linear RGB: the glass. */
const WARM = [1, 0.5, 0.18] as const
/** Its light on the wood, a little paler: at 2700K itself oak went the orange of a fire. */
const WARM_LIGHT = [1, 0.66, 0.38] as const

/**
 * How bright the studio is, off and on: on, the room is dimmed to let the lamp
 * be the light in it. Not darker: at 0.3 the ebonised lamp went black against
 * the page's ground, and only its hollow could be seen.
 */
const STUDIO = { off: 1.5, on: 0.42 }

/**
 * The scene is drawn ten times the piece's size, in decimetres. three.js stops
 * a light growing brighter closer than a tenth of a unit to it, which in
 * metres is the whole hollow of the wood: lit evenly, it read as paint, not as
 * light. In decimetres it falls off from a centimetre out, as a bulb's does.
 */
const SCALE = 10

/**
 * The light inside the hollow, and the one standing for what it throws back
 * out, just in front of the crown, in candela at SCALE. The second is weak and
 * close, so it warms the wood round the rim of the hollow and is gone a few
 * centimetres out: further and stronger, it lit the whole front and sides of
 * the lamp, as if the wood itself glowed.
 */
const BULB_CD = 0.8
const SPILL_CD = 0.035

/** Seconds for a change of finish or of the light to settle: it eases over about three times this. */
const CHANGE = 0.16
const LIGHT_CHANGE = 0.22

const FOV = 26
const MARGIN = 1.12
const RESUME_AFTER = 2.5
const TURN_SPEED = 1.33
const STUDIO_TURN = 1.9

type Props = {
  src: string
  label: string
  /** The wood's finish; a change eases from one to the other. */
  wood: keyof typeof WOODS
  /** Whether the lamp is on; it eases on and off. */
  lit: boolean
  className?: string
  style?: React.CSSProperties
  /** How large the piece is drawn, as a share of the size that fits it to the stage. */
  size?: number
}

export function SpaceViewer({ src, label, wood, lit, className, style, size = 1 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ wood, lit })
  const [shown, setShown] = useState(false)

  useEffect(() => {
    stateRef.current = { wood, lit }
  }, [wood, lit])

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
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.NeutralToneMapping
      renderer.toneMappingExposure = 1
      const canvas = renderer.domElement
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      host.appendChild(canvas)

      const scene = new THREE.Scene()
      scene.environmentIntensity = STUDIO.off

      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100)
      // From the front, a little to the side and from a little above, as the
      // lamp is seen on a table: the gold of the bulb toward the viewer.
      camera.position.set(0.42, 0.16, 1)
      const controls = new OrbitControls(camera, canvas)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.rotateSpeed = 0.7
      controls.enableZoom = false
      controls.enablePan = false
      controls.minPolarAngle = Math.PI * 0.25
      controls.maxPolarAngle = Math.PI * 0.62
      controls.autoRotate = true
      controls.autoRotateSpeed = TURN_SPEED
      canvas.style.touchAction = "pan-y"

      let resume = 0
      controls.addEventListener("start", () => {
        window.clearTimeout(resume)
        controls.autoRotate = false
      })
      controls.addEventListener("end", () => {
        resume = window.setTimeout(() => (controls.autoRotate = true), RESUME_AFTER * 1000)
      })

      // The materials. The wood's colours and roughness ease toward the finish chosen.
      const ebony = { value: stateRef.current.wood === "ebonised" ? 1 : 0 }
      const woodMaterial = new THREE.MeshStandardMaterial({ metalness: 0, roughness: WOODS.natural.roughness })
      withGrain(woodMaterial, ebony)
      const crown = new THREE.MeshStandardMaterial({ color: new THREE.Color(...CROWN), metalness: 1, roughness: 0.08 })
      const glass = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        emissive: new THREE.Color(...WARM),
        emissiveIntensity: 0,
      })
      const socket = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0, roughness: 0.45 })
      const materials = [woodMaterial, crown, glass, socket]

      // The lamp's own lights, and the halo; all at nothing until it is on.
      const bulb: PointLight = new THREE.PointLight(new THREE.Color(...WARM_LIGHT), 0, 0, 2)
      const spill: PointLight = new THREE.PointLight(new THREE.Color(...WARM_LIGHT), 0, 0, 2)
      const haloTexture = haloMap(THREE)
      const halo: Sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: haloTexture,
          color: new THREE.Color(...WARM),
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0,
        }),
      )
      halo.renderOrder = 10
      scene.add(bulb, spill, halo)
      const front = new THREE.Vector3(0, 0, 1)
      const toCamera = new THREE.Vector3()
      let on = stateRef.current.lit ? 1 : 0

      const ease = (from: number, to: number, k: number) => from + (to - from) * k
      const dress = (k: number, kLight: number) => {
        const { wood, lit } = stateRef.current
        ebony.value = ease(ebony.value, wood === "ebonised" ? 1 : 0, k)
        woodMaterial.roughness = ease(WOODS.natural.roughness, WOODS.ebonised.roughness, ebony.value)
        on = ease(on, lit ? 1 : 0, kLight)
        if (Math.abs(on - (lit ? 1 : 0)) < 0.001) on = lit ? 1 : 0
        scene.environmentIntensity = ease(STUDIO.off, STUDIO.on, on)
        glass.emissiveIntensity = 7 * on
        glass.opacity = ease(0.22, 0.96, on)
        bulb.intensity = BULB_CD * on
        spill.intensity = SPILL_CD * on
        // The halo only where the bulb can be seen: from in front of the lamp.
        toCamera.copy(camera.position).sub(bulb.position).normalize()
        const facing = THREE.MathUtils.smoothstep(toCamera.dot(front), -0.15, 0.55)
        halo.material.opacity = 0.85 * on * facing
        halo.visible = halo.material.opacity > 0.002
      }

      let halfHeight = 2
      let reach = 0.5
      const fit = () => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        const vHalf = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
        const hHalf = vHalf * camera.aspect
        const distance = (Math.max(halfHeight / vHalf, reach / hHalf) * MARGIN) / size + reach
        camera.position.setLength(distance)
        camera.near = distance / 100
        camera.far = distance * 10
        camera.updateProjectionMatrix()
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
        dress(1 - Math.exp(-dt / CHANGE), 1 - Math.exp(-dt / LIGHT_CHANGE))
        scene.environmentRotation.y = Math.atan2(camera.position.x, camera.position.z) + STUDIO_TURN
        renderer.render(scene, camera)
      }
      let visible = true
      const start = () => {
        if (!frame && model && visible) frame = requestAnimationFrame(tick)
      }
      const stop = () => {
        cancelAnimationFrame(frame)
        frame = 0
        last = 0
      }
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
        materials.forEach((m) => m.dispose())
        halo.material.dispose()
        haloTexture.dispose()
        environment?.dispose()
        renderer.dispose()
        canvas.remove()
      }

      let studioMap: Awaited<ReturnType<typeof studioTexture>>
      let loaded: Object3D
      try {
        ;[studioMap, { scene: loaded }] = await Promise.all([
          studioTexture(THREE),
          new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(src),
        ])
      } catch {
        return
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
      model.scale.setScalar(SCALE)
      model.updateMatrixWorld(true)
      const byName: Record<string, MeshStandardMaterial> = { wood: woodMaterial, crown, glass, socket }
      model.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        ;(mesh.material as MeshStandardMaterial).dispose()
        // A part is known by its node's name, or its mesh's (`space-obj-to-glb.mjs`).
        const part = [mesh.name, mesh.parent?.name ?? ""].find((n) => byName[n]) ?? "wood"
        mesh.material = byName[part]
        if (part === "glass") mesh.renderOrder = 1
      })
      const box = new THREE.Box3().setFromObject(model)
      model.position.sub(box.getCenter(new THREE.Vector3()))
      model.updateMatrixWorld(true)
      const extent = box.getSize(new THREE.Vector3())
      halfHeight = extent.y / 2
      reach = Math.hypot(extent.x, extent.z) / 2
      scene.add(model)

      // The bulb's middle, and which way its crown faces: the lamp's front.
      const glassMesh = model.getObjectByName("glass")
      const crownMesh = model.getObjectByName("crown")
      if (glassMesh) {
        const glassBox = new THREE.Box3().setFromObject(glassMesh)
        const centre = glassBox.getCenter(new THREE.Vector3())
        const radius = glassBox.getSize(new THREE.Vector3()).x / 2
        if (crownMesh) {
          const c = new THREE.Box3().setFromObject(crownMesh).getCenter(new THREE.Vector3())
          front.copy(c.sub(centre).setY(0)).normalize()
        }
        // Inside the hollow, a little behind the bulb's middle; the spill in front of it.
        bulb.position.copy(centre).addScaledVector(front, -radius * 0.6)
        spill.position.copy(centre).addScaledVector(front, radius * 1.7)
        halo.position.copy(centre)
        halo.scale.setScalar(radius * 9)
      }

      dress(1, 1)
      fit()
      start()
      setShown(true)
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [src, size])

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

/** A soft round glow, white at its heart, for the halo. */
function haloMap(THREE: typeof import("three")) {
  const N = 128
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = N
  const g = canvas.getContext("2d")!
  const grad = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2)
  grad.addColorStop(0, "rgba(255,255,255,0.9)")
  grad.addColorStop(0.12, "rgba(255,255,255,0.45)")
  grad.addColorStop(0.35, "rgba(255,255,255,0.12)")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = grad
  g.fillRect(0, 0, N, N)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * The grain, drawn in the shader from the point's place in the world (where
 * the piece stands still while the camera goes round it, so the grain stays on
 * the wood). `ebony` runs from 0, natural, to 1, ebonised.
 */
function withGrain(material: MeshStandardMaterial, ebony: { value: number }) {
  const rgb = (c: readonly number[]) => `vec3(${c.map((n) => n.toFixed(4)).join(", ")})`
  material.customProgramCacheKey = () => "pandov-wood"
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEbony = ebony
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWoodPos;")
      .replace("#include <project_vertex>", `#include <project_vertex>\nvWoodPos = (modelMatrix * vec4(transformed, 1.0)).xyz / ${SCALE.toFixed(1)};`)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uEbony;
        varying vec3 vWoodPos;
        float woodHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
        float woodNoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(woodHash(i), woodHash(i + vec3(1, 0, 0)), f.x), mix(woodHash(i + vec3(0, 1, 0)), woodHash(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(woodHash(i + vec3(0, 0, 1)), woodHash(i + vec3(1, 0, 1)), f.x), mix(woodHash(i + vec3(0, 1, 1)), woodHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }
        float woodFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * woodNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 q = vWoodPos;
          // The tree's axis runs up behind the piece and off to one side, leaning a little.
          vec2 axis = vec2(0.035, -0.075) + vec2(0.09, 0.05) * q.y;
          float wander = woodFbm(q * vec3(14.0, 2.2, 14.0)) - 0.5;
          float r = length(q.xz - axis) + 0.012 * wander + 0.0025 * (woodNoise(q * vec3(60.0, 6.0, 60.0)) - 0.5);
          float rings = r * ${RINGS.toFixed(1)};
          float ring = fract(rings);
          // How many rings fall in a pixel: past one, they are averaged rather than shimmer.
          float blur = clamp(fwidth(rings) * 1.6, 0.0, 1.0);
          // Oak grows a band of large pores at the start of each year, then denser, darker latewood.
          float early = smoothstep(0.0, 0.06, ring) * (1.0 - smoothstep(0.14, 0.3, ring));
          float late = smoothstep(0.45, 0.98, ring);
          float band = mix(0.55 * early + 0.75 * late, 0.45, blur);
          // Fine fibres running up the grain, faded out where they are finer than a pixel.
          vec3 fq = q * vec3(420.0, 18.0, 420.0);
          float fibre = (woodNoise(fq) - 0.5) * (1.0 - clamp(fwidth(fq.x + fq.z) * 0.8, 0.0, 1.0));
          float tone = clamp(band + 0.35 * fibre + 0.25 * (woodFbm(q * 9.0) - 0.5), 0.0, 1.0);
          vec3 natural = mix(${rgb(WOODS.natural.light)}, ${rgb(WOODS.natural.dark)}, tone);
          vec3 ebonised = mix(${rgb(WOODS.ebonised.light)}, ${rgb(WOODS.ebonised.dark)}, tone);
          diffuseColor.rgb = mix(natural, ebonised, uEbony);
        }`,
      )
  }
}
