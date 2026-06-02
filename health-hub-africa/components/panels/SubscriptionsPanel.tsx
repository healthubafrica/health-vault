import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { PATIENT } from '@/lib/data/patient'
import { SUBSCRIPTION_PLANS } from '@/lib/data/payments'
import { Check } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function SubscriptionsPanel() {
  const current = SUBSCRIPTION_PLANS.find(p => p.name === PATIENT.plan) ?? SUBSCRIPTION_PLANS[1]

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Your Plan
      </p>

      <div
        className="p-4 rounded-2xl border"
        style={{ background: 'var(--color-success-bg)', borderColor: '#6DC43F' }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            {PATIENT.plan} Plan
          </p>
          <Pill variant="success">Active</Pill>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Renews {formatDate(PATIENT.planExpiry)}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Plan Benefits
        </p>
        <ul className="flex flex-col gap-2">
          {current.features.map(f => (
            <li key={f} className="flex items-start gap-2">
              <Check size={13} className="mt-0.5 shrink-0 text-[#6DC43F]" />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button size="sm" fullWidth>Upgrade to Concierge</Button>
    </div>
  )
}
