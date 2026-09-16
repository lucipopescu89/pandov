import Image from "next/image"
import Link from "next/link"

const products = [
  {
    id: 1,
    name: "Modern Chair",
    category: "Furniture",
    price: "299",
    image: "/modern-minimalist-chair.jpg",
  },
  {
    id: 2,
    name: "Ceramic Vase",
    category: "Decor",
    price: "89",
    image: "/minimalist-ceramic-vase.png",
  },
  {
    id: 3,
    name: "Wood Table",
    category: "Furniture",
    price: "599",
    image: "/minimalist-wood-table.jpg",
  },
  {
    id: 4,
    name: "Pendant Lamp",
    category: "Lighting",
    price: "159",
    image: "/minimalist-pendant-lamp.jpg",
  },
  {
    id: 5,
    name: "Storage Unit",
    category: "Furniture",
    price: "449",
    image: "/minimalist-storage-cabinet.jpg",
  },
  {
    id: 6,
    name: "Wall Mirror",
    category: "Decor",
    price: "199",
    image: "/minimalist-round-mirror.jpg",
  },
]

export function ProductGrid() {
  return (
    <section className="w-full">
      <div className="max-w-[1920px] mx-auto mb-16 md:mb-24 lg:mb-28 xl:mb-32 px-4 md:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="flex justify-between items-end mb-8 md:mb-12 lg:mb-14 xl:mb-16 pt-8 md:pt-12 lg:pt-16 xl:pt-20">
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-5xl font-extrabold uppercase tracking-tight">
            Featured Products
          </h2>
          <Link
            href="#"
            className="text-foreground underline font-semibold text-xs md:text-sm lg:text-base hover:opacity-70 transition-opacity"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 lg:gap-10 xl:gap-10 2xl:gap-12">
          {products.map((product) => (
            <Link key={product.id} href="#" className="text-foreground no-underline group">
              <div className="bg-neutral-100 p-6 md:p-8 lg:p-10 xl:p-10 mb-4 md:mb-5 lg:mb-6 overflow-hidden h-[300px] md:h-[350px] lg:h-[400px] xl:h-[420px] 2xl:h-[450px] flex items-center justify-center">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  width={500}
                  height={500}
                  className="w-full h-full object-contain group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500"
                />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base md:text-lg lg:text-lg xl:text-xl mb-1">{product.name}</div>
                  <div className="text-xs md:text-sm lg:text-base text-neutral-500">{product.category}</div>
                </div>
                <div className="font-extrabold text-base md:text-lg lg:text-lg xl:text-xl">${product.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
