"use client"

import { useEffect, useRef, useState } from "react"
import type { WebGLRenderer } from "three"
import { JULIUS, TRACK } from "@/lib/type"

/**
 * The 3D scan on /making (2026-11-17): the burnt log end, scanned, and the
 * lamp designed to fit its hollow, as one model (`public/models/making-scan.glb`,
 * made by `scripts/making-model.mjs` from the author's "Scan si Lampa.obj").
 *
 * It turns slowly by itself until a hand takes it, and turns again a few
 * seconds after it is let go. The visitor may turn it any way and zoom in.
 *
 * Zoom, on a page that scrolls: the wheel belongs to the page, or a reader
 * scrolling past would be caught in the model. So the wheel zooms only once
 * the model has been pressed, until the pointer leaves it, and always with a
 * trackpad's pinch (which arrives as a wheel with Ctrl). On a phone a sideways
 * drag turns it, two fingers zoom, and an upward drag still scrolls the page.
 *
 * three.js is loaded only when the model is near the window, and the picture
 * is drawn only while it is on screen.
 *
 * Materials are set here, not in the file: the scan's own textures were baked
 * on its 1M-triangle original and do not fit this export (see the script), so
 * the wood is drawn as what it is, charred black, its grain carried by the
 * scanned surface itself; the lamp is a warm porcelain white with a faint glow.
 */

/** OrbitControls' unit: 2 is a turn every 30 seconds; this is one a minute. */
const TURN_SPEED = 1
const RESUME_AFTER = 4
const FOV = 26
/** How much of the stage's height the model stands in. */
const FILL = 0.78

export function MakingModel({ src, className }: { src: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup = () => {}

    const start = async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/controls/OrbitControls.js"),
        import("three/addons/environments/RoomEnvironment.js"),
      ])
      if (disposed) return

      let renderer: WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
      } catch {
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0xffffff, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.NeutralToneMapping
      const canvas = renderer.domElement
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      canvas.style.touchAction = "pan-y"
      host.appendChild(canvas)

      const scene = new THREE.Scene()
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environmentIntensity = 0.9
      // A key light from above and to the left, low enough to rake the grain.
      const key = new THREE.DirectionalLight(0xfff4ea, 2.2)
      key.position.set(-1.2, 1.6, 1.4)
      scene.add(key)

      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 50)
      const controls = new OrbitControls(camera, canvas)
      canvas.style.touchAction = "pan-y" // OrbitControls sets "none"; vertical drags go back to the page
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.rotateSpeed = 0.6
      controls.enablePan = false
      controls.enableZoom = false
      controls.zoomSpeed = 0.6
      controls.autoRotate = true
      controls.autoRotateSpeed = TURN_SPEED

      let resume = 0
      controls.addEventListener("start", () => {
        window.clearTimeout(resume)
        controls.autoRotate = false
        setTouched(true)
      })
      controls.addEventListener("end", () => {
        resume = window.setTimeout(() => (controls.autoRotate = true), RESUME_AFTER * 1000)
      })

      // The wheel: the page's, unless the model has been pressed or it is a pinch.
      // Both listen in the capture phase on the host, so they run before
      // OrbitControls' own listeners on the canvas.
      let engaged = false
      const onDown = (e: PointerEvent) => {
        engaged = true
        // A finger cannot zoom alone; two always may.
        if (e.pointerType === "touch") controls.enableZoom = true
      }
      const onLeave = () => (engaged = false)
      const onWheel = (e: WheelEvent) => {
        controls.enableZoom = engaged || e.ctrlKey
      }
      host.addEventListener("pointerdown", onDown, { capture: true })
      canvas.addEventListener("pointerleave", onLeave)
      host.addEventListener("wheel", onWheel, { capture: true, passive: true })

      const gltf = await new GLTFLoader().loadAsync(src)
      if (disposed) return
      const model = gltf.scene
      model.traverse((o) => {
        const mesh = o as import("three").Mesh
        if (!mesh.isMesh) return
        if (mesh.name.startsWith("scan")) {
          mesh.geometry.computeVertexNormals()
          mesh.material = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.78, metalness: 0 })
        } else {
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: 0xf3e9e4,
            roughness: 0.42,
            metalness: 0,
            sheen: 0.4,
            sheenColor: new THREE.Color(0xffe6d8),
            emissive: new THREE.Color(0xffe2cf),
            emissiveIntensity: 0.06,
          })
        }
      })
      // Centre it on its own middle, so it turns about its axis.
      const box = new THREE.Box3().setFromObject(model)
      const centre = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      model.position.sub(centre)
      scene.add(model)

      // Stand back far enough for its height to fill FILL of the stage.
      const fit = () => {
        const w = host.clientWidth, h = host.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        const vFov = (FOV * Math.PI) / 180
        const dist = Math.max(size.y / FILL / (2 * Math.tan(vFov / 2)), (size.x * 1.4) / FILL / (2 * Math.tan(vFov / 2) * camera.aspect))
        camera.position.setLength(dist)
        controls.minDistance = dist * 0.35
        controls.maxDistance = dist * 1.6
        camera.updateProjectionMatrix()
      }
      // A three-quarter view, a little from above.
      camera.position.set(0.7, 0.25, 1)
      fit()
      const ro = new ResizeObserver(fit)
      ro.observe(host)

      let frame = 0
      let visible = true
      const loop = () => {
        frame = 0
        controls.update()
        renderer.render(scene, camera)
        if (visible) frame = requestAnimationFrame(loop)
      }
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible && !frame) frame = requestAnimationFrame(loop)
      })
      io.observe(host)
      loop()
      setShown(true)

      cleanup = () => {
        io.disconnect()
        ro.disconnect()
        if (frame) cancelAnimationFrame(frame)
        window.clearTimeout(resume)
        host.removeEventListener("pointerdown", onDown, { capture: true })
        canvas.removeEventListener("pointerleave", onLeave)
        host.removeEventListener("wheel", onWheel, { capture: true })
        controls.dispose()
        pmrem.dispose()
        renderer.dispose()
        canvas.remove()
      }
    }

    // Loaded only once the model is near the window.
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        near.disconnect()
        start()
      },
      { rootMargin: "600px 0px" },
    )
    near.observe(host)

    return () => {
      disposed = true
      near.disconnect()
      cleanup()
    }
  }, [src])

  return (
    <div className={className}>
      <div
        ref={hostRef}
        role="img"
        aria-label="A 3D scan of a burnt log end, with a lamp designed to fit its hollow"
        style={{ position: "absolute", inset: 0, opacity: shown ? 1 : 0, transition: "opacity 1.6s ease" }}
      />
      <p
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          textAlign: "center",
          fontFamily: JULIUS,
          fontSize: 11,
          letterSpacing: TRACK,
          textTransform: "uppercase",
          color: "#a2a2a2",
          opacity: shown && !touched ? 0.8 : 0,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
        }}
      >
        <span className="mk-hint-d">drag to turn · click, then scroll to zoom</span>
        <span className="mk-hint-p">drag sideways to turn · pinch to zoom</span>
      </p>
    </div>
  )
}
