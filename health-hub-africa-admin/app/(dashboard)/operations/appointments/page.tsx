'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, Check, X } from 'lucide-react'
import { useLiveData } from '@/lib/hooks/useLiveData'

type AppStatus = 'requested' | 'confirmed' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

interface Appointment {
  id: string
  patientName?: string
  patientEmail?: string
  providerName?: string
  type: string
  scheduledAt: string
  status: AppStatus
}

const STATUS_TABS = ['All', 'requested', 'confirmed', 'upcoming', 'in_progress', 'completed', 'cancelled', 'no_show']

const STATUS_PILL: Record<AppStatus, 'success' | 'warning' | 'neutral' | 'info' | 'emergency'> = {
  requested: 'info',
  confirmed: 'info',
  upcoming: 'success',
  in_progress: 'warning',
  completed: 'neutral',
  cancelled: 'emergency',
  no_show: 'warning',
}

export default function AppointmentsPage() {
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
  const [actingId, setActingId] = useState<string | null>(null)
  const limit = 20

  useEffect(() => { setPage(1) }, [statusTab])

  const { data: res, isInitialLoad, refresh } = useLiveData(
    () => {
      const params: { status?: string; page?: number; limit?: number } = { page, limit }
      if (statusTab !== 'All') params.status = statusTab
      return adminApi.operations.appointments(params)
    },
    [page, statusTab],
    { intervalMs: 20_000 },
  )

  const items: Appointment[] = (res?.data as Appointment[]) ?? []
  const total = res?.meta.total ?? 0
  const loading = isInitialLoad

  const handleConfirm = useCallback(async (id: string) => {
    setActingId(id)
    try {
      await adminApi.operations.updateAppointmentStatus(id, 'confirmed')
      refresh()
    } finally {
      setActingId(null)
    }
  }, [refresh])

  const handleDecline = useCallback(async (id: string) => {
    const reason = window.prompt('Reason for declining this appointment (optional):')
    if (reason === null) return
    setActingId(id)
    try {
      await adminApi.operations.updateAppointmentStatus(id, 'cancelled', reason || undefined)
      refresh()
    } finally {
      setActingId(null)
    }
  }, [refresh])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Appointments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total
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
                {['Patient', 'Provider', 'Type', 'Scheduled', 'Status', 'Actions'].map((h) => (
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
                    {[140, 100, 90, 120, 70, 90].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No appointments found
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {a.patientName ?? '—'}
                      </p>
                      {a.patientEmail && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {a.patientEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {a.providerName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {a.type}
                    </td>
                    <td
                      className="px-4 py-3 text-sm whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(a.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[a.status] ?? 'neutral'}>
                        {a.status.replace('_', ' ')}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      {a.status === 'requested' && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            loading={actingId === a.id}
                            disabled={actingId !== null && actingId !== a.id}
                            onClick={() => handleConfirm(a.id)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Confirm
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actingId === a.id}
                            disabled={actingId !== null && actingId !== a.id}
                            onClick={() => handleDecline(a.id)}
                          >
                            <X className="w-3.5 h-3.5" />
                            Decline
                          </Button>
                        </div>
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
              Page {page} of {totalPages} · {total.toLocaleString()} appointments
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
    </div>
  )
}
