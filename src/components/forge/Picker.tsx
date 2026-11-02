import { useMemo, useState } from "react"
import { ARMOR_LINE, FORGE_STATIONS, GROUP_LABEL, WEAPON_LINE, gearLineLabel } from "@/lib/forge/rules"
import { searchItems } from "@/lib/forge/lookup"
import { fieldClass } from "./fields"

const GROUPS = ["all", "refine", "weapon", "armor", "offhand", "accessory", "tool", "gather", "food", "potion"]

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
  const gear = group === "weapon" || group === "armor"
  const lines = useMemo(() => {
    if (group === "weapon") {
      return Object.entries(WEAPON_LINE)
        .filter(([, entry]) => !station || entry.station === station)
        .map(([id, entry]) => ({ id, label: entry.label }))
    }
    if (group === "armor") {
      return Object.entries(ARMOR_LINE)
        .filter(([, entry]) => !station || entry.station === station)
        .map(([id, entry]) => ({ id, label: entry.label }))
    }
    return []
  }, [group, station])
  const hits = useMemo(
    () => searchItems(query, group, gear ? { station, line } : undefined),
    [query, group, gear, station, line],
  )

  function pickGroup(id: string) {
    setGroup(id)
    setStation("")
    setLine("")
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
      {gear ? (
        <>
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip on={line === ""} onClick={() => setLine("")}>
              {group === "armor" ? "All armor" : "All weapons"}
            </Chip>
            {lines.map((entry) => (
              <Chip key={entry.id} on={line === entry.id} onClick={() => setLine(line === entry.id ? "" : entry.id)}>
                {entry.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
      {hits.length === 0 ? (
        <p className="text-sm text-muted">
          {gear && !query.trim() && !station && !line
            ? group === "armor"
              ? "Pick Plate, Leather, or Cloth. Or a station: Warrior's Forge, Hunter's Lodge, Mage's Tower."
              : "Pick a weapon line, such as Swords or Bows. Or a station: Warrior's Forge, Hunter's Lodge, Mage's Tower."
            : query.trim() || group !== "all"
              ? "No recipes match."
              : "Type a name, or pick a category."}
        </p>
      ) : (
        <ul className={compact ? "flex flex-col" : "flex max-h-80 flex-col overflow-auto rounded-lg border border-line"}>
          {hits.map((item) => (
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
      )}
    </div>
  )
}