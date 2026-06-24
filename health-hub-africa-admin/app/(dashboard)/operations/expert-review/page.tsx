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
import { RefreshCw } from 'lucide-react'

type ReviewStatus = 'pending' | 'assigned' | 'in_review' | 'completed' | 'escalated'

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

const STATUS_TABS = ['All', 'pending', 'assigned', 'in_review', 'completed', 'escalated']

const STATUS_PILL: Record<ReviewStatus, 'warning' | 'info' | 'success' | 'neutral' | 'emergency'> = {
  pending: 'warning',
  assigned: 'info',
  in_review: 'info',
  completed: 'success',
  escalated: 'emergency',
}

const PRIORITY_PILL: Record<'high' | 'medium' | 'low', 'emergency' | 'warning' | 'neutral'> = {
  high: 'emergency',
  medium: 'warning',
  low: 'neutral',
}

export default function ExpertReviewPage() {
  const [cases, setCases] = useState<ExpertReviewCase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
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
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
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
    </div>
  )
}
