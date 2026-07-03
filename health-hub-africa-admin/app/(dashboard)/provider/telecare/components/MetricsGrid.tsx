'use client'

import { formatDuration, type TelecareMetrics } from './helpers'

export function MetricsGrid({ metrics }: { metrics: TelecareMetrics }) {
  const avgDuration = metrics.avgDurationSeconds !== null
    ? formatDuration(Math.round(metrics.avgDurationSeconds))
    : '—'

  const cards = [
    { label: 'Total Sessions', value: String(metrics.total) },
    { label: 'Completed', value: String(metrics.completed) },
    { label: 'Avg Duration', value: avgDuration },
    { label: 'Missed / Cancelled', value: String(metrics.missed + metrics.cancelled) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl px-4 py-3 flex flex-col gap-1"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}
