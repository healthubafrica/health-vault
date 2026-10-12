'use client'

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer_not_to_say', label: 'Prefer not to say' },
] as const

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
}

/** Optional provider gender picker; empty string means "not set". */
export function GenderSelect({ value, onChange, label = 'Gender (optional)' }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 rounded-xl text-sm border outline-none cursor-pointer"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
      >
        <option value="">Not set</option>
        {GENDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
