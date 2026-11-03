import { useMemo, useState } from "react"
import { RefreshCw, Trash2 } from "lucide-react"
import { craftMath } from "@/lib/forge/formulas"
import { enchantsOf, getItem, journalFor, marketId, matName, matWeight, variantOf } from "@/lib/forge/lookup"
import { CRAFT_CITIES, HO_BIOMES, MARKETS, biomeById, biomeFavors } from "@/lib/forge/rules"
import { moneySide, readQuote, useForge, type Line, type PriceBook } from "@/lib/forge/store"
import { Num, Select, Toggle, exact, fieldClass, pct, silver } from "./fields"
import { HourlyChart } from "./Hourly"
import { ItemPicker } from "./Picker"

function lookup(
  book: PriceBook,
  id: string,
  city: string,
  quality: number,
  side: "sell" | "buy",
  override: number | null | undefined,
): { price: number | null; from: string | null } {
  if (override != null && Number.isFinite(override)) return { price: override, from: null }
  const direct = moneySide(readQuote(book, id, city, quality), side)
  if (direct != null) return { price: direct, from: null }
  const cities = book[id]
  if (!cities) return { price: null, from: null }
  let best: { price: number; city: string } | null = null
  for (const [name, qualities] of Object.entries(cities)) {
    const quote = moneySide(qualities[String(quality)] ?? null, side)
    if (quote == null) continue
    if (!best || (side === "sell" ? quote < best.price : quote > best.price)) best = { price: quote, city: name }
  }
  return best ? { price: best.price, from: best.city } : { price: null, from: null }
}

function evaluateLine(line: Line, state: ReturnType<typeof useForge.getState>) {
  const item = getItem(line.itemId)
  if (!item) return null
  const variant = variantOf(item, line.enchant, line.route)
  const buySide = state.buyMode === "instant" ? "sell" : "buy"
  const sellSide = state.sellMode === "instant" ? "buy" : "sell"
  const productId = marketId(item.id, variant.enchant)
  const product = lookup(state.prices, productId, state.sellCity, state.quality, sellSide, line.productOverride)
  const notes: string[] = []
  if (product.from) notes.push(`${item.name} from ${product.from}`)
  const matLook = (id: string, city: string, side: "sell" | "buy") => {
    const found = lookup(state.prices, id, city, 1, side, line.matOverrides[id] ?? null)
    if (found.from) notes.push(`${id} from ${found.from}`)
    return found.price
  }
  const chosen = line.journal ? [item.tier].filter((tier) => tier >= 2 && tier <= 8) : []
  const journalFills = chosen.flatMap((tier) => {
    const journal = journalFor(item.journal, tier)
    if (!journal) return []
    return [
      {
        tier,
        fame: journal.fame,
        empty: matLook(`${journal.id}_EMPTY`, state.buyCity, buySide),
        full: matLook(`${journal.id}_FULL`, state.sellCity, sellSide),
      },
    ]
  })
  const math = craftMath({
    variant,
    tier: item.tier,
    category: item.category,
    place: line.place,
    city: line.city,
    focus: line.focus,
    daily: line.daily,
    power: line.power,
    biome: line.hoBiome,
    mapQuality: line.hoQuality,
    region: line.hoRegion,
    extra: line.extra,
    runs: line.runs,
    mastery: line.mastery,
    specialist: line.specialist,
    siblings: line.siblings,
    focusOverride: line.focusOverride,
    premium: state.premium,
    buyMode: state.buyMode,
    sellMode: state.sellMode,
    leftover: state.leftover,
    stationRate: state.stationRate,
    productUnit: product.price,
    matUnit: (id) => matLook(id, state.buyCity, buySide),
    matSellUnit: (id) => matLook(id, state.sellCity, sellSide),
    journalFills,
  })
  return { math, stoodIn: notes }
}

