// TEMPORARY, development only — not part of the site. Saves a render made by
// /dev-satori/render into the Satori folder on this computer. Delete the whole
// app/dev-satori folder once the renders are made.
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const OUT = "D:\\PANDOV\\2_BODY\\2_SATORI\\WEB RENDERS"

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 })
  const { name, png } = (await req.json()) as { name: string; png: string }
  if (!/^[a-z0-9-]+$/.test(name) || !png.startsWith("data:image/png;base64,")) {
    return new Response("bad request", { status: 400 })
  }
  await mkdir(OUT, { recursive: true })
  const file = path.join(OUT, `${name}.png`)
  await writeFile(file, Buffer.from(png.slice("data:image/png;base64,".length), "base64"))
  return Response.json({ file })
}
