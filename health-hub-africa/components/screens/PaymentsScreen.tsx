'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { PAYMENTS } from '@/lib/data/payments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, CreditCard } from 'lucide-react'
import { payments as paymentsApi } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'

export function PaymentsScreen() {
  const { data: paymentsRes } = useApi(() => paymentsApi.list())

  const allPayments = paymentsRes?.data?.map((p: any) => ({
    id: p.id,
    description: p.description,
    amount: p.amountKobo / 100,
    currency: p.currency,
    status: p.status === 'paid' ? 'paid' : p.status,
    date: p.paidAt ?? p.createdAt,
    gateway: p.gateway,
  })) ?? PAYMENTS

  const total = allPayments.reduce((sum: number, p: any) => sum + p.amount, 0)

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
        <Button size="sm"><CreditCard size={14} />Make Payment</Button>
      </div>

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
            {PAYMENTS.length}
          </span>
        </div>
      </div>

      {/* Payment history */}
      <Card padding="none">
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle className="mb-0">Transaction History</CardTitle>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {allPayments.map((p: any) => (
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
                  {formatCurrency(p.amount)}
                </span>
                <Pill variant="success">{p.status}</Pill>
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
