import {
  CITY_BASE,
  FOCUS_BONUS,
  FREE_CRAFT_TIER,
  HIDEOUT_CRAFT,
  HIDEOUT_REFINE_BASE,
  HIDEOUT_REFINE_ROADS,
  HO_QUALITY_BASE,
  NUTRITION_FACTOR,
  PREMIUM_FAME,
  REPAIR_SILVER,
  SETUP_FEE,
  STUDY_FACTOR,
  STUDY_FOCUS,
  TAX_PREMIUM,
  TAX_STANDARD,
  biomeById,
  biomeFavors,
  clampStep,
  hideoutSpecPower,
  specialtyBonus,
  type HoRegion,
} from "./rules"
import type { Variant } from "./catalog"

export type Place = "city" | "island" | "hideout"
export type SellMode = "order" | "instant" | "notax"
export type BuyMode = "instant" | "order"

export type BonusPart = { label: string; value: number }

export function productionBonus(opts: {
  place: Place
  city: string
  category: string
  focus: boolean
  daily: number
  power: number
  extra: number
  biome?: string
  mapQuality?: number
  region?: HoRegion
}): { total: number; parts: BonusPart[] } {
  const refine = ["ore", "wood", "hide", "fiber", "rock"].includes(opts.category)
  const parts: BonusPart[] = []
  if (opts.place === "city") parts.push({ label: "City base", value: CITY_BASE })
  if (opts.place === "island") parts.push({ label: "Island base", value: 0 })
  if (opts.place === "hideout") {
    const level = clampStep(opts.power, 1, 9, 1)
    const region: HoRegion = opts.region === "roads" ? "roads" : "outlands"
    const quality = region === "roads" ? 1 : clampStep(opts.mapQuality ?? 1, 1, 6, 1)
    const biome = biomeById(opts.biome)
    if (biome.kind === "city") {
      parts.push({ label: "City base", value: CITY_BASE })
      const spec = specialtyBonus(biome.city, opts.category)
      if (spec) parts.push({ label: `${biome.label} specialty`, value: spec })
    } else {
      const general = HIDEOUT_CRAFT[level] ?? 0
      const matched = biomeFavors(biome.id, opts.category)
      if (refine) {
        const base = region === "roads" ? HIDEOUT_REFINE_ROADS : HIDEOUT_REFINE_BASE
        parts.push({ label: region === "roads" ? "Roads refining" : "Outlands refining", value: base })
        parts.push({ label: `Hideout level ${level}`, value: general })
        if (matched) {
          const spec = hideoutSpecPower(level)
          if (spec) parts.push({ label: `${biome.label} specialty`, value: spec })
        }
      } else if (matched) {
        parts.push({ label: `${biome.label} Q${quality}`, value: HO_QUALITY_BASE[quality] ?? 0 })
        parts.push({ label: `Hideout level ${level}`, value: general })
        const spec = hideoutSpecPower(level)
        if (spec) parts.push({ label: `Level ${level} specialty`, value: spec })
      } else {
        parts.push({ label: `Hideout level ${level}`, value: general })
      }
    }
  }
  if (opts.place !== "hideout") {
    const spec = specialtyBonus(opts.city, opts.category)
    if (spec) parts.push({ label: `${opts.city} specialty`, value: spec })
  }
  if (opts.focus) parts.push({ label: "Focus", value: FOCUS_BONUS })
  if (opts.daily) parts.push({ label: "Daily bonus", value: opts.daily })
  if (opts.extra) parts.push({ label: "Extra bonus", value: opts.extra })
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  return { total, parts }
}

/** Resource return rate from a production bonus. bonus / (100 + bonus). */
export function returnRate(bonus: number): number {
  if (bonus <= 0) return 0
  return bonus / (100 + bonus)
}

/** Focus cost = base × 0.5 ^ (efficiency / 10000). */
export function focusFromSpecs(base: number, mastery: number, specialist: number, siblings: number) {
  const efficiency = Math.max(0, mastery) * 30 + Math.max(0, specialist) * 280 + Math.max(0, siblings) * 30
  const cost = base * Math.pow(0.5, efficiency / 10000)
  return { efficiency, cost }
}

