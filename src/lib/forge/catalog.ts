import journalsData from "./data/journals.json"
import accessory_json from "./data/accessory.json"
import armor_cloth_json from "./data/armor-cloth.json"
import armor_leather_json from "./data/armor-leather.json"
import armor_plate_json from "./data/armor-plate.json"
import food_json from "./data/food.json"
import gather_json from "./data/gather.json"
import offhand_json from "./data/offhand.json"
import mount_json from "./data/mount.json"
import potion_json from "./data/potion.json"
import refine_json from "./data/refine.json"
import tool_json from "./data/tool.json"
import weapon_arcanestaff_json from "./data/weapon-arcanestaff.json"
import weapon_axe_json from "./data/weapon-axe.json"
import weapon_bow_json from "./data/weapon-bow.json"
import weapon_crossbow_json from "./data/weapon-crossbow.json"
import weapon_cursestaff_json from "./data/weapon-cursestaff.json"
import weapon_dagger_json from "./data/weapon-dagger.json"
import weapon_firestaff_json from "./data/weapon-firestaff.json"
import weapon_froststaff_json from "./data/weapon-froststaff.json"
import weapon_hammer_json from "./data/weapon-hammer.json"
import weapon_holystaff_json from "./data/weapon-holystaff.json"
import weapon_knuckles_json from "./data/weapon-knuckles.json"
import weapon_mace_json from "./data/weapon-mace.json"
import weapon_naturestaff_json from "./data/weapon-naturestaff.json"
import weapon_quarterstaff_json from "./data/weapon-quarterstaff.json"
import weapon_shapeshifterstaff_json from "./data/weapon-shapeshifterstaff.json"
import weapon_spear_json from "./data/weapon-spear.json"
import weapon_sword_json from "./data/weapon-sword.json"
import materials_1_json from "./data/materials-1.json"
import materials_2_json from "./data/materials-2.json"
import materials_3_json from "./data/materials-3.json"
import materials_4_json from "./data/materials-4.json"
import materials_5_json from "./data/materials-5.json"
import materials_mounts_json from "./data/materials-mounts.json"

export type MatUse = { id: string; qty: number; ret: boolean }
export type Variant = {
  enchant: number
  route: "direct" | "upgrade"
  focus: number
  output: number
  silver: number
  value: number
  fame: number
  mats: MatUse[]
}
export type CraftItem = {
  id: string
  name: string
  tier: number
  category: string
  group: string
  station: string
  study: boolean
  weight: number
  journal: string | null
  variants: Variant[]
}
export type MatInfo = { name: string; weight: number }
export type JournalInfo = { id: string; tier: number; kind: string; fame: number; name: string }

export let items: CraftItem[] = [
  ...(accessory_json as CraftItem[]),
  ...(armor_cloth_json as CraftItem[]),
  ...(armor_leather_json as CraftItem[]),
  ...(armor_plate_json as CraftItem[]),
  ...(food_json as CraftItem[]),
  ...(gather_json as CraftItem[]),
  ...(offhand_json as CraftItem[]),
  ...(mount_json as CraftItem[]),
  ...(potion_json as CraftItem[]),
  ...(refine_json as CraftItem[]),
  ...(tool_json as CraftItem[]),
  ...(weapon_arcanestaff_json as CraftItem[]),
  ...(weapon_axe_json as CraftItem[]),
  ...(weapon_bow_json as CraftItem[]),
  ...(weapon_crossbow_json as CraftItem[]),
  ...(weapon_cursestaff_json as CraftItem[]),
  ...(weapon_dagger_json as CraftItem[]),
  ...(weapon_firestaff_json as CraftItem[]),
  ...(weapon_froststaff_json as CraftItem[]),
  ...(weapon_hammer_json as CraftItem[]),
  ...(weapon_holystaff_json as CraftItem[]),
  ...(weapon_knuckles_json as CraftItem[]),
  ...(weapon_mace_json as CraftItem[]),
  ...(weapon_naturestaff_json as CraftItem[]),
  ...(weapon_quarterstaff_json as CraftItem[]),
  ...(weapon_shapeshifterstaff_json as CraftItem[]),
  ...(weapon_spear_json as CraftItem[]),
  ...(weapon_sword_json as CraftItem[]),
]

export let materials: Record<string, MatInfo> = {
  ...materials_1_json,
  ...materials_2_json,
  ...materials_3_json,
  ...materials_4_json,
  ...materials_5_json,
  ...materials_mounts_json,
}

export let journals = journalsData as JournalInfo[]

const catalogListeners = new Set<() => void>()

export function onCatalogChange(listener: () => void) {
  catalogListeners.add(listener)
  return () => {
    catalogListeners.delete(listener)
  }
}

export function installCatalog(next: {
  items: CraftItem[]
  materials: Record<string, MatInfo>
  journals: JournalInfo[]
}) {
  items = next.items
  materials = next.materials
  journals = next.journals
  for (const listener of catalogListeners) listener()
}
