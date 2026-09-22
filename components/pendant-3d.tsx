import { Navigation } from "@/components/navigation"
import { BodyFooter } from "@/components/body-footer"
import { PendantViewer } from "@/components/pendant-viewer"

/** Second Wind's ground, so the pendant is seen on the page it came from. */
const GROUND = "#202020"

/**
 * A pendant's page, as a first trial of showing one in three dimensions: the
 * model alone on the collection's ground, between the site's own menus.
 *
 * The stage is most of a screen high and the whole page wide, so the pendant
 * has room to turn and to be turned; capped, so on a tall screen it does not
 * push the bottom menu a long way down for nothing.
 */
export function Pendant3D({ name, model }: { name: string; model: string }) {
  return (
    <main className="w-full" style={{ backgroundColor: GROUND }}>
      <Navigation bgColor={GROUND} />
      <PendantViewer
        src={model}
        label={`${name}, in three dimensions — drag to turn it`}
        style={{ width: "100%", height: "min(78svh, 860px)", cursor: "grab" }}
      />
      <BodyFooter />
    </main>
  )
}
