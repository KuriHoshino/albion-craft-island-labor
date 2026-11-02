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
