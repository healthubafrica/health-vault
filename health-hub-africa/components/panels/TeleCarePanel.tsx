'use client'

import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { telecare } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function TeleCarePanel() {
  const { data: sessionsRes } = useApi(() => telecare.list())
  const sessions = sessionsRes?.data ?? []

  const nextSession = sessions.find(s => s.status === 'scheduled' || s.status === 'active')
  const lastCompleted = [...sessions]
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Provider Info
      </p>

      <div className="p-3 rounded-xl border flex flex-col gap-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Avatar seed="Care Provider" size="md" shape="rounded" alt="Care provider" />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Your Care Provider</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Connects when your session starts</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Next Session</span>
          {nextSession ? (
            <Pill variant="success">Scheduled</Pill>
          ) : (
            <Pill variant="neutral">None scheduled</Pill>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Last Session</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
            {lastCompleted ? formatDate(lastCompleted.scheduledAt) : '—'}
          </span>
        </div>
      </div>

      <Button size="sm" fullWidth>Schedule Next Session</Button>
    </div>
  )
}