export function nutrition(itemValue: number, itemsCrafted: number, tier: number): number {
  if (tier <= FREE_CRAFT_TIER) return 0
  return itemValue * NUTRITION_FACTOR * itemsCrafted
}

export function stationFee(itemValue: number, itemsCrafted: number, tier: number, ratePer100: number): number {
  return (nutrition(itemValue, itemsCrafted, tier) * ratePer100) / 100
}

function ceilShare(price: number, rate: number): number {
  if (price <= 0 || rate <= 0) return 0
  return Math.ceil(price * rate - 1e-9)
}

/** Fees on a whole stack, matching the market: ceil(rate × total silver), not per item. */
export function stackSell(unit: number, qty: number, mode: SellMode, premium: boolean) {
  const gross = unit * qty
  const taxRate = mode === "notax" ? 0 : premium ? TAX_PREMIUM : TAX_STANDARD
  const setupRate = mode === "order" ? SETUP_FEE : 0
  const tax = ceilShare(gross, taxRate)
  const setup = ceilShare(gross, setupRate)
  return { gross, tax, setup, net: gross - tax - setup }
}

export function stackBuy(unit: number, qty: number, mode: BuyMode) {
  const gross = unit * qty
  const setup = mode === "order" ? ceilShare(gross, SETUP_FEE) : 0
  return { cost: gross + setup, setup }
}

/**
 * Whole resources the game returns over `runs` crafts.
 * Floor, except when the value is within a rounding hair of the next integer.
 */
export function wholeReturn(value: number): number {
  if (value <= 0) return 0
  const nearest = Math.round(value)
  const slop = Number.EPSILON * Math.max(1, Math.abs(value)) * 8
  return Math.abs(value - nearest) <= slop ? nearest : Math.floor(value)
}

/**
 * What you actually buy, and the leftover stack you sell.
 * Returns from the earlier crafts are reused. The last craft's return is leftover.
 */
export function materialLots(runs: number, perCraft: number, rrr: number): { buy: number; leftover: number } {
  const n = Math.floor(Math.max(0, runs))
  const rate = Math.min(1, Math.max(0, rrr))
  if (n <= 0 || perCraft <= 0) return { buy: 0, leftover: 0 }
  const per = perCraft * rate
  const before = wholeReturn((n - 1) * per)
  const all = wholeReturn(n * per)
  return { buy: Math.ceil(perCraft * n - before), leftover: all - before }
}

export function sellNet(price: number, mode: SellMode, premium: boolean) {
  const taxRate = mode === "notax" ? 0 : premium ? TAX_PREMIUM : TAX_STANDARD
  const setupRate = mode === "order" ? SETUP_FEE : 0
  const tax = ceilShare(price, taxRate)
  const setup = ceilShare(price, setupRate)
  return { net: price - tax - setup, tax, setup }
}

export function buyCost(price: number, mode: BuyMode) {
  const setup = mode === "order" ? ceilShare(price, SETUP_FEE) : 0
  return { cost: price + setup, setup }
}

export function repairSilver(itemValue: number, missingFraction: number, serverMultiplier: number, count: number) {
  const fraction = Math.min(1, Math.max(0, missingFraction))
  const mult = serverMultiplier > 0 ? serverMultiplier : 1
  const each = Math.ceil(itemValue * fraction * REPAIR_SILVER * mult - 1e-9)
  const safeCount = Math.max(0, Math.round(count))
  return { each, total: each * safeCount }
}

export type MatQuote = { id: string; qty: number; ret: boolean; unit: number | null }

