import { Check } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { fetchHourlyPrices, loadHourlyPrices, type HourSeries } from "@/lib/forge/prices"
import { MARKETS, type ServerId } from "@/lib/forge/rules"
import { useForge } from "@/lib/forge/store"
import { silver, exact } from "./fields"

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

  const rows = useMemo(() => {
    const byTime = new Map<string, Record<string, number | string | null>>()
    for (const entry of series) {
      for (const point of entry.points) {
        const row = byTime.get(point.time) ?? { time: point.time, label: hourLabel(point.time) }
        row[entry.city] = point.price
        row[`${entry.city} sold`] = point.count
        byTime.set(point.time, row)
      }
    }
    return [...byTime.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)))
  }, [series])

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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-parchment">Hourly average, {itemName}</p>
        <p className="text-xs text-muted">
          {loading ? "Loading the data project…" : at ? `Updated ${hourLabel(new Date(at).toISOString())}` : ""}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted">
        Check a city to put its name on the shopping list. Sold is the last 24 hours on the data project.
      </p>
      {error ? <p className="mt-2 text-sm text-ember">{error}</p> : null}
      {!error && !loading && rows.length === 0 && !book[itemId] ? (
        <p className="mt-2 text-sm text-muted">No price for this item yet.</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(232,220,196,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#a89880", fontSize: 11 }} interval="preserveStartEnd" minTickGap={28} />
              <YAxis
                tick={{ fill: "#a89880", fontSize: 11 }}
                width={72}
                tickFormatter={(value: number) => silver(value)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-parchment">
                      <p>{label}</p>
                      {payload.map((entry) => {
                        const row = entry.payload as Record<string, number | string | null>
                        const sold = row[`${entry.name} sold`]
                        return (
                          <p key={String(entry.name)} style={{ color: entry.color }}>
                            {entry.name}: {silver(Number(entry.value))}
                            {sold != null ? ` · ${sold} sold` : ""}
                          </p>
                        )
                      })}
                    </div>
                  )
                }}
              />
              {MARKETS.map((city) => (
                <Line
                  key={city}
                  type="monotone"
                  dataKey={city}
                  name={city}
                  stroke={STROKE[city]}
                  strokeWidth={1.75}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {!loading && (rows.length > 0 || book[itemId]) ? (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {MARKETS.map((city) => {
            const quote = book[itemId]?.[city]?.[String(quality)]
            const last = lastByCity.get(city)
            const sell = quote && quote.sell > 0 ? quote.sell : null
            const buy = quote && quote.buy > 0 ? quote.buy : null
            const price = side === "sell" ? sell : buy
            const sold = soldInDay(series.find((entry) => entry.city === city)?.points ?? [])
            const using = usedCity === city
            return (
              <li key={city} className="flex items-start gap-2 rounded-lg border border-line px-2 py-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onUse(city, price)}
                  aria-label={`Buy in ${city}`}
                  className={
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border " +
                    (using ? "border-brass text-brass" : "border-line text-muted")
                  }
                >
                  <Check className="size-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 text-parchment">
                    <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: STROKE[city] }} />
                    <span className="truncate">{city}</span>
                  </p>
                  <p className="tabular-nums text-muted">
                    {sell != null ? `sell ${silver(sell)}` : "sell —"}
                    {" · "}
                    {buy != null ? `buy ${silver(buy)}` : "buy —"}
                  </p>
                  <p className="tabular-nums text-muted">
                    {sold == null ? "No sales recorded" : `${exact(sold)} sold / day`}
                    {price == null && last ? ` · last ${silver(last.price)}` : ""}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
