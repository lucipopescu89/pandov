"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"

const IMAGES = [
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8122-2nw3Zmo2jC898NZyeFzDxHLWDVhT00.jpg",
    alt: "Chess Set — piese aurii și negre pe tablă din unghi lateral",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/table%20design%20%284%29-PhioJnKG3eG2aPYQGhoWZ0RXOMkaXa.jpg",
    alt: "Chess Set — tablă pe soclu de marmură albă cu piese aurii și argintii",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8133-QE7smSHUa8z5QK6ltTGEixAACQB6Ih.jpg",
    alt: "Chess Set — piese aurii și negre pe tablă, vedere frontală",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8115-4NITbJjSPObmGCUnu8TTcqsLcEFdbJ.jpg",
    alt: "Chess Set — detaliu piese sculpturale aurii și negre pe tablă cu model circular",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3d%20printed%20in%20Brass%20and%20Steel%202-2Cp4gaQQEPnKxdzTyEG7vs40y6qpJR.jpg",
    alt: "Chess Set — set complet piese 3D printate în alamă și oțel, unghi lateral stânga",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3d%20Printed%20in%20Brass%20and%20Steel-AfSTu5SVifVFqH2inc4AXd5F6dx393.jpg",
    alt: "Chess Set — set complet piese 3D printate în alamă și oțel, unghi frontal",
  },
]

export function ChessSetGallery() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = useCallback((index: number) => {
    setCurrent((index + IMAGES.length) % IMAGES.length)
  }, [])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  // Auto-advance every 5 seconds with loop
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      goTo(current + 1)
    }, 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, goTo])

  return (
    <section style={{ width: "100%", backgroundColor: "transparent" }}>
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>

        {/* Images strip */}
        <div
          style={{
            display: "flex",
            transition: "transform 0.7s cubic-bezier(0.77, 0, 0.175, 1)",
            transform: `translateX(-${current * 100}%)`,
          }}
        >
          {IMAGES.map((img, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: "100%",
              }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={2400}
                height={1800}
                style={{ width: "100%", height: "auto", display: "block" }}
                sizes="100vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {/* Arrow left */}
        <button
          onClick={prev}
          aria-label="Previous image"
          style={{
            position: "absolute",
            left: "24px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            zIndex: 10,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="26" y1="16" x2="6" y2="16" stroke="#888888" strokeWidth="1.2"/>
            <polyline points="13,9 6,16 13,23" fill="none" stroke="#888888" strokeWidth="1.2"/>
          </svg>
        </button>

        {/* Arrow right */}
        <button
          onClick={next}
          aria-label="Next image"
          style={{
            position: "absolute",
            right: "24px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            zIndex: 10,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="6" y1="16" x2="26" y2="16" stroke="#888888" strokeWidth="1.2"/>
            <polyline points="19,9 26,16 19,23" fill="none" stroke="#888888" strokeWidth="1.2"/>
          </svg>
        </button>

      </div>
    </section>
  )
}