export type CraftMath = {
  bonus: number
  parts: BonusPart[]
  rrr: number
  focusEach: number
  focusTotal: number
  efficiency: number
  items: number
  fameEach: number
  fameTotal: number
  studyEach: number
  fee: number
  nutrition: number
  materialCost: number | null
  leftoverValue: number | null
  revenue: number | null
  journalProfit: number | null
  journals: number
  silverCost: number
  profit: number | null
  margin: number | null
  missing: string[]
  consumed: { id: string; qty: number; unit: number | null; cost: number | null }[]
  leftovers: { id: string; qty: number }[]
}

export function craftMath(opts: {
  variant: Variant
  tier: number
  category: string
  place: Place
  city: string
  focus: boolean
  daily: number
  power: number
  extra: number
  biome?: string
  mapQuality?: number
  region?: HoRegion
  runs: number
  mastery: number
  specialist: number
  siblings: number
  focusOverride: number | null
  premium: boolean
  buyMode: BuyMode
  sellMode: SellMode
  leftover: "reuse" | "sell"
  stationRate: number
  productUnit: number | null
  matUnit: (id: string) => number | null
  matSellUnit: (id: string) => number | null
  journalFame: number | null
  journalEmpty: number | null
  journalFull: number | null
  useJournal: boolean
}): CraftMath {
  const runs = Math.max(0, opts.runs)
  const { total, parts } = productionBonus(opts)
  const rrr = returnRate(total)
  const baseFocus = opts.focusOverride != null && opts.focusOverride >= 0 ? opts.focusOverride : opts.variant.focus
  const spec = focusFromSpecs(baseFocus, opts.mastery, opts.specialist, opts.siblings)
  const focusEach = opts.focus ? spec.cost : 0
  const items = (opts.variant.output || 1) * runs
  const fameEach = opts.variant.fame * (opts.premium ? PREMIUM_FAME : 1)
  const fameTotal = fameEach * items
  const dailyMult = opts.daily === 20 ? 1.2 : opts.daily === 10 ? 1.1 : 1
  const studyEach =
    opts.variant.fame * STUDY_FACTOR * dailyMult * (opts.focus ? STUDY_FOCUS : 1) * (opts.premium ? PREMIUM_FAME : 1)
  const fee = stationFee(opts.variant.value, items, opts.tier, opts.stationRate)
  const nut = nutrition(opts.variant.value, items, opts.tier)
  const missing: string[] = []
  let materialCost = 0
  let materialKnown = true
  let leftoverValue = 0
  let leftoverKnown = true
  const consumed: CraftMath["consumed"] = []
  const leftovers: CraftMath["leftovers"] = []

  for (const mat of opts.variant.mats) {
    const lots = mat.ret ? materialLots(runs, mat.qty, rrr) : { buy: mat.qty * Math.floor(Math.max(0, runs)), leftover: 0 }
    const sold = opts.leftover === "sell" && mat.ret ? wholeReturn(mat.qty * Math.floor(Math.max(0, runs)) * Math.min(1, Math.max(0, rrr))) : lots.leftover
    const bought = opts.leftover === "sell" && mat.ret ? mat.qty * Math.floor(Math.max(0, runs)) : lots.buy
    const unit = opts.matUnit(mat.id)
    if (unit == null) {
      materialKnown = false
      missing.push(mat.id)
    }
    const priced = unit == null ? null : stackBuy(unit, bought, opts.buyMode).cost
    if (priced != null) materialCost += priced
    consumed.push({ id: mat.id, qty: bought, unit, cost: priced })
    if (sold > 0) {
      leftovers.push({ id: mat.id, qty: sold })
      const sell = opts.matSellUnit(mat.id)
      if (sell == null) leftoverKnown = false
      else leftoverValue += stackSell(sell, sold, opts.sellMode, opts.premium).net
    }
  }

  const silverCost = (opts.variant.silver || 0) * runs
  let revenue: number | null = null
  if (opts.productUnit == null) {
    missing.push("product")
  } else {
    revenue = stackSell(opts.productUnit, items, opts.sellMode, opts.premium).net
  }

  let journalProfit: number | null = null
  let journals = 0
  if (opts.useJournal && opts.journalFame && opts.journalFame > 0) {
    journals = (opts.variant.fame * items) / opts.journalFame
    if (opts.journalEmpty == null || opts.journalFull == null) {
      journalProfit = null
      missing.push("journal")
    } else {
      const full = stackSell(opts.journalFull, journals, opts.sellMode, opts.premium).net
      const empty = stackBuy(opts.journalEmpty, journals, opts.buyMode).cost
      journalProfit = full - empty
    }
  }

  const profit =
    revenue == null || !materialKnown || !leftoverKnown
      ? null
      : revenue +
        leftoverValue +
        (journalProfit ?? 0) -
        materialCost -
        fee -
        silverCost

  const spent = materialKnown ? materialCost + fee + silverCost + (journalProfit != null && journalProfit < 0 ? -journalProfit : 0) : null
  const margin = profit != null && spent && spent > 0 ? profit / spent : null

  return {
    bonus: total,
    parts,
    rrr,
    focusEach,
    focusTotal: focusEach * runs,
    efficiency: spec.efficiency,
    items,
    fameEach,
    fameTotal,
    studyEach,
    fee,
    nutrition: nut,
    materialCost: materialKnown ? materialCost : null,
    leftoverValue: leftoverKnown ? leftoverValue : null,
    revenue,
    journalProfit,
    journals,
    silverCost,
    profit,
    margin,
    missing,
    consumed,
    leftovers,
  }
}

