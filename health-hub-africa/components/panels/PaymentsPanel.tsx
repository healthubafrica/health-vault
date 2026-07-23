'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { payments } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { formatCurrency } from '@/lib/utils'

export function PaymentsPanel() {
  const router = useRouter()
  const { data: paymentsRes } = useApi(() => payments.list())
  const allPayments = paymentsRes?.data ?? []
  const total = allPayments.reduce((sum, p) => sum + p.amountKobo, 0) / 100

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Billing Summary
      </p>

      <div
        className="p-4 rounded-2xl border text-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Spent</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          {formatCurrency(total)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{allPayments.length} transactions</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Recent
        </p>
        {allPayments.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No transactions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {allPayments.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-xs truncate flex-1 mr-2" title={p.description} style={{ color: 'var(--color-text-muted)' }}>
                  {p.description.split(' — ')[0]}
                </span>
                <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(p.amountKobo / 100)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button size="sm" fullWidth onClick={() => router.push('/payments')}>Make Payment</Button>
    </div>
  )
}
