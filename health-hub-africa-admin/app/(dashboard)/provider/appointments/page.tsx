'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, ProviderAppointment } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { CalendarCheck, RefreshCw, Check, X } from 'lucide-react'

type AppStatus = ProviderAppointment['status']

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

function patientName(appt: ProviderAppointment): string {
  if (!appt.patient) return '—'
  return `${appt.patient.firstName} ${appt.patient.lastName}`.trim() || '—'
}

function appointmentType(appt: ProviderAppointment): string {
  if (appt.isTelecare) return 'Virtual'
  return appt.serviceType || 'In-person'
}

export default function ProviderAppointmentsPage() {
  const [items, setItems] = useState<ProviderAppointment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
  const [actingId, setActingId] = useState<string | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { status?: string; page?: number; limit?: number } = { page, limit }
      if (statusTab !== 'All') params.status = statusTab
      const res = await adminApi.providerAppointments.list(params)
      setItems(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [page, statusTab])

  useEffect(() => { setPage(1) }, [statusTab])
  useEffect(() => { load() }, [load])

  const handleConfirm = useCallback(async (id: string) => {
    setActingId(id)
    try {
      await adminApi.providerAppointments.updateStatus(id, 'confirmed')
      await load()
    } finally {
      setActingId(null)
    }
  }, [load])

  const handleDecline = useCallback(async (id: string) => {
    const reason = window.prompt('Reason for declining this appointment (optional):')
    if (reason === null) return
    setActingId(id)
    try {
      await adminApi.providerAppointments.updateStatus(id, 'cancelled', reason || undefined)
      await load()
    } finally {
      setActingId(null)
    }
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              My Appointments
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {total.toLocaleString()} total
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

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
                {['Patient', 'Type', 'Scheduled', 'Status', 'Actions'].map((h) => (
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
                    {[140, 90, 120, 70, 90].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox width={w} height={14} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No appointments found.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {patientName(a)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      {appointmentType(a)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDateTime(a.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[a.status]}>{a.status.replace('_', ' ')}</Pill>
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
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
