'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, X } from 'lucide-react'

// Mirrors the Prisma ExpertReviewStatus enum — the endpoint returns these
// raw values, and the status tab filter is passed through verbatim, so any
// invented vocabulary here silently breaks both filtering and pills.
type ReviewStatus =
  | 'submitted'
  | 'under_review'
  | 'specialist_assigned'
  | 'in_consultation'
  | 'report_ready'
  | 'closed'
  | 'cancelled'

interface ExpertReviewCase {
  id: string
  patientName?: string
  patientEmail?: string
  chiefComplaint: string
  assignedCoordinator?: string
  specialtyRequired?: string
  status: ReviewStatus
  priority: 'high' | 'medium' | 'low'
  submittedAt: string
  completedAt?: string
}

const STATUS_TABS = ['All', 'submitted', 'under_review', 'specialist_assigned', 'in_consultation', 'report_ready', 'closed', 'cancelled']

const STATUS_PILL: Record<ReviewStatus, 'warning' | 'info' | 'success' | 'neutral' | 'emergency'> = {
  submitted: 'warning',
  under_review: 'info',
  specialist_assigned: 'info',
  in_consultation: 'info',
  report_ready: 'success',
  closed: 'neutral',
  cancelled: 'emergency',
}

const STATUS_OPTIONS: ReviewStatus[] = [
  'submitted', 'under_review', 'specialist_assigned', 'in_consultation', 'report_ready', 'closed', 'cancelled',
]

const PRIORITY_PILL: Record<'high' | 'medium' | 'low', 'emergency' | 'warning' | 'neutral'> = {
  high: 'emergency',
  medium: 'warning',
  low: 'neutral',
}

function ExpertReviewDetailDialog({
  item,
  onClose,
  onUpdated,
}: {
  item: ExpertReviewCase
  onClose: () => void
  onUpdated: () => void
}) {
  const [providers, setProviders] = useState<Array<{ id: string; firstName: string; lastName: string; specialty?: string }>>([])
  const [specialistId, setSpecialistId] = useState('')
  const [newStatus, setNewStatus] = useState<ReviewStatus>(item.status)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.providers.list({ limit: 100 })
      .then(res => setProviders(res.data as Array<{ id: string; firstName: string; lastName: string; specialty?: string }>))
      .catch(() => setProviders([]))
  }, [])

  const handleAssign = async () => {
    if (!specialistId) return
    setSaving(true)
    try {
      await adminApi.operations.assignSpecialist(item.id, specialistId)
      onUpdated()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not assign specialist')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (newStatus === item.status) return
    setSaving(true)
    try {
      await adminApi.operations.updateExpertReviewStatus(item.id, newStatus)
      onUpdated()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {item.patientName ?? 'Expert Review Case'}
            </h2>
            <Pill variant={STATUS_PILL[item.status] ?? 'neutral'}>{item.status.replace('_', ' ')}</Pill>
            <Pill variant={PRIORITY_PILL[item.priority] ?? 'neutral'}>{item.priority} priority</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {item.patientEmail && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Patient Email</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{item.patientEmail}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Chief Complaint</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{item.chiefComplaint}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Specialty Required</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{item.specialtyRequired ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Assigned Coordinator</p>
              {item.assignedCoordinator ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={item.assignedCoordinator} size="xs" />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{item.assignedCoordinator}</span>
                </div>
              ) : <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>Unassigned</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Submitted</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(item.submittedAt)}</p>
            </div>
            {item.completedAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Completed</p>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(item.completedAt)}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Case ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{item.id}</p>
          </div>
        </div>

        {/* Coordination actions */}
        <div className="px-5 py-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Assign Specialist</p>
              <select
                className="w-full text-sm rounded-lg border px-2.5 py-2"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                value={specialistId}
                onChange={(e) => setSpecialistId(e.target.value)}
              >
                <option value="">Select a provider…</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}{p.specialty ? ` — ${p.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={handleAssign} disabled={saving || !specialistId}>Assign</Button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Update Status</p>
              <select
                className="w-full text-sm rounded-lg border px-2.5 py-2"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ReviewStatus)}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={handleStatusUpdate} disabled={saving || newStatus === item.status}>Update</Button>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function ExpertReviewPage() {
  const [cases, setCases] = useState<ExpertReviewCase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ExpertReviewCase | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: { status?: string; page?: number; limit?: number } = { page, limit }
      if (statusTab !== 'All') params.status = statusTab
      const res = await adminApi.operations.expertReview(params)
      setCases(res.data as ExpertReviewCase[])
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [page, statusTab])

  useEffect(() => { setPage(1) }, [statusTab])
  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 20_000)

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Expert Review
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} cases
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
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
                {['Patient', 'Chief Complaint', 'Specialty', 'Coordinator', 'Priority', 'Status', 'Submitted'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {[160, 180, 80, 120, 60, 70, 110].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No expert review cases found
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {c.patientName ?? '—'}
                      </p>
                      {c.patientEmail && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {c.patientEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p
                        className="text-sm truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                        title={c.chiefComplaint}
                      >
                        {c.chiefComplaint}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {c.specialtyRequired ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.assignedCoordinator ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={c.assignedCoordinator} size="xs" />
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {c.assignedCoordinator}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={PRIORITY_PILL[c.priority] ?? 'neutral'}>{c.priority}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[c.status] ?? 'neutral'}>
                        {c.status.replace('_', ' ')}
                      </Pill>
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(c.submittedAt)}
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

      {selected && <ExpertReviewDetailDialog item={selected} onClose={() => setSelected(null)} onUpdated={load} />}
    </div>
  )
}
