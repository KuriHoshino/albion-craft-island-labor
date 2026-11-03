import { useMemo, useState } from "react"
import { FARM_ROWS, ISLAND_CITIES, farmPlan, type FarmPlace, type IslandCity } from "@/lib/forge/farming"
import { Num, Select, Toggle, exact, pct } from "./fields"

const PLACES: { id: FarmPlace; label: string; slots: number }[] = [
  { id: "farm", label: "Crops", slots: 9 },
  { id: "herbgarden", label: "Herbs", slots: 9 },
  { id: "pasture", label: "Pasture", slots: 9 },
  { id: "kennel", label: "Kennel", slots: 4 },
]

export function FarmLab() {
  const [place, setPlace] = useState<FarmPlace>("farm")
  const [itemId, setItemId] = useState("T1_FARM_CARROT_SEED")
  const [count, setCount] = useState(9)
  const [farming, setFarming] = useState(0)
  const [spec, setSpec] = useState(0)
  const [premium, setPremium] = useState(false)
  const [favorite, setFavorite] = useState(true)
  const [city, setCity] = useState<IslandCity | "">("Lymhurst")
  const rows = useMemo(() => FARM_ROWS.filter((row) => row.place === place), [place])
  const row = rows.find((entry) => entry.id === itemId) ?? rows[0]
  const plan = row ? farmPlan(row, count, farming, spec, premium, favorite, city) : null
  const raising = row?.place === "pasture" || row?.place === "kennel"

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Farming and breeding</h2>
        <p className="mt-2 text-sm text-muted">
          A crop plot or pasture holds 9. A kennel holds 4. Focus is 1,000 with no spec and 125 when farming and the crop
          or animal are both 100.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="Where"
            value={place}
            onChange={(value) => {
              const next = value as FarmPlace
              const first = FARM_ROWS.find((entry) => entry.place === next)
              setPlace(next)
              if (first) setItemId(first.id)
              setCount(PLACES.find((entry) => entry.id === next)?.slots ?? 9)
            }}
            options={PLACES.map((entry) => ({ value: entry.id, label: entry.label }))}
          />
          <Select
            label="What"
            value={row?.id ?? ""}
            onChange={setItemId}
            options={rows.map((entry) => ({ value: entry.id, label: entry.name }))}
          />
          <Num label="Count" min={1} value={count} onChange={setCount} />
          <Num label="Farming" min={0} value={farming} onChange={(value) => setFarming(Math.min(100, value))} />
          <Num label="Spec" min={0} value={spec} onChange={(value) => setSpec(Math.min(100, value))} />
          <Select
            label="Island city"
            value={city}
            onChange={(value) => setCity(value as IslandCity)}
            options={ISLAND_CITIES.map((name) => ({ value: name, label: name }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle on={premium} onClick={() => setPremium((on) => !on)}>
            Premium
          </Toggle>
          {row?.favorite ? (
            <Toggle on={favorite} onClick={() => setFavorite((on) => !on)}>
              Favorite food
            </Toggle>
          ) : null}
        </div>
      </section>
      {row && plan ? (
        <section className="rounded-lg border border-line bg-panel p-4">
          <p className="text-sm text-muted">{row.name}</p>
          <dl className="mt-4 flex flex-col">
            <Result
              label={raising ? "Raise time" : "Time to finish"}
              value={span(plan.growthHours)}
              note="Premium does not change this timer."
            />
            {raising ? null : (
              <Result
                label="Watering"
                value={exact(plan.waterings)}
                note="One watering per plant. That only raises the seed return. The plant grows on its own."
              />
            )}
            {raising ? null : (
              <Result
                label="Harvest"
                value={exact(plan.harvest)}
                note={premium ? "Premium doubles the crop. 6 to 12 each, average shown." : "3 to 6 each, average shown. Premium doubles this, not the time."}
              />
            )}
            <Result
              label="Island bonus"
              value={plan.islandBonus ? "+10%" : "None"}
              note={
                plan.cities.length
                  ? `${raising ? "+10% eggs or milk" : "+10% harvest"} on a ${plan.cities.join(" or ")} island${plan.islandBonus ? "" : ". This city is not one of them"}`
                  : "This one has no royal island bonus"
              }
            />
            <Result
              label={row.group === "breed" ? "Offspring" : "Seeds back"}
              value={pct(plan.full)}
              note={`${pct(plan.bare)} with no focus · +${pct(row.careBonus)} each time you ${row.group === "breed" ? "nurture" : "water"} · ${exact(plan.expected)} expected`}
            />
            <Result label="Focus" value={exact(plan.focus)} note={`${exact(plan.eachFocus)} each`} />
            <Result
              label="Food"
              value={plan.food ? `${exact(plan.food.total)} ${plan.food.name}` : "—"}
              note={
                plan.food
                  ? `${exact(plan.food.each)} per feeding · ${exact(plan.food.feedings)} feedings · ${exact(plan.food.total / Math.max(1, Math.floor(count)))} for one animal. Same with or without premium. If the food runs out, growth stops.${
                      plan.food.guide && plan.food.guide !== plan.food.total / Math.max(1, Math.floor(count))
                        ? ` The breeding guide lists ${exact(plan.food.guide)} because it counts meat like a crop.`
                        : ""
                    }`
                  : "Crops do not eat"
              }
            />
          </dl>
          {plan.nurtures ? (
            <p className="mt-3 text-xs text-muted">
              {exact(row.actions)} nurtures per animal, {exact(plan.nurtures)} in total. Nurture only raises the offspring return. Each 100% is one baby. Anything past 100% is the chance of a second.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function span(hours: number) {
  const total = Math.round(hours)
  const days = Math.floor(total / 24)
  const rest = total % 24
  const dayLabel = days === 1 ? "1 day" : `${days} days`
  const hourLabel = rest === 1 ? "1 hour" : `${rest} hours`
  if (!days) return hourLabel
  if (!rest) return dayLabel
  return `${dayLabel} ${hourLabel}`
}

function Result({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-sans text-2xl font-semibold tabular-nums tracking-tight text-brass">{value}</dd>
      <p className="text-xs text-muted">{note}</p>
    </div>
  )
}
