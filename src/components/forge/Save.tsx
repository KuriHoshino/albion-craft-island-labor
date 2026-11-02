import { useCallback, useEffect, useState } from "react"
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client"
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates"
import { useCurrentUserState } from "@/lib/auth/use-current-user"
import { snapshotFrom } from "@/lib/forge/desk"
import { deleteCraftGroup, listCraftGroups, loadCraftGroup, saveCraftGroup, type CraftGroupCard } from "@/lib/forge/groups"
import { getItem } from "@/lib/forge/lookup"
import { GITHUB_DATA_URL, syncCatalogFromGitHub } from "@/lib/forge/remote"
import { useForge } from "@/lib/forge/store"
import { fieldClass } from "./fields"

function summaryOf(lines: { itemId: string }[]) {
  const names = lines.slice(0, 3).map((line) => getItem(line.itemId)?.name ?? line.itemId)
  const extra = lines.length > 3 ? ` +${lines.length - 3}` : ""
  return (names.join(", ") + extra).slice(0, 240)
}

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function SaveLab() {
  const { user, isPending } = useCurrentUserState()
  const loadedId = useForge((s) => s.loadedId)
  const loadedName = useForge((s) => s.loadedName)
  const patch = useForge((s) => s.patch)
  const applyDesk = useForge((s) => s.applyDesk)
  const [groups, setGroups] = useState<CraftGroupCard[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [recipeNote, setRecipeNote] = useState("")
  const [recipeBusy, setRecipeBusy] = useState(false)
  const catalogNote = useForge((s) => s.catalogNote)

  async function reloadRecipes() {
    setRecipeBusy(true)
    setRecipeNote("")
    try {
      await syncCatalogFromGitHub(true)
      setRecipeNote("Loaded the recipe files from GitHub.")
    } catch (error) {
      setRecipeNote(error instanceof Error ? error.message : "Could not read GitHub.")
    } finally {
      setRecipeBusy(false)
    }
  }

  const refresh = useCallback(async () => {
    if (!user) {
      setGroups([])
      return
    }
    try {
      setGroups(await listCraftGroups())
    } catch {
      setNote("Could not load your saved groups. Sign in again if this keeps happening.")
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function persist(id: string | null) {
    const state = useForge.getState()
    const name = state.loadedName.trim() || "My craft"
    setBusy(true)
    setNote("")
    try {
      const saved = await saveCraftGroup({
        data: {
          id,
          name,
          summary: summaryOf(state.lines),
          desk: snapshotFrom(state),
        },
      })
      patch({ loadedId: saved.id, loadedName: name })
      setNote(id ? "Updated this craft group." : "Saved a new craft group.")
      await refresh()
    } catch {
      setNote("Save failed. Sign in, then try again.")
    } finally {
      setBusy(false)
    }
  }

  async function openGroup(id: string, asCopy: boolean) {
    setBusy(true)
    setNote("")
    try {
      const row = await loadCraftGroup({ data: { id } })
      if (!row) {
        setNote("That group is gone.")
        await refresh()
        return
      }
      applyDesk(row.desk, { id: asCopy ? null : row.id, name: asCopy ? `${row.name} copy` : row.name })
    } catch {
      setNote("Could not open that group.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    setNote("")
    try {
      await deleteCraftGroup({ data: { id } })
      if (useForge.getState().loadedId === id) patch({ loadedId: null })
      await refresh()
    } catch {
      setNote("Could not delete that group.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Fix recipes on GitHub</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Names, materials, and focus live in JSON on GitHub. Edit a file there, commit it to main, then reload. That
          still works after this app is published.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={GITHUB_DATA_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm text-parchment"
          >
            Open the recipe files
          </a>
          <button
            type="button"
            disabled={recipeBusy}
            onClick={() => void reloadRecipes()}
            className="h-11 rounded-lg bg-brass px-4 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {recipeBusy ? "Loading GitHub…" : "Reload recipes"}
          </button>
        </div>
        {recipeNote || catalogNote ? <p className="mt-3 text-sm text-muted">{recipeNote || catalogNote}</p> : null}
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Load and save</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              A craft group is the whole desk: every recipe, the city, the focus, and the price overrides. Sign in and
              it stays on your account, so you can open the same research on another device.
            </p>
          </div>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        {isPending ? <p className="mt-4 text-sm text-muted">Checking your account…</p> : null}
        <SignedOut>
          <div className="mt-4 grid max-w-sm gap-2">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="h-11 rounded-lg border border-line bg-ink text-sm text-parchment"
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>
        </SignedOut>
        <SignedIn>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted">
              Craft group name
              <input
                className={fieldClass}
                value={loadedName}
                maxLength={80}
                onChange={(event) => patch({ loadedName: event.target.value })}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist(loadedId)}
              className="h-11 rounded-lg bg-brass px-4 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {loadedId ? "Update current craft group" : "Save current craft group"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist(null)}
              className="h-11 rounded-lg border border-line px-4 text-sm text-parchment disabled:opacity-60"
            >
              Save as new copy
            </button>
          </div>
          {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
        </SignedIn>
      </section>
      <SignedIn>
        {groups.length === 0 ? (
          <p className="text-sm text-muted">No saved groups yet. Name this desk and save it.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <li
                key={group.id}
                className={
                  "rounded-lg border bg-panel p-4 " + (group.id === loadedId ? "border-brass" : "border-line")
                }
              >
                <p className="font-display text-xl text-parchment">{group.name}</p>
                <p className="mt-1 text-sm text-muted">{group.summary || "No recipes"}</p>
                <p className="mt-2 text-xs text-muted">
                  {group.craftCount} craft{group.craftCount === 1 ? "" : "s"} · {when(group.updatedAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openGroup(group.id, false)}
                    className="h-11 rounded-lg border border-line px-3 text-sm"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openGroup(group.id, true)}
                    className="h-11 rounded-lg border border-line px-3 text-sm"
                  >
                    Clone
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(group.id)}
                    className="h-11 rounded-lg border border-ember px-3 text-sm text-ember"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SignedIn>
    </div>
  )
}
