export const SERVERS = [
  { id: "asia", label: "Asia" },
  { id: "europe", label: "Europe" },
  { id: "americas", label: "Americas" },
] as const

export type ServerId = (typeof SERVERS)[number]["id"]

export const CRAFT_CITIES = [
  "Thetford",
  "Lymhurst",
  "Bridgewatch",
  "Martlock",
  "Fort Sterling",
  "Caerleon",
  "Brecilien",
] as const

export const MARKETS = [...CRAFT_CITIES, "Black Market"] as const

/** Royal city base production bonus, crafting and refining. */
export const CITY_BASE = 18
/** Flat production bonus added when focus is spent. */
export const FOCUS_BONUS = 59
/** Refining specialty in the matching royal city. */
export const REFINE_SPEC = 40
/** Black-zone hideout refining base, before power cores. Roads are 10. */
export const HIDEOUT_REFINE_BASE = 15
export const HIDEOUT_REFINE_ROADS = 10

/** Hideout general production bonus by power level (1–9). No city base. */
export const HIDEOUT_CRAFT: Record<number, number> = {
  1: 0,
  2: 6,
  3: 11,
  4: 15,
  5: 18,
  6: 20,
  7: 22,
  8: 24,
  9: 26,
}

/**
 * Specialty crafting base by map quality, at hideout level 1.
 * Q1–Q6: 1, 6, 11, 16, 21, 26. Roads use quality 1.
 */
export const HO_QUALITY_BASE: Record<number, number> = {
  1: 1,
  2: 6,
  3: 11,
  4: 16,
  5: 21,
  6: 26,
}

/** Extra specialty from each hideout level above 1. Level 9 adds 30. */
export const HO_SPEC_STEP = 3.75

export const HO_BIOMES = [
  {
    id: "forest",
    label: "Lymhurst",
    city: "Lymhurst",
    kind: "hideout",
    refine: "fiber",
    crafts: ["sword", "bow", "arcanestaff", "leather_helmet", "leather_shoes"],
    favors: "Fiber, swords, bows, arcane staffs, leather hoods, leather shoes",
  },
  {
    id: "swamp",
    label: "Thetford",
    city: "Thetford",
    kind: "hideout",
    refine: "ore",
    crafts: ["mace", "naturestaff", "firestaff", "leather_armor", "cloth_helmet"],
    favors: "Ore, maces, fire staffs, nature staffs, leather armor, cloth cowls",
  },
  {
    id: "highland",
    label: "Martlock",
    city: "Martlock",
    kind: "hideout",
    refine: "hide",
    crafts: ["axe", "quarterstaff", "froststaff", "plate_shoes", "offhand"],
    favors: "Hide, axes, quarterstaffs, frost staffs, plate boots, off-hands",
  },
  {
    id: "steppe",
    label: "Bridgewatch",
    city: "Bridgewatch",
    kind: "hideout",
    refine: "rock",
    crafts: ["crossbow", "dagger", "cursestaff", "plate_armor", "cloth_shoes"],
    favors: "Stone, crossbows, daggers, cursed staffs, plate armor, cloth sandals",
  },
  {
    id: "mountain",
    label: "Fort Sterling",
    city: "Fort Sterling",
    kind: "hideout",
    refine: "wood",
    crafts: ["hammer", "spear", "holystaff", "plate_helmet", "cloth_armor"],
    favors: "Wood, hammers, spears, holy staffs, plate helmets, cloth robes",
  },
  {
    id: "caerleon",
    label: "Caerleon",
    city: "Caerleon",
    kind: "city",
    refine: "",
    crafts: ["food", "tools", "gatherergear", "knuckles", "shapeshifterstaff"],
    favors: "Food, tools, gathering gear, war gloves, shapeshifter staffs",
  },
  {
    id: "brecilien",
    label: "Brecilien",
    city: "Brecilien",
    kind: "city",
    refine: "",
    crafts: ["bag", "cape", "potion"],
    favors: "Bags, capes, potions",
  },
] as const

export type HoBiome = (typeof HO_BIOMES)[number]["id"]
export type HoRegion = "outlands" | "roads"

export function clampStep(value: number, min: number, max: number, fallback: number): number {
  const rounded = Math.round(Number(value))
  if (!Number.isFinite(rounded)) return fallback
  return Math.min(max, Math.max(min, rounded))
}

export function biomeById(id: string | undefined) {
  return HO_BIOMES.find((biome) => biome.id === id) ?? HO_BIOMES[0]
}

export function biomeFavors(biomeId: string | undefined, category: string): boolean {
  const biome = biomeById(biomeId)
  if ((REFINE_CATEGORIES as readonly string[]).includes(category)) return biome.refine === category
  return (biome.crafts as readonly string[]).includes(category)
}

/** Specialty points added by hideout level alone: 0 at level 1, 30 at level 9. */
export function hideoutSpecPower(power: number): number {
  const level = clampStep(power, 1, 9, 1)
  return ((level - 1) * 15) / 4
}

