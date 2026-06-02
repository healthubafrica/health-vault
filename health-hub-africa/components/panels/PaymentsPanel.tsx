import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { PAYMENTS } from '@/lib/data/payments'
import { formatCurrency } from '@/lib/utils'

export function PaymentsPanel() {
  const total = PAYMENTS.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Billing Summary
      </p>

      <div
        className="p-4 rounded-2xl border text-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Spent (2026)</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          {formatCurrency(total)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{PAYMENTS.length} transactions</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Recent
        </p>
        <div className="flex flex-col gap-2">
          {PAYMENTS.slice(0, 3).map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="text-xs truncate flex-1 mr-2" style={{ color: 'var(--color-text-muted)' }}>
                {p.description.split(' — ')[0]}
              </span>
              <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(p.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button size="sm" fullWidth>Make Payment</Button>
    </div>
  )
}
