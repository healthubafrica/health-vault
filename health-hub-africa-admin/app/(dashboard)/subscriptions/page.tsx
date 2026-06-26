'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminSubscription } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDate, formatDateTime } from '@/lib/utils'
import { RefreshCw, X } from 'lucide-react'

function SubDetailDialog({
  sub,
  onClose,
  onChangePlan,
  onCancel,
  cancelling,
}: {
  sub: AdminSubscription
  onClose: () => void
  onChangePlan: (s: AdminSubscription) => void
  onCancel: (id: string) => void
  cancelling: string | null
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
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{sub.patientName}</h2>
            <Pill variant={statusVariant(sub.status)}>{sub.status}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>HHA Patient ID</p>
              <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{sub.hhaPatientId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Auto-Renew</p>
              <Pill variant={sub.autoRenew ? 'success' : 'neutral'}>{sub.autoRenew ? 'Yes' : 'No'}</Pill>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Plan</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{sub.planName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Tier</p>
              <Pill variant="neutral">{sub.tier}</Pill>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Started</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDate(sub.startedAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Expires</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDate(sub.expiresAt)}</p>
            </div>
          </div>

          {sub.cancelledAt && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Cancelled At</p>
              <p className="text-xs" style={{ color: 'var(--color-emergency)' }}>{formatDateTime(sub.cancelledAt)}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Subscription ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{sub.id}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { onClose(); onChangePlan(sub) }}>Change Plan</Button>
            {sub.status === 'active' && (
              <Button
                variant="danger"
                size="sm"
                loading={cancelling === sub.id}
                onClick={() => onCancel(sub.id)}
              >
                Cancel
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

const STATUS_TABS = ['all', 'active', 'expired', 'cancelled']

function statusVariant(status: string): 'success' | 'neutral' | 'warning' | 'emergency' {
  if (status === 'active') return 'success'
  if (status === 'expired') return 'warning'
  if (status === 'cancelled') return 'emergency'
  return 'neutral'
}

type Plan = { id: string; name: string; tier: string; slug: string }

type OverrideTarget = { sub: AdminSubscription } | null

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState('all')
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminSubscription | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<OverrideTarget>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annually'>('monthly')
  const [overriding, setOverriding] = useState(false)
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

  // Load plans once for override modal
  useEffect(() => {
    adminApi.plans.list().then(r => setPlans(r.data)).catch(() => {})
  }, [])

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

  function openOverrideModal(sub: AdminSubscription) {
    setOverrideTarget({ sub })
    setSelectedPlanId(plans[0]?.id ?? '')
    setSelectedCycle('monthly')
  }

  async function handleOverride() {
    if (!overrideTarget || !selectedPlanId) return
    if (!window.confirm(`Override ${overrideTarget.sub.patientName}'s subscription to the selected plan?`)) return
    setOverriding(true)
    try {
      await adminApi.subscriptions.override(overrideTarget.sub.patientId, selectedPlanId, selectedCycle)
      setOverrideTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override subscription')
    } finally {
      setOverriding(false)
    }
  }

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

      {/* Override modal */}
      {overrideTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOverrideTarget(null) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                Override Subscription
              </h2>
              <button onClick={() => setOverrideTarget(null)} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Patient: <strong style={{ color: 'var(--color-text)' }}>{overrideTarget.sub.patientName}</strong>
              <br />
              Current plan: <strong style={{ color: 'var(--color-text)' }}>{overrideTarget.sub.planName}</strong>
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>New Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.tier})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Billing Cycle</label>
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value as 'monthly' | 'annually')}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="monthly">Monthly</option>
                <option value="annually">Annually</option>
              </select>
            </div>

            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
              This overrides without charging the patient. Only use for corrections or manual confirmations.
            </p>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setOverrideTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                loading={overriding}
                disabled={!selectedPlanId}
                onClick={handleOverride}
              >
                Apply Override
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(s)}
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
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openOverrideModal(s)}
                        >
                          Change Plan
                        </Button>
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
                      </div>
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

      {selected && (
        <SubDetailDialog
          sub={selected}
          onClose={() => setSelected(null)}
          onChangePlan={(s) => openOverrideModal(s)}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}
    </div>
  )
}
