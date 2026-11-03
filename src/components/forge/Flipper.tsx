import { useMemo, useState } from "react"
import { items } from "@/lib/forge/catalog"
import { enchantStones, marketId } from "@/lib/forge/lookup"
import { fetchMarketPrices, loadMarketPrices } from "@/lib/forge/prices"
import { MARKETS } from "@/lib/forge/rules"
import { useForge, type PriceBook } from "@/lib/forge/store"
import { stackBuy, stackSell } from "@/lib/forge/formulas"
import { exact, pct, silver } from "./fields"

const GROUPS = [
  { id: "weapon", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "offhand", label: "Off-hands" },
  { id: "tool", label: "Tools" },
]

const ENCHANTS = [
  { level: 1, label: ".1 runes" },
  { level: 2, label: ".2 souls" },
  { level: 3, label: ".3 relics" },
  { level: 4, label: ".4 market" },
]

type StoneQuote = { name: string; city: string; price: number }

type FlipRow = {
  key: string
  name: string
  enchant: number
  buyCity: string
  buyPrice: number
  sellCity: string
  sellPrice: number
  upgrade: string
  profit: number
  per100: number
  roi: number
}

function order(book: PriceBook, id: string, city: string, quality: number, side: "sell" | "buy") {
  const quote = book[id]?.[city]?.[String(quality)]
  const price = side === "sell" ? quote?.sell : quote?.buy
  return price && price > 0 ? price : null
}

function cheapest(book: PriceBook, id: string, cities: string[]) {
  let best: { city: string; price: number } | null = null
  for (const city of cities) {
    const price = order(book, id, city, 1, "sell")
    if (price == null) continue
    if (!best || price < best.price) best = { city, price }
  }
  return best
}