export const REFINE_CATEGORIES = ["ore", "wood", "hide", "fiber", "rock"] as const

const REFINE_CITY: Record<string, string> = {
  ore: "Thetford",
  wood: "Fort Sterling",
  fiber: "Lymhurst",
  hide: "Martlock",
  rock: "Bridgewatch",
}

/** Crafting specialty percentage points. Off-hands and potions differ by city. */
const CRAFT: Record<string, Record<string, number>> = {
  Bridgewatch: {
    crossbow: 15,
    dagger: 15,
    cursestaff: 15,
    plate_armor: 15,
    cloth_shoes: 15,
    offhand: 10,
    potion: 10,
  },
  Caerleon: {
    offhand: 10,
    potion: 10,
    gatherergear: 15,
    tools: 15,
    food: 15,
    knuckles: 15,
    shapeshifterstaff: 15,
  },
  "Fort Sterling": {
    offhand: 10,
    potion: 10,
    hammer: 15,
    spear: 15,
    holystaff: 15,
    plate_helmet: 15,
    cloth_armor: 15,
  },
  Lymhurst: {
    offhand: 10,
    potion: 10,
    sword: 15,
    bow: 15,
    arcanestaff: 15,
    leather_helmet: 15,
    leather_shoes: 15,
  },
  Martlock: {
    offhand: 25,
    potion: 10,
    axe: 15,
    quarterstaff: 15,
    froststaff: 15,
    plate_shoes: 15,
  },
  Thetford: {
    offhand: 10,
    potion: 10,
    mace: 15,
    naturestaff: 15,
    firestaff: 15,
    leather_armor: 15,
    cloth_helmet: 15,
  },
  Brecilien: {
    offhand: 10,
    potion: 25,
    cape: 15,
    bag: 15,
  },
}

export const CITY_BLURB: Record<string, { refine: string; crafts: string }> = {
  Thetford: {
    refine: "Ore → metal bars +40%",
    crafts: "Maces, fire staffs, nature staffs, leather armor, cloth cowls",
  },
  Lymhurst: {
    refine: "Fiber → cloth +40%",
    crafts: "Swords, bows, arcane staffs, leather hoods, leather shoes",
  },
  Bridgewatch: {
    refine: "Stone → blocks +40%",
    crafts: "Crossbows, daggers, cursed staffs, plate armor, cloth sandals",
  },
  Martlock: {
    refine: "Hide → leather +40%",
    crafts: "Axes, quarterstaffs, frost staffs, plate boots, off-hands +25%",
  },
  "Fort Sterling": {
    refine: "Wood → planks +40%",
    crafts: "Hammers, spears, holy staffs, plate helmets, cloth robes",
  },
  Caerleon: {
    refine: "No refining specialty",
    crafts: "Food +15%, tools, gathering gear, war gloves, shapeshifter staffs",
  },
  Brecilien: {
    refine: "No refining specialty",
    crafts: "Bags +15%, capes +15%, potions +25%",
  },
}

export function specialtyBonus(city: string, category: string): number {
  if ((REFINE_CATEGORIES as readonly string[]).includes(category)) {
    return REFINE_CITY[category] === city ? REFINE_SPEC : 0
  }
  return CRAFT[city]?.[category] ?? 0
}

export const GROUP_LABEL: Record<string, string> = {
  refine: "Refining",
  weapon: "Weapons",
  armor: "Armor",
  offhand: "Off-hands",
  accessory: "Bags & capes",
  tool: "Tools",
  gather: "Gathering gear",
  food: "Food",
  potion: "Potions",
  mount: "Mounts",
}

export const FORGE_STATIONS = ["Warrior's Forge", "Hunter's Lodge", "Mage's Tower"] as const

export const WEAPON_LINE: Record<string, { label: string; station: (typeof FORGE_STATIONS)[number] }> = {
  sword: { label: "Swords", station: "Warrior's Forge" },
  axe: { label: "Axes", station: "Warrior's Forge" },
  mace: { label: "Maces", station: "Warrior's Forge" },
  hammer: { label: "Hammers", station: "Warrior's Forge" },
  crossbow: { label: "Crossbows", station: "Warrior's Forge" },
  knuckles: { label: "War Gloves", station: "Warrior's Forge" },
  bow: { label: "Bows", station: "Hunter's Lodge" },
  dagger: { label: "Daggers", station: "Hunter's Lodge" },
  spear: { label: "Spears", station: "Hunter's Lodge" },
  quarterstaff: { label: "Quarterstaffs", station: "Hunter's Lodge" },
  naturestaff: { label: "Nature Staffs", station: "Hunter's Lodge" },
  shapeshifterstaff: { label: "Shapeshifter Staffs", station: "Hunter's Lodge" },
  firestaff: { label: "Fire Staffs", station: "Mage's Tower" },
  froststaff: { label: "Frost Staffs", station: "Mage's Tower" },
  arcanestaff: { label: "Arcane Staffs", station: "Mage's Tower" },
  cursestaff: { label: "Cursed Staffs", station: "Mage's Tower" },
  holystaff: { label: "Holy Staffs", station: "Mage's Tower" },
}

