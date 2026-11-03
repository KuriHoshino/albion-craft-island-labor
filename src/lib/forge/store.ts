import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { PriceQuote } from "./prices"
import { fetchMarketPrices, loadMarketPrices } from "./prices"
import type { BuyMode, Place, SellMode } from "./formulas"
import type { ServerId, HoBiome, HoRegion } from "./rules"
import { MARKETS } from "./rules"
import { getItem, journalFor, marketId, setNameBook, variantOf } from "./lookup"
import type { DeskSnapshot } from "./desk"

export type Quote = PriceQuote
export type PriceBook = Record<string, Record<string, Record<string, Quote>>>

export type Line = {
  uid: string
  itemId: string
  enchant: number
  route: "direct" | "upgrade"
  runs: number
  place: Place
  city: string
  power: number
  hoBiome: HoBiome
  hoQuality: number
  hoRegion: HoRegion
  extra: number
  focus: boolean
  daily: 0 | 10 | 20
  mastery: number
  specialist: number
  siblings: number
  journal: boolean
  journalTier: number
  journalTiers: number[]
  productOverride: number | null
  matOverrides: Record<string, number>
  focusOverride: number | null
  /** City stamped onto this recipe's shopping rows. */
  shopCity?: string
}

export type View = "bench" | "returns" | "study" | "reroll" | "codex" | "farm" | "labor" | "recent"

export type RecentSearch = {
  id: string
  itemId: string
  enchant: number
  route: "direct" | "upgrade"
  city: string
  place: Place
  saved: boolean
  at: number
}

type ForgeState = {
  view: View
  server: ServerId
  premium: boolean
  buyCity: string
  sellCity: string
  buyMode: BuyMode
  sellMode: SellMode
  leftover: "reuse" | "sell"
  stationRate: number
  quality: number
  lines: Line[]
  active: string
  loadedId: string | null
  loadedName: string
  prices: PriceBook
  priceAt: number | null
  priceError: string | null
  loading: boolean
  catalogRev: number
  catalogNote: string | null
  names: Record<string, string>
  recents: RecentSearch[]
  setItemName: (id: string, name: string) => void
  setView: (view: View) => void
  patch: (partial: Partial<Omit<ForgeState, "lines" | "prices">>) => void
  patchLine: (uid: string, partial: Partial<Line>) => void
  setActive: (uid: string) => void
  addLine: (itemId?: string) => void
  removeLine: (uid: string) => void
  setMatOverride: (uid: string, id: string, value: number | null) => void
  applyDesk: (desk: DeskSnapshot, meta: { id: string | null; name: string }) => void
  openRecent: (id: string) => void
  saveRecent: (id: string) => void
  dropRecent: (id: string) => void
  loadPrices: () => Promise<void>
}

function rememberSearch(current: RecentSearch[] | undefined, line: Line): RecentSearch[] {
  const next: RecentSearch = {
    id: Math.random().toString(36).slice(2, 10),
    itemId: line.itemId,
    enchant: line.enchant,
    route: line.route,
    city: line.city,
    place: line.place,
    saved: false,
    at: Date.now(),
  }
  const kept = (current ?? []).filter(
    (row) => row.saved || row.itemId !== next.itemId || row.enchant !== next.enchant || row.route !== next.route,
  )
  const loose = [next, ...kept.filter((row) => !row.saved)].slice(0, 10)
  return [...loose, ...kept.filter((row) => row.saved)]
}

export function blankLine(itemId = "T4_MAIN_SWORD"): Line {
  return {
    uid: Math.random().toString(36).slice(2, 10),
    itemId,
    enchant: 0,
    route: "direct",
    runs: 10,
    place: "city",
    city: "Lymhurst",
    power: 4,
    hoBiome: "forest",
    hoQuality: 4,
    hoRegion: "outlands",
    extra: 0,
    focus: false,
    daily: 0,
    mastery: 0,
    specialist: 0,
    siblings: 0,
    journal: false,
    journalTier: 4,
    journalTiers: [],
    productOverride: null,
    matOverrides: {},
    focusOverride: null,
  }
}

