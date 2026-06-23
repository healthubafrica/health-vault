'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Check } from 'lucide-react'
import { subscriptions, SubscriptionPlan } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

export function SubscriptionsScreen() {
  const { data: subRes, isInitialLoad: subLoading, error, refetch } = useApi(() => subscriptions.getMy())
  const { data: plansRes, isInitialLoad: plansLoading } = useApi(() => subscriptions.listPlans())
  const [saving, setSaving] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')

  const activeSub = subRes?.data
  const plans = plansRes?.data ?? []

  async function handleSubscribe(plan: SubscriptionPlan) {
    const planLabel = `${plan.name} (${billing})`
    const confirmed = window.confirm(
      activeSub
        ? `Upgrade to ${planLabel}? Your current plan will be cancelled immediately.`
        : `Subscribe to ${planLabel}?`
    )
    if (!confirmed) return

    try {
      setSaving(true)
      await subscriptions.subscribe(plan.id, billing)
      toast.success(activeSub ? `Upgraded to ${plan.name}!` : `Subscribed to ${plan.name}!`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Subscription failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!activeSub) return
    try {
      await subscriptions.cancel(activeSub.id)
      toast.success('Subscription cancelled')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed')
    }
  }

  if (subLoading || plansLoading) return <ListSkeleton ariaLabel="Loading subscription plans" />
  if (error && !subRes) return <ErrorState message={error} onRetry={refetch} />

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
      {activeSub ? (
        <div
          className="flex items-center justify-between p-4 rounded-2xl border"
          style={{ background: 'var(--color-success-bg)', borderColor: '#6DC43F' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#006022' }}>Current Plan</p>
            <p className="text-base font-bold mt-0.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              {activeSub.plan.name} Plan
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Renews {formatDate(activeSub.expiresAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Pill variant="success">{activeSub.status}</Pill>
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-between p-4 rounded-2xl border"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Current Plan</p>
            <p className="text-base font-bold mt-0.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              Free
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              No active subscription
            </p>
          </div>
        </div>
      )}

      {/* Pricing cards */}
      {plans.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No subscription plans available right now.
        </p>
      ) : (
        <>
          {/* Billing toggle */}
          <div
            className="flex gap-1 p-1 rounded-full mb-4"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', alignSelf: 'flex-start' }}
          >
            {(['monthly', 'annually'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBilling(mode)}
                className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all"
                style={{
                  background: billing === mode ? 'var(--color-text)' : 'transparent',
                  color: billing === mode ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.07em',
                }}
              >
                {mode === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const isCurrent = activeSub?.plan.id === plan.id
              const highlighted = plan.isMostPopular === true
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border flex flex-col p-5 relative transition-all duration-150 hover:shadow-lg"
                  style={{
                    background: highlighted ? '#006022' : 'var(--color-surface)',
                    borderColor: highlighted ? '#6DC43F' : 'var(--color-border)',
                  }}
                >
                  <div className="flex-1">
                    <p
                      className="text-sm font-bold"
                      style={{ color: highlighted ? '#fff' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                    >
                      {plan.name}
                    </p>
                    <div className="flex items-end gap-1 mt-2 mb-4">
                      <span
                        className="text-2xl font-bold"
                        style={{ color: highlighted ? '#6DC43F' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                      >
                        {billing === 'annually' && plan.annualPriceKobo
                          ? formatCurrency(plan.annualPriceKobo / 100)
                          : formatCurrency(plan.priceKobo / 100)}
                      </span>
                      <span className="text-xs pb-0.5" style={{ color: highlighted ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>
                        /{billing === 'annually' ? 'year' : plan.billingPeriod}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={13} className="mt-0.5 shrink-0" style={{ color: '#6DC43F' }} />
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: highlighted ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)' }}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant={highlighted ? 'primary' : 'secondary'}
                    fullWidth
                    className="mt-5"
                    size="md"
                    disabled={isCurrent || saving}
                    onClick={isCurrent ? undefined : () => handleSubscribe(plan)}
                  >
                    {isCurrent ? 'Current Plan' : saving ? 'Processing…' : `Choose ${plan.name}`}
                  </Button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
