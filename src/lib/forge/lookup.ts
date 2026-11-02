import { items, journals, materials, type CraftItem, type Variant } from "./catalog"
import { gearLine } from "./rules"

const byId = new Map<string, CraftItem>()
for (const item of items) byId.set(item.id, item)

export function getItem(id: string): CraftItem | undefined {
  return byId.get(id)
}

export function variantOf(item: CraftItem, enchant: number, route: Variant["route"]): Variant {
  return (
    item.variants.find((v) => v.enchant === enchant && v.route === route) ??
    item.variants.find((v) => v.enchant === enchant) ??
    item.variants[0]
  )
}

export function enchantsOf(item: CraftItem): number[] {
  return [...new Set(item.variants.map((v) => v.enchant))].sort((a, b) => a - b)
}

export function marketId(itemId: string, enchant: number): string {
  const base = itemId.split("#")[0]
  return enchant > 0 ? `${base}@${enchant}` : base
}

export function matName(id: string): string {
  return materials[id]?.name ?? id
}

export function matWeight(id: string): number {
  return materials[id]?.weight ?? 0
}

export function journalFor(kind: string | null, tier: number) {
  if (!kind) return undefined
  return journals.find((j) => j.kind === kind && j.tier === tier)
}

export function searchItems(
  query: string,
  group: string,
  filter?: { station?: string; line?: string },
): CraftItem[] {
  const q = query.trim().toLowerCase()
  let list = items
  if (group !== "all") list = list.filter((item) => item.group === group)
  if (filter?.station) list = list.filter((item) => item.station === filter.station)
  if (filter?.line) list = list.filter((item) => gearLine(item) === filter.line)
  const needsLine = (group === "weapon" || group === "armor") && !filter?.station && !filter?.line
  if (!q && (group === "all" || needsLine)) return []
  const hits: CraftItem[] = []
  for (const item of list) {
    if (q && !item.name.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) continue
    hits.push(item)
    if (q && hits.length >= 200) break
  }
  return hits
}
