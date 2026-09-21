/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Images are served exactly as they sit in `public/`, so their size on disk
    // is the size a visitor downloads. Export them at the width they are drawn
    // at, or a little over for finer screens; nothing here will do it for you.
    unoptimized: true,
  },

  // The Making and Contact videos, and their posters, are kept by the browser
  // for a year without asking again. Vercel's default for a file in `public/`
  // is `max-age=0, must-revalidate`: a phone that already had the video still
  // had to check with the server before playing it, and a video is fetched in
  // several pieces, each of which waited on that check over mobile data — the
  // pages' videos started late even on a second visit. Kept, they start at
  // once. The price is that a replaced file keeps its old copy in every browser
  // that has one, so a video or poster is never replaced under the same URL:
  // bump the `?v=` it is referenced with.
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default nextConfig