export function Bench() {
  const state = useForge()
  const line = state.lines.find((entry) => entry.uid === state.active) ?? state.lines[0]
  const item = line ? getItem(line.itemId) : undefined
  const [copied, setCopied] = useState(false)
  const [picking, setPicking] = useState(false)

  const evaluated = useMemo(() => (line ? evaluateLine(line, state) : null), [line, state])
  const math = evaluated?.math ?? null
  const variant = item && line ? variantOf(item, line.enchant, line.route) : undefined
  const journal = item ? journalFor(item.journal, item.tier) : undefined
  const buySide = state.buyMode === "instant" ? "sell" : "buy"
  const sellSide = state.sellMode === "instant" ? "buy" : "sell"
  const emptyJournal = journal && line ? lookup(state.prices, `${journal.id}_EMPTY`, state.buyCity, 1, buySide, line.matOverrides[`${journal.id}_EMPTY`] ?? null) : { price: null, from: null }
  const fullJournal = journal && line ? lookup(state.prices, `${journal.id}_FULL`, state.sellCity, 1, sellSide, line.matOverrides[`${journal.id}_FULL`] ?? null) : { price: null, from: null }
  const routes = item && line ? item.variants.filter((entry) => entry.enchant === (variant?.enchant ?? line.enchant)) : []
  const hasUpgrade = routes.some((entry) => entry.route === "upgrade")

  const cities = useMemo(() => {
    if (!item || !line || !variant) return []
    return CRAFT_CITIES.map((city) => {
      const result = evaluateLine({ ...line, place: "city", city }, state)
      return { city, profit: result?.math.profit ?? null, rrr: result?.math.rrr ?? 0 }
    }).sort((a, b) => (b.profit ?? -Infinity) - (a.profit ?? -Infinity))
  }, [item, line, variant, state])

  const shop = useMemo(() => {
    const rows = new Map<string, { qty: number; cost: number | null }>()
    let weight = 0
    for (const entry of state.lines) {
      const result = evaluateLine(entry, state)
      if (!result) continue
      for (const mat of result.math.consumed) {
        const current = rows.get(mat.id) ?? { qty: 0, cost: 0 }
        const cost = current.cost == null || mat.cost == null ? null : current.cost + mat.cost
        rows.set(mat.id, { qty: current.qty + mat.qty, cost })
        weight += mat.qty * matWeight(mat.id)
      }
    }
    return {
      weight,
      rows: [...rows.entries()].sort((a, b) => b[1].qty - a[1].qty),
    }
  }, [state])

  const planProfit = useMemo(() => {
    let total = 0
    let known = true
    for (const entry of state.lines) {
      const result = evaluateLine(entry, state)
      if (!result || result.math.profit == null) known = false
      else total += result.math.profit
    }
    return known ? total : null
  }, [state])

  if (!line || !item || !variant || !math) {
    return <p className="text-muted">That recipe is no longer in the desk.</p>
  }

  const productId = marketId(item.id, variant.enchant)
  const profitClass = math.profit == null ? "text-parchment" : math.profit >= 0 ? "text-sage" : "text-ember"
  const focused = evaluateLine({ ...line, focus: true }, state)
  const plain = evaluateLine({ ...line, focus: false }, state)
  const focusEach = focused?.math.focusEach ?? 0
  const focusBatch = focusEach * line.runs
  const focusGain =
    focused?.math.profit != null && plain?.math.profit != null ? focused.math.profit - plain.math.profit : null
  const perFocus = focusGain != null && focusBatch > 0 ? focusGain / focusBatch : null
  const fromPool = perFocus == null ? null : perFocus * 10000

  async function copyList() {
    const text = shop.rows
      .map(([id, row]) => `${Math.ceil(row.qty)}  ${matName(id)}`)
      .join("\n")
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {state.lines.map((entry) => {
            const named = getItem(entry.itemId)
            const on = entry.uid === line.uid
            return (
              <button
                key={entry.uid}
                type="button"
                onClick={() => state.setActive(entry.uid)}
                className={
                  "h-11 shrink-0 rounded-full border px-3 text-sm " +
                  (on ? "border-brass text-brass" : "border-line text-muted")
                }
              >
                {named?.name ?? "Recipe"}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setPicking((open) => !open)}
            className="h-11 shrink-0 rounded-full border border-line px-3 text-sm text-parchment"
          >
            Add Craft
          </button>
        </div>

        {picking ? (
          <section className="rounded-lg border border-line bg-panel p-4">
            <ItemPicker
              onPick={(id) => {
                state.addLine(id)
                setPicking(false)
              }}
            />
          </section>
        ) : null}

        <section className="rounded-lg border border-line bg-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-parchment">{item.name}</h2>
              <p className="mt-1 text-sm text-muted">
                T{item.tier}.{variant.enchant} · {item.station}
                {item.study ? " · can be studied" : " · no studying"}
              </p>
            </div>
            {state.lines.length > 1 ? (
              <button
                type="button"
                onClick={() => state.removeLine(line.uid)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted"
                aria-label="Remove craft"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Select
              label="Enchant"
              value={String(line.enchant)}
              onChange={(value) => {
                const enchant = Number(value)
                const next = variantOf(item, enchant, line.route)
                state.patchLine(line.uid, { enchant, route: next.route })
              }}
              options={enchantsOf(item).map((enchant) => ({ value: String(enchant), label: `.${enchant}` }))}
            />
            <Select
              label="Route"
              value={variant.route}
              onChange={(value) => state.patchLine(line.uid, { route: value as Line["route"] })}
              options={[
                { value: "direct", label: "Direct craft" },
                ...(hasUpgrade || line.route === "upgrade" ? [{ value: "upgrade", label: "Upgrade" }] : []),
              ]}
            />
            <Num label="Runs" min={0} value={line.runs} onChange={(runs) => state.patchLine(line.uid, { runs })} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4">
          <h3 className="text-sm font-semibold tracking-wide text-brass uppercase">Station</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Select
              label="Where"
              value={line.place}
              onChange={(place) => state.patchLine(line.uid, { place: place as Line["place"] })}
              options={[
                { value: "city", label: "Royal city" },
                { value: "island", label: "Island" },
                { value: "hideout", label: "Hideout" },
              ]}
            />
            {line.place === "hideout" ? (
              <Select
                label="Region"
                value={line.hoRegion ?? "outlands"}
                onChange={(hoRegion) =>
                  state.patchLine(line.uid, {
                    hoRegion: hoRegion as Line["hoRegion"],
                    ...(hoRegion === "roads" ? { hoQuality: 1 } : {}),
                  })
                }
                options={[
                  { value: "outlands", label: "Outlands" },
                  { value: "roads", label: "Roads of Avalon" },
                ]}
              />
            ) : (
              <Select
                label={line.place === "island" ? "Island city" : "Craft city"}
                value={line.city}
                onChange={(city) => state.patchLine(line.uid, { city })}
                options={CRAFT_CITIES.map((city) => ({ value: city, label: city }))}
              />
            )}
            {line.place === "hideout" ? (
              <Select
                label="City"
                value={line.hoBiome ?? "forest"}
                onChange={(hoBiome) => state.patchLine(line.uid, { hoBiome: hoBiome as Line["hoBiome"] })}
                options={HO_BIOMES.map((biome) => ({ value: biome.id, label: biome.label }))}
              />
            ) : null}
            {line.place === "hideout" && biomeById(line.hoBiome).kind === "hideout" ? (
              <Select
                label="Map quality"
                value={String(line.hoRegion === "roads" ? 1 : (line.hoQuality ?? 4))}
                onChange={(value) => state.patchLine(line.uid, { hoQuality: Number(value) })}
                options={(line.hoRegion === "roads" ? [1] : [1, 2, 3, 4, 5, 6]).map((quality) => ({
                  value: String(quality),
                  label: line.hoRegion === "roads" ? "Q1 (Roads)" : `Q${quality}`,
                }))}
              />
            ) : null}
            {line.place === "hideout" && biomeById(line.hoBiome).kind === "hideout" ? (
              <Select
                label="Hideout level"
                value={String(Math.min(9, Math.max(1, Math.round(line.power || 1))))}
                onChange={(value) => state.patchLine(line.uid, { power: Number(value) })}
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({ value: String(level), label: String(level) }))}
              />
            ) : null}
            <Select
              label="Daily bonus"
              value={String(line.daily)}
              onChange={(value) => state.patchLine(line.uid, { daily: Number(value) as Line["daily"] })}
              options={[
                { value: "0", label: "None" },
                { value: "10", label: "+10%" },
                { value: "20", label: "+20%" },
              ]}
            />
            <Num
              label="Extra bonus"
              value={line.extra}
              onChange={(extra) => state.patchLine(line.uid, { extra })}
            />
            <Num
              label="Fee / 100 nutrition"
              min={0}
              value={state.stationRate}
              onChange={(stationRate) => state.patch({ stationRate })}
            />
            <Num
              label="Base focus override"
              min={0}
              value={line.focusOverride ?? variant.focus}
              onChange={(focusOverride) => state.patchLine(line.uid, { focusOverride })}
            />
          </div>
          {line.place === "hideout" ? (
            <p className="mt-3 text-xs text-muted">
              {biomeById(line.hoBiome).kind === "city" ? (
                <>
                  {biomeById(line.hoBiome).label} is a city station, not a hideout.{" "}
                  {biomeById(line.hoBiome).favors}. Map quality and hideout level do not apply. Food is Caerleon.
                  Bags and capes are Brecilien.
                </>
              ) : (
                <>
                  {biomeById(line.hoBiome).label} favors {biomeById(line.hoBiome).favors.toLowerCase()}.{" "}
                  {biomeFavors(line.hoBiome, item.category)
                    ? item.group === "refine"
                      ? "This refine gets the hideout base plus level. Map quality does not change refining."
                      : `This craft uses the ${line.hoRegion === "roads" ? "Roads Q1" : `${biomeById(line.hoBiome).label} Q${line.hoQuality ?? 4}`} specialty, then hideout level.`
                    : "This item is not a specialty here, so only hideout level applies."}
                </>
              )}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Toggle on={line.focus} onClick={() => state.patchLine(line.uid, { focus: !line.focus })}>
              Use focus
            </Toggle>
            <Toggle on={state.premium} onClick={() => state.patch({ premium: !state.premium })}>
              Premium
            </Toggle>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Num label="Mastery" min={0} value={line.mastery} onChange={(mastery) => state.patchLine(line.uid, { mastery })} />
            <Num
              label="Specialist"
              min={0}
              value={line.specialist}
              onChange={(specialist) => state.patchLine(line.uid, { specialist })}
            />
            <Num
              label="Other specs"
              min={0}
              value={line.siblings}
              onChange={(siblings) => state.patchLine(line.uid, { siblings })}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Efficiency {exact(math.efficiency)} · focus {exact(math.focusEach)} each · {exact(math.focusTotal)} for the batch.
            Own specialist is 280 per level, mastery and each sibling specialist are 30.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-brass uppercase">Markets</h3>
            <button
              type="button"
              onClick={() => void state.loadPrices()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brass px-3 text-sm font-semibold text-ink"
            >
              <RefreshCw className={"size-4 " + (state.loading ? "animate-spin" : "")} />
              {state.loading && state.priceAt == null ? "Loading" : "Live prices"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            {state.priceAt
              ? `Live order book, refreshed ${new Date(state.priceAt).toLocaleTimeString()}. It checks again every minute.`
              : "Fetching the live order book."}
            {state.loading && state.priceAt != null ? " Updating." : ""}
          </p>
          {state.priceError ? <p className="mt-2 text-sm text-ember">{state.priceError}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Select
              label="Buy in"
              value={state.buyCity}
              onChange={(buyCity) => state.patch({ buyCity })}
              options={MARKETS.map((city) => ({ value: city, label: city }))}
            />
            <Select
              label="Sell in"
              value={state.sellCity}
              onChange={(sellCity) => state.patch({ sellCity })}
              options={MARKETS.map((city) => ({ value: city, label: city }))}
            />
            <Select
              label="Buy as"
              value={state.buyMode}
              onChange={(buyMode) => state.patch({ buyMode: buyMode as typeof state.buyMode })}
              options={[
                { value: "instant", label: "Instant (sell orders)" },
                { value: "order", label: "Buy order + 2.5%" },
              ]}
            />
            <Select
              label="Sell as"
              value={state.sellMode}
              onChange={(sellMode) => state.patch({ sellMode: sellMode as typeof state.sellMode })}
              options={[
                { value: "order", label: "Sell order, tax + 2.5%" },
                { value: "instant", label: "Instant, tax only" },
                { value: "notax", label: "No tax" },
              ]}
            />
            <Select
              label="Product quality"
              value={String(state.quality)}
              onChange={(value) => state.patch({ quality: Number(value) })}
              options={[
                { value: "1", label: "Normal" },
                { value: "2", label: "Good" },
                { value: "3", label: "Outstanding" },
                { value: "4", label: "Excellent" },
                { value: "5", label: "Masterpiece" },
              ]}
            />
            <Select
              label="Returns"
              value={state.leftover}
              onChange={(leftover) => state.patch({ leftover: leftover as typeof state.leftover })}
              options={[
                { value: "reuse", label: "Reuse, sell the last return" },
                { value: "sell", label: "Sell every return" },
              ]}
            />
          </div>
          <HourlyChart
            server={state.server}
            itemId={productId}
            itemName={`${item.name} .${variant.enchant}`}
            quality={state.quality}
          />
          <div className="mt-4 flex flex-col gap-2">
            <PriceRow
              role="Item price"
              name={`${item.name} .${variant.enchant}`}
              market={lookup(state.prices, productId, state.sellCity, state.quality, state.sellMode === "instant" ? "buy" : "sell", null).price}
              hint={lookup(state.prices, productId, state.sellCity, state.quality, state.sellMode === "instant" ? "buy" : "sell", null).from}
              value={line.productOverride}
              onChange={(productOverride) => state.patchLine(line.uid, { productOverride })}
            />
            {variant.mats.map((mat) => {
              const quote = lookup(state.prices, mat.id, state.buyCity, 1, state.buyMode === "instant" ? "sell" : "buy", null)
              const note = mat.ret ? "" : " · no return"
              return (
                <PriceRow
                  key={mat.id}
                  role={line.route === "upgrade" && (mat.id.includes("RUNE") || mat.id.includes("SOUL") || mat.id.includes("RELIC")) ? "Enchant" : "Resource"}
                  name={`${matName(mat.id)} × ${exact(mat.qty)}${note}`}
                  market={quote.price}
                  hint={quote.from}
                  value={line.matOverrides[mat.id] ?? null}
                  onChange={(value) => state.setMatOverride(line.uid, mat.id, value)}
                />
              )
            })}
            {line.route === "upgrade" ? (
              <p className="text-xs text-muted">
                .{variant.enchant || 0} only. .1 is runes, .2 is souls, .3 is relics. Capes, helmets, and boots are 96. Body armor and bags are 192. One-hand weapons are 288. Two-hand weapons are 384.
              </p>
            ) : null}
            {journal ? (
              <div className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-parchment">
                    T{journal.tier} {journal.name}
                    {math.journalRows[0] ? <span className="ml-2 text-muted">{exact(math.journalRows[0].count)} filled</span> : null}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      state.patchLine(line.uid, {
                        journal: !line.journal,
                        journalTier: item.tier,
                        journalTiers: line.journal ? [] : [item.tier],
                      })
                    }
                    className={
                      "h-11 rounded-lg border px-3 text-sm " +
                      (line.journal ? "border-brass text-brass" : "border-line text-muted")
                    }
                  >
                    {line.journal ? "Added" : "Add"}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <PriceRow
                    role="Journal price"
                    name="Empty"
                    market={emptyJournal.price}
                    hint={emptyJournal.from}
                    value={line.matOverrides[`${journal.id}_EMPTY`] ?? null}
                    onChange={(value) => state.setMatOverride(line.uid, `${journal.id}_EMPTY`, value)}
                  />
                  <PriceRow
                    role="Full journal price"
                    name="Full"
                    market={fullJournal.price}
                    hint={fullJournal.from}
                    value={line.matOverrides[`${journal.id}_FULL`] ?? null}
                    onChange={(value) => state.setMatOverride(line.uid, `${journal.id}_FULL`, value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted">
            Prices are the cheapest sell and the highest buy on the Albion Online Data Project order book. A typed
            number overrides that quote and stops following the market. Tax is 4% with Premium and 8% without. Sell
            orders also pay a 2.5% setup fee. Black Market and direct trades use “No tax”.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-brass uppercase">Shopping list</h3>
            <button type="button" onClick={() => void copyList()} className="h-11 rounded-lg border border-line px-3 text-sm">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">
            Plan profit {silver(planProfit)} · about {exact(shop.weight)} kg
          </p>
          <ul className="mt-3 flex flex-col">
            {shop.rows.map(([id, row]) => (
              <li key={id} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-sm last:border-b-0">
                <span>
                  {matName(id)}
                  <span className="ml-2 text-muted">buy {Math.ceil(row.qty)}</span>
                </span>
                <span className="tabular-nums text-muted">{silver(row.cost)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="order-first flex flex-col gap-4 lg:sticky lg:top-20 lg:order-none lg:self-start">
        <section className="rounded-lg border border-line bg-panel p-4">
          <p className="text-sm text-muted">Batch profit</p>
          <p className={"font-sans text-4xl font-semibold tabular-nums tracking-tight " + profitClass}>{silver(math.profit)}</p>
          <p className="mt-1 text-sm text-muted">
            {math.profit == null
              ? "Need prices"
              : `${silver(math.profit / Math.max(1, math.items))} each · ${math.margin == null ? "—" : pct(math.margin)} margin`}
            {evaluated?.stoodIn.length ? " · a missing city quote was filled from another market" : ""}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Stat label="Return rate" value={pct(math.rrr)} />
            <Stat label="Material" value={silver(math.materialCost)} />
            <Stat label="Station fee" value={silver(math.fee)} />
            <Stat label="Revenue" value={silver(math.revenue)} />
            <Stat label="Returns sold" value={silver(math.leftoverValue)} />
            <Stat label="Item value" value={exact(variant.value)} />
            <Stat label="Nutrition" value={exact(math.nutrition)} />
            <Stat label="Fame" value={exact(math.fameTotal)} />
            <Stat label="Focus each" value={focusEach > 0 ? exact(focusEach) : "—"} />
            <Stat label="Focus for batch" value={focusBatch > 0 ? exact(focusBatch) : "—"} />
            <Stat label="Silver / focus" value={silver(perFocus)} />
            <Stat label="Study fame / item" value={item.study ? exact(math.studyEach) : "—"} />
            <Stat
              label="Journals"
              value={math.journalRows.length ? math.journalRows.map((row) => `T${row.tier} ${exact(row.count)}`).join(" · ") : "Off"}
            />
          </dl>
          <p className="mt-3 text-xs text-muted">
            {focusEach <= 0
              ? "This craft has no focus cost."
              : line.focus
                ? "This profit includes the focus return bonus."
                : "This profit does not spend focus."}{" "}
            {focusGain == null
              ? "Need prices to value the focus."
              : `Using focus ${focusGain >= 0 ? "adds" : "loses"} ${silver(Math.abs(focusGain))} on this batch, ${silver(perFocus)} per focus. 10,000 focus is about ${silver(fromPool)}.`}
          </p>
        </section>
        <section className="rounded-lg border border-line bg-panel p-4">
          <h3 className="text-sm font-semibold text-parchment">Same recipe, other cities</h3>
          <ul className="mt-2 flex flex-col">
            {cities.map((city) => (
              <li key={city.city}>
                <button
                  type="button"
                  onClick={() => state.patchLine(line.uid, { city: city.city, place: "city" })}
                  className="flex w-full items-baseline justify-between gap-3 py-2 text-left text-sm"
                >
                  <span className={city.city === line.city && line.place === "city" ? "text-brass" : "text-parchment"}>
                    {city.city}
                    <span className="ml-2 text-xs text-muted">{pct(city.rrr)}</span>
                  </span>
                  <span className="tabular-nums text-muted">{city.profit == null ? pct(city.rrr) : silver(city.profit)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-parchment">{value}</dd>
    </div>
  )
}

function PriceRow({
  role,
  name,
  market,
  hint,
  value,
  onChange,
}: {
  role: string
  name: string
  market: number | null
  hint: string | null
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="text-muted">{role}</span>
      <span className="truncate text-parchment">
        {name}
        {hint ? <span className="ml-2 text-xs text-muted">using {hint}</span> : null}
      </span>
      <span className="tabular-nums text-base text-parchment">{market == null ? "No live order" : silver(market)}</span>
      <input
        className={fieldClass}
        inputMode="decimal"
        placeholder="Type a price to override"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        aria-label={`${role}: ${name}`}
      />
    </label>
  )
}

