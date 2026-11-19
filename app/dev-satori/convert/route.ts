// TEMPORARY, development only — not part of the site. Runs the project's own
// scripts/obj-to-glb.mjs on one of the four Satori OBJ exports, on this
// computer, so the GLBs are made exactly as Second Wind's were. Delete the
// whole app/dev-satori folder once the models and renders are made.
import { execFile } from "node:child_process"
import path from "node:path"

const OBJ_DIR = "D:\\PANDOV\\2_BODY\\2_SATORI\\Export OBJ"

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 })
  const n = new URL(req.url).searchParams.get("n")
  if (!n || !/^[1-4]$/.test(n)) return new Response("n must be 1-4", { status: 400 })
  const script = path.join(process.cwd(), "scripts", "obj-to-glb.mjs")
  const input = path.join(OBJ_DIR, `Satori${n}.obj`)
  const output = path.join(process.cwd(), "public", "models", `satori-${n}.glb`)
  const result = await new Promise<{ code: number; out: string; err: string }>((resolve) => {
    execFile(process.execPath, [script, input, output], { cwd: process.cwd(), maxBuffer: 1 << 24 }, (error, out, err) =>
      resolve({ code: error ? 1 : 0, out: String(out), err: String(err) + (error ? `\n${error.message}` : "") }),
    )
  })
  return Response.json(result)
}
