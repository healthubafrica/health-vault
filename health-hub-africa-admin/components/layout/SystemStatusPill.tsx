'use client'

import Link from 'next/link'
import { adminApi, type CheckStatus, type SystemStatus } from '@/lib/api'
import { useLiveData } from '@/lib/hooks/useLiveData'

export const STATUS_STYLE: Record<CheckStatus, { color: string; bg: string; label: string }> = {
  ok: { color: '#6DC43F', bg: 'var(--color-success-bg)', label: 'Normal' },
  warn: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'Warning' },
  down: { color: 'var(--color-emergency)', bg: 'var(--color-error-bg)', label: 'Down' },
  unknown: { color: 'var(--color-text-muted)', bg: 'var(--color-bg)', label: 'Unknown' },
}

export function summarize(status: SystemStatus) {
  const down = status.checks.filter((c) => c.status === 'down').length
  const warn = status.checks.filter((c) => c.status === 'warn').length
  if (down) return `${down} down${warn ? `, ${warn} warning${warn > 1 ? 's' : ''}` : ''}`
  if (warn) return `${warn} warning${warn > 1 ? 's' : ''}`
  if (status.overall === 'unknown') return 'Some checks unavailable'
  return 'All systems normal'
}

/** Header button: green / amber / red summary that opens the System Status page. */
export function SystemStatusPill() {
  const { data } = useLiveData(() => adminApi.system.status(), [], { intervalMs: 60_000 })
  const style = STATUS_STYLE[data?.overall ?? 'unknown']

  return (
    <Link
      href="/system/status"
      className="flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ background: style.bg, color: style.color }}
      title="Open System Status"
    >
      <span className="w-2 h-2 rounded-full" style={{ background: style.color }} aria-hidden />
      {data ? summarize(data) : 'Checking systems…'}
    </Link>
  )
}
