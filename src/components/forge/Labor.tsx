import { useState } from "react"
import { GUILD_ISLANDS, ISLANDS, LABOR_JOBS, guildHousePlots, guildSlots, scoreHouses, upgradePath, yieldRate, ENCHANT } from "@/lib/forge/labor"
import { Num, Select, exact, pct } from "./fields"

const TIERS = [2, 3, 4, 5, 6, 7, 8]
const EMPTY: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 2, 8: 3 }

export function LaborLab() {
  const [jobId, setJobId] = useState("wood")
  const [where, setWhere] = useState<"island" | "guild">("island")
  const [islandTier, setIslandTier] = useState(6)
  const [counts, setCounts] = useState<Record<number, number>>(EMPTY)
  const [hallTier, setHallTier] = useState(8)
  const [journalTier, setJournalTier] = useState<Record<number, number>>({})
  const [happy, setHappy] = useState<Record<number, number>>({})
  const [hallJournal, setHallJournal] = useState(8)
  const [hallHappy, setHallHappy] = useState(0)
  const [upgradeKind, setUpgradeKind] = useState<"house" | "hall">("house")
  const [upgradeFrom, setUpgradeFrom] = useState(1)
  const [upgradeTo, setUpgradeTo] = useState(8)
  const job = LABOR_JOBS.find((entry) => entry.id === jobId) ?? LABOR_JOBS[0]
  const island = ISLANDS.find((entry) => entry.tier === islandTier) ?? ISLANDS[5]
  const guild = guildHousePlots(islandTier)
  const mix = scoreHouses(job, counts, journalTier, happy)
  const hallLabor = Math.min(hallTier, Math.max(2, hallJournal))
  const hallRate = yieldRate(hallLabor, hallHappy)
  const hallPeople = guildSlots(hallTier)
  const hallBase = job.loot[hallLabor]
  const hallJournals = hallPeople
  const hallAmount = hallBase * hallRate * hallPeople
  const path = upgradePath(upgradeKind, upgradeFrom, upgradeTo)
  const over = where === "island" ? mix.houses > island.plots : mix.houses > guild.houses
  const tiers = TIERS.map((value) => ({ value: String(value), label: `T${value}` }))
  const fromOptions = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
    value: String(value),
    label: value === 1 ? "T1, not built" : `T${value}`,
  }))
  const toOptions = [2, 3, 4, 5, 6, 7, 8]
    .filter((value) => value > upgradeFrom)
    .map((value) => ({ value: String(value), label: `T${value}` }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-display text-2xl">Island laborers</h2>
        <p className="mt-2 text-sm text-muted">
          Set the houses you have. Each house is separate. A guild island has one hall.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="Where"
            value={where}
            onChange={(value) => setWhere(value as "island" | "guild")}
            options={[
              { value: "island", label: "Island" },
              { value: "guild", label: "Guild island" },
            ]}
          />
          <Select
            label="Laborer"
            value={job.id}
            onChange={setJobId}
            options={LABOR_JOBS.map((entry) => ({ value: entry.id, label: entry.name }))}
          />
          {where === "island" ? (
            <Select
              label="Island level"
              value={String(island.tier)}
              onChange={(value) => setIslandTier(Number(value))}
              options={ISLANDS.map((entry) => ({ value: String(entry.tier), label: `T${entry.tier}` }))}
            />
          ) : (
            <>
              <Select
                label="Island level"
                value={String(guild.tier)}
                onChange={(value) => setIslandTier(Number(value))}
                options={GUILD_ISLANDS.map((entry) => ({ value: String(entry.tier), label: `T${entry.tier}` }))}
              />
              <Select label="Guild hall" value={String(hallTier)} onChange={(value) => setHallTier(Number(value))} options={tiers} />
            </>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map((tier) => (
            <Num
              key={tier}
              label={`T${tier} houses`}
              min={0}
              value={counts[tier] ?? 0}
              onChange={(value) => setCounts((current) => ({ ...current, [tier]: value }))}
            />
          ))}
        </div>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {where === "guild" ? (
            <li className="border-b border-line pb-3">
              <div className="flex justify-between gap-3">
                <span>Guild hall</span>
                <span className="text-muted">{exact(hallJournals)} journals</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Select
                  label="Laborer"
                  value={String(hallLabor)}
                  onChange={(value) => setHallJournal(Number(value))}
                  options={TIERS.filter((tier) => tier <= hallTier).map((tier) => ({ value: String(tier), label: `T${tier}` }))}
                />
                <Num
                  label="Trophy happiness"
                  min={0}
                  value={hallHappy}
                  onChange={(value) => setHallHappy(Math.min(100, Math.max(0, value)))}
                />
              </div>
              <p className="mt-2 text-muted">
                {exact(hallAmount)} {job.returns} · {pct(hallRate)}
              </p>
              {job.id === "mercenary" ? null : <Chances amount={hallAmount} />}
            </li>
          ) : null}
          {mix.rows.map((row) => (
            <li key={row.tier} className="border-b border-line pb-3">
              <div className="flex justify-between gap-3">
                <span>
                  {exact(row.houses)} × T{row.tier}
                </span>
                <span className="text-muted">{exact(row.journals)} journals</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Select
                  label="Laborer"
                  value={String(row.labor)}
                  onChange={(value) => setJournalTier((current) => ({ ...current, [row.tier]: Number(value) }))}
                  options={TIERS.filter((tier) => tier <= row.tier).map((tier) => ({ value: String(tier), label: `T${tier}` }))}
                />
                <Num
                  label="Trophy happiness"
                  min={0}
                  value={happy[row.tier] ?? 0}
                  onChange={(value) => setHappy((current) => ({ ...current, [row.tier]: Math.min(100, Math.max(0, value)) }))}
                />
              </div>
              <p className="mt-2 text-muted">
                {exact(row.amount)} {job.returns} · {pct(row.rate)}
              </p>
              {job.id === "mercenary" ? null : <Chances amount={row.amount} />}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm text-muted">{where === "guild" ? "Guild island" : `T${island.tier} island`}</p>
        {where === "island" ? (
          <dl className="mt-4 flex flex-col">
            <Result
              label="Houses"
              value={exact(mix.houses)}
              note={
                over
                  ? `This island only has ${exact(island.plots)} plots.`
                  : `${exact(island.plots)} plots. ${exact(island.large)} large${island.small ? `, ${exact(island.small)} small` : ""}.`
              }
            />
            <Result label="Laborers" value={exact(mix.people)} note="A house holds 1, then 2, then 3 from T5." />
            <Result label="Journals" value={exact(mix.journals)} note="One filled journal per laborer, the laborer's tier." />
            <Result label="Return" value="22 hours" note="100% with a matching bed and table. Trophy happiness stacks on that. A hall uses the same rate." />
            <Result
              label={job.family === "Mercenary" ? "Silver" : "Materials"}
              value={exact(mix.amount)}
              note={job.returns}
            />
          </dl>
        ) : (
          <dl className="mt-4 flex flex-col">
            <Result label="Guild hall" value={`T${hallTier}`} note="One hall. A guild island cannot farm." />
            <Result
              label="Houses"
              value={exact(mix.houses)}
              note={
                over
                  ? `This guild island fits ${exact(guild.houses)} houses besides the hall.`
                  : `${exact(guild.houses)} houses fit besides the hall.`
              }
            />
            <Result
              label="Laborers"
              value={exact(hallPeople + mix.people)}
              note={`${exact(hallPeople)} in the hall. 15 is the hall maximum. ${exact(mix.people)} in houses.`}
            />
            <Result label="Journals" value={exact(hallJournals + mix.journals)} note={`${exact(hallJournals)} for the hall. ${exact(mix.journals)} for the houses.`} />
            <Result label="Return" value="22 hours" note="100% with a matching bed and table. Trophy happiness stacks on that. A hall uses the same rate." />
            <Result
              label={job.family === "Mercenary" ? "Silver" : "Materials"}
              value={exact(hallAmount + mix.amount)}
              note={`${exact(hallAmount)} from the hall. ${exact(mix.amount)} from the houses.`}
            />
          </dl>
        )}
      </section>
      <section className="rounded-lg border border-line bg-panel p-4 lg:col-span-2">
        <h2 className="font-display text-2xl">Upgrade</h2>
        <p className="mt-2 text-sm text-muted">
          Houses and guild halls start at T2. T1 means it is not built yet.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select
            label="Building"
            value={upgradeKind}
            onChange={(value) => setUpgradeKind(value as "house" | "hall")}
            options={[
              { value: "house", label: "House" },
              { value: "hall", label: "Guild hall" },
            ]}
          />
          <Select
            label="From"
            value={String(upgradeFrom)}
            onChange={(value) => {
              const next = Number(value)
              setUpgradeFrom(next)
              if (upgradeTo <= next) setUpgradeTo(Math.min(8, next + 1))
            }}
            options={fromOptions}
          />
          <Select label="To" value={String(upgradeTo)} onChange={(value) => setUpgradeTo(Number(value))} options={toOptions} />
        </div>
        <dl className="mt-4 flex flex-col">
          <Result
            label="Rough logs"
            value={exact(path.wood)}
            note={`${exact(path.stone)} rough stone · ${exact(path.blocks)} stone blocks`}
          />
        </dl>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {path.steps.map((step) => (
            <li key={step.tier} className="flex justify-between gap-3 border-b border-line py-2">
              <span>T{step.tier}</span>
              <span className="text-muted">
                {exact(step.wood)} logs · {exact(step.stone)} stone · {exact(step.blocks)} {step.block}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Chances({ amount }: { amount: number }) {
  return (
    <ul className="mt-2 text-xs text-muted">
      {ENCHANT.map((roll) => (
        <li key={roll.label} className="flex justify-between gap-3 py-0.5">
          <span>
            {roll.label} {pct(roll.weight / 2000)}
          </span>
          <span>{exact(amount * (roll.weight / 2000))}</span>
        </li>
      ))}
    </ul>
  )
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