/** Repair-station quality reroll. Quality cannot fall. Masterpiece cannot be rerolled. */
export const REROLL_NAMES = ["", "Normal", "Good", "Outstanding", "Excellent", "Masterpiece"] as const

/** Silver multiplier on item value for one attempt, before the server multiplier. */
export const REROLL_MOD: Record<number, number> = { 1: 4.4, 2: 5.5, 3: 6.6, 4: 27.5 }

/**
 * Chance of each result quality 1–5, indexed by destination.
 * Index 0 is unused. A Normal item always improves.
 */
export const REROLL_TO: Record<number, number[]> = {
  1: [0, 0, 0.8, 0.15, 0.0495, 0.0005],
  2: [0, 0, 0.3, 0.6, 0.09925, 0.00075],
  3: [0, 0, 0, 0.5, 0.499, 0.001],
  4: [0, 0, 0, 0, 0.995, 0.005],
}

export function rerollAttempt(itemValue: number, quality: number, multiplier: number): number {
  const mod = REROLL_MOD[quality]
  if (!mod || !(itemValue > 0) || !(multiplier > 0)) return 0
  return itemValue * multiplier * mod
}

/** Expected attempts and silver to reach the target quality or better. */
export function rerollPlan(itemValue: number, from: number, target: number, multiplier: number) {
  const start = Math.min(5, Math.max(1, Math.round(from)))
  const goal = Math.min(5, Math.max(start, Math.round(target)))
  const attempts = [0, 0, 0, 0, 0, 0]
  const silverCost = [0, 0, 0, 0, 0, 0]
  for (let q = goal - 1; q >= 1; q--) {
    const row = REROLL_TO[q]
    if (!row) continue
    let laterAttempts = 0
    let laterSilver = 0
    for (let next = q + 1; next <= 5; next++) {
      laterAttempts += row[next] * attempts[next]
      laterSilver += row[next] * silverCost[next]
    }
    const leave = 1 - row[q]
    attempts[q] = leave > 0 ? (1 + laterAttempts) / leave : 0
    silverCost[q] = leave > 0 ? (rerollAttempt(itemValue, q, multiplier) + laterSilver) / leave : 0
  }
  const row = REROLL_TO[start] ?? [0, 0, 0, 0, 0, 0]
  let hit = 0
  for (let next = goal; next <= 5; next++) hit += row[next] ?? 0
  return {
    attempt: start >= 5 ? 0 : rerollAttempt(itemValue, start, multiplier),
    attempts: start >= goal ? 0 : attempts[start],
    silver: start >= goal ? 0 : silverCost[start],
    hit,
    chances: row,
  }
}
