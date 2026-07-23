'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, CreditCard, X, Building2, Copy } from 'lucide-react'
import { payments as paymentsApi, ApiError, type GatewayStatus } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

type PillVariant = 'success' | 'warning' | 'emergency' | 'neutral'
type Gateway = 'paystack' | 'bank_transfer'

const BANK_DETAILS = {
  bank: 'United Bank for Africa (UBA)',
  account: '1028358485',
  name: 'Health Hub Africa',
}

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
  const { data: gatewayStatuses } = useApi(() => paymentsApi.getGatewayStatus())

  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [amountNaira, setAmountNaira] = useState('')
  const [gateway, setGateway] = useState<Gateway>('paystack')
  const [submitting, setSubmitting] = useState(false)
  const [transferConfirm, setTransferConfirm] = useState<{ ref: string; amount: string } | null>(null)

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
      const apiGateway = gateway === 'bank_transfer' ? 'manual' : gateway
      const result = await paymentsApi.initiate({
        gateway: apiGateway,
        purpose: 'other',
        description: description.trim(),
        amountKobo: Math.round(parsed * 100),
        currency: 'NGN',
      })

      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl
      } else {
        // Bank transfer — show confirmation with reference
        setTransferConfirm({
          ref: result.paymentId,
          amount: formatNaira(Math.round(parsed * 100)),
        })
        refetch()
      }
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
    setTransferConfirm(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setTransferConfirm(null)
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
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                {transferConfirm ? 'Transfer Instructions' : 'Make a Payment'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {transferConfirm ? (
              /* ── Bank transfer confirmation screen ── */
              <div className="flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Transfer <strong style={{ color: 'var(--color-text)' }}>{transferConfirm.amount}</strong> to the account below and use your reference as the narration.
                </p>

                <div className="flex flex-col gap-2 rounded-xl p-4 border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  {[
                    { label: 'Bank', value: BANK_DETAILS.bank },
                    { label: 'Account Number', value: BANK_DETAILS.account },
                    { label: 'Account Name', value: BANK_DETAILS.name },
                    { label: 'Reference', value: transferConfirm.ref.slice(0, 8).toUpperCase() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{value}</span>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`) }}
                          className="p-0.5 rounded opacity-50 hover:opacity-100"
                          aria-label={`Copy ${label}`}
                          title="Copy to clipboard"
                        >
                          <Copy size={11} style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-center" style={{ color: 'var(--color-text-faint)' }}>
                  Your payment will be confirmed by our team within 24 hours.
                </p>

                <Button size="sm" onClick={closeModal}>Done</Button>
              </div>
            ) : (
              /* ── Payment form ── */
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
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Payment Method
                  </label>
                  <select
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value as Gateway)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="paystack">Paystack (Card / Bank)</option>
                    <option value="bank_transfer">Bank Transfer (UBA)</option>
                  </select>
                </div>

                {/* Bank transfer preview */}
                {gateway === 'bank_transfer' && (
                  <div className="flex flex-col gap-1.5 rounded-xl p-3 border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Transfer to:</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{BANK_DETAILS.name}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{BANK_DETAILS.account}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{BANK_DETAILS.bank}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1" disabled={submitting}>
                    {submitting
                      ? (gateway === 'bank_transfer' ? 'Recording…' : 'Redirecting…')
                      : (gateway === 'bank_transfer' ? 'Get Account Details' : 'Pay Now')}
                  </Button>
                </div>
              </form>
            )}
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
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Receipt size={32} style={{ color: 'var(--color-text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No transactions yet</p>
            </div>
          ) : allPayments.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-bg)' }}
              >
                <Receipt size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={p.description} style={{ color: 'var(--color-text)' }}>{p.description}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDate(p.date)} · {p.gateway === 'manual' ? 'Bank Transfer' : p.gateway}
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

      {/* Payment Methods */}
      <Card>
        <CardTitle>Payment Methods</CardTitle>
        <div className="flex flex-col gap-3">
          {(gatewayStatuses ?? [
            { gateway: 'paystack', name: 'Paystack', active: true },
            { gateway: 'bank_transfer', name: 'Bank Transfer', active: true, bankName: 'United Bank for Africa', accountNumber: '1028358485' },
          ]).map((gw: GatewayStatus) => (
            <div
              key={gw.gateway}
              className="flex items-start gap-3 p-3 rounded-xl border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: '#006022' }}>
                {gw.gateway === 'bank_transfer' ? <Building2 size={14} /> : gw.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{gw.name}</p>
                {gw.bankName ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {gw.bankName} · {gw.accountNumber}
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Secure payment gateway</p>
                )}
              </div>
              <Pill variant={gw.active ? 'success' : 'neutral'} className="ml-auto shrink-0">
                {gw.active ? 'Active' : 'Inactive'}
              </Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