export const ARMOR_LINE: Record<string, { label: string; station: (typeof FORGE_STATIONS)[number] }> = {
  plate_helmet: { label: "Plate Helmets", station: "Warrior's Forge" },
  plate_armor: { label: "Plate Armor", station: "Warrior's Forge" },
  plate_shoes: { label: "Plate Boots", station: "Warrior's Forge" },
  leather_helmet: { label: "Leather Helmets", station: "Hunter's Lodge" },
  leather_armor: { label: "Leather Armor", station: "Hunter's Lodge" },
  leather_shoes: { label: "Leather Boots", station: "Hunter's Lodge" },
  cloth_helmet: { label: "Cloth Helmets", station: "Mage's Tower" },
  cloth_armor: { label: "Cloth Armor", station: "Mage's Tower" },
  cloth_shoes: { label: "Cloth Boots", station: "Mage's Tower" },
}

export const OFFHAND_LINE: Record<string, { label: string }> = {
  shield: { label: "Shields" },
  torch: { label: "Torches" },
  tome: { label: "Tomes" },
}

export const TOOL_LINE: Record<string, { label: string }> = {
  axe: { label: "Axes" },
  pick: { label: "Pickaxes" },
  sickle: { label: "Sickles" },
  knife: { label: "Skinning Knives" },
  hammer: { label: "Stone Hammers" },
  fishingrod: { label: "Fishing Rods" },
  siegehammer: { label: "Siege Hammers" },
}

export const MOUNT_LINE: Record<string, { label: string }> = {
  horse: { label: "Riding Horses" },
  armored: { label: "Armored Horses" },
  ox: { label: "Transport Oxen" },
  rare: { label: "Rare mounts" },
  faction: { label: "Faction mounts" },
  battle: { label: "Battle mounts" },
}

export const GATHER_LINE: Record<string, { label: string }> = {
  fiber: { label: "Harvester" },
  wood: { label: "Lumberjack" },
  ore: { label: "Miner" },
  hide: { label: "Skinner" },
  rock: { label: "Quarrier" },
  fish: { label: "Fisherman" },
}

const OFFHAND_STEM: Record<string, string> = {
  OFF_SHIELD: "shield",
  OFF_SHIELD_AVALON: "shield",
  OFF_SHIELD_CRYSTAL: "shield",
  OFF_SHIELD_HELL: "shield",
  OFF_SPIKEDSHIELD_MORGANA: "shield",
  OFF_TOWERSHIELD_UNDEAD: "shield",
  OFF_TORCH: "torch",
  OFF_TORCH_CRYSTAL: "torch",
  OFF_LAMP_UNDEAD: "torch",
  OFF_CENSER_AVALON: "torch",
  OFF_HORN_KEEPER: "torch",
  OFF_JESTERCANE_HELL: "torch",
  OFF_TALISMAN_AVALON: "torch",
  OFF_BOOK: "tome",
  OFF_ORB_MORGANA: "tome",
  OFF_DEMONSKULL_HELL: "tome",
  OFF_TOTEM_KEEPER: "tome",
  OFF_TOME_CRYSTAL: "tome",
}

function itemStem(id: string): string {
  return id.split("@")[0].replace(/^T\d+_/, "")
}

export function gearLine(item: { id?: string; group: string; category: string }): string | null {
  if (item.group === "weapon") return WEAPON_LINE[item.category] ? item.category : null
  if (item.group === "armor") return ARMOR_LINE[item.category] ? item.category : null
  if (item.group === "mount") return MOUNT_LINE[item.category] ? item.category : null
  if (!item.id) return null
  if (item.group === "offhand") return OFFHAND_STEM[itemStem(item.id)] ?? null
  if (item.group === "gather") {
    const kind = item.id.match(/GATHERER_([A-Z]+)/)?.[1].toLowerCase()
    return kind && GATHER_LINE[kind] ? kind : null
  }
  if (item.group === "tool") {
    const kind = item.id.match(/_TOOL_([A-Z]+)/)?.[1].toLowerCase()
    return kind && TOOL_LINE[kind] ? kind : null
  }
  return null
}

export function gearLineLabel(item: { id?: string; group: string; category: string }): string | null {
  const id = gearLine(item)
  if (!id) return null
  return (
    WEAPON_LINE[id]?.label ??
    ARMOR_LINE[id]?.label ??
    OFFHAND_LINE[id]?.label ??
    TOOL_LINE[id]?.label ??
    GATHER_LINE[id]?.label ??
    MOUNT_LINE[id]?.label ??
    null
  )
}

export const SETUP_FEE = 0.025
export const TAX_PREMIUM = 0.04
export const TAX_STANDARD = 0.08
export const NUTRITION_FACTOR = 0.1125
export const REPAIR_SILVER = 16.5
export const STUDY_FACTOR = 2.75
export const STUDY_FOCUS = 1.59
export const PREMIUM_FAME = 1.5
export const FREE_CRAFT_TIER = 2
