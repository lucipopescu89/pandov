// TEMPORARY, development only — not part of the site. Runs TypeScript's check
// over the project on this computer, as `next build` does before publishing,
// so a type error is found here rather than in a failed deploy. Goes with the
// rest of app/dev-satori.
import { execFile } from "node:child_process"
import path from "node:path"

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 })
  const tsc = path.join(process.cwd(), "node_modules", "typescript", "bin", "tsc")
  const result = await new Promise<{ code: number; out: string }>((resolve) => {
    execFile(process.execPath, [tsc, "--noEmit", "-p", "."], { cwd: process.cwd(), maxBuffer: 1 << 24, timeout: 240000 }, (error, out, err) =>
      resolve({ code: error ? 1 : 0, out: String(out) + String(err) }),
    )
  })
  return Response.json(result)
}
