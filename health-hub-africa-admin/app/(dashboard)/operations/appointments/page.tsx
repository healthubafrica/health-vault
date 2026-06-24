'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminProvider } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, Check, X, UserPlus } from 'lucide-react'
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
  isTelecare?: boolean
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Teleconsults need a provider before they can be
                              confirmed — the backend rejects confirm without
                              one. Show the assign control inline so admin
                              can pick a provider without leaving the page. */}
                          {a.isTelecare && !a.providerName ? (
                            <AssignProviderControl
                              appointmentId={a.id}
                              disabled={actingId !== null && actingId !== a.id}
                              loading={actingId === a.id}
                              onAssigned={() => {
                                setActingId(null)
                                refresh()
                              }}
                              onActing={() => setActingId(a.id)}
                            />
                          ) : (
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
                          )}
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

// Inline provider picker rendered in the action cell for telecare
// appointments that don't have a provider yet. Loads the provider roster
// lazily (first interaction or first hover) so a long appointments list
// doesn't trigger a roster fetch on mount.
function AssignProviderControl({
  appointmentId,
  disabled,
  loading,
  onAssigned,
  onActing,
}: {
  appointmentId: string
  disabled: boolean
  loading: boolean
  onAssigned: () => void
  onActing: () => void
}) {
  const [providers, setProviders] = useState<AdminProvider[] | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const ensureProviders = useCallback(async () => {
    if (providers !== null || loadingProviders) return
    setLoadingProviders(true)
    try {
      const res = await adminApi.providers.list({ limit: 100 })
      setProviders(res.data)
    } catch {
      setProviders([])
    } finally {
      setLoadingProviders(false)
    }
  }, [providers, loadingProviders])

  const handleChange = useCallback(async (providerId: string) => {
    if (!providerId) return
    setSelectedId(providerId)
    onActing()
    try {
      await adminApi.operations.assignAppointmentProvider(appointmentId, providerId)
      onAssigned()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to assign provider')
      setSelectedId('')
      onAssigned()
    }
  }, [appointmentId, onActing, onAssigned])

  return (
    <select
      value={selectedId}
      disabled={disabled || loading}
      onFocus={ensureProviders}
      onMouseEnter={ensureProviders}
      onChange={(e) => handleChange(e.target.value)}
      className="h-7 px-2 text-xs rounded-lg border outline-none cursor-pointer"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
      aria-label="Assign provider to appointment"
    >
      <option value="">
        {loading
          ? 'Assigning…'
          : loadingProviders
          ? 'Loading…'
          : 'Assign provider…'}
      </option>
      {providers?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title} {p.firstName} {p.lastName}
          {p.specialty ? ` — ${p.specialty}` : ''}
        </option>
      ))}
    </select>
  )
}
