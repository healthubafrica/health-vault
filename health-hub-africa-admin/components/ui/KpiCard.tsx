import { Pill } from './Pill'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  pillText?: string
  pillVariant?: 'success' | 'warning' | 'neutral' | 'emergency'
  icon?: ReactNode
  subtext?: string
}

export function KpiCard({ label, value, unit, pillText, pillVariant = 'success', icon, subtext }: KpiCardProps) {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-2 shadow-sm"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--color-text-faint)' }}>{icon}</span>}
      </div>
      <div className="flex items-end gap-1.5">
        <span
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs pb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pillText && <Pill variant={pillVariant}>{pillText}</Pill>}
        {subtext && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
