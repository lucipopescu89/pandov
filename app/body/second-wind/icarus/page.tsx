import { Pendant3D } from "@/components/pendant-3d"

export const metadata = {
  title: "Icarus — Second Wind — PANDOV",
  description: "Icarus, from the Second Wind collection, in three dimensions.",
}

export default function IcarusPage() {
  return <Pendant3D name="Icarus" model="/models/icarus.glb" />
}
