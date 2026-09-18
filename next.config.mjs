/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Images are served exactly as they sit in `public/`, so their size on disk
    // is the size a visitor downloads. Export them at the width they are drawn
    // at, or a little over for finer screens; nothing here will do it for you.
    unoptimized: true,
  },
}

export default nextConfig
