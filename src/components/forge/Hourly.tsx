import { Check } from "lucide-react"
import { MARKETS, type ServerId } from "@/lib/forge/rules"
import { useForge, type PriceBook } from "@/lib/forge/store"
import { silver, priceAge } from "./fields"

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

export function HourlyChart({
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
  const book = useForge((s) => s.prices)
  if (!book[itemId]) {
    return <p className="mt-2 text-sm text-muted">No price for {itemName} yet.</p>
  }
  return (
    <CityGrid itemId={itemId} quality={quality} side={side} usedCity={usedCity} book={book} onUse={onUse} />
  )
}

function CityGrid({
  itemId,
  quality,
  side,
  usedCity,
  book,
  onUse,
}: {
  itemId: string
  quality: number
  side: "sell" | "buy"
  usedCity: string
  book: PriceBook
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
  const lowest = rows.reduce<number | null>((best, row) => {
    if (row.price == null) return best
    if (best == null || row.price < best) return row.price
    return best
  }, null)
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2">
      {rows.map((row) => {
        const using = usedCity === row.city
        const cheap = row.price != null && row.price === lowest
        return (
          <li key={row.city} className="flex items-start gap-2 rounded-lg border border-line px-2 py-1.5 text-xs">
            <button
              type="button"
              onClick={() => onUse(row.city, row.price)}
              aria-label={`Buy in ${row.city}`}
              className={
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border " +
                (using ? "border-brass text-brass" : "border-line text-muted")
              }
            >
              <Check className={"size-4" + (cheap ? " text-sage" : "")} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-parchment">
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: STROKE[row.city] }} />
                <span className="truncate">{row.city}</span>
                {cheap ? <span className="text-sage">lowest</span> : null}
              </p>
              <p className="tabular-nums text-muted">
                {row.sell != null ? `sell ${silver(row.sell)}${row.sellAge ? ` · ${row.sellAge}` : ""}` : "sell —"}
                {" · "}
                {row.buy != null ? `buy ${silver(row.buy)}${row.buyAge ? ` · ${row.buyAge}` : ""}` : "buy —"}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
