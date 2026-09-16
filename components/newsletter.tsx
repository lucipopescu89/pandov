"use client"

import { type FormEvent, useState } from "react"

export function Newsletter() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    console.log("Newsletter signup:", email)
    setEmail("")
  }

  return (
    <section className="w-full">
      <div className="max-w-[1920px] mx-auto bg-foreground text-background py-12 md:py-20 lg:py-24 xl:py-28 2xl:py-32 px-6 md:px-12 lg:px-16 xl:px-20 2xl:px-24 text-center mb-16 md:mb-24 lg:mb-28 xl:mb-32">
        <h2 className="text-3xl md:text-5xl lg:text-6xl xl:text-6xl 2xl:text-7xl font-extrabold mb-4 md:mb-5 lg:mb-6">
          Join Our Newsletter
        </h2>
        <p className="text-sm md:text-base lg:text-lg xl:text-lg opacity-70 mb-8 md:mb-10 lg:mb-12 max-w-xl lg:max-w-2xl mx-auto">
          Subscribe to receive updates, access to exclusive deals, and more.
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto border-b border-background gap-3 sm:gap-0"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="bg-transparent border-none py-3 md:py-4 lg:py-5 xl:py-5 text-background flex-1 text-sm md:text-base lg:text-lg xl:text-lg outline-none placeholder:text-background/50"
          />
          <button
            type="submit"
            className="bg-transparent border-none text-background font-extrabold uppercase cursor-pointer tracking-widest hover:opacity-70 transition-opacity text-sm lg:text-base xl:text-base px-4"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  )
}