export function FlipLab() {
  const server = useForge((s) => s.server)
  const premium = useForge((s) => s.premium)
  const patch = useForge((s) => s.patch)
  const [group, setGroup] = useState("weapon")
  const [tier, setTier] = useState(6)
  const [enchants, setEnchants] = useState<number[]>([1, 2, 3, 4])
  const [quality, setQuality] = useState(1)
  const [minProfit, setMinProfit] = useState(0)
  const [buys, setBuys] = useState<string[]>(["Thetford", "Lymhurst", "Bridgewatch", "Martlock", "Fort Sterling", "Caerleon", "Brecilien"])
  const [sells, setSells] = useState<string[]>(["Black Market"])
  const [rows, setRows] = useState<FlipRow[]>([])
  const [stones, setStones] = useState<StoneQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [scanned, setScanned] = useState(0)

  const shown = useMemo(() => rows.filter((row) => row.profit >= minProfit), [rows, minProfit])

  function toggle(list: string[], city: string, set: (next: string[]) => void) {
    set(list.includes(city) ? list.filter((entry) => entry !== city) : [...list, city])
  }

  async function scan() {
    const pool = items.filter((item) => item.group === group && item.tier === tier)
    const levels = enchants.length ? enchants : [1]
    const ids = new Set<string>([`T${tier}_RUNE`, `T${tier}_SOUL`, `T${tier}_RELIC`])
    for (const item of pool) {
      for (const level of levels) {
        if (!item.variants.some((variant) => variant.enchant === level) && level !== 0) continue
        ids.add(marketId(item.id, level))
        if (level > 0 && level < 4) ids.add(marketId(item.id, 0))
      }
    }
    const idList = [...ids]
    if (!idList.length || !buys.length || !sells.length) {
      setRows([])
      setError("Pick a buy city and a sell city.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const requestBase = { server, locations: [...MARKETS], qualities: [quality] }
      const book: PriceBook = {}
      for (let index = 0; index < idList.length; index += 350) {
        const request = { ...requestBase, itemIds: idList.slice(index, index + 350) }
        const result = import.meta.env.VITE_PAGES === "1" ? await loadMarketPrices(request) : await fetchMarketPrices({ data: request })
        Object.assign(book, result.quotes)
      }
      const next: FlipRow[] = []
      for (const item of pool) {
        for (const level of levels) {
          if (level > 0 && !item.variants.some((variant) => variant.enchant === level)) continue
          const upgradeStones = level > 0 && level < 4 ? enchantStones(item, level) : []
          const marketOnly = level === 4 || upgradeStones.length === 0
          const buyId = marketOnly ? marketId(item.id, level) : marketId(item.id, 0)
          const sellId = marketId(item.id, level)
          for (const buyCity of buys) {
            const buyPrice = order(book, buyId, buyCity, quality, "sell")
            if (buyPrice == null) continue
            let upgradeCost = 0
            let missing = false
            for (const stone of marketOnly ? [] : upgradeStones) {
              const stonePrice = order(book, stone.id, buyCity, 1, "sell")
              if (stonePrice == null) {
                missing = true
                break
              }
              upgradeCost += stonePrice * stone.qty
            }
            if (missing) continue
            for (const sellCity of sells) {
              if (sellCity === buyCity) continue
              const sellPrice = order(book, sellId, sellCity, quality, "buy")
              if (sellPrice == null) continue
              const net = stackSell(sellPrice, 1, sellCity === "Black Market" ? "notax" : "instant", premium).net
              const cost = stackBuy(buyPrice, 1, "instant").cost + upgradeCost
              const profit = net - cost
              const weight = Math.max(item.weight, 0.1)
              next.push({
                key: `${item.id}|${level}|${buyCity}|${sellCity}`,
                name: item.name,
                enchant: level,
                buyCity,
                buyPrice,
                sellCity,
                sellPrice,
                upgrade: level === 4 ? ".4 market" : level === 1 ? ".1 runes" : level === 2 ? ".2 runes + souls" : level === 3 ? ".3 runes + souls + relics" : "Direct",
                profit,
                per100: (profit / weight) * 100,
                roi: cost > 0 ? profit / cost : 0,
              })
            }
          }
        }
      }
      next.sort((a, b) => b.profit - a.profit)
      setRows(next.slice(0, 80))
      setStones(
        [
          { label: ".1 rune", id: `T${tier}_RUNE` },
          { label: ".2 soul", id: `T${tier}_SOUL` },
          { label: ".3 relic", id: `T${tier}_RELIC` },
        ]
          .map((stone) => {
            const quote = cheapest(book, stone.id, buys.length ? buys : [...MARKETS])
            return quote ? { ...quote, name: stone.label } : null
          })
          .filter((row): row is StoneQuote => row != null),
      )
      setScanned(pool.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load flip prices")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Flipping</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Buy a sell order in one city and sell it into a buy order in another. An enchant flip buys the .0 item plus runes, souls, and relics, then sells the enchanted item.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-xs text-muted">
            Category
            <select className="mt-1 h-11 w-full rounded-lg border border-line bg-ink px-3 text-base text-parchment" value={group} onChange={(event) => setGroup(event.target.value)}>
              {GROUPS.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Tier
            <select className="mt-1 h-11 w-full rounded-lg border border-line bg-ink px-3 text-base text-parchment" value={tier} onChange={(event) => setTier(Number(event.target.value))}>
              {[4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={value}>T{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Quality
            <select className="mt-1 h-11 w-full rounded-lg border border-line bg-ink px-3 text-base text-parchment" value={quality} onChange={(event) => setQuality(Number(event.target.value))}>
              <option value={1}>Normal</option>
              <option value={2}>Good</option>
              <option value={3}>Outstanding</option>
              <option value={4}>Excellent</option>
              <option value={5}>Masterpiece</option>
            </select>
          </label>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-brass uppercase">Enchantment</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ENCHANTS.map((entry) => (
              <button
                key={entry.level}
                type="button"
                onClick={() =>
                  setEnchants((current) =>
                    current.includes(entry.level) ? current.filter((level) => level !== entry.level) : [...current, entry.level].sort(),
                  )
                }
                className={"h-11 rounded-full border px-3 text-sm " + (enchants.includes(entry.level) ? "border-brass text-brass" : "border-line text-muted")}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">.1, .2, and .3 buy the flat item plus the stones. .4 uses the enchanted item's market price.</p>
          {stones.length ? (
            <ul className="mt-2 flex flex-wrap gap-3 text-sm">
              {stones.map((stone) => (
                <li key={stone.name} className="tabular-nums text-parchment">
                  {stone.name} {silver(stone.price)} <span className="text-muted">{stone.city}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wide text-brass uppercase">Buy location</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MARKETS.filter((city) => city !== "Black Market").map((city) => (
            <button key={city} type="button" onClick={() => toggle(buys, city, setBuys)} className={"h-11 rounded-full border px-3 text-sm " + (buys.includes(city) ? "border-brass text-brass" : "border-line text-muted")}>
              {city}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wide text-brass uppercase">Sell location</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MARKETS.map((city) => (
            <button key={city} type="button" onClick={() => toggle(sells, city, setSells)} className={"h-11 rounded-full border px-3 text-sm " + (sells.includes(city) ? "border-brass text-brass" : "border-line text-muted")}>
              {city}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Min unit profit
            <input className="mt-1 h-11 w-36 rounded-lg border border-line bg-ink px-3 text-base text-parchment" inputMode="numeric" value={minProfit || ""} placeholder="0" onChange={(event) => setMinProfit(Number(event.target.value) || 0)} />
          </label>
          <button type="button" onClick={() => patch({ premium: !premium })} className={"h-11 rounded-lg border px-3 text-sm " + (premium ? "border-brass text-brass" : "border-line text-muted")}>
            {premium ? "Premium" : "No premium"}
          </button>
          <button type="button" disabled={loading} onClick={() => void scan()} className="h-11 rounded-lg bg-brass px-4 text-sm font-semibold text-ink">
            {loading ? "Scanning" : "Find flips"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold tracking-wide text-brass uppercase">Results ({shown.length})</h3>
        {scanned && !shown.length ? <p className="mt-3 text-sm text-muted">No flip cleared the filters.</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Buy from</th>
                <th className="py-2 pr-3 font-medium">Upgrade</th>
                <th className="py-2 pr-3 font-medium">Sell to</th>
                <th className="py-2 pr-3 font-medium">Unit profit</th>
                <th className="py-2 pr-3 font-medium">Profit / 100 kg</th>
                <th className="py-2 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.key} className="border-t border-line">
                  <td className="py-3 pr-3">
                    <p className="text-parchment">{row.name} .{row.enchant}</p>
                    <p className="text-muted">{row.buyCity}</p>
                    <p className="tabular-nums">Buy for {silver(row.buyPrice)}</p>
                  </td>
                  <td className="py-3 pr-3 text-muted">{row.upgrade}</td>
                  <td className="py-3 pr-3">
                    <p className="text-parchment">{row.sellCity}</p>
                    <p className="tabular-nums">Sell for {silver(row.sellPrice)}</p>
                  </td>
                  <td className={"py-3 pr-3 tabular-nums font-semibold " + (row.profit >= 0 ? "text-sage" : "text-ember")}>{silver(row.profit)}</td>
                  <td className="py-3 pr-3 tabular-nums">{silver(row.per100)}</td>
                  <td className="py-3 tabular-nums">{pct(row.roi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          {scanned ? `Checked ${exact(scanned)} items. ` : ""}
          Unit profit is one item after tax. Black Market sells have no tax. Royal sells pay tax and no setup fee.
        </p>
      </section>
    </div>
  )
}
