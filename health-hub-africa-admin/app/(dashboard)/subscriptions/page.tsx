'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminSubscription } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

const STATUS_TABS = ['all', 'active', 'expired', 'cancelled']

function statusVariant(status: string): 'success' | 'neutral' | 'warning' | 'emergency' {
  if (status === 'active') return 'success'
  if (status === 'expired') return 'warning'
  if (status === 'cancelled') return 'emergency'
  return 'neutral'
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState('all')
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof adminApi.subscriptions.list>[0] = { page, limit }
      if (statusTab !== 'all') params.status = statusTab
      const res = await adminApi.subscriptions.list(params)
      setSubs(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [page, statusTab])

  useEffect(() => { load() }, [load])

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('Cancel this subscription? This cannot be undone.')) return
    setCancelling(id)
    try {
      await adminApi.subscriptions.cancel(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setCancelling(null)
    }
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Subscriptions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total subscriptions
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      <FilterTabs
        tabs={STATUS_TABS}
        active={statusTab}
        onChange={(t) => { setStatusTab(t); setPage(1) }}
        className="mb-4"
      />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Patient', 'HHA ID', 'Plan', 'Tier', 'Status', 'Started', 'Expires', 'Auto-renew', ''].map((h) => (
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
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 0 ? 120 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {s.patientName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {s.hhaPatientId}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {s.planName}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant="neutral">{s.tier}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={statusVariant(s.status)}>{s.status}</Pill>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(s.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(s.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={s.autoRenew ? 'success' : 'neutral'}>
                        {s.autoRenew ? 'Yes' : 'No'}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'active' && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={cancelling === s.id}
                          onClick={() => handleCancel(s.id)}
                        >
                          Cancel
                        </Button>
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
              Page {page} of {totalPages} · {total} subscriptions
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
