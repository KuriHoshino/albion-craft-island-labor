import { useCallback, useEffect, useState } from "react"
import { SignedIn } from "@/lib/auth/gates"
import { useCurrentUserState } from "@/lib/auth/use-current-user"
import { snapshotFrom } from "@/lib/forge/desk"
import { deleteCraftGroup, listCraftGroups, loadCraftGroup, saveCraftGroup, type CraftGroupCard } from "@/lib/forge/groups"
import { getItem } from "@/lib/forge/lookup"
import { blankLine, useForge, type RecentSearch } from "@/lib/forge/store"

function when(value: number | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function titleOf(row: RecentSearch) {
  const name = getItem(row.itemId)?.name ?? row.itemId
  return `${name} .${row.enchant}`
}

export function RecentLab() {
  const { user } = useCurrentUserState()
  const recents = useForge((s) => s.recents ?? [])
  const openRecent = useForge((s) => s.openRecent)
  const saveRecent = useForge((s) => s.saveRecent)
  const dropRecent = useForge((s) => s.dropRecent)
  const applyDesk = useForge((s) => s.applyDesk)
  const [groups, setGroups] = useState<CraftGroupCard[]>([])
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setGroups([])
      return
    }
    try {
      setGroups(await listCraftGroups())
    } catch {
      setGroups([])
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const loose = recents.filter((row) => !row.saved)
  const pinned = recents.filter((row) => row.saved)

  async function pin(row: RecentSearch) {
    saveRecent(row.id)
    if (!user) {
      setNote("Saved on this device. Sign in with Google to keep it on your account.")
      return
    }
    const line = blankLine(row.itemId)
    line.enchant = row.enchant
    line.route = row.route
    line.city = row.city
    line.place = row.place
    const state = useForge.getState()
    setBusy(true)
    try {
      await saveCraftGroup({
        data: {
          id: null,
          name: titleOf(row),
          summary: `${row.city} · ${row.place}`,
          desk: snapshotFrom({ ...state, lines: [line], active: line.uid }),
        },
      })
      setNote("Saved to your Google account.")
      await refresh()
    } catch {
      setNote("Saved on this device. The account save failed.")
    } finally {
      setBusy(false)
    }
  }

  async function openGroup(id: string) {
    setBusy(true)
    setNote("")
    try {
      const row = await loadCraftGroup({ data: { id } })
      if (!row) {
        setNote("That save is gone.")
        await refresh()
        return
      }
      applyDesk(row.desk, { id: row.id, name: row.name })
    } catch {
      setNote("Could not open that save.")
    } finally {
      setBusy(false)
    }
  }

  async function removeGroup(id: string) {
    setBusy(true)
    try {
      await deleteCraftGroup({ data: { id } })
      await refresh()
    } catch {
      setNote("Could not delete that save.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Recent crafts</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Each craft you add is listed here. Unsaved searches drop off after 10. Save one to keep it.
        </p>
        {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold tracking-wide text-brass uppercase">Saved</h3>
        {user && groups.length ? (
          <ul className="mt-3 flex flex-col">
            {groups.map((group) => (
              <li key={group.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <div>
                  <p className="text-parchment">{group.name}</p>
                  <p className="text-xs text-muted">
                    {group.summary} · {when(group.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void openGroup(group.id)} className="h-11 rounded-lg border border-line px-3 text-sm">
                    Open
                  </button>
                  <button type="button" disabled={busy} onClick={() => void removeGroup(group.id)} className="h-11 rounded-lg border border-ember px-3 text-sm text-ember">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : pinned.length ? (
          <ul className="mt-3 flex flex-col">
            {pinned.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <div>
                  <p className="text-parchment">{titleOf(row)}</p>
                  <p className="text-xs text-muted">
                    {row.city} · {when(row.at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openRecent(row.id)} className="h-11 rounded-lg border border-line px-3 text-sm">
                    Open
                  </button>
                  <button type="button" onClick={() => dropRecent(row.id)} className="h-11 rounded-lg border border-ember px-3 text-sm text-ember">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing saved yet.</p>
        )}
        <SignedIn>
          <p className="mt-3 text-xs text-muted">Saved crafts stay on this Google account.</p>
        </SignedIn>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold tracking-wide text-brass uppercase">Last 10</h3>
        {loose.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Add a craft and it shows up here.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {loose.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <div>
                  <p className="text-parchment">{titleOf(row)}</p>
                  <p className="text-xs text-muted">
                    {row.city} · {when(row.at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openRecent(row.id)} className="h-11 rounded-lg border border-line px-3 text-sm">
                    Open
                  </button>
                  <button type="button" disabled={busy} onClick={() => void pin(row)} className="h-11 rounded-lg bg-brass px-3 text-sm font-semibold text-ink">
                    Save
                  </button>
                  <button type="button" onClick={() => dropRecent(row.id)} className="h-11 rounded-lg border border-line px-3 text-sm">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
