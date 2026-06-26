'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useLiveData } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, Video, X } from 'lucide-react'

type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'missed'

interface TelecareSession {
  id: string
  patientName?: string
  patientEmail?: string
  providerName?: string
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  durationMinutes?: number
  status: SessionStatus
  recordingUrl?: string
}

const STATUS_TABS = ['All', 'active', 'scheduled', 'completed', 'cancelled', 'missed']

const STATUS_PILL: Record<SessionStatus, 'success' | 'warning' | 'neutral' | 'info' | 'emergency'> = {
  active: 'success',
  scheduled: 'info',
  completed: 'neutral',
  cancelled: 'emergency',
  missed: 'warning',
}

function TelecareDetailDialog({
  session,
  onClose,
}: {
  session: TelecareSession
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {session.patientName ?? 'TeleCare Session'}
            </h2>
            <Pill variant={STATUS_PILL[session.status] ?? 'neutral'}>{session.status}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {session.patientEmail && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Patient Email</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{session.patientEmail}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Provider</p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{session.providerName ?? '—'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Scheduled</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(session.scheduledAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Duration</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                {session.durationMinutes != null ? `${session.durationMinutes} min` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Started At</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                {session.startedAt ? formatDateTime(session.startedAt) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Ended At</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                {session.endedAt ? formatDateTime(session.endedAt) : '—'}
              </p>
            </div>
          </div>

          {session.recordingUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Recording</p>
              <a
                href={session.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: '#6DC43F' }}
              >
                <Video className="w-3.5 h-3.5" />
                View Recording
              </a>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Session ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{session.id}</p>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function TelecarePage() {
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<TelecareSession | null>(null)
  const limit = 20

  useEffect(() => { setPage(1) }, [statusTab])

  const { data: res, isInitialLoad, refresh } = useLiveData(
    () => {
      const params: { status?: string; page?: number; limit?: number } = { page, limit }
      if (statusTab !== 'All') params.status = statusTab
      return adminApi.operations.telecare(params)
    },
    [page, statusTab],
    { intervalMs: 15_000 },
  )

  const sessions: TelecareSession[] = (res?.data as TelecareSession[]) ?? []
  const total = res?.meta.total ?? 0
  const loading = isInitialLoad

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            TeleCare Sessions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total sessions
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <FilterTabs
        tabs={STATUS_TABS}
        active={statusTab}
        onChange={(t) => setStatusTab(t)}
        className="mb-4"
      />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Patient', 'Provider', 'Scheduled', 'Duration', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {[160, 120, 130, 60, 70, 40].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No telecare sessions found
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {s.patientName ?? '—'}
                      </p>
                      {s.patientEmail && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {s.patientEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {s.providerName ?? '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-sm whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(s.scheduledAt)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {s.durationMinutes != null ? `${s.durationMinutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[s.status] ?? 'neutral'}>{s.status}</Pill>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {s.recordingUrl && (
                        <a
                          href={s.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium"
                          style={{ color: '#6DC43F' }}
                        >
                          <Video className="w-3 h-3" />
                          Recording
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selected && <TelecareDetailDialog session={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
