'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, CreditCard, X } from 'lucide-react'
import { payments as paymentsApi, ApiError } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

type PillVariant = 'success' | 'warning' | 'emergency' | 'neutral'

function statusVariant(status: string): PillVariant {
  if (status === 'paid') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed') return 'emergency'
  return 'neutral'
}

function formatNaira(amountKobo: number): string {
  return (amountKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
}

export function PaymentsScreen() {
  const { data: paymentsRes, isInitialLoad, error, refetch } = useApi(() => paymentsApi.list())

  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [amountNaira, setAmountNaira] = useState('')
  const [gateway, setGateway] = useState<'paystack' | 'flutterwave'>('paystack')
  const [submitting, setSubmitting] = useState(false)

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading payment history" showStats />
  if (error && !paymentsRes) return <ErrorState message={error} onRetry={refetch} />

  const allPayments = paymentsRes?.data?.map((p: any) => ({
    id: p.id,
    description: p.description,
    amountKobo: p.amountKobo,
    currency: p.currency,
    status: p.status,
    date: p.paidAt ?? p.createdAt,
    gateway: p.gateway,
  })) ?? []

  const total = allPayments.reduce((sum: number, p: any) => sum + p.amountKobo / 100, 0)

  async function handleInitiatePayment(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amountNaira)
    if (!description.trim() || isNaN(parsed) || parsed <= 0) {
      toast.error('Please fill in all fields with valid values.')
      return
    }
    setSubmitting(true)
    try {
      const result = await paymentsApi.initiate({
        gateway,
        purpose: description.trim(),
        amountKobo: Math.round(parsed * 100),
        currency: 'NGN',
      })
      window.location.href = result.authorizationUrl
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to initiate payment. Please try again.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function openModal() {
    setDescription('')
    setAmountNaira('')
    setGateway('paystack')
    setShowModal(true)
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Payments & Billing
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Your billing history and payment methods
          </p>
        </div>
        <Button size="sm" onClick={openModal}><CreditCard size={14} />Make Payment</Button>
      </div>

      {/* Make Payment modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                Make a Payment
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitiatePayment} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Purpose / Description
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Consultation fee"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Amount (NGN)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amountNaira}
                  onChange={(e) => setAmountNaira(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Payment Gateway
                </label>
                <select
                  value={gateway}
                  onChange={(e) => setGateway(e.target.value as 'paystack' | 'flutterwave')}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1" disabled={submitting}>
                  {submitting ? 'Redirecting…' : 'Pay Now'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex flex-col gap-0.5 px-4 py-3 rounded-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Spent</span>
          <span className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            {formatCurrency(total)}
          </span>
        </div>
        <div
          className="flex flex-col gap-0.5 px-4 py-3 rounded-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Transactions</span>
          <span className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            {allPayments.length}
          </span>
        </div>
      </div>

      {/* Payment history */}
      <Card padding="none">
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle className="mb-0">Transaction History</CardTitle>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {allPayments.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              No transactions yet.
            </p>
          ) : allPayments.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-bg)' }}
              >
                <Receipt size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.description}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDate(p.date)} · {p.gateway}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                  {formatNaira(p.amountKobo)}
                </span>
                <Pill variant={statusVariant(p.status)}>{p.status}</Pill>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Gateways */}
      <Card>
        <CardTitle>Payment Methods</CardTitle>
        <div className="flex flex-col gap-3">
          {['Paystack', 'Flutterwave'].map(gw => (
            <div
              key={gw}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: '#006022' }}>
                {gw[0]}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{gw}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Secure payment gateway</p>
              </div>
              <Pill variant="success" className="ml-auto">Active</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
