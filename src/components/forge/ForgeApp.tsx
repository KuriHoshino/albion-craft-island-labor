import { useEffect } from "react"
import {
  Bookmark,
  BookOpen,
  Dices,
  GraduationCap,
  Hammer,
  Map,
  Percent,
} from "lucide-react"
import { SERVERS } from "@/lib/forge/rules"
import { priceWatchKey, useForge, type View } from "@/lib/forge/store"
import { syncCatalogFromGitHub } from "@/lib/forge/remote"
import { Bench } from "./Bench"
import { SaveLab } from "./Save"
import { CitiesLab, Codex, RerollLab, ReturnFocusLab, StudyLab } from "./Labs"

const NAV: { id: View; label: string; icon: typeof Hammer }[] = [
  { id: "bench", label: "Craft", icon: Hammer },
  { id: "returns", label: "Return & focus", icon: Percent },
  { id: "study", label: "Study & repair", icon: GraduationCap },
  { id: "reroll", label: "Reroll", icon: Dices },
  { id: "cities", label: "Cities", icon: Map },
  { id: "codex", label: "Codex", icon: BookOpen },
  { id: "save", label: "Save", icon: Bookmark },
]

export function ForgeApp() {
  const view = useForge((s) => s.view)
  const setView = useForge((s) => s.setView)
  const server = useForge((s) => s.server)
  const patch = useForge((s) => s.patch)

  useEffect(() => {
    void syncCatalogFromGitHub().catch(() => undefined)
  }, [])

  useEffect(() => {
    let timer = 0
    const load = () => {
      if (document.visibilityState === "hidden") return
      void useForge.getState().loadPrices()
    }
    const boot = () => {
      load()
      timer = window.setInterval(load, 60_000)
    }
    const unsubHydrate = useForge.persist.onFinishHydration(boot)
    if (useForge.persist.hasHydrated()) boot()
    else void useForge.persist.rehydrate()
    let last = priceWatchKey(useForge.getState())
    const unsub = useForge.subscribe((state) => {
      const next = priceWatchKey(state)
      if (next === last) return
      last = next
      load()
    })
    const onVisible = () => {
      if (document.visibilityState === "visible") load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      unsubHydrate()
      unsub()
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-display text-xl leading-none">Hearthforge</p>
            <p className="mt-1 text-xs text-muted">Albion crafting desk</p>
          </div>
          <label className="text-xs text-muted">
            Server
            <select
              className="mt-1 block h-11 rounded-lg border border-line bg-panel px-3 text-base text-parchment"
              value={server}
              onChange={(event) => patch({ server: event.target.value as typeof server })}
            >
              {SERVERS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {NAV.map((entry) => {
            const Icon = entry.icon
            const on = view === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setView(entry.id)}
                className={
                  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm " +
                  (on ? "border-brass text-brass" : "border-line text-muted")
                }
              >
                <Icon className="size-4" />
                {entry.label}
              </button>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 pb-10">
        {view === "bench" ? <Bench /> : null}
        {view === "returns" ? <ReturnFocusLab /> : null}
        {view === "study" ? <StudyLab /> : null}
        {view === "reroll" ? <RerollLab /> : null}
        {view === "cities" ? <CitiesLab /> : null}
        {view === "codex" ? <Codex /> : null}
        {view === "save" ? <SaveLab /> : null}
        <p className="mt-8 max-w-2xl text-xs text-muted">
          Return rate, focus, study fame, nutrition, and repair follow the current Albion rules. Recipes come from the
          public game data and can be fixed on GitHub after this app is published. Prices are the live order book from
          the Albion Online Data Project and refresh about once a minute. Not affiliated with Sandbox Interactive.
        </p>
      </main>
    </div>
  )
}
