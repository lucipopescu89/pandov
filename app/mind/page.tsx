import Image from "next/image"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"

export const metadata = {
  title: "Mind — PANDOV",
  description: "The mind is not empty, it is already in motion. These objects give it form.",
}

export default function MindPage() {
  return (
    <main className="w-full bg-white min-h-screen">
      <Navigation />

      {/* Page content */}
      <div
        style={{
          width: "100%",
          maxWidth: "621px",
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {/* Product title — centered, clickable */}
        <Link href="/mind/chess-set" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'Julius Sans One', sans-serif",
              fontSize: "clamp(11px, 1.2vw, 15px)",
              letterSpacing: "0.2em",
              color: "#333",
              fontWeight: 400,
              margin: "20px 0 30px 0",
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            Chess Set
          </p>
        </Link>

        {/* Image — full width of container, clickable */}
        <Link href="/mind/chess-set" style={{ display: "block" }}>
          <Image
            src="/images/mind-chess-set.jpg"
            alt="Chess Set — For Mind"
            width={621}
            height={422}
            style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }}
            priority
          />
        </Link>

      </div>

      <BodyFooter activeLabel={null} />
    </main>
  )
}
