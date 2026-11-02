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

function bestLevel(levels: BookLevel[] | undefined) {
  const level = levels?.find((row) => row.price > 0)
  return { price: level?.price || 0, at: level?.updated_at || "" }
}

async function pullChunk(host: string, ids: string[], locations: string[], qualities: number[]) {
  const loc = locations.map((name) => encodeURIComponent(name)).join(",")
  const url = `${host}/api/v2/stats/orderbook/${ids.join(",")}.json?locations=${loc}&qualities=${qualities.join(",")}`
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate, br",
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text.slice(0, 180) || `Market data ${res.status}`)
  }
  return (await res.json()) as BookRow[]
}

export const fetchMarketPrices = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const ids = [...new Set(data.itemIds)]
    const host = HOST[data.server]
    const quotes: Record<string, Record<string, Record<string, PriceQuote>>> = {}
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40)
      const rows = await pullChunk(host, chunk, [...data.locations], data.qualities)
      for (const row of rows) {
        const ask = bestLevel(row.sell)
        const bid = bestLevel(row.buy)
        const item = (quotes[row.item_id] ??= {})
        const city = (item[row.city] ??= {})
        city[String(row.quality)] = {
          sell: ask.price,
          buy: bid.price,
          sellDate: ask.at,
          buyDate: bid.at,
        }
      }
      if (i + 40 < ids.length) await new Promise((r) => setTimeout(r, 250))
    }
    return { quotes, fetchedAt: Date.now() }
  })

export type HourPoint = { time: string; price: number; count: number }
export type HourSeries = { city: string; points: HourPoint[] }

const HourInput = z.object({
  server: z.enum(["asia", "europe", "americas"]),
  itemId: z.string().regex(/^[A-Z0-9_@]+$/),
  locations: z.array(z.enum(MARKETS)).min(1).max(MARKETS.length),
  quality: z.number().int().min(1).max(5),
})

type ChartRow = {
  location: string
  data?: {
    timestamps?: string[]
    prices_avg?: number[]
    item_count?: number[]
  }
}

async function readJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate, br" },
    signal: AbortSignal.timeout(20000),
  })
  if (res.status === 429) return { status: 429, body: null }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text.slice(0, 180) || `Market data ${res.status}`)
  }
  return { status: res.status, body: await res.json() }
}

export const fetchHourlyPrices = createServerFn({ method: "POST" })
  .validator((input: unknown) => HourInput.parse(input))
  .handler(async ({ data }) => {
    const loc = [...new Set(data.locations)].map((name) => encodeURIComponent(name)).join(",")
    const host = HOST[data.server]
    const chartUrl = `${host}/api/v2/stats/charts/${data.itemId}.json?locations=${loc}&qualities=${data.quality}&time-scale=1`
    const chartRes = await readJson(chartUrl)
    if (chartRes.status === 429) {
      throw new Error("The data project is busy. Wait a moment, then refresh.")
    }
    const series: HourSeries[] = []
    if (chartRes.status === 200) {
      for (const row of chartRes.body as ChartRow[]) {
        const times = row.data?.timestamps ?? []
        const prices = row.data?.prices_avg ?? []
        const counts = row.data?.item_count ?? []
        const points: HourPoint[] = []
        for (let i = 0; i < times.length; i++) {
          const price = prices[i] ?? 0
          if (!times[i] || price <= 0) continue
          points.push({ time: times[i], price, count: counts[i] ?? 0 })
        }
        if (points.length) series.push({ city: row.location, points })
      }
    }
    return { series, fetchedAt: Date.now() }
  })