const seed = blankLine()
seed.uid = "broadsword"

function collectIds(lines: Line[]): string[] {
  const ids = new Set<string>()
  for (const line of lines) {
    const item = getItem(line.itemId)
    if (!item) continue
    const variant = variantOf(item, line.enchant, line.route)
    ids.add(marketId(item.id, variant.enchant))
    for (const mat of variant.mats) ids.add(mat.id)
    if (item.journal) {
      const journal = journalFor(item.journal, item.tier)
      if (journal) {
        ids.add(`${journal.id}_EMPTY`)
        ids.add(`${journal.id}_FULL`)
      }
    }
  }
  return [...ids]
}

let loadingFlag = false
let loadAgain = false
let retryTimer = 0

export function priceWatchKey(state: { server: string; lines: Line[] }) {
  return `${state.server}|${collectIds(state.lines).slice().sort().join(",")}`
}

export const useForge = create<ForgeState>()(
  persist(
    (set, get) => ({
      view: "bench",
      server: "asia",
      premium: true,
      buyCity: "Lymhurst",
      sellCity: "Lymhurst",
      buyMode: "instant",
      sellMode: "order",
      leftover: "reuse",
      stationRate: 500,
      quality: 1,
      lines: [seed],
      active: seed.uid,
      loadedId: null,
      loadedName: "My craft",
      prices: {},
      priceAt: null,
      priceError: null,
      loading: false,
      catalogRev: 0,
      catalogNote: null,
      names: {},
      recents: [],
      setItemName: (id, name) => {
        const trimmed = name.trim()
        const names = { ...get().names }
        if (!trimmed) delete names[id]
        else names[id] = trimmed
        setNameBook(names)
        set({ names, catalogRev: get().catalogRev + 1 })
      },
      setView: (view) => set({ view }),
      patch: (partial) => set(partial),
      patchLine: (uid, partial) =>
        set({
          lines: get().lines.map((line) => (line.uid === uid ? { ...line, ...partial } : line)),
        }),
      setActive: (uid) => set({ active: uid }),
      addLine: (itemId) => {
        const line = blankLine(itemId)
        const current = get().lines.find((entry) => entry.uid === get().active)
        if (current) {
          line.city = current.city
          line.place = current.place
          line.power = current.power
          line.hoBiome = current.hoBiome ?? "forest"
          line.hoQuality = current.hoQuality ?? 4
          line.hoRegion = current.hoRegion ?? "outlands"
          line.focus = current.focus
          line.mastery = current.mastery
          line.specialist = current.specialist
          line.siblings = current.siblings
          line.runs = current.runs
        }
        const item = getItem(line.itemId)
        if (item?.journal) line.journalTier = Math.min(8, Math.max(2, item.tier))
        set({ lines: [...get().lines, line], active: line.uid, recents: rememberSearch(get().recents, line) })
      },
      removeLine: (uid) => {
        const lines = get().lines.filter((line) => line.uid !== uid)
        if (!lines.length) {
          const fresh = blankLine()
          set({ lines: [fresh], active: fresh.uid })
          return
        }
        set({ lines, active: get().active === uid ? lines[0].uid : get().active })
      },
      setMatOverride: (uid, id, value) => {
        set({
          lines: get().lines.map((line) => {
            if (line.uid !== uid) return line
            const matOverrides = { ...line.matOverrides }
            if (value == null || Number.isNaN(value)) delete matOverrides[id]
            else matOverrides[id] = value
            return { ...line, matOverrides }
          }),
        })
      },
      applyDesk: (desk, meta) => {
        const lines = desk.lines.map((line) => ({ ...blankLine(line.itemId), ...line }))
        const active = lines.some((line) => line.uid === desk.active) ? desk.active : lines[0].uid
        set({
          server: desk.server,
          premium: desk.premium,
          buyCity: desk.buyCity,
          sellCity: desk.sellCity,
          buyMode: desk.buyMode,
          sellMode: desk.sellMode,
          leftover: desk.leftover,
          stationRate: desk.stationRate,
          quality: desk.quality,
          lines,
          active,
          loadedId: meta.id,
          loadedName: meta.name,
          view: "bench",
          priceError: null,
        })
        void get().loadPrices()
      },
      openRecent: (id) => {
        const row = (get().recents ?? []).find((entry) => entry.id === id)
        if (!row) return
        const line = blankLine(row.itemId)
        line.enchant = row.enchant
        line.route = row.route
        line.city = row.city
        line.place = row.place
        set({ lines: [...get().lines, line], active: line.uid, view: "bench" })
      },
      saveRecent: (id) =>
        set({
          recents: (get().recents ?? []).map((entry) => (entry.id === id ? { ...entry, saved: true } : entry)),
        }),
      dropRecent: (id) => set({ recents: (get().recents ?? []).filter((entry) => entry.id !== id) }),
      loadPrices: async () => {
        if (loadingFlag) {
          loadAgain = true
          return
        }
        loadingFlag = true
        set({ loading: true, priceError: null })
        const server = get().server
        const itemIds = collectIds(get().lines)
        try {
          if (!itemIds.length) {
            set({ loading: false })
            return
          }
          const request = {
            server,
            itemIds,
            locations: [...MARKETS],
            qualities: [1, 2, 3, 4, 5],
          }
          const result =
            import.meta.env.VITE_PAGES === "1"
              ? await loadMarketPrices(request)
              : await fetchMarketPrices({ data: request })
          if (get().server !== server) {
            loadAgain = true
            return
          }
          const live = new Set(collectIds(get().lines))
          const next: PriceBook = {}
          for (const id of itemIds) {
            if (live.has(id)) next[id] = result.quotes[id] ?? {}
          }
          set({
            prices: replaceIds(get().prices, next, Object.keys(next)),
            priceAt: result.fetchedAt,
            loading: false,
            priceError: null,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not load market prices"
          const busy = /busy|throttl/i.test(message)
          if (busy) {
            set({
              loading: false,
              priceError: get().priceAt ? null : "Prices are waiting on the market. They retry in a minute.",
            })
            if (!retryTimer) {
              retryTimer = window.setTimeout(() => {
                retryTimer = 0
                void get().loadPrices()
              }, 60_000)
            }
          } else {
            set({ loading: false, priceError: message })
          }
        } finally {
          loadingFlag = false
          if (loadAgain && !retryTimer) {
            loadAgain = false
            void get().loadPrices()
          } else {
            loadAgain = false
          }
        }
      },
    }),
    {
      name: "hearthforge-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        server: state.server,
        premium: state.premium,
        buyCity: state.buyCity,
        sellCity: state.sellCity,
        buyMode: state.buyMode,
        sellMode: state.sellMode,
        leftover: state.leftover,
        stationRate: state.stationRate,
        quality: state.quality,
        lines: state.lines,
        active: state.active,
        loadedId: state.loadedId,
        loadedName: state.loadedName,
        names: state.names,
        prices: state.prices,
        priceAt: state.priceAt,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ForgeState>
        const names = saved.names ?? current.names
        setNameBook(names)
        const lines = (saved.lines ?? current.lines)
          .map((line) => ({
            ...blankLine(line.itemId),
            ...line,
          }))
          .filter((line) => getItem(line.itemId))
        const kept = lines.length ? lines : [blankLine()]
        const active = kept.some((line) => line.uid === saved.active) ? saved.active : kept[0].uid
        return {
          ...current,
          ...saved,
          lines: kept,
          active: active ?? kept[0].uid,
          loadedId: saved.loadedId ?? null,
          loadedName: saved.loadedName || "My craft",
        }
      },
    },
  ),
)

function replaceIds(prev: PriceBook, next: PriceBook, ids: string[]): PriceBook {
  const out: PriceBook = { ...prev }
  for (const id of ids) out[id] = next[id] ?? {}
  return out
}

export function readQuote(book: PriceBook, id: string, city: string, quality: number): Quote | null {
  return book[id]?.[city]?.[String(quality)] ?? null
}

export function moneySide(quote: Quote | null, side: "sell" | "buy"): number | null {
  if (!quote) return null
  const value = side === "sell" ? quote.sell : quote.buy
  return value > 0 ? value : null
}
