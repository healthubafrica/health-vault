'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, AlertTriangle, X } from 'lucide-react'

type LabStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface LabOrder {
  id: string
  patientName?: string
  patientEmail?: string
  testName: string
  labName?: string
  status: LabStatus
  isCritical: boolean
  orderedAt: string
  resultAt?: string
  resultSummary?: string
}

const STATUS_TABS = ['All', 'pending', 'in_progress', 'completed', 'cancelled']

const STATUS_PILL: Record<LabStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
}

function LabOrderDetailDialog({
  order,
  onClose,
}: {
  order: LabOrder
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {order.patientName ?? 'Lab Order'}
            </h2>
            <Pill variant={STATUS_PILL[order.status] ?? 'neutral'}>{order.status.replace('_', ' ')}</Pill>
            {order.isCritical && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
                <AlertTriangle className="w-3 h-3" />Critical
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {order.patientEmail && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Patient Email</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{order.patientEmail}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Test Name</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{order.testName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Lab</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{order.labName ?? '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Ordered At</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(order.orderedAt)}</p>
            </div>
            {order.resultAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Result At</p>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(order.resultAt)}</p>
              </div>
            )}
          </div>

          {order.resultSummary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Result Summary</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{order.resultSummary}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Order ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{order.id}</p>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function LabsPage() {
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('All')
  const [showFlagged, setShowFlagged] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<LabOrder | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: { flagged?: boolean; page?: number; limit?: number } = { page, limit }
      if (showFlagged) params.flagged = true
      const res = await adminApi.operations.labs(params)
      const all = res.data as LabOrder[]
      const filtered = statusTab === 'All' ? all : all.filter((o) => o.status === statusTab)
      setOrders(filtered)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [page, statusTab, showFlagged])

  useEffect(() => { setPage(1) }, [statusTab, showFlagged])
  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 20_000)

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Lab Orders
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFlagged((f) => !f)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{
              borderColor: showFlagged ? 'var(--color-emergency)' : 'var(--color-border)',
              color: showFlagged ? 'var(--color-emergency)' : 'var(--color-text-muted)',
              background: showFlagged ? 'var(--color-error-bg)' : 'var(--color-surface)',
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            Critical only
          </button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
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
                {['Patient', 'Test', 'Lab', 'Ordered', 'Status', 'Result'].map((h) => (
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
                    {[160, 140, 100, 120, 70, 120].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No lab orders found
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(o)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {o.isCritical && (
                          <AlertTriangle
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: 'var(--color-emergency)' }}
                          />
                        )}
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {o.patientName ?? '—'}
                          </p>
                          {o.patientEmail && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {o.patientEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                      {o.testName}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {o.labName ?? '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(o.orderedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[o.status] ?? 'neutral'}>
                        {o.status.replace('_', ' ')}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {o.resultSummary ? (
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--color-text-muted)' }}
                          title={o.resultSummary}
                        >
                          {o.resultSummary}
                        </p>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
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

      {selected && <LabOrderDetailDialog order={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
