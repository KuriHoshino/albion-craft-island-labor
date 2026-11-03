import { Check } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { fetchHourlyPrices, loadHourlyPrices, type HourSeries } from "@/lib/forge/prices"
import { MARKETS, type ServerId } from "@/lib/forge/rules"
import { useForge, type PriceBook } from "@/lib/forge/store"
import { silver, exact, priceAge } from "./fields"

const STROKE: Record<string, string> = {
  Thetford: "#8fbf7a",
  Lymhurst: "#3dbe8c",
  Bridgewatch: "#e0a15a",
  Martlock: "#7eb6d6",
  "Fort Sterling": "#d5d0c8",
  Caerleon: "#e07a5f",
  Brecilien: "#b79ad6",
  "Black Market": "#d6b36a",
}

function soldInDay(points: { time: string; count: number }[]) {
  if (!points.length) return null
  const newest = points[points.length - 1]
  const end = Date.parse(newest.time.endsWith("Z") ? newest.time : `${newest.time}Z`)
  if (Number.isNaN(end)) return null
  const start = end - 24 * 60 * 60 * 1000
  let sold = 0
  for (const point of points) {
    const time = Date.parse(point.time.endsWith("Z") ? point.time : `${point.time}Z`)
    if (!Number.isNaN(time) && time >= start) sold += point.count
  }
  return sold
}

function hourLabel(stamp: string) {
  const date = new Date(stamp.endsWith("Z") ? stamp : `${stamp}Z`)
  if (Number.isNaN(date.getTime())) return stamp
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" })
}

export function HourlyChart({
  server,
  itemId,
  itemName,
  quality,
  side,
  usedCity,
  onUse,
}: {
  server: ServerId
  itemId: string
  itemName: string
  quality: number
  side: "sell" | "buy"
  usedCity: string
  onUse: (city: string, price: number | null) => void
}) {
  const [series, setSeries] = useState<HourSeries[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [at, setAt] = useState<number | null>(null)
  const book = useForge((s) => s.prices)

  const filled = useRef(false)

  useEffect(() => {
    if (!itemId) return
    let cancel = false
    const load = () => {
      setLoading(true)
      const request = { server, itemId, locations: [...MARKETS], quality }
      const pending =
        import.meta.env.VITE_PAGES === "1" ? loadHourlyPrices(request) : fetchHourlyPrices({ data: request })
      void pending
        .then((result) => {
          if (cancel) return
          filled.current = result.series.length > 0
          setSeries(result.series)
          setAt(result.fetchedAt)
          setError("")
        })
        .catch((err: unknown) => {
          if (cancel || filled.current) return
          setError(err instanceof Error ? err.message : "Could not load hourly prices")
        })
        .finally(() => {
          if (!cancel) setLoading(false)
        })
    }
    const start = window.setTimeout(load, 4_000)
    const timer = window.setInterval(load, 60_000)
    return () => {
      cancel = true
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
  }, [server, itemId, quality])

  const lastByCity = useMemo(() => {
    const map = new Map<string, { price: number; count: number; time: string }>()
    for (const entry of series) {
      const point = entry.points[entry.points.length - 1]
      if (point) map.set(entry.city, point)
    }
    return map
  }, [series])

  return (
    <div className="mt-4">
      <p className="text-xs text-muted">
        {loading ? "Loading the data project…" : at ? `Updated ${hourLabel(new Date(at).toISOString())}` : itemName}
      </p>
      {error ? <p className="mt-2 text-sm text-ember">{error}</p> : null}
      {!error && !loading && series.length === 0 && !book[itemId] ? (
        <p className="mt-2 text-sm text-muted">No price for this item yet.</p>
      ) : null}
      {(series.length > 0 || book[itemId]) ? (
        <CityGrid
          itemId={itemId}
          quality={quality}
          side={side}
          usedCity={usedCity}
          book={book}
          series={series}
          lastByCity={lastByCity}
          onUse={onUse}
        />
      ) : null}
    </div>
  )
}

function CityGrid({
  itemId,
  quality,
  side,
  usedCity,
  book,
  series,
  lastByCity,
  onUse,
}: {
  itemId: string
  quality: number
  side: "sell" | "buy"
  usedCity: string
  book: PriceBook
  series: HourSeries[]
  lastByCity: Map<string, { price: number; count: number; time: string }>
  onUse: (city: string, price: number | null) => void
}) {
  const rows = MARKETS.map((city) => {
    const quote = book[itemId]?.[city]?.[String(quality)]
    const sell = quote && quote.sell > 0 ? quote.sell : null
    const buy = quote && quote.buy > 0 ? quote.buy : null
    const price = side === "sell" ? sell : buy
    return {
      city,
      sell,
      buy,
      price,
      sellAge: priceAge(quote?.sellDate),
      buyAge: priceAge(quote?.buyDate),
    }
  })
  const highestSell = rows.reduce<number | null>((best, row) => {
    if (row.sell == null) return best
    if (best == null || row.sell > best) return row.sell
    return best
  }, null)
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2">
      {rows.map((row) => {
        const last = lastByCity.get(row.city)
        const sold = soldInDay(series.find((entry) => entry.city === row.city)?.points ?? [])
        const using = usedCity === row.city
        const bestSell = row.sell != null && row.sell === highestSell
        return (
          <li key={row.city} className="flex items-start gap-2 rounded-lg border border-line px-2 py-1.5 text-xs">
            <button
              type="button"
              onClick={() => onUse(row.city, row.price)}
              aria-label={bestSell ? `Highest sell price is ${row.city}` : `Use ${row.city}`}
              className={
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border " +
                (bestSell ? "border-ember text-ember " : using ? "border-brass text-brass " : "border-line text-muted ")
              }
            >
              <Check className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-parchment">
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: STROKE[row.city] }} />
                <span className="truncate">{row.city}</span>
                {bestSell ? <span className="text-ember">highest sell</span> : null}
              </p>
              <p className="tabular-nums text-muted">
                {row.sell != null ? `sell ${silver(row.sell)}${row.sellAge ? ` · ${row.sellAge}` : ""}` : "sell —"}
                {" · "}
                {row.buy != null ? `buy ${silver(row.buy)}${row.buyAge ? ` · ${row.buyAge}` : ""}` : "buy —"}
              </p>
              <p className="tabular-nums text-muted">
                {sold == null ? "No sales recorded" : `${exact(sold)} sold / day`}
                {row.price == null && last ? ` · last ${silver(last.price)}` : ""}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
