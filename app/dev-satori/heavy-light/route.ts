// TEMPORARY, development only — not part of the site. Runs
// scripts/space-obj-to-glb.mjs on Heavy Light's OBJ export, on this computer,
// where the conversion's packages are installed, and writes
// public/models/heavy-light.glb. Goes with the rest of app/dev-satori.
import { execFile } from "node:child_process"
import path from "node:path"

const OBJ = "D:\\PANDOV\\3_SPACE\\1_HEAVY LIGHT\\OBJ- 3d\\1_HEAVY LIGHT.obj"

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 })
  const script = path.join(process.cwd(), "scripts", "space-obj-to-glb.mjs")
  const output = path.join(process.cwd(), "public", "models", "heavy-light.glb")
  const result = await new Promise<{ code: number; out: string; err: string }>((resolve) => {
    execFile(process.execPath, [script, OBJ, output], { cwd: process.cwd(), maxBuffer: 1 << 24 }, (error, out, err) =>
      resolve({ code: error ? 1 : 0, out: String(out), err: String(err) + (error ? `\n${error.message}` : "") }),
    )
  })
  return Response.json(result)
}
