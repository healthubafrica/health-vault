'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminPayment } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { formatDate, formatDateTime } from '@/lib/utils'
import { RefreshCw, Search, X } from 'lucide-react'

const STATUS_TABS = ['all', 'pending', 'paid', 'failed', 'refunded']

function statusVariant(status: string): 'success' | 'warning' | 'emergency' | 'neutral' {
  if (status === 'paid') return 'success'
  if (status === 'failed') return 'emergency'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

function gatewayLabel(gateway: string): string {
  if (gateway === 'manual') return 'Bank Transfer'
  return gateway
}

function formatNaira(kobo: number): string {
  return (kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
}

function PaymentDetailDialog({
  payment,
  onClose,
  onConfirm,
  onRefund,
  confirming,
  refunding,
}: {
  payment: AdminPayment
  onClose: () => void
  onConfirm: (id: string) => void
  onRefund: (id: string, amountKobo: number | undefined, reason: string) => void
  confirming: string | null
  refunding: string | null
}) {
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  const alreadyRefunded = payment.refundAmountKobo ?? 0
  const remainingKobo = payment.amountKobo - alreadyRefunded
  const canRefund = payment.status === 'paid' && remainingKobo > 0

  function submitRefund() {
    const trimmed = refundAmount.trim()
    const amountKobo = trimmed ? Math.round(parseFloat(trimmed) * 100) : undefined
    if (amountKobo !== undefined && (isNaN(amountKobo) || amountKobo <= 0)) return
    onRefund(payment.id, amountKobo, refundReason.trim())
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{payment.patientName}</h2>
            <Pill variant={statusVariant(payment.status)}>{payment.status}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>HHA Reference</p>
              <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{payment.hhaRef}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Amount</p>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{formatNaira(payment.amountKobo)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Gateway</p>
              <Pill variant={payment.gateway === 'manual' ? 'warning' : 'neutral'}>{gatewayLabel(payment.gateway)}</Pill>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Currency</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{payment.currency}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{payment.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Created</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(payment.createdAt)}</p>
            </div>
            {payment.paidAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Paid At</p>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(payment.paidAt)}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Payment ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{payment.id}</p>
          </div>

          {alreadyRefunded > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Refunded</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{formatNaira(alreadyRefunded)}</p>
            </div>
          )}

          {showRefundForm && (
            <div className="flex flex-col gap-2 rounded-xl p-3 border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <FormInput
                label={`Amount to refund (NGN) — leave blank for full ${formatNaira(remainingKobo)}`}
                type="number"
                min="0.01"
                step="any"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={formatNaira(remainingKobo)}
              />
              <FormInput
                label="Reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Duplicate charge"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowRefundForm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" loading={refunding === payment.id} onClick={submitRefund}>
                  Confirm Refund
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-2">
            {payment.gateway === 'manual' && payment.status === 'pending' && (
              <Button
                variant="primary"
                size="sm"
                loading={confirming === payment.id}
                onClick={() => onConfirm(payment.id)}
              >
                Confirm Payment
              </Button>
            )}
            {canRefund && !showRefundForm && (
              <Button variant="secondary" size="sm" onClick={() => setShowRefundForm(true)}>
                Refund
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [refunding, setRefunding] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminPayment | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof adminApi.payments.list>[0] = { page, limit }
      if (statusTab !== 'all') params.status = statusTab
      if (search.trim()) params.search = search.trim()
      const res = await adminApi.payments.list(params)
      setPayments(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [page, statusTab, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const handleConfirmManual = useCallback(async (id: string) => {
    if (!window.confirm('Confirm this bank transfer payment? This will mark it as paid and activate the subscription if applicable.')) return
    setConfirming(id)
    try {
      await adminApi.payments.confirmManual(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment')
    } finally {
      setConfirming(null)
    }
  }, [load])

  const handleRefund = useCallback(async (id: string, amountKobo: number | undefined, reason: string) => {
    const label = amountKobo ? `${(amountKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}` : 'the full amount'
    if (!window.confirm(`Refund ${label} for this payment?`)) return
    setRefunding(id)
    try {
      await adminApi.payments.refund(id, { amountKobo, reason: reason || undefined })
      await load()
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund')
    } finally {
      setRefunding(null)
    }
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Payments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total transactions
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <FormInput
            placeholder="Search by ref or patient…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <FilterTabs
          tabs={STATUS_TABS}
          active={statusTab}
          onChange={(t) => { setStatusTab(t); setPage(1) }}
        />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Ref', 'Patient', 'Amount', 'Gateway', 'Status', 'Description', 'Date', ''].map((h) => (
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
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 0 ? 90 : 100 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {p.hhaRef}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {p.patientName}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatNaira(p.amountKobo)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={p.gateway === 'manual' ? 'warning' : 'neutral'}>{gatewayLabel(p.gateway)}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={statusVariant(p.status)}>{p.status}</Pill>
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {p.description}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {p.gateway === 'manual' && p.status === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={confirming === p.id}
                          onClick={() => handleConfirmManual(p.id)}
                        >
                          Confirm
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
              Page {page} of {totalPages} · {total} payments
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
        <PaymentDetailDialog
          payment={selected}
          onClose={() => setSelected(null)}
          onConfirm={async (id) => { await handleConfirmManual(id); setSelected(null) }}
          onRefund={handleRefund}
          confirming={confirming}
          refunding={refunding}
        />
      )}
    </div>
  )
}
