import { items, journals, materials, onCatalogChange, type CraftItem, type Variant } from "./catalog"
import { gearLine } from "./rules"

function indexItems(list: CraftItem[]) {
  const map = new Map<string, CraftItem>()
  for (const item of list) map.set(item.id, item)
  return map
}

let byId = indexItems(items)
let nameBook: Record<string, string> = {}
onCatalogChange(() => {
  byId = indexItems(items)
})

export function setNameBook(next: Record<string, string> | undefined) {
  nameBook = next ?? {}
}

function named(id: string, fallback: string) {
  const custom = nameBook[id]?.trim()
  return custom || fallback
}

export function getItem(id: string): CraftItem | undefined {
  const item = byId.get(id)
  if (!item) return undefined
  const name = named(item.id, item.name)
  return name === item.name ? item : { ...item, name }
}

function isEnchantStone(id: string) {
  return id.includes("RUNE") || id.includes("SOUL") || id.includes("RELIC")
}

/** Upgrade .3 needs the runes, souls, and relics from .1 through .3, plus the flat item. */
export function variantOf(item: CraftItem, enchant: number, route: Variant["route"]): Variant {
  const found =
    item.variants.find((v) => v.enchant === enchant && v.route === route) ??
    item.variants.find((v) => v.enchant === enchant) ??
    item.variants[0]
  if (found.route !== "upgrade" || found.enchant < 1) return found
  const mats: Variant["mats"] = []
  const seen = new Set<string>()
  for (let level = 1; level <= found.enchant; level += 1) {
    const step = item.variants.find((v) => v.enchant === level && v.route === "upgrade")
    if (!step) continue
    for (const mat of step.mats) {
      const stone = isEnchantStone(mat.id)
      if (level !== 1 && !stone) continue
      if (seen.has(mat.id)) continue
      mats.push(mat)
      seen.add(mat.id)
    }
  }
  return mats.length ? { ...found, mats } : found
}

export function enchantsOf(item: CraftItem): number[] {
  return [...new Set(item.variants.map((v) => v.enchant))].sort((a, b) => a - b)
}

export function marketId(itemId: string, enchant: number): string {
  const base = itemId.split("#")[0]
  return enchant > 0 ? `${base}@${enchant}` : base
}

export function matName(id: string): string {
  return named(id, materials[id]?.name ?? id)
}

export function matWeight(id: string): number {
  return materials[id]?.weight ?? 0
}

export function journalFor(kind: string | null, tier: number) {
  if (!kind) return undefined
  return journals.find((j) => j.kind === kind && j.tier === tier)
}

export function journalTiers(kind: string | null) {
  if (!kind) return []
  return journals.filter((j) => j.kind === kind).sort((a, b) => a.tier - b.tier)
}

export function searchItems(
  query: string,
  group: string,
  filter?: { station?: string; line?: string; tier?: number },
): CraftItem[] {
  const q = query.trim().toLowerCase()
  let list = items
  if (group !== "all") list = list.filter((item) => item.group === group)
  if (filter?.station) list = list.filter((item) => item.station === filter.station)
  if (filter?.line) list = list.filter((item) => gearLine(item) === filter.line)
  if (filter?.tier) list = list.filter((item) => item.tier === filter.tier)
  const narrowed = Boolean(filter?.station || filter?.line || filter?.tier)
  const needsLine = (group === "weapon" || group === "armor" || group === "offhand" || group === "tool" || group === "gather" || group === "mount" || group === "refine") && !narrowed
  if (!q && (group === "all" || needsLine)) return []
  const hits: CraftItem[] = []
  for (const item of list) {
    const name = named(item.id, item.name)
    if (q && !name.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) continue
    hits.push(name === item.name ? item : { ...item, name })
    if (q && hits.length >= 200) break
  }
  return hits
}
