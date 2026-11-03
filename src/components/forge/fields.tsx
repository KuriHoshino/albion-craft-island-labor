import type { ReactNode } from "react"

export const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-ink px-3 text-base text-parchment outline-none focus-visible:border-brass"
export const labelClass = "flex min-w-0 flex-col gap-1 text-sm text-muted"

export function silver(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  const cents = Math.round(value * 100) / 100
  const sign = cents < 0 ? "-" : ""
  return (
    sign +
    Math.abs(cents).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export function exact(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

/** How old a market timestamp is, such as "2h ago". */
export function priceAge(stamp: string | undefined): string {
  if (!stamp) return ""
  const time = Date.parse(stamp.endsWith("Z") || stamp.includes("+") ? stamp : `${stamp}Z`)
  if (Number.isNaN(time)) return ""
  const mins = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** Age written the way a market order is aged, such as "11.9h old". */
export function orderAge(stamp: string | undefined): string {
  if (!stamp) return ""
  const time = Date.parse(stamp.endsWith("Z") || stamp.includes("+") ? stamp : `${stamp}Z`)
  if (Number.isNaN(time)) return ""
  const hours = Math.max(0, (Date.now() - time) / 3_600_000)
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m old`
  if (hours < 48) return `${hours.toFixed(1)}h old`
  return `${Math.floor(hours / 24)}d old`
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Num({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
}) {
  return (
    <Field label={label}>
      <input
        className={fieldClass}
        type="number"
        inputMode="decimal"
        min={min}
        step={step ?? 1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
      />
    </Field>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Field label={label}>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={
        "inline-flex h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium " +
        (on ? "border-brass bg-brass text-ink" : "border-line bg-panel text-parchment")
      }
    >
      {children}
    </button>
  )
}
