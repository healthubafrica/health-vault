import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { SUBSCRIPTION_PLANS } from '@/lib/data/payments'
import { PATIENT } from '@/lib/data/patient'
import { formatCurrency } from '@/lib/utils'
import { Check } from 'lucide-react'

export function SubscriptionsScreen() {
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          Subscriptions
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Choose the plan that fits your care needs
        </p>
      </div>

      {/* Current plan */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: 'var(--color-success-bg)', borderColor: '#6DC43F' }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#006022' }}>Current Plan</p>
          <p className="text-base font-bold mt-0.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            {PATIENT.plan} Plan
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Renews {new Date(PATIENT.planExpiry).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Pill variant="success">Active</Pill>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUBSCRIPTION_PLANS.map(plan => (
          <div
            key={plan.id}
            className="rounded-2xl border flex flex-col p-5 relative transition-all duration-150 hover:shadow-lg"
            style={{
              background: plan.highlighted ? '#006022' : 'var(--color-surface)',
              borderColor: plan.highlighted ? '#6DC43F' : 'var(--color-border)',
            }}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold text-white bg-[#6DC43F]">
                  Most Popular
                </span>
              </div>
            )}
            <div className="flex-1">
              <p
                className="text-sm font-bold"
                style={{ color: plan.highlighted ? '#fff' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
              >
                {plan.name}
              </p>
              <div className="flex items-end gap-1 mt-2 mb-4">
                <span
                  className="text-2xl font-bold"
                  style={{ color: plan.highlighted ? '#6DC43F' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                >
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-xs pb-0.5" style={{ color: plan.highlighted ? '#fff/70' : 'var(--color-text-muted)' }}>
                  /{plan.period}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      size={13}
                      className="mt-0.5 shrink-0"
                      style={{ color: plan.highlighted ? '#6DC43F' : '#6DC43F' }}
                    />
                    <span
                      className="text-xs leading-relaxed"
                      style={{ color: plan.highlighted ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)' }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant={plan.highlighted ? 'primary' : 'secondary'}
              fullWidth
              className="mt-5"
              size="md"
            >
              {plan.id === 'gold' && PATIENT.plan === 'Gold' ? 'Current Plan' : `Choose ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
