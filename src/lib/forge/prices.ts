import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { MARKETS, SERVERS } from "./rules"

const HOST: Record<(typeof SERVERS)[number]["id"], string> = {
  americas: "https://west.albion-online-data.com",
  europe: "https://europe.albion-online-data.com",
  asia: "https://east.albion-online-data.com",
}

const Input = z.object({
  server: z.enum(["asia", "europe", "americas"]),
  itemIds: z.array(z.string().regex(/^[A-Z0-9_@]+$/)).max(400),
  locations: z.array(z.enum(MARKETS)).min(1).max(8),
  qualities: z.array(z.number().int().min(1).max(5)).min(1).max(5),
})

export type PriceQuote = { sell: number; buy: number; sellDate: string; buyDate: string }

type BookLevel = { price: number; amount: number; updated_at?: string }
type BookRow = {
  item_id: string
  city: string
  quality: number
  sell?: BookLevel[]
  buy?: BookLevel[]
}

type PriceRow = {
  item_id: string
  city: string
  quality: number
  sell_price_min?: number
  sell_price_min_date?: string
  buy_price_max?: number
  buy_price_max_date?: string
}

const AFM_SERVER: Record<(typeof SERVERS)[number]["id"], string> = {
  americas: "west",
  europe: "europe",
  asia: "east",
}

const AFM_CITY: Record<string, (typeof MARKETS)[number]> = {
  "Black Market": "Black Market",
  "Brecilien Market": "Brecilien",
  "Bridgewatch Market": "Bridgewatch",
  "Caerleon Market": "Caerleon",
  "Fort Sterling Market": "Fort Sterling",
  "Lymhurst Market": "Lymhurst",
  "Martlock Market": "Martlock",
  "Thetford Market": "Thetford",
}

function silverCell(cell: string) {
  const match = cell.replace(/<[^>]+>/g, " ").match(/[0-9][0-9,]*/)
  return match ? Number(match[0].replace(/,/g, "")) : 0
}

function parseAfm(html: string) {
  const start = html.indexOf('class="summary-table"')
  if (start < 0) return []
  const end = html.indexOf("</table>", start)
  const table = html.slice(start, end)
  const rows: { city: (typeof MARKETS)[number]; sell: number; buy: number }[] = []
  for (const row of table.split("</tr>").slice(1)) {
    const name = row.match(/>((?:Black Market)|(?:[A-Za-z ]+ Market))</)
    const city = name ? AFM_CITY[name[1]] : undefined
    if (!city) continue
    const cells = [...row.matchAll(/class="numeric">([\s\S]*?)<\/td>/g)]
    if (cells.length < 2) continue
    rows.push({ city, sell: silverCell(cells[0][1]), buy: silverCell(cells[1][1]) })
  }
  return rows
}

function hasLivePrice(quotes: Record<string, Record<string, Record<string, PriceQuote>>>, id: string) {
  const item = quotes[id]
  if (!item) return false
  for (const cities of Object.values(item)) {
    for (const quote of Object.values(cities)) {
      if (quote.sell > 0 || quote.buy > 0) return true
    }
  }
  return false
}

async function pullAfm(server: (typeof SERVERS)[number]["id"], itemId: string) {
  const url = `https://albionfreemarket.com/pricecheck/${encodeURIComponent(itemId)}?s=${AFM_SERVER[server]}`
  const res = await fetch(url, {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return []
  return parseAfm(await res.text())
}

function bestLevel(levels: BookLevel[] | undefined) {
  const level = levels?.find((row) => row.price > 0)
  return { price: level?.price || 0, at: level?.updated_at || "" }
}

async function pullJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  })
  if (res.status === 429) throw new Error("The data project is busy. Prices retry in a minute.")
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text.slice(0, 180) || `Market data ${res.status}`)
  }
  return res.json()
}

async function pullPrices(host: string, ids: string[], locations: string[], qualities: number[]) {
  const loc = locations.map((name) => encodeURIComponent(name)).join(",")
  const url = `${host}/api/v2/stats/prices/${ids.join(",")}.json?locations=${loc}&qualities=${qualities.join(",")}`
  return (await pullJson(url)) as PriceRow[]
}

async function pullBook(host: string, ids: string[], locations: string[], qualities: number[]) {
  const loc = locations.map((name) => encodeURIComponent(name)).join(",")
  const url = `${host}/api/v2/stats/orderbook/${ids.join(",")}.json?locations=${loc}&qualities=${qualities.join(",")}`
  return (await pullJson(url)) as BookRow[]
}

