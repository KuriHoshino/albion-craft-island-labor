import { useEffect } from "react"
import { BookOpen, Clock, Dices, GraduationCap, Hammer, Percent, Sprout, Users } from "lucide-react"
import { signIn } from "@/lib/auth/client"
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates"
import { SERVERS } from "@/lib/forge/rules"
import { priceWatchKey, useForge, type View } from "@/lib/forge/store"
import { syncCatalogFromGitHub } from "@/lib/forge/remote"
import { Bench } from "./Bench"
import { FarmLab } from "./Farm"
import { LaborLab } from "./Labor"
import { RecentLab } from "./Recent"
import { Codex, RerollLab, ReturnFocusLab, StudyLab } from "./Labs"

const NAV: { id: View; label: string; icon: typeof Hammer }[] = [
  { id: "codex", label: "Codex", icon: BookOpen },
  { id: "bench", label: "Add Craft", icon: Hammer },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "farm", label: "Farming and Breeding", icon: Sprout },
  { id: "labor", label: "Laborers", icon: Users },
  { id: "returns", label: "Return & focus", icon: Percent },
  { id: "study", label: "Study & repair", icon: GraduationCap },
  { id: "reroll", label: "Reroll", icon: Dices },
]

export function ForgeApp() {
  const storedView = useForge((s) => s.view)
  const view = NAV.some((entry) => entry.id === storedView) ? storedView : "bench"
  const setView = useForge((s) => s.setView)
  const server = useForge((s) => s.server)
  const patch = useForge((s) => s.patch)

  useEffect(() => {
    void syncCatalogFromGitHub().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!NAV.some((entry) => entry.id === storedView)) setView("bench")
  }, [storedView, setView])

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
          <div className="flex items-end gap-3">
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
            <SignedOut>
              <button
                type="button"
                onClick={() => signIn("grok-google", { callbackURL: "/" })}
                className="h-11 rounded-lg border border-line px-3 text-sm text-parchment"
              >
                Sign in with Google
              </button>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
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
        {view === "farm" ? <FarmLab /> : null}
        {view === "labor" ? <LaborLab /> : null}
        {view === "returns" ? <ReturnFocusLab /> : null}
        {view === "study" ? <StudyLab /> : null}
        {view === "reroll" ? <RerollLab /> : null}
        {view === "codex" ? <Codex /> : null}
        {view === "recent" ? <RecentLab /> : null}
        <p className="mt-8 max-w-2xl text-xs text-muted">
          Return rate, focus, study fame, nutrition, and repair follow the current Albion rules. Prices refresh about
          once a minute. Not affiliated with Sandbox Interactive.
        </p>
      </main>
    </div>
  )
}
