'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Check } from 'lucide-react'
import { subscriptions, type SubscriptionPlan } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

function planFeatures(plan: SubscriptionPlan): string[] {
  return Array.isArray(plan.features) ? (plan.features as string[]) : []
}

export function SubscriptionsScreen() {
  const { data: subRes, isInitialLoad: subLoading, error, refetch } = useApi(() => subscriptions.getMy())
  const { data: plansRes, isInitialLoad: plansLoading } = useApi(() => subscriptions.listPlans())
  const [saving, setSaving] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')

  const activeSub = subRes?.data
  const allPlans = plansRes?.data ?? []
  const freePlan = allPlans.find(p => p.tier === 'Free')
  const paidPlans = allPlans.filter(p => p.tier !== 'Free')

  // currentPlanId includes Free (when no active sub)
  const currentPlanId = activeSub?.plan.id ?? freePlan?.id

  async function handleSubscribe(plan: SubscriptionPlan) {
    const isSwitch = !!activeSub
    const label = `${plan.name} (${billing})`
    if (!window.confirm(isSwitch ? `Switch to ${label}? Your current plan will end immediately.` : `Subscribe to ${label}?`)) return
    try {
      setSaving(plan.id)
      await subscriptions.subscribe(plan.id, billing)
      toast.success(isSwitch ? `Switched to ${plan.name}!` : `Subscribed to ${plan.name}!`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Subscription failed')
    } finally {
      setSaving(null)
    }
  }

  async function handleCancel() {
    if (!activeSub) return
    if (!window.confirm(`Cancel ${activeSub.plan.name}? You'll revert to the Free Plan.`)) return
    try {
      await subscriptions.cancel(activeSub.id)
      toast.success('Plan cancelled — you\'re now on the Free Plan')
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
          Subscription
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Choose the plan that fits your care needs
        </p>
      </div>

      {/* ── Current plan banner ── */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl border"
        style={{
          background: activeSub ? 'var(--color-success-bg)' : 'var(--color-bg)',
          borderColor: activeSub ? '#6DC43F' : 'var(--color-border)',
        }}
      >
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: activeSub ? '#006022' : 'var(--color-text-muted)' }}
          >
            Current Plan
          </p>
          <p
            className="text-base font-bold mt-0.5"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
          >
            {activeSub ? activeSub.plan.name : 'Free Plan'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {activeSub ? `Renews ${formatDate(activeSub.expiresAt)}` : 'Upgrade to unlock premium care'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Pill variant={activeSub ? 'success' : 'neutral'}>
            {activeSub ? activeSub.status : 'Free'}
          </Pill>
          {activeSub && (
            <button
              onClick={handleCancel}
              className="text-xs"
              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Cancel plan
            </button>
          )}
        </div>
      </div>

      {paidPlans.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No plans available right now. Please check back soon.
        </p>
      ) : (
        <>
          {/* ── Billing toggle ── */}
          <div
            className="flex gap-1 p-1 rounded-full"
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
                }}
              >
                {mode === 'monthly' ? 'Monthly' : 'Annual · Save ~20%'}
              </button>
            ))}
          </div>

          {/* ── Plan cards ── */}
          <div className="flex flex-col gap-3">
            {paidPlans.map(plan => {
              const isCurrent = currentPlanId === plan.id
              const isLoading = saving === plan.id
              const highlighted = plan.isMostPopular === true
              const price = billing === 'annually' && plan.annualPriceKobo
                ? plan.annualPriceKobo / 100
                : plan.priceKobo / 100
              const features = planFeatures(plan)

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border flex flex-col p-5 relative transition-all"
                  style={{
                    background: highlighted ? '#06241A' : 'var(--color-surface)',
                    borderColor: isCurrent ? '#6DC43F' : highlighted ? '#6DC43F33' : 'var(--color-border)',
                    boxShadow: isCurrent ? '0 0 0 2px #6DC43F44' : undefined,
                  }}
                >
                  {/* Badges */}
                  {isCurrent && (
                    <span
                      className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: '#6DC43F', color: '#fff' }}
                    >
                      ✓ Active
                    </span>
                  )}
                  {!isCurrent && plan.isMostPopular && (
                    <span
                      className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: '#6DC43F22', color: '#6DC43F' }}
                    >
                      Most Popular
                    </span>
                  )}

                  {/* Header: name + price */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: highlighted ? '#fff' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                      >
                        {plan.name}
                      </p>
                      {plan.bestFor && (
                        <p className="text-[11px] mt-0.5" style={{ color: highlighted ? 'rgba(255,255,255,0.45)' : 'var(--color-text-faint)' }}>
                          Best for {plan.bestFor}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="text-xl font-bold"
                        style={{ color: highlighted ? '#6DC43F' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                      >
                        {formatCurrency(price)}
                      </span>
                      <span className="block text-[11px]" style={{ color: highlighted ? 'rgba(255,255,255,0.45)' : 'var(--color-text-muted)' }}>
                        /{billing === 'annually' ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  {features.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mb-4">
                      {features.slice(0, 5).map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={12} className="mt-0.5 shrink-0" style={{ color: '#6DC43F' }} />
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: highlighted ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)' }}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li
                          className="text-xs pl-5"
                          style={{ color: highlighted ? 'rgba(255,255,255,0.35)' : 'var(--color-text-faint)' }}
                        >
                          +{features.length - 5} more features included
                        </li>
                      )}
                    </ul>
                  )}

                  {/* CTA */}
                  <Button
                    variant={highlighted || isCurrent ? 'primary' : 'secondary'}
                    fullWidth
                    size="md"
                    disabled={isCurrent || !!saving}
                    onClick={isCurrent ? undefined : () => handleSubscribe(plan)}
                  >
                    {isCurrent
                      ? '✓ Your Current Plan'
                      : isLoading
                      ? 'Processing…'
                      : activeSub
                      ? `Switch to ${plan.name}`
                      : `Get ${plan.name}`}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Free plan note for paid subscribers */}
          {activeSub && freePlan && (
            <p className="text-xs text-center" style={{ color: 'var(--color-text-faint)' }}>
              Cancel anytime to revert to the Free Plan · No partial refunds
            </p>
          )}
        </>
      )}
    </div>
  )
}
