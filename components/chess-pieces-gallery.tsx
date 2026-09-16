"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"

const BLACK_PIECES = [
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/black%20pawn-WoKTHiVgQveqMdrPmNBwDyGTJJzt0n.jpg", label: "Pawn" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/black%20queen-z1lpUWFeMj6eHWbLCNCJHjYT3zQnUf.jpg", label: "Queen" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/black%20king-caz7PKcZIgQNAbR1gDhVy3WqUeA8o4.jpg", label: "King" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/black%20bishop-s6Jy5QS5qTJSO1k99X6ckvydIob1at.jpg", label: "Bishop" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/black%20knight-L5BrcJWDSTOoFuaXavJqBCmOuxPm9u.jpg", label: "Knight" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/black%20rock-1zM377KS83qglTLOTBxehnKncN7851.jpg", label: "Rook" },
]

const WHITE_PIECES = [
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/white%20pawn-f7lTaFVk70r14Jf5qqZTrzlc9M21Vq.jpg", label: "Pawn" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/white%20queen-l00SD3sgMvgJNhiwISS8xgtRSeh5Bd.jpg", label: "Queen" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/white%20king-v3rQbyhUHbgBim2lpolmBHSa3uCg14.jpg", label: "King" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/white%20bishop-WGqAS37DwisMTJbgixjHtVrlOpHDFC.jpg", label: "Bishop" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/white%20knight-p7wQlHmzFkJi1OZ4aXrGW7TVl6tpri.jpg", label: "Knight" },
  { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/white%20rook-f3SL9hd72YTnwNGt9kDkiP2eiPUhku.jpg", label: "Rook" },
]

const AUTOPLAY_MS = 7000

function PieceGallery({
  pieces,
  bgColor,
  side,
  externalIndex,
  onIndexChange,
}: {
  pieces: typeof BLACK_PIECES
  bgColor: string
  side: "black" | "white"
  externalIndex: number
  onIndexChange: (i: number) => void
}) {
  const [current, setCurrent] = useState(externalIndex)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = useCallback(
    (i: number) => {
      const next = (i + pieces.length) % pieces.length
      setCurrent(next)
      onIndexChange(next)
    },
    [pieces.length, onIndexChange]
  )

  // Sync when external index changes (driven by the other gallery)
  useEffect(() => {
    setCurrent(externalIndex)
  }, [externalIndex])

  // Autoplay
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % pieces.length
        onIndexChange(next)
        return next
      })
    }, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pieces.length, onIndexChange])

  const piece = pieces[current]

  return (
    <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: bgColor }}>
      {/* Image — 60% of panel width, centered */}
      <div style={{ width: "60%", aspectRatio: "3/4", position: "relative", overflow: "hidden" }}>
        <Image
          src={piece.src}
          alt={`${side === "black" ? "Black" : "White"} ${piece.label}`}
          fill
          style={{
            objectFit: "contain",
            objectPosition: "center",
            transform: side === "white" ? "scaleX(-1)" : "none",
          }}
          sizes="(max-width: 768px) 50vw, 30vw"
        />
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        padding: "24px 0 36px",
      }}>
        <button
          aria-label="Previous piece"
          onClick={() => go(current - 1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: side === "black" ? "#1a1a1a" : "#ccc",
            fontSize: "18px",
            lineHeight: 1,
            padding: "4px 8px",
            fontFamily: "'Julius Sans One', sans-serif",
            letterSpacing: "0.1em",
          }}
        >
          &#8592;
        </button>

        {/* Dots */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {pieces.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to ${pieces[i].label}`}
              onClick={() => go(i)}
              style={{
                width: i === current ? "20px" : "6px",
                height: "6px",
                borderRadius: "3px",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
                backgroundColor: i === current
                  ? (side === "black" ? "#1a1a1a" : "#bbb")
                  : (side === "black" ? "#ccc" : "#555"),
              }}
            />
          ))}
        </div>

        <button
          aria-label="Next piece"
          onClick={() => go(current + 1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: side === "black" ? "#1a1a1a" : "#ccc",
            fontSize: "18px",
            lineHeight: 1,
            padding: "4px 8px",
            fontFamily: "'Julius Sans One', sans-serif",
            letterSpacing: "0.1em",
          }}
        >
          &#8594;
        </button>
      </div>

      {/* Piece label */}
      <p style={{
        fontFamily: "'Julius Sans One', sans-serif",
        fontSize: "11px",
        letterSpacing: "0.18em",
        color: side === "black" ? "#aaa" : "#666",
        textTransform: "uppercase",
        marginBottom: "40px",
        marginTop: "-16px",
      }}>
        {piece.label}
      </p>
    </div>
  )
}

export function ChessPiecesGallery() {
  const [sharedIndex, setSharedIndex] = useState(0)

  const handleIndexChange = useCallback((i: number) => {
    setSharedIndex(i)
  }, [])

  return (
    <section style={{ width: "100%", backgroundColor: "#fff" }}>
      <div style={{ display: "flex", width: "100%", minHeight: "600px" }}>
        {/* Black set — white background */}
        <PieceGallery
          pieces={BLACK_PIECES}
          bgColor="#ffffff"
          side="black"
          externalIndex={sharedIndex}
          onIndexChange={handleIndexChange}
        />
        {/* White set — dark background */}
        <PieceGallery
          pieces={WHITE_PIECES}
          bgColor="#3a3a3a"
          side="white"
          externalIndex={sharedIndex}
          onIndexChange={handleIndexChange}
        />
      </div>
    </section>
  )
}
