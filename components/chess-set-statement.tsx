"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

/**
 * Closing statement of the Chess Set page: the commission note on the left,
 * the radiant ornament on the right. The rosette at the centre of the radiant
 * turns continuously and speeds up with the scroll, so the drawing reads as a
 * mechanism rather than a static frame.
 */
export function ChessSetStatement() {
  const [rotation, setRotation] = useState(0)
  const velocityRef = useRef(0)
  const lastScrollYRef = useRef(0)
  const animationFrameRef = useRef<number>(0)
  const baseSpeed = 30 // degrees per second

  useEffect(() => {
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      velocityRef.current *= 0.95
      const totalSpeed = baseSpeed + Math.abs(velocityRef.current) * 2
      setRotation(prev => (prev + totalSpeed * deltaTime) % 360)

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollDelta = scrollY - lastScrollYRef.current
      lastScrollYRef.current = scrollY
      velocityRef.current += scrollDelta * 0.5
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <style>{`
        .statement-section {
          width: 100%;
          background-color: #fff;
          padding: 160px 0 180px;
        }
        .statement-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 80px;
        }
        .statement-text {
          flex: 0 1 420px;
          font-family: 'Julius Sans One', sans-serif;
        }
        .statement-lead {
          font-size: clamp(11px, 1.05vw, 14px);
          letter-spacing: 0.12em;
          line-height: 2.2;
          color: #888;
          text-transform: uppercase;
          margin: 0;
        }
        .statement-note {
          font-size: clamp(10px, 0.85vw, 12px);
          letter-spacing: 0.08em;
          line-height: 2.1;
          color: #aaa;
          margin: 48px 0 0;
        }
        .statement-rule {
          height: 1px;
          background-color: #e0e0e0;
          margin: 44px 0 0;
        }
        .statement-contact {
          display: inline-block;
          margin-top: 40px;
          font-family: 'Julius Sans One', sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #888;
          text-decoration: none;
          transition: opacity 0.3s ease;
        }
        .statement-contact:hover {
          opacity: 0.5;
        }
        /* Ornament — radiant frame with the rosette turning at its centre */
        .statement-ornament {
          position: relative;
          flex: 0 0 auto;
          width: clamp(300px, 38vw, 560px);
          aspect-ratio: 1 / 1;
        }
        .statement-radiant {
          width: 100%;
          height: 100%;
          display: block;
          opacity: 0.5;
        }
        .statement-rotita {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 42%;
          height: 42%;
          margin: -21% 0 0 -21%;
          opacity: 0.65;
        }
        @media (max-width: 900px) {
          .statement-section {
            padding: 90px 0 100px;
          }
          .statement-inner {
            flex-direction: column;
            align-items: center;
            gap: 64px;
            padding: 0 32px;
          }
          .statement-text {
            flex: 1 1 auto;
            max-width: 420px;
            text-align: center;
          }
          .statement-ornament {
            width: min(80vw, 420px);
          }
        }
      `}</style>

      <section className="statement-section">
        <div className="statement-inner">
          <div className="statement-text">
            <p className="statement-lead">
              Reduced to what is essential, each piece holds just enough material to exist.
            </p>
            <p className="statement-note">
              Every edition is produced to order. Dimensions, materials and finishes
              are defined with each commission. Pricing is available upon request.
            </p>
            <div className="statement-rule" />
            <Link href="/contact" className="statement-contact">
              Contact
            </Link>
          </div>

          <div className="statement-ornament">
            {/* Radiant frame — static */}
            <img src="/images/desen-radiant.svg" alt="" className="statement-radiant" />
            {/* Rosette — turns with the scroll, centred on the radiant */}
            <img
              src="/images/desen-rotita.svg"
              alt=""
              className="statement-rotita"
              style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center center" }}
            />
          </div>
        </div>
      </section>
    </>
  )
}
