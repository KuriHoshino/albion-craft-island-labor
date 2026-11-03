export type LaborJob = {
  id: string
  name: string
  family: "Gathering" | "Crafting" | "Mercenary"
  returns: string
  fame: Record<number, number>
  loot: Record<number, number>
}

const GATHER_FAME: Record<number, number> = { 2: 450, 3: 900, 4: 1800, 5: 3600, 6: 7200, 7: 14400, 8: 28800 }
const GATHER_LOOT: Record<number, number> = { 2: 38, 3: 60, 4: 48, 5: 32, 6: 32, 7: 38.4, 8: 38.4 }
const CRAFT_FAME: Record<number, number> = { 2: 900, 3: 1800, 4: 3600, 5: 7200, 6: 14400, 7: 28380, 8: 58590 }
const CRAFT_LOOT: Record<number, number> = { 2: 38, 3: 24, 4: 16, 5: 8, 6: 5.3333, 7: 4.4, 8: 4.2 }
const FISH_FAME: Record<number, number> = { 2: 720, 3: 1360, 4: 2223, 5: 3680, 6: 4880, 7: 6640, 8: 8320 }
const FISH_LOOT: Record<number, number> = { 2: 10.6, 3: 9.976, 4: 13.9112, 5: 17.0301, 6: 20.0528, 7: 22.3876, 8: 25.119 }
const MERC_FAME: Record<number, number> = { 2: 1412, 3: 2171, 4: 3264, 5: 4368, 6: 5856, 7: 7968, 8: 10800 }
const MERC_SILVER: Record<number, number> = { 2: 371, 3: 660, 4: 1123, 5: 1746, 6: 2690, 7: 4202, 8: 6584 }

export const LABOR_JOBS: LaborJob[] = [
  { id: "wood", name: "Lumberjack", family: "Gathering", returns: "wood", fame: GATHER_FAME, loot: GATHER_LOOT },
  { id: "ore", name: "Prospector", family: "Gathering", returns: "ore", fame: GATHER_FAME, loot: GATHER_LOOT },
  { id: "stone", name: "Stonecutter", family: "Gathering", returns: "stone", fame: GATHER_FAME, loot: GATHER_LOOT },
  { id: "hide", name: "Gamekeeper", family: "Gathering", returns: "hide", fame: GATHER_FAME, loot: GATHER_LOOT },
  { id: "fiber", name: "Cropper", family: "Gathering", returns: "fiber", fame: GATHER_FAME, loot: GATHER_LOOT },
  { id: "fish", name: "Fisherman", family: "Gathering", returns: "fish", fame: FISH_FAME, loot: FISH_LOOT },
  { id: "warrior", name: "Blacksmith", family: "Crafting", returns: "warrior materials", fame: CRAFT_FAME, loot: CRAFT_LOOT },
  { id: "mage", name: "Imbuer", family: "Crafting", returns: "mage materials", fame: CRAFT_FAME, loot: CRAFT_LOOT },
  { id: "hunter", name: "Fletcher", family: "Crafting", returns: "hunter materials", fame: CRAFT_FAME, loot: CRAFT_LOOT },
  { id: "tool", name: "Tinker", family: "Crafting", returns: "tool materials", fame: CRAFT_FAME, loot: CRAFT_LOOT },
  { id: "mercenary", name: "Mercenary", family: "Mercenary", returns: "silver", fame: MERC_FAME, loot: MERC_SILVER },
]

/** Building plots are cumulative. The guild hall uses one of them. Small plots can hold a house. */
export const GUILD_ISLANDS = [
  { tier: 1, building: 4, small: 0 },
  { tier: 2, building: 7, small: 2 },
  { tier: 3, building: 10, small: 2 },
  { tier: 4, building: 13, small: 2 },
  { tier: 5, building: 16, small: 2 },
  { tier: 6, building: 20, small: 2 },
]

export function guildHousePlots(tier: number) {
  const island = GUILD_ISLANDS.find((entry) => entry.tier === tier) ?? GUILD_ISLANDS[5]
  return { ...island, houses: island.building - 1 + island.small }
}
export const ISLANDS = [
  { tier: 1, plots: 1, large: 1, small: 0 },
  { tier: 2, plots: 5, large: 3, small: 2 },
  { tier: 3, plots: 8, large: 6, small: 2 },
  { tier: 4, plots: 11, large: 9, small: 2 },
  { tier: 5, plots: 14, large: 12, small: 2 },
  { tier: 6, plots: 18, large: 16, small: 2 },
]

export function houseSlots(tier: number) {
  if (tier <= 2) return 1
  if (tier <= 4) return 2
  return 3
}

export function guildSlots(tier: number) {
  if (tier <= 2) return 7
  if (tier <= 4) return 10
  return 15
}

export const ENCHANT = [
  { label: ".0", weight: 1889 },
  { label: ".1", weight: 100 },
  { label: ".2", weight: 10 },
  { label: ".3", weight: 1 },
]

/** Bed and table of the laborer tier are 100%. Trophy happiness stacks on that, and only 100 points count. */
export function yieldRate(laborTier: number, trophy: number) {
  const tier = Math.min(8, Math.max(2, Math.floor(laborTier) || 2))
  const bonus = Math.min(100, Math.max(0, trophy))
  return Math.min(1.5, (tier * 100 + bonus) / (tier * 100))
}

export function scoreHouses(
  job: LaborJob,
  counts: Record<number, number>,
  journals: Record<number, number>,
  happy: Record<number, number>,
) {
  const rows = []
  for (let tier = 8; tier >= 2; tier -= 1) {
    const houses = Math.max(0, Math.floor(counts[tier] ?? 0))
    if (!houses) continue
    const labor = Math.min(tier, Math.max(2, Math.floor(journals[tier] ?? tier)))
    const rate = yieldRate(labor, happy[tier] ?? 0)
    const people = houses * houseSlots(tier)
    const base = job.loot[labor]
    rows.push({
      tier,
      houses,
      labor,
      people,
      journals: people,
      rate,
      base,
      amount: base * rate * people,
    })
  }
  return {
    rows,
    houses: rows.reduce((sum, row) => sum + row.houses, 0),
    people: rows.reduce((sum, row) => sum + row.people, 0),
    journals: rows.reduce((sum, row) => sum + row.journals, 0),
    amount: rows.reduce((sum, row) => sum + row.amount, 0),
  }
}

const BLOCKS = ["", "", "Limestone", "Sandstone", "Travertine", "Granite", "Slate", "Basalt", "Marble"]

/** Cost to build or upgrade into this tier. There is no T1 house or guild hall. */
export function upgradeStep(kind: "house" | "hall", tier: number) {
  const level = Math.max(2, Math.min(8, Math.floor(tier)))
  const scale = kind === "hall" ? 5 : 1
  const power = 2 ** (level - 2)
  return {
    tier: level,
    wood: 30 * scale * power,
    stone: 3 * scale * power,
    blocks: 180 * scale,
    block: BLOCKS[level],
  }
}

export function upgradePath(kind: "house" | "hall", from: number, to: number) {
  const start = Math.max(2, Math.floor(from) + 1)
  const end = Math.max(start, Math.min(8, Math.floor(to)))
  const steps = []
  for (let tier = start; tier <= end; tier += 1) steps.push(upgradeStep(kind, tier))
  return {
    steps,
    wood: steps.reduce((sum, step) => sum + step.wood, 0),
    stone: steps.reduce((sum, step) => sum + step.stone, 0),
    blocks: steps.reduce((sum, step) => sum + step.blocks, 0),
  }
}
