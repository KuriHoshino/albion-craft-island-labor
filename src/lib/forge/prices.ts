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

type RawRow = {
  item_id: string
  city: string
  quality: number
  sell_price_min: number
  buy_price_max: number
  sell_price_min_date: string
  buy_price_max_date: string
}

async function pullChunk(host: string, ids: string[], locations: string[], qualities: number[]) {
  const loc = locations.map((name) => encodeURIComponent(name)).join(",")
  const url = `${host}/api/v2/stats/prices/${ids.join(",")}.json?locations=${loc}&qualities=${qualities.join(",")}`
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
  return (await res.json()) as RawRow[]
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
        const item = (quotes[row.item_id] ??= {})
        const city = (item[row.city] ??= {})
        city[String(row.quality)] = {
          sell: row.sell_price_min || 0,
          buy: row.buy_price_max || 0,
          sellDate: row.sell_price_min_date || "",
          buyDate: row.buy_price_max_date || "",
        }
      }
      if (i + 40 < ids.length) await new Promise((r) => setTimeout(r, 250))
    }
    return { quotes, fetchedAt: Date.now() }
  })
