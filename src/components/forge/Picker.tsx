import { useMemo, useState } from "react"
import { ARMOR_LINE, FORGE_STATIONS, GATHER_LINE, GROUP_LABEL, OFFHAND_LINE, TOOL_LINE, WEAPON_LINE, gearLineLabel } from "@/lib/forge/rules"
import { searchItems } from "@/lib/forge/lookup"
import { fieldClass } from "./fields"

const GROUPS = ["all", "refine", "weapon", "armor", "offhand", "accessory", "tool", "gather", "food", "potion"]
const TIERS = [2, 3, 4, 5, 6, 7, 8]

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-11 shrink-0 rounded-full border px-3 text-sm " +
        (on ? "border-brass text-brass" : "border-line text-muted")
      }
    >
      {children}
    </button>
  )
}

export function ItemPicker({
  onPick,
  compact,
}: {
  onPick: (id: string) => void
  compact?: boolean
}) {
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState("all")
  const [station, setStation] = useState("")
  const [line, setLine] = useState("")
  const [tier, setTier] = useState(0)
  const forge = group === "weapon" || group === "armor"
  const split = forge || group === "offhand" || group === "tool" || group === "gather"
  const lines = useMemo(() => {
    const book =
      group === "weapon"
        ? WEAPON_LINE
        : group === "armor"
          ? ARMOR_LINE
          : group === "offhand"
            ? OFFHAND_LINE
            : group === "tool"
              ? TOOL_LINE
              : group === "gather"
                ? GATHER_LINE
                : null
    if (!book) return []
    return Object.entries(book)
      .filter(([, entry]) => !forge || !station || !("station" in entry) || entry.station === station)
      .map(([id, entry]) => ({ id, label: entry.label }))
  }, [group, station, forge])
  const hits = useMemo(
    () => searchItems(query, group, split ? { station: forge ? station : "", line, tier: tier || undefined } : undefined),
    [query, group, split, forge, station, line, tier],
  )
  const sections = useMemo(() => {
    const buckets = new Map<number, typeof hits>()
    for (const item of hits) {
      const rows = buckets.get(item.tier) ?? []
      rows.push(item)
      rows.sort((a, b) => a.name.localeCompare(b.name))
      buckets.set(item.tier, rows)
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0])
  }, [hits])

  function pickGroup(id: string) {
    setGroup(id)
    setStation("")
    setLine("")
    setTier(0)
  }

  function pickStation(id: string) {
    setStation(id)
    if (group === "weapon" && line && WEAPON_LINE[line]?.station !== id && id) setLine("")
    if (group === "armor" && line && ARMOR_LINE[line]?.station !== id && id) setLine("")
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className={fieldClass}
        value={query}
        placeholder="Search broadsword, steel bar, stew…"
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search recipes"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {GROUPS.map((id) => (
          <Chip key={id} on={group === id} onClick={() => pickGroup(id)}>
            {id === "all" ? "All" : GROUP_LABEL[id]}
          </Chip>
        ))}
      </div>
      {split ? (
        <>
          {forge ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip on={station === ""} onClick={() => pickStation("")}>
                All stations
              </Chip>
              {FORGE_STATIONS.map((id) => (
                <Chip key={id} on={station === id} onClick={() => pickStation(station === id ? "" : id)}>
                  {id}
                </Chip>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip on={line === ""} onClick={() => setLine("")}>
              {group === "armor"
                ? "All armor"
                : group === "offhand"
                  ? "All off-hands"
                  : group === "tool"
                    ? "All tools"
                    : group === "gather"
                      ? "All gathering gear"
                      : "All weapons"}
            </Chip>
            {lines.map((entry) => (
              <Chip key={entry.id} on={line === entry.id} onClick={() => setLine(line === entry.id ? "" : entry.id)}>
                {entry.label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip on={tier === 0} onClick={() => setTier(0)}>
              All tiers
            </Chip>
            {TIERS.map((id) => (
              <Chip key={id} on={tier === id} onClick={() => setTier(tier === id ? 0 : id)}>
                {`T${id}`}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
      {hits.length === 0 ? (
        <p className="text-sm text-muted">
          {split && !query.trim() && !station && !line && !tier
            ? group === "armor"
              ? "Pick a tier, or Plate, Leather, or Cloth."
              : group === "offhand"
                ? "Pick a tier, or Shields, Torches, or Tomes."
                : group === "tool"
                  ? "Pick a tier, or a tool such as Pickaxes or Sickles."
                  : group === "gather"
                    ? "Pick a tier, or a set such as Miner or Lumberjack."
                    : "Pick a tier, or a weapon line such as Swords or Bows."
            : query.trim() || group !== "all"
              ? "No recipes match."
              : "Type a name, or pick a category."}
        </p>
      ) : (
        <ul className={compact ? "flex flex-col" : "flex max-h-80 flex-col overflow-auto rounded-lg border border-line"}>
          {sections.map(([rank, rows]) => (
            <li key={rank}>
              {split && sections.length > 1 ? (
                <p className="border-b border-line bg-panel px-3 py-2 text-xs font-semibold tracking-wide text-brass uppercase">
                  Tier {rank}
                </p>
              ) : null}
              <ul>
                {rows.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onPick(item.id)}
                      className="flex w-full items-baseline justify-between gap-3 border-b border-line px-3 py-3 text-left last:border-b-0 hover:bg-panel-2"
                    >
                      <span className="text-parchment">
                        {item.name}
                        <span className="mt-0.5 block text-xs text-muted">
                          T{item.tier} · {item.station}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">{gearLineLabel(item) ?? GROUP_LABEL[item.group]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}