import { useMemo, useState } from "react"
import {
  focusFromSpecs,
  productionBonus,
  repairSilver,
  rerollPlan,
  returnRate,
  REROLL_NAMES,
  wholeReturn,
} from "@/lib/forge/formulas"
import { enchantsOf, getItem, matName, variantOf } from "@/lib/forge/lookup"
import { CRAFT_CITIES, GROUP_LABEL, HO_BIOMES, specialtyBonus } from "@/lib/forge/rules"
import { useForge } from "@/lib/forge/store"
import { Num, Select, Toggle, exact, pct, silver } from "./fields"
import { ItemPicker } from "./Picker"

const CATEGORIES = [
  ["sword", "Swords"],
  ["bow", "Bows"],
  ["axe", "Axes"],
  ["mace", "Maces"],
  ["firestaff", "Fire staffs"],
  ["froststaff", "Frost staffs"],
  ["potion", "Potions"],
  ["food", "Food"],
  ["bag", "Bags"],
  ["cape", "Capes"],
  ["offhand", "Off-hands"],
  ["ore", "Ore refining"],
  ["wood", "Wood refining"],
  ["hide", "Hide refining"],
  ["fiber", "Fiber refining"],
  ["rock", "Stone refining"],
] as const

export function ReturnsLab() {
  const [place, setPlace] = useState<"city" | "island" | "hideout">("city")
  const [city, setCity] = useState("Lymhurst")
  const [category, setCategory] = useState("sword")
  const [focus, setFocus] = useState(false)
  const [daily, setDaily] = useState(0)
  const [power, setPower] = useState(4)
  const [quality, setQuality] = useState(4)
  const [region, setRegion] = useState<"outlands" | "roads">("outlands")
  const [biome, setBiome] = useState("forest")
  const [extra, setExtra] = useState(0)
  const [runs, setRuns] = useState(10)
  const bonus = productionBonus({
    place,
    city,
    category,
    focus,
    daily,
    power,
    extra,
    biome,
    mapQuality: quality,
    region,
  })
  const rrr = returnRate(bonus.total)
  const grossBars = 16 * runs
  const grossLeather = 8 * runs
  const back = (gross: number) => wholeReturn(gross * rrr)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Return rate</h2>
        <p className="mt-2 text-sm text-muted">
          A hideout specialty craft is map quality + hideout level + an extra 3.75 per level after the first. Other crafts
          get only the level bonus. Refining also gets the level specialty. Quality does not change refining. Roads use
          quality 1.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="Where"
            value={place}
            onChange={(value) => setPlace(value as "city" | "island" | "hideout")}
            options={[
              { value: "city", label: "Royal city" },
              { value: "island", label: "Island" },
              { value: "hideout", label: "Hideout" },
            ]}
          />
          <Select
            label="Craft"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map(([id, label]) => ({ value: id, label }))}
          />
          {place === "hideout" ? (
            <>
              <Select
                label="City"
                value={biome}
                onChange={setBiome}
                options={HO_BIOMES.map((entry) => ({ value: entry.id, label: entry.label }))}
              />
              <Select
                label="Region"
                value={region}
                onChange={(value) => setRegion(value as "outlands" | "roads")}
                options={[
                  { value: "outlands", label: "Outlands" },
                  { value: "roads", label: "Roads" },
                ]}
              />
              <Select
                label="Map quality"
                value={String(region === "roads" ? 1 : quality)}
                onChange={(value) => setQuality(Number(value))}
                options={(region === "roads" ? [1] : [1, 2, 3, 4, 5, 6]).map((level) => ({
                  value: String(level),
                  label: region === "roads" ? "Q1 (Roads)" : `Q${level}`,
                }))}
              />
              <Num label="Hideout level" min={1} value={power} onChange={setPower} />
            </>
          ) : (
            <Select
              label="City"
              value={city}
              onChange={setCity}
              options={CRAFT_CITIES.map((name) => ({ value: name, label: name }))}
            />
          )}
          <Select
            label="Daily craft bonus"
            value={String(daily)}
            onChange={(value) => setDaily(Number(value))}
            options={[
              { value: "0", label: "None" },
              { value: "10", label: "×1.10" },
              { value: "20", label: "×1.20" },
            ]}
          />
          <Num label="Extra bonus" min={0} value={extra} onChange={setExtra} />
          <Num label="Crafts" min={1} value={runs} onChange={setRuns} />
        </div>
        <div className="mt-3">
          <Toggle on={focus} onClick={() => setFocus((on) => !on)}>Use focus</Toggle>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm text-muted">Resource return rate</p>
        <p className="font-sans text-4xl font-semibold tabular-nums tracking-tight text-brass">{pct(rrr)}</p>
        <p className="mt-1 text-sm text-muted">Production bonus {exact(bonus.total)}</p>
        <ul className="mt-4">
          {bonus.parts.map((part) => (
            <li key={part.label} className="flex justify-between border-b border-line py-2 text-sm">
              <span>{part.label}</span>
              <span className="tabular-nums">+{exact(part.value)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          A T4 broadsword is 16 steel bars and 8 worked leather. Over {runs} runs that is {exact(grossBars)} bars and{" "}
          {exact(grossLeather)} leather before returns, about {exact(back(grossBars))} bars and {exact(back(grossLeather))}{" "}
          leather come back.
        </p>
      </section>
    </div>
  )
}

export function FocusLab() {
  const [base, setBase] = useState(1286)
  const [mastery, setMastery] = useState(10)
  const [specialist, setSpecialist] = useState(0)
  const [siblings, setSiblings] = useState(0)
  const result = focusFromSpecs(base, mastery, specialist, siblings)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Focus cost</h2>
        <p className="mt-2 text-sm text-muted">
          Focus cost = base × 0.5 ^ (efficiency / 10000). Mastery is 30 efficiency per level, specialist is 280, and each
          other specialization in the node is 30.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Num label="Base focus" min={0} value={base} onChange={setBase} />
          <Num label="Mastery" min={0} value={mastery} onChange={setMastery} />
          <Num label="Specialist" min={0} value={specialist} onChange={setSpecialist} />
          <Num label="Other specs" min={0} value={siblings} onChange={setSiblings} />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm text-muted">Focus per craft</p>
        <p className="font-sans text-4xl font-semibold tabular-nums tracking-tight text-brass">{exact(result.cost)}</p>
        <p className="mt-2 text-sm text-muted">Efficiency {exact(result.efficiency)}</p>
        <p className="mt-4 text-sm text-muted">
          Mastery 10 and nothing else is efficiency 300, which brings a broadsword from 1,286 to about 1,259.5. Specialist 100
          on the item itself is 28,000 efficiency before mastery.
        </p>
      </section>
    </div>
  )
}

export function StudyLab() {
  const [itemId, setItemId] = useState("T4_MAIN_SWORD")
  const [enchant, setEnchant] = useState(0)
  const [premium, setPremium] = useState(true)
  const [focus, setFocus] = useState(false)
  const [daily, setDaily] = useState(0)
  const [goal, setGoal] = useState(1000000)
  const [value, setValue] = useState(384)
  const [damage, setDamage] = useState(5)
  const [mult, setMult] = useState(1.156)
  const [fixCount, setFixCount] = useState(1)
  const item = getItem(itemId)
  const variant = item ? variantOf(item, enchant, "direct") : undefined
  const dailyMult = daily === 20 ? 1.2 : daily === 10 ? 1.1 : 1
  const study = variant ? variant.fame * 2.75 * dailyMult * (focus ? 1.59 : 1) * (premium ? 1.5 : 1) : 0
  const craft = variant ? variant.fame * (premium ? 1.5 : 1) : 0
  const count = study > 0 ? Math.ceil(goal / study) : 0
  const repair = repairSilver(value, damage / 100, mult, fixCount)

  function useItem(id: string, nextEnchant: number) {
    const next = getItem(id)
    setItemId(id)
    setEnchant(nextEnchant)
    if (next) setValue(variantOf(next, nextEnchant, "direct").value)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Study and repair</h2>
        <p className="mt-2 text-sm text-muted">
          Studying destroys the item at its crafting station and pays 275% of crafting fame. Refining stations cannot
          study. Premium is ×1.5. Focus while studying is ×1.59. Repair silver is ceil(item value × missing durability ×
          16.5 × server multiplier). Quality and market price change neither.
        </p>
        <div className="mt-4">
          <ItemPicker onPick={(id) => useItem(id, 0)} compact />
        </div>
        {item && variant ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Select
              label="Enchant"
              value={String(enchant)}
              onChange={(entry) => useItem(itemId, Number(entry))}
              options={[...new Set(item.variants.filter((v) => v.route === "direct").map((v) => v.enchant))].map((level) => ({
                value: String(level),
                label: `.${level}`,
              }))}
            />
            <Select
              label="Daily craft bonus"
              value={String(daily)}
              onChange={(entry) => setDaily(Number(entry))}
              options={[
                { value: "0", label: "None" },
                { value: "10", label: "×1.10" },
                { value: "20", label: "×1.20" },
              ]}
            />
            <Num label="Fame still needed" min={0} value={goal} onChange={setGoal} />
            <Num label="Item value" min={0} value={value} onChange={setValue} />
            <Num label="Missing durability %" min={0} value={damage} onChange={setDamage} />
            <Num label="Server multiplier" min={0} step={0.001} value={mult} onChange={setMult} />
            <Num label="Items to repair" min={1} value={fixCount} onChange={setFixCount} />
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle on={premium} onClick={() => setPremium((on) => !on)}>Premium</Toggle>
          <Toggle on={focus} onClick={() => setFocus((on) => !on)}>Study with focus</Toggle>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        {item && variant ? (
          <>
            <h3 className="font-display text-xl">{item.name}</h3>
            <p className="text-sm text-muted">{item.study ? item.station : "This station does not allow studying."}</p>
            <p className="mt-4 text-sm text-muted">Study fame / item</p>
            <p className="font-sans text-4xl font-semibold tabular-nums tracking-tight text-brass">
              {item.study ? exact(study) : "—"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Craft fame / item</dt>
                <dd className="tabular-nums">{exact(craft)}</dd>
              </div>
              <div>
                <dt className="text-muted">Items to study</dt>
                <dd className="tabular-nums">{item.study ? count.toLocaleString("en-US") : "—"}</dd>
              </div>
            </dl>
            <p className="mt-6 text-sm text-muted">Repair silver</p>
            <p className="font-sans text-4xl font-semibold tabular-nums tracking-tight text-brass">{silver(repair.total)}</p>
            <p className="mt-2 text-sm text-muted">{silver(repair.each)} each, rounded up before multiplying.</p>
            <p className="mt-4 text-xs text-muted">
              Item value follows the recipe and can be typed over. A T4 broadsword is 384. At 5% damage and a 1.156
              multiplier the repair is 367.00 silver. Food and potions made only from crops show 0 craft fame.
            </p>
          </>
        ) : (
          <p className="text-muted">Pick a recipe.</p>
        )}
      </section>
    </div>
  )
}

export function CitiesLab() {
  const [category, setCategory] = useState("sword")
  const [focus, setFocus] = useState(false)
  const [biomeId, setBiomeId] = useState("forest")
  const [quality, setQuality] = useState(6)
  const [power, setPower] = useState(9)
  const biome = HO_BIOMES.find((entry) => entry.id === biomeId) ?? HO_BIOMES[0]
  const rows = useMemo(
    () =>
      CRAFT_CITIES.map((city) => {
        const bonus = productionBonus({
          place: "city",
          city,
          category,
          focus,
          daily: 0,
          power: 1,
          extra: 0,
        })
        return { city, total: bonus.total, rrr: returnRate(bonus.total), spec: specialtyBonus(city, category) }
      }),
    [category, focus],
  )
  const hideout = productionBonus({
    place: "hideout",
    city: biome.city,
    category,
    focus,
    daily: 0,
    power,
    extra: 0,
    biome: biome.id,
    mapQuality: quality,
    region: "outlands",
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">City bonuses</h2>
        <p className="mt-2 text-sm text-muted">
          Royal cities start at +18, plus a specialty when the city matches. Map quality 1–6 starts a matching craft at 1,
          6, 11, 16, 21, 26. A quality 6 level 9 specialty is +82 before focus. Roads match quality 1. Caerleon bonuses
          food. Brecilien bonuses bags, capes, and potions. Those two are cities, so hideout quality does not apply.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="Craft"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map(([id, label]) => ({ value: id, label }))}
          />
          <div className="flex items-end">
            <Toggle on={focus} onClick={() => setFocus((on) => !on)}>Use focus</Toggle>
          </div>
        </div>
        <ul className="mt-4">
          {rows.map((row) => (
            <li key={row.city} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-sm">
              <span>
                <span className="font-display text-xl">{row.city}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {row.spec ? `Specialty +${exact(row.spec)}` : "No specialty"}
                </span>
              </span>
              <span className="tabular-nums text-muted">
                +{exact(row.total)} · {pct(row.rrr)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="font-display text-xl">{biome.label}</h3>
        <p className="text-sm text-muted">{biome.favors}</p>
        <p className="mt-2 text-sm text-muted">
          {biome.kind === "city" ? "City station. Map quality does not apply." : "Hideout biome."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="City"
            value={biome.id}
            onChange={setBiomeId}
            options={HO_BIOMES.map((entry) => ({ value: entry.id, label: entry.label }))}
          />
          <Select
            label="Map quality"
            value={String(quality)}
            onChange={(value) => setQuality(Number(value))}
            options={[1, 2, 3, 4, 5, 6].map((level) => ({ value: String(level), label: `Q${level}` }))}
          />
          <Num label="Hideout level" min={1} value={power} onChange={setPower} />
        </div>
        <p className="mt-4 font-sans text-3xl font-semibold tabular-nums text-brass">+{exact(hideout.total)}</p>
        <p className="text-sm text-muted">Return rate {pct(returnRate(hideout.total))}</p>
        <ul className="mt-3">
          {hideout.parts.map((part) => (
            <li key={part.label} className="flex justify-between border-b border-line py-2 text-sm">
              <span>{part.label}</span>
              <span className="tabular-nums">+{exact(part.value)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function Codex() {
  const addLine = useForge((s) => s.addLine)
  const setView = useForge((s) => s.setView)
  const [itemId, setItemId] = useState("T4_MAIN_SWORD")
  const [enchant, setEnchant] = useState(0)
  const [route, setRoute] = useState<"direct" | "upgrade">("direct")
  const item = getItem(itemId)
  const variant = item ? variantOf(item, enchant, route) : undefined
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Recipe codex</h2>
        <p className="mt-2 text-sm text-muted">Every craft from the public item data. Pick one to read the materials.</p>
        <div className="mt-4">
          <ItemPicker
            compact
            onPick={(id) => {
              setItemId(id)
              setEnchant(0)
              setRoute("direct")
            }}
          />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        {item && variant ? (
          <>
            <h3 className="font-display text-xl">{item.name}</h3>
            <p className="text-sm text-muted">
              T{item.tier} · {item.station} · {GROUP_LABEL[item.group] ?? item.group}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Select
                label="Enchant"
                value={String(enchant)}
                onChange={(value) => setEnchant(Number(value))}
                options={enchantsOf(item).map((level) => ({ value: String(level), label: `.${level}` }))}
              />
              <Select
                label="Route"
                value={route}
                onChange={(value) => setRoute(value as "direct" | "upgrade")}
                options={[
                  { value: "direct", label: "Direct" },
                  { value: "upgrade", label: "Upgrade" },
                ]}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Base focus</dt>
                <dd className="tabular-nums">{exact(variant.focus)}</dd>
              </div>
              <div>
                <dt className="text-muted">Item value</dt>
                <dd className="tabular-nums">{exact(variant.value)}</dd>
              </div>
              <div>
                <dt className="text-muted">Craft fame / item</dt>
                <dd className="tabular-nums">{exact(variant.fame)}</dd>
              </div>
              <div>
                <dt className="text-muted">Output</dt>
                <dd className="tabular-nums">{exact(variant.output)}</dd>
              </div>
            </dl>
            <ul className="mt-4">
              {variant.mats.map((mat) => (
                <li key={mat.id + String(mat.qty)} className="flex justify-between border-b border-line py-2 text-sm">
                  <span>
                    {matName(mat.id)}
                    {mat.ret ? "" : " · not returned"}
                  </span>
                  <span className="tabular-nums">{exact(mat.qty)}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                addLine(item.id)
                setView("bench")
              }}
              className="mt-4 h-11 rounded-lg bg-brass px-4 text-sm font-semibold text-ink"
            >
              Add to the bench
            </button>
          </>
        ) : (
          <p className="text-muted">Pick a recipe.</p>
        )}
      </section>
    </div>
  )
}

export function RerollLab() {
  const [itemId, setItemId] = useState("T4_MAIN_SWORD")
  const [enchant, setEnchant] = useState(0)
  const [value, setValue] = useState(384)
  const [from, setFrom] = useState(1)
  const [target, setTarget] = useState(5)
  const [mult, setMult] = useState(1.156)
  const [count, setCount] = useState(1)
  const item = getItem(itemId)
  const variant = item ? variantOf(item, enchant, "direct") : undefined
  const goal = Math.max(from + 1, target)
  const plan = rerollPlan(value, from, goal, mult)
  const qualities = [1, 2, 3, 4, 5]

  function useVariant(id: string, nextEnchant: number) {
    const next = getItem(id)
    if (!next) return
    setItemId(id)
    setEnchant(nextEnchant)
    setValue(variantOf(next, nextEnchant, "direct").value)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Quality reroll</h2>
        <p className="mt-2 text-sm text-muted">
          At a repair station, one attempt costs item value × server multiplier × the quality modifier. Quality cannot
          fall. A Normal item always improves. Masterpiece cannot be rerolled. A miss does not improve the next odds.
        </p>
        <div className="mt-4">
          <ItemPicker compact onPick={(id) => useVariant(id, 0)} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="Enchant"
            value={String(enchant)}
            onChange={(entry) => useVariant(itemId, Number(entry))}
            options={(item ? enchantsOf(item) : [0]).map((level) => ({ value: String(level), label: `.${level}` }))}
          />
          <Num label="Item value" min={0} value={value} onChange={setValue} />
          <Select
            label="Start quality"
            value={String(from)}
            onChange={(entry) => {
              const next = Number(entry)
              setFrom(next)
              if (target <= next) setTarget(Math.min(5, next + 1))
            }}
            options={qualities.filter((level) => level < 5).map((level) => ({ value: String(level), label: REROLL_NAMES[level] }))}
          />
          <Select
            label="Stop at"
            value={String(goal)}
            onChange={(entry) => setTarget(Number(entry))}
            options={qualities.filter((level) => level > from).map((level) => ({ value: String(level), label: REROLL_NAMES[level] }))}
          />
          <Num label="Server multiplier" min={0} step={0.001} value={mult} onChange={setMult} />
          <Num label="How many items" min={1} value={count} onChange={setCount} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {item ? `${item.name} .${enchant} item value ${exact(variant?.value ?? 0)}. ` : ""}
          A T4.0 broadsword is 384. With multiplier 1.156, one Normal attempt is 1,953.18 silver, and reaching Excellent
          or better averages 3.81 attempts and about 9,640 silver.
        </p>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm text-muted">Expected silver to {REROLL_NAMES[goal]}</p>
        <p className="font-sans text-4xl font-semibold tabular-nums tracking-tight text-brass">{silver(plan.silver * count)}</p>
        <p className="mt-2 text-sm text-muted">
          {plan.attempts.toLocaleString("en-US", { maximumFractionDigits: 2 })} attempts each · {silver(plan.silver)} silver
          each · one attempt {silver(plan.attempt)}
        </p>
        <p className="mt-1 text-sm text-muted">
          Chance the next roll is already {REROLL_NAMES[goal]} or better: {pct(plan.hit)}
        </p>
        <ul className="mt-4">
          {qualities.map((level) => {
            const chance = plan.chances[level] ?? 0
            if (chance <= 0) return null
            return (
              <li key={level} className="flex justify-between border-b border-line py-2 text-sm">
                <span>
                  {REROLL_NAMES[level]}
                  {level === from ? " · stays" : ""}
                </span>
                <span className="tabular-nums">{pct(chance)}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Modifiers: Normal ×4.4, Good ×5.5, Outstanding ×6.6, Excellent ×27.5. Same server multiplier as repair.
        </p>
      </section>
    </div>
  )
}