export async function loadMarketPrices(data: z.infer<typeof Input>) {
  const ids = [...new Set(data.itemIds)]
  const host = HOST[data.server]
  const quotes: Record<string, Record<string, Record<string, PriceQuote>>> = {}
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const locations = [...data.locations]
    const qualities = data.qualities
    let book: BookRow[] = []
    let listed: PriceRow[] = []
    let failure: Error | null = null
    try {
      book = await pullBook(host, chunk, locations, qualities)
    } catch (err) {
      failure = err instanceof Error ? err : new Error("Order book failed")
    }
    try {
      listed = await pullPrices(host, chunk, locations, qualities)
    } catch (err) {
      failure = failure ?? (err instanceof Error ? err : new Error("Price list failed"))
    }
    if (!book.length && !listed.length && failure) throw failure
    for (const row of listed) {
      const sell = row.sell_price_min || 0
      const buy = row.buy_price_max || 0
      if (!sell && !buy) continue
      const item = (quotes[row.item_id] ??= {})
      const city = (item[row.city] ??= {})
      city[String(row.quality)] = {
        sell,
        buy,
        sellDate: row.sell_price_min_date || "",
        buyDate: row.buy_price_max_date || "",
      }
    }
    for (const row of book) {
      const ask = bestLevel(row.sell)
      const bid = bestLevel(row.buy)
      if (!ask.price && !bid.price) continue
      const item = (quotes[row.item_id] ??= {})
      const city = (item[row.city] ??= {})
      const prev = city[String(row.quality)] ?? { sell: 0, buy: 0, sellDate: "", buyDate: "" }
      city[String(row.quality)] = {
        sell: ask.price || prev.sell,
        buy: bid.price || prev.buy,
        sellDate: ask.price ? ask.at : prev.sellDate,
        buyDate: bid.price ? bid.at : prev.buyDate,
      }
    }
    if (i + 40 < ids.length) await new Promise((r) => setTimeout(r, 250))
  }
  const missing = ids.filter((id) => !hasLivePrice(quotes, id)).slice(0, 12)
  for (const id of missing) {
    try {
      const rows = await pullAfm(data.server, id)
      if (!rows.length) continue
      const item = (quotes[id] ??= {})
      for (const row of rows) {
        if (!row.sell && !row.buy) continue
        if (!data.locations.includes(row.city)) continue
        const city = (item[row.city] ??= {})
        for (const quality of data.qualities) {
          const prev = city[String(quality)]
          if (prev && (prev.sell > 0 || prev.buy > 0)) continue
          city[String(quality)] = {
            sell: row.sell,
            buy: row.buy,
            sellDate: row.sell ? "afm" : "",
            buyDate: row.buy ? "afm" : "",
          }
        }
      }
    } catch {
      continue
    }
  }
  return { quotes, fetchedAt: Date.now() }
}

export const fetchMarketPrices = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => loadMarketPrices(data))

export type HourPoint = { time: string; price: number; count: number }
export type HourSeries = { city: string; points: HourPoint[] }

const HourInput = z.object({
  server: z.enum(["asia", "europe", "americas"]),
  itemId: z.string().regex(/^[A-Z0-9_@]+$/),
  locations: z.array(z.enum(MARKETS)).min(1).max(MARKETS.length),
  quality: z.number().int().min(1).max(5),
})

type HistPoint = { timestamp?: string; avg_price?: number; item_count?: number }
type HistRow = {
  location?: string
  data?:
    | HistPoint[]
    | {
        timestamps?: string[]
        prices_avg?: number[]
        item_count?: number[]
      }
}

function hourStamp(stamp: string) {
  const date = new Date(stamp.endsWith("Z") ? stamp : `${stamp}Z`)
  if (Number.isNaN(date.getTime())) return ""
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString().replace(".000Z", "")
}

function addHour(series: Map<string, HourPoint[]>, city: string, time: string, price: number, count: number) {
  if (!city || !time || price <= 0) return
  const points = series.get(city) ?? []
  const found = points.find((point) => point.time === time)
  if (found) {
    found.price = price
    if (count > 0) found.count = count
  } else {
    points.push({ time, price, count })
  }
  series.set(city, points)
}

function readHistory(rows: HistRow[], series: Map<string, HourPoint[]>) {
  for (const row of rows) {
    const city = row.location || ""
    const data = row.data
    if (Array.isArray(data)) {
      for (const point of data) {
        addHour(series, city, point.timestamp || "", point.avg_price || 0, point.item_count || 0)
      }
      continue
    }
    const times = data?.timestamps ?? []
    const prices = data?.prices_avg ?? []
    const counts = data?.item_count ?? []
    for (let i = 0; i < times.length; i++) addHour(series, city, times[i] || "", prices[i] || 0, counts[i] || 0)
  }
}

async function readJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  })
  if (res.status === 429) return { status: 429, body: null }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text.slice(0, 180) || `Market data ${res.status}`)
  }
  return { status: res.status, body: await res.json() }
}

export async function loadHourlyPrices(data: z.infer<typeof HourInput>) {
  const loc = [...new Set(data.locations)].map((name) => encodeURIComponent(name)).join(",")
  const host = HOST[data.server]
  const historyUrl = `${host}/api/v2/stats/history/${data.itemId}.json?locations=${loc}&qualities=${data.quality}&time-scale=1`
  const historyRes = await readJson(historyUrl).catch(() => ({ status: 0, body: null }))
  if (historyRes.status === 429) throw new Error("The data project is busy. The chart retries in a minute.")
  const bucket = new Map<string, HourPoint[]>()
  if (historyRes.status === 200 && Array.isArray(historyRes.body)) readHistory(historyRes.body as HistRow[], bucket)
  const series: HourSeries[] = []
  for (const [city, points] of bucket) {
    points.sort((a, b) => a.time.localeCompare(b.time))
    if (points.length) series.push({ city, points })
  }
  return { series, fetchedAt: Date.now() }
}

export const fetchHourlyPrices = createServerFn({ method: "POST" })
  .validator((input: unknown) => HourInput.parse(input))
  .handler(async ({ data }) => loadHourlyPrices(data))
