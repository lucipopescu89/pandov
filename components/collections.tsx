import Image from "next/image"
import Link from "next/link"

const collections = [
  {
    title: "Living Room",
    image: "/modern-minimalist-living-room.jpg",
    link: "#",
  },
  {
    title: "Bedroom",
    image: "/modern-minimalist-bedroom.png",
    link: "#",
  },
]

export function Collections() {
  return (
    <section className="w-full">
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10 mb-16 md:mb-24 lg:mb-28 xl:mb-32 px-4 md:px-8 lg:px-12 xl:px-16 2xl:px-24">
        {collections.map((collection) => (
          <div
            key={collection.title}
            className="relative h-[350px] md:h-[450px] lg:h-[550px] xl:h-[650px] 2xl:h-[700px] overflow-hidden bg-foreground group"
          >
            <Image
              src={collection.image || "/placeholder.svg"}
              alt={collection.title}
              width={900}
              height={700}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
            />
            <div className="absolute bottom-6 md:bottom-10 lg:bottom-12 xl:bottom-14 2xl:bottom-16 left-6 md:left-10 lg:left-12 xl:left-14 2xl:left-16 text-background">
              <h3 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-6xl font-extrabold mb-3 md:mb-4 lg:mb-5 xl:mb-6 uppercase tracking-tight">
                {collection.title}
              </h3>
              <Link
                href={collection.link}
                className="text-background no-underline text-xs md:text-sm lg:text-base xl:text-base font-semibold border-b-2 border-background pb-1 hover:opacity-70 transition-opacity"
              >
                Shop Collection
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